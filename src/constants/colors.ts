import { NoteColor } from '../types';

export interface ColorPaletteEntry {
  key: NoteColor;
  label: string;
  swatchHex: string;
  stripBg: string;
  cardBg: string;
  cardBorder: string;
  headerBg: string;
  accentText: string;
  order: number;
}

export const NOTE_COLORS: Record<NoteColor, ColorPaletteEntry> = {
  yellow: {
    key: 'yellow',
    label: 'Butter',
    swatchHex: '#EAB308',
    stripBg: 'bg-amber-400 dark:bg-amber-500',
    cardBg: 'bg-[#FEFCE8] dark:bg-[#242012]',
    cardBorder: 'border-amber-300/80 dark:border-amber-500/30',
    headerBg: 'bg-amber-100/90 dark:bg-amber-500/15',
    accentText: 'text-amber-900 dark:text-amber-200',
    order: 0,
  },
  orange: {
    key: 'orange',
    label: 'Tangerine',
    swatchHex: '#EA580C',
    stripBg: 'bg-orange-500 dark:bg-orange-500',
    cardBg: 'bg-[#FFF7ED] dark:bg-[#271A12]',
    cardBorder: 'border-orange-300/80 dark:border-orange-500/30',
    headerBg: 'bg-orange-100/90 dark:bg-orange-500/15',
    accentText: 'text-orange-900 dark:text-orange-200',
    order: 1,
  },
  red: {
    key: 'red',
    label: 'Coral',
    swatchHex: '#DC2626',
    stripBg: 'bg-red-500 dark:bg-red-500',
    cardBg: 'bg-[#FEF2F2] dark:bg-[#281517]',
    cardBorder: 'border-red-300/80 dark:border-red-500/30',
    headerBg: 'bg-red-100/90 dark:bg-red-500/15',
    accentText: 'text-red-900 dark:text-red-200',
    order: 2,
  },
  green: {
    key: 'green',
    label: 'Sage',
    swatchHex: '#16A34A',
    stripBg: 'bg-emerald-500 dark:bg-emerald-500',
    cardBg: 'bg-[#F0FDF4] dark:bg-[#132419]',
    cardBorder: 'border-emerald-300/80 dark:border-emerald-500/30',
    headerBg: 'bg-emerald-100/90 dark:bg-emerald-500/15',
    accentText: 'text-emerald-900 dark:text-emerald-200',
    order: 3,
  },
  teal: {
    key: 'teal',
    label: 'Mint',
    swatchHex: '#0D9488',
    stripBg: 'bg-teal-500 dark:bg-teal-500',
    cardBg: 'bg-[#F0FDFA] dark:bg-[#122322]',
    cardBorder: 'border-teal-300/80 dark:border-teal-500/30',
    headerBg: 'bg-teal-100/90 dark:bg-teal-500/15',
    accentText: 'text-teal-900 dark:text-teal-200',
    order: 4,
  },
  blue: {
    key: 'blue',
    label: 'Sky',
    swatchHex: '#2563EB',
    stripBg: 'bg-blue-500 dark:bg-blue-500',
    cardBg: 'bg-[#EFF6FF] dark:bg-[#141D2D]',
    cardBorder: 'border-blue-300/80 dark:border-blue-500/30',
    headerBg: 'bg-blue-100/90 dark:bg-blue-500/15',
    accentText: 'text-blue-900 dark:text-blue-200',
    order: 5,
  },
  purple: {
    key: 'purple',
    label: 'Lavender',
    swatchHex: '#7C3AED',
    stripBg: 'bg-violet-500 dark:bg-violet-500',
    cardBg: 'bg-[#F5F3FF] dark:bg-[#1F182D]',
    cardBorder: 'border-violet-300/80 dark:border-violet-500/30',
    headerBg: 'bg-violet-100/90 dark:bg-violet-500/15',
    accentText: 'text-violet-900 dark:text-violet-200',
    order: 6,
  },
  pink: {
    key: 'pink',
    label: 'Blush',
    swatchHex: '#DB2777',
    stripBg: 'bg-pink-500 dark:bg-pink-500',
    cardBg: 'bg-[#FDF2F8] dark:bg-[#291522]',
    cardBorder: 'border-pink-300/80 dark:border-pink-500/30',
    headerBg: 'bg-pink-100/90 dark:bg-pink-500/15',
    accentText: 'text-pink-900 dark:text-pink-200',
    order: 7,
  },
  gray: {
    key: 'gray',
    label: 'Graphite',
    swatchHex: '#52525B',
    stripBg: 'bg-stone-500 dark:bg-stone-400',
    cardBg: 'bg-[#F5F5F4] dark:bg-[#1C1D21]',
    cardBorder: 'border-stone-300/90 dark:border-stone-700',
    headerBg: 'bg-stone-200/80 dark:bg-stone-700/40',
    accentText: 'text-stone-900 dark:text-stone-200',
    order: 8,
  },
};

export const NOTE_COLOR_LIST: ColorPaletteEntry[] = Object.values(NOTE_COLORS).sort(
  (a, b) => a.order - b.order
);
