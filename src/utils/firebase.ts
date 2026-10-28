import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut, 
  User 
} from 'firebase/auth';
import { 
  initializeFirestore, 
  getFirestore,
  doc, 
  setDoc, 
  updateDoc,
  getDoc, 
  getDocFromServer,
  writeBatch, 
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase safely
const existingApps = getApps();
export const app = existingApps.length > 0 ? existingApps[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);

let dbInstance: ReturnType<typeof getFirestore>;
const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
try {
  dbInstance = initializeFirestore(app, {}, dbId);
} catch {
  dbInstance = getFirestore(app, dbId);
}
export const db = dbInstance;

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validation constants synchronized with firebase-blueprint.json
export const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
export const MAX_ID_LENGTH = 128;
export const MAX_FILE_NAME_LENGTH = 200;
export const MAX_CHUNK_DATA_LENGTH = 500000;

// Sign in with Google Popup
export async function signInWithGoogle(): Promise<User | null> {
  if (!auth) {
    console.warn('Firebase Auth is not available.');
    return null;
  }
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

// Sign out
export async function signOutUser(): Promise<void> {
  if (!auth) return;
  await fbSignOut(auth);
}

// Get current user
export function getCurrentUser(): User | null {
  return auth?.currentUser || null;
}

// CHUNK_SIZE of 450KB to stay safely under the 500,000 char blueprint limit
const CHUNK_SIZE = 450 * 1024;

/**
 * Uploads a large base64 file to Firestore by dividing it into chunks.
 */
export async function uploadFileToFirestore(
  userId: string, 
  fileName: string, 
  fileType: string, 
  dataUrl: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (!db) {
    throw new Error('Firestore is not available');
  }
  if (!ID_REGEX.test(userId) || userId.length > MAX_ID_LENGTH) {
    throw new Error('Invalid userId format');
  }

  const fileId = crypto.randomUUID();
  const totalChunks = Math.max(1, Math.min(500, Math.ceil(dataUrl.length / CHUNK_SIZE)));
  const sanitizedName = (fileName || 'asset').trim().slice(0, MAX_FILE_NAME_LENGTH) || 'asset';
  const sanitizedFileType = fileType === '3d_file' ? '3d_file' : 'texture';
  const fileMetaPath = `users/${userId}/files/${fileId}`;
  const fileMetaRef = doc(db, 'users', userId, 'files', fileId);

  // 1. Create FileMetadata in 'uploading' state
  try {
    await setDoc(fileMetaRef, {
      ownerId: userId,
      name: sanitizedName,
      fileType: sanitizedFileType,
      totalChunks: totalChunks,
      status: 'uploading',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, fileMetaPath);
  }

  // 2. Upload chunks in batches (max 10 at a time for network stability)
  for (let i = 0; i < totalChunks; i += 10) {
    const batch = writeBatch(db);
    const end = Math.min(i + 10, totalChunks);
    for (let j = i; j < end; j++) {
      const chunkStr = dataUrl.substring(j * CHUNK_SIZE, (j + 1) * CHUNK_SIZE).slice(0, MAX_CHUNK_DATA_LENGTH);
      const chunkRef = doc(db, 'users', userId, 'files', fileId, 'chunks', String(j));
      batch.set(chunkRef, {
        ownerId: userId,
        fileId: fileId,
        chunkIndex: j,
        data: chunkStr,
        createdAt: serverTimestamp(),
      });
    }
    try {
      await batch.commit();
      if (onProgress) {
        onProgress(Math.round((end / totalChunks) * 100));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${userId}/files/${fileId}/chunks`);
    }
  }

  // 3. Finalize FileMetadata to terminal 'ready' state
  try {
    await updateDoc(fileMetaRef, {
      status: 'ready',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, fileMetaPath);
  }

  return fileId;
}

/**
 * Downloads a chunked file from Firestore by direct document getDoc lookups and reconstructs it.
 */
export async function downloadFileFromFirestore(
  userId: string, 
  fileId: string,
  onProgress?: (percent: number) => void
): Promise<string | null> {
  if (!db || !fileId) return null;
  const fileMetaPath = `users/${userId}/files/${fileId}`;
  try {
    const fileMetaRef = doc(db, 'users', userId, 'files', fileId);
    const metaSnap = await getDoc(fileMetaRef);
    if (!metaSnap.exists()) return null;

    const meta = metaSnap.data();
    const totalExpected = Math.max(1, Math.min(500, Number(meta.totalChunks) || 1));

    const chunkStrings: string[] = new Array(totalExpected).fill('');
    let loadedCount = 0;

    for (let i = 0; i < totalExpected; i += 10) {
      const end = Math.min(i + 10, totalExpected);
      const batchPromises: Promise<void>[] = [];
      for (let j = i; j < end; j++) {
        const chunkPath = `users/${userId}/files/${fileId}/chunks/${j}`;
        const chunkRef = doc(db, 'users', userId, 'files', fileId, 'chunks', String(j));
        batchPromises.push(
          getDoc(chunkRef)
            .then((chunkSnap) => {
              if (chunkSnap.exists()) {
                chunkStrings[j] = chunkSnap.data().data || '';
              }
              loadedCount++;
              if (onProgress) {
                onProgress(Math.round((loadedCount / totalExpected) * 100));
              }
            })
            .catch((err) => {
              handleFirestoreError(err, OperationType.GET, chunkPath);
            })
        );
      }
      await Promise.all(batchPromises);
    }

    return chunkStrings.join('');
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, fileMetaPath);
  }
}
