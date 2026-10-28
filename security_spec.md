# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants & Master Source of Truth

1. **Identity & Verification Invariant**:
   - Every read or write operation requires a signed-in user with a verified email (`request.auth != null && request.auth.token.email_verified == true`).
   - Users can only access documents within their own namespace (`/users/{userId}/...` where `request.auth.uid == userId`), and the document's `ownerId` field must strictly match both `request.auth.uid` and `userId`.
2. **Master Gate & Relational Sync Invariant**:
   - `FileChunk` documents (`/users/{userId}/files/{fileId}/chunks/{chunkId}`) belong to a parent `FileMetadata` document (`/users/{userId}/files/{fileId}`).
   - A `FileChunk` cannot be created or read unless the parent `FileMetadata` document exists and `get(/databases/$(database)/documents/users/$(userId)/files/$(fileId)).data.ownerId == request.auth.uid`.
   - Furthermore, a `FileChunk` can only be created while the parent `FileMetadata` is in `status == 'uploading'` and `chunkIndex < parent.totalChunks`.
3. **Terminal State Locking Invariant**:
   - `FileMetadata` starts with `status == 'uploading'` and transitions via a single allowed action to `status == 'ready'`.
   - Once `FileMetadata.status == 'ready'`, all subsequent updates to `FileMetadata` or creations of new `FileChunk` records under that file are permanently locked.
4. **Temporal & Immutability Invariant**:
   - All `createdAt` and `updatedAt` fields must equal `request.time` on write (`serverTimestamp()`).
   - `ownerId` and `createdAt` are immutable across all updates (`incoming().ownerId == existing().ownerId`).
   - `FileChunk` documents are completely immutable (`allow update: if false;`).
5. **Path & Volumetric Bounds Invariant**:
   - All path IDs (`userId`, `settingId`, `fileId`, `chunkId`) must match `^[a-zA-Z0-9_\-]+$` and be 1..128 characters.
   - All strings, numbers, and maps have strict size and range bounds enforced via `isValidUserSettings`, `isValidFileMetadata`, and `isValidFileChunk`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

### Payload 1: Unverified Email Spoof Attack (Pillar 6 / Email Spoofing)
- **Target**: `CREATE /users/user_1/settings/current`
- **Auth Context**: `{ uid: "user_1", token: { email: "user1@example.com", email_verified: false } }`
- **Expected**: `PERMISSION_DENIED`

### Payload 2: Cross-Tenant Identity Spoofing (Pillar 2)
- **Target**: `CREATE /users/user_1/settings/current`
- **Auth Context**: `{ uid: "attacker_99", token: { email_verified: true } }`
- **Payload**: `{ ownerId: "user_1", ...validSettings }`
- **Expected**: `PERMISSION_DENIED`

### Payload 3: Shadow Field Injection on `UserSettings` (Pillar 2 / Anti-Update-Gap)
- **Target**: `UPDATE /users/user_1/settings/current`
- **Payload**: `{ ...validSettings, isVerifiedAdmin: true }`
- **Expected**: `PERMISSION_DENIED`

### Payload 4: Value Poisoning on `UserSettings.theme` (Enum Violation)
- **Target**: `UPDATE /users/user_1/settings/current`
- **Payload**: `{ ...validSettings, theme: "cyber_hell_invalid" }`
- **Expected**: `PERMISSION_DENIED`

### Payload 5: Denial-of-Wallet Oversized String on `UserSettings.gameName` (Pillar 3)
- **Target**: `CREATE /users/user_1/settings/current`
- **Payload**: `{ ...validSettings, gameName: "A".repeat(500) }`
- **Expected**: `PERMISSION_DENIED`

### Payload 6: Path ID Poisoning (Pillar 3)
- **Target**: `CREATE /users/user_1/files/invalid$id!with*spaces`
- **Payload**: `{ ...validFileMetadata }`
- **Expected**: `PERMISSION_DENIED`

### Payload 7: Client Timestamp Forgery (Temporal Integrity)
- **Target**: `CREATE /users/user_1/files/file_1`
- **Payload**: `{ ...validFileMetadata, createdAt: Timestamp.fromMillis(1000000) }`
- **Expected**: `PERMISSION_DENIED`

### Payload 8: State Shortcutting on `FileMetadata` Creation (Terminal State Gate)
- **Target**: `CREATE /users/user_1/files/file_1`
- **Payload**: `{ ...validFileMetadata, status: "ready" }` (skipping `"uploading"`)
- **Expected**: `PERMISSION_DENIED`

### Payload 9: Terminal State Mutation on Locked `FileMetadata` (Phase 4 Rule 6)
- **Target**: `UPDATE /users/user_1/files/file_locked` (where `existing().status == "ready"`)
- **Payload**: `{ ...existingFileMetadata, name: "Hacked Name", updatedAt: serverTimestamp() }`
- **Expected**: `PERMISSION_DENIED`

### Payload 10: Orphaned `FileChunk` Creation Without Parent `FileMetadata` (Pillar 1 Master Gate)
- **Target**: `CREATE /users/user_1/files/non_existent_file/chunks/0`
- **Payload**: `{ ownerId: "user_1", fileId: "non_existent_file", chunkIndex: 0, data: "base64...", createdAt: serverTimestamp() }`
- **Expected**: `PERMISSION_DENIED`

### Payload 11: Out-of-Bounds `chunkIndex` Injection on `FileChunk` (Pillar 2 Boundary Limits)
- **Target**: `CREATE /users/user_1/files/file_1/chunks/99` (where parent `totalChunks == 2`)
- **Payload**: `{ ownerId: "user_1", fileId: "file_1", chunkIndex: 99, data: "base64...", createdAt: serverTimestamp() }`
- **Expected**: `PERMISSION_DENIED`

### Payload 12: Unauthorized Cross-User List Scraping on `chunks` (Pillar 8 Query Enforcer)
- **Target**: `LIST /users/user_1/files/file_1/chunks`
- **Auth Context**: `{ uid: "attacker_2", token: { email_verified: true } }`
- **Expected**: `PERMISSION_DENIED`
