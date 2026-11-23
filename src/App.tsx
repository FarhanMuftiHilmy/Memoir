import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  Archive,
  Bell,
  Check,
  CheckSquare,
  Cloud,
  CloudOff,
  FileText,
  FolderOutput,
  HardDrive,
  History,
  KeyRound,
  LayoutGrid,
  List,
  Lock,
  LockOpen,
  LogIn,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Pin,
  Plus,
  Rows3,
  Search,
  Shield,
  Smartphone,
  StickyNote,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { ExportModal } from './components/ExportModal';
import { FloatingQuickWidget } from './components/FloatingQuickWidget';
import { HomeWidgetsView } from './components/HomeWidgetsView';
import { NoteCard } from './components/NoteCard';
import { NoteEditorModal } from './components/NoteEditorModal';
import { PasswordModal, PasswordModalMode } from './components/PasswordModal';
import { NOTE_COLOR_LIST, NOTE_COLORS } from './constants/colors';
import { auth, googleProvider } from './firebase';
import { useOnlineStatus, usePWAInstall } from './hooks/usePWAInstall';
import {
  createBackupInCloud,
  createNoteInCloud,
  deleteBackupInCloud,
  deleteNoteInCloud,
  saveAppearancePreferencesCloud,
  saveBackupPreferencesCloud,
  saveSecurityPreferencesCloud,
  subscribeUserBackups,
  subscribeUserNotes,
  subscribeUserPreferences,
  updateNoteInCloud,
} from './services/notesService';
import {
  AutoBackupInterval,
  BackupSnapshot,
  FilterSection,
  Note,
  NOTE_LIMITS,
  NoteColor,
  NoteType,
  SortBy,
  SyncStatus,
  ThemeMode,
  UserPreferences,
  ViewMode,
} from './types';
import { generateId } from './utils/crypto';
import { exportSingleNote, notesToBackupRecords } from './utils/exportNotes';
import { createStarterNotes } from './utils/sampleNotes';

const LS_NOTES_KEY = 'chromanote_notes_v1';
const LS_BACKUPS_KEY = 'chromanote_backups_v1';
const LS_PREFS_KEY = 'chromanote_prefs_v1';
const LS_THEME_KEY = 'chromanote_theme';

const DEFAULT_PREFS: UserPreferences = {
  theme: 'system',
  viewMode: 'grid',
  defaultColor: 'yellow',
  autoBackupInterval: 'daily',
  lastAutoBackupAt: '',
  lockHash: '',
  lockSalt: '',
  autoLockMinutes: 15,
};

function loadLocalNotes(): Note[] {
  try {
    const raw = localStorage.getItem(LS_NOTES_KEY);
    if (!raw) {
      const starter = createStarterNotes('local');
      localStorage.setItem(LS_NOTES_KEY, JSON.stringify(starter));
      return starter;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadLocalBackups(): BackupSnapshot[] {
  try {
    const raw = localStorage.getItem(LS_BACKUPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadLocalPrefs(): UserPreferences {
  try {
    const raw = localStorage.getItem(LS_PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export default function App() {
  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [notes, setNotes] = useState<Note[]>(() => loadLocalNotes());
  const [cloudBackups, setCloudBackups] = useState<BackupSnapshot[]>([]);
  const [localBackups, setLocalBackups] = useState<BackupSnapshot[]>(() => loadLocalBackups());
  const [prefs, setPrefs] = useState<UserPreferences>(() => loadLocalPrefs());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');

  // UI Filter & Navigation State
  const [section, setSection] = useState<FilterSection>('all');
  const [colorFilter, setColorFilter] = useState<NoteColor | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('updated');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);

  // Vault Security State
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [passwordModal, setPasswordModal] = useState<{
    mode: PasswordModalMode;
    pendingAction?: () => void;
    pendingLockNote?: Note;
  } | null>(null);

  // Modals
  const [editingNote, setEditingNote] = useState<{ note: Note; isNew: boolean } | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const autoBackupTimerRef = useRef<number | null>(null);
  const mergedGuestUidRef = useRef<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  // Apply Dark/Light/System theme to <html>
  useEffect(() => {
    localStorage.setItem(LS_THEME_KEY, prefs.theme);
    const apply = () => {
      const dark =
        prefs.theme === 'dark' ||
        (prefs.theme === 'system' &&
          window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();

    if (prefs.theme === 'system' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [prefs.theme]);

  // Persist local cache whenever guest or offline
  useEffect(() => {
    if (!user) {
      localStorage.setItem(LS_NOTES_KEY, JSON.stringify(notes));
    }
  }, [notes, user]);

  useEffect(() => {
    localStorage.setItem(LS_BACKUPS_KEY, JSON.stringify(localBackups.slice(0, 15)));
  }, [localBackups]);

  useEffect(() => {
    localStorage.setItem(LS_PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  // Cmd/Ctrl+K search shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Handle PWA Home Screen Shortcut URLs
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const view = params.get('view');
    if (view === 'widgets') {
      setSection('widgets');
    } else if (action === 'new-text' || action === 'new-checklist') {
      const type: NoteType = action === 'new-checklist' ? 'checklist' : 'text';
      const now = Date.now();
      setEditingNote({
        isNew: true,
        note: {
          id: generateId('note'),
          ownerId: user?.uid || 'local',
          title: '',
          type,
          content: '',
          items: [],
          color: prefs.defaultColor,
          isPinned: false,
          isArchived: false,
          isTrashed: false,
          isLocked: false,
          isWidget: false,
          reminderAt: '',
          createdAt: now,
          updatedAt: now,
        },
      });
    }
    if (action || view) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [prefs.defaultColor, user?.uid]);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setSyncStatus('local');
        setCloudBackups([]);
        setNotes(loadLocalNotes());
      }
    });
    return () => unsub();
  }, []);

  // Firestore real-time subscriptions when authenticated
  useEffect(() => {
    if (!authReady || !user) return;

    setSyncStatus(isOnline ? 'syncing' : 'offline');

    const unsubNotes = subscribeUserNotes(
      user.uid,
      async (cloudNotes) => {
        // On initial sign-in, if cloud is empty and user has local notes, sync them up!
        if (cloudNotes.length === 0 && mergedGuestUidRef.current !== user.uid) {
          mergedGuestUidRef.current = user.uid;
          const local = loadLocalNotes();
          if (local.length > 0) {
            for (const ln of local) {
              await createNoteInCloud(user.uid, { ...ln, ownerId: user.uid });
            }
            return;
          }
        }
        mergedGuestUidRef.current = user.uid;
        setNotes(cloudNotes);
        setSyncStatus(isOnline ? 'synced' : 'offline');
      },
      () => setSyncStatus('error')
    );

    const unsubBackups = subscribeUserBackups(
      user.uid,
      (snaps) => setCloudBackups(snaps),
      () => setSyncStatus('error')
    );

    const unsubPrefs = subscribeUserPreferences(user.uid, (cloudPrefs) => {
      if (cloudPrefs) {
        setPrefs(cloudPrefs);
      }
    });

    return () => {
      unsubNotes();
      unsubBackups();
      unsubPrefs();
    };
  }, [authReady, user, isOnline]);

  // Auto-lock vault timer
  useEffect(() => {
    if (!isVaultUnlocked || !prefs.lockHash || prefs.autoLockMinutes <= 0) return;
    const ms = prefs.autoLockMinutes * 60_000;
    let timer = window.setTimeout(() => {
      setIsVaultUnlocked(false);
      showToast('Vault auto-locked for security.');
    }, ms);

    const resetTimer = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setIsVaultUnlocked(false);
        showToast('Vault auto-locked for security.');
      }, ms);
    };

    window.addEventListener('pointerdown', resetTimer);
    window.addEventListener('keydown', resetTimer);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [isVaultUnlocked, prefs.lockHash, prefs.autoLockMinutes, showToast]);

  // Create Backup Snapshot helper
  const createSnapshot = useCallback(
    async (label: string, trigger: 'manual' | 'auto', sourceNotes: Note[]) => {
      const id = generateId('bak');
      const nowIso = new Date().toISOString();
      const snapshot: BackupSnapshot = {
        id,
        ownerId: user?.uid || 'local',
        label,
        trigger,
        noteCount: Math.min(sourceNotes.length, NOTE_LIMITS.MAX_BACKUP_NOTES),
        notes: notesToBackupRecords(sourceNotes.slice(0, NOTE_LIMITS.MAX_BACKUP_NOTES)),
        createdAt: Date.now(),
        source: user ? 'cloud' : 'local',
      };

      setLocalBackups((prev) => [snapshot, ...prev].slice(0, 15));

      if (user) {
        setSyncStatus('syncing');
        await createBackupInCloud(user.uid, id, label, trigger, sourceNotes);
        const nextPrefs = { ...prefs, lastAutoBackupAt: nowIso };
        setPrefs(nextPrefs);
        if (trigger === 'auto') {
          await saveBackupPreferencesCloud(user.uid, nextPrefs);
        }
        setSyncStatus('synced');
      } else if (trigger === 'auto') {
        setPrefs((p) => ({ ...p, lastAutoBackupAt: nowIso }));
      }
    },
    [user, prefs]
  );

  // Scheduled hourly/daily auto-backup checker
  useEffect(() => {
    if (prefs.autoBackupInterval !== 'hourly' && prefs.autoBackupInterval !== 'daily') return;
    const intervalMs = prefs.autoBackupInterval === 'hourly' ? 3600_000 : 86400_000;

    const checkSchedule = () => {
      if (notes.length === 0) return;
      const lastMs = prefs.lastAutoBackupAt ? Date.parse(prefs.lastAutoBackupAt) : 0;
      if (!lastMs || Date.now() - lastMs >= intervalMs) {
        void createSnapshot(
          `Scheduled ${prefs.autoBackupInterval === 'hourly' ? 'Hourly' : 'Daily'} Backup`,
          'auto',
          notes
        );
      }
    };

    const initTimer = window.setTimeout(checkSchedule, 2500);
    const poll = window.setInterval(checkSchedule, 60_000 * 5);
    return () => {
      window.clearTimeout(initTimer);
      window.clearInterval(poll);
    };
  }, [prefs.autoBackupInterval, prefs.lastAutoBackupAt, notes, createSnapshot]);

  const scheduleOnChangeBackup = useCallback(
    (nextNotes: Note[]) => {
      if (prefs.autoBackupInterval !== 'on_change') return;
      if (autoBackupTimerRef.current) window.clearTimeout(autoBackupTimerRef.current);
      autoBackupTimerRef.current = window.setTimeout(() => {
        void createSnapshot('Auto-Backup on Edit', 'auto', nextNotes);
      }, 4000);
    },
    [prefs.autoBackupInterval, createSnapshot]
  );

  // CRUD operations
  const handleSaveNote = async (updated: Note, isNew: boolean) => {
    const withOwner: Note = { ...updated, ownerId: user?.uid || 'local' };
    let nextNotes: Note[];
    if (isNew) {
      nextNotes = [withOwner, ...notes];
      setNotes(nextNotes);
      if (user) {
        setSyncStatus('syncing');
        await createNoteInCloud(user.uid, withOwner);
        setSyncStatus('synced');
      }
    } else {
      nextNotes = notes.map((n) => (n.id === withOwner.id ? withOwner : n));
      setNotes(nextNotes);
      if (user) {
        setSyncStatus('syncing');
        await updateNoteInCloud(user.uid, withOwner);
        setSyncStatus('synced');
      }
    }
    scheduleOnChangeBackup(nextNotes);
  };

  const handlePatchNote = async (note: Note, patch: Partial<Note>) => {
    const updated: Note = { ...note, ...patch, updatedAt: Date.now() };
    const nextNotes = notes.map((n) => (n.id === note.id ? updated : n));
    setNotes(nextNotes);
    if (user) {
      setSyncStatus('syncing');
      await updateNoteInCloud(user.uid, updated);
      setSyncStatus('synced');
    }
    scheduleOnChangeBackup(nextNotes);
  };

  const handleDeleteForever = async (note: Note) => {
    const nextNotes = notes.filter((n) => n.id !== note.id);
    setNotes(nextNotes);
    if (user) {
      setSyncStatus('syncing');
      await deleteNoteInCloud(user.uid, note.id);
      setSyncStatus('synced');
    }
    showToast('Note permanently deleted.');
  };

  const handleEmptyTrash = async () => {
    const trashed = notes.filter((n) => n.isTrashed);
    if (trashed.length === 0) return;
    setNotes((prev) => prev.filter((n) => !n.isTrashed));
    if (user) {
      setSyncStatus('syncing');
      for (const n of trashed) {
        await deleteNoteInCloud(user.uid, n.id);
      }
      setSyncStatus('synced');
    }
    showToast(`Emptied ${trashed.length} trashed notes.`);
  };

  const handleOpenNewNote = (type: NoteType) => {
    setNewMenuOpen(false);
    const now = Date.now();
    setEditingNote({
      isNew: true,
      note: {
        id: generateId('note'),
        ownerId: user?.uid || 'local',
        title: '',
        type,
        content: '',
        items: [],
        color: colorFilter || prefs.defaultColor,
        isPinned: false,
        isArchived: false,
        isTrashed: false,
        isLocked: false,
        isWidget: section === 'widgets',
        reminderAt: '',
        createdAt: now,
        updatedAt: now,
      },
    });
  };

  const handleOpenExistingNote = (note: Note) => {
    if (note.isLocked && !isVaultUnlocked && prefs.lockHash) {
      setPasswordModal({
        mode: 'unlock',
        pendingAction: () => setEditingNote({ note, isNew: false }),
      });
      return;
    }
    setEditingNote({ note, isNew: false });
  };

  const handleToggleNoteLock = (note: Note) => {
    if (!prefs.lockHash) {
      setPasswordModal({
        mode: 'setup',
        pendingLockNote: note,
      });
      return;
    }
    if (note.isLocked && !isVaultUnlocked) {
      setPasswordModal({
        mode: 'unlock',
        pendingAction: () => void handlePatchNote(note, { isLocked: false }),
      });
      return;
    }
    void handlePatchNote(note, { isLocked: !note.isLocked });
    showToast(note.isLocked ? 'Note unlocked.' : 'Note locked with master password.');
  };

  const handleToggleChecklistItemInWidget = (note: Note, itemId: string) => {
    const nextItems = note.items.map((it) =>
      it.id === itemId ? { ...it, checked: !it.checked } : it
    );
    void handlePatchNote(note, { items: nextItems });
  };

  const handleQuickSaveTextWidget = (title: string, body: string) => {
    const now = Date.now();
    const newNote: Note = {
      id: generateId('note'),
      ownerId: user?.uid || 'local',
      title: title.slice(0, NOTE_LIMITS.MAX_TITLE),
      type: 'text',
      content: body.slice(0, NOTE_LIMITS.MAX_CONTENT),
      items: [],
      color: prefs.defaultColor,
      isPinned: false,
      isArchived: false,
      isTrashed: false,
      isLocked: false,
      isWidget: true,
      reminderAt: '',
      createdAt: now,
      updatedAt: now,
    };
    void handleSaveNote(newNote, true);
    showToast('Quick note pinned to widgets.');
  };

  // Preference Updaters
  const updateAppearancePrefs = async (patch: Partial<Pick<UserPreferences, 'theme' | 'viewMode' | 'defaultColor'>>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    if (user) {
      await saveAppearancePreferencesCloud(user.uid, next);
    }
  };

  const updateBackupInterval = async (interval: AutoBackupInterval) => {
    const next = { ...prefs, autoBackupInterval: interval };
    setPrefs(next);
    if (user) {
      await saveBackupPreferencesCloud(user.uid, next);
    }
    showToast(`Automated backup set to ${interval.replace('_', ' ')}.`);
  };

  const handleSavePasswordConfig = async (
    lockHash: string,
    lockSalt: string,
    autoLockMinutes: number
  ) => {
    const next = { ...prefs, lockHash, lockSalt, autoLockMinutes };
    setPrefs(next);
    if (user) {
      await saveSecurityPreferencesCloud(user.uid, next);
    }
    if (!lockHash) {
      setIsVaultUnlocked(false);
      // Unlock all notes if master password was removed
      const lockedNotes = notes.filter((n) => n.isLocked);
      for (const ln of lockedNotes) {
        await handlePatchNote(ln, { isLocked: false });
      }
      showToast('Master password removed.');
    } else {
      if (passwordModal?.pendingLockNote) {
        const target = passwordModal.pendingLockNote;
        if (editingNote && editingNote.note.id === target.id) {
          setEditingNote({ ...editingNote, note: { ...editingNote.note, isLocked: true } });
        } else {
          await handlePatchNote(target, { isLocked: true });
        }
      }
      showToast('Master password saved.');
    }
  };

  // Restore Backup or Import
  const handleRestoreBackup = async (snapshot: BackupSnapshot, mode: 'merge' | 'replace') => {
    const now = Date.now();
    const restored: Note[] = snapshot.notes.map((r) => ({
      ...r,
      ownerId: user?.uid || 'local',
      updatedAt: r.updatedAt || now,
      createdAt: r.createdAt || now,
    }));

    if (mode === 'replace') {
      if (user) {
        for (const old of notes) {
          await deleteNoteInCloud(user.uid, old.id);
        }
        for (const item of restored) {
          await createNoteInCloud(user.uid, item);
        }
      }
      setNotes(restored);
      return;
    }

    // Merge by ID
    const map = new Map(notes.map((n) => [n.id, n]));
    for (const item of restored) {
      const exists = map.has(item.id);
      map.set(item.id, item);
      if (user) {
        if (exists) await updateNoteInCloud(user.uid, item);
        else await createNoteInCloud(user.uid, item);
      }
    }
    setNotes(Array.from(map.values()));
  };

  const handleImportNotes = async (imported: Note[]) => {
    const map = new Map(notes.map((n) => [n.id, n]));
    for (const item of imported) {
      const normalized = { ...item, ownerId: user?.uid || 'local' };
      const exists = map.has(normalized.id);
      map.set(normalized.id, normalized);
      if (user) {
        if (exists) await updateNoteInCloud(user.uid, normalized);
        else await createNoteInCloud(user.uid, normalized);
      }
    }
    setNotes(Array.from(map.values()));
  };

  const handleDeleteBackup = async (snapshot: BackupSnapshot) => {
    setLocalBackups((prev) => prev.filter((b) => b.id !== snapshot.id));
    if (user && snapshot.source === 'cloud') {
      await deleteBackupInCloud(user.uid, snapshot.id);
    }
    showToast('Backup snapshot deleted.');
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Signed in — syncing notes across devices.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in cancelled.';
      if (!msg.includes('popup-closed-by-user')) {
        showToast('Could not complete Google sign-in.');
      }
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setIsVaultUnlocked(false);
    showToast('Signed out. Local workspace active.');
  };

  // Derived Counts & Filtered Notes
  const counts = useMemo(() => {
    const active = notes.filter((n) => !n.isTrashed && !n.isArchived);
    return {
      all: active.length,
      text: active.filter((n) => n.type === 'text').length,
      checklist: active.filter((n) => n.type === 'checklist').length,
      pinned: active.filter((n) => n.isPinned).length,
      widgets: active.filter((n) => n.isWidget).length,
      reminders: active.filter((n) => Boolean(n.reminderAt)).length,
      locked: active.filter((n) => n.isLocked).length,
      archived: notes.filter((n) => n.isArchived && !n.isTrashed).length,
      trash: notes.filter((n) => n.isTrashed).length,
    };
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = notes.filter((n) => {
      if (section === 'trash') {
        if (!n.isTrashed) return false;
      } else if (section === 'archived') {
        if (!n.isArchived || n.isTrashed) return false;
      } else {
        if (n.isTrashed || n.isArchived) return false;
        if (section === 'text' && n.type !== 'text') return false;
        if (section === 'checklist' && n.type !== 'checklist') return false;
        if (section === 'pinned' && !n.isPinned) return false;
        if (section === 'widgets' && !n.isWidget) return false;
        if (section === 'reminders' && !n.reminderAt) return false;
        if (section === 'locked' && !n.isLocked) return false;
      }

      if (colorFilter && n.color !== colorFilter) return false;

      if (q) {
        const titleMatch = n.title.toLowerCase().includes(q);
        const colorMatch = NOTE_COLORS[n.color]?.label.toLowerCase().includes(q);
        const canSearchBody = !n.isLocked || isVaultUnlocked;
        const bodyMatch =
          canSearchBody &&
          (n.content.toLowerCase().includes(q) ||
            n.items.some((it) => it.text.toLowerCase().includes(q)));
        if (!titleMatch && !colorMatch && !bodyMatch) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      // Pinned notes always bubble to top outside Trash
      if (section !== 'trash' && a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      if (sortBy === 'created') return b.createdAt - a.createdAt;
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'color') {
        const oa = NOTE_COLORS[a.color]?.order ?? 99;
        const ob = NOTE_COLORS[b.color]?.order ?? 99;
        if (oa !== ob) return oa - ob;
      }
      return b.updatedAt - a.updatedAt;
    });
  }, [notes, section, colorFilter, searchQuery, sortBy, isVaultUnlocked]);

  const combinedBackups = useMemo(() => {
    const map = new Map<string, BackupSnapshot>();
    for (const b of localBackups) map.set(b.id, b);
    for (const b of cloudBackups) map.set(b.id, b);
    return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt);
  }, [cloudBackups, localBackups]);

  const navItems: Array<{
    id: FilterSection;
    label: string;
    icon: React.ReactNode;
    count: number;
  }> = [
    { id: 'all', label: 'All Notes', icon: <StickyNote className="w-4 h-4" />, count: counts.all },
    { id: 'text', label: 'Text Notes', icon: <FileText className="w-4 h-4" />, count: counts.text },
    { id: 'checklist', label: 'Checklists', icon: <CheckSquare className="w-4 h-4" />, count: counts.checklist },
    { id: 'pinned', label: 'Pinned', icon: <Pin className="w-4 h-4" />, count: counts.pinned },
    { id: 'widgets', label: 'Home Widgets', icon: <LayoutGrid className="w-4 h-4" />, count: counts.widgets },
    { id: 'reminders', label: 'Reminders', icon: <Bell className="w-4 h-4" />, count: counts.reminders },
    { id: 'locked', label: 'Protected', icon: <Lock className="w-4 h-4" />, count: counts.locked },
    { id: 'archived', label: 'Archive', icon: <Archive className="w-4 h-4" />, count: counts.archived },
    { id: 'trash', label: 'Trash', icon: <Trash2 className="w-4 h-4" />, count: counts.trash },
  ];

  const cycleTheme = () => {
    const order: ThemeMode[] = ['light', 'dark', 'system'];
    const idx = order.indexOf(prefs.theme);
    const next = order[(idx + 1) % order.length];
    void updateAppearancePrefs({ theme: next });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F5F1] dark:bg-[#111214] text-stone-900 dark:text-stone-100">
      {/* Top Bar (Strict 3-Zone Contract) */}
      <header className="no-print sticky top-0 z-30 h-16 px-3 sm:px-6 border-b border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-[#181A1F]/95 backdrop-blur-sm flex items-center justify-between gap-2.5 sm:gap-8">
        {/* Zone 1: Brand Title */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen((s) => !s)}
            aria-label="Toggle navigation sidebar"
            className="lg:hidden p-2 -ml-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setSection('all');
              setColorFilter(null);
            }}
            className="font-display text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100 whitespace-nowrap shrink-0"
          >
            Memoir
          </button>
        </div>

        {/* Zone 2: Live Search Bar */}
        <div className="flex-1 min-w-0 max-w-xl">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              aria-label="Search notes"
              className="w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-[#111214] pl-9 pr-8 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Zone 3: Primary Action */}
        <div className="relative shrink-0">
          <div className="inline-flex rounded-xl overflow-hidden shadow-xs">
            <button
              type="button"
              onClick={() => handleOpenNewNote('text')}
              className="inline-flex items-center gap-1.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-3 sm:px-4 py-2 text-xs font-semibold hover:opacity-90 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Note</span>
              <span className="sm:hidden">New</span>
            </button>
            <button
              type="button"
              onClick={() => setNewMenuOpen((o) => !o)}
              aria-label="Choose note type"
              className="border-l border-white/20 dark:border-black/20 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-2 py-2 text-xs hover:opacity-90"
            >
              <CheckSquare className="w-3.5 h-3.5" />
            </button>
          </div>

          {newMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-44 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-lg py-1 z-40"
              onMouseLeave={() => setNewMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => handleOpenNewNote('text')}
                className="w-full px-3.5 py-2 text-left text-xs font-medium text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                Text Sticky Note
              </button>
              <button
                type="button"
                onClick={() => handleOpenNewNote('checklist')}
                className="w-full px-3.5 py-2 text-left text-xs font-medium text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2"
              >
                <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                Interactive Checklist
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex relative">
        {/* Mobile Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation (260px) */}
        <aside
          className={`no-print fixed lg:sticky top-0 lg:top-16 left-0 z-40 lg:z-20 h-screen lg:h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-stone-200 dark:border-stone-800 bg-white dark:bg-[#181A1F] flex flex-col justify-between transition-transform duration-200 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="p-4 space-y-6 overflow-y-auto">
            {/* Categories */}
            <nav className="space-y-0.5" aria-label="Note folders">
              {navItems.map((item) => {
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSection(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900'
                        : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800/70'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span
                      className={`text-xs font-mono tabular-nums ${
                        active ? 'opacity-80' : 'text-stone-400 dark:text-stone-500'
                      }`}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Color Filter Strip */}
            <div className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                  Filter by Color
                </span>
                {colorFilter && (
                  <button
                    type="button"
                    onClick={() => setColorFilter(null)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-5 gap-2 px-1">
                {NOTE_COLOR_LIST.map((c) => {
                  const selected = colorFilter === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setColorFilter(selected ? null : c.key)}
                      aria-label={`Filter by ${c.label}`}
                      title={c.label}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 ${
                        selected ? 'ring-2 ring-offset-2 ring-stone-900 dark:ring-stone-100 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c.swatchHex }}
                    >
                      {selected && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cloud Sync & Account Footer */}
          <div className="p-4 border-t border-stone-200 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-stone-700 dark:text-stone-300">
                {!isOnline ? (
                  <>
                    <CloudOff className="w-3.5 h-3.5 text-amber-600" />
                    Offline Mode
                  </>
                ) : user ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    {syncStatus === 'syncing' ? 'Syncing devices...' : 'Synced across devices'}
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3.5 h-3.5 text-stone-500" />
                    Local Storage Only
                  </>
                )}
              </span>
            </div>

            {user ? (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-900 dark:text-stone-100 truncate">
                    {user.displayName || 'Synced Account'}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                    {user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  title="Sign out"
                  className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-xs font-semibold text-stone-900 dark:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign in to Sync Devices
              </button>
            )}
          </div>
        </aside>

        {/* Main Content Canvas */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px] mx-auto w-full space-y-6">
          {/* Workspace Toolbar */}
          <div className="no-print flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-baseline gap-2.5">
              <h1 className="font-display text-xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
                {navItems.find((n) => n.id === section)?.label || 'Notes'}
              </h1>
              {colorFilter && (
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  · {NOTE_COLORS[colorFilter].label}
                </span>
              )}
              <span className="text-xs font-mono tabular-nums text-stone-500 dark:text-stone-400">
                · {filteredNotes.length} {filteredNotes.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* View Mode Switcher */}
              {section !== 'widgets' && (
                <div
                  className="flex items-center p-0.5 rounded-lg bg-stone-200/70 dark:bg-stone-800"
                  role="group"
                  aria-label="View layout"
                >
                  {[
                    { id: 'grid' as ViewMode, icon: <LayoutGrid className="w-3.5 h-3.5" />, label: 'Grid' },
                    { id: 'list' as ViewMode, icon: <List className="w-3.5 h-3.5" />, label: 'List' },
                    { id: 'details' as ViewMode, icon: <Rows3 className="w-3.5 h-3.5" />, label: 'Details' },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => void updateAppearancePrefs({ viewMode: v.id })}
                      aria-label={`${v.label} view`}
                      title={`${v.label} view`}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                        prefs.viewMode === v.id
                          ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                          : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                      }`}
                    >
                      {v.icon}
                      <span className="hidden sm:inline">{v.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Sort Dropdown */}
              {section !== 'widgets' && (
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  aria-label="Sort notes"
                  className="rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#181A1F] px-2.5 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 focus:outline-none"
                >
                  <option value="updated">Sort: Updated</option>
                  <option value="created">Sort: Created</option>
                  <option value="color">Sort: Color</option>
                  <option value="title">Sort: Title A–Z</option>
                </select>
              )}

              {/* Vault Lock / Security Button */}
              {prefs.lockHash ? (
                <div className="inline-flex items-center rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#181A1F] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => {
                      if (isVaultUnlocked) {
                        setIsVaultUnlocked(false);
                        showToast('Vault locked.');
                      } else {
                        setPasswordModal({ mode: 'unlock' });
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 whitespace-nowrap"
                  >
                    {isVaultUnlocked ? (
                      <>
                        <LockOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>Lock Vault</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Unlock Vault</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasswordModal({ mode: 'manage' })}
                    aria-label="Password settings"
                    title="Password settings"
                    className="px-2 py-1.5 border-l border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPasswordModal({ mode: 'setup' })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#181A1F] px-2.5 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 whitespace-nowrap"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Set Password</span>
                </button>
              )}

              {/* Automated Backups */}
              <button
                type="button"
                onClick={() => setShowBackupModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#181A1F] px-2.5 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 whitespace-nowrap"
              >
                <History className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Backups</span>
              </button>

              {/* External Storage Export */}
              <button
                type="button"
                onClick={() => setShowExportModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#181A1F] px-2.5 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 whitespace-nowrap"
              >
                <FolderOutput className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Export</span>
              </button>

              {/* Dark/Light/System Theme Toggle */}
              <button
                type="button"
                onClick={cycleTheme}
                aria-label={`Theme: ${prefs.theme}`}
                title={`Theme: ${prefs.theme} (click to cycle)`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#181A1F] px-2.5 py-1.5 text-xs font-medium text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 whitespace-nowrap"
              >
                {prefs.theme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5" />
                ) : prefs.theme === 'light' ? (
                  <Sun className="w-3.5 h-3.5" />
                ) : (
                  <Monitor className="w-3.5 h-3.5" />
                )}
                <span className="capitalize hidden sm:inline">{prefs.theme}</span>
              </button>

              {/* PWA Install Button when installable */}
              {!isInstalled && isInstallable && (
                <button
                  type="button"
                  onClick={install}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 text-white px-2.5 py-1.5 text-xs font-semibold hover:bg-blue-700 whitespace-nowrap"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Install App</span>
                </button>
              )}

              {/* Empty Trash action */}
              {section === 'trash' && counts.trash > 0 && (
                <button
                  type="button"
                  onClick={handleEmptyTrash}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-red-700 whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Empty Trash
                </button>
              )}
            </div>
          </div>

          {/* Main View Content */}
          {section === 'widgets' ? (
            <HomeWidgetsView
              notes={notes}
              isVaultUnlocked={isVaultUnlocked}
              onOpenNote={handleOpenExistingNote}
              onToggleChecklistItem={handleToggleChecklistItemInWidget}
              onToggleWidget={(n) => {
                void handlePatchNote(n, { isWidget: !n.isWidget });
                showToast(n.isWidget ? 'Removed from Home Widgets.' : 'Pinned to Home Widgets.');
              }}
              onQuickCreate={handleOpenNewNote}
              onFocusSearch={() => {
                setSection('all');
                window.setTimeout(() => searchInputRef.current?.focus(), 60);
              }}
            />
          ) : filteredNotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 dark:border-stone-700 bg-white/50 dark:bg-[#181A1F]/50 py-16 px-6 text-center max-w-lg mx-auto">
              <StickyNote className="w-8 h-8 mx-auto text-stone-400 dark:text-stone-500 mb-3" />
              <h2 className="font-display text-base font-semibold text-stone-900 dark:text-stone-100">
                {searchQuery
                  ? 'No matching notes found'
                  : section === 'trash'
                    ? 'Trash is empty'
                    : section === 'archived'
                      ? 'No archived notes'
                      : 'No notes in this view yet'}
              </h2>
              <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">
                {searchQuery
                  ? 'Try clearing your search query or color filter.'
                  : 'Create a color-coded text note or interactive checklist to get started.'}
              </p>
              {section !== 'trash' && section !== 'archived' && !searchQuery && (
                <div className="mt-5 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenNewNote('text')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-3.5 py-2 text-xs font-semibold hover:opacity-90"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New Text Note
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenNewNote('checklist')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 dark:border-stone-700 px-3.5 py-2 text-xs font-medium text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    New Checklist
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div
              className={
                prefs.viewMode === 'list'
                  ? 'flex flex-col gap-2.5'
                  : prefs.viewMode === 'details'
                    ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
                    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              }
            >
              {filteredNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  viewMode={prefs.viewMode}
                  isVaultUnlocked={isVaultUnlocked}
                  onOpen={handleOpenExistingNote}
                  onTogglePin={(n) => void handlePatchNote(n, { isPinned: !n.isPinned })}
                  onToggleWidget={(n) => {
                    void handlePatchNote(n, { isWidget: !n.isWidget });
                    showToast(n.isWidget ? 'Removed from Home Widgets.' : 'Pinned to Home Widgets.');
                  }}
                  onChangeColor={(n, color) => void handlePatchNote(n, { color })}
                  onToggleLock={handleToggleNoteLock}
                  onToggleArchive={(n) => {
                    void handlePatchNote(n, { isArchived: !n.isArchived, isPinned: false });
                    showToast(n.isArchived ? 'Moved back to Active Notes.' : 'Note archived.');
                  }}
                  onTrash={(n) => {
                    void handlePatchNote(n, { isTrashed: true, isPinned: false, isWidget: false });
                    showToast('Moved to Trash.');
                  }}
                  onRestore={(n) => {
                    void handlePatchNote(n, { isTrashed: false });
                    showToast('Note restored.');
                  }}
                  onDeleteForever={(n) => void handleDeleteForever(n)}
                  onExportNote={async (n) => {
                    try {
                      const res = await exportSingleNote(
                        n,
                        'md',
                        !n.isLocked || isVaultUnlocked,
                        true
                      );
                      showToast(
                        res === 'saved-picker'
                          ? 'Saved Markdown note to external storage.'
                          : 'Exported note as Markdown.'
                      );
                    } catch {
                      // cancelled
                    }
                  }}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Floating Quick-Access Widget */}
      <FloatingQuickWidget
        notes={notes}
        isVaultUnlocked={isVaultUnlocked}
        onOpenNote={handleOpenExistingNote}
        onToggleChecklistItem={handleToggleChecklistItemInWidget}
        onQuickSaveText={handleQuickSaveTextWidget}
      />

      {/* Note Editor Modal */}
      <NoteEditorModal
        note={editingNote?.note || null}
        isNew={Boolean(editingNote?.isNew)}
        hasMasterPassword={Boolean(prefs.lockHash)}
        isVaultUnlocked={isVaultUnlocked}
        onSave={handleSaveNote}
        onDeleteToTrash={(n) => {
          void handlePatchNote(n, { isTrashed: true, isPinned: false, isWidget: false });
          showToast('Moved to Trash.');
        }}
        onRequestPasswordSetup={(pendingLockNote) =>
          setPasswordModal({ mode: 'setup', pendingLockNote })
        }
        onClose={() => setEditingNote(null)}
        onToast={showToast}
      />

      {/* Password Modal */}
      {passwordModal && (
        <PasswordModal
          mode={passwordModal.mode}
          lockHash={prefs.lockHash}
          lockSalt={prefs.lockSalt}
          autoLockMinutes={prefs.autoLockMinutes}
          onUnlockSuccess={() => {
            setIsVaultUnlocked(true);
            if (passwordModal.pendingAction) {
              passwordModal.pendingAction();
            }
          }}
          onSavePasswordConfig={handleSavePasswordConfig}
          onClose={() => setPasswordModal(null)}
        />
      )}

      {/* Backup & Restore Modal */}
      {showBackupModal && (
        <BackupRestoreModal
          isSignedIn={Boolean(user)}
          autoBackupInterval={prefs.autoBackupInterval}
          lastAutoBackupAt={prefs.lastAutoBackupAt}
          backups={combinedBackups}
          notesCount={notes.length}
          onChangeAutoBackup={updateBackupInterval}
          onCreateManualBackup={(label) => createSnapshot(label, 'manual', notes)}
          onRestoreBackup={handleRestoreBackup}
          onDeleteBackup={handleDeleteBackup}
          onImportNotesFromFile={handleImportNotes}
          onClose={() => setShowBackupModal(false)}
          onToast={showToast}
        />
      )}

      {/* External Storage Export Modal */}
      {showExportModal && (
        <ExportModal
          allNotes={notes}
          filteredNotes={filteredNotes}
          isVaultUnlocked={isVaultUnlocked}
          onRequestUnlock={() => {
            setShowExportModal(false);
            setPasswordModal({
              mode: prefs.lockHash ? 'unlock' : 'setup',
              pendingAction: () => setShowExportModal(true),
            });
          }}
          onClose={() => setShowExportModal(false)}
          onToast={showToast}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="no-print fixed bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-xl border border-stone-700 bg-stone-900 text-stone-100 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-300 px-4 py-2.5 text-xs font-medium shadow-lg"
        >
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
