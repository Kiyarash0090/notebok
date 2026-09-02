import React, { useRef, useState } from 'react';
import {
  GripVertical,
  Sigma,
  Trash2,
  Italic,
  ArrowUp,
  ArrowDown,
  Square,
  Circle,
  Triangle,
  ArrowRight,
  Minus,
  Star,
  Shapes,
  Plus,
} from 'lucide-react';
import { NoteAttachment, NoteBlock, ShapeConfig, ShapeKind } from '../../types';
import {
  CALLOUT_STYLES,
  BLOCK_LABELS,
  createChecklistItem,
  createTableData,
  createShapeConfig,
  getBlockShapes,
} from '../../lib/blocks';
import { MATH_SNIPPET_GROUPS } from '../../lib/mathSnippets';
import { MathRenderer } from '../MathRenderer';
import { MediaFrame } from '../blocks/MediaFrame';
import { ShapeSvg } from '../blocks/ShapeSvg';
import { BlockShapesContainer } from '../blocks/BlockShapesContainer';
import { TableEditor } from './TableEditor';
import { MediaGalleryEditor } from './MediaGalleryEditor';
import { ShapeCustomizerModal } from './ShapeCustomizerModal';

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
}) => {
  const [dragging, setDragging] = useState(false);
  const [mathPaletteOpen, setMathPaletteOpen] = useState(false);
  const [newShapeModalOpen, setNewShapeModalOpen] = useState(false);
  const mathAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const dragTouchY = useRef<number | null>(null);
  const attachment = block.type === 'media' ? attachments.find((a) => a.id === block.attachmentId) : undefined;

  const shapes = getBlockShapes(block);
  const hasShapes = shapes.length > 0;

  const handleUpdateShapes = (updatedShapes: ShapeConfig[]) => {
    onUpdate(block.id, { shapes: updatedShapes, shape: undefined });
  };

  const handleAddShapeToThisBlock = (shapeConfig: ShapeConfig) => {
    const nextShapes = [...shapes, shapeConfig];
    onUpdate(block.id, { shapes: nextShapes, shape: undefined });
  };

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

  const textArea = (placeholder: string, rows = 1) => (
    <textarea
      value={block.text}
      placeholder={placeholder}
      rows={rows}
      dir="auto"
      data-block-id={block.id}
      onChange={(e) => onUpdate(block.id, { text: e.target.value })}
      onKeyDown={(e) => {
        const atEnd = e.currentTarget.selectionStart === e.currentTarget.value.length;
        if (e.key === 'Enter' && !e.shiftKey && atEnd) {
          e.preventDefault();
          commandExecutor(block.id, 'insert_after');
        } else if (e.key === 'Backspace' && e.currentTarget.value === '' && e.currentTarget.selectionStart === 0) {
          e.preventDefault();
          commandExecutor(block.id, 'merge_up');
        }
      }}
      className="w-full bg-transparent resize-none outline-none placeholder:text-[#8F9285] field-sizing-content"
      style={{ minHeight: '1.75em' }}
    />
  );

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
          <div className="space-y-1">
            <div className={`${fontClass} text-[#1A1C16] dark:text-[#E2E3DC]`}>
              {textArea(level === 1 ? 'تیتر اصلی...' : level === 2 ? 'عنوان بخش...' : 'زیرعنوان...')}
            </div>
            {hasShapes && (
              <BlockShapesContainer
                block={block}
                isEditable={true}
                onUpdateShapes={handleUpdateShapes}
              />
            )}
          </div>
        );
      }
      case 'quote':
        return (
          <div className="space-y-1">
            <div className="border-r-3 border-[#D0E8B2] dark:border-[#4A6D22] pr-3 italic text-xs sm:text-sm text-[#3F4A35] dark:text-[#BCC2B2]">
              {textArea('نقل قول...')}
            </div>
            {hasShapes && (
              <BlockShapesContainer
                block={block}
                isEditable={true}
                onUpdateShapes={handleUpdateShapes}
              />
            )}
          </div>
        );
      case 'callout': {
        const style = CALLOUT_STYLES[block.tone || 'info'];
        return (
          <div className="space-y-1">
            <div className={`flex gap-2.5 items-start p-3 rounded-2xl border ${style.light} ${style.dark} text-xs sm:text-sm`}>
              <span className="flex items-center pt-0.5"><style.icon className="w-4 h-4" /></span>
              <div className={`min-w-0 flex-1 leading-relaxed ${style.text}`}>
                {textArea('متن تأکیدی یا نکته کلیدی...')}
              </div>
            </div>
            {hasShapes && (
              <BlockShapesContainer
                block={block}
                isEditable={true}
                onUpdateShapes={handleUpdateShapes}
              />
            )}
          </div>
        );
      }
      case 'code':
        return (
          <div className="space-y-1">
            <div className="p-3 rounded-2xl bg-[#1C1C17] dark:bg-[#0F110C] text-[#E2E3DC] text-[11px] sm:text-xs border border-[#43493E] font-mono" dir="ltr">
              <textarea
                value={block.text}
                placeholder="// کد خود را اینجا وارد کنید..."
                rows={3}
                onChange={(e) => onUpdate(block.id, { text: e.target.value })}
                className="w-full bg-transparent resize-none outline-none font-mono text-[#E2E3DC] placeholder:text-[#8F9285]"
              />
            </div>
            {hasShapes && (
              <BlockShapesContainer
                block={block}
                isEditable={true}
                onUpdateShapes={handleUpdateShapes}
              />
            )}
          </div>
        );
      case 'math':
        return (
          <div className="space-y-2">
            <div className="p-3 rounded-2xl bg-[#FAF2DE] dark:bg-[#1C1C17] border border-[#E1E4D5] dark:border-[#43493E]" dir="ltr">
              <textarea
                ref={mathAreaRef}
                value={block.text}
                placeholder="x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"
                rows={2}
                onChange={(e) => onUpdate(block.id, { text: e.target.value })}
                className="w-full bg-transparent resize-none outline-none font-mono text-xs text-[#1A1C16] dark:text-[#E2E3DC] placeholder:text-[#8F9285]"
              />
              {block.text && (
                <div className="mt-2 pt-2 border-t border-[#E1E4D5] dark:border-[#43493E] overflow-x-auto text-center">
                  <MathRenderer text={`$$${block.text}$$`} />
                </div>
              )}
            </div>
            {hasShapes && (
              <BlockShapesContainer
                block={block}
                isEditable={true}
                onUpdateShapes={handleUpdateShapes}
              />
            )}
          </div>
        );
      case 'divider':
        return (
          <div className="py-2">
            <hr className="border-dashed border-[#E1E4D5] dark:border-[#43493E]" />
            {hasShapes && (
              <BlockShapesContainer
                block={block}
                isEditable={true}
                onUpdateShapes={handleUpdateShapes}
              />
            )}
          </div>
        );
      case 'media':
        return (
          <div className="space-y-1">
            {attachment ? (
              <div className="space-y-1.5">
                <MediaFrame
                  attachment={attachment}
                  caption={block.caption}
                  width={block.width}
                  onZoom={attachment.type === 'image' ? onZoomImage : undefined}
                />
                <input
                  type="text"
                  value={block.caption || ''}
                  placeholder="توضیح زیر تصویر یا رسانه (اختیاری)..."
                  onChange={(e) => onUpdate(block.id, { caption: e.target.value })}
                  className="w-full text-center text-xs text-[#5E6258] dark:text-[#8F9285] bg-transparent outline-none border-b border-transparent focus:border-[#4A6D22]/40 pb-0.5"
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
            )}
            {hasShapes && (
              <BlockShapesContainer
                block={block}
                isEditable={true}
                onUpdateShapes={handleUpdateShapes}
              />
            )}
          </div>
        );
      case 'checklist': {
        const items = block.items || [];
        return (
          <div className="space-y-2">
            <div className="p-3 rounded-2xl bg-[#F5F6EE] dark:bg-[#1C1C17] border border-[#E1E4D5] dark:border-[#43493E] space-y-1.5">
              {items.map((item) => (
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
                  <input
                    type="text"
                    value={item.text}
                    placeholder="مورد چک‌لیست..."
                    onChange={(e) =>
                      onUpdate(block.id, {
                        items: items.map((i) => (i.id === item.id ? { ...i, text: e.target.value } : i)),
                      })
                    }
                    className={`flex-1 bg-transparent text-xs outline-none ${
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
            {hasShapes && (
              <BlockShapesContainer
                block={block}
                isEditable={true}
                onUpdateShapes={handleUpdateShapes}
              />
            )}
          </div>
        );
      }
      case 'table':
        return (
          <div className="space-y-2">
            <TableEditor
              data={block.table || createTableData(3, 3)}
              active={active}
              onUpdate={(d) => onUpdate(block.id, { table: d })}
            />
            {hasShapes && (
              <BlockShapesContainer
                block={block}
                isEditable={true}
                onUpdateShapes={handleUpdateShapes}
              />
            )}
          </div>
        );
      case 'shape': {
        return (
          <div className="space-y-2">
            <BlockShapesContainer
              block={block}
              isEditable={true}
              onUpdateShapes={handleUpdateShapes}
            />
            <div className="text-xs text-[#24292F] dark:text-[#D1D5DB] pt-1">
              {textArea('متن یا توضیح همراه شکل (اختیاری)...')}
            </div>
          </div>
        );
      }

      case 'mediaGallery':
        return (
          <div className="space-y-2">
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
            {hasShapes && (
              <BlockShapesContainer
                block={block}
                isEditable={true}
                onUpdateShapes={handleUpdateShapes}
              />
            )}
          </div>
        );
      default:
        return (
          <div className="space-y-1">
            {/* Floated shapes */}
            {hasShapes && (
              <BlockShapesContainer
                block={block}
                isEditable={true}
                alignmentFilter="float"
                onUpdateShapes={handleUpdateShapes}
              />
            )}
            <div className="text-xs sm:text-sm leading-[1.9] text-[#24292F] dark:text-[#D1D5DB]">
              {textArea('متن خود را بنویسید...')}
            </div>
            {/* Inline / block shapes */}
            {hasShapes && (
              <BlockShapesContainer
                block={block}
                isEditable={true}
                alignmentFilter="inline"
                onUpdateShapes={handleUpdateShapes}
              />
            )}
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

        {/* Quick Add Shape Button to THIS block */}
        <button
          type="button"
          onClick={() => setNewShapeModalOpen(true)}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-[#D0E8B2] hover:text-[#1A3700] text-[9px] font-bold text-[#4A6D22] dark:text-[#D0E8B2] transition-colors"
          title="افزودن شکل ورد به این بلوک"
        >
          <Shapes className="w-3 h-3" />
          <span>+ شکل</span>
        </button>

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
        <span className="hidden sm:inline mr-auto text-[9px] text-[#8F9285]">⌘/Ctrl+Enter برای افزودن بلوک بعدی</span>
      </div>

      {/* Modal for adding a new shape to this specific block */}
      {newShapeModalOpen && (
        <ShapeCustomizerModal
          isOpen={true}
          shape={createShapeConfig('rect')}
          onSave={(createdShape) => {
            handleAddShapeToThisBlock(createdShape);
            setNewShapeModalOpen(false);
          }}
          onClose={() => setNewShapeModalOpen(false)}
        />
      )}
    </div>
  );
};
