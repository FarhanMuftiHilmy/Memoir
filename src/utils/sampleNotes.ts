import { Note } from '../types';

export function createStarterNotes(ownerId = 'local'): Note[] {
  const now = Date.now();
  return [
    {
      id: 'starter_welcome_yellow',
      ownerId,
      title: 'Welcome to Memoir',
      type: 'text',
      content:
        'Organize thoughts by color just like ColorNote.\n\n• Pick from 9 distinct note colors\n• Sign in with Google to sync notes across all your devices in real time\n• Set a Master Password to lock sensitive notes\n• Pin favorite notes to your Home Screen Widgets dock\n• Enable automated backups or export to external storage (.txt, .md, .json, .zip)',
      items: [],
      color: 'yellow',
      isPinned: true,
      isArchived: false,
      isTrashed: false,
      isLocked: false,
      isWidget: true,
      reminderAt: '',
      createdAt: now - 3600_000 * 4,
      updatedAt: now - 1800_000,
    },
    {
      id: 'starter_checklist_blue',
      ownerId,
      title: 'Weekend Groceries & Errands',
      type: 'checklist',
      content: '',
      items: [
        { id: 'chk_1', text: 'Fresh sourdough & oat milk', checked: true },
        { id: 'chk_2', text: 'Coffee beans (Ethiopia light roast)', checked: false },
        { id: 'chk_3', text: 'Avocados, spinach, cherry tomatoes', checked: false },
        { id: 'chk_4', text: 'Pick up dry cleaning before 5 PM', checked: false },
      ],
      color: 'blue',
      isPinned: false,
      isArchived: false,
      isTrashed: false,
      isLocked: false,
      isWidget: true,
      reminderAt: '',
      createdAt: now - 3600_000 * 12,
      updatedAt: now - 900_000,
    },
    {
      id: 'starter_ideas_green',
      ownerId,
      title: 'Q4 Product Launch Outline',
      type: 'text',
      content:
        '1. Finalize release notes & changelog\n2. Schedule cross-device sync QA pass\n3. Prepare press kit and exportable markdown docs\n4. Share launch checklist with design & engineering',
      items: [],
      color: 'green',
      isPinned: false,
      isArchived: false,
      isTrashed: false,
      isLocked: false,
      isWidget: false,
      reminderAt: new Date(now + 86400_000 * 2).toISOString().slice(0, 16),
      createdAt: now - 3600_000 * 24,
      updatedAt: now - 7200_000,
    },
  ];
}
