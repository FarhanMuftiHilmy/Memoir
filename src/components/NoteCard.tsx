import React, { useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  Bell,
  CheckSquare,
  Download,
  LayoutGrid,
  Lock,
  LockOpen,
  Palette,
  Pin,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { NOTE_COLOR_LIST, NOTE_COLORS } from '../constants/colors';
import { Note, NoteColor, ViewMode } from '../types';

interface NoteCardProps {
  note: Note;
  viewMode: ViewMode;
  isVaultUnlocked: boolean;
  onOpen: (note: Note) => void;
  onTogglePin: (note: Note) => void;
  onToggleWidget: (note: Note) => void;
  onChangeColor: (note: Note, color: NoteColor) => void;
  onToggleLock: (note: Note) => void;
  onToggleArchive: (note: Note) => void;
  onTrash: (note: Note) => void;
  onRestore: (note: Note) => void;
  onDeleteForever: (note: Note) => void;
  onExportNote: (note: Note) => void;
}

function formatShortDate(ms: number): string {
  const date = new Date(ms);
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

function formatReminder(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  viewMode,
  isVaultUnlocked,
  onOpen,
  onTogglePin,
  onToggleWidget,
  onChangeColor,
  onToggleLock,
  onToggleArchive,
  onTrash,
  onRestore,
  onDeleteForever,
  onExportNote,
}) => {
  const [showColors, setShowColors] = useState(false);
  const palette = NOTE_COLORS[note.color] || NOTE_COLORS.yellow;
  const masked = note.isLocked && !isVaultUnlocked;
  const completedCount = note.items.filter((i) => i.checked).length;
  const reminderText = formatReminder(note.reminderAt);

  const metadataParts = [
    note.type === 'checklist'
      ? `Checklist · ${completedCount}/${note.items.length}`
      : 'Note',
    formatShortDate(note.updatedAt),
  ];

  if (viewMode === 'list') {
    return (
      <div
        onClick={() => onOpen(note)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen(note);
          }
        }}
        className={`group relative flex items-center justify-between gap-4 rounded-xl border ${palette.cardBorder} ${palette.cardBg} px-4 py-3 cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span
            className={`w-3 h-3 rounded-sm shrink-0 ${palette.stripBg}`}
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                {note.title || 'Untitled Note'}
              </h3>
              {note.isPinned && (
                <Pin className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300 shrink-0" aria-label="Pinned" />
              )}
              {note.isWidget && (
                <LayoutGrid className="w-3.5 h-3.5 text-stone-600 dark:text-stone-300 shrink-0" aria-label="Home Widget" />
              )}
              {note.isLocked && (
                <Lock className="w-3.5 h-3.5 text-stone-700 dark:text-stone-200 shrink-0" aria-label="Password Protected" />
              )}
            </div>
            <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400 truncate">
              {masked
                ? 'Password protected — click to unlock'
                : note.type === 'checklist'
                  ? note.items.map((i) => i.text).filter(Boolean).join(', ') || 'Empty checklist'
                  : note.content.replace(/\s+/g, ' ').trim() || 'Empty note'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline text-xs font-mono tabular-nums text-stone-500 dark:text-stone-400">
            {metadataParts.join(' · ')}
          </span>
          {!note.isTrashed ? (
            <div
              className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onTogglePin(note)}
                aria-label={note.isPinned ? 'Unpin note' : 'Pin note'}
                title={note.isPinned ? 'Unpin note' : 'Pin note'}
                className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-current' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => onExportNote(note)}
                aria-label="Export note"
                title="Export note"
                className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onTrash(note)}
                aria-label="Move to trash"
                title="Move to trash"
                className="p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => onRestore(note)}
                aria-label="Restore note"
                title="Restore note"
                className="p-1.5 rounded-lg text-stone-700 dark:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteForever(note)}
                aria-label="Delete permanently"
                title="Delete permanently"
                className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Grid or Details mode
  const maxLines = viewMode === 'details' ? 8 : 5;

  return (
    <article
      onClick={() => onOpen(note)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(note);
        }
      }}
      className={`group relative flex flex-col justify-between rounded-xl border ${palette.cardBorder} ${palette.cardBg} overflow-hidden cursor-pointer transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500`}
    >
      {/* Signature ColorNote Top Edge */}
      <div className={`h-2 w-full ${palette.stripBg}`} aria-hidden="true" />

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-[15px] font-semibold leading-snug text-stone-900 dark:text-stone-100 line-clamp-2">
            {note.title || 'Untitled Note'}
          </h3>
          <div className="flex items-center gap-1 shrink-0 pt-0.5 text-stone-600 dark:text-stone-300">
            {note.isPinned && <Pin className="w-3.5 h-3.5 fill-current" aria-label="Pinned" />}
            {note.isWidget && <LayoutGrid className="w-3.5 h-3.5" aria-label="Home Widget" />}
            {note.isLocked && <Lock className="w-3.5 h-3.5" aria-label="Locked" />}
          </div>
        </div>

        {/* Unboxed clean metadata line */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-stone-500 dark:text-stone-400 font-mono tabular-nums">
          <span>{metadataParts[0]}</span>
          <span aria-hidden="true">·</span>
          <span>{metadataParts[1]}</span>
          {reminderText && (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-stone-700 dark:text-stone-300">
                <Bell className="w-3 h-3" aria-hidden="true" />
                {reminderText}
              </span>
            </>
          )}
        </div>

        {/* Body Content */}
        <div className="mt-3 flex-1 text-sm leading-relaxed text-stone-700 dark:text-stone-200">
          {masked ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-stone-500 dark:text-stone-400">
              <Lock className="w-5 h-5 mb-2 opacity-75" />
              <p className="text-xs font-medium">Password Protected</p>
              <p className="text-xs opacity-80 mt-0.5">Click to unlock and read</p>
            </div>
          ) : note.type === 'checklist' ? (
            <ul className="space-y-1.5">
              {note.items.slice(0, maxLines).map((item) => (
                <li key={item.id} className="flex items-start gap-2 text-[13px]">
                  <CheckSquare
                    className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${
                      item.checked
                        ? 'text-stone-400 dark:text-stone-500'
                        : 'text-stone-600 dark:text-stone-300'
                    }`}
                  />
                  <span
                    className={`truncate ${
                      item.checked
                        ? 'line-through text-stone-400 dark:text-stone-500'
                        : 'text-stone-800 dark:text-stone-200'
                    }`}
                  >
                    {item.text || 'Empty item'}
                  </span>
                </li>
              ))}
              {note.items.length > maxLines && (
                <li className="text-xs text-stone-500 dark:text-stone-400 pt-0.5">
                  +{note.items.length - maxLines} more items
                </li>
              )}
              {note.items.length === 0 && (
                <li className="text-xs italic text-stone-400 dark:text-stone-500">
                  Empty checklist
                </li>
              )}
            </ul>
          ) : (
            <p
              className={`whitespace-pre-wrap break-words text-[13.5px] leading-relaxed ${
                viewMode === 'details' ? 'line-clamp-8' : 'line-clamp-5'
              } ${!note.content.trim() ? 'italic text-stone-400 dark:text-stone-500' : ''}`}
            >
              {note.content.trim() || 'Empty note'}
            </p>
          )}
        </div>
      </div>

      {/* Color Picker Popover inside Card */}
      {showColors && !note.isTrashed && (
        <div
          className="px-3 py-2 border-t border-black/5 dark:border-white/10 flex flex-wrap items-center gap-1.5 bg-white/75 dark:bg-black/30"
          onClick={(e) => e.stopPropagation()}
        >
          {NOTE_COLOR_LIST.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                onChangeColor(note, c.key);
                setShowColors(false);
              }}
              aria-label={`Set color ${c.label}`}
              title={c.label}
              className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${
                note.color === c.key ? 'ring-2 ring-offset-1 ring-stone-900 dark:ring-stone-100' : ''
              }`}
              style={{ backgroundColor: c.swatchHex }}
            />
          ))}
        </div>
      )}

      {/* Action Strip */}
      <div
        className="px-3 py-2 border-t border-black/5 dark:border-white/10 flex items-center justify-between gap-1 text-stone-600 dark:text-stone-300"
        onClick={(e) => e.stopPropagation()}
      >
        {!note.isTrashed ? (
          <>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onTogglePin(note)}
                aria-label={note.isPinned ? 'Unpin note' : 'Pin note'}
                title={note.isPinned ? 'Unpin note' : 'Pin note'}
                className={`p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 ${
                  note.isPinned ? 'text-stone-900 dark:text-stone-100' : ''
                }`}
              >
                <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-current' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => onToggleWidget(note)}
                aria-label={note.isWidget ? 'Remove from Home Widgets' : 'Pin to Home Widgets'}
                title={note.isWidget ? 'Remove from Home Widgets' : 'Pin to Home Widgets'}
                className={`p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 ${
                  note.isWidget ? 'text-blue-600 dark:text-blue-400' : ''
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowColors((s) => !s)}
                aria-label="Change note color"
                title="Change note color"
                className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onToggleLock(note)}
                aria-label={note.isLocked ? 'Unlock note' : 'Lock with password'}
                title={note.isLocked ? 'Unlock note' : 'Lock with password'}
                className={`p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 ${
                  note.isLocked ? 'text-amber-700 dark:text-amber-400' : ''
                }`}
              >
                {note.isLocked ? <Lock className="w-3.5 h-3.5" /> : <LockOpen className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onExportNote(note)}
                aria-label="Export note"
                title="Export note"
                className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onToggleArchive(note)}
                aria-label={note.isArchived ? 'Unarchive note' : 'Archive note'}
                title={note.isArchived ? 'Unarchive note' : 'Archive note'}
                className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10"
              >
                {note.isArchived ? (
                  <ArchiveRestore className="w-3.5 h-3.5" />
                ) : (
                  <Archive className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onTrash(note)}
                aria-label="Move to trash"
                title="Move to trash"
                className="p-1.5 rounded-md hover:text-red-600 dark:hover:text-red-400 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          <div className="w-full flex items-center justify-between">
            <button
              type="button"
              onClick={() => onRestore(note)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-stone-800 dark:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore
            </button>
            <button
              type="button"
              onClick={() => onDeleteForever(note)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Forever
            </button>
          </div>
        )}
      </div>
    </article>
  );
};
