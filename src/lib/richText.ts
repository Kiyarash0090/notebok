import { preprocessLatex, renderKatexSafe } from '../components/MathRenderer';

export type HighlightColorId = 'yellow' | 'green' | 'blue' | 'pink';

export const HIGHLIGHT_COLORS: Record<
  HighlightColorId,
  {
    id: HighlightColorId;
    label: string;
    swatch: string;
    className: string;
    printBg: string;
    printText: string;
    printBorder: string;
  }
> = {
  yellow: {
    id: 'yellow',
    label: 'زرد',
    swatch: '#FEF08A',
    className:
      'px-1 py-0.5 rounded bg-[#FEF08A] dark:bg-[#EAB308]/40 text-[#1A1C16] dark:text-[#FEF9C3] font-semibold border border-[#FACC15]/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
    printBg: '#FEF08A',
    printText: '#1A1C16',
    printBorder: '#FACC15',
  },
  green: {
    id: 'green',
    label: 'سبز',
    swatch: '#BBF7D0',
    className:
      'px-1 py-0.5 rounded bg-[#BBF7D0] dark:bg-[#16A34A]/35 text-[#14532D] dark:text-[#DCFCE7] font-semibold border border-[#4ADE80]/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
    printBg: '#BBF7D0',
    printText: '#14532D',
    printBorder: '#4ADE80',
  },
  blue: {
    id: 'blue',
    label: 'آبی',
    swatch: '#BAE6FD',
    className:
      'px-1 py-0.5 rounded bg-[#BAE6FD] dark:bg-[#0284C7]/35 text-[#0C4A6E] dark:text-[#E0F2FE] font-semibold border border-[#38BDF8]/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
    printBg: '#BAE6FD',
    printText: '#0C4A6E',
    printBorder: '#38BDF8',
  },
  pink: {
    id: 'pink',
    label: 'صورتی',
    swatch: '#FBCFE8',
    className:
      'px-1 py-0.5 rounded bg-[#FBCFE8] dark:bg-[#DB2777]/35 text-[#831843] dark:text-[#FCE7F3] font-semibold border border-[#F472B6]/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)]',
    printBg: '#FBCFE8',
    printText: '#831843',
    printBorder: '#F472B6',
  },
};

export const HIGHLIGHT_COLOR_LIST: HighlightColorId[] = ['yellow', 'green', 'blue', 'pink'];

export function getHighlightColorConfig(color?: string | null) {
  if (color && color in HIGHLIGHT_COLORS) {
    return HIGHLIGHT_COLORS[color as HighlightColorId];
  }
  return HIGHLIGHT_COLORS.yellow;
}

export const RICH_MARK_CLASSES = {
  highlight: HIGHLIGHT_COLORS.yellow.className,
  bold: 'font-bold text-[#1A1C16] dark:text-[#E2E3DC]',
  italic: 'italic',
  underline: 'underline underline-offset-2 decoration-[#4A6D22] dark:decoration-[#D0E8B2]',
  strike: 'line-through text-[#8F9285] dark:text-[#A8AC9F]',
  code:
    'px-1.5 py-0.5 rounded-md bg-[#F1F5F9] dark:bg-[#1E293B] text-[#0F172A] dark:text-[#E2E8F0] border border-[#CBD5E1] dark:border-[#475569] font-mono text-[0.88em] shadow-[0_1px_1px_rgba(0,0,0,0.03)]',
  mathChip:
    'rich-math-chip inline-flex items-center align-middle mx-0.5 px-1.5 py-0.5 rounded-lg bg-[#FAF2DE]/70 dark:bg-[#332A18]/80 hover:bg-[#FAF2DE] dark:hover:bg-[#332A18] border border-[#E8D497]/70 dark:border-[#574728] cursor-pointer select-none transition-colors',
  mathBlockChip:
    'rich-math-chip rich-math-block flex justify-center items-center my-1.5 p-2.5 rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/[0.08] dark:hover:bg-white/[0.08] border border-[#E1E4D5] dark:border-[#43493E] cursor-pointer select-none transition-colors overflow-x-auto',
} as const;

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str: string): string {
  return escapeHtml(str);
}

export function renderLatexToChipHtml(rawToken: string, displayMode = false): string {
  let inner = rawToken.trim();
  if (inner.startsWith('$$') && inner.endsWith('$$')) {
    inner = inner.slice(2, -2).trim();
    displayMode = true;
  } else if (inner.startsWith('\\[') && inner.endsWith('\\]')) {
    inner = inner.slice(2, -2).trim();
    displayMode = true;
  } else if (inner.startsWith('$') && inner.endsWith('$')) {
    inner = inner.slice(1, -1).trim();
  } else if (inner.startsWith('\\(') && inner.endsWith('\\)')) {
    inner = inner.slice(2, -2).trim();
  }

  const processed = preprocessLatex(inner);
  let rendered = '';
  try {
    rendered = renderKatexSafe(processed, displayMode);
  } catch {
    rendered = `<code class="text-xs text-red-500">${escapeHtml(rawToken)}</code>`;
  }

  const cls = displayMode ? RICH_MARK_CLASSES.mathBlockChip : RICH_MARK_CLASSES.mathChip;
  return `<span contenteditable="false" data-latex="${escapeAttr(rawToken)}" data-display="${displayMode ? '1' : '0'}" dir="ltr" style="unicode-bidi:isolate" class="${cls}" title="برای ویرایش فرمول کلیک کنید">${rendered}</span>`;
}

// Same atomic & emphasis patterns as blocks/InlineText.tsx so rendering is 100% consistent
const ATOMIC_PATTERN_MATH =
  '(`[^`\\n]+`)' +
  '|(\\$\\$[\\s\\S]*?\\$\\$)' +
  '|(\\\\[\\x5B\\x5D][\\s\\S]*?\\\\[\\x5B\\x5D])' +
  '|(\\$[^$\\n]+\\$)' +
  '|(\\\\[\\x28\\x29][\\s\\S]*?\\\\[\\x28\\x29])' +
  '|(\\\\begin\\{[a-zA-Z0-9_*]+\\}[\\s\\S]*?\\\\end\\{[a-zA-Z0-9_*]+\\})' +
  '|((?:(?:\\d+[\\.\\,]?\\d*\\s*)?\\\\[a-zA-Z]+(?:\\{[^\\}\\n]*\\}|\\[[^\\]\\n]*\\])*(?:\\s*(?:[\\+\\-\\*/=\\>\\<]|\\\\(?:rightarrow|leftarrow|Rightarrow|Leftarrow|to|times|div|le|ge|ne|approx|in|cdot)\\b|\\rightarrow|\\leftarrow|\\&)\\s*(?:\\d+[\\.\\,]?\\d*\\s*)?(?:\\\\[a-zA-Z]+(?:\\{[^\\}\\n]*\\}|\\[[^\\]\\n]*\\])*|[a-zA-Z0-9]+))*)+)' +
  '|(<mark(?:\\s+data-color="[a-z]+")?>[\\s\\S]*?<\\/mark>)' +
  '|(<code>[\\s\\S]*?<\\/code>)' +
  '|(<u>[\\s\\S]*?<\\/u>)' +
  '|(<del>[\\s\\S]*?<\\/del>)' +
  '|(<s>[\\s\\S]*?<\\/s>)';

const PAIR1_PATTERN = '(\\*\\*\\*|\\*\\*|~~|__|==)([^\\n]+?)\\1';
const PAIR2_STAR_PATTERN = '(\\*)([^\\n*]+?)\\1';
const PAIR2_UNDER_PATTERN = '(_)([^\\n_]+?)\\1';
const PLACEHOLDER_SPLIT = /(\uE000\d+\uE001)/g;

const scanPairsHtml = (
  text: string,
  pattern: string,
  render: (marker: string, inner: string) => string,
  store: string[]
): string => {
  const re = new RegExp(pattern, 'g');
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out += text.slice(last, m.index);
    const idx = store.push(render(m[1], m[2])) - 1;
    out += `\uE000${idx}\uE001`;
    last = re.lastIndex;
  }
  return out + text.slice(last);
};

const materializeHtml = (text: string, store: string[]): string =>
  text
    .split(PLACEHOLDER_SPLIT)
    .map((part) => {
      const ph = part.match(/^\uE000(\d+)\uE001$/);
      if (ph) return store[Number(ph[1])];
      return escapeHtml(part);
    })
    .join('');

function renderEmphasisHtml(text: string): string {
  const store: string[] = [];
  let work = scanPairsHtml(
    text,
    PAIR1_PATTERN,
    (marker, inner) => {
      const innerHtml = renderEmphasisHtml(inner);
      if (marker === '~~') {
        return `<del class="${RICH_MARK_CLASSES.strike}">${innerHtml}</del>`;
      }
      if (marker === '==') {
        return `<mark data-mark="highlight" data-color="yellow" class="${HIGHLIGHT_COLORS.yellow.className}">${innerHtml}</mark>`;
      }
      if (marker === '__') {
        return `<u class="${RICH_MARK_CLASSES.underline}">${innerHtml}</u>`;
      }
      if (marker === '***') {
        return `<strong class="${RICH_MARK_CLASSES.bold}"><em class="${RICH_MARK_CLASSES.italic}">${innerHtml}</em></strong>`;
      }
      return `<strong class="${RICH_MARK_CLASSES.bold}">${innerHtml}</strong>`;
    },
    store
  );

  work = scanPairsHtml(
    work,
    PAIR2_STAR_PATTERN,
    (_marker, inner) => `<em class="${RICH_MARK_CLASSES.italic}">${materializeHtml(inner, store)}</em>`,
    store
  );

  work = scanPairsHtml(
    work,
    PAIR2_UNDER_PATTERN,
    (_marker, inner) => `<em class="${RICH_MARK_CLASSES.italic}">${materializeHtml(inner, store)}</em>`,
    store
  );

  return materializeHtml(work, store);
}

export function markdownToEditorHtml(text: string, renderMath = true): string {
  if (!text) return '';

  const lines = text.split('\n');
  const htmlLines = lines.map((line) => {
    if (!line) return '';

    const trimmedLine = line.trim();
    const isPureDisplayBlock =
      (trimmedLine.startsWith('$$') && trimmedLine.endsWith('$$')) ||
      (trimmedLine.startsWith('\\[') && trimmedLine.endsWith('\\]')) ||
      (trimmedLine.startsWith('\\begin{') && trimmedLine.endsWith('}'));

    if (renderMath && isPureDisplayBlock) {
      return renderLatexToChipHtml(trimmedLine, true);
    }

    if (!renderMath) {
      return escapeHtml(line);
    }

    const re = new RegExp(ATOMIC_PATTERN_MATH, 'g');
    let out = '';
    let lastIndex = 0;
    let m: RegExpExecArray | null;

    while ((m = re.exec(line)) !== null) {
      if (m.index > lastIndex) {
        out += renderEmphasisHtml(line.slice(lastIndex, m.index));
      }

      const token = m[0];
      const isMathToken =
        token.startsWith('$') || token.startsWith('\\') || /^\d+[\.\,]?\d*\s*\\/.test(token);

      if (isMathToken) {
        out += renderLatexToChipHtml(token, token.startsWith('$$') || token.startsWith('\\['));
      } else if (token.startsWith('`')) {
        out += `<code data-mark="code" class="${RICH_MARK_CLASSES.code}">${escapeHtml(token.slice(1, -1))}</code>`;
      } else if (/^<mark(?:\s+data-color="([a-z]+)")?>/i.test(token)) {
        const markMatch = token.match(/^<mark(?:\s+data-color="([a-z]+)")?>([\s\S]*?)<\/mark>$/i);
        const colorId = getHighlightColorConfig(markMatch?.[1]).id;
        const inner = markMatch?.[2] || '';
        const colorCfg = HIGHLIGHT_COLORS[colorId];
        out += `<mark data-mark="highlight" data-color="${colorId}" class="${colorCfg.className}">${renderEmphasisHtml(inner)}</mark>`;
      } else if (token.startsWith('<code>')) {
        const inner = token.replace(/^<code>|<\/code>$/gi, '');
        out += `<code data-mark="code" class="${RICH_MARK_CLASSES.code}">${escapeHtml(inner)}</code>`;
      } else if (token.startsWith('<u>')) {
        const inner = token.replace(/^<u>|<\/u>$/gi, '');
        out += `<u class="${RICH_MARK_CLASSES.underline}">${escapeHtml(inner)}</u>`;
      } else if (token.startsWith('<del>') || token.startsWith('<s>')) {
        const inner = token.replace(/^<(del|s)>|<\/(del|s)>$/gi, '');
        out += `<del class="${RICH_MARK_CLASSES.strike}">${escapeHtml(inner)}</del>`;
      }

      lastIndex = re.lastIndex;
    }

    if (lastIndex < line.length) {
      out += renderEmphasisHtml(line.slice(lastIndex));
    }

    return out;
  });

  let joined = htmlLines.join('<br>');
  if (text.endsWith('\n')) {
    joined += '<br data-sentinel="true">';
  }
  return joined;
}

type MarkDelimiter = {
  open: string;
  close: string;
};

function wrapLinesWithMark(innerMd: string, { open, close }: MarkDelimiter): string {
  if (!innerMd) return '';
  if (!innerMd.includes('\n')) {
    return `${open}${innerMd}${close}`;
  }
  return innerMd
    .split('\n')
    .map((line) => (line ? `${open}${line}${close}` : ''))
    .join('\n');
}

function serializeChildren(node: Node): string {
  let out = '';
  const children = Array.from(node.childNodes);

  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    if (child.nodeType === Node.TEXT_NODE) {
      out += (child.textContent || '').replace(/\u200B/g, '');
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child as HTMLElement;
    const tag = el.tagName.toUpperCase();

    if (el.hasAttribute('data-latex')) {
      out += el.getAttribute('data-latex') || '';
      continue;
    }

    if (tag === 'BR') {
      if (el.getAttribute('data-sentinel') === 'true') continue;
      out += '\n';
      continue;
    }

    if (tag === 'DIV' || tag === 'P') {
      const inner = serializeChildren(el);
      if (i > 0 && !out.endsWith('\n')) {
        out += '\n';
      }
      if (inner === '\n') {
        out += '\n';
      } else {
        out += inner;
        if (i < children.length - 1 && !out.endsWith('\n')) {
          out += '\n';
        }
      }
      continue;
    }

    if (tag === 'MARK' || el.getAttribute('data-mark') === 'highlight') {
      const rawColor = el.getAttribute('data-color');
      const colorCfg = getHighlightColorConfig(rawColor);
      if (colorCfg.id !== 'yellow') {
        out += wrapLinesWithMark(serializeChildren(el), {
          open: `<mark data-color="${colorCfg.id}">`,
          close: '</mark>',
        });
      } else {
        out += wrapLinesWithMark(serializeChildren(el), { open: '==', close: '==' });
      }
      continue;
    }

    if (tag === 'CODE' || el.getAttribute('data-mark') === 'code') {
      out += wrapLinesWithMark(serializeChildren(el), { open: '`', close: '`' });
      continue;
    }

    if (tag === 'DEL' || tag === 'S' || tag === 'STRIKE') {
      out += wrapLinesWithMark(serializeChildren(el), { open: '~~', close: '~~' });
      continue;
    }

    if (tag === 'U') {
      out += wrapLinesWithMark(serializeChildren(el), { open: '__', close: '__' });
      continue;
    }

    if (tag === 'STRONG' || tag === 'B') {
      const meaningfulChildren = Array.from(el.childNodes).filter(
        (n) => n.nodeType !== Node.TEXT_NODE || (n.textContent || '').replace(/\u200B/g, '') !== ''
      );
      if (
        meaningfulChildren.length === 1 &&
        meaningfulChildren[0].nodeType === Node.ELEMENT_NODE &&
        ['EM', 'I'].includes((meaningfulChildren[0] as HTMLElement).tagName.toUpperCase())
      ) {
        out += wrapLinesWithMark(serializeChildren(meaningfulChildren[0]), { open: '***', close: '***' });
      } else {
        const inner = serializeChildren(el);
        if (inner.endsWith('*') && !inner.endsWith('**')) {
          out += wrapLinesWithMark(inner.replace(/\*([^*]+)\*$/, ''), { open: '**', close: '**' });
          const trailingMatch = inner.match(/\*([^*]+)\*$/);
          if (trailingMatch) {
            out += wrapLinesWithMark(trailingMatch[1], { open: '***', close: '***' });
          }
        } else {
          out += wrapLinesWithMark(inner, { open: '**', close: '**' });
        }
      }
      continue;
    }

    if (tag === 'EM' || tag === 'I') {
      const meaningfulChildren = Array.from(el.childNodes).filter(
        (n) => n.nodeType !== Node.TEXT_NODE || (n.textContent || '').replace(/\u200B/g, '') !== ''
      );
      if (
        meaningfulChildren.length === 1 &&
        meaningfulChildren[0].nodeType === Node.ELEMENT_NODE &&
        ['STRONG', 'B'].includes((meaningfulChildren[0] as HTMLElement).tagName.toUpperCase())
      ) {
        out += wrapLinesWithMark(serializeChildren(meaningfulChildren[0]), { open: '***', close: '***' });
      } else {
        out += wrapLinesWithMark(serializeChildren(el), { open: '*', close: '*' });
      }
      continue;
    }

    if (tag === 'SPAN') {
      const style = el.style;
      let inner = serializeChildren(el);
      if (!inner) continue;
      if (style.backgroundColor && style.backgroundColor !== 'transparent') {
        inner = wrapLinesWithMark(inner, { open: '==', close: '==' });
      }
      if (style.textDecorationLine?.includes('line-through') || style.textDecoration?.includes('line-through')) {
        inner = wrapLinesWithMark(inner, { open: '~~', close: '~~' });
      }
      if (style.textDecorationLine?.includes('underline') || style.textDecoration?.includes('underline')) {
        inner = wrapLinesWithMark(inner, { open: '__', close: '__' });
      }
      if (style.fontStyle === 'italic') {
        inner = wrapLinesWithMark(inner, { open: '*', close: '*' });
      }
      if (style.fontWeight === 'bold' || Number(style.fontWeight) >= 600) {
        inner = wrapLinesWithMark(inner, { open: '**', close: '**' });
      }
      out += inner;
      continue;
    }

    out += serializeChildren(el);
  }

  return out;
}

export function editorHtmlToMarkdown(root: HTMLElement): string {
  return serializeChildren(root);
}

export function createMarkElement(mark: string): HTMLElement {
  if (mark === 'highlight' || mark.startsWith('highlight:')) {
    const colorId = getHighlightColorConfig(mark.split(':')[1]).id;
    const el = document.createElement('mark');
    el.setAttribute('data-mark', 'highlight');
    el.setAttribute('data-color', colorId);
    el.className = HIGHLIGHT_COLORS[colorId].className;
    return el;
  }

  switch (mark) {
    case 'bold': {
      const el = document.createElement('strong');
      el.className = RICH_MARK_CLASSES.bold;
      return el;
    }
    case 'italic': {
      const el = document.createElement('em');
      el.className = RICH_MARK_CLASSES.italic;
      return el;
    }
    case 'underline': {
      const el = document.createElement('u');
      el.className = RICH_MARK_CLASSES.underline;
      return el;
    }
    case 'strike': {
      const el = document.createElement('del');
      el.className = RICH_MARK_CLASSES.strike;
      return el;
    }
    case 'code': {
      const el = document.createElement('code');
      el.setAttribute('data-mark', 'code');
      el.className = RICH_MARK_CLASSES.code;
      return el;
    }
    default: {
      const el = document.createElement('mark');
      el.setAttribute('data-mark', 'highlight');
      el.setAttribute('data-color', 'yellow');
      el.className = HIGHLIGHT_COLORS.yellow.className;
      return el;
    }
  }
}

export function matchesMarkTag(node: Node, mark: string): boolean {
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  const el = node as HTMLElement;
  const tag = el.tagName.toUpperCase();
  const baseMark = mark.startsWith('highlight:') ? 'highlight' : mark;
  switch (baseMark) {
    case 'bold':
      return tag === 'STRONG' || tag === 'B';
    case 'italic':
      return tag === 'EM' || tag === 'I';
    case 'underline':
      return tag === 'U';
    case 'strike':
      return tag === 'DEL' || tag === 'S' || tag === 'STRIKE';
    case 'code':
      return tag === 'CODE' || el.getAttribute('data-mark') === 'code';
    case 'highlight':
      return tag === 'MARK' || el.getAttribute('data-mark') === 'highlight';
    default:
      return false;
  }
}

export function getActiveMarksAtSelection(root: HTMLElement): {
  marks: Set<string>;
  highlightColor: HighlightColorId | null;
} {
  const active = new Set<string>();
  let highlightColor: HighlightColorId | null = null;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return { marks: active, highlightColor };
  let node: Node | null = sel.anchorNode;
  if (!node || !root.contains(node)) return { marks: active, highlightColor };

  const marks = ['bold', 'italic', 'underline', 'strike', 'code', 'highlight'];
  while (node && node !== root) {
    for (const m of marks) {
      if (matchesMarkTag(node, m)) {
        active.add(m);
        if (m === 'highlight' && !highlightColor && node instanceof HTMLElement) {
          highlightColor = getHighlightColorConfig(node.getAttribute('data-color')).id;
        }
      }
    }
    node = node.parentNode;
  }
  return { marks: active, highlightColor };
}

const AUTO_PATTERNS: Array<{ regex: RegExp; mark: string | 'math' }> = [
  { regex: /==([^=\n]+)==$/, mark: 'highlight:yellow' },
  { regex: /\*\*([^*\n]+)\*\*$/, mark: 'bold' },
  { regex: /~~([^~\n]+)~~$/, mark: 'strike' },
  { regex: /__([^_\n]+)__$/, mark: 'underline' },
  { regex: /`([^`\n]+)`$/, mark: 'code' },
  { regex: /\$([^$\n]+)\$$/, mark: 'math' },
];

export function tryAutoConvertDelimiter(root: HTMLElement): boolean {
  const sel = window.getSelection();
  if (!sel || !sel.isCollapsed || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE || !root.contains(node)) return false;

  let p: Node | null = node.parentNode;
  while (p && p !== root) {
    if (matchesMarkTag(p, 'code')) return false;
    p = p.parentNode;
  }

  const text = node.textContent || '';
  const offset = range.startOffset;
  const before = text.slice(0, offset);
  const after = text.slice(offset);

  for (const { regex, mark } of AUTO_PATTERNS) {
    const m = before.match(regex);
    if (!m || m.index === undefined) continue;
    const inner = m[1];
    if (!inner || !inner.trim()) continue;

    if (mark === 'math' && (before.endsWith('$$') || before.slice(0, m.index).endsWith('$'))) {
      continue;
    }

    const prefixText = before.slice(0, m.index);
    const parent = node.parentNode;
    if (!parent) continue;

    let insertedNode: Node;
    if (mark === 'math') {
      const temp = document.createElement('span');
      temp.innerHTML = renderLatexToChipHtml(`$${inner}$`, false);
      insertedNode = temp.firstChild!;
    } else {
      const el = createMarkElement(mark);
      el.textContent = inner;
      insertedNode = el;
    }

    const prefixNode = prefixText ? document.createTextNode(prefixText) : null;
    const trailText = after || '\u200B';
    const trailNode = document.createTextNode(trailText);

    if (prefixNode) parent.insertBefore(prefixNode, node);
    parent.insertBefore(insertedNode, node);
    parent.insertBefore(trailNode, node);
    parent.removeChild(node);

    const nextRange = document.createRange();
    nextRange.setStart(trailNode, after ? 0 : 1);
    nextRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(nextRange);
    return true;
  }

  return false;
}
