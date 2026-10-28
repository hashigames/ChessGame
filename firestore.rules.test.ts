/**
 * Firestore Security Rules Test Suite - Verifies the "Dirty Dozen" adversarial payloads
 * all return PERMISSION_DENIED and valid operations succeed.
 */
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import * as fs from 'fs';

const PROJECT_ID = 'planar-deck-ncf5x-test';

const validPieceMap = {
  pawn: 'Soldier',
  rook: 'Castle',
  knight: 'Horse',
  bishop: 'Priest',
  queen: 'General',
  king: 'Leader',
};

export async function runSecurityRulesTests() {
  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });

  try {
    const unverifiedUser = testEnv.authenticatedContext('user_1', {
      email: 'user1@example.com',
      email_verified: false,
    });
    const verifiedUser1 = testEnv.authenticatedContext('user_1', {
      email: 'user1@example.com',
      email_verified: true,
    });
    const attacker = testEnv.authenticatedContext('attacker_99', {
      email: 'attacker@example.com',
      email_verified: true,
    });

    const baseSettings = {
      ownerId: 'user_1',
      theme: 'park',
      gameName: 'Tactical Chess 3D Studio',
      boardSize: 8,
      aiLevel: 2,
      musicVolume: 0.5,
      musicMuted: false,
      selectedTrackId: 'imperial_oriental',
      pieceNames: validPieceMap,
      pieceWeapons: validPieceMap,
      pieceModelRefs: {},
      updatedAt: serverTimestamp(),
    };

    // 1. Unverified Email Spoof Attack
    await assertFails(
      setDoc(doc(unverifiedUser.firestore(), 'users/user_1/settings/current'), baseSettings)
    );

    // 2. Cross-Tenant Identity Spoofing
    await assertFails(
      setDoc(doc(attacker.firestore(), 'users/user_1/settings/current'), baseSettings)
    );

    // Valid creation by verified owner succeeds
    await assertSucceeds(
      setDoc(doc(verifiedUser1.firestore(), 'users/user_1/settings/current'), baseSettings)
    );

    // 3. Shadow Field Injection on UserSettings
    await assertFails(
      updateDoc(doc(verifiedUser1.firestore(), 'users/user_1/settings/current'), {
        ...baseSettings,
        isVerifiedAdmin: true,
      })
    );

    // 4. Value Poisoning on UserSettings.theme
    await assertFails(
      updateDoc(doc(verifiedUser1.firestore(), 'users/user_1/settings/current'), {
        ...baseSettings,
        theme: 'cyber_hell_invalid',
      })
    );

    // 5. Denial-of-Wallet Oversized String on UserSettings.gameName
    await assertFails(
      setDoc(doc(verifiedUser1.firestore(), 'users/user_1/settings/oversized'), {
        ...baseSettings,
        gameName: 'A'.repeat(500),
      })
    );

    // 6. Path ID Poisoning
    await assertFails(
      setDoc(doc(verifiedUser1.firestore(), 'users/user_1/files/invalid$id!'), {
        ownerId: 'user_1',
        name: 'pawn_mesh',
        fileType: '3d_file',
        totalChunks: 2,
        status: 'uploading',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // 7. Client Timestamp Forgery
    await assertFails(
      setDoc(doc(verifiedUser1.firestore(), 'users/user_1/files/file_forged_time'), {
        ownerId: 'user_1',
        name: 'pawn_mesh',
        fileType: '3d_file',
        totalChunks: 2,
        status: 'uploading',
        createdAt: Timestamp.fromMillis(1000000),
        updatedAt: serverTimestamp(),
      })
    );

    // 8. State Shortcutting on FileMetadata Creation (skipping 'uploading')
    await assertFails(
      setDoc(doc(verifiedUser1.firestore(), 'users/user_1/files/file_shortcut'), {
        ownerId: 'user_1',
        name: 'pawn_mesh',
        fileType: '3d_file',
        totalChunks: 2,
        status: 'ready',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // Valid FileMetadata creation in 'uploading' state
    await assertSucceeds(
      setDoc(doc(verifiedUser1.firestore(), 'users/user_1/files/file_1'), {
        ownerId: 'user_1',
        name: 'pawn_mesh',
        fileType: '3d_file',
        totalChunks: 2,
        status: 'uploading',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // 10. Orphaned FileChunk Creation Without Parent FileMetadata
    await assertFails(
      setDoc(doc(verifiedUser1.firestore(), 'users/user_1/files/non_existent_file/chunks/0'), {
        ownerId: 'user_1',
        fileId: 'non_existent_file',
        chunkIndex: 0,
        data: 'data:application/octet-stream;base64,AAAA',
        createdAt: serverTimestamp(),
      })
    );

    // 11. Out-of-Bounds chunkIndex Injection on FileChunk (parent totalChunks == 2)
    await assertFails(
      setDoc(doc(verifiedUser1.firestore(), 'users/user_1/files/file_1/chunks/99'), {
        ownerId: 'user_1',
        fileId: 'file_1',
        chunkIndex: 99,
        data: 'data:application/octet-stream;base64,AAAA',
        createdAt: serverTimestamp(),
      })
    );

    // Valid FileChunk creation
    await assertSucceeds(
      setDoc(doc(verifiedUser1.firestore(), 'users/user_1/files/file_1/chunks/0'), {
        ownerId: 'user_1',
        fileId: 'file_1',
        chunkIndex: 0,
        data: 'data:application/octet-stream;base64,AAAA',
        createdAt: serverTimestamp(),
      })
    );

    // Transition FileMetadata to terminal 'ready' state
    await assertSucceeds(
      updateDoc(doc(verifiedUser1.firestore(), 'users/user_1/files/file_1'), {
        status: 'ready',
        updatedAt: serverTimestamp(),
      })
    );

    // 9. Terminal State Mutation on Locked FileMetadata
    await assertFails(
      updateDoc(doc(verifiedUser1.firestore(), 'users/user_1/files/file_1'), {
        status: 'uploading',
        updatedAt: serverTimestamp(),
      })
    );

    // 12. Unauthorized Cross-User List Scraping on chunks
    await assertFails(
      getDocs(
        query(
          collection(attacker.firestore(), 'users/user_1/files/file_1/chunks'),
          where('ownerId', '==', 'user_1')
        )
      )
    );
  } finally {
    await testEnv.cleanup();
  }
}
