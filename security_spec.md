# ChromaNote Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **Strict Ownership Isolation**: Every note (`/users/{userId}/notes/{noteId}`), backup snapshot (`/users/{userId}/backups/{backupId}`), and preferences document (`/users/{userId}/settings/preferences`) can only be read or mutated by the authenticated owner whose `request.auth.uid == userId`.
2. **Email Verification for Writes**: All write operations (`create`, `update`, `delete`) require `request.auth.token.email_verified == true`.
3. **Path-Payload Binding & ID Hygiene**: Document IDs (`userId`, `noteId`, `backupId`) must match `^[a-zA-Z0-9_\-]+$` (max 128 chars), and `incoming().id` / `incoming().ownerId` must match the path variables.
4. **Immutable Audit & Ownership Fields**: `id`, `ownerId`, and `createdAt` cannot be modified after creation. `createdAt` and `updatedAt` must equal `request.time` from the server.
5. **Strict Key Allowlists & Bounded Collections**: No shadow/ghost fields are permitted (`hasAll` + `hasOnly` on create; `affectedKeys().hasOnly` on update). Text fields and arrays (`items <= 200`, `notes <= 300`) are strictly bounded.
6. **Immutable Backup Snapshots**: Backups are append-only (`allow update: if false`), preventing silent tampering of historical recovery snapshots.
7. **Query Enforcement**: `allow list` rules explicitly verify `resource.data.ownerId == request.auth.uid` without relying on client-side filtering.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Cross-Tenant Note Read/List**: User B attempts `get` or `list` on `/users/userA/notes`.
2. **Owner Spoofing on Create**: User A creates `/users/userA/notes/n1` with `ownerId: "userB"`.
3. **Path ID Mismatch**: User A creates `/users/userA/notes/n1` with `id: "n2"`.
4. **Ghost/Shadow Field Injection**: User A creates a note with an extra unexpected key `{ ..., isAdmin: true }`.
5. **Unverified Email Write**: An authenticated user with `email_verified: false` attempts to create a note.
6. **Client Timestamp Forgery**: User A creates a note with `createdAt: Timestamp(1999-01-01)` instead of `serverTimestamp()`.
7. **Immutable Field Mutation**: User A updates an existing note attempting to change `createdAt` or `ownerId`.
8. **Invalid Color Enum**: User A writes `color: "neon-rainbow"`.
9. **Denial-of-Wallet Oversized Content**: User A writes a `content` string exceeding 50,000 characters or `title` > 200 chars.
10. **Oversized Path ID Poisoning**: User A attempts a write to `/users/userA/notes/` with a 300-character ID or invalid characters (`../hack`).
11. **Backup Tampering (Update)**: User A attempts to `update` an existing backup snapshot in `/users/userA/backups/b1`.
12. **Arbitrary Settings Document Path**: User A attempts to create `/users/userA/settings/billing` instead of `preferences`.
