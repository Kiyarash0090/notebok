import {
  createMarkElement,
  getHighlightColorConfig,
  HIGHLIGHT_COLORS,
  matchesMarkTag,
  renderLatexToChipHtml,
} from './richText';

// Fallback markers when focus is in a plain textarea
const MARKERS: Record<string, string> = {
  bold: '**',
  italic: '*',
  strike: '~~',
  code: '`',
  highlight: '==',
  underline: '__',
};

function findAncestorMark(node: Node | null, root: HTMLElement, mark: string): HTMLElement | null {
  let cur: Node | null = node;
  while (cur && cur !== root) {
    if (cur.nodeType === Node.ELEMENT_NODE && matchesMarkTag(cur, mark)) {
      return cur as HTMLElement;
    }
    cur = cur.parentNode;
  }
  return null;
}

function unwrapNestedMark(container: Node, mark: string): void {
  const children = Array.from(container.childNodes);
  for (const child of children) {
    unwrapNestedMark(child, mark);
    if (child.nodeType === Node.ELEMENT_NODE && matchesMarkTag(child, mark)) {
      const parent = child.parentNode;
      if (parent) {
        while (child.firstChild) {
          parent.insertBefore(child.firstChild, child);
        }
        parent.removeChild(child);
      }
    }
  }
}

function hasMeaningfulContent(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent || '').replace(/\u200B/g, '') !== '';
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;
    if (el.hasAttribute('data-latex') || el.tagName === 'BR') return true;
  }
  for (const child of Array.from(node.childNodes)) {
    if (hasMeaningfulContent(child)) return true;
  }
  return false;
}

function isSameMarkStyle(a: Node, b: Node, mark: string): boolean {
  if (!matchesMarkTag(a, mark) || !matchesMarkTag(b, mark)) return false;
  if (mark === 'highlight' || mark.startsWith('highlight:')) {
    const colorA = getHighlightColorConfig((a as HTMLElement).getAttribute('data-color')).id;
    const colorB = getHighlightColorConfig((b as HTMLElement).getAttribute('data-color')).id;
    return colorA === colorB;
  }
  return true;
}

function applyMarkToRichEditor(root: HTMLElement, mark: string): void {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;

  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return;

  const isHighlight = mark === 'highlight' || mark.startsWith('highlight:');
  const requestedColor = isHighlight ? getHighlightColorConfig(mark.split(':')[1]).id : null;

  if (!range.collapsed) {
    const startAnc = findAncestorMark(range.startContainer, root, mark);
    const endAnc = findAncestorMark(range.endContainer, root, mark);

    if (startAnc && endAnc && startAnc === endAnc) {
      const existingColor = isHighlight
        ? getHighlightColorConfig(startAnc.getAttribute('data-color')).id
        : null;

      // If user picked a different highlight color, switch color for the selected portion instead of removing
      if (isHighlight && requestedColor && existingColor !== requestedColor) {
        const afterRange = document.createRange();
        afterRange.setStart(range.endContainer, range.endOffset);
        afterRange.setEnd(startAnc, startAnc.childNodes.length);
        const afterFrag = afterRange.extractContents();

        const selectedFrag = range.extractContents();
        unwrapNestedMark(selectedFrag, mark);

        const newMark = createMarkElement(`highlight:${requestedColor}`);
        newMark.appendChild(selectedFrag);

        const parent = startAnc.parentNode;
        if (!parent) return;
        const refNode = startAnc.nextSibling;
        parent.insertBefore(newMark, refNode);

        if (hasMeaningfulContent(afterFrag)) {
          const afterEl = createMarkElement(`highlight:${existingColor}`);
          afterEl.appendChild(afterFrag);
          parent.insertBefore(afterEl, refNode);
        }

        if (!hasMeaningfulContent(startAnc)) {
          parent.removeChild(startAnc);
        }

        const nextRange = document.createRange();
        nextRange.selectNodeContents(newMark);
        sel.removeAllRanges();
        sel.addRange(nextRange);
      } else {
        // Selection is inside a single mark element with same style -> toggle OFF
        const afterRange = document.createRange();
        afterRange.setStart(range.endContainer, range.endOffset);
        afterRange.setEnd(startAnc, startAnc.childNodes.length);
        const afterFrag = afterRange.extractContents();

        const selectedFrag = range.extractContents();
        unwrapNestedMark(selectedFrag, mark);

        const insertedNodes = Array.from(selectedFrag.childNodes);
        const parent = startAnc.parentNode;
        if (!parent) return;

        const refNode = startAnc.nextSibling;
        parent.insertBefore(selectedFrag, refNode);

        if (hasMeaningfulContent(afterFrag)) {
          const afterEl = isHighlight
            ? createMarkElement(`highlight:${existingColor || 'yellow'}`)
            : createMarkElement(mark);
          afterEl.appendChild(afterFrag);
          parent.insertBefore(afterEl, refNode);
        }

        if (!hasMeaningfulContent(startAnc)) {
          parent.removeChild(startAnc);
        }

        if (insertedNodes.length > 0) {
          const nextRange = document.createRange();
          nextRange.setStartBefore(insertedNodes[0]);
          nextRange.setEndAfter(insertedNodes[insertedNodes.length - 1]);
          sel.removeAllRanges();
          sel.addRange(nextRange);
        }
      }
    } else {
      // Wrap selection in mark element
      const frag = range.extractContents();
      unwrapNestedMark(frag, mark);

      const wrapper = createMarkElement(mark);
      wrapper.appendChild(frag);
      range.insertNode(wrapper);

      // Merge with adjacent identical mark siblings if present
      const prev = wrapper.previousSibling;
      if (prev && isSameMarkStyle(prev, wrapper, mark)) {
        while (prev.lastChild) {
          wrapper.insertBefore(prev.lastChild, wrapper.firstChild);
        }
        prev.parentNode?.removeChild(prev);
      }
      const next = wrapper.nextSibling;
      if (next && isSameMarkStyle(next, wrapper, mark)) {
        while (next.firstChild) {
          wrapper.appendChild(next.firstChild);
        }
        next.parentNode?.removeChild(next);
      }

      const nextRange = document.createRange();
      nextRange.selectNodeContents(wrapper);
      sel.removeAllRanges();
      sel.addRange(nextRange);
    }
  } else {
    // Collapsed caret
    const anc = findAncestorMark(range.startContainer, root, mark);
    if (anc) {
      const existingColor = isHighlight
        ? getHighlightColorConfig(anc.getAttribute('data-color')).id
        : null;

      if (isHighlight && requestedColor && existingColor !== requestedColor) {
        // Switch color of current mark element at caret
        const cfg = HIGHLIGHT_COLORS[requestedColor];
        anc.setAttribute('data-color', cfg.id);
        anc.className = cfg.className;
      } else {
        // Split out of current mark
        const afterRange = document.createRange();
        afterRange.setStart(range.startContainer, range.startOffset);
        afterRange.setEnd(anc, anc.childNodes.length);
        const afterFrag = afterRange.extractContents();

        const parent = anc.parentNode;
        if (!parent) return;

        const zwsp = document.createTextNode('\u200B');
        const refNode = anc.nextSibling;
        parent.insertBefore(zwsp, refNode);

        if (hasMeaningfulContent(afterFrag)) {
          const afterEl = isHighlight
            ? createMarkElement(`highlight:${existingColor || 'yellow'}`)
            : createMarkElement(mark);
          afterEl.appendChild(afterFrag);
          parent.insertBefore(afterEl, refNode);
        }

        if (!hasMeaningfulContent(anc)) {
          parent.removeChild(anc);
        }

        const nextRange = document.createRange();
        nextRange.setStart(zwsp, 1);
        nextRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(nextRange);
      }
    } else {
      // Enter a new mark at caret
      const wrapper = createMarkElement(mark);
      const zwsp = document.createTextNode('\u200B');
      wrapper.appendChild(zwsp);
      range.insertNode(wrapper);

      const nextRange = document.createRange();
      nextRange.setStart(zwsp, 1);
      nextRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(nextRange);
    }
  }

  root.focus({ preventScroll: true });
  root.dispatchEvent(new Event('input', { bubbles: true }));
  document.dispatchEvent(new Event('selectionchange'));
}

function findActiveRichRoot(): HTMLElement | null {
  const el = document.activeElement;
  if (el instanceof HTMLElement) {
    const root = el.closest('[data-rich-editor="true"]') as HTMLElement | null;
    if (root) return root;
  }
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    const node = sel.getRangeAt(0).commonAncestorContainer;
    const nodeEl = node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
    return (nodeEl?.closest('[data-rich-editor="true"]') as HTMLElement | null) || null;
  }
  return null;
}

export const applyInlineMath = (): boolean => {
  const richRoot = findActiveRichRoot();
  if (!richRoot) return false;

  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (range.collapsed || !richRoot.contains(range.commonAncestorContainer)) return false;

  let text = range.toString().trim();
  if (!text) return false;
  if (text.startsWith('$') && text.endsWith('$') && text.length > 2) {
    text = text.slice(1, -1).trim();
  }

  range.deleteContents();
  const temp = document.createElement('span');
  temp.innerHTML = renderLatexToChipHtml(`$${text}$`, false);
  const chip = temp.firstChild;
  if (!chip) return false;

  const zwsp = document.createTextNode('\u200B');
  range.insertNode(zwsp);
  range.insertNode(chip);

  const nextRange = document.createRange();
  nextRange.setStart(zwsp, 1);
  nextRange.collapse(true);
  sel.removeAllRanges();
  sel.addRange(nextRange);

  richRoot.focus({ preventScroll: true });
  richRoot.dispatchEvent(new Event('input', { bubbles: true }));
  document.dispatchEvent(new Event('selectionchange'));
  return true;
};

export const applyMark = (mark: string): { id: string; text: string } | null => {
  if (mark === 'math') {
    applyInlineMath();
    return null;
  }

  const richRoot = findActiveRichRoot();
  if (richRoot) {
    applyMarkToRichEditor(richRoot, mark);
    return null;
  }

  const el = document.activeElement;
  if (!(el instanceof HTMLTextAreaElement)) return null;

  const baseMark = mark.startsWith('highlight:') ? 'highlight' : mark;
  const marker = MARKERS[baseMark];
  if (!marker) return null;

  const { selectionStart: start, selectionEnd: end, value } = el;
  const selected = value.slice(start, end);
  const wrapped = `${marker}${selected}${marker}`;
  const next = value.slice(0, start) + wrapped + value.slice(end);

  const caret = selected ? start + wrapped.length : start + marker.length;
  requestAnimationFrame(() => {
    el.setSelectionRange(caret, caret);
    el.focus();
  });

  return { id: el.dataset.blockId || '', text: next };
};
