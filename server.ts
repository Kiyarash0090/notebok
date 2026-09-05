import crypto from 'crypto';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  getTelegramConfig,
  saveTelegramConfig,
  testTelegramConnection,
  uploadFileToTelegram,
  downloadFileFromTelegram,
  syncDbToTelegram,
  restoreDbFromTelegram,
  migrateLocalFilesToTelegram,
} from './telegramStorage';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '60mb' }));

// Paths for persistent data
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'notes_db.json');
const SNAPSHOTS_DIR = path.join(DATA_DIR, 'snapshots');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const REVISIONS_DIR = path.join(DATA_DIR, 'revisions');

for (const dir of [DATA_DIR, SNAPSHOTS_DIR, UPLOADS_DIR, REVISIONS_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Initial default data if fresh install
const DEFAULT_CATEGORIES = [
  {
    id: 'cat_academic',
    name: 'جزوه‌های دانشگاه و درس',
    color: '#1a73e8',
    icon: 'GraduationCap',
    description: 'جزوه‌ها، خلاصه‌ها و فرمول‌های مهم درسی',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat_important',
    name: 'نکات حیاتی و ضروری',
    color: '#d93025',
    icon: 'AlertCircle',
    description: 'چیزهایی که نباید هرگز فراموش شوند',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat_work',
    name: 'کار و پروژه‌ها',
    color: '#188038',
    icon: 'Briefcase',
    description: 'نکات جلسات، فیچرهای پروژه و وظایف',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'cat_ideas',
    name: 'ایده‌ها و مطالعات فردی',
    color: '#9334e6',
    icon: 'Lightbulb',
    description: 'کتاب‌های خوانده شده، پادکست‌ها و ایده‌ها',
    createdAt: new Date().toISOString(),
  },
];

const DEFAULT_NOTES = [
  {
    id: 'note_1',
    title: '📌 نکات کلیدی و طلایی یادگیری عمیق (Deep Work)',
    content: `۱. تمرکز پیوسته بدون وقفه: بلوک‌های زمانی ۹۰ دقیقه‌ای برای مطالعه و یادداشت‌برداری عمیق.\n۲. اصل استخراج نکات: هر فصل کتاب یا جلسه درس را به ۳ نکته بنیادین و ۱ مثال عملی تبدیل کنید.\n۳. مرور فاصله‌دار (Spaced Repetition): مرور در روز ۱، ۳، ۷ و ۲۱ برای تثبیت کامل در حافظه بلندمدت.\n\n💡 نکته امتحانی / کاری: خلاصه‌نویسی کلمه به کلمه اشتباه است، مفهوم را با زبان خود بازنویسی کنید!`,
    categoryId: 'cat_academic',
    isPinned: true,
    isImportant: true,
    isArchived: false,
    isTrash: false,
    color: 'sand',
    tags: ['مطالعه', 'بهره‌وری', 'کنکور/دانشگاه'],
    checklists: [
      { id: 'c1', text: 'مطالعه فصل ۳ جزوه تحلیل ساختار', done: true },
      { id: 'c2', text: 'استخراج فرمول‌های کلیدی در بخش نکات مهم', done: true },
      { id: 'c3', text: 'مرور ۳ روزه یادداشت‌ها', done: false },
    ],
    summary: 'تمرکز ۹۰ دقیقه‌ای، بازنویسی با کلمات خود، و مرور فاصله‌دار در روزهای ۱، ۳، ۷ و ۲۱.',
    importanceLevel: 'critical',
    createdAt: '2025-01-15T10:00:00.000Z',
    updatedAt: '2025-01-15T15:00:00.000Z',
  },
  {
    id: 'note_2',
    title: '🚀 چک‌لیست تحویل پروژه و مدیریت سرور',
    content: `مراحل نهایی استقرار و اطمینان از سلامت سیستم:\n- بررسی پشتیبان‌گیری منظم فایل‌ها در سرور\n- تست کامل نمایش در موبایل و ابعاد کوچک\n- بهینه‌سازی تم دارک و هماهنگی کنتراست رنگ‌های Material 3\n- اعتبارسنجی ورودی‌های کاربر در بازیابی داده‌ها`,
    categoryId: 'cat_work',
    isPinned: true,
    isImportant: false,
    isArchived: false,
    isTrash: false,
    color: 'fog',
    tags: ['پروژه', 'سرور', 'برنامه‌نویسی'],
    checklists: [
      { id: 'w1', text: 'تنظیم روت‌های Express برای ذخیره دائمی', done: true },
      { id: 'w2', text: 'پیاده‌سازی دانلود فایل JSON بک‌آپ', done: true },
      { id: 'w3', text: 'تست بازگردانی (Restore) اطلاعات', done: true },
    ],
    importanceLevel: 'high',
    createdAt: '2025-01-15T18:00:00.000Z',
    updatedAt: '2025-01-16T08:00:00.000Z',
  },
  {
    id: 'note_3',
    title: '⭐ چکیده کتاب اثر مرکب - دارن هاردی',
    content: `«تصمیم‌های کوچک و روزمره شما، سرنوشت نهایی شما را رقم می‌زنند.»\n• فرمول موفقیت: انتخاب‌های کوچک و هوشمندانه + ثبات قدم + زمان = تفاوت‌های بنیادین\n• سیستم ردیابی: هر رفتاری که اندازه بگیرید، کنترلش دست شماست.\n• عادت‌های تکانشگر مثبت را جایگزین توجیه‌ها کنید.`,
    categoryId: 'cat_ideas',
    isPinned: false,
    isImportant: true,
    isArchived: false,
    isTrash: false,
    color: 'mint',
    tags: ['کتاب', 'رشد فردی', 'انگیزه'],
    checklists: [],
    summary: 'موفقیت حاصل ثبات در کارهای کوچک روزمره در بستر زمان است.',
    importanceLevel: 'high',
    createdAt: '2025-01-14T10:00:00.000Z',
    updatedAt: '2025-01-15T10:00:00.000Z',
  },
  {
    id: 'note_4',
    title: '🔑 مشخصات سرور و نکات اضطراری',
    content: `⚠️ این یادداشت حاوی نکات با اهمیت فوق‌العاده بالاست.\n- دسترسی SSH و ریموت به سرور اصلی\n- کلیدهای رمزنگاری پشتیبان‌های محلی\n- پشتیبان‌های گرفته شده به طور خودکار هر هفته در پوشه snapshot ذخیره می‌شوند.`,
    categoryId: 'cat_important',
    isPinned: false,
    isImportant: true,
    isArchived: false,
    isTrash: false,
    color: 'coral',
    tags: ['امنیت', 'سرور', 'رمز'],
    checklists: [],
    importanceLevel: 'critical',
    createdAt: '2025-01-13T10:00:00.000Z',
    updatedAt: '2025-01-13T10:00:00.000Z',
  },
];

interface DBStructure {
  version: number;
  notes: any[];
  categories: any[];
  drafts?: Record<string, any>;
  lastUpdated: string;
}

// Read DB helper
function readDB(): DBStructure {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial: DBStructure = {
        version: 2,
        notes: DEFAULT_NOTES,
        categories: DEFAULT_CATEGORIES,
        drafts: {},
        lastUpdated: new Date().toISOString(),
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (!parsed.drafts) parsed.drafts = {};
    return parsed;
  } catch (err) {
    console.error('Error reading DB:', err);
    return {
      version: 2,
      notes: DEFAULT_NOTES,
      categories: DEFAULT_CATEGORIES,
      drafts: {},
      lastUpdated: new Date().toISOString(),
    };
  }
}

// Write DB helper — atomic write so a crash mid-write can't truncate the database
let dbSyncTimer: any = null;

function writeDB(db: DBStructure): boolean {
  try {
    db.lastUpdated = new Date().toISOString();
    const tmp = `${DB_FILE}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tmp, DB_FILE);

    // Asynchronously sync to Telegram Cloud if enabled
    const tgConfig = getTelegramConfig();
    if (tgConfig.enabled && tgConfig.autoSyncDb && tgConfig.chatId) {
      if (dbSyncTimer) clearTimeout(dbSyncTimer);
      dbSyncTimer = setTimeout(() => {
        syncDbToTelegram(db).catch((err) => {
          console.error('Background Telegram DB sync error:', err.message);
        });
      }, 5000); // 5 seconds debounce
    }

    return true;
  } catch (err) {
    console.error('Error writing DB:', err);
    return false;
  }
}

// ==========================================
// NOTE VALIDATION & NORMALIZATION
// ==========================================

const IMPORTANCE_LEVELS = ['normal', 'high', 'critical'];
const ATTACHMENT_TYPES = ['image', 'video', 'audio', 'document'];
const BLOCK_TYPES = ['paragraph', 'heading', 'quote', 'callout', 'code', 'math', 'divider', 'media', 'checklist', 'table', 'mediaGallery', 'shape'];
const CALLOUT_TONES = ['info', 'success', 'warning', 'danger', 'tip'];

function str(value: any, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function clampText(value: any, max: number, fallback = ''): string {
  const s = str(value, fallback);
  return s.length > max ? s.slice(0, max) : s;
}

function normalizeShape(raw: any, index: number): any {
  if (!raw || typeof raw !== 'object') return null;
  const kind = str(raw.kind, 'rect');
  return {
    id: str(raw.id) || `shp_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
    kind,
    color: clampText(raw.color, 50, '#4A6D22'),
    fillTransparent: Boolean(raw.fillTransparent),
    gradient: Boolean(raw.gradient),
    gradientEndColor: typeof raw.gradientEndColor === 'string' ? clampText(raw.gradientEndColor, 50) : undefined,
    gradientAngle: Number.isFinite(Number(raw.gradientAngle)) ? Number(raw.gradientAngle) : undefined,
    pattern: typeof raw.pattern === 'string' ? clampText(raw.pattern, 50) : undefined,
    patternColor: typeof raw.patternColor === 'string' ? clampText(raw.patternColor, 50) : undefined,
    patternScale: Number.isFinite(Number(raw.patternScale)) ? Number(raw.patternScale) : undefined,
    strokeColor: typeof raw.strokeColor === 'string' ? clampText(raw.strokeColor, 50) : undefined,
    strokeWidth: Number.isFinite(Number(raw.strokeWidth)) ? Number(raw.strokeWidth) : undefined,
    borderStyle: ['solid', 'dashed', 'dotted'].includes(raw.borderStyle) ? raw.borderStyle : undefined,
    radius: Number.isFinite(Number(raw.radius)) ? Number(raw.radius) : undefined,
    opacity: Number.isFinite(Number(raw.opacity)) ? Number(raw.opacity) : undefined,
    width: Number.isFinite(Number(raw.width)) ? Number(raw.width) : undefined,
    height: Number.isFinite(Number(raw.height)) ? Number(raw.height) : undefined,
    aspectLocked: Boolean(raw.aspectLocked),
    rotation: Number.isFinite(Number(raw.rotation)) ? Number(raw.rotation) : undefined,
    zIndex: Number.isFinite(Number(raw.zIndex)) ? Number(raw.zIndex) : undefined,
    align: ['center', 'start', 'end', 'float-right', 'float-left', 'full'].includes(raw.align) ? raw.align : undefined,
    layerPosition: ['inline', 'behind', 'in-front', 'float-left', 'float-right'].includes(raw.layerPosition)
      ? raw.layerPosition
      : undefined,
    posX: Number.isFinite(Number(raw.posX)) ? Number(raw.posX) : undefined,
    posY: Number.isFinite(Number(raw.posY)) ? Number(raw.posY) : undefined,
    text: typeof raw.text === 'string' ? clampText(raw.text, 5000) : undefined,
    textColor: typeof raw.textColor === 'string' ? clampText(raw.textColor, 50) : undefined,
    textSize: Number.isFinite(Number(raw.textSize)) ? Number(raw.textSize) : undefined,
    textBold: Boolean(raw.textBold),
    textAlign: ['center', 'right', 'left'].includes(raw.textAlign) ? raw.textAlign : undefined,
    shadow: Boolean(raw.shadow),
    shadowType: ['none', 'soft', '3d', 'deep', 'glow'].includes(raw.shadowType) ? raw.shadowType : undefined,
    visible: raw.visible !== undefined ? Boolean(raw.visible) : true,
  };
}

function normalizeShapes(raw: any): any[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 100).map((s, i) => normalizeShape(s, i)).filter(Boolean);
}

function normalizeChecklistItems(raw: any): any[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 300).map((item, i) => ({
    id: str(item?.id) || `chk_${Date.now()}_${i}`,
    text: clampText(item?.text, 500),
    done: Boolean(item?.done),
  }));
}

function normalizeBlock(raw: any, index: number): any {
  const type = BLOCK_TYPES.includes(raw?.type) ? raw.type : 'paragraph';
  const block: any = {
    id: str(raw?.id) || `blk_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    text: clampText(raw?.text, 60000),
  };

  if (type === 'heading') {
    const level = Number(raw?.level);
    block.level = level === 1 || level === 2 || level === 3 ? level : 2;
  }
  if (type === 'callout') {
    block.tone = CALLOUT_TONES.includes(raw?.tone) ? raw.tone : 'info';
  }
  if (type === 'code') {
    block.language = clampText(raw?.language, 40, 'text');
  }
  if (type === 'media') {
    block.attachmentId = str(raw?.attachmentId);
    const width = Number(raw?.width);
    if (Number.isFinite(width) && width >= 20 && width <= 100) block.width = Math.round(width);
    block.caption = clampText(raw?.caption, 500);
  }
  if (type === 'checklist') {
    block.items = normalizeChecklistItems(raw?.items);
  }
  if (type === 'table') {
    const rows = Math.max(1, Math.min(50, Number(raw?.table?.rows) || 3));
    const cols = Math.max(1, Math.min(20, Number(raw?.table?.cols) || 3));
    const src = Array.isArray(raw?.table?.cells) ? raw.table.cells : [];
    const cells = Array.from({ length: rows * cols }, (_, i) => ({
      text: clampText(src[i]?.text, 5000),
      color: typeof src[i]?.color === 'string' ? src[i].color.slice(0, 20) : '',
    }));
    block.table = { rows, cols, cells, header: Boolean(raw?.table?.header) };
  }
  if (type === 'mediaGallery') {
    const items = Array.isArray(raw?.gallery?.items) ? raw.gallery.items : [];
    block.gallery = {
      items: items.slice(0, 100).map((it: any) => ({
        attachmentId: str(it?.attachmentId),
        caption: clampText(it?.caption, 500),
      })),
    };
  }

  // Preserve shapes on blocks
  if (Array.isArray(raw?.shapes) && raw.shapes.length > 0) {
    block.shapes = normalizeShapes(raw.shapes);
  } else if (raw?.shape) {
    const s = normalizeShape(raw.shape, 0);
    if (s) {
      block.shapes = [s];
      block.shape = s;
    }
  }

  return block;
}

function normalizeBlocks(raw: any): any[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 500).map(normalizeBlock);
}

function normalizeAttachments(raw: any): any[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 100).map((att, i) => ({
    id: str(att?.id) || `att_${Date.now()}_${i}`,
    name: clampText(att?.name, 300, 'فایل'),
    type: ATTACHMENT_TYPES.includes(att?.type) ? att.type : 'document',
    mimeType: clampText(att?.mimeType, 150, 'application/octet-stream'),
    size: Number.isFinite(Number(att?.size)) ? Math.max(0, Number(att.size)) : 0,
    url: clampText(att?.url, 5_000_000),
    duration: Number.isFinite(Number(att?.duration)) ? Number(att.duration) : undefined,
    position: att?.position === 'top' ? 'top' : att?.position === 'bottom' ? 'bottom' : undefined,
    createdAt: str(att?.createdAt) || new Date().toISOString(),
  }));
}

function normalizeTags(raw: any): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of raw) {
    const clean = clampText(tag, 60).trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= 40) break;
  }
  return out;
}

// Turns a client payload into a persisted note shape. `base` supplies fallbacks on update.
function buildNote(body: any, base?: any): any {
  const now = new Date().toISOString();
  const prev = base || {};

  const blocks = body.blocks !== undefined ? normalizeBlocks(body.blocks) : normalizeBlocks(prev.blocks);
  const checklists =
    body.checklists !== undefined ? normalizeChecklistItems(body.checklists) : normalizeChecklistItems(prev.checklists);

  return {
    id: prev.id || `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: body.title !== undefined ? clampText(body.title, 300) : clampText(prev.title, 300),
    content: body.content !== undefined ? clampText(body.content, 500000) : clampText(prev.content, 500000),
    blocks,
    summary: body.summary !== undefined ? clampText(body.summary, 2000) : clampText(prev.summary, 2000),
    categoryId: body.categoryId !== undefined ? str(body.categoryId) : str(prev.categoryId),
    importanceLevel: IMPORTANCE_LEVELS.includes(body.importanceLevel)
      ? body.importanceLevel
      : IMPORTANCE_LEVELS.includes(prev.importanceLevel)
        ? prev.importanceLevel
        : 'normal',
    color: body.color !== undefined ? clampText(body.color, 40, 'default') : clampText(prev.color, 40, 'default'),
    isPinned: body.isPinned !== undefined ? Boolean(body.isPinned) : Boolean(prev.isPinned),
    isImportant: body.isImportant !== undefined ? Boolean(body.isImportant) : Boolean(prev.isImportant),
    isArchived: body.isArchived !== undefined ? Boolean(body.isArchived) : Boolean(prev.isArchived),
    isTrash: body.isTrash !== undefined ? Boolean(body.isTrash) : Boolean(prev.isTrash),
    tags: body.tags !== undefined ? normalizeTags(body.tags) : normalizeTags(prev.tags),
    checklists,
    attachments: body.attachments !== undefined ? normalizeAttachments(body.attachments) : normalizeAttachments(prev.attachments),
    createdAt: str(prev.createdAt) || now,
    updatedAt: now,
  };
}

// ==========================================
// REVISION HISTORY
// ==========================================

const MAX_REVISIONS_PER_NOTE = 30;

function revisionFileFor(noteId: string): string | null {
  // noteId comes from the URL; refuse anything that isn't a plain slug so it can't escape the directory
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(noteId)) return null;
  return path.join(REVISIONS_DIR, `${noteId}.json`);
}

function readRevisions(noteId: string): any[] {
  const file = revisionFileFor(noteId);
  if (!file || !fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function pushRevision(note: any, reason: string): void {
  const file = revisionFileFor(note.id);
  if (!file) return;
  try {
    const revisions = readRevisions(note.id);
    revisions.unshift({
      revisionId: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      savedAt: new Date().toISOString(),
      reason,
      title: note.title,
      snapshot: note,
    });
    fs.writeFileSync(file, JSON.stringify(revisions.slice(0, MAX_REVISIONS_PER_NOTE), null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write revision:', err);
  }
}

function countWords(note: any): number {
  const fromBlocks = Array.isArray(note.blocks)
    ? note.blocks.map((b: any) => str(b?.text)).join(' ')
    : '';
  return `${str(note.content)} ${fromBlocks}`.trim().split(/\s+/).filter(Boolean).length;
}


// Save snapshot helper
function createSnapshotRecord(db: DBStructure, label = 'خودکار'): any {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `snapshot_${timestamp}.json`;
    const snapshotPath = path.join(SNAPSHOTS_DIR, filename);
    const content = JSON.stringify(
      {
        ...db,
        snapshotMeta: {
          label,
          createdAt: new Date().toISOString(),
        },
      },
      null,
      2
    );
    fs.writeFileSync(snapshotPath, content, 'utf-8');
    const stats = fs.statSync(snapshotPath);
    return {
      id: filename,
      filename,
      label,
      createdAt: new Date().toISOString(),
      notesCount: db.notes.length,
      categoriesCount: db.categories.length,
      sizeBytes: stats.size,
    };
  } catch (e) {
    console.error('Failed to create snapshot file:', e);
    return null;
  }
}

// ==========================================
// API ROUTES
// ==========================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// GET all notes with filters & advanced search
app.get('/api/notes', (req, res) => {
  const db = readDB();
  const {
    category,
    search,
    filter,
    isImportant,
    isPinned,
    tag,
    hasAttachment,
    attachmentType,
    fromDate,
    toDate,
    importanceLevel,
  } = req.query;

  let result = [...db.notes];

  // Trash filter
  if (filter === 'trash') {
    result = result.filter((n) => n.isTrash);
  } else if (filter === 'archive') {
    result = result.filter((n) => !n.isTrash && n.isArchived);
  } else {
    // Normal active view
    result = result.filter((n) => !n.isTrash && !n.isArchived);

    if (filter === 'important' || isImportant === 'true') {
      result = result.filter((n) => n.isImportant || n.importanceLevel === 'critical' || n.importanceLevel === 'high');
    }

    if (filter === 'checklists') {
      result = result.filter((n) => n.checklists && n.checklists.length > 0);
    }

    if (category && category !== 'all') {
      result = result.filter((n) => n.categoryId === category);
    }
  }

  // Tag filter
  if (tag && typeof tag === 'string' && tag.trim() !== '') {
    const targetTag = tag.trim().toLowerCase();
    result = result.filter((n) => n.tags && n.tags.some((t: string) => t.toLowerCase() === targetTag));
  }

  // Importance level filter
  if (importanceLevel && typeof importanceLevel === 'string') {
    result = result.filter((n) => n.importanceLevel === importanceLevel);
  }

  // Attachment filter
  if (hasAttachment === 'true') {
    result = result.filter((n) => Array.isArray(n.attachments) && n.attachments.length > 0);
  }
  if (attachmentType && typeof attachmentType === 'string') {
    result = result.filter((n) => Array.isArray(n.attachments) && n.attachments.some((a: any) => a.type === attachmentType));
  }

  // Date range filter
  if (fromDate && typeof fromDate === 'string') {
    const fromTime = new Date(fromDate).getTime();
    if (!isNaN(fromTime)) {
      result = result.filter((n) => new Date(n.createdAt).getTime() >= fromTime);
    }
  }
  if (toDate && typeof toDate === 'string') {
    const toTime = new Date(toDate).getTime();
    if (!isNaN(toTime)) {
      result = result.filter((n) => new Date(n.createdAt).getTime() <= toTime + 86400000); // end of day
    }
  }

  // Search query filter (searches title, content, summary, tags, and attachment names)
  if (search && typeof search === 'string' && search.trim() !== '') {
    const q = search.trim().toLowerCase();
    result = result.filter(
      (n) =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q)) ||
        (n.summary && n.summary.toLowerCase().includes(q)) ||
        (n.tags && n.tags.some((t: string) => t.toLowerCase().includes(q))) ||
        (n.attachments && n.attachments.some((a: any) => a.name && a.name.toLowerCase().includes(q)))
    );
  }

  // Sort: Pinned first, then newest updated
  result.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
  });

  res.json({ success: true, notes: result, total: result.length });
});

// GET single note
app.get('/api/notes/:id', (req, res) => {
  const db = readDB();
  const note = db.notes.find((n) => n.id === req.params.id);
  if (!note) {
    return res.status(404).json({ success: false, error: 'یادداشت یافت نشد' });
  }
  res.json({ success: true, note });
});

// CREATE note
app.post('/api/notes', (req, res) => {
  const db = readDB();
  const newNote = buildNote(req.body || {});

  db.notes.unshift(newNote);
  if (!writeDB(db)) {
    return res.status(500).json({ success: false, error: 'خطا در ذخیره‌سازی روی سرور' });
  }
  pushRevision(newNote, 'ایجاد اولیه');

  res.status(201).json({ success: true, note: newNote });
});

// UPDATE note
app.put('/api/notes/:id', (req, res) => {
  const db = readDB();
  const index = db.notes.findIndex((n) => n.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'یادداشت یافت نشد' });
  }

  const existing = db.notes[index];
  const updated = buildNote(req.body || {}, existing);

  db.notes[index] = updated;
  if (!writeDB(db)) {
    return res.status(500).json({ success: false, error: 'خطا در ذخیره‌سازی روی سرور' });
  }

  // Only snapshot substantive edits — pin/star/color toggles would otherwise flood the history
  const contentChanged =
    existing.title !== updated.title ||
    existing.content !== updated.content ||
    existing.summary !== updated.summary ||
    JSON.stringify(existing.blocks || []) !== JSON.stringify(updated.blocks || []) ||
    JSON.stringify(existing.checklists || []) !== JSON.stringify(updated.checklists || []);

  if (contentChanged) {
    pushRevision(existing, str(req.body?.revisionReason, 'ویرایش محتوا'));
  }

  res.json({ success: true, note: updated });
});

// REVISION HISTORY for a note
app.get('/api/notes/:id/revisions', (req, res) => {
  const file = revisionFileFor(req.params.id);
  if (!file) return res.status(400).json({ success: false, error: 'شناسه یادداشت نامعتبر است' });

  const revisions = readRevisions(req.params.id).map((r) => ({
    revisionId: r.revisionId,
    savedAt: r.savedAt,
    reason: r.reason,
    title: r.title,
    wordCount: countWords(r.snapshot || {}),
  }));

  res.json({ success: true, revisions });
});

// RESTORE a note to an earlier revision
app.post('/api/notes/:id/revisions/:revisionId/restore', (req, res) => {
  const db = readDB();
  const index = db.notes.findIndex((n) => n.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: 'یادداشت یافت نشد' });

  const revisions = readRevisions(req.params.id);
  const target = revisions.find((r) => r.revisionId === req.params.revisionId);
  if (!target || !target.snapshot) {
    return res.status(404).json({ success: false, error: 'نسخه مورد نظر یافت نشد' });
  }

  const current = db.notes[index];
  pushRevision(current, 'پشتیبان خودکار قبل از بازگردانی نسخه');

  const restored = buildNote(target.snapshot, current);
  db.notes[index] = restored;
  if (!writeDB(db)) {
    return res.status(500).json({ success: false, error: 'خطا در ذخیره‌سازی روی سرور' });
  }

  res.json({ success: true, note: restored });
});

// ==========================================
// DRAFTS (autosave for in-progress editing)
// ==========================================

app.get('/api/drafts/:key', (req, res) => {
  const db = readDB();
  const draft = db.drafts?.[req.params.key] || null;
  res.json({ success: true, draft });
});

app.put('/api/drafts/:key', (req, res) => {
  const db = readDB();
  if (!db.drafts) db.drafts = {};

  // Cap total drafts so an abandoned-editor loop can't grow the DB unbounded
  const keys = Object.keys(db.drafts);
  if (keys.length > 40 && !db.drafts[req.params.key]) {
    const oldest = keys.sort(
      (a, b) => new Date(db.drafts![a]?.savedAt || 0).getTime() - new Date(db.drafts![b]?.savedAt || 0).getTime()
    )[0];
    delete db.drafts[oldest];
  }

  db.drafts[req.params.key] = {
    savedAt: new Date().toISOString(),
    payload: buildNote(req.body || {}),
  };

  if (!writeDB(db)) {
    return res.status(500).json({ success: false, error: 'خطا در ذخیره پیش‌نویس' });
  }
  res.json({ success: true, savedAt: db.drafts[req.params.key].savedAt });
});

app.delete('/api/drafts/:key', (req, res) => {
  const db = readDB();
  if (db.drafts?.[req.params.key]) {
    delete db.drafts[req.params.key];
    writeDB(db);
  }
  res.json({ success: true });
});

// ==========================================
// FILE UPLOADS
// ==========================================

const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/webm': 'weba',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/zip': 'zip',
};

function attachmentTypeForMime(mime: string): string {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'document';
}

// Accepts a base64 data URL and writes it to disk or Telegram Cloud, returning an attachment record
app.post('/api/uploads', async (req, res) => {
  try {
    const { dataUrl, name, duration } = req.body || {};
    if (typeof dataUrl !== 'string') {
      return res.status(400).json({ success: false, error: 'محتوای فایل ارسال نشده است' });
    }

    // Allow optional MIME parameters (e.g. audio/webm;codecs=opus) that
    // MediaRecorder blobs carry and FileReader embeds in the data URL.
    const match = dataUrl.match(/^data:([a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+(?:;[a-zA-Z0-9!#$&^_+=-]+)*);base64,(.+)$/);
    if (!match) {
      return res.status(400).json({ success: false, error: 'قالب فایل ارسالی معتبر نیست' });
    }

    const mimeType = match[1];
    const mimeBase = mimeType.split(';')[0].trim();
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length === 0) {
      return res.status(400).json({ success: false, error: 'فایل خالی است' });
    }

    const tgConfig = getTelegramConfig();

    // If Telegram Cloud Storage is enabled, send directly to Telegram MTProto!
    if (tgConfig.enabled && tgConfig.chatId) {
      try {
        const originalName = clampText(name, 300, 'فایل');
        const tgRes = await uploadFileToTelegram(buffer, originalName, mimeBase);

        const attachment = {
          id: `att_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          name: originalName,
          type: attachmentTypeForMime(mimeBase),
          mimeType: mimeBase,
          size: buffer.length,
          url: `/api/telegram/file/${tgRes.messageId}?filename=${encodeURIComponent(originalName)}`,
          duration: Number.isFinite(Number(duration)) ? Number(duration) : undefined,
          createdAt: new Date().toISOString(),
          storage: 'telegram',
        };

        return res.status(201).json({ success: true, attachment });
      } catch (tgErr: any) {
        console.error('آپلود به تلگرام ناموفق بود، ذخیره در دیسک محلی:', tgErr.message);
      }
    }

    // Fallback to local disk storage
    if (buffer.length > MAX_UPLOAD_BYTES) {
      return res.status(413).json({
        success: false,
        error: `حجم فایل بیش از حد مجاز دیسک محلی است (حداکثر ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} مگابایت). اتصال تلگرام را فعال کنید!`,
      });
    }

    const originalName = clampText(name, 300, 'فایل');
    const extFromName = path.extname(originalName).replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    const ext = EXTENSION_BY_MIME[mimeBase] || extFromName || 'bin';
    const filename = `${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;

    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);

    const attachment = {
      id: `att_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      name: originalName,
      type: attachmentTypeForMime(mimeBase),
      mimeType: mimeBase,
      size: buffer.length,
      url: `/uploads/${filename}`,
      duration: Number.isFinite(Number(duration)) ? Number(duration) : undefined,
      createdAt: new Date().toISOString(),
      storage: 'local',
    };

    res.status(201).json({ success: true, attachment });
  } catch (err: any) {
    console.error('Upload failed:', err);
    res.status(500).json({ success: false, error: 'خطا در ذخیره فایل روی سرور' });
  }
});

// ==========================================
// TELEGRAM CLOUD STORAGE ENDPOINTS
// ==========================================

// Serve stream/buffer for Telegram stored file by message ID
app.get('/api/telegram/file/:messageId', async (req, res) => {
  try {
    const messageId = parseInt(req.params.messageId, 10);
    if (isNaN(messageId)) {
      return res.status(400).json({ success: false, error: 'شناسه پیام نامعتبر است' });
    }

    const { buffer, mimeType } = await downloadFileFromTelegram(messageId);

    if (mimeType) {
      res.setHeader('Content-Type', mimeType);
    }
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache in browser 24h

    res.send(buffer);
  } catch (err: any) {
    console.error('Error serving Telegram file:', err.message);
    res.status(404).json({ success: false, error: 'فایل در ابَر-فضای ابری تلگرام یافت نشد.' });
  }
});

// Get Telegram config
app.get('/api/telegram/config', (req, res) => {
  const config = getTelegramConfig();
  res.json({ success: true, config });
});

// Save Telegram config
app.post('/api/telegram/config', (req, res) => {
  try {
    const current = getTelegramConfig();
    const updated = {
      ...current,
      ...req.body,
      apiId: Number(req.body.apiId) || 0,
    };
    saveTelegramConfig(updated);
    res.json({ success: true, config: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test connection
app.post('/api/telegram/test', async (req, res) => {
  try {
    const cfg = {
      ...getTelegramConfig(),
      ...req.body,
      apiId: Number(req.body.apiId) || 0,
    };
    const result = await testTelegramConnection(cfg);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'خطا در تست اتصال' });
  }
});

// Manual DB Sync to Telegram
app.post('/api/telegram/sync-db', async (req, res) => {
  try {
    const db = readDB();
    const result = await syncDbToTelegram(db);
    res.json({ success: true, message: 'دیتابیس با موفقیت به تلگرام منتقل شد', result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Restore DB from Telegram
app.post('/api/telegram/restore-db', async (req, res) => {
  try {
    const currentDb = readDB();
    createSnapshotRecord(currentDb, 'پشتیبان قبل از بازیابی از تلگرام');

    const { db } = await restoreDbFromTelegram();
    writeDB(db);

    res.json({
      success: true,
      message: 'دیتابیس با موفقیت از تلگرام بازیابی شد.',
      totalNotes: db.notes?.length || 0,
      totalCategories: db.categories?.length || 0,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Migrate local uploaded files to Telegram to free disk space 100%
app.post('/api/telegram/migrate', async (req, res) => {
  try {
    const db = readDB();
    const { migratedCount, freedBytes } = await migrateLocalFilesToTelegram(db, writeDB);

    res.json({
      success: true,
      message: `تعداد ${migratedCount} فایل به تلگرام منتقل شدند و ${Math.round(freedBytes / 1024 / 1024)} مگابایت فضای دیسک آزاد شد!`,
      migratedCount,
      freedBytes,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/uploads/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!/^[A-Za-z0-9_.-]+$/.test(filename)) {
    return res.status(400).json({ success: false, error: 'نام فایل نامعتبر است' });
  }
  const target = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
  }
  res.json({ success: true });
});

// Rewrite the text content of an already-uploaded text file (inline editor).
const TEXT_EXTS = new Set(['.txt', '.md', '.markdown', '.csv', '.json', '.xml', '.log', '.yml', '.yaml', '.js', '.ts', '.jsx', '.tsx', '.css', '.html', '.py', '.sh', '.ini', '.cfg']);
app.put('/api/uploads/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!/^[A-Za-z0-9_.-]+$/.test(filename)) {
    return res.status(400).json({ success: false, error: 'نام فایل نامعتبر است' });
  }
  if (!TEXT_EXTS.has(path.extname(filename).toLowerCase())) {
    return res.status(400).json({ success: false, error: 'فقط فایل‌های متنی قابل ویرایش هستند' });
  }
  const content = req.body?.content;
  if (typeof content !== 'string') {
    return res.status(400).json({ success: false, error: 'محتوای فایل ارسال نشده است' });
  }
  if (content.length > 2_000_000) {
    return res.status(413).json({ success: false, error: 'حجم فایل بیش از حد مجاز است' });
  }
  const target = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(target)) {
    return res.status(404).json({ success: false, error: 'فایل یافت نشد' });
  }
  fs.writeFileSync(target, content, 'utf8');
  res.json({ success: true });
});


// TOGGLE PIN
app.post('/api/notes/:id/toggle-pin', (req, res) => {
  const db = readDB();
  const note = db.notes.find((n) => n.id === req.params.id);
  if (!note) return res.status(404).json({ success: false, error: 'یافت نشد' });

  note.isPinned = !note.isPinned;
  note.updatedAt = new Date().toISOString();
  if (!writeDB(db)) {
    return res.status(500).json({ success: false, error: 'خطا در ذخیره‌سازی' });
  }

  res.json({ success: true, note });
});

// TOGGLE IMPORTANT
app.post('/api/notes/:id/toggle-important', (req, res) => {
  const db = readDB();
  const note = db.notes.find((n) => n.id === req.params.id);
  if (!note) return res.status(404).json({ success: false, error: 'یافت نشد' });

  note.isImportant = !note.isImportant;
  note.updatedAt = new Date().toISOString();
  if (!writeDB(db)) {
    return res.status(500).json({ success: false, error: 'خطا در ذخیره‌سازی' });
  }

  res.json({ success: true, note });
});

// DELETE / TRASH note
app.delete('/api/notes/:id', (req, res) => {
  const db = readDB();
  const { permanent } = req.query;
  const index = db.notes.findIndex((n) => n.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: 'یافت نشد' });

  if (permanent === 'true' || db.notes[index].isTrash) {
    // Permanently remove
    const [deleted] = db.notes.splice(index, 1);
    writeDB(db);
    return res.json({ success: true, message: 'یادداشت برای همیشه حذف شد', deletedId: deleted.id });
  } else {
    // Move to trash
    db.notes[index].isTrash = true;
    db.notes[index].updatedAt = new Date().toISOString();
    writeDB(db);
    return res.json({ success: true, message: 'یادداشت به سطل زباله منتقل شد', note: db.notes[index] });
  }
});

// RESTORE note from trash or archive
app.post('/api/notes/:id/restore', (req, res) => {
  const db = readDB();
  const note = db.notes.find((n) => n.id === req.params.id);
  if (!note) return res.status(404).json({ success: false, error: 'یافت نشد' });

  note.isTrash = false;
  note.isArchived = false;
  note.updatedAt = new Date().toISOString();
  if (!writeDB(db)) {
    return res.status(500).json({ success: false, error: 'خطا در ذخیره‌سازی' });
  }

  res.json({ success: true, note });
});

// EMPTY TRASH
app.delete('/api/trash/empty', (req, res) => {
  const db = readDB();
  const beforeCount = db.notes.length;
  db.notes = db.notes.filter((n) => !n.isTrash);
  const deletedCount = beforeCount - db.notes.length;
  writeDB(db);
  res.json({ success: true, deletedCount });
});

// ==========================================
// CATEGORIES ROUTES
// ==========================================

app.get('/api/categories', (req, res) => {
  const db = readDB();
  res.json({ success: true, categories: db.categories });
});

app.post('/api/categories', (req, res) => {
  const db = readDB();
  const { name, color, icon, description, parentId } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'نام دسته‌بندی الزامی است' });
  }

  // Validate parentId if provided
  let validParentId: string | null = null;
  if (parentId && typeof parentId === 'string' && parentId.trim()) {
    const parentExists = db.categories.some((c) => c.id === parentId.trim());
    if (parentExists) {
      validParentId = parentId.trim();
    }
  }

  const newCat = {
    id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim(),
    color: color || '#1a73e8',
    icon: icon || 'Folder',
    description: description || '',
    parentId: validParentId,
    createdAt: new Date().toISOString(),
  };

  db.categories.push(newCat);
  writeDB(db);

  res.status(201).json({ success: true, category: newCat });
});

app.put('/api/categories/:id', (req, res) => {
  const db = readDB();
  const targetId = req.params.id;
  const index = db.categories.findIndex((c) => c.id === targetId);
  if (index === -1) return res.status(404).json({ success: false, error: 'دسته‌بندی یافت نشد' });

  const { name, color, icon, description, parentId } = req.body;

  // Cycle detection: helper to get all descendants of targetId
  const getDescendantIds = (catId: string): string[] => {
    const directChildren = db.categories.filter((c) => c.parentId === catId).map((c) => c.id);
    return directChildren.reduce<string[]>((acc, childId) => {
      return [...acc, childId, ...getDescendantIds(childId)];
    }, []);
  };

  let newParentId: string | null = db.categories[index].parentId || null;
  if (parentId !== undefined) {
    if (parentId === null || parentId === '' || parentId === 'none') {
      newParentId = null;
    } else if (typeof parentId === 'string') {
      const cleanParentId = parentId.trim();
      if (cleanParentId === targetId) {
        return res.status(400).json({ success: false, error: 'یک دسته‌بندی نمی‌تواند زیرمجموعه خودش باشد' });
      }
      const descendants = getDescendantIds(targetId);
      if (descendants.includes(cleanParentId)) {
        return res.status(400).json({ success: false, error: 'نمی‌توانید دسته را به یکی از زیرمجموعه‌های خودش منتقل کنید' });
      }
      const parentExists = db.categories.some((c) => c.id === cleanParentId);
      if (parentExists) {
        newParentId = cleanParentId;
      }
    }
  }

  db.categories[index] = {
    ...db.categories[index],
    name: name ? name.trim() : db.categories[index].name,
    color: color || db.categories[index].color,
    icon: icon || db.categories[index].icon,
    description: description !== undefined ? description : db.categories[index].description,
    parentId: newParentId,
  };

  writeDB(db);
  res.json({ success: true, category: db.categories[index] });
});

app.delete('/api/categories/:id', (req, res) => {
  const db = readDB();
  const catId = req.params.id;
  const index = db.categories.findIndex((c) => c.id === catId);
  if (index === -1) return res.status(404).json({ success: false, error: 'دسته‌بندی یافت نشد' });

  // Find all recursive descendant category IDs
  const getDescendantIds = (id: string): string[] => {
    const directChildren = db.categories.filter((c) => c.parentId === id).map((c) => c.id);
    return directChildren.reduce<string[]>((acc, childId) => {
      return [...acc, childId, ...getDescendantIds(childId)];
    }, []);
  };

  const allIdsToRemove = new Set<string>([catId, ...getDescendantIds(catId)]);

  // Remove target category and all subcategories
  db.categories = db.categories.filter((c) => !allIdsToRemove.has(c.id));

  // Unset categoryId from associated notes
  db.notes.forEach((n) => {
    if (n.categoryId && allIdsToRemove.has(n.categoryId)) {
      n.categoryId = '';
    }
  });

  writeDB(db);
  res.json({ success: true, message: 'دسته‌بندی و زیرمجموعه‌های آن با موفقیت حذف شدند', removedIds: Array.from(allIdsToRemove) });
});

// ==========================================
// BACKUP & RESTORE & SNAPSHOTS
// ==========================================

// Full JSON Backup Export
app.get('/api/backup', (req, res) => {
  const db = readDB();
  const activeNotes = db.notes.filter((n) => !n.isTrash);
  const importantCount = activeNotes.filter((n) => n.isImportant || n.importanceLevel === 'critical').length;

  // Embed every media file the notes reference (as base64) so a backup/restore
  // is fully self-contained — text alone would lose attachments.
  const media: any[] = [];
  const seen = new Set<string>();
  const addFile = (url: string, type?: string) => {
    if (!url || typeof url !== 'string' || seen.has(url)) return;
    const filename = path.basename(url);
    const full = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(full)) return;
    seen.add(url);
    media.push({
      url,
      filename,
      type: type || 'file',
      dataBase64: fs.readFileSync(full).toString('base64'),
    });
  };
  for (const note of db.notes) {
    for (const a of note.attachments || []) addFile(a.url, a.type);
  }

  const backupData = {
    version: 1,
    app: 'NIVRA',
    exportedAt: new Date().toISOString(),
    stats: {
      totalNotes: db.notes.length,
      activeNotes: activeNotes.length,
      importantCount,
      categoriesCount: db.categories.length,
    },
    notes: db.notes,
    categories: db.categories,
    media,
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=backup_notes_${new Date().toISOString().slice(0, 10)}.json`);
  res.json(backupData);
});

// Full Restore from JSON Payload
app.post('/api/restore', (req, res) => {
  try {
    const { data, mode } = req.body; // mode: 'overwrite' | 'merge'
    if (!data || !Array.isArray(data.notes) || !Array.isArray(data.categories)) {
      return res.status(400).json({ success: false, error: 'فرمت فایل بک‌آپ نامعتبر است.' });
    }

    // Folders may have been removed while the server was running; recreate them
    // before writing the database or restoring media files.
    for (const dir of [DATA_DIR, SNAPSHOTS_DIR, UPLOADS_DIR, REVISIONS_DIR]) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const currentDb = readDB();

    // First create a safety snapshot before restoring
    createSnapshotRecord(currentDb, 'پشتیبان خودکار قبل از بازیابی');

    // Write the embedded media files back into uploads/ so attachment URLs
    // (e.g. /uploads/xxx.pdf) keep resolving after a restore.
    const restoreMedia = () => {
      if (!Array.isArray(data.media)) return;
      for (const m of data.media) {
        if (!m || !m.filename || !m.dataBase64) continue;
        const full = path.join(UPLOADS_DIR, path.basename(m.filename));
        try {
          fs.writeFileSync(full, Buffer.from(m.dataBase64, 'base64'));
        } catch (e: any) {
          console.error('بازیابی رسانه ناموفق بود:', m.filename, e);
        }
      }
    };

    if (mode === 'merge') {
      // Merge categories
      const existingCatIds = new Set(currentDb.categories.map((c) => c.id));
      for (const cat of data.categories) {
        if (!existingCatIds.has(cat.id)) {
          currentDb.categories.push(cat);
        }
      }

      // Merge notes
      const existingNoteIds = new Set(currentDb.notes.map((n) => n.id));
      for (const note of data.notes) {
        if (!existingNoteIds.has(note.id)) {
          currentDb.notes.push(note);
        }
      }
      writeDB(currentDb);
      restoreMedia();
      return res.json({
        success: true,
        message: 'اطلاعات با موفقیت ادغام و بازگردانی شدند.',
        totalNotes: currentDb.notes.length,
        totalCategories: currentDb.categories.length,
      });
    } else {
      // Overwrite mode
      const newDb: DBStructure = {
        version: 1,
        notes: data.notes,
        categories: data.categories,
        lastUpdated: new Date().toISOString(),
      };
      writeDB(newDb);
      restoreMedia();
      return res.json({
        success: true,
        message: 'تمام اطلاعات با موفقیت با نسخه پشتیبان جایگزین شدند.',
        totalNotes: newDb.notes.length,
        totalCategories: newDb.categories.length,
      });
    }
  } catch (err: any) {
    console.error('Error during restore:', err);
    res.status(500).json({ success: false, error: 'خطا در بازیابی اطلاعات: ' + err.message });
  }
});

// Snapshots List
app.get('/api/snapshots', (req, res) => {
  try {
    const files = fs.readdirSync(SNAPSHOTS_DIR).filter((f) => f.endsWith('.json'));
    const snapshots: any[] = [];

    for (const file of files) {
      try {
        const fullPath = path.join(SNAPSHOTS_DIR, file);
        const stats = fs.statSync(fullPath);
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        snapshots.push({
          id: file,
          filename: file,
          label: content?.snapshotMeta?.label || 'پشتیبان سرور',
          createdAt: content?.snapshotMeta?.createdAt || stats.mtime.toISOString(),
          notesCount: Array.isArray(content.notes) ? content.notes.length : 0,
          categoriesCount: Array.isArray(content.categories) ? content.categories.length : 0,
          sizeBytes: stats.size,
        });
      } catch (e) {
        // ignore broken snapshot
      }
    }

    snapshots.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ success: true, snapshots });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create manual snapshot
app.post('/api/snapshots/create', (req, res) => {
  const db = readDB();
  const label = req.body?.label || 'پشتیبان دستی سرور';
  const snapshot = createSnapshotRecord(db, label);
  if (!snapshot) {
    return res.status(500).json({ success: false, error: 'خطا در ایجاد نقطه پشتیبان' });
  }
  res.status(201).json({ success: true, snapshot });
});

// Restore from snapshot
app.post('/api/snapshots/restore/:id', (req, res) => {
  try {
    const filename = path.basename(req.params.id);
    if (!filename.endsWith('.json') || filename.includes('..')) {
      return res.status(400).json({ success: false, error: 'نام فایل نامعتبر است' });
    }
    const snapshotPath = path.join(SNAPSHOTS_DIR, filename);
    if (!fs.existsSync(snapshotPath)) {
      return res.status(404).json({ success: false, error: 'فایل پشتیبان مورد نظر یافت نشد' });
    }

    const currentDb = readDB();
    createSnapshotRecord(currentDb, 'پشتیبان ایمنی قبل از بازگردانی اسنپ‌شات');

    const content = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
    if (!content.notes || !content.categories) {
      return res.status(400).json({ success: false, error: 'محتوای فایل اسنپ‌شات معتبر نیست' });
    }

    const newDb: DBStructure = {
      version: 1,
      notes: content.notes,
      categories: content.categories,
      lastUpdated: new Date().toISOString(),
    };
    writeDB(newDb);

    res.json({
      success: true,
      message: 'نسخه با موفقیت بازگردانی شد.',
      totalNotes: newDb.notes.length,
      totalCategories: newDb.categories.length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete snapshot
app.delete('/api/snapshots/:id', (req, res) => {
  try {
    const filename = path.basename(req.params.id);
    if (!filename.endsWith('.json') || filename.includes('..')) {
      return res.status(400).json({ success: false, error: 'نام فایل نامعتبر است' });
    }
    const snapshotPath = path.join(SNAPSHOTS_DIR, filename);
    if (!fs.existsSync(snapshotPath)) {
      return res.status(404).json({ success: false, error: 'اسنپ‌شات مورد نظر یافت نشد' });
    }
    fs.unlinkSync(snapshotPath);
    res.json({ success: true, message: 'اسنپ‌شات با موفقیت حذف شد' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Stats
app.get('/api/stats', (req, res) => {
  const db = readDB();
  const activeNotes = db.notes.filter((n) => !n.isTrash && !n.isArchived);
  const importantCount = activeNotes.filter((n) => n.isImportant || n.importanceLevel === 'critical' || n.importanceLevel === 'high').length;
  const pinnedCount = activeNotes.filter((n) => n.isPinned).length;
  const trashCount = db.notes.filter((n) => n.isTrash).length;
  const totalWords = activeNotes.reduce((acc, note) => acc + countWords(note), 0);

  res.json({
    success: true,
    stats: {
      totalActiveNotes: activeNotes.length,
      importantNotes: importantCount,
      pinnedNotes: pinnedCount,
      trashNotes: trashCount,
      categoriesCount: db.categories.length,
      totalWords,
      lastUpdated: db.lastUpdated,
    },
  });
});

// ==========================================
// VITE MIDDLEWARE & SERVER STARTUP
// ==========================================

async function startServer() {
  // Uploaded media is served straight from disk; long cache is safe because filenames are content-unique
  app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '30d', index: false }));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
