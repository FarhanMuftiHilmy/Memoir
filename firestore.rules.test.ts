import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

async function runDirtyDozenSuite() {
  testEnv = await initializeTestEnvironment({
    projectId: 'chromanote-security-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });

  const userA = testEnv.authenticatedContext('userA', { email: 'a@example.com', email_verified: true });
  const userB = testEnv.authenticatedContext('userB', { email: 'b@example.com', email_verified: true });
  const unverifiedA = testEnv.authenticatedContext('userA', { email: 'a@example.com', email_verified: false });

  const validNote = {
    id: 'note_1',
    ownerId: 'userA',
    title: 'Shopping List',
    type: 'text',
    content: 'Milk and eggs',
    items: [],
    color: 'yellow',
    isPinned: false,
    isArchived: false,
    isTrashed: false,
    isLocked: false,
    isWidget: false,
    reminderAt: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await assertSucceeds(setDoc(doc(userA.firestore(), 'users/userA/notes/note_1'), validNote));

  // 1. Cross-tenant read
  await assertFails(getDoc(doc(userB.firestore(), 'users/userA/notes/note_1')));
  // 2. Owner spoofing
  await assertFails(setDoc(doc(userA.firestore(), 'users/userA/notes/note_2'), { ...validNote, id: 'note_2', ownerId: 'userB' }));
  // 3. Path ID mismatch
  await assertFails(setDoc(doc(userA.firestore(), 'users/userA/notes/note_3'), { ...validNote, id: 'other_id' }));
  // 4. Ghost field injection
  await assertFails(setDoc(doc(userA.firestore(), 'users/userA/notes/note_4'), { ...validNote, id: 'note_4', isAdmin: true }));
  // 5. Unverified email write
  await assertFails(setDoc(doc(unverifiedA.firestore(), 'users/userA/notes/note_5'), { ...validNote, id: 'note_5' }));
  // 6. Client timestamp forgery
  await assertFails(setDoc(doc(userA.firestore(), 'users/userA/notes/note_6'), { ...validNote, id: 'note_6', createdAt: new Date(0) }));
  // 7. Immutable field mutation
  await assertFails(updateDoc(doc(userA.firestore(), 'users/userA/notes/note_1'), { ownerId: 'userB', updatedAt: serverTimestamp() }));
  // 8. Invalid color enum
  await assertFails(setDoc(doc(userA.firestore(), 'users/userA/notes/note_8'), { ...validNote, id: 'note_8', color: 'neon-rainbow' }));
  // 9. Oversized content
  await assertFails(setDoc(doc(userA.firestore(), 'users/userA/notes/note_9'), { ...validNote, id: 'note_9', content: 'x'.repeat(50001) }));
  // 10. Invalid path ID
  await assertFails(setDoc(doc(userA.firestore(), 'users/userA/notes/bad$id!'), { ...validNote, id: 'bad$id!' }));
  // 11. Backup tampering (update)
  await assertFails(updateDoc(doc(userA.firestore(), 'users/userA/backups/b1'), { label: 'tampered' }));
  // 12. Arbitrary settings document path
  await assertFails(setDoc(doc(userA.firestore(), 'users/userA/settings/billing'), { ownerId: 'userA' }));

  await testEnv.cleanup();
}

export { runDirtyDozenSuite };
