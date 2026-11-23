import React, { useState } from 'react';
import {
  Check,
  CheckSquare,
  ExternalLink,
  FileText,
  LayoutGrid,
  Lock,
  Plus,
  Search,
  Smartphone,
  X,
} from 'lucide-react';
import { NOTE_COLORS } from '../constants/colors';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Note } from '../types';

interface HomeWidgetsViewProps {
  notes: Note[];
  isVaultUnlocked: boolean;
  onOpenNote: (note: Note) => void;
  onToggleChecklistItem: (note: Note, itemId: string) => void;
  onToggleWidget: (note: Note) => void;
  onQuickCreate: (type: 'text' | 'checklist') => void;
  onFocusSearch: () => void;
}

export const HomeWidgetsView: React.FC<HomeWidgetsViewProps> = ({
  notes,
  isVaultUnlocked,
  onOpenNote,
  onToggleChecklistItem,
  onToggleWidget,
  onQuickCreate,
  onFocusSearch,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const activeNotes = notes.filter((n) => !n.isTrashed && !n.isArchived);
  const widgetNotes = activeNotes.filter((n) => n.isWidget);
  const availableToPin = activeNotes.filter((n) => !n.isWidget);

  return (
    <div className="space-y-8">
      {/* Home Screen Install & App Shortcuts Banner */}
      <section className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#181A1F] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="font-display text-base font-semibold text-stone-900 dark:text-stone-100">
              Home Screen Widgets &amp; Quick Access
            </h2>
          </div>
          <p className="text-sm text-stone-600 dark:text-stone-400 max-w-2xl">
            Pin notes below to keep interactive sticky cards and live checklists ready at a glance.
            Install Memoir to your device home screen for instant launcher shortcuts (New Note, New Checklist, Widgets).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={install}
              className="inline-flex items-center gap-2 rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 text-xs font-semibold hover:opacity-90 whitespace-nowrap"
            >
              Add to Home Screen
            </button>
          )}
          {!isInstalled && isIOS && (
            <button
              type="button"
              onClick={() => setShowIOSGuide(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-stone-300 dark:border-stone-700 px-3.5 py-2 text-xs font-medium text-stone-800 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 whitespace-nowrap"
            >
              iOS Home Screen Guide
            </button>
          )}
          {isInstalled && (
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
              Installed on Home Screen
            </span>
          )}
        </div>
      </section>

      {/* Interactive Home Screen Launcher Surface */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-stone-800 dark:text-stone-200">
            Pinned Widget Grid ({widgetNotes.length})
          </h3>
          <span className="text-xs text-stone-500 dark:text-stone-400">
            Interactive 2×2 &amp; 1×1 launcher widgets
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1x1 Quick Action Launcher Widget */}
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#181A1F] p-4 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
                Quick Capture Widget
              </p>
              <h4 className="mt-1 font-display text-base font-semibold text-stone-900 dark:text-stone-100">
                Instant Note Actions
              </h4>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onQuickCreate('text')}
                className="flex items-center gap-2 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-950 dark:text-amber-100 px-3 py-2.5 text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <FileText className="w-4 h-4 shrink-0" />
                Text Note
              </button>
              <button
                type="button"
                onClick={() => onQuickCreate('checklist')}
                className="flex items-center gap-2 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-950 dark:text-blue-100 px-3 py-2.5 text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <CheckSquare className="w-4 h-4 shrink-0" />
                Checklist
              </button>
              <button
                type="button"
                onClick={onFocusSearch}
                className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 px-3 py-2 text-xs font-medium hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                <Search className="w-3.5 h-3.5" />
                Jump to Search
              </button>
            </div>
          </div>

          {/* Interactive Pinned Sticky Widgets */}
          {widgetNotes.map((note) => {
            const palette = NOTE_COLORS[note.color] || NOTE_COLORS.yellow;
            const masked = note.isLocked && !isVaultUnlocked;
            return (
              <div
                key={note.id}
                className={`rounded-2xl border ${palette.cardBorder} ${palette.cardBg} overflow-hidden flex flex-col justify-between min-h-[200px]`}
              >
                <div>
                  <div className={`h-2 w-full ${palette.stripBg}`} />
                  <div className="px-4 pt-3 pb-2 flex items-start justify-between gap-2 border-b border-black/5 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => onOpenNote(note)}
                      className="text-left font-display text-sm font-semibold text-stone-900 dark:text-stone-100 hover:underline truncate flex-1"
                    >
                      {note.title || 'Untitled Note'}
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenNote(note)}
                        aria-label="Open full note"
                        title="Open full note"
                        className="p-1 rounded text-stone-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleWidget(note)}
                        aria-label="Unpin from widgets"
                        title="Remove from Home Widgets"
                        className="p-1 rounded text-stone-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/10"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 flex-1">
                  {masked ? (
                    <button
                      type="button"
                      onClick={() => onOpenNote(note)}
                      className="w-full h-full flex flex-col items-center justify-center py-6 text-stone-500 dark:text-stone-400"
                    >
                      <Lock className="w-5 h-5 mb-1.5" />
                      <span className="text-xs font-medium">Unlock Widget Note</span>
                    </button>
                  ) : note.type === 'checklist' ? (
                    <ul className="space-y-1.5">
                      {note.items.slice(0, 5).map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => onToggleChecklistItem(note, item.id)}
                            className="w-full flex items-center gap-2 text-left text-xs py-0.5 group"
                          >
                            <span
                              className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                                item.checked
                                  ? 'bg-stone-800 border-stone-800 text-white dark:bg-stone-200 dark:border-stone-200 dark:text-stone-900'
                                  : 'border-stone-400 dark:border-stone-500 bg-white/60 dark:bg-black/20'
                              }`}
                            >
                              {item.checked && <Check className="w-3 h-3" />}
                            </span>
                            <span
                              className={`truncate ${
                                item.checked
                                  ? 'line-through text-stone-400 dark:text-stone-500'
                                  : 'text-stone-800 dark:text-stone-200'
                              }`}
                            >
                              {item.text}
                            </span>
                          </button>
                        </li>
                      ))}
                      {note.items.length > 5 && (
                        <li className="text-xs text-stone-500 dark:text-stone-400 pt-1">
                          +{note.items.length - 5} more items
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p
                      onClick={() => onOpenNote(note)}
                      className="text-xs leading-relaxed text-stone-700 dark:text-stone-200 whitespace-pre-wrap line-clamp-6 cursor-pointer"
                    >
                      {note.content || 'Empty note — click to write.'}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Available Notes to Pin */}
      {availableToPin.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-display text-sm font-semibold text-stone-800 dark:text-stone-200">
            Pin Another Note to Home Widgets
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {availableToPin.slice(0, 9).map((note) => {
              const palette = NOTE_COLORS[note.color] || NOTE_COLORS.yellow;
              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => onToggleWidget(note)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-[#181A1F] px-3.5 py-2.5 text-left hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${palette.stripBg}`} />
                    <span className="text-xs font-medium text-stone-800 dark:text-stone-200 truncate">
                      {note.title || 'Untitled Note'}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 shrink-0 font-medium">
                    <Plus className="w-3.5 h-3.5" />
                    Pin
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {showIOSGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#181A1F] border border-stone-200 dark:border-stone-800 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100">
              <LayoutGrid className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-display text-base font-semibold">Add to iOS Home Screen</h3>
            </div>
            <ol className="mt-3 space-y-2 text-sm text-stone-600 dark:text-stone-300 list-decimal list-inside">
              <li>Tap the Share icon in the Safari toolbar.</li>
              <li>Scroll down and tap Add to Home Screen.</li>
              <li>Launch Memoir directly from your home screen with offline support.</li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-lg bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 py-2 text-xs font-semibold"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
