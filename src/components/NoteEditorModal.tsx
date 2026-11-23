import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bell,
  Check,
  CheckSquare,
  Download,
  FileText,
  LayoutGrid,
  Lock,
  LockOpen,
  Pin,
  Plus,
  Printer,
  Trash2,
  X,
} from 'lucide-react';
import { NOTE_COLOR_LIST, NOTE_COLORS } from '../constants/colors';
import { ChecklistItem, Note, NOTE_LIMITS, NoteColor, NoteType } from '../types';
import { generateId } from '../utils/crypto';
import { exportSingleNote } from '../utils/exportNotes';

interface NoteEditorModalProps {
  note: Note | null;
  isNew: boolean;
  hasMasterPassword: boolean;
  isVaultUnlocked: boolean;
  onSave: (updated: Note, isNew: boolean) => void;
  onDeleteToTrash: (note: Note) => void;
  onRequestPasswordSetup: (pendingLockNote: Note) => void;
  onClose: () => void;
  onToast: (message: string) => void;
}

export const NoteEditorModal: React.FC<NoteEditorModalProps> = ({
  note,
  isNew,
  hasMasterPassword,
  isVaultUnlocked,
  onSave,
  onDeleteToTrash,
  onRequestPasswordSetup,
  onClose,
  onToast,
}) => {
  const [draft, setDraft] = useState<Note | null>(note);
  const [newItemText, setNewItemText] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(note ? { ...note, items: note.items.map((i) => ({ ...i })) } : null);
    setShowExportMenu(false);
  }, [note]);

  useEffect(() => {
    if (isNew && titleRef.current) {
      titleRef.current.focus();
    }
  }, [isNew]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!draft) return;
      if (e.key === 'Escape') {
        onClose();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveAndClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!draft) return null;

  const palette = NOTE_COLORS[draft.color] || NOTE_COLORS.yellow;

  const handleSaveAndClose = () => {
    const trimmedTitle = draft.title.trim().slice(0, NOTE_LIMITS.MAX_TITLE);
    const cleanedItems = draft.items
      .filter((i) => i.text.trim().length > 0)
      .slice(0, NOTE_LIMITS.MAX_ITEMS)
      .map((i) => ({
        ...i,
        text: i.text.slice(0, NOTE_LIMITS.MAX_ITEM_TEXT),
      }));

    // Avoid saving completely empty brand new notes
    if (
      isNew &&
      !trimmedTitle &&
      !draft.content.trim() &&
      cleanedItems.length === 0
    ) {
      onClose();
      return;
    }

    onSave(
      {
        ...draft,
        title: trimmedTitle || (draft.type === 'checklist' ? 'Untitled Checklist' : 'Untitled Note'),
        content: draft.content.slice(0, NOTE_LIMITS.MAX_CONTENT),
        items: cleanedItems,
        updatedAt: Date.now(),
      },
      isNew
    );
    onClose();
  };

  const handleSwitchType = (targetType: NoteType) => {
    if (draft.type === targetType) return;
    if (targetType === 'checklist') {
      const lines = draft.content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, NOTE_LIMITS.MAX_ITEMS);
      const items: ChecklistItem[] =
        draft.items.length > 0
          ? draft.items
          : lines.map((line) => ({
              id: generateId('chk'),
              text: line.slice(0, NOTE_LIMITS.MAX_ITEM_TEXT),
              checked: false,
            }));
      setDraft({ ...draft, type: 'checklist', items });
    } else {
      const textFromItems = draft.items
        .map((i) => `${i.checked ? '[x] ' : ''}${i.text}`)
        .join('\n');
      setDraft({
        ...draft,
        type: 'text',
        content: draft.content.trim() ? draft.content : textFromItems,
      });
    }
  };

  const handleAddChecklistItem = () => {
    const text = newItemText.trim();
    if (!text) return;
    if (draft.items.length >= NOTE_LIMITS.MAX_ITEMS) {
      onToast(`Checklist limit reached (${NOTE_LIMITS.MAX_ITEMS} items).`);
      return;
    }
    setDraft({
      ...draft,
      items: [
        ...draft.items,
        {
          id: generateId('chk'),
          text: text.slice(0, NOTE_LIMITS.MAX_ITEM_TEXT),
          checked: false,
        },
      ],
    });
    setNewItemText('');
  };

  const handleMoveItem = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= draft.items.length) return;
    const copy = [...draft.items];
    const [removed] = copy.splice(index, 1);
    copy.splice(target, 0, removed);
    setDraft({ ...draft, items: copy });
  };

  const handleLockClick = () => {
    if (!hasMasterPassword) {
      onRequestPasswordSetup(draft);
      return;
    }
    setDraft({ ...draft, isLocked: !draft.isLocked });
  };

  const handleExport = async (format: 'txt' | 'md' | 'json') => {
    setShowExportMenu(false);
    try {
      const res = await exportSingleNote(draft, format, !draft.isLocked || isVaultUnlocked, true);
      onToast(
        res === 'saved-picker'
          ? `Saved ${format.toUpperCase()} to external storage.`
          : `Downloaded note as .${format}`
      );
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        onToast('Could not export note.');
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-3 sm:p-6"
      onClick={handleSaveAndClose}
    >
      <div
        className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border ${palette.cardBorder} ${palette.cardBg} shadow-xl overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Note Editor"
      >
        {/* Top Color Strip */}
        <div className={`h-2.5 w-full ${palette.stripBg}`} />

        {/* Header Bar */}
        <div className={`px-5 py-3 border-b border-black/8 dark:border-white/10 ${palette.headerBg} flex flex-wrap items-center justify-between gap-3`}>
          {/* Color Picker Swatches */}
          <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Note color">
            {NOTE_COLOR_LIST.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setDraft({ ...draft, color: c.key as NoteColor })}
                aria-label={`Color ${c.label}`}
                title={c.label}
                className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${
                  draft.color === c.key
                    ? 'ring-2 ring-offset-2 ring-stone-900 dark:ring-stone-100 scale-110'
                    : ''
                }`}
                style={{ backgroundColor: c.swatchHex }}
              />
            ))}
          </div>

          {/* Note Type Switcher + Close */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-0.5 rounded-lg bg-black/8 dark:bg-white/10">
              <button
                type="button"
                onClick={() => handleSwitchType('text')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  draft.type === 'text'
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Text
              </button>
              <button
                type="button"
                onClick={() => handleSwitchType('checklist')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  draft.type === 'checklist'
                    ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-600 dark:text-stone-300'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Checklist
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Discard and close"
              className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-black/8 dark:hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title & Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <input
            ref={titleRef}
            type="text"
            value={draft.title}
            maxLength={NOTE_LIMITS.MAX_TITLE}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder={draft.type === 'checklist' ? 'Checklist title...' : 'Note title...'}
            className="w-full bg-transparent font-display text-xl font-bold text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none"
          />

          {draft.type === 'text' ? (
            <div>
              <textarea
                value={draft.content}
                maxLength={NOTE_LIMITS.MAX_CONTENT}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                placeholder="Write your note here..."
                rows={12}
                className="w-full bg-transparent text-[15px] leading-relaxed text-stone-800 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500 resize-y min-h-[240px] focus:outline-none"
              />
              {draft.content.length > NOTE_LIMITS.MAX_CONTENT * 0.85 && (
                <p className="text-xs font-mono tabular-nums text-stone-500 dark:text-stone-400 text-right">
                  {draft.content.length}/{NOTE_LIMITS.MAX_CONTENT}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Quick Add Checklist Item */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newItemText}
                  maxLength={NOTE_LIMITS.MAX_ITEM_TEXT}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                  placeholder="Add checklist item and press Enter..."
                  className="flex-1 rounded-lg border border-black/15 dark:border-white/15 bg-white/70 dark:bg-black/25 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-3 py-2 text-xs font-semibold hover:opacity-90 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>

              {/* Checklist Controls */}
              {draft.items.length > 0 && (
                <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
                  <span className="font-mono tabular-nums">
                    {draft.items.filter((i) => i.checked).length} of {draft.items.length} completed
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          items: draft.items.map((i) => ({ ...i, checked: false })),
                        })
                      }
                      className="hover:text-stone-900 dark:hover:text-stone-100 underline-offset-2 hover:underline"
                    >
                      Uncheck all
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          items: draft.items.filter((i) => !i.checked),
                        })
                      }
                      className="hover:text-red-600 dark:hover:text-red-400 underline-offset-2 hover:underline"
                    >
                      Clear checked
                    </button>
                  </div>
                </div>
              )}

              {/* Checklist Items */}
              <ul className="space-y-1.5">
                {draft.items.map((item, idx) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 rounded-lg border border-black/8 dark:border-white/10 bg-white/50 dark:bg-black/20 px-2.5 py-1.5"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          items: draft.items.map((it) =>
                            it.id === item.id ? { ...it, checked: !it.checked } : it
                          ),
                        })
                      }
                      aria-label={item.checked ? 'Mark incomplete' : 'Mark complete'}
                      className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 transition-colors ${
                        item.checked
                          ? 'bg-stone-800 border-stone-800 text-white dark:bg-stone-200 dark:border-stone-200 dark:text-stone-900'
                          : 'border-stone-400 dark:border-stone-500'
                      }`}
                    >
                      {item.checked && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <input
                      type="text"
                      value={item.text}
                      maxLength={NOTE_LIMITS.MAX_ITEM_TEXT}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          items: draft.items.map((it) =>
                            it.id === item.id ? { ...it, text: e.target.value } : it
                          ),
                        })
                      }
                      className={`flex-1 bg-transparent text-sm focus:outline-none ${
                        item.checked
                          ? 'line-through text-stone-400 dark:text-stone-500'
                          : 'text-stone-900 dark:text-stone-100'
                      }`}
                    />
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveItem(idx, -1)}
                        disabled={idx === 0}
                        aria-label="Move item up"
                        className="p-1 rounded text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 disabled:opacity-25"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveItem(idx, 1)}
                        disabled={idx === draft.items.length - 1}
                        aria-label="Move item down"
                        className="p-1 rounded text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 disabled:opacity-25"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            items: draft.items.filter((it) => it.id !== item.id),
                          })
                        }
                        aria-label="Remove item"
                        className="p-1 rounded text-stone-500 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Metadata & Reminder Bar */}
        <div className="px-5 py-2.5 border-t border-black/8 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600 dark:text-stone-300">
          <label className="inline-flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium">Reminder</span>
            <input
              type="datetime-local"
              value={draft.reminderAt}
              onChange={(e) => setDraft({ ...draft, reminderAt: e.target.value })}
              className="rounded-md border border-black/15 dark:border-white/15 bg-white/70 dark:bg-black/30 px-2 py-1 text-xs font-mono text-stone-800 dark:text-stone-200 focus:outline-none"
            />
            {draft.reminderAt && (
              <button
                type="button"
                onClick={() => setDraft({ ...draft, reminderAt: '' })}
                className="text-stone-500 hover:text-stone-900 dark:hover:text-stone-100"
              >
                Clear
              </button>
            )}
          </label>
          <span className="font-mono tabular-nums text-stone-500 dark:text-stone-400">
            Edited {new Date(draft.updatedAt).toLocaleString()}
          </span>
        </div>

        {/* Footer Controls */}
        <div className="px-5 py-3 border-t border-black/8 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 relative">
            <button
              type="button"
              onClick={() => setDraft({ ...draft, isPinned: !draft.isPinned })}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors ${
                draft.isPinned
                  ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100'
                  : 'border-black/15 dark:border-white/15 text-stone-700 dark:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <Pin className="w-3.5 h-3.5" />
              {draft.isPinned ? 'Pinned' : 'Pin'}
            </button>

            <button
              type="button"
              onClick={() => setDraft({ ...draft, isWidget: !draft.isWidget })}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors ${
                draft.isWidget
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-black/15 dark:border-white/15 text-stone-700 dark:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {draft.isWidget ? 'On Widget' : 'Widget'}
            </button>

            <button
              type="button"
              onClick={handleLockClick}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors ${
                draft.isLocked
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'border-black/15 dark:border-white/15 text-stone-700 dark:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              {draft.isLocked ? <Lock className="w-3.5 h-3.5" /> : <LockOpen className="w-3.5 h-3.5" />}
              {draft.isLocked ? 'Locked' : 'Lock'}
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowExportMenu((s) => !s)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border border-black/15 dark:border-white/15 text-stone-700 dark:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              {showExportMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-44 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-lg py-1 z-20">
                  <button
                    type="button"
                    onClick={() => handleExport('txt')}
                    className="w-full text-left px-3 py-1.5 text-xs text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    Plain Text (.txt)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('md')}
                    className="w-full text-left px-3 py-1.5 text-xs text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    Markdown (.md)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('json')}
                    className="w-full text-left px-3 py-1.5 text-xs text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
                  >
                    JSON Backup (.json)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowExportMenu(false);
                      window.print();
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print / Save PDF
                  </button>
                </div>
              )}
            </div>

            {!isNew && (
              <button
                type="button"
                onClick={() => {
                  onDeleteToTrash(draft);
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Trash
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveAndClose}
            className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 text-xs font-semibold hover:opacity-90 whitespace-nowrap"
          >
            <Check className="w-3.5 h-3.5" />
            Save Note
          </button>
        </div>
      </div>
    </div>
  );
};
