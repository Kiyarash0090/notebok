import React, { useState, useRef, useEffect } from 'react';
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
  Square,
  Circle,
  Triangle,
  ArrowRight,
  ArrowLeft,
  MoveHorizontal,
  Star,
  MessageSquare,
  Cloud,
  Heart,
  Award,
  Layers,
  ChevronDown,
  Shapes,
  Sparkles,
} from 'lucide-react';
import { NoteBlock, ShapeKind } from '../../types';

interface EditorToolbarProps {
  onCommand: (command: string) => void;
  onInsertBlock: (type: NoteBlock['type'], overrides?: Partial<NoteBlock>) => void;
  onInsertShape?: (kind: ShapeKind) => void;
  onAddMedia: () => void;
  onRecord: () => void;
  onImportText: () => void;
}

const groupClass = 'flex items-center gap-0.5 bg-[#EDEEEB] dark:bg-[#1C1C17] rounded-2xl p-1 shrink-0';
const btnClass =
  'w-8 h-8 rounded-xl flex items-center justify-center text-[#3F4A35] dark:text-[#BCC2B2] hover:bg-[#D0E8B2] dark:hover:bg-[#324B10] hover:text-[#1A3700] dark:hover:text-[#D0E8B2] transition-all active:scale-90';

const SHAPE_CATEGORIES: {
  category: string;
  items: { kind: ShapeKind; label: string; icon: React.ReactNode }[];
}[] = [
  {
    category: 'کادر متنی و اشکال پایه',
    items: [
      { kind: 'textbox', label: 'کادر متنی (Text Box)', icon: <Type className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2]" /> },
      { kind: 'rect', label: 'مستطیل', icon: <Square className="w-4 h-4" /> },
      { kind: 'roundedRect', label: 'گوشه‌گرد', icon: <Square className="w-4 h-4 rounded-md" /> },
      { kind: 'circle', label: 'دایره', icon: <Circle className="w-4 h-4" /> },
      { kind: 'triangle', label: 'مثلث', icon: <Triangle className="w-4 h-4" /> },
      { kind: 'diamond', label: 'لوزی', icon: <Layers className="w-4 h-4 rotate-45" /> },
      { kind: 'hexagon', label: 'شش‌ضلعی', icon: <Layers className="w-4 h-4" /> },
    ],
  },
  {
    category: 'فلش‌ها و خطوط',
    items: [
      { kind: 'arrow', label: 'فلش جلو', icon: <ArrowLeft className="w-4 h-4" /> },
      { kind: 'leftArrow', label: 'فلش برگشت', icon: <ArrowRight className="w-4 h-4" /> },
      { kind: 'doubleArrow', label: 'فلش دوطرفه', icon: <MoveHorizontal className="w-4 h-4" /> },
      { kind: 'line', label: 'خط جداکننده', icon: <Minus className="w-4 h-4" /> },
    ],
  },
  {
    category: 'برچسب و نمادها',
    items: [
      { kind: 'callout', label: 'کادر پیام', icon: <MessageSquare className="w-4 h-4" /> },
      { kind: 'cloud', label: 'ابر اندیشه', icon: <Cloud className="w-4 h-4" /> },
      { kind: 'star', label: 'ستاره', icon: <Star className="w-4 h-4" /> },
      { kind: 'heart', label: 'قلب', icon: <Heart className="w-4 h-4" /> },
      { kind: 'badge', label: 'مدال / روبان', icon: <Award className="w-4 h-4" /> },
    ],
  },
];

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onCommand,
  onInsertBlock,
  onInsertShape,
  onAddMedia,
  onRecord,
  onImportText,
}) => {
  const [shapesMenuOpen, setShapesMenuOpen] = useState(false);
  const shapesMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (shapesMenuRef.current && !shapesMenuRef.current.contains(e.target as Node)) {
        setShapesMenuOpen(false);
      }
    };
    if (shapesMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [shapesMenuOpen]);

  const handleSelectShape = (kind: ShapeKind) => {
    if (onInsertShape) {
      onInsertShape(kind);
    } else {
      onInsertBlock('shape', { shape: { kind, color: '#4A6D22' } });
    }
    setShapesMenuOpen(false);
  };

  const marks: { key: string; title: string; icon: React.ReactNode }[] = [
    { key: 'bold', title: 'ضخیم (Ctrl+B)', icon: <Bold className="w-4 h-4" /> },
    { key: 'italic', title: 'مورب (Ctrl+I)', icon: <Italic className="w-4 h-4" /> },
    { key: 'strike', title: 'خط‌خورده (Ctrl+Shift+X)', icon: <Strikethrough className="w-4 h-4" /> },
    { key: 'highlight', title: 'خط‌کشی / هایلایت', icon: <Highlighter className="w-4 h-4" /> },
    { key: 'code', title: 'کد درون‌خطی', icon: <Code className="w-4 h-4" /> },
  ];

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

  // Quick shapes for direct one-click insertion from toolbar
  const quickShapes: { key: ShapeKind; title: string; icon: React.ReactNode }[] = [
    { key: 'textbox', title: 'کادر متنی آزاد (Text Box)', icon: <Type className="w-4 h-4" /> },
    { key: 'rect', title: 'مستطیل', icon: <Square className="w-4 h-4" /> },
    { key: 'circle', title: 'دایره', icon: <Circle className="w-4 h-4" /> },
    { key: 'arrow', title: 'فلش', icon: <ArrowLeft className="w-4 h-4" /> },
    { key: 'star', title: 'ستاره', icon: <Star className="w-4 h-4" /> },
  ];

  return (
    <div data-toolbar className="sticky top-0 z-40 py-2 bg-[#FAF9F5]/95 dark:bg-[#12140E]/95 backdrop-blur-md">
      <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto md:flex-wrap md:overflow-x-visible">
        {/* Formatting Marks */}
        <div className={groupClass}>
          {marks.map((m) => (
            <button
              key={m.key}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onCommand(m.key)}
              className={btnClass}
              title={m.title}
            >
              {m.icon}
            </button>
          ))}
        </div>

        <div className="w-px h-6 shrink-0 bg-[#E1E4D5] dark:bg-[#43493E]" />

        {/* Word-like Shapes Menu & Quick Tools */}
        <div className="relative shrink-0" ref={shapesMenuRef}>
          <div className={groupClass}>
            {/* Shapes Dropdown Trigger */}
            <button
              type="button"
              onClick={() => setShapesMenuOpen((prev) => !prev)}
              className="flex items-center gap-1 px-2 h-8 rounded-xl bg-[#D0E8B2]/50 dark:bg-[#324B10]/50 text-[#1A3700] dark:text-[#D0E8B2] hover:bg-[#D0E8B2] text-xs font-bold transition-all"
              title="اشکال (Word Shapes)"
            >
              <Shapes className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">اشکال</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {/* Quick direct shape buttons */}
            {quickShapes.map((s) => (
              <button
                key={s.key}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelectShape(s.key)}
                className={btnClass}
                title={`افزودن ${s.title} به بلوک فعال`}
              >
                {s.icon}
              </button>
            ))}
          </div>

          {/* Word-like Shapes Popover Menu */}
          {shapesMenuOpen && (
            <>
              {/* Tap anywhere outside to close menu backdrop */}
              <div
                className="fixed inset-0 z-[90] bg-black/5 sm:bg-transparent"
                onClick={() => setShapesMenuOpen(false)}
                onTouchStart={() => setShapesMenuOpen(false)}
              />
              <div
                className="fixed sm:absolute top-20 sm:top-full right-3 sm:right-0 left-3 sm:left-auto mt-2 max-w-[calc(100vw-1.5rem)] sm:w-80 bg-[#FAF9F5] dark:bg-[#1C1C17] border border-[#E1E4D5] dark:border-[#43493E] rounded-3xl shadow-2xl p-3 z-[100] animate-fade-in space-y-3"
                dir="rtl"
              >
              <div className="flex items-center justify-between border-b border-[#E1E4D5] dark:border-[#43493E] pb-2 px-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                  <Sparkles className="w-3.5 h-3.5 text-[#4A6D22] dark:text-[#D0E8B2]" />
                  <span>اشکال مایکروسافت ورد (Shapes)</span>
                </div>
                <span className="text-[10px] text-[#8F9285]">درون بلوک فعال</span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-0.5">
                {SHAPE_CATEGORIES.map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <span className="text-[10px] font-bold text-[#5E6258] dark:text-[#8F9285] px-1 block">
                      {cat.category}
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {cat.items.map((item) => (
                        <button
                          key={item.kind}
                          type="button"
                          onClick={() => handleSelectShape(item.kind)}
                          className="flex items-center gap-1.5 p-2 rounded-xl bg-white dark:bg-[#141510] border border-[#E1E4D5] dark:border-[#43493E] hover:bg-[#D0E8B2]/40 dark:hover:bg-[#4A6D22]/30 hover:border-[#4A6D22] text-[#3F4A35] dark:text-[#BCC2B2] text-right transition-colors"
                        >
                          <div className="w-5 h-5 flex items-center justify-center shrink-0 text-[#4A6D22] dark:text-[#D0E8B2]">
                            {item.icon}
                          </div>
                          <span className="text-[11px] truncate font-medium">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </>
          )}
        </div>

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
