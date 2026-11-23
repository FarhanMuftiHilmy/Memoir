import React, { useState } from 'react';
import { Download, FolderOutput, Lock, X } from 'lucide-react';
import { Note } from '../types';
import { ExportFormat, exportMultipleNotes } from '../utils/exportNotes';

interface ExportModalProps {
  allNotes: Note[];
  filteredNotes: Note[];
  isVaultUnlocked: boolean;
  onRequestUnlock: () => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  allNotes,
  filteredNotes,
  isVaultUnlocked,
  onRequestUnlock,
  onClose,
  onToast,
}) => {
  const [scope, setScope] = useState<'active' | 'filtered' | 'all'>('active');
  const [format, setFormat] = useState<ExportFormat>('zip-md');
  const [useFolderPicker, setUseFolderPicker] = useState(true);
  const [busy, setBusy] = useState(false);

  const activeNotes = allNotes.filter((n) => !n.isTrashed && !n.isArchived);
  const targetNotes =
    scope === 'active' ? activeNotes : scope === 'filtered' ? filteredNotes : allNotes;
  const lockedCount = targetNotes.filter((n) => n.isLocked).length;

  const handleExport = async () => {
    if (targetNotes.length === 0) {
      onToast('There are no notes in the selected export scope.');
      return;
    }
    setBusy(true);
    try {
      const result = await exportMultipleNotes(
        targetNotes,
        format,
        isVaultUnlocked,
        useFolderPicker
      );
      onToast(
        result === 'saved-picker'
          ? `Saved ${targetNotes.length} notes to external storage.`
          : `Exported ${targetNotes.length} notes (${format.toUpperCase()}).`
      );
      onClose();
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        onToast('Export failed. Please try standard download.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#181A1F] shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Export Notes to External Storage"
      >
        <div className="px-5 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FolderOutput className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="font-display text-base font-semibold text-stone-900 dark:text-stone-100">
              Export to External Storage
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export modal"
            className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Scope Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
              Notes to Export
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'active' as const, label: `Active (${activeNotes.length})` },
                { id: 'filtered' as const, label: `Current View (${filteredNotes.length})` },
                { id: 'all' as const, label: `All (${allNotes.length})` },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setScope(opt.id)}
                  className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                    scope === opt.id
                      ? 'border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-900'
                      : 'border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Format Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-stone-700 dark:text-stone-300">
              Export Format
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as ExportFormat)}
              className="w-full rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none"
            >
              <option value="zip-md">Individual Markdown Files (.zip)</option>
              <option value="zip-txt">Individual Plain Text Files (.zip)</option>
              <option value="json">Memoir Full Backup Archive (.json)</option>
              <option value="md">Combined Markdown Document (.md)</option>
              <option value="txt">Combined Plain Text Document (.txt)</option>
            </select>
          </div>

          {/* External Storage Picker Option */}
          <label className="flex items-start gap-2.5 rounded-xl border border-stone-200 dark:border-stone-800 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={useFolderPicker}
              onChange={(e) => setUseFolderPicker(e.target.checked)}
              className="mt-0.5 rounded border-stone-400"
            />
            <div className="text-xs">
              <span className="font-medium text-stone-900 dark:text-stone-100 block">
                Choose external drive / folder when supported
              </span>
              <span className="text-stone-500 dark:text-stone-400">
                Uses your browser&rsquo;s native Save File dialog, or falls back to direct download.
              </span>
            </div>
          </label>

          {/* Locked Note Warning */}
          {lockedCount > 0 && !isVaultUnlocked && (
            <div className="rounded-xl border border-amber-300 dark:border-amber-600/40 bg-amber-50 dark:bg-amber-950/30 p-3 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {lockedCount} locked {lockedCount === 1 ? 'note' : 'notes'} will have contents redacted unless you unlock the vault first.
                </span>
              </div>
              <button
                type="button"
                onClick={onRequestUnlock}
                className="shrink-0 rounded-lg bg-amber-600 text-white px-2.5 py-1.5 text-xs font-semibold hover:bg-amber-700"
              >
                Unlock
              </button>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || targetNotes.length === 0}
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export {targetNotes.length} {targetNotes.length === 1 ? 'Note' : 'Notes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
