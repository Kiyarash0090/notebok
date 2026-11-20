import React, { useState, useRef } from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Highlighter,
  Code,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Lightbulb,
  ListChecks,
  Sigma,
  Table,
  ImagePlus,
  Mic,
  ClipboardPaste,
  Minus,
  ChevronDown,
  Undo2,
  Redo2,
  Check,
} from 'lucide-react';
import { NoteBlock } from '../../types';
import { HIGHLIGHT_COLOR_LIST, HIGHLIGHT_COLORS, HighlightColorId } from '../../lib/richText';

interface EditorToolbarProps {
  onCommand: (command: string) => void;
  onInsertBlock: (type: NoteBlock['type'], overrides?: Partial<NoteBlock>) => void;
  onAddMedia: () => void;
  onRecord: () => void;
  onImportText: () => void;
  activeMarks?: Set<string>;
  highlightColor?: HighlightColorId;
  onSelectHighlightColor?: (color: HighlightColorId) => void;
  activeHighlightColor?: HighlightColorId | null;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

const groupClass = 'flex items-center gap-0.5 bg-[#EDEEEB] dark:bg-[#1C1C17] rounded-2xl p-1 shrink-0';
const btnClass =
  'w-8 h-8 rounded-xl flex items-center justify-center text-[#3F4A35] dark:text-[#BCC2B2] hover:bg-[#D0E8B2] dark:hover:bg-[#324B10] hover:text-[#1A3700] dark:hover:text-[#D0E8B2] transition-all active:scale-90';

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onCommand,
  onInsertBlock,
  onAddMedia,
  onRecord,
  onImportText,
  activeMarks,
  highlightColor = 'yellow',
  onSelectHighlightColor,
  activeHighlightColor,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}) => {
  const [highlightMenuPos, setHighlightMenuPos] = useState<{ top: number; left: number } | null>(null);
  const highlightTriggerRef = useRef<HTMLDivElement | null>(null);

  const toggleHighlightMenu = () => {
    if (highlightMenuPos) {
      setHighlightMenuPos(null);
      return;
    }
    const rect = highlightTriggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 176;
    const clampedLeft = Math.max(
      12,
      Math.min(window.innerWidth - menuWidth - 12, rect.left + rect.width / 2 - menuWidth / 2)
    );
    setHighlightMenuPos({
      top: rect.bottom + 8,
      left: clampedLeft,
    });
  };

  const preHighlightMarks: { key: string; title: string; icon: React.ReactNode }[] = [
    { key: 'bold', title: 'ضخیم (Ctrl+B)', icon: <Bold className="w-4 h-4" /> },
    { key: 'italic', title: 'مورب (Ctrl+I)', icon: <Italic className="w-4 h-4" /> },
    { key: 'strike', title: 'خط‌خورده (Ctrl+Shift+X)', icon: <Strikethrough className="w-4 h-4" /> },
  ];
  const currentSwatchColor = HIGHLIGHT_COLORS[activeHighlightColor || highlightColor].swatch;

  const blocks: { title: string; icon: React.ReactNode; run: () => void }[] = [
    { title: 'متن ساده', icon: <Type className="w-4 h-4" />, run: () => onInsertBlock('paragraph') },
    { title: 'تیتر بزرگ', icon: <Heading1 className="w-4 h-4" />, run: () => onInsertBlock('heading', { level: 1 }) },
    { title: 'تیتر متوسط', icon: <Heading2 className="w-4 h-4" />, run: () => onInsertBlock('heading', { level: 2 }) },
    { title: 'تیتر کوچک', icon: <Heading3 className="w-4 h-4" />, run: () => onInsertBlock('heading', { level: 3 }) },
    { title: 'نقل قول', icon: <Quote className="w-4 h-4" />, run: () => onInsertBlock('quote') },
    {
      title: 'کادر تأکید',
      icon: <Lightbulb className="w-4 h-4" />,
      run: () => onInsertBlock('callout', { tone: 'tip' }),
    },
    { title: 'چک‌لیست', icon: <ListChecks className="w-4 h-4" />, run: () => onInsertBlock('checklist') },
    { title: 'فرمول ریاضی', icon: <Sigma className="w-4 h-4" />, run: () => onInsertBlock('math') },
    { title: 'بلوک کد', icon: <Code className="w-4 h-4" />, run: () => onInsertBlock('code') },
    { title: 'جدول', icon: <Table className="w-4 h-4" />, run: () => onInsertBlock('table') },
    { title: 'افزودن رسانه', icon: <ImagePlus className="w-4 h-4" />, run: onAddMedia },
    { title: 'ضبط صدا', icon: <Mic className="w-4 h-4" />, run: onRecord },
    { title: 'ایمپورت متن', icon: <ClipboardPaste className="w-4 h-4" />, run: onImportText },
    { title: 'جداکننده', icon: <Minus className="w-4 h-4" />, run: () => onInsertBlock('divider') },
  ];

  return (
    <div data-toolbar className="sticky top-0 z-40 py-2 bg-[#FAF9F5]/95 dark:bg-[#12140E]/95 backdrop-blur-md">
      <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto md:flex-wrap md:overflow-x-visible">
        {/* Undo / Redo */}
        {(onUndo || onRedo) && (
          <>
            <div className={groupClass}>
              <button
                type="button"
                disabled={!canUndo}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onUndo?.()}
                className={`${btnClass} disabled:opacity-35 disabled:pointer-events-none`}
                title="بازگشت (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={!canRedo}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onRedo?.()}
                className={`${btnClass} disabled:opacity-35 disabled:pointer-events-none`}
                title="تکرار تغییر (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>
            <div className="w-px h-6 shrink-0 bg-[#E1E4D5] dark:bg-[#43493E]" />
          </>
        )}

        {/* Formatting Marks */}
        <div className={groupClass}>
          {preHighlightMarks.map((m) => {
            const isActive = activeMarks?.has(m.key);
            return (
              <button
                key={m.key}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onCommand(m.key)}
                className={`${btnClass} ${
                  isActive ? 'bg-[#D0E8B2] dark:bg-[#324B10] text-[#1A3700] dark:text-[#D0E8B2] shadow-2xs' : ''
                }`}
                title={m.title}
              >
                {m.icon}
              </button>
            );
          })}

          {/* Multi-color Highlighter button + color dropdown */}
          <div ref={highlightTriggerRef} className="flex items-center">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onCommand(`highlight:${highlightColor}`)}
              className={`relative ${btnClass} ${
                activeMarks?.has('highlight')
                  ? 'bg-[#D0E8B2] dark:bg-[#324B10] text-[#1A3700] dark:text-[#D0E8B2] shadow-2xs'
                  : ''
              }`}
              title={`هایلایت ${HIGHLIGHT_COLORS[highlightColor].label}`}
            >
              <Highlighter className="w-4 h-4" />
              <span
                className="absolute bottom-1 inset-x-2 h-[3px] rounded-full border border-black/15"
                style={{ backgroundColor: currentSwatchColor }}
              />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={toggleHighlightMenu}
              className="w-5 h-8 rounded-lg flex items-center justify-center text-[#5E6258] dark:text-[#8F9285] hover:bg-[#D0E8B2]/70 dark:hover:bg-[#324B10]/70 transition-colors"
              title="انتخاب رنگ هایلایت"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onCommand('code')}
            className={`${btnClass} ${
              activeMarks?.has('code')
                ? 'bg-[#D0E8B2] dark:bg-[#324B10] text-[#1A3700] dark:text-[#D0E8B2] shadow-2xs'
                : ''
            }`}
            title="کد درون‌خطی"
          >
            <Code className="w-4 h-4" />
          </button>
        </div>

        {highlightMenuPos && (
          <>
            <div
              className="fixed inset-0 z-[90]"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setHighlightMenuPos(null)}
              onTouchStart={() => setHighlightMenuPos(null)}
            />
            <div
              data-toolbar="highlight-palette"
              onMouseDown={(e) => e.preventDefault()}
              style={{ top: `${highlightMenuPos.top}px`, left: `${highlightMenuPos.left}px` }}
              className="fixed z-[100] w-44 bg-[#FAF9F5] dark:bg-[#1C1C17] border border-[#E1E4D5] dark:border-[#43493E] rounded-2xl shadow-2xl p-2 anim-scale-in"
              dir="rtl"
            >
              <div className="text-[10px] font-bold text-[#5E6258] dark:text-[#8F9285] px-1.5 pb-1.5">
                رنگ هایلایت
              </div>
              <div className="grid grid-cols-2 gap-1">
                {HIGHLIGHT_COLOR_LIST.map((cid) => {
                  const cfg = HIGHLIGHT_COLORS[cid];
                  const isSelected = (activeHighlightColor || highlightColor) === cid;
                  return (
                    <button
                      key={cid}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onSelectHighlightColor?.(cid);
                        setHighlightMenuPos(null);
                      }}
                      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                        isSelected
                          ? 'bg-[#D0E8B2]/60 dark:bg-[#324B10]/70 text-[#1A3700] dark:text-[#D0E8B2]'
                          : 'hover:bg-black/5 dark:hover:bg-white/10 text-[#1A1C16] dark:text-[#E2E3DC]'
                      }`}
                    >
                      <span
                        className="w-4 h-4 rounded-full border border-black/15 shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: cfg.swatch }}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 text-[#1A1C16]" />}
                      </span>
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <div className="w-px h-6 shrink-0 bg-[#E1E4D5] dark:bg-[#43493E]" />

        {/* Content Blocks */}
        <div className={`${groupClass} flex-wrap`}>
          {blocks.map((b) => (
            <button
              key={b.title}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={b.run}
              className={btnClass}
              title={b.title}
            >
              {b.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
