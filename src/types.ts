export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export type ImportanceLevel = 'normal' | 'high' | 'critical';

export type AttachmentType = 'image' | 'video' | 'audio' | 'document';

export type AttachmentPosition = 'top' | 'bottom';

export interface NoteAttachment {
  id: string;
  name: string;
  type: AttachmentType;
  mimeType: string;
  size: number;
  url: string; // /uploads/<file> served by the API, or a legacy base64 data URL
  duration?: number;
  position?: AttachmentPosition;
  createdAt: string;
}

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'quote'
  | 'callout'
  | 'code'
  | 'math'
  | 'divider'
  | 'media'
  | 'checklist'
  | 'table'
  | 'mediaGallery';

export type CalloutTone = 'info' | 'success' | 'warning' | 'danger' | 'tip';

export interface TableCell {
  text: string;
  color?: string; // TABLE_COLORS id
}

export interface TableData {
  rows: number;
  cols: number;
  cells: TableCell[]; // flat, length rows * cols
  header?: boolean; // first row rendered as a header
}

export interface MediaGalleryItem {
  attachmentId: string;
  caption?: string;
}

export interface MediaGalleryData {
  items: MediaGalleryItem[];
}

export interface NoteBlock {
  id: string;
  type: BlockType;
  text: string;
  level?: 1 | 2 | 3;
  tone?: CalloutTone;
  language?: string;
  attachmentId?: string;
  width?: number; // media width as a percentage of the column
  caption?: string;
  items?: ChecklistItem[];
  table?: TableData;
  gallery?: MediaGalleryData;
}

export interface Note {
  id: string;
  title: string;
  content: string; // plain-text mirror of blocks, used for search and legacy notes
  blocks: NoteBlock[];
  categoryId?: string;
  isPinned: boolean;
  isImportant: boolean;
  isArchived: boolean;
  isTrash: boolean;
  color: string;
  tags: string[];
  checklists: ChecklistItem[];
  attachments?: NoteAttachment[];
  summary?: string;
  importanceLevel: ImportanceLevel;
  createdAt: string;
  updatedAt: string;
}

export interface NoteRevision {
  revisionId: string;
  savedAt: string;
  reason: string;
  title: string;
  wordCount: number;
}

export interface NoteDraft {
  savedAt: string;
  payload: Note;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  parentId?: string | null;
  createdAt: string;
}


export interface BackupData {
  version: number;
  exportedAt: string;
  app: string;
  notes: Note[];
  categories: Category[];
  media?: BackupMedia[];
  stats: {
    totalNotes: number;
    importantCount: number;
    categoriesCount: number;
  };
}

export interface BackupMedia {
  url: string;
  filename: string;
  type?: string;
  dataBase64: string;
}

export interface ServerSnapshot {
  id: string;
  filename: string;
  label?: string;
  createdAt: string;
  notesCount: number;
  categoriesCount: number;
  sizeBytes: number;
}

export type ViewFilter = 'all' | 'important' | 'category' | 'checklists' | 'archive' | 'trash';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface NoteColorOption {
  id: string;
  name: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
  accent: string;
}

export interface TelegramConfig {
  enabled: boolean;
  apiId: number;
  apiHash: string;
  botToken: string;
  chatId: string;
  autoSyncDb: boolean;
  lastSyncAt?: string;
  filesIndexMessageId?: number;
  filesIndexChatId?: string;
}

export interface AuthStatus {
  configured: boolean;
  authenticated: boolean;
  username?: string;
}

export interface ManagedFolder {
  id: string;
  name: string;
  parentId?: string | null;
  telegramChatId?: string;
  createdAt: string;
}

export interface ManagedFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  url: string;
  folderId?: string | null;
  storage?: 'local' | 'telegram';
  telegramMessageId?: number;
  telegramChatId?: string;
  createdAt: string;
  updatedAt: string;
}

