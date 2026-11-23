import JSZip from 'jszip';
import { BackupNoteRecord, Note } from '../types';

export type ExportFormat = 'txt' | 'md' | 'json' | 'zip-txt' | 'zip-md';

function sanitizeFileName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ')
    .slice(0, 64);
  return cleaned || 'untitled-note';
}

export function noteToPlainText(note: Note, includeLockedContent: boolean): string {
  const header = [
    note.title || 'Untitled Note',
    `Color: ${note.color} | Type: ${note.type} | Updated: ${new Date(note.updatedAt).toLocaleString()}`,
    note.reminderAt ? `Reminder: ${new Date(note.reminderAt).toLocaleString()}` : null,
    '----------------------------------------',
  ]
    .filter(Boolean)
    .join('\n');

  if (note.isLocked && !includeLockedContent) {
    return `${header}\n[Locked Note — Unlock vault before exporting to include contents.]\n`;
  }

  if (note.type === 'checklist') {
    const lines = note.items.map((item) => `[${item.checked ? 'x' : ' '}] ${item.text}`);
    return `${header}\n${lines.join('\n')}\n`;
  }

  return `${header}\n${note.content}\n`;
}

export function noteToMarkdown(note: Note, includeLockedContent: boolean): string {
  const lines = [
    `# ${note.title || 'Untitled Note'}`,
    '',
    `- **Color**: ${note.color}`,
    `- **Type**: ${note.type}`,
    `- **Updated**: ${new Date(note.updatedAt).toISOString()}`,
  ];
  if (note.reminderAt) {
    lines.push(`- **Reminder**: ${new Date(note.reminderAt).toISOString()}`);
  }
  lines.push('');

  if (note.isLocked && !includeLockedContent) {
    lines.push('> *Locked Note — Unlock vault before exporting to include contents.*');
    return lines.join('\n');
  }

  if (note.type === 'checklist') {
    for (const item of note.items) {
      lines.push(`- [${item.checked ? 'x' : ' '}] ${item.text}`);
    }
  } else {
    lines.push(note.content);
  }
  lines.push('');
  return lines.join('\n');
}

export function notesToBackupRecords(notes: Note[]): BackupNoteRecord[] {
  return notes.map((n) => ({
    id: n.id,
    title: n.title,
    type: n.type,
    content: n.content,
    items: n.items,
    color: n.color,
    isPinned: n.isPinned,
    isArchived: n.isArchived,
    isTrashed: n.isTrashed,
    isLocked: n.isLocked,
    isWidget: n.isWidget,
    reminderAt: n.reminderAt,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }));
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
}

export async function saveBlobToExternalStorage(
  blob: Blob,
  filename: string,
  mimeType: string,
  extension: string,
  preferPicker = false
): Promise<'saved-picker' | 'downloaded'> {
  const win = window as unknown as {
    showSaveFilePicker?: (opts: SaveFilePickerOptions) => Promise<{
      createWritable: () => Promise<{
        write: (data: Blob) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  };

  if (preferPicker && typeof win.showSaveFilePicker === 'function') {
    try {
      const handle = await win.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: `${extension.toUpperCase()} File`,
            accept: { [mimeType]: [`.${extension}`] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return 'saved-picker';
    } catch (err) {
      // User cancelled or iframe blocks File System Access API -> fall back to download
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}

export async function exportSingleNote(
  note: Note,
  format: 'txt' | 'md' | 'json',
  includeLockedContent: boolean,
  preferPicker = false
): Promise<'saved-picker' | 'downloaded'> {
  const baseName = sanitizeFileName(note.title || 'note');
  if (format === 'json') {
    const payload = JSON.stringify(
      {
        app: 'Memoir',
        version: 1,
        exportedAt: new Date().toISOString(),
        notes: notesToBackupRecords([note]),
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    return saveBlobToExternalStorage(blob, `${baseName}.json`, 'application/json', 'json', preferPicker);
  }
  if (format === 'md') {
    const content = noteToMarkdown(note, includeLockedContent);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    return saveBlobToExternalStorage(blob, `${baseName}.md`, 'text/markdown', 'md', preferPicker);
  }
  const content = noteToPlainText(note, includeLockedContent);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  return saveBlobToExternalStorage(blob, `${baseName}.txt`, 'text/plain', 'txt', preferPicker);
}

export async function exportMultipleNotes(
  notes: Note[],
  format: ExportFormat,
  isVaultUnlocked: boolean,
  preferPicker = false
): Promise<'saved-picker' | 'downloaded'> {
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === 'json') {
    const sanitizedNotes = notes.map((n) =>
      n.isLocked && !isVaultUnlocked
        ? {
            ...n,
            content: '[Locked Note — Unlock vault before exporting to include contents.]',
            items: [],
          }
        : n
    );
    const payload = JSON.stringify(
      {
        app: 'Memoir',
        version: 1,
        exportedAt: new Date().toISOString(),
        noteCount: sanitizedNotes.length,
        notes: notesToBackupRecords(sanitizedNotes),
      },
      null,
      2
    );
    const blob = new Blob([payload], { type: 'application/json' });
    return saveBlobToExternalStorage(
      blob,
      `chromanote-backup-${stamp}.json`,
      'application/json',
      'json',
      preferPicker
    );
  }

  if (format === 'txt') {
    const combined = notes
      .map((n) => noteToPlainText(n, isVaultUnlocked))
      .join('\n========================================\n\n');
    const blob = new Blob([combined], { type: 'text/plain;charset=utf-8' });
    return saveBlobToExternalStorage(
      blob,
      `chromanote-export-${stamp}.txt`,
      'text/plain',
      'txt',
      preferPicker
    );
  }

  if (format === 'md') {
    const combined = notes.map((n) => noteToMarkdown(n, isVaultUnlocked)).join('\n---\n\n');
    const blob = new Blob([combined], { type: 'text/markdown;charset=utf-8' });
    return saveBlobToExternalStorage(
      blob,
      `chromanote-export-${stamp}.md`,
      'text/markdown',
      'md',
      preferPicker
    );
  }

  const zip = new JSZip();
  const usedNames = new Map<string, number>();
  const ext = format === 'zip-md' ? 'md' : 'txt';

  for (const note of notes) {
    const rawName = sanitizeFileName(note.title || 'note');
    const count = usedNames.get(rawName) || 0;
    usedNames.set(rawName, count + 1);
    const fileName = count === 0 ? `${rawName}.${ext}` : `${rawName} (${count}).${ext}`;
    const body =
      ext === 'md'
        ? noteToMarkdown(note, isVaultUnlocked)
        : noteToPlainText(note, isVaultUnlocked);
    zip.file(fileName, body);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  return saveBlobToExternalStorage(
    blob,
    `chromanote-archive-${stamp}.zip`,
    'application/zip',
    'zip',
    preferPicker
  );
}
