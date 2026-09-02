import { CheckCircle2, Info, Lightbulb, LucideIcon, OctagonX, TriangleAlert } from 'lucide-react';
import { CalloutTone, ChecklistItem, Note, NoteAttachment, NoteBlock, ShapeConfig, ShapeKind, TableCell, TableData } from '../types';

let counter = 0;
export const uid = (prefix: string) => {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`;
};

export const createShapeConfig = (kind: ShapeKind = 'rect', overrides: Partial<ShapeConfig> = {}): ShapeConfig => {
  const isTextbox = kind === 'textbox';
  return {
    id: uid('shp'),
    kind,
    color: isTextbox ? '#FAF9F5' : '#4A6D22',
    fillTransparent: false,
    gradient: false,
    gradientEndColor: '#88B04B',
    gradientAngle: 135,
    strokeColor: isTextbox ? '#4A6D22' : '#365314',
    strokeWidth: isTextbox ? 1.5 : 2,
    borderStyle: 'solid',
    radius: isTextbox ? 8 : 12,
    opacity: 0.98,
    width: isTextbox ? 240 : 220,
    height: isTextbox ? 85 : 110,
    aspectLocked: false,
    rotation: 0,
    align: 'center',
    layerPosition: isTextbox ? 'in-front' : 'inline',
    text: isTextbox ? 'متن خود را اینجا بنویسید...' : '',
    textColor: isTextbox ? '#1A1C16' : '#FFFFFF',
    textSize: isTextbox ? 14 : 13,
    textBold: false,
    textAlign: isTextbox ? 'right' : 'center',
    shadow: true,
    shadowType: 'soft',
    visible: true,
    ...overrides,
  };
};

export const getBlockShapes = (block: NoteBlock): ShapeConfig[] => {
  if (Array.isArray(block.shapes) && block.shapes.length > 0) {
    return block.shapes.map((s, i) => (s.id ? s : { ...s, id: `shp_${block.id}_${i}` }));
  }
  if (block.shape) {
    return [block.shape.id ? block.shape : { ...block.shape, id: `shp_${block.id}_0` }];
  }
  return [];
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
  if (type === 'shape') block.shape = createShapeConfig('rect');
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
      const url = media[3].replace(/\|\d+px$/, '');
      const known = byUrl.get(url);
      blocks.push(createBlock('media', { attachmentId: known?.id, text: url, caption: media[2] || '' }));
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

  const blocks = parseLegacyContent(note.content || '', note.attachments || []);

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
      const shapes = getBlockShapes(block);
      const shapeTexts = shapes.map((s) => s.text?.trim() || '').filter(Boolean).join(' ');

      let baseText = '';
      switch (block.type) {
        case 'divider':
          baseText = '';
          break;
        case 'media':
          baseText = block.caption || '';
          break;
        case 'checklist':
          baseText = (block.items || [])
            .filter((item) => item.text.trim() !== '')
            .map((item) => `${item.done ? '[x]' : '[ ]'} ${item.text}`)
            .join('\n');
          break;
        case 'math':
          baseText = block.text.trim() ? `$$${block.text}$$` : '';
          break;
        case 'table':
          baseText = (block.table?.cells || [])
            .filter((c) => c.text.trim() !== '')
            .map((c) => c.text.trim())
            .join(' | ');
          break;
        case 'mediaGallery':
          baseText = (block.gallery?.items || [])
            .map((it) => it.caption || '')
            .filter((c) => c.trim() !== '')
            .join(' ');
          break;
        case 'shape':
          baseText = shapeTexts;
          break;
        default:
          baseText = block.text;
      }

      if (shapeTexts && block.type !== 'shape') {
        return [baseText, shapeTexts].filter(Boolean).join(' ');
      }
      return baseText;
    })
    .filter((line) => line.trim() !== '')
    .join('\n\n');

export const countBlockWords = (blocks: NoteBlock[]): number => {
  const text = blocks
    .map((b) => {
      const shapes = getBlockShapes(b);
      const shapeTexts = shapes.map((s) => s.text?.trim() || '').filter(Boolean).join(' ');
      const blockContent = b.type === 'checklist' ? (b.items || []).map((i) => i.text).join(' ') : b.text;
      return [blockContent, shapeTexts].filter(Boolean).join(' ');
    })
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
      const hasShapes = (block.shapes && block.shapes.length > 0) || Boolean(block.shape);
      if (hasShapes) return true;
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
  shape: 'شکل',
};

export const CALLOUT_STYLES: Record<CalloutTone, { label: string; icon: LucideIcon; light: string; dark: string; text: string }> = {
  info: {
    label: 'توضیح',
    icon: Info,
    light: 'bg-[#E3EDF2] border-[#C4DCE5]',
    dark: 'dark:bg-[#1E2B33] dark:border-[#344B57]',
    text: 'text-[#36667F] dark:text-[#A8D3E6]',
  },
  success: {
    label: 'درست',
    icon: CheckCircle2,
    light: 'bg-[#E3F2E7] border-[#BFE0C8]',
    dark: 'dark:bg-[#1C2E22] dark:border-[#2C4D37]',
    text: 'text-[#26693D] dark:text-[#9FD6B0]',
  },
  warning: {
    label: 'هشدار',
    icon: TriangleAlert,
    light: 'bg-[#FAF2DE] border-[#EFE1B8]',
    dark: 'dark:bg-[#332A18] dark:border-[#574728]',
    text: 'text-[#8B6814] dark:text-[#FFE086]',
  },
  danger: {
    label: 'خطر',
    icon: OctagonX,
    light: 'bg-[#FCEAE8] border-[#F2C5C1]',
    dark: 'dark:bg-[#3B2526] dark:border-[#5E3638]',
    text: 'text-[#A34648] dark:text-[#FFAB91]',
  },
  tip: {
    label: 'نکته طلایی',
    icon: Lightbulb,
    light: 'bg-[#EDF5E0] border-[#D0E8B2]',
    dark: 'dark:bg-[#232F1A] dark:border-[#3D522C]',
    text: 'text-[#4A6D22] dark:text-[#D0E8B2]',
  },
};
