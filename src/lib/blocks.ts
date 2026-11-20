import { CheckCircle2, Info, Lightbulb, LucideIcon, OctagonX, TriangleAlert } from 'lucide-react';
import { CalloutTone, ChecklistItem, Note, NoteAttachment, NoteBlock, TableCell, TableData } from '../types';

let counter = 0;
export const uid = (prefix: string) => {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
};

export const createBlock = (type: NoteBlock['type'], overrides: Partial<NoteBlock> = {}): NoteBlock => {
  const block: NoteBlock = { id: uid('blk'), type, text: '' };
  if (type === 'heading') block.level = 2;
  if (type === 'callout') block.tone = 'info';
  if (type === 'code') block.language = 'text';
  if (type === 'media') block.width = 100;
  if (type === 'checklist') block.items = [{ id: uid('chk'), text: '', done: false }];
  if (type === 'table') block.table = createTableData(3, 3);
  if (type === 'mediaGallery') block.gallery = { items: [] };
  return { ...block, ...overrides };
};

export const createChecklistItem = (text = ''): ChecklistItem => ({ id: uid('chk'), text, done: false });

export const tableCell = (text = ''): TableCell => ({ text, color: '' });

export const createTableData = (rows = 3, cols = 3): TableData => ({
  rows,
  cols,
  cells: Array.from({ length: rows * cols }, () => tableCell()),
  header: false,
});

// Resize keeping existing values aligned to their original grid position.
export const reshapeTableData = (data: TableData, newRows: number, newCols: number): TableData => {
  newRows = Math.max(1, Math.min(50, Math.floor(newRows)));
  newCols = Math.max(1, Math.min(20, Math.floor(newCols)));
  const cells: TableCell[] = [];
  for (let r = 0; r < newRows; r++) {
    for (let c = 0; c < newCols; c++) {
      const old = r < data.rows && c < data.cols ? data.cells[r * data.cols + c] : undefined;
      cells.push(old ? { ...old } : tableCell());
    }
  }
  return { rows: newRows, cols: newCols, cells, header: data.header };
};

const MEDIA_LINE = /^(!|🎬|🎙️|📄)\[(.*?)\]\((.+?)\)$/;

// Legacy notes stored everything as one markdown-ish string. Convert once so the
// editor and viewer only ever deal with blocks.
export const parseLegacyContent = (content: string, attachments: NoteAttachment[] = []): NoteBlock[] => {
  const blocks: NoteBlock[] = [];
  const byUrl = new Map(attachments.map((a) => [a.url.replace(/\|\d+px$/, ''), a]));
  let paragraph: string[] = [];

  const flush = () => {
    const text = paragraph.join('\n').trim();
    if (text) blocks.push(createBlock('paragraph', { text }));
    paragraph = [];
  };

  for (const rawLine of (content || '').split('\n')) {
    const line = rawLine.trim();

    const media = line.match(MEDIA_LINE);
    if (media) {
      flush();
      const marker = media[1];
      const caption = media[2] || '';
      const url = media[3].replace(/\|\d+px$/, '');
      let known = byUrl.get(url);
      if (!known) {
        const isAudio = marker === '🎙️' || url.startsWith('data:audio') || /\.(mp3|wav|ogg|m4a|webm|aac)(\?.*)?$/i.test(url);
        const isVideo = marker === '🎬' || url.startsWith('data:video') || /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(url);
        const isImage = marker === '!' || url.startsWith('data:image') || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url);
        known = {
          id: uid('att'),
          name: caption || (isAudio ? 'ویس ضبط‌شده' : isVideo ? 'ویدیو' : isImage ? 'تصویر' : 'فایل پیوست'),
          type: isAudio ? 'audio' : isVideo ? 'video' : isImage ? 'image' : 'document',
          mimeType: isAudio ? 'audio/webm' : '',
          size: 0,
          url,
          position: 'bottom',
          createdAt: new Date().toISOString(),
        };
        attachments.push(known);
        byUrl.set(url, known);
      }
      blocks.push(createBlock('media', { attachmentId: known.id, text: url, caption }));
      continue;
    }

    if (/^\$\$[\s\S]*\$\$$/.test(line)) {
      flush();
      blocks.push(createBlock('math', { text: line.replace(/^\$\$|\$\$$/g, '').trim() }));
      continue;
    }

    if (/^#{1,3}\s/.test(line)) {
      flush();
      const level = (line.match(/^#+/)?.[0].length || 2) as 1 | 2 | 3;
      blocks.push(createBlock('heading', { level, text: line.replace(/^#{1,3}\s*/, '') }));
      continue;
    }

    if (/^>\s?/.test(line)) {
      flush();
      blocks.push(createBlock('quote', { text: line.replace(/^>\s?/, '') }));
      continue;
    }

    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line)) {
      flush();
      blocks.push(createBlock('divider'));
      continue;
    }

    if (line === '') {
      flush();
      continue;
    }

    paragraph.push(rawLine);
  }
  flush();

  return blocks;
};

// Guarantees a note has a usable block list, migrating old records on the fly.
export const ensureBlocks = (note: Note): NoteBlock[] => {
  if (Array.isArray(note.blocks) && note.blocks.length > 0) return note.blocks;

  if (!note.attachments) {
    note.attachments = [];
  }
  const blocks = parseLegacyContent(note.content || '', note.attachments);

  const referenced = new Set(blocks.filter((b) => b.type === 'media').map((b) => b.attachmentId));
  for (const att of note.attachments || []) {
    if (!referenced.has(att.id)) {
      const media = createBlock('media', { attachmentId: att.id, text: att.url, caption: att.name });
      if (att.position === 'top') blocks.unshift(media);
      else blocks.push(media);
    }
  }

  if (Array.isArray(note.checklists) && note.checklists.length > 0) {
    blocks.push(createBlock('checklist', { items: note.checklists }));
  }

  return blocks;
};

// Same as ensureBlocks but never returns an empty list — the editor always needs
// at least one block to put the caret in.
export const ensureEditableBlocks = (note: Note): NoteBlock[] => {
  const blocks = ensureBlocks(note);
  return blocks.length > 0 ? blocks : [createBlock('paragraph')];
};

// Plain-text mirror kept on note.content so server-side search keeps working.
// Empty blocks contribute nothing, so placeholder markers never pollute search.
export const blocksToPlainText = (blocks: NoteBlock[]): string =>
  blocks
    .map((block) => {
      switch (block.type) {
        case 'divider':
          return '';
        case 'media':
          return block.caption || '';
        case 'checklist':
          return (block.items || [])
            .filter((item) => item.text.trim() !== '')
            .map((item) => `${item.done ? '[x]' : '[ ]'} ${item.text}`)
            .join('\n');
        case 'math':
          return block.text.trim() ? `$$${block.text}$$` : '';
        case 'table':
          return (block.table?.cells || [])
            .filter((c) => c.text.trim() !== '')
            .map((c) => c.text.trim())
            .join(' | ');
        case 'mediaGallery':
          return (block.gallery?.items || [])
            .map((it) => it.caption || '')
            .filter((c) => c.trim() !== '')
            .join(' ');
        default:
          return block.text;
      }
    })
    .filter((line) => line.trim() !== '')
    .join('\n\n');

export const countBlockWords = (blocks: NoteBlock[]): number => {
  const text = blocks
    .map((b) => (b.type === 'checklist' ? (b.items || []).map((i) => i.text).join(' ') : b.text))
    .join(' ');
  return text.trim().split(/\s+/).filter(Boolean).length;
};

// Drops the placeholder blocks the editor leaves behind so they aren't persisted.
export const pruneEmptyBlocks = (blocks: NoteBlock[]): NoteBlock[] =>
  blocks
    .map((block) =>
      block.type === 'checklist'
        ? { ...block, items: (block.items || []).filter((item) => item.text.trim() !== '') }
        : block
    )
    .filter((block) => {
      if (block.type === 'divider') return true;
      if (block.type === 'media') return Boolean(block.attachmentId);
      if (block.type === 'checklist') return (block.items || []).length > 0;
      if (block.type === 'table') return (block.table?.cells || []).some((c) => c.text.trim() !== '');
      if (block.type === 'mediaGallery') return (block.gallery?.items || []).length > 0;
      return block.text.trim() !== '';
    });

// Attachments actually referenced by media blocks, so removing a block drops its file too.
export const usedAttachments = (blocks: NoteBlock[], attachments: NoteAttachment[]): NoteAttachment[] => {
  const ids = new Set(blocks.filter((b) => b.type === 'media' && b.attachmentId).map((b) => b.attachmentId));
  return attachments.filter((a) => ids.has(a.id));
};

export const BLOCK_LABELS: Record<NoteBlock['type'], string> = {
  paragraph: 'متن',
  heading: 'تیتر',
  quote: 'نقل قول',
  callout: 'کادر تأکید',
  code: 'کد',
  math: 'فرمول ریاضی',
  divider: 'جداکننده',
  media: 'رسانه',
  checklist: 'چک‌لیست',
  table: 'جدول',
  mediaGallery: 'گالری رسانه',
};

export const CALLOUT_STYLES: Record<CalloutTone, { label: string; icon: LucideIcon; light: string; dark: string; text: string }> = {
  info: {
    label: 'توضیح',
    icon: Info,
    light: 'bg-[#E3EDF2] border-[#A8CBD9]',
    dark: 'dark:bg-[#1E2B33] dark:border-[#344B57]',
    text: 'text-[#194459] dark:text-[#CBE6F3]',
  },
  success: {
    label: 'درست',
    icon: CheckCircle2,
    light: 'bg-[#E3F2E7] border-[#A3D6B0]',
    dark: 'dark:bg-[#1C2E22] dark:border-[#2C4D37]',
    text: 'text-[#164D29] dark:text-[#BCEAD0]',
  },
  warning: {
    label: 'هشدار',
    icon: TriangleAlert,
    light: 'bg-[#FAF2DE] border-[#E8D497]',
    dark: 'dark:bg-[#332A18] dark:border-[#574728]',
    text: 'text-[#684C07] dark:text-[#FFE394]',
  },
  danger: {
    label: 'خطر',
    icon: OctagonX,
    light: 'bg-[#FCEAE8] border-[#E8A5A0]',
    dark: 'dark:bg-[#3B2526] dark:border-[#5E3638]',
    text: 'text-[#872325] dark:text-[#FFBDB0]',
  },
  tip: {
    label: 'نکته طلایی',
    icon: Lightbulb,
    light: 'bg-[#EDF5E0] border-[#B9DC92]',
    dark: 'dark:bg-[#232F1A] dark:border-[#3D522C]',
    text: 'text-[#2D550A] dark:text-[#DCF0C4]',
  },
};
