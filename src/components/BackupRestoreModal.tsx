import React, { useRef, useState } from 'react';
import {
  Cloud,
  Download,
  HardDrive,
  History,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { AutoBackupInterval, BackupSnapshot, Note } from '../types';
import { generateId } from '../utils/crypto';
import { saveBlobToExternalStorage } from '../utils/exportNotes';

interface BackupRestoreModalProps {
  isSignedIn: boolean;
  autoBackupInterval: AutoBackupInterval;
  lastAutoBackupAt: string;
  backups: BackupSnapshot[];
  notesCount: number;
  onChangeAutoBackup: (interval: AutoBackupInterval) => void;
  onCreateManualBackup: (label: string) => Promise<void>;
  onRestoreBackup: (snapshot: BackupSnapshot, mode: 'merge' | 'replace') => Promise<void>;
  onDeleteBackup: (snapshot: BackupSnapshot) => Promise<void>;
  onImportNotesFromFile: (imported: Note[]) => Promise<void>;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isSignedIn,
  autoBackupInterval,
  lastAutoBackupAt,
  backups,
  notesCount,
  onChangeAutoBackup,
  onCreateManualBackup,
  onRestoreBackup,
  onDeleteBackup,
  onImportNotesFromFile,
  onClose,
  onToast,
}) => {
  const [busy, setBusy] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackupNow = async () => {
    setBusy(true);
    try {
      const label = customLabel.trim() || `Manual Backup (${new Date().toLocaleDateString()})`;
      await onCreateManualBackup(label);
      setCustomLabel('');
      onToast('Backup snapshot created.');
    } finally {
      setBusy(false);
    }
  };

  const handleDownloadSnapshot = async (snapshot: BackupSnapshot) => {
    const payload = JSON.stringify(
      {
        app: 'Memoir',
        version: 1,
        label: snapshot.label,
        createdAt: new Date(snapshot.createdAt).toISOString(),
        notes: snapshot.notes,
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    await saveBlobToExternalStorage(
      blob,
      `chromanote-snapshot-${new Date(snapshot.createdAt).toISOString().slice(0, 10)}.json`,
      'application/json',
      'json',
      false
    );
    onToast('Snapshot downloaded as JSON.');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        const rawList = Array.isArray(parsed) ? parsed : Array.isArray(parsed.notes) ? parsed.notes : [];
        if (rawList.length === 0) {
          onToast('No notes found in JSON backup.');
          return;
        }
        const now = Date.now();
        const normalized: Note[] = rawList.map((raw: Partial<Note>) => ({
          id: raw.id && /^[a-zA-Z0-9_\-]+$/.test(raw.id) ? raw.id : generateId('imp'),
          ownerId: 'local',
          title: String(raw.title || 'Imported Note').slice(0, 200),
          type: raw.type === 'checklist' ? 'checklist' : 'text',
          content: String(raw.content || '').slice(0, 50000),
          items: Array.isArray(raw.items) ? raw.items : [],
          color: raw.color || 'yellow',
          isPinned: Boolean(raw.isPinned),
          isArchived: Boolean(raw.isArchived),
          isTrashed: Boolean(raw.isTrashed),
          isLocked: Boolean(raw.isLocked),
          isWidget: Boolean(raw.isWidget),
          reminderAt: String(raw.reminderAt || ''),
          createdAt: Number(raw.createdAt) || now,
          updatedAt: Number(raw.updatedAt) || now,
        }));
        await onImportNotesFromFile(normalized);
        onToast(`Imported ${normalized.length} notes from ${file.name}.`);
      } else {
        // Plain text note import
        const now = Date.now();
        await onImportNotesFromFile([
          {
            id: generateId('imp'),
            ownerId: 'local',
            title: file.name.replace(/\.[^.]+$/, '').slice(0, 200),
            type: 'text',
            content: text.slice(0, 50000),
            items: [],
            color: 'yellow',
            isPinned: false,
            isArchived: false,
            isTrashed: false,
            isLocked: false,
            isWidget: false,
            reminderAt: '',
            createdAt: now,
            updatedAt: now,
          },
        ]);
        onToast(`Imported ${file.name} as a new note.`);
      }
    } catch {
      onToast('Could not parse backup file. Ensure it is valid JSON or TXT.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#181A1F] shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Automated Backups & Restore"
      >
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="font-display text-base font-semibold text-stone-900 dark:text-stone-100">
              Automated Backups &amp; Restore
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close backup modal"
            className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Automated Schedule Section */}
          <section className="rounded-xl border border-stone-200 dark:border-stone-800 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Automated Backup Schedule
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Automatically captures point-in-time recovery snapshots {isSignedIn ? 'to Cloud Firestore and local storage' : 'to local storage'}.
                </p>
              </div>
              <select
                value={autoBackupInterval}
                onChange={(e) => onChangeAutoBackup(e.target.value as AutoBackupInterval)}
                aria-label="Automated backup interval"
                className="rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-1.5 text-xs font-medium text-stone-900 dark:text-stone-100 focus:outline-none"
              >
                <option value="off">Off (Manual only)</option>
                <option value="on_change">On Note Changes (Auto-snapshot)</option>
                <option value="hourly">Every Hour</option>
                <option value="daily">Daily</option>
              </select>
            </div>
            {lastAutoBackupAt && (
              <p className="text-xs font-mono tabular-nums text-stone-500 dark:text-stone-400">
                Last auto-backup: {new Date(lastAutoBackupAt).toLocaleString()}
              </p>
            )}
          </section>

          {/* Manual Backup + Import */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-stone-200 dark:border-stone-800 p-4 space-y-2.5">
              <h3 className="font-display text-xs font-semibold text-stone-800 dark:text-stone-200">
                Create Instant Snapshot ({notesCount} notes)
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="Optional snapshot label..."
                  maxLength={80}
                  className="flex-1 rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-2.5 py-1.5 text-xs text-stone-900 dark:text-stone-100 focus:outline-none"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleBackupNow}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-3 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
                  Back up now
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 dark:border-stone-800 p-4 space-y-2.5">
              <h3 className="font-display text-xs font-semibold text-stone-800 dark:text-stone-200">
                Import Backup from Device
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Restore from a saved <code className="font-mono">.json</code> backup or import a <code className="font-mono">.txt</code> note.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 dark:border-stone-700 px-3 py-1.5 text-xs font-medium text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <Upload className="w-3.5 h-3.5" />
                Choose File (.json / .txt)
              </button>
            </div>
          </section>

          {/* Snapshot History List */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-sm font-semibold text-stone-900 dark:text-stone-100">
                Backup History ({backups.length})
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-stone-500 dark:text-stone-400">Restore mode:</span>
                <div className="flex items-center p-0.5 rounded-lg bg-stone-100 dark:bg-stone-800">
                  <button
                    type="button"
                    onClick={() => setRestoreMode('merge')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      restoreMode === 'merge'
                        ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    Merge
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestoreMode('replace')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      restoreMode === 'replace'
                        ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                        : 'text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    Replace All
                  </button>
                </div>
              </div>
            </div>

            {backups.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 dark:border-stone-700 p-6 text-center text-xs text-stone-500 dark:text-stone-400">
                No backup snapshots yet. Click &ldquo;Back up now&rdquo; or enable automated backups above.
              </div>
            ) : (
              <ul className="divide-y divide-stone-200 dark:divide-stone-800 rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
                {backups.map((snap) => (
                  <li
                    key={snap.id}
                    className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#181A1F]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {snap.source === 'cloud' ? (
                          <Cloud className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                        ) : (
                          <HardDrive className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                        )}
                        <span className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                          {snap.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs font-mono tabular-nums text-stone-500 dark:text-stone-400">
                        {snap.trigger === 'auto' ? 'Auto' : 'Manual'} · {snap.noteCount} notes ·{' '}
                        {new Date(snap.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true);
                          try {
                            await onRestoreBackup(snap, restoreMode);
                            onToast(`Restored ${snap.noteCount} notes (${restoreMode}).`);
                          } finally {
                            setBusy(false);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-stone-300 dark:border-stone-700 px-2.5 py-1 text-xs font-medium text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadSnapshot(snap)}
                        aria-label="Download snapshot JSON"
                        title="Download snapshot JSON"
                        className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onDeleteBackup(snap)}
                        aria-label="Delete snapshot"
                        title="Delete snapshot"
                        className="p-1.5 rounded-lg text-stone-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
