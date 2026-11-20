import React, { useRef, useState } from 'react';
import {
  GripVertical,
  Sigma,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  Check,
} from 'lucide-react';
import { NoteAttachment, NoteBlock } from '../../types';
import {
  CALLOUT_STYLES,
  BLOCK_LABELS,
  createTableData,
} from '../../lib/blocks';
import { MATH_SNIPPET_GROUPS } from '../../lib/mathSnippets';

const FAMOUS_FORMULAS = [
  { label: 'معادله درجه دو', latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
  { label: 'قضیه فیثاغورس', latex: 'a^2 + b^2 = c^2' },
  { label: 'تعریف مشتق', latex: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}" },
  { label: 'انتگرال معین', latex: '\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)' },
  { label: 'قانون دوم نیوتن', latex: '\\vec{F} = m \\vec{a}' },
  { label: 'هم‌ارزی جرم و انرژی', latex: 'E = m c^2' },
  { label: 'اتحاد اویلر', latex: 'e^{i\\pi} + 1 = 0' },
  { label: 'معادله دایره', latex: '(x - h)^2 + (y - k)^2 = r^2' },
  { label: 'توزیع نرمال', latex: 'f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}' },
];
import { MathRenderer } from '../MathRenderer';
import { MediaFrame } from '../blocks/MediaFrame';
import { TableEditor } from './TableEditor';
import { MediaGalleryEditor } from './MediaGalleryEditor';
import { RichInlineEditor } from './RichInlineEditor';

interface BlockEditorProps {
  block: NoteBlock;
  attachments?: NoteAttachment[];
  commandExecutor: (blockId: string, command: string) => void;
  onUpdate: (blockId: string, patch: Partial<NoteBlock>) => void;
  onDelete: (blockId: string) => void;
  onMove: (blockId: string, dir: -1 | 1) => void;
  onPickMedia: (blockId: string) => void;
  onZoomImage: (url: string) => void;
  onAddGalleryItems: (blockId: string) => void;
  onReplaceGalleryItem: (blockId: string, index: number) => void;
  onRemoveGalleryItem: (blockId: string, index: number) => void;
  // The parent owns which block is "active" so only one control rail shows.
  active?: boolean;
  onActivateChange?: (active: boolean) => void;
  searchQuery?: string;
}

const railBtn =
  'w-6 h-6 rounded-lg hover:bg-[#D0E8B2] dark:hover:bg-[#324B10] hover:text-[#1A3700] dark:hover:text-[#D0E8B2] flex items-center justify-center text-[#5E6258] dark:text-[#8F9285] transition-all active:scale-90';

export const BlockEditor: React.FC<BlockEditorProps> = ({
  block,
  attachments = [],
  commandExecutor,
  onUpdate,
  onDelete,
  onMove,
  onPickMedia,
  onZoomImage,
  onAddGalleryItems,
  onReplaceGalleryItem,
  onRemoveGalleryItem,
  active = false,
  onActivateChange = () => {},
  searchQuery,
}) => {
  const [dragging, setDragging] = useState(false);
  const dragTouchY = useRef<number | null>(null);
  const [mathPaletteOpen, setMathPaletteOpen] = useState(false);
  const [mathCategory, setMathCategory] = useState<number>(0);
  const [editingMath, setEditingMath] = useState(() => block.type === 'math' && !block.text?.trim());
  const mathAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const mathBoxRef = useRef<HTMLDivElement | null>(null);
  const attachment = React.useMemo(() => {
    if (block.type !== 'media') return undefined;
    const found = attachments.find((a) => a.id === block.attachmentId);
    if (found) return found;
    if (block.text) {
      const isAudio = block.text.startsWith('data:audio') || /\.(mp3|wav|ogg|m4a|webm|aac)(\?.*)?$/i.test(block.text);
      const isVideo = block.text.startsWith('data:video') || /\.(mp4|webm|mov|mkv)(\?.*)?$/i.test(block.text);
      const isImage = block.text.startsWith('data:image') || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(block.text);
      return {
        id: block.attachmentId || block.id,
        name: block.caption || (isAudio ? 'ویس ضبط‌شده' : isVideo ? 'ویدیو' : isImage ? 'تصویر' : 'رسانه'),
        type: isAudio ? 'audio' : isVideo ? 'video' : isImage ? 'image' : 'document',
        mimeType: isAudio ? 'audio/webm' : '',
        size: 0,
        url: block.text,
        createdAt: new Date().toISOString(),
      } as NoteAttachment;
    }
    return undefined;
  }, [block, attachments]);

  // Inserts a LaTeX snippet at the textarea caret, or at the end when the field
  // was never focused. The `|` in a template marks the post-insert caret spot.
  const insertMathSnippet = (latex: string) => {
    const el = mathAreaRef.current;
    const text = block.text || '';
    const focused = el !== null && document.activeElement === el;
    const start = focused ? el.selectionStart ?? text.length : text.length;
    const end = focused ? el.selectionEnd ?? text.length : text.length;
    const caretOffset = latex.indexOf('|');
    const clean = caretOffset === -1 ? latex : latex.replace('|', '');
    onUpdate(block.id, { text: text.slice(0, start) + clean + text.slice(end) });
    const caret = start + (caretOffset === -1 ? clean.length : caretOffset);
    requestAnimationFrame(() => {
      const node = mathAreaRef.current;
      if (node) {
        node.focus();
        node.setSelectionRange(caret, caret);
      }
    });
  };

  const textArea = (placeholder: string, rows = 1) => {
    return (
      <RichInlineEditor
        value={block.text}
        onChange={(nextText) => onUpdate(block.id, { text: nextText })}
        placeholder={placeholder}
        dir="auto"
        dataBlockId={block.id}
        searchQuery={searchQuery}
        onKeyDown={(e) => {
          // Ctrl/Cmd + Enter inserts a new block after this one
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            commandExecutor(block.id, 'insert_after');
          } else if (e.key === 'Backspace' && block.text === '') {
            e.preventDefault();
            commandExecutor(block.id, 'merge_up');
          }
        }}
        className="leading-relaxed"
        style={{ minHeight: `${rows * 1.75}em` }}
      />
    );
  };

  const renderBody = () => {
    switch (block.type) {
      case 'heading': {
        const level = block.level || 2;
        const fontClass =
          level === 1
            ? 'text-base sm:text-lg font-extrabold'
            : level === 2
            ? 'text-sm sm:text-base font-bold'
            : 'text-xs sm:text-sm font-bold';
        return (
          <div className={`${fontClass} text-[#1A1C16] dark:text-[#E2E3DC]`}>
            {textArea(level === 1 ? 'تیتر اصلی...' : level === 2 ? 'عنوان بخش...' : 'زیرعنوان...')}
          </div>
        );
      }
      case 'quote':
        return (
          <div className="border-r-3 border-[#D0E8B2] dark:border-[#4A6D22] pr-3 italic text-xs sm:text-sm text-[#3F4A35] dark:text-[#BCC2B2]">
            {textArea('نقل قول...')}
          </div>
        );
      case 'callout': {
        const style = CALLOUT_STYLES[block.tone || 'info'];
        return (
          <div className={`flex gap-2.5 items-start p-3 rounded-2xl border ${style.light} ${style.dark} text-xs sm:text-sm`}>
            <span className="flex items-center pt-0.5"><style.icon className="w-4 h-4" /></span>
            <div className={`min-w-0 flex-1 leading-relaxed ${style.text}`}>
              {textArea('متن تأکیدی یا نکته کلیدی...')}
            </div>
          </div>
        );
      }
      case 'code':
        return (
          <div className="p-3 rounded-2xl bg-[#1C1C17] dark:bg-[#0F110C] text-[#E2E3DC] text-[11px] sm:text-xs border border-[#43493E] font-mono" dir="ltr">
            <textarea
              value={block.text}
              placeholder="// کد خود را اینجا وارد کنید..."
              rows={Math.max(3, (block.text || '').split('\n').length)}
              onChange={(e) => onUpdate(block.id, { text: e.target.value })}
              onInput={(e) => {
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = `${Math.max(72, e.currentTarget.scrollHeight)}px`;
              }}
              ref={(el) => {
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = `${Math.max(72, el.scrollHeight)}px`;
                }
              }}
              className="w-full bg-transparent resize-none outline-none font-mono text-[#E2E3DC] placeholder:text-[#8F9285] leading-relaxed overflow-hidden"
            />
          </div>
        );
      case 'math':
        if (!editingMath && block.text.trim()) {
          return (
            <div
              onClick={() => {
                setEditingMath(true);
                requestAnimationFrame(() => mathAreaRef.current?.focus());
              }}
              className="py-2 px-3 rounded-2xl hover:bg-[#FAF2DE]/50 dark:hover:bg-[#1C1C17] border border-transparent hover:border-[#E1E4D5] dark:hover:border-[#43493E] overflow-x-auto text-center cursor-pointer transition-colors"
              dir="ltr"
              title="برای ویرایش فرمول کلیک کنید"
            >
              <MathRenderer
                text={block.text.startsWith('$') || block.text.startsWith('\\') ? block.text : `$$${block.text}$$`}
              />
            </div>
          );
        }

        return (
          <div
            ref={mathBoxRef}
            onBlurCapture={(e) => {
              if (!mathBoxRef.current?.contains(e.relatedTarget as Node) && block.text.trim()) {
                setEditingMath(false);
                setMathPaletteOpen(false);
              }
            }}
            className="space-y-2"
          >
            <div className="p-3 rounded-2xl bg-[#FAF2DE] dark:bg-[#1C1C17] border border-[#E1E4D5] dark:border-[#43493E]">
              {/* Header with title and toggle button */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E1E4D5]/80 dark:border-[#43493E]/80 gap-2 flex-wrap" dir="rtl">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#4A6D22] dark:text-[#D0E8B2]">
                  <Sigma className="w-4 h-4 shrink-0" />
                  <span>فرمول ریاضی (LaTeX)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMathPaletteOpen((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 touch-manipulation cursor-pointer ${
                      mathPaletteOpen
                        ? 'bg-[#4A6D22] text-white dark:bg-[#D0E8B2] dark:text-[#1A3700]'
                        : 'bg-white dark:bg-[#23261F] text-[#4A6D22] dark:text-[#D0E8B2] hover:bg-[#D0E8B2]/30 dark:hover:bg-[#324B10]/40 border border-[#E1E4D5] dark:border-[#43493E]'
                    }`}
                    title="نمایش و درج فرمول‌ها و نمادهای آماده"
                  >
                    <Sigma className="w-3.5 h-3.5" />
                    <span>{mathPaletteOpen ? 'بستن فرمول‌های آماده' : 'فرمول‌های آماده'}</span>
                  </button>
                  {block.text.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMath(false);
                        setMathPaletteOpen(false);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#4A6D22] text-white dark:bg-[#D0E8B2] dark:text-[#1A3700] text-xs font-bold transition-all active:scale-95 cursor-pointer"
                      title="نمایش رندر شده"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>تایید</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Math Snippets & Formulas Palette */}
              {mathPaletteOpen && (
                <div className="mb-3 p-2.5 rounded-xl bg-white/95 dark:bg-[#12140E]/95 border border-[#E1E4D5] dark:border-[#43493E] shadow-sm space-y-2.5" dir="rtl">
                  <div className="flex items-center justify-between gap-1">
                    {/* Category tabs */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-[calc(100%-28px)] text-xs">
                      {['قالب‌های پرکاربرد', 'فرمول‌های معروف', 'ماتریس و دستگاه', 'نمادها و یونانی'].map((catName, cIdx) => (
                        <button
                          key={catName}
                          type="button"
                          onClick={() => setMathCategory(cIdx)}
                          className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap text-[11px] transition-all cursor-pointer ${
                            mathCategory === cIdx
                              ? 'bg-[#4A6D22] text-white dark:bg-[#D0E8B2] dark:text-[#1A3700] font-bold shadow-xs'
                              : 'bg-black/5 dark:bg-white/5 text-[#5E6258] dark:text-[#8F9285] hover:bg-black/10 dark:hover:bg-white/10'
                          }`}
                        >
                          {catName}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setMathPaletteOpen(false)}
                      className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[#8F9285] cursor-pointer"
                      title="بستن"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Items list per category */}
                  <div className="max-h-52 overflow-y-auto pr-0.5 space-y-1.5">
                    {mathCategory === 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {MATH_SNIPPET_GROUPS[0].items.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => insertMathSnippet(item.latex)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#FAF2DE] dark:bg-[#1C1C17] hover:bg-[#D0E8B2] hover:text-[#1A3700] dark:hover:bg-[#324B10] dark:hover:text-[#D0E8B2] border border-[#E1E4D5] dark:border-[#43493E] text-xs text-[#1A1C16] dark:text-[#E2E3DC] transition-colors active:scale-95 cursor-pointer font-medium"
                            title={item.latex}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {mathCategory === 1 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {FAMOUS_FORMULAS.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => insertMathSnippet(item.latex)}
                            className="p-2 rounded-lg bg-[#FAF2DE] dark:bg-[#1C1C17] hover:bg-[#D0E8B2]/60 dark:hover:bg-[#324B10] border border-[#E1E4D5] dark:border-[#43493E] text-right transition-colors active:scale-98 flex flex-col gap-0.5 cursor-pointer"
                          >
                            <span className="text-[11px] font-bold text-[#4A6D22] dark:text-[#D0E8B2]">{item.label}</span>
                            <span className="text-[11px] font-mono text-[#5E6258] dark:text-[#8F9285] truncate text-left" dir="ltr">
                              {item.latex}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {mathCategory === 2 && (
                      <div className="flex flex-wrap gap-1.5">
                        {MATH_SNIPPET_GROUPS[1].items.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => insertMathSnippet(item.latex)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#FAF2DE] dark:bg-[#1C1C17] hover:bg-[#D0E8B2] hover:text-[#1A3700] dark:hover:bg-[#324B10] dark:hover:text-[#D0E8B2] border border-[#E1E4D5] dark:border-[#43493E] text-xs text-[#1A1C16] dark:text-[#E2E3DC] transition-colors active:scale-95 cursor-pointer font-medium"
                            title={item.latex}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {mathCategory === 3 && (
                      <div className="flex flex-wrap gap-1.5">
                        {MATH_SNIPPET_GROUPS[2].items.map((item) => (
                          <button
                            key={item.label + item.latex}
                            type="button"
                            onClick={() => insertMathSnippet(item.latex)}
                            className="px-2 py-1 rounded-lg bg-[#FAF2DE] dark:bg-[#1C1C17] hover:bg-[#D0E8B2] hover:text-[#1A3700] dark:hover:bg-[#324B10] dark:hover:text-[#D0E8B2] border border-[#E1E4D5] dark:border-[#43493E] text-xs text-[#1A1C16] dark:text-[#E2E3DC] transition-colors active:scale-95 cursor-pointer flex items-center gap-1"
                            title={item.latex}
                          >
                            {item.display ? (
                              <span className="font-bold text-sm text-[#4A6D22] dark:text-[#D0E8B2]">{item.display}</span>
                            ) : null}
                            <span className="text-[10px] text-[#5E6258] dark:text-[#8F9285]">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Textarea for math formula */}
              <div dir="ltr">
                <textarea
                  ref={(el) => {
                    mathAreaRef.current = el;
                    if (el) {
                      el.style.height = 'auto';
                      el.style.height = `${Math.max(48, el.scrollHeight)}px`;
                    }
                  }}
                  value={block.text}
                  placeholder="x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"
                  rows={Math.max(2, (block.text || '').split('\n').length)}
                  onChange={(e) => onUpdate(block.id, { text: e.target.value })}
                  onInput={(e) => {
                    e.currentTarget.style.height = 'auto';
                    e.currentTarget.style.height = `${Math.max(48, e.currentTarget.scrollHeight)}px`;
                  }}
                  className="w-full bg-transparent resize-none outline-none font-mono text-xs sm:text-sm text-[#1A1C16] dark:text-[#E2E3DC] placeholder:text-[#8F9285] leading-relaxed overflow-hidden field-sizing-content"
                  style={{ minHeight: '3rem' }}
                />
              </div>

              {block.text && (
                <div className="mt-2 pt-2 border-t border-[#E1E4D5] dark:border-[#43493E] overflow-x-auto text-center" dir="ltr">
                  <MathRenderer text={`$$${block.text}$$`} />
                </div>
              )}
            </div>
          </div>
        );
      case 'divider':
        return (
          <div className="py-2">
            <hr className="border-dashed border-[#E1E4D5] dark:border-[#43493E]" />
          </div>
        );
      case 'media':
        return attachment ? (
          <div className="space-y-1.5">
            <MediaFrame
              attachment={attachment}
              caption={block.caption}
              width={block.width}
              onZoom={attachment.type === 'image' ? onZoomImage : undefined}
            />
            <textarea
              value={block.caption || ''}
              placeholder="توضیح زیر تصویر یا رسانه (اختیاری)..."
              rows={Math.max(1, (block.caption || '').split('\n').length)}
              onChange={(e) => onUpdate(block.id, { caption: e.target.value })}
              onInput={(e) => {
                e.currentTarget.style.height = 'auto';
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
              }}
              ref={(el) => {
                if (el) {
                  el.style.height = 'auto';
                  el.style.height = `${el.scrollHeight}px`;
                }
              }}
              className="w-full text-center text-xs text-[#5E6258] dark:text-[#8F9285] bg-transparent outline-none border-b border-transparent focus:border-[#4A6D22]/40 pb-0.5 resize-none overflow-hidden"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onPickMedia(block.id)}
            className="w-full py-6 rounded-2xl border-2 border-dashed border-[#E1E4D5] dark:border-[#43493E] hover:border-[#4A6D22] text-xs text-[#8F9285] flex flex-col items-center gap-1.5 transition-colors"
          >
            <span>انتخاب تصویر یا ویدیو برای این بلوک</span>
          </button>
        );
      case 'checklist': {
        const items = block.items || [];
        return (
          <div className="space-y-2">
            <div className="p-3 rounded-2xl bg-[#F5F6EE] dark:bg-[#1C1C17] border border-[#E1E4D5] dark:border-[#43493E] space-y-1.5">
              {items.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2 group/chk">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={(e) =>
                      onUpdate(block.id, {
                        items: items.map((i) => (i.id === item.id ? { ...i, done: e.target.checked } : i)),
                      })
                    }
                    className="w-4 h-4 rounded accent-[#4A6D22] dark:accent-[#D0E8B2] cursor-pointer"
                  />
                  <RichInlineEditor
                    singleLine
                    dataCheckItem={item.id}
                    value={item.text}
                    placeholder="مورد چک‌لیست..."
                    searchQuery={searchQuery}
                    onChange={(nextText) =>
                      onUpdate(block.id, {
                        items: items.map((i) => (i.id === item.id ? { ...i, text: nextText } : i)),
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const newItemId = `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                        const newItem = { id: newItemId, text: '', done: false };
                        const nextItems = [...items];
                        nextItems.splice(idx + 1, 0, newItem);
                        onUpdate(block.id, { items: nextItems });
                        setTimeout(() => {
                          const nextInput = document.querySelector<HTMLElement>(`[data-check-item="${newItemId}"]`);
                          nextInput?.focus();
                        }, 40);
                      } else if (e.key === 'Backspace' && item.text === '' && items.length > 1) {
                        e.preventDefault();
                        const prevItem = items[idx - 1];
                        onUpdate(block.id, { items: items.filter((i) => i.id !== item.id) });
                        if (prevItem) {
                          setTimeout(() => {
                            const prevInput = document.querySelector<HTMLElement>(`[data-check-item="${prevItem.id}"]`);
                            prevInput?.focus();
                          }, 40);
                        }
                      }
                    }}
                    className={`flex-1 text-xs ${
                      item.done ? 'line-through text-[#8F9285]' : 'text-[#1A1C16] dark:text-[#E2E3DC]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => onUpdate(block.id, { items: items.filter((i) => i.id !== item.id) })}
                    className={`w-6 h-6 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#8F9285] transition-opacity ${
                      active ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                    } sm:group-hover/chk:opacity-100 sm:group-hover/chk:pointer-events-auto`}
                    title="حذف مورد"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      }
      case 'table':
        return (
          <TableEditor
            data={block.table || createTableData(3, 3)}
            active={active}
            onUpdate={(d) => onUpdate(block.id, { table: d })}
            searchQuery={searchQuery}
          />
        );
      case 'mediaGallery':
        return (
          <MediaGalleryEditor
            items={block.gallery?.items || []}
            attachments={attachments}
            onUpdateItems={(items) => onUpdate(block.id, { gallery: { items } })}
            onAdd={() => onAddGalleryItems(block.id)}
            onReplace={(idx) => onReplaceGalleryItem(block.id, idx)}
            onRemoveItem={(idx) => onRemoveGalleryItem(block.id, idx)}
            onZoom={onZoomImage}
            active={active}
          />
        );
      default:
        return (
          <div className="text-xs sm:text-sm leading-[1.9] text-[#24292F] dark:text-[#D1D5DB]">
            {textArea('متن خود را بنویسید...')}
          </div>
        );
    }
  };

  return (
    <div
      className={`group/block relative rounded-2xl transition-all ${
        dragging ? 'drop-shadow-xl' : 'hover:bg-[#EDEEEB]/70 dark:hover:bg-[#1C1C17]/50'
      }`}
      onFocusCapture={() => onActivateChange(true)}
      onClick={() => onActivateChange(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) onActivateChange(false);
      }}
    >
      {/* Block control rail (drag + reorder + delete) in the left gutter */}
      <div className={`flex flex-col items-center gap-0.5 absolute left-0.5 top-2 z-10 transition-opacity ${
        active ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      } sm:group-hover/block:opacity-100 sm:group-hover/block:pointer-events-auto`}>
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            setDragging(true);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/block-id', block.id);
          }}
          onDragEnd={() => setDragging(false)}
          onTouchStart={(e) => {
            dragTouchY.current = e.touches[0].clientY;
            setDragging(true);
          }}
          onTouchMove={(e) => {
            if (dragTouchY.current === null) return;
            const delta = e.touches[0].clientY - dragTouchY.current;
            if (Math.abs(delta) > 40) {
              onMove(block.id, delta > 0 ? 1 : -1);
              dragTouchY.current = e.touches[0].clientY;
            }
          }}
          onTouchEnd={() => {
            dragTouchY.current = null;
            setDragging(false);
          }}
          onTouchCancel={() => {
            dragTouchY.current = null;
            setDragging(false);
          }}
          className="w-6 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing text-[#8F9285] hover:text-[#5E6258] dark:hover:text-[#BCC2B2] transition-colors touch-none"
          title="جابجایی"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => onMove(block.id, -1)} className={railBtn} title="انتقال به بالا">
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => onMove(block.id, 1)} className={railBtn} title="انتقال به پایین">
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={() => onDelete(block.id)} className={`${railBtn} hover:!text-[#A64D3B]`} title="حذف">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="pr-1 pl-6">{renderBody()}</div>

      {/* Label + quick actions for this block */}
      <div className={`flex items-center gap-2 mt-0.5 transition-opacity ${
        active ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      } sm:group-hover/block:opacity-100 sm:group-hover/block:pointer-events-auto flex-wrap`}>
        <span className="text-[9px] text-[#8F9285] font-semibold">{BLOCK_LABELS[block.type]}</span>

        {block.type === 'media' && (
          <>
            <button type="button" onClick={() => onPickMedia(block.id)} className="text-[9px] font-bold text-[#4A6D22] dark:text-[#D0E8B2] hover:underline">
              تغییر رسانه
            </button>
            <span className="flex items-center gap-1.5 text-[9px] text-[#8F9285]">
              عرض:
              <input
                type="range"
                min={30}
                max={100}
                value={block.width || 100}
                onChange={(e) => onUpdate(block.id, { width: Number(e.target.value) })}
                className="w-16 h-1.5 accent-[#4A6D22] dark:accent-[#D0E8B2] cursor-pointer"
              />
              <span className="text-[9px] font-bold text-[#4A6D22] dark:text-[#D0E8B2] tabular-nums" dir="ltr">
                {block.width || 100}%
              </span>
            </span>
          </>
        )}
        {block.type === 'heading' && (
          <div className="flex items-center gap-0.5">
            {[1, 2, 3].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => onUpdate(block.id, { level: lvl as 1 | 2 | 3 })}
                className={`w-4 h-4 rounded text-[9px] font-bold ${
                  (block.level || 2) === lvl ? 'bg-[#D0E8B2] text-[#1A3700]' : 'text-[#8F9285]'
                }`}
              >
                H{lvl}
              </button>
            ))}
          </div>
        )}
        {block.type === 'math' && (
          <button
            type="button"
            onClick={() => setMathPaletteOpen((prev) => !prev)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold transition-colors cursor-pointer ${
              mathPaletteOpen
                ? 'bg-[#4A6D22] text-white dark:bg-[#D0E8B2] dark:text-[#1A3700]'
                : 'bg-black/5 dark:bg-white/5 text-[#4A6D22] dark:text-[#D0E8B2] hover:bg-[#D0E8B2] hover:text-[#1A3700]'
            }`}
            title="فرمول‌ها و نمادهای آماده"
          >
            <Sigma className="w-3 h-3" />
            <span>{mathPaletteOpen ? 'بستن فرمول‌ها' : 'فرمول‌های آماده'}</span>
          </button>
        )}
        <span className="hidden sm:inline mr-auto text-[9px] text-[#8F9285]">⌘/Ctrl+Enter برای افزودن بلوک بعدی</span>
      </div>
    </div>
  );
};
