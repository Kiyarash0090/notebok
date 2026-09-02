import { Category, NoteColorOption } from './types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'درس و جزوه‌ها', color: '#4B6A2A', icon: 'BookOpen', description: 'یادداشت‌ها و جزوات درسی', createdAt: new Date().toISOString() },
  { id: '2', name: 'کاری و پروژه', color: '#36667F', icon: 'Briefcase', description: 'وظایف و پروژه‌های کاری', createdAt: new Date().toISOString() },
  { id: '3', name: 'شخصی', color: '#8B6814', icon: 'User', description: 'نکات و برنامه‌های شخصی', createdAt: new Date().toISOString() },
  { id: '4', name: 'ایده‌ها', color: '#714C85', icon: 'Lightbulb', description: 'ایده‌ها و افکار خلاقانه', createdAt: new Date().toISOString() },
];

export const NOTE_COLORS: NoteColorOption[] = [
  {
    id: 'default',
    name: 'سنگ طبیعی / سفید پاستلی',
    bgLight: 'bg-[#FAF9F5]',
    bgDark: 'dark:bg-[#23261F]',
    borderLight: 'border-[#E5E7EB]',
    borderDark: 'dark:border-[#43493E]',
    accent: '#4B6A2A',
  },
  {
    id: 'sage',
    name: 'پسته‌ای / مریم‌گلی پاستلی',
    bgLight: 'bg-[#F0F7EC]',
    bgDark: 'dark:bg-[#232F1A]',
    borderLight: 'border-[#D6E8C5]',
    borderDark: 'dark:border-[#3D522C]',
    accent: '#587E32',
  },
  {
    id: 'moss',
    name: 'سبز نعنایی پاستلی',
    bgLight: 'bg-[#E8F5E9]',
    bgDark: 'dark:bg-[#1E2E20]',
    borderLight: 'border-[#C8E6C9]',
    borderDark: 'dark:border-[#344F38]',
    accent: '#4CAF50',
  },
  {
    id: 'sand',
    name: 'شنی / لیمویی پاستلی',
    bgLight: 'bg-[#FFFDE7]',
    bgDark: 'dark:bg-[#332A18]',
    borderLight: 'border-[#FFE082]',
    borderDark: 'dark:border-[#574728]',
    accent: '#FBC02D',
  },
  {
    id: 'clay',
    name: 'هلویی / خاک‌رس پاستلی',
    bgLight: 'bg-[#FFF0EB]',
    bgDark: 'dark:bg-[#382622]',
    borderLight: 'border-[#FFCCBC]',
    borderDark: 'dark:border-[#633F38]',
    accent: '#E64A19',
  },
  {
    id: 'pine',
    name: 'فیروزه‌ای پاستلی',
    bgLight: 'bg-[#E0F2F1]',
    bgDark: 'dark:bg-[#1C2F28]',
    borderLight: 'border-[#B2DFDB]',
    borderDark: 'dark:border-[#2F5244]',
    accent: '#00897B',
  },
  {
    id: 'fog',
    name: 'آسمان مه‌آلود / آبی پاستلی',
    bgLight: 'bg-[#E3F2FD]',
    bgDark: 'dark:bg-[#1E2B33]',
    borderLight: 'border-[#BBDEFB]',
    borderDark: 'dark:border-[#344B57]',
    accent: '#1E88E5',
  },
  {
    id: 'heather',
    name: 'یاسی / اسطوخودوس پاستلی',
    bgLight: 'bg-[#F3E5F5]',
    bgDark: 'dark:bg-[#2D2335]',
    borderLight: 'border-[#E1BEE7]',
    borderDark: 'dark:border-[#4F3C5D]',
    accent: '#8E24AA',
  },
  {
    id: 'linen',
    name: 'کتان / کرم پاستلی',
    bgLight: 'bg-[#FDF8F0]',
    bgDark: 'dark:bg-[#2C2922]',
    borderLight: 'border-[#F0E5D8]',
    borderDark: 'dark:border-[#4A453A]',
    accent: '#A1887F',
  },
  {
    id: 'coral',
    name: 'صورتی ملایم / رز پاستلی',
    bgLight: 'bg-[#FCE4EC]',
    bgDark: 'dark:bg-[#3B2526]',
    borderLight: 'border-[#F8BBD0]',
    borderDark: 'dark:border-[#5E3638]',
    accent: '#D81B60',
  },
  {
    id: 'mint',
    name: 'نعناع زمردی پاستلی',
    bgLight: 'bg-[#E0F7FA]',
    bgDark: 'dark:bg-[#1C2E22]',
    borderLight: 'border-[#B2EBF2]',
    borderDark: 'dark:border-[#2C4D37]',
    accent: '#00ACC1',
  },
];

// Background tints for table cells (id '' = none).
export const TABLE_COLORS: { id: string; name: string; light: string; dark: string }[] = [
  { id: '', name: 'بدون', light: '', dark: '' },
  { id: 'green', name: 'سبز', light: 'bg-[#D0E8B2]/60', dark: 'dark:bg-[#324B10]/60' },
  { id: 'amber', name: 'زرد', light: 'bg-[#FAF2DE]', dark: 'dark:bg-[#332A18]' },
  { id: 'blue', name: 'آبی', light: 'bg-[#E3EDF2]', dark: 'dark:bg-[#1E2B33]' },
  { id: 'coral', name: 'مرجانی', light: 'bg-[#FCEAE8]', dark: 'dark:bg-[#3B2526]' },
  { id: 'purple', name: 'بنفش', light: 'bg-[#EEE6F3]', dark: 'dark:bg-[#2D2335]' },
];

export const TABLE_COLOR_MAP: Record<string, { light: string; dark: string }> = Object.fromEntries(
  TABLE_COLORS.map((c) => [c.id, { light: c.light, dark: c.dark }])
);
