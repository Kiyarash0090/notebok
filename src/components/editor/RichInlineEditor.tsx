import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Trash2, X } from 'lucide-react';
import {
  editorHtmlToMarkdown,
  markdownToEditorHtml,
  renderLatexToChipHtml,
  tryAutoConvertDelimiter,
} from '../../lib/richText';
import { InlineText } from '../blocks/InlineText';
import { MathRenderer } from '../MathRenderer';

interface RichInlineEditorProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  dir?: 'auto' | 'rtl' | 'ltr';
  singleLine?: boolean;
  renderMath?: boolean;
  dataBlockId?: string;
  dataCheckItem?: string;
  searchQuery?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onBeforeInput?: (e: React.FormEvent<HTMLDivElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLDivElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLDivElement>) => void;
  onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseEnter?: (e: React.MouseEvent<HTMLDivElement>) => void;
  editorRef?: React.Ref<HTMLDivElement | null>;
}

function stripLatexDelimiters(raw: string): { inner: string; isDisplay: boolean } {
  const trimmed = raw.trim();
  if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
    return { inner: trimmed.slice(2, -2).trim(), isDisplay: true };
  }
  if (trimmed.startsWith('\\[') && trimmed.endsWith('\\]')) {
    return { inner: trimmed.slice(2, -2).trim(), isDisplay: true };
  }
  if (trimmed.startsWith('$') && trimmed.endsWith('$')) {
    return { inner: trimmed.slice(1, -1).trim(), isDisplay: false };
  }
  if (trimmed.startsWith('\\(') && trimmed.endsWith('\\)')) {
    return { inner: trimmed.slice(2, -2).trim(), isDisplay: false };
  }
  return { inner: trimmed, isDisplay: false };
}

export const RichInlineEditor: React.FC<RichInlineEditorProps> = ({
  value,
  onChange,
  placeholder = '',
  className = '',
  style,
  dir = 'auto',
  singleLine = false,
  renderMath = true,
  dataBlockId,
  dataCheckItem,
  searchQuery,
  onKeyDown,
  onBeforeInput,
  onFocus,
  onBlur,
  onMouseDown,
  onMouseEnter,
  editorRef,
}) => {
  const internalRef = useRef<HTMLDivElement | null>(null);
  const lastMarkdownRef = useRef<string | null>(null);
  const isComposingRef = useRef(false);
  const [isFocused, setIsFocused] = useState(false);

  // Inline LaTeX chip edit modal state
  const [editingMathChip, setEditingMathChip] = useState<{
    chipEl: HTMLElement;
    inner: string;
    isDisplay: boolean;
  } | null>(null);

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      internalRef.current = node;
      if (typeof editorRef === 'function') {
        editorRef(node);
      } else if (editorRef && 'current' in editorRef) {
        (editorRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
    },
    [editorRef]
  );

  // Sync external value changes into contentEditable without disturbing live typing caret
  useEffect(() => {
    const el = internalRef.current;
    if (!el) return;
    if (lastMarkdownRef.current !== value) {
      const wasFocused = document.activeElement === el;
      el.innerHTML = markdownToEditorHtml(value || '', renderMath);
      lastMarkdownRef.current = value;
      if (wasFocused) {
        const sel = window.getSelection();
        if (sel) {
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }
  }, [value, renderMath, isFocused, searchQuery]);

  const emitChange = useCallback(
    (el: HTMLElement) => {
      let nextMd = editorHtmlToMarkdown(el);
      if (singleLine) {
        nextMd = nextMd.replace(/\n+/g, ' ');
      }

      // Clean stray trailing <br> if editor became completely empty (no marks or math)
      if (
        nextMd === '' &&
        !el.querySelector('mark, strong, em, del, u, code, [data-latex]') &&
        (el.textContent || '').replace(/\u200B/g, '') === ''
      ) {
        el.innerHTML = '';
      }

      if (nextMd !== lastMarkdownRef.current) {
        lastMarkdownRef.current = nextMd;
        onChange(nextMd);
      }
    },
    [onChange, singleLine]
  );

  const handleInput = useCallback(() => {
    const el = internalRef.current;
    if (!el || isComposingRef.current) return;

    if (renderMath) {
      tryAutoConvertDelimiter(el);
    }
    emitChange(el);
  }, [emitChange, renderMath]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;

    // Handle Backspace on empty block -> allow parent commandExecutor (e.g. merge_up)
    // Note: BlockEditor checks value === '' in its onKeyDown if needed

    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
      if (singleLine) {
        e.preventDefault();
        return;
      }

      // Insert clean <br> newline instead of browser <div>/<p> wrappers
      e.preventDefault();
      const el = internalRef.current;
      const sel = window.getSelection();
      if (!el || !sel || sel.rangeCount === 0) return;

      const range = sel.getRangeAt(0);
      if (!range.collapsed) {
        range.deleteContents();
      }

      // Check if caret is at the very end of the editor (ignoring sentinel <br>)
      const tailRange = document.createRange();
      tailRange.setStart(range.endContainer, range.endOffset);
      tailRange.setEnd(el, el.childNodes.length);
      const tailText = tailRange.toString().replace(/\u200B/g, '');
      const tailFrag = tailRange.cloneContents();
      const hasNonSentinelAfter =
        tailText.length > 0 ||
        Array.from(tailFrag.querySelectorAll('*')).some(
          (node) =>
            !(node.tagName === 'BR' && node.getAttribute('data-sentinel') === 'true')
        );

      const br = document.createElement('br');
      range.insertNode(br);

      // Remove existing sentinel if any
      el.querySelectorAll('br[data-sentinel="true"]').forEach((s) => s.remove());

      if (!hasNonSentinelAfter) {
        const sentinel = document.createElement('br');
        sentinel.setAttribute('data-sentinel', 'true');
        br.parentNode?.insertBefore(sentinel, br.nextSibling);
      }

      const nextRange = document.createRange();
      nextRange.setStartAfter(br);
      nextRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(nextRange);

      emitChange(el);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // Allow image paste events to bubble if parent handles files
    if (e.clipboardData?.files?.length && !e.clipboardData.getData('text/plain')) {
      return;
    }

    const plain = e.clipboardData?.getData('text/plain');
    if (plain === undefined || plain === null) return;

    e.preventDefault();
    const el = internalRef.current;
    const sel = window.getSelection();
    if (!el || !sel || sel.rangeCount === 0) return;

    const cleanText = singleLine ? plain.replace(/\r?\n+/g, ' ') : plain.replace(/\r\n/g, '\n');
    const html = markdownToEditorHtml(cleanText, renderMath);

    const range = sel.getRangeAt(0);
    range.deleteContents();

    const temp = document.createElement('div');
    temp.innerHTML = html;
    // Strip trailing sentinel from pasted snippet
    temp.querySelectorAll('br[data-sentinel="true"]').forEach((s) => s.remove());

    const frag = document.createDocumentFragment();
    let lastNode: Node | null = null;
    while (temp.firstChild) {
      lastNode = temp.firstChild;
      frag.appendChild(lastNode);
    }
    range.insertNode(frag);

    if (lastNode) {
      const nextRange = document.createRange();
      nextRange.setStartAfter(lastNode);
      nextRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(nextRange);
    }

    emitChange(el);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    const chip = target?.closest?.('[data-latex]') as HTMLElement | null;
    if (chip && internalRef.current?.contains(chip)) {
      e.preventDefault();
      e.stopPropagation();
      const raw = chip.getAttribute('data-latex') || '';
      const { inner, isDisplay } = stripLatexDelimiters(raw);
      setEditingMathChip({ chipEl: chip, inner, isDisplay });
    }
  };

  const handleSaveMathChip = () => {
    if (!editingMathChip || !internalRef.current) return;
    const { chipEl, inner, isDisplay } = editingMathChip;
    const trimmed = inner.trim();

    if (!trimmed) {
      chipEl.remove();
    } else {
      const raw = isDisplay ? `$$${trimmed}$$` : `$${trimmed}$`;
      const temp = document.createElement('span');
      temp.innerHTML = renderLatexToChipHtml(raw, isDisplay);
      const newChip = temp.firstChild;
      if (newChip && chipEl.parentNode) {
        chipEl.parentNode.replaceChild(newChip, chipEl);
      }
    }

    setEditingMathChip(null);
    emitChange(internalRef.current);
    internalRef.current.focus();
  };

  const handleDeleteMathChip = () => {
    if (!editingMathChip || !internalRef.current) return;
    editingMathChip.chipEl.remove();
    setEditingMathChip(null);
    emitChange(internalRef.current);
    internalRef.current.focus();
  };

  const showSearchHighlighted = Boolean(searchQuery && searchQuery.trim() && !isFocused && value.trim());

  return (
    <>
      {showSearchHighlighted ? (
        <div
          dir={dir}
          onClick={() => {
            setIsFocused(true);
            requestAnimationFrame(() => {
              internalRef.current?.focus();
            });
          }}
          className={`w-full cursor-text whitespace-pre-wrap break-words ${className}`}
          style={style}
        >
          <InlineText text={value} highlightQuery={searchQuery} renderMath={renderMath} />
        </div>
      ) : (
        <div
          ref={setRefs}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline={!singleLine}
          dir={dir}
          data-rich-editor="true"
          data-block-id={dataBlockId}
          data-check-item={dataCheckItem}
          data-placeholder={placeholder}
          onInput={handleInput}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          onBeforeInput={onBeforeInput}
          onPaste={handlePaste}
          onClick={handleClick}
          onMouseDown={onMouseDown}
          onMouseEnter={onMouseEnter}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            if (internalRef.current) {
              emitChange(internalRef.current);
            }
            onBlur?.(e);
          }}
          className={`w-full bg-transparent outline-none whitespace-pre-wrap break-words ${className}`}
          style={style}
        />
      )}

      {/* Compact Modal for editing an inline LaTeX math formula chip */}
      {editingMathChip && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setEditingMathChip(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#FAF9F5] dark:bg-[#1C1C17] border border-[#E1E4D5] dark:border-[#43493E] shadow-2xl p-4 space-y-3"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                ویرایش فرمول ریاضی
              </span>
              <button
                type="button"
                onClick={() => setEditingMathChip(null)}
                className="p-1 rounded-lg text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              dir="ltr"
              autoFocus
              value={editingMathChip.inner}
              onChange={(e) =>
                setEditingMathChip((prev) => (prev ? { ...prev, inner: e.target.value } : null))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveMathChip();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setEditingMathChip(null);
                }
              }}
              placeholder="x^2 + y^2 = r^2"
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] focus:border-[#4A6D22] dark:focus:border-[#D0E8B2] font-mono text-xs text-[#1A1C16] dark:text-[#E2E3DC] outline-none"
            />

            {editingMathChip.inner.trim() && (
              <div
                className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-[#E1E4D5]/70 dark:border-[#43493E]/70 text-center overflow-x-auto"
                dir="ltr"
              >
                <MathRenderer
                  text={
                    editingMathChip.isDisplay
                      ? `$$${editingMathChip.inner}$$`
                      : `$${editingMathChip.inner}$`
                  }
                  inline={!editingMathChip.isDisplay}
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleDeleteMathChip}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#A64D3B] hover:bg-[#A64D3B]/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف فرمول
              </button>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditingMathChip(null)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/10"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={handleSaveMathChip}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#4A6D22] hover:bg-[#3d5a1c] text-white text-xs font-bold"
                >
                  <Check className="w-3.5 h-3.5" />
                  تایید
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
