import React, { useState } from 'react';
import { Check, LayoutGrid, Plus, StickyNote, X } from 'lucide-react';
import { NOTE_COLORS } from '../constants/colors';
import { Note } from '../types';

interface FloatingQuickWidgetProps {
  notes: Note[];
  isVaultUnlocked: boolean;
  onOpenNote: (note: Note) => void;
  onToggleChecklistItem: (note: Note, itemId: string) => void;
  onQuickSaveText: (title: string, body: string) => void;
}

export const FloatingQuickWidget: React.FC<FloatingQuickWidgetProps> = ({
  notes,
  isVaultUnlocked,
  onOpenNote,
  onToggleChecklistItem,
  onQuickSaveText,
}) => {
  const [open, setOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickBody, setQuickBody] = useState('');

  const widgetNotes = notes.filter((n) => !n.isTrashed && !n.isArchived && n.isWidget).slice(0, 3);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() && !quickBody.trim()) return;
    onQuickSaveText(quickTitle.trim() || 'Quick Note', quickBody);
    setQuickTitle('');
    setQuickBody('');
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open quick access sticky widget"
        className="no-print fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-[#1C1E24] text-stone-900 dark:text-stone-100 px-3.5 py-2.5 text-xs font-semibold shadow-lg hover:-translate-y-0.5 transition-transform"
      >
        <LayoutGrid className="w-4 h-4 text-amber-500" />
        <span className="hidden sm:inline">Quick Widget</span>
      </button>
    );
  }

  return (
    <div className="no-print fixed bottom-4 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-[#181A1F] shadow-2xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-amber-500" />
          <span className="font-display text-xs font-semibold text-stone-900 dark:text-stone-100">
            Quick Access Widget
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Minimize quick widget"
          className="p-1 rounded-md text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3.5 space-y-3 max-h-[65vh] overflow-y-auto">
        <form onSubmit={handleSave} className="space-y-2">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Quick note title..."
            className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-2.5 py-1.5 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none"
          />
          <textarea
            value={quickBody}
            onChange={(e) => setQuickBody(e.target.value)}
            placeholder="Jot down a thought..."
            rows={2}
            className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 px-2.5 py-1.5 text-xs text-stone-900 dark:text-stone-100 placeholder:text-stone-400 resize-none focus:outline-none"
          />
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 py-1.5 text-xs font-semibold hover:opacity-90"
          >
            <Plus className="w-3.5 h-3.5" />
            Save Quick Note
          </button>
        </form>

        {widgetNotes.length > 0 && (
          <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-2">
            <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
              Pinned Widgets
            </p>
            {widgetNotes.map((note) => {
              const palette = NOTE_COLORS[note.color] || NOTE_COLORS.yellow;
              const masked = note.isLocked && !isVaultUnlocked;
              return (
                <div
                  key={note.id}
                  className={`rounded-xl border ${palette.cardBorder} ${palette.cardBg} p-2.5 space-y-1.5`}
                >
                  <button
                    type="button"
                    onClick={() => onOpenNote(note)}
                    className="w-full text-left font-display text-xs font-semibold text-stone-900 dark:text-stone-100 truncate hover:underline"
                  >
                    {note.title || 'Untitled Note'}
                  </button>
                  {masked ? (
                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                      Locked — click to unlock
                    </p>
                  ) : note.type === 'checklist' ? (
                    <ul className="space-y-1">
                      {note.items.slice(0, 3).map((it) => (
                        <li key={it.id}>
                          <button
                            type="button"
                            onClick={() => onToggleChecklistItem(note, it.id)}
                            className="flex items-center gap-1.5 text-[11px] text-left w-full"
                          >
                            <span
                              className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 ${
                                it.checked
                                  ? 'bg-stone-800 border-stone-800 text-white dark:bg-stone-200 dark:border-stone-200 dark:text-stone-900'
                                  : 'border-stone-400'
                              }`}
                            >
                              {it.checked && <Check className="w-2.5 h-2.5" />}
                            </span>
                            <span className={`truncate ${it.checked ? 'line-through opacity-60' : ''}`}>
                              {it.text}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[11px] text-stone-700 dark:text-stone-300 line-clamp-2">
                      {note.content || 'Empty note'}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
