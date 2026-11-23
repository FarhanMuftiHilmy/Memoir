import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  BackupSnapshot,
  ChecklistItem,
  Note,
  NOTE_LIMITS,
  NoteColor,
  UserPreferences,
} from '../types';
import { notesToBackupRecords } from '../utils/exportNotes';

const VALID_COLORS: NoteColor[] = [
  'yellow',
  'orange',
  'red',
  'green',
  'teal',
  'blue',
  'purple',
  'pink',
  'gray',
];

export function sanitizeNoteForFirestore(note: Note, ownerId: string) {
  const safeColor: NoteColor = VALID_COLORS.includes(note.color) ? note.color : 'yellow';
  const safeItems: ChecklistItem[] = (note.items || [])
    .slice(0, NOTE_LIMITS.MAX_ITEMS)
    .map((item, idx) => ({
      id: (item.id || `item_${idx}`).replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 64) || `item_${idx}`,
      text: String(item.text ?? '').slice(0, NOTE_LIMITS.MAX_ITEM_TEXT),
      checked: Boolean(item.checked),
    }));

  return {
    id: note.id,
    ownerId,
    title: String(note.title ?? '').slice(0, NOTE_LIMITS.MAX_TITLE),
    type: note.type === 'checklist' ? ('checklist' as const) : ('text' as const),
    content: String(note.content ?? '').slice(0, NOTE_LIMITS.MAX_CONTENT),
    items: safeItems,
    color: safeColor,
    isPinned: Boolean(note.isPinned),
    isArchived: Boolean(note.isArchived),
    isTrashed: Boolean(note.isTrashed),
    isLocked: Boolean(note.isLocked),
    isWidget: Boolean(note.isWidget),
    reminderAt: String(note.reminderAt ?? '').slice(0, NOTE_LIMITS.MAX_REMINDER_LEN),
  };
}

function toEpochMs(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof val === 'number') return val;
  if (val && typeof val === 'object' && 'seconds' in val) {
    const sec = Number((val as { seconds: number }).seconds);
    return Number.isFinite(sec) ? sec * 1000 : Date.now();
  }
  return Date.now();
}

export function subscribeUserNotes(
  userId: string,
  onData: (notes: Note[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = `users/${userId}/notes`;
  const q = query(collection(db, path), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const notes: Note[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: String(d.id ?? docSnap.id),
          ownerId: String(d.ownerId ?? userId),
          title: String(d.title ?? ''),
          type: d.type === 'checklist' ? 'checklist' : 'text',
          content: String(d.content ?? ''),
          items: Array.isArray(d.items) ? d.items : [],
          color: VALID_COLORS.includes(d.color) ? d.color : 'yellow',
          isPinned: Boolean(d.isPinned),
          isArchived: Boolean(d.isArchived),
          isTrashed: Boolean(d.isTrashed),
          isLocked: Boolean(d.isLocked),
          isWidget: Boolean(d.isWidget),
          reminderAt: String(d.reminderAt ?? ''),
          createdAt: toEpochMs(d.createdAt),
          updatedAt: toEpochMs(d.updatedAt),
        };
      });
      onData(notes);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeUserBackups(
  userId: string,
  onData: (backups: BackupSnapshot[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = `users/${userId}/backups`;
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: BackupSnapshot[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: String(d.id ?? docSnap.id),
          ownerId: String(d.ownerId ?? userId),
          label: String(d.label ?? 'Backup'),
          trigger: d.trigger === 'auto' ? 'auto' : 'manual',
          noteCount: Number(d.noteCount ?? 0),
          notes: Array.isArray(d.notes) ? d.notes : [],
          createdAt: toEpochMs(d.createdAt),
          source: 'cloud',
        };
      });
      onData(list);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeUserPreferences(
  userId: string,
  onData: (prefs: UserPreferences | null) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = `users/${userId}/settings/preferences`;
  return onSnapshot(
    doc(db, path),
    (docSnap) => {
      if (!docSnap.exists()) {
        onData(null);
        return;
      }
      const d = docSnap.data();
      onData({
        theme: d.theme === 'dark' || d.theme === 'light' ? d.theme : 'system',
        viewMode: d.viewMode === 'list' || d.viewMode === 'details' ? d.viewMode : 'grid',
        defaultColor: VALID_COLORS.includes(d.defaultColor) ? d.defaultColor : 'yellow',
        autoBackupInterval:
          d.autoBackupInterval === 'on_change' ||
          d.autoBackupInterval === 'hourly' ||
          d.autoBackupInterval === 'daily'
            ? d.autoBackupInterval
            : 'off',
        lastAutoBackupAt: String(d.lastAutoBackupAt ?? ''),
        lockHash: String(d.lockHash ?? ''),
        lockSalt: String(d.lockSalt ?? ''),
        autoLockMinutes: Number.isFinite(d.autoLockMinutes) ? Number(d.autoLockMinutes) : 15,
      });
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function createNoteInCloud(userId: string, note: Note): Promise<void> {
  const path = `users/${userId}/notes/${note.id}`;
  const clean = sanitizeNoteForFirestore(note, userId);
  try {
    await setDoc(doc(db, path), {
      ...clean,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateNoteInCloud(userId: string, note: Note): Promise<void> {
  const path = `users/${userId}/notes/${note.id}`;
  const clean = sanitizeNoteForFirestore(note, userId);
  try {
    await updateDoc(doc(db, path), {
      title: clean.title,
      type: clean.type,
      content: clean.content,
      items: clean.items,
      color: clean.color,
      isPinned: clean.isPinned,
      isArchived: clean.isArchived,
      isTrashed: clean.isTrashed,
      isLocked: clean.isLocked,
      isWidget: clean.isWidget,
      reminderAt: clean.reminderAt,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteNoteInCloud(userId: string, noteId: string): Promise<void> {
  const path = `users/${userId}/notes/${noteId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createBackupInCloud(
  userId: string,
  backupId: string,
  label: string,
  trigger: 'manual' | 'auto',
  notes: Note[]
): Promise<void> {
  const path = `users/${userId}/backups/${backupId}`;
  const boundedNotes = notesToBackupRecords(notes.slice(0, NOTE_LIMITS.MAX_BACKUP_NOTES));
  try {
    await setDoc(doc(db, path), {
      id: backupId,
      ownerId: userId,
      label: label.slice(0, 120) || 'Backup Snapshot',
      trigger,
      noteCount: boundedNotes.length,
      notes: boundedNotes,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteBackupInCloud(userId: string, backupId: string): Promise<void> {
  const path = `users/${userId}/backups/${backupId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

async function ensurePreferencesDoc(userId: string, prefs: UserPreferences): Promise<boolean> {
  const path = `users/${userId}/settings/preferences`;
  const ref = doc(db, path);
  const snap = await getDoc(ref);
  if (snap.exists()) return true;
  await setDoc(ref, {
    ownerId: userId,
    theme: prefs.theme,
    viewMode: prefs.viewMode,
    defaultColor: prefs.defaultColor,
    autoBackupInterval: prefs.autoBackupInterval,
    lastAutoBackupAt: prefs.lastAutoBackupAt.slice(0, 40),
    lockHash: prefs.lockHash.slice(0, 128),
    lockSalt: prefs.lockSalt.slice(0, 64),
    autoLockMinutes: Math.max(0, Math.min(1440, Math.round(prefs.autoLockMinutes))),
    updatedAt: serverTimestamp(),
  });
  return false;
}

export async function saveAppearancePreferencesCloud(
  userId: string,
  fullPrefs: UserPreferences
): Promise<void> {
  const path = `users/${userId}/settings/preferences`;
  try {
    const existed = await ensurePreferencesDoc(userId, fullPrefs);
    if (existed) {
      await updateDoc(doc(db, path), {
        theme: fullPrefs.theme,
        viewMode: fullPrefs.viewMode,
        defaultColor: fullPrefs.defaultColor,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveBackupPreferencesCloud(
  userId: string,
  fullPrefs: UserPreferences
): Promise<void> {
  const path = `users/${userId}/settings/preferences`;
  try {
    const existed = await ensurePreferencesDoc(userId, fullPrefs);
    if (existed) {
      await updateDoc(doc(db, path), {
        autoBackupInterval: fullPrefs.autoBackupInterval,
        lastAutoBackupAt: fullPrefs.lastAutoBackupAt.slice(0, 40),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveSecurityPreferencesCloud(
  userId: string,
  fullPrefs: UserPreferences
): Promise<void> {
  const path = `users/${userId}/settings/preferences`;
  try {
    const existed = await ensurePreferencesDoc(userId, fullPrefs);
    if (existed) {
      await updateDoc(doc(db, path), {
        lockHash: fullPrefs.lockHash.slice(0, 128),
        lockSalt: fullPrefs.lockSalt.slice(0, 64),
        autoLockMinutes: Math.max(0, Math.min(1440, Math.round(fullPrefs.autoLockMinutes))),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
