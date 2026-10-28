import { 
  db, 
  auth, 
  uploadFileToFirestore, 
  downloadFileFromFirestore, 
  handleFirestoreError, 
  OperationType,
  ID_REGEX,
  MAX_ID_LENGTH
} from './firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { GameSettings, CustomModel, PieceType } from '../store/gameStore';

export interface PieceModelRef {
  name: string;
  fileType?: 'fbx' | 'obj';
  dataUrlId?: string;
  dataUrlLength?: number;
  
  mapUrlId?: string;
  mapUrlLength?: number;
  
  normalMapUrlId?: string;
  normalMapUrlLength?: number;
  
  roughnessMapUrlId?: string;
  roughnessMapUrlLength?: number;
  
  metalnessMapUrlId?: string;
  metalnessMapUrlLength?: number;
  
  emissiveMapUrlId?: string;
  emissiveMapUrlLength?: number;
}

const ALLOWED_THEMES = ['park', 'cemetery', 'temple', 'underworld', 'heaven', 'snow'] as const;
const PIECE_KEYS: PieceType[] = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];

function sanitizePieceMap(input: Record<PieceType, string>, fallback: Record<PieceType, string>): Record<PieceType, string> {
  const result = {} as Record<PieceType, string>;
  for (const key of PIECE_KEYS) {
    const raw = (input?.[key] ?? fallback[key] ?? key).trim();
    result[key] = (raw.length > 0 ? raw : fallback[key]).slice(0, 50);
  }
  return result;
}

/**
 * Saves game settings and uploads any newly added custom 3D models/textures to Firebase if user is signed in.
 */
export async function saveGameSettingsToFirebase(
  settings: GameSettings,
  onProgress?: (status: string, percent: number) => void
): Promise<boolean> {
  const user = auth?.currentUser;
  if (!user || !db) {
    return false;
  }

  const userId = user.uid;
  if (!ID_REGEX.test(userId) || userId.length > MAX_ID_LENGTH) {
    throw new Error('Invalid authenticated user ID');
  }
  const settingsPath = `users/${userId}/settings/current`;

  try {
    if (onProgress) onProgress('Checking cloud sync status...', 10);

    const settingsRef = doc(db, 'users', userId, 'settings', 'current');
    let existingRefs: Record<string, PieceModelRef> = {};
    
    try {
      const existingSnap = await getDoc(settingsRef);
      if (existingSnap.exists()) {
        const data = existingSnap.data();
        existingRefs = data.pieceModelRefs || {};
      }
    } catch (err) {
      console.warn('Could not read existing settings from cloud:', err);
    }

    const updatedRefs: Record<string, PieceModelRef> = {};
    let processedCount = 0;
    const totalPieces = PIECE_KEYS.length;

    // Helper to upload a field if it's new
    const processField = async (
      pieceType: string,
      fieldName: string,
      base64Data: string | undefined,
      existingId: string | undefined,
      existingLength: number | undefined
    ): Promise<{ id: string; length: number } | null> => {
      if (!base64Data || base64Data.trim() === '') return null;

      if (existingId && existingLength === base64Data.length) {
        return { id: existingId, length: existingLength };
      }

      const newId = await uploadFileToFirestore(
        userId, 
        `${pieceType}_${fieldName}`, 
        fieldName === 'mesh' ? '3d_file' : 'texture', 
        base64Data
      );
      return { id: newId, length: base64Data.length };
    };

    // Process each piece type's model & maps
    for (const pieceType of PIECE_KEYS) {
      const model = settings.pieceModels[pieceType];
      processedCount++;
      const currentPct = 10 + Math.round((processedCount / totalPieces) * 75);

      if (!model) continue;

      if (onProgress) {
        onProgress(`Backing up ${pieceType.toUpperCase()} models & textures to Firebase...`, currentPct);
      }

      const existingRef = existingRefs[pieceType];

      const dataRes = await processField(
        pieceType,
        'mesh',
        model.dataUrl,
        existingRef?.dataUrlId,
        existingRef?.dataUrlLength
      );

      const mapRes = await processField(
        pieceType,
        'map',
        model.mapUrl,
        existingRef?.mapUrlId,
        existingRef?.mapUrlLength
      );
      const normalRes = await processField(
        pieceType,
        'normalMap',
        model.normalMapUrl,
        existingRef?.normalMapUrlId,
        existingRef?.normalMapUrlLength
      );
      const roughnessRes = await processField(
        pieceType,
        'roughnessMap',
        model.roughnessMapUrl,
        existingRef?.roughnessMapUrlId,
        existingRef?.roughnessMapUrlLength
      );
      const metalnessRes = await processField(
        pieceType,
        'metalnessMap',
        model.metalnessMapUrl,
        existingRef?.metalnessMapUrlId,
        existingRef?.metalnessMapUrlLength
      );
      const emissiveRes = await processField(
        pieceType,
        'emissiveMap',
        model.emissiveMapUrl,
        existingRef?.emissiveMapUrlId,
        existingRef?.emissiveMapUrlLength
      );

      if (dataRes || mapRes || normalRes || roughnessRes || metalnessRes || emissiveRes) {
        updatedRefs[pieceType] = {
          name: (model.name || `${pieceType} Model`).slice(0, 100),
          fileType: model.fileType === 'fbx' ? 'fbx' : 'obj',
          ...(dataRes && { dataUrlId: dataRes.id, dataUrlLength: dataRes.length }),
          ...(mapRes && { mapUrlId: mapRes.id, mapUrlLength: mapRes.length }),
          ...(normalRes && { normalMapUrlId: normalRes.id, normalMapUrlLength: normalRes.length }),
          ...(roughnessRes && { roughnessMapUrlId: roughnessRes.id, roughnessMapUrlLength: roughnessRes.length }),
          ...(metalnessRes && { metalnessMapUrlId: metalnessRes.id, metalnessMapUrlLength: metalnessRes.length }),
          ...(emissiveRes && { emissiveMapUrlId: emissiveRes.id, emissiveMapUrlLength: emissiveRes.length }),
        };
      }
    }

    if (onProgress) onProgress('Finalizing game profile in Firebase...', 95);

    // Defensive payload sanitization adhering strictly to firebase-blueprint.json
    const safeTheme = ALLOWED_THEMES.includes(settings.theme as any) ? settings.theme : 'park';
    const safeGameName = (settings.gameName || 'Tactical Chess 3D Studio').trim().slice(0, 100) || 'Tactical Chess 3D Studio';
    const safeBoardSize = Math.max(8, Math.min(20, Number(settings.boardSize) || 8));
    const safeAiLevel = Math.max(1, Math.min(4, Number(settings.aiLevel) || 2));
    const safeMusicVolume = Math.max(0, Math.min(1, Number(settings.musicVolume) ?? 0.5));
    const safeMusicMuted = Boolean(settings.musicMuted);
    const rawTrackId = (settings.selectedTrackId || 'imperial_oriental').trim().slice(0, 100);
    const safeSelectedTrackId = ID_REGEX.test(rawTrackId) ? rawTrackId : 'imperial_oriental';

    const safePieceNames = sanitizePieceMap(settings.pieceNames, {
      pawn: 'Soldier',
      rook: 'Castle',
      knight: 'Horse',
      bishop: 'Priest',
      queen: 'General',
      king: 'Leader',
    });

    const safePieceWeapons = sanitizePieceMap(settings.pieceWeapons, {
      pawn: 'Spear',
      rook: 'Shield',
      knight: 'Axe',
      bishop: 'Staff',
      queen: 'Scythe',
      king: 'Sword',
    });

    const safeGlbUrls: Record<string, string> = {};
    if (settings.pieceGlbUrls && typeof settings.pieceGlbUrls === 'object') {
      for (const [key, val] of Object.entries(settings.pieceGlbUrls)) {
        if (typeof key === 'string' && typeof val === 'string' && val.trim().length > 0) {
          safeGlbUrls[key.slice(0, 50)] = val.trim().slice(0, 500);
        }
      }
    }

    await setDoc(settingsRef, {
      ownerId: userId,
      theme: safeTheme,
      gameName: safeGameName,
      boardSize: safeBoardSize,
      aiLevel: safeAiLevel,
      musicVolume: safeMusicVolume,
      musicMuted: safeMusicMuted,
      selectedTrackId: safeSelectedTrackId,
      pieceNames: safePieceNames,
      pieceWeapons: safePieceWeapons,
      pieceModelRefs: updatedRefs,
      pieceGlbUrls: safeGlbUrls,
      updatedAt: serverTimestamp(),
    });

    if (onProgress) onProgress('All character 3D models & maps synced!', 100);
    return true;
  } catch (error: any) {
    console.error('Failed to save settings to Firebase:', error);
    handleFirestoreError(error, OperationType.WRITE, settingsPath);
  }
}

/**
 * Loads game settings and resolves chunked models/textures from Firebase for the logged in user.
 */
export async function loadGameSettingsFromFirebase(
  onProgress?: (status: string, percent: number) => void
): Promise<Partial<GameSettings> | null> {
  const user = auth?.currentUser;
  if (!user || !db) {
    return null;
  }

  const userId = user.uid;
  const settingsPath = `users/${userId}/settings/current`;

  try {
    if (onProgress) onProgress('Connecting to Firebase character vault...', 10);

    const settingsRef = doc(db, 'users', userId, 'settings', 'current');
    const snap = await getDoc(settingsRef);
    if (!snap.exists()) return null;

    const data = snap.data();
    const modelRefs: Record<string, PieceModelRef> = data.pieceModelRefs || {};
    const resolvedModels: Record<PieceType, CustomModel | null> = {
      pawn: null,
      rook: null,
      knight: null,
      bishop: null,
      queen: null,
      king: null,
    };

    const refKeys = Object.keys(modelRefs) as PieceType[];
    let loadedCount = 0;

    // Download and reconstruct files in parallel
    const loadPromises = refKeys.map(async (pieceType) => {
      const ref = modelRefs[pieceType];
      if (!ref) return;

      try {
        if (onProgress) onProgress(`Restoring ${pieceType.toUpperCase()} 3D model & PBR maps...`, 20 + Math.round((loadedCount / (refKeys.length || 1)) * 70));

        const dataUrl = ref.dataUrlId ? await downloadFileFromFirestore(userId, ref.dataUrlId) || '' : '';
        const mapUrl = ref.mapUrlId ? await downloadFileFromFirestore(userId, ref.mapUrlId) || undefined : undefined;
        const normalMapUrl = ref.normalMapUrlId ? await downloadFileFromFirestore(userId, ref.normalMapUrlId) || undefined : undefined;
        const roughnessMapUrl = ref.roughnessMapUrlId ? await downloadFileFromFirestore(userId, ref.roughnessMapUrlId) || undefined : undefined;
        const metalnessMapUrl = ref.metalnessMapUrlId ? await downloadFileFromFirestore(userId, ref.metalnessMapUrlId) || undefined : undefined;
        const emissiveMapUrl = ref.emissiveMapUrlId ? await downloadFileFromFirestore(userId, ref.emissiveMapUrlId) || undefined : undefined;

        resolvedModels[pieceType] = {
          name: ref.name || `${pieceType} Model`,
          fileType: ref.fileType || 'obj',
          dataUrl: dataUrl,
          mapUrl,
          normalMapUrl,
          roughnessMapUrl,
          metalnessMapUrl,
          emissiveMapUrl,
        };

        loadedCount++;
      } catch (err) {
        console.error(`Failed to load custom model for ${pieceType}:`, err);
      }
    });

    await Promise.all(loadPromises);

    if (onProgress) onProgress('Character vault loaded ready for next game!', 100);

    return {
      theme: data.theme,
      gameName: data.gameName,
      ...(typeof data.boardSize === 'number' ? { boardSize: data.boardSize } : {}),
      ...(typeof data.aiLevel === 'number' ? { aiLevel: data.aiLevel } : {}),
      musicVolume: data.musicVolume,
      musicMuted: data.musicMuted,
      ...(typeof data.selectedTrackId === 'string' ? { selectedTrackId: data.selectedTrackId } : {}),
      pieceNames: data.pieceNames,
      pieceWeapons: data.pieceWeapons,
      pieceModels: resolvedModels,
      ...(data.pieceGlbUrls && typeof data.pieceGlbUrls === 'object' ? { pieceGlbUrls: data.pieceGlbUrls } : {}),
    };
  } catch (error: any) {
    console.error('Failed to load settings from Firebase:', error);
    handleFirestoreError(error, OperationType.GET, settingsPath);
  }
}
