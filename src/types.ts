export type NoteColor =
  | 'yellow'
  | 'orange'
  | 'red'
  | 'green'
  | 'teal'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'gray';

export type NoteType = 'text' | 'checklist';

export type ViewMode = 'grid' | 'list' | 'details';

export type SortBy = 'updated' | 'created' | 'color' | 'title';

export type FilterSection =
  | 'all'
  | 'text'
  | 'checklist'
  | 'pinned'
  | 'widgets'
  | 'reminders'
  | 'locked'
  | 'archived'
  | 'trash';

export type ThemeMode = 'system' | 'light' | 'dark';

export type AutoBackupInterval = 'off' | 'on_change' | 'hourly' | 'daily';

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'offline' | 'error';

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface Note {
  id: string;
  ownerId: string;
  title: string;
  type: NoteType;
  content: string;
  items: ChecklistItem[];
  color: NoteColor;
  isPinned: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  isLocked: boolean;
  isWidget: boolean;
  reminderAt: string;
  createdAt: number; // epoch ms for local state / sorting
  updatedAt: number; // epoch ms for local state / sorting
}

export interface BackupNoteRecord {
  id: string;
  title: string;
  type: NoteType;
  content: string;
  items: ChecklistItem[];
  color: NoteColor;
  isPinned: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  isLocked: boolean;
  isWidget: boolean;
  reminderAt: string;
  createdAt: number;
  updatedAt: number;
}

export interface BackupSnapshot {
  id: string;
  ownerId: string;
  label: string;
  trigger: 'manual' | 'auto';
  noteCount: number;
  notes: BackupNoteRecord[];
  createdAt: number;
  source: 'cloud' | 'local';
}

export interface UserPreferences {
  theme: ThemeMode;
  viewMode: ViewMode;
  defaultColor: NoteColor;
  autoBackupInterval: AutoBackupInterval;
  lastAutoBackupAt: string;
  lockHash: string;
  lockSalt: string;
  autoLockMinutes: number;
}

// Synchronized validation bounds from firebase-blueprint.json
export const NOTE_LIMITS = {
  MAX_TITLE: 200,
  MAX_CONTENT: 50000,
  MAX_ITEMS: 200,
  MAX_ITEM_TEXT: 1000,
  MAX_BACKUP_NOTES: 300,
  MAX_REMINDER_LEN: 40,
} as const;
