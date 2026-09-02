// Wraps the current selection of the focused textarea in markdown markers.
// Works on the live DOM element because block text lives in uncontrolled-caret textareas.
const MARKERS: Record<string, string> = {
  bold: '**',
  italic: '*',
  strike: '~~',
  code: '`',
  highlight: '==',
};

export const applyMark = (mark: string): { id: string; text: string } | null => {
  const el = document.activeElement;
  if (!(el instanceof HTMLTextAreaElement)) return null;

  const marker = MARKERS[mark];
  if (!marker) return null;

  const { selectionStart: start, selectionEnd: end, value } = el;
  const selected = value.slice(start, end);
  const wrapped = `${marker}${selected}${marker}`;
  const next = value.slice(0, start) + wrapped + value.slice(end);

  // Restore a sensible caret: inside the markers when nothing was selected
  const caret = selected ? start + wrapped.length : start + marker.length;
  requestAnimationFrame(() => {
    el.setSelectionRange(caret, caret);
    el.focus();
  });

  return { id: el.dataset.blockId || '', text: next };
};
