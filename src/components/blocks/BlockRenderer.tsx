import React, { useState } from 'react';
import { CheckSquare, ListChecks, Square, X } from 'lucide-react';
import { NoteAttachment, NoteBlock } from '../../types';
import { CALLOUT_STYLES } from '../../lib/blocks';
import { TABLE_COLOR_MAP } from '../../constants';
import { MathRenderer } from '../MathRenderer';
import { InlineText } from './InlineText';
import { MediaFrame } from './MediaFrame';
import { MediaGalleryRenderer } from './MediaGalleryRenderer';
import { BlockShapesContainer } from './BlockShapesContainer';

interface BlockRendererProps {
  blocks: NoteBlock[];
  attachments?: NoteAttachment[];
  clampHeight?: number;
  onToggleChecklistItem?: (blockId: string, itemId: string) => void;
  // Compact media rows — used on note cards so attachment files read as light
  // rows beside boxed sections like the checklist.
  compact?: boolean;
  isPrint?: boolean;
}

const HEADING_CLASS: Record<number, string> = {
  1: 'text-base sm:text-lg font-extrabold',
  2: 'text-sm sm:text-base font-bold',
  3: 'text-xs sm:text-sm font-bold',
};

export const BlockRenderer: React.FC<BlockRendererProps> = ({
  blocks,
  attachments = [],
  clampHeight,
  onToggleChecklistItem,
  compact = false,
  isPrint = false,
}) => {
  const [zoomed, setZoomed] = useState<string | null>(null);
  const attachmentMap = new Map(attachments.map((a) => [a.id, a]));

  const renderBlock = (block: NoteBlock) => {
    // Check if block has embedded shapes
    const hasShapes = Boolean(block.shape || (block.shapes && block.shapes.length > 0));

    switch (block.type) {
      case 'heading': {
        const level = block.level || 2;
        return (
          <div key={block.id} className="block-wrapper">
            <div className={`${HEADING_CLASS[level]} ${isPrint ? 'text-[#1A1C16]' : 'text-[#1A1C16] dark:text-[#E2E3DC]'} pt-1`}>
              <InlineText text={block.text} isPrint={isPrint} />
            </div>
            {hasShapes && <BlockShapesContainer block={block} compact={compact} />}
          </div>
        );
      }

      case 'quote':
        return (
          <div key={block.id} className="block-wrapper">
            <blockquote
              className={`border-r-3 ${
                isPrint
                  ? 'border-[#4A6D22] text-[#2C3327] bg-[#F8FAF5] pr-3 py-1.5'
                  : 'border-[#D0E8B2] dark:border-[#4A6D22] pr-3 py-0.5 text-[#3F4A35] dark:text-[#BCC2B2]'
              } text-xs sm:text-sm italic whitespace-pre-wrap`}
              style={
                isPrint
                  ? {
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                    }
                  : undefined
              }
            >
              <InlineText text={block.text} isPrint={isPrint} />
            </blockquote>
            {hasShapes && <BlockShapesContainer block={block} compact={compact} />}
          </div>
        );

      case 'callout': {
        const style = CALLOUT_STYLES[block.tone || 'info'];
        return (
          <div key={block.id} className="block-wrapper">
            <div
              className={`flex gap-2.5 items-start p-3 rounded-2xl border ${style.light} ${isPrint ? '' : style.dark} text-xs sm:text-sm`}
              style={
                isPrint
                  ? {
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                    }
                  : undefined
              }
            >
              <span className="flex items-center pt-0.5"><style.icon className="w-4 h-4" /></span>
              <div className={`min-w-0 flex-1 leading-relaxed whitespace-pre-wrap ${style.text}`}>
                <InlineText text={block.text} isPrint={isPrint} />
              </div>
            </div>
            {hasShapes && <BlockShapesContainer block={block} compact={compact} />}
          </div>
        );
      }

      case 'code':
        return (
          <div key={block.id} className="block-wrapper">
            <pre
              dir="ltr"
              className={`p-3 rounded-2xl ${
                isPrint
                  ? 'bg-[#F8FAFC] text-[#0F172A] border-[#CBD5E1]'
                  : 'bg-[#1C1C17] dark:bg-[#0F110C] text-[#E2E3DC] border-[#43493E]'
              } text-[11px] sm:text-xs overflow-x-auto border font-mono leading-relaxed print:bg-[#F8FAFC] print:text-[#0F172A] print:border-[#CBD5E1]`}
              style={
                isPrint
                  ? {
                      backgroundColor: '#F8FAFC',
                      color: '#0F172A',
                      borderColor: '#CBD5E1',
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                      pageBreakInside: 'avoid',
                      breakInside: 'avoid',
                    }
                  : undefined
              }
            >
              <code style={isPrint ? { color: '#0F172A', background: 'transparent' } : undefined}>{block.text}</code>
            </pre>
            {hasShapes && <BlockShapesContainer block={block} compact={compact} />}
          </div>
        );

      case 'math':
        return (
          <div key={block.id} className="block-wrapper">
            <div className="py-1 overflow-x-auto text-center" dir="ltr">
              <MathRenderer text={`$$${block.text}$$`} />
            </div>
            {hasShapes && <BlockShapesContainer block={block} compact={compact} />}
          </div>
        );

      case 'divider':
        return (
          <div key={block.id} className="block-wrapper">
            <hr className="my-2 border-dashed border-[#E1E4D5] dark:border-[#43493E]" />
            {hasShapes && <BlockShapesContainer block={block} compact={compact} />}
          </div>
        );

      case 'media': {
        const attachment = block.attachmentId ? attachmentMap.get(block.attachmentId) : undefined;
        if (!attachment) return null;
        return (
          <div key={block.id} className="block-wrapper">
            <MediaFrame
              attachment={attachment}
              caption={block.caption}
              width={block.width}
              onZoom={attachment.type === 'image' ? setZoomed : undefined}
              compact={compact}
            />
            {hasShapes && <BlockShapesContainer block={block} compact={compact} />}
          </div>
        );
      }

      case 'shape': {
        return (
          <div key={block.id} className="block-wrapper py-1">
            <BlockShapesContainer block={block} compact={compact} />
          </div>
        );
      }

      case 'checklist': {
        const items = block.items || [];
        const done = items.filter((i) => i.done).length;
        const complete = items.length > 0 && done === items.length;
        return (
          <div key={block.id} className="block-wrapper space-y-2">
            <div
              className="p-3 rounded-2xl bg-[#F5F6EE] dark:bg-[#1C1C17] border border-[#E1E4D5] dark:border-[#43493E] space-y-1.5"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#5E6258] dark:text-[#8F9285]">
                <ListChecks className="w-3.5 h-3.5" />
                <span>چک‌لیست</span>
                <span
                  dir="ltr"
                  className={`px-1.5 py-0.5 rounded-full transition-colors ${
                    complete
                      ? 'bg-[#4A6D22] text-white dark:bg-[#D0E8B2] dark:text-[#1A3700]'
                      : 'bg-[#EDEEEB] dark:bg-[#0F110C]'
                  }`}
                >
                  {done}/{items.length}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#E1E4D5] dark:border-[#43493E] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#4A6D22] dark:bg-[#D0E8B2] transition-all"
                  style={{ width: items.length ? `${(done / items.length) * 100}%` : '0%' }}
                />
              </div>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleChecklistItem?.(block.id, item.id);
                  }}
                  disabled={!onToggleChecklistItem}
                  className={`w-full flex items-start gap-2 text-right text-xs group/chk rounded-lg px-1 py-0.5 transition-colors ${
                    onToggleChecklistItem
                      ? 'cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                      : 'disabled:cursor-default'
                  }`}
                >
                  {item.done ? (
                    <CheckSquare className="w-4 h-4 shrink-0 mt-0.5 text-[#4A6D22] dark:text-[#D0E8B2]" />
                  ) : (
                    <Square className="w-4 h-4 shrink-0 mt-0.5 text-[#8F9285]" />
                  )}
                  <span
                    className={
                      item.done
                        ? 'line-through text-[#8F9285]'
                        : isPrint
                        ? 'text-[#1A1C16]'
                        : 'text-[#1A1C16] dark:text-[#E2E3DC] group-hover/chk:text-[#4A6D22] dark:group-hover/chk:text-[#D0E8B2]'
                    }
                  >
                    <InlineText text={item.text || '—'} isPrint={isPrint} />
                  </span>
                </button>
              ))}
            </div>
            {hasShapes && <BlockShapesContainer block={block} compact={compact} />}
          </div>
        );
      }

      case 'table': {
        const t = block.table;
        if (!t) return null;
        const cells = t.cells || [];
        return (
          <div key={block.id} className="block-wrapper space-y-2">
            <div className={`overflow-x-auto rounded-2xl border ${isPrint ? 'border-[#CBD5E1]' : 'border-[#E1E4D5] dark:border-[#43493E]'}`}>
              <table className="border-collapse w-full text-xs sm:text-sm">
                <tbody>
                  {Array.from({ length: t.rows }, (_, r) => (
                    <tr key={r}>
                      {Array.from({ length: t.cols }, (_, c) => {
                        const cell = cells[r * t.cols + c] || { text: '', color: '' };
                        const color = TABLE_COLOR_MAP[cell.color || ''];
                        return (
                          <td
                            key={c}
                            className={`border ${isPrint ? 'border-[#CBD5E1] text-[#1A1C16]' : 'border-[#E1E4D5] dark:border-[#43493E]'} px-2 py-1.5 align-top ${
                              color ? `${color.light} ${isPrint ? '' : color.dark}` : ''
                            } ${t.header && r === 0 ? (isPrint ? 'bg-[#F1F5F9] font-bold text-[#0F172A]' : 'bg-black/[0.04] dark:bg-white/[0.06] font-bold') : ''}`}
                            style={isPrint ? { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } : undefined}
                          >
                            <InlineText text={cell.text} isPrint={isPrint} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasShapes && <BlockShapesContainer block={block} compact={compact} />}
          </div>
        );
      }

      case 'mediaGallery': {
        const g = block.gallery;
        if (!g || !g.items.length) return null;
        return (
          <div key={block.id} className="block-wrapper my-1">
            <MediaGalleryRenderer gallery={g} attachments={attachments} onZoom={setZoomed} />
            {hasShapes && <BlockShapesContainer block={block} compact={compact} />}
          </div>
        );
      }

      case 'shape':
        return (
          <div key={block.id} className="block-wrapper space-y-1">
            <BlockShapesContainer block={block} compact={compact} />
            {block.text && (
              <div className={`text-xs ${isPrint ? 'text-[#1A1C16]' : 'text-[#24292F] dark:text-[#D1D5DB]'} pt-1`}>
                <InlineText text={block.text} isPrint={isPrint} />
              </div>
            )}
          </div>
        );

      default:
        return (
          <div key={block.id} className="block-wrapper">
            {/* Floated shapes if any */}
            {hasShapes && <BlockShapesContainer block={block} alignmentFilter="float" compact={compact} />}
            <div
              className={`text-xs sm:text-sm leading-[1.9] ${
                isPrint ? 'text-[#1A1C16]' : 'text-[#24292F] dark:text-[#D1D5DB]'
              } whitespace-pre-wrap`}
            >
              <InlineText text={block.text} isPrint={isPrint} />
            </div>
            {/* Inline / block shapes */}
            {hasShapes && <BlockShapesContainer block={block} alignmentFilter="inline" compact={compact} />}
          </div>
        );
    }
  };

  return (
    <>
      <div
        className="space-y-2.5"
        style={clampHeight ? { maxHeight: clampHeight, overflow: 'hidden', maskImage: 'linear-gradient(to bottom, black 70%, transparent)' } : undefined}
      >
        {blocks.map(renderBlock)}
      </div>

      {zoomed && (
        <div
          className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => {
            e.stopPropagation();
            setZoomed(null);
          }}
        >
          <button
            type="button"
            onClick={() => setZoomed(null)}
            className="absolute top-4 left-4 p-2.5 rounded-2xl bg-white/15 text-white hover:bg-white/30"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={zoomed}
            alt="نمایش کامل تصویر"
            className="max-w-full max-h-[88vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
