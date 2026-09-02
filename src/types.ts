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
  | 'mediaGallery'
  | 'shape';

export type ShapeKind =
  | 'textbox'
  | 'rect'
  | 'roundedRect'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'hexagon'
  | 'arrow'
  | 'leftArrow'
  | 'doubleArrow'
  | 'line'
  | 'star'
  | 'callout'
  | 'cloud'
  | 'heart'
  | 'badge';

export type ShapePatternType =
  | 'none'
  | 'dots'
  | 'grid'
  | 'stripes'
  | 'stripes-diagonal'
  | 'crosshatch'
  | 'blueprint'
  | 'waves';

export interface ShapeConfig {
  id?: string;
  kind: ShapeKind;
  color: string; // fill color / start color
  fillTransparent?: boolean;
  gradient?: boolean; // two-color linear gradient enable
  gradientEndColor?: string; // gradient end color
  gradientAngle?: number; // 0 to 360 degrees
  pattern?: ShapePatternType; // background texture pattern
  patternColor?: string; // color of pattern strokes/dots
  patternScale?: number; // scale multiplier for pattern density
  strokeColor?: string; // border/line color
  strokeWidth?: number; // border width in px
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  radius?: number; // corner radius for rects
  opacity?: number; // 0.0 to 1.0 (or 0 to 100)
  width?: number; // in px
  height?: number; // in px
  aspectLocked?: boolean;
  rotation?: number; // 0 to 360 degrees
  zIndex?: number; // layer stack order
  align?: 'center' | 'start' | 'end' | 'float-right' | 'float-left' | 'full';
  layerPosition?: 'inline' | 'behind' | 'in-front' | 'float-left' | 'float-right'; // Behind content, In front of content, or Inline flow
  posX?: number; // X coordinate offset for free drag movement
  posY?: number; // Y coordinate offset for free drag movement
  text?: string; // optional text inside shape (Word-like)
  textColor?: string;
  textSize?: number;
  textBold?: boolean;
  textAlign?: 'center' | 'right' | 'left'; // text alignment in shape/textbox
  shadow?: boolean;
  shadowType?: 'none' | 'soft' | '3d' | 'deep' | 'glow'; // 3D and depth lighting effects
  visible?: boolean;
}

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
  shape?: ShapeConfig;
  shapes?: ShapeConfig[];
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
}
