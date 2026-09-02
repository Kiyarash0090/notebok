import React, { useState, useEffect } from 'react';
import {
  X,
  Square,
  Circle,
  Triangle,
  ArrowRight,
  ArrowLeft,
  MoveHorizontal,
  Minus,
  Star,
  MessageSquare,
  Cloud,
  Heart,
  Award,
  Layers,
  Palette,
  Maximize2,
  Eye,
  EyeOff,
  Type,
  Sparkles,
  Lock,
  Unlock,
  Check,
  RotateCcw,
  RotateCw,
  Sun,
  Flame,
  Blend,
  Grid,
  Sliders,
  Move,
  ArrowUpFromLine,
  ArrowDownToLine,
  AlignCenter,
} from 'lucide-react';
import { ShapeConfig, ShapeKind, ShapePatternType } from '../../types';
import { ShapeSvg } from '../blocks/ShapeSvg';

interface ShapeCustomizerModalProps {
  isOpen: boolean;
  shape: ShapeConfig;
  initialTab?: 'shape' | 'size' | 'color' | 'text';
  onSave: (updatedShape: ShapeConfig) => void;
  onClose: () => void;
  onDelete?: () => void;
}

const SHAPE_PATTERNS: { id: ShapePatternType; label: string; desc: string }[] = [
  { id: 'none', label: 'بدون الگو (تخت/گرادیان)', desc: 'رنگ‌آمیزی یکدست یا طیفی' },
  { id: 'dots', label: 'نقطه‌چین (Dots)', desc: 'شبکه نقاط کلاسیک اداری' },
  { id: 'grid', label: 'شطرنجی (Grid)', desc: 'چهارخانه‌های مهندسی و اسناد' },
  { id: 'stripes', label: 'خط‌دار افقی (Stripes)', desc: 'خطوط موازی کاغذ یادداشت' },
  { id: 'stripes-diagonal', label: 'هاشور مورب (Diagonal)', desc: 'خطوط زاویه‌دار ۴۵ درجه' },
  { id: 'crosshatch', label: 'هاشور متقاطع (Crosshatch)', desc: 'بافت مشبک متقاطع' },
  { id: 'blueprint', label: 'نقشه‌کشی (Blueprint)', desc: 'شبکه ریز شطرنجی دیاگرام' },
  { id: 'waves', label: 'امواج زینتی (Waves)', desc: 'الگوی موج‌دار دکوراتیو' },
];

const SHAPE_KINDS: { kind: ShapeKind; label: string; icon: React.ReactNode; category: string }[] = [
  // Basic & Text Box
  { kind: 'textbox', label: 'کادر متنی (Text Box)', icon: <Type className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2]" />, category: 'اشکال پایه' },
  { kind: 'rect', label: 'مستطیل', icon: <Square className="w-4 h-4" />, category: 'اشکال پایه' },
  { kind: 'roundedRect', label: 'گوشه‌گرد', icon: <Square className="w-4 h-4 rounded-md" />, category: 'اشکال پایه' },
  { kind: 'circle', label: 'دایره / بیضی', icon: <Circle className="w-4 h-4" />, category: 'اشکال پایه' },
  { kind: 'triangle', label: 'مثلث', icon: <Triangle className="w-4 h-4" />, category: 'اشکال پایه' },
  { kind: 'diamond', label: 'لوزی', icon: <RotateCcw className="w-4 h-4" />, category: 'اشکال پایه' },
  { kind: 'hexagon', label: 'شش‌ضلعی', icon: <Layers className="w-4 h-4" />, category: 'اشکال پایه' },

  // Arrows & Lines
  { kind: 'arrow', label: 'فلش جلو', icon: <ArrowLeft className="w-4 h-4" />, category: 'فلش و خط' },
  { kind: 'leftArrow', label: 'فلش برگشت', icon: <ArrowRight className="w-4 h-4" />, category: 'فلش و خط' },
  { kind: 'doubleArrow', label: 'دو سر فلش', icon: <MoveHorizontal className="w-4 h-4" />, category: 'فلش و خط' },
  { kind: 'line', label: 'خط افقی', icon: <Minus className="w-4 h-4" />, category: 'فلش و خط' },

  // Callouts & Badges
  { kind: 'callout', label: 'کادر گفت‌وگو', icon: <MessageSquare className="w-4 h-4" />, category: 'برچسب و نماد' },
  { kind: 'cloud', label: 'ابر اندیشه', icon: <Cloud className="w-4 h-4" />, category: 'برچسب و نماد' },
  { kind: 'star', label: 'ستاره', icon: <Star className="w-4 h-4" />, category: 'برچسب و نماد' },
  { kind: 'heart', label: 'قلب', icon: <Heart className="w-4 h-4" />, category: 'برچسب و نماد' },
  { kind: 'badge', label: 'مدال / روبان', icon: <Award className="w-4 h-4" />, category: 'برچسب و نماد' },
];

const PRESET_SOLID_COLORS = [
  { name: 'سبز زیتونی', fill: '#4A6D22', stroke: '#365314' },
  { name: 'سبز زمردی', fill: '#26693D', stroke: '#144624' },
  { name: 'آبی اقیانوسی', fill: '#36667F', stroke: '#1F475B' },
  { name: 'نیلی تیره', fill: '#2D3E6B', stroke: '#1A2542' },
  { name: 'کهربایی / خردلی', fill: '#B57C1E', stroke: '#784F0E' },
  { name: 'نارنجی خاکی', fill: '#C25E2E', stroke: '#823714' },
  { name: 'قرمز یاقوتی', fill: '#A33638', stroke: '#691D20' },
  { name: 'بنفش ارغوانی', fill: '#714C85', stroke: '#462C54' },
  { name: 'خاکستری زغالی', fill: '#3D4435', stroke: '#22271D' },
  { name: 'سفید صدفی', fill: '#FFFFFF', stroke: '#A2A79A' },
];

const PRESET_GRADIENTS = [
  {
    name: 'زیتونی و لیمویی',
    start: '#4A6D22',
    end: '#88B04B',
    stroke: '#365314',
    angle: 135,
  },
  {
    name: 'اقیانوس عمیق',
    start: '#1F475B',
    end: '#00A896',
    stroke: '#133544',
    angle: 135,
  },
  {
    name: 'غروب کهربایی',
    start: '#B57C1E',
    end: '#C25E2E',
    stroke: '#784F0E',
    angle: 120,
  },
  {
    name: 'بنفش اشرافی',
    start: '#462C54',
    end: '#8E44AD',
    stroke: '#301B3B',
    angle: 140,
  },
  {
    name: 'یاقوت و مرجان',
    start: '#8B0000',
    end: '#FF6B6B',
    stroke: '#5A0000',
    angle: 135,
  },
  {
    name: 'شفق قطبی',
    start: '#0B486B',
    end: '#F7B733',
    stroke: '#08334C',
    angle: 135,
  },
  {
    name: 'سایبرپانک نئون',
    start: '#0F2027',
    end: '#2C5364',
    stroke: '#00D2D3',
    angle: 135,
  },
  {
    name: 'جنگل زمردی',
    start: '#134E5E',
    end: '#71B280',
    stroke: '#0B2F39',
    angle: 135,
  },
];

const SHADOW_TYPES: {
  id: 'none' | 'soft' | '3d' | 'deep' | 'glow';
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'none',
    label: 'بدون سایه',
    desc: 'نمای کاملاً تخت و ساده',
    icon: <Minus className="w-4 h-4" />,
  },
  {
    id: 'soft',
    label: 'سایه نرم',
    desc: 'سایه ظریف و طبیعی ورد',
    icon: <Sun className="w-4 h-4" />,
  },
  {
    id: '3d',
    label: 'حجم‌دار سه‌بعدی (3D)',
    desc: 'برجستگی با هایلایت و سایه عمقی',
    icon: <Layers className="w-4 h-4" />,
  },
  {
    id: 'deep',
    label: 'شناور عمیق (Deep)',
    desc: 'حالت معلق با ارتفاع زیاد',
    icon: <Maximize2 className="w-4 h-4" />,
  },
  {
    id: 'glow',
    label: 'درخشش نئونی (Glow)',
    desc: 'هاله نورانی همرنگ شکل',
    icon: <Flame className="w-4 h-4" />,
  },
];

export const ShapeCustomizerModal: React.FC<ShapeCustomizerModalProps> = ({
  isOpen,
  shape: initialShape,
  initialTab,
  onSave,
  onClose,
  onDelete,
}) => {
  const [shape, setShape] = useState<ShapeConfig>(() => ({
    width: 220,
    height: 110,
    color: '#4A6D22',
    fillTransparent: false,
    gradient: false,
    gradientEndColor: '#88B04B',
    gradientAngle: 135,
    strokeColor: '#365314',
    strokeWidth: 2,
    borderStyle: 'solid',
    radius: 12,
    opacity: 1,
    aspectLocked: false,
    rotation: 0,
    align: 'center',
    text: '',
    textColor: '#FFFFFF',
    textSize: 13,
    textBold: true,
    shadow: true,
    shadowType: 'soft',
    visible: true,
    ...initialShape,
  }));

  const [activeTab, setActiveTab] = useState<'shape' | 'size' | 'color' | 'text'>(
    initialTab || (initialShape?.kind === 'textbox' ? 'text' : 'shape')
  );

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      } else if (initialShape?.kind === 'textbox') {
        setActiveTab('text');
      }
    }
  }, [isOpen, initialTab, initialShape?.kind]);

  if (!isOpen) return null;

  const currentOpacityPercent = Math.round(
    (shape.opacity !== undefined ? (shape.opacity > 1 ? shape.opacity : shape.opacity * 100) : 100)
  );

  const handleWidthChange = (val: number) => {
    const clamped = Math.max(40, Math.min(850, val));
    if (shape.aspectLocked && shape.width && shape.height) {
      const ratio = shape.height / shape.width;
      setShape((s) => ({ ...s, width: clamped, height: Math.round(clamped * ratio) }));
    } else {
      setShape((s) => ({ ...s, width: clamped }));
    }
  };

  const handleHeightChange = (val: number) => {
    const clamped = Math.max(30, Math.min(650, val));
    if (shape.aspectLocked && shape.width && shape.height) {
      const ratio = shape.width / shape.height;
      setShape((s) => ({ ...s, height: clamped, width: Math.round(clamped * ratio) }));
    } else {
      setShape((s) => ({ ...s, height: clamped }));
    }
  };

  const handleRotationChange = (val: number) => {
    let normalized = val % 360;
    if (normalized < 0) normalized += 360;
    setShape((s) => ({ ...s, rotation: normalized }));
  };

  const handleSwapGradientColors = () => {
    setShape((s) => ({
      ...s,
      color: s.gradientEndColor || '#88B04B',
      gradientEndColor: s.color || '#4A6D22',
    }));
  };

  const categories = Array.from(new Set(SHAPE_KINDS.map((k) => k.category)));

  return (
    <div
      className="shape-customizer-modal fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#FAF9F5] dark:bg-[#1C1C17] rounded-3xl border border-[#E1E4D5] dark:border-[#43493E] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[#E1E4D5] dark:border-[#43493E] bg-[#F3F4EC] dark:bg-[#171813]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#4A6D22]/15 text-[#4A6D22] dark:text-[#D0E8B2] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                تنظیمات پیشرفته اشکال مایکروسافت ورد
              </h3>
              <p className="text-[11px] text-[#5E6258] dark:text-[#8F9285]">
                تغییر نوع شکل، ابعاد، چرخش ۳۶۰ درجه، گرادیان دورنگ، سایه‌های سه‌بعدی و متن
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[#5E6258] dark:text-[#8F9285] transition-colors"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Box */}
        <div className="shrink-0 p-3 sm:p-4 bg-black/[0.02] dark:bg-white/[0.02] border-b border-[#E1E4D5] dark:border-[#43493E] flex flex-col items-center justify-center min-h-[120px] max-h-[170px] sm:min-h-[170px] sm:max-h-[230px] overflow-hidden relative">
          <div className="absolute top-2 right-3 flex items-center gap-2 z-10">
            <span className="text-[9px] sm:text-[10px] font-bold text-[#8F9285] bg-white/80 dark:bg-black/50 px-2 py-0.5 rounded-md border border-[#E1E4D5] dark:border-[#43493E]">
              پیش‌نمایش زنده
            </span>
            {shape.rotation ? (
              <span className="text-[9px] sm:text-[10px] font-mono text-[#4A6D22] dark:text-[#D0E8B2] bg-[#D0E8B2]/30 px-1.5 py-0.5 rounded-md" dir="ltr">
                {shape.rotation}°
              </span>
            ) : null}
          </div>

          <div className="flex items-center justify-center w-full h-full p-2 max-w-full overflow-hidden">
            {shape.visible === false ? (
              <div className="flex flex-col items-center gap-1.5 text-xs text-[#8F9285]">
                <EyeOff className="w-5 h-5 sm:w-6 sm:h-6 text-[#A64D3B]" />
                <span>شکل در حالت مخفی قرار دارد</span>
              </div>
            ) : (
              <div className="max-w-full max-h-full flex items-center justify-center">
                <ShapeSvg shape={shape} className="transition-all duration-150 max-w-full max-h-[130px] sm:max-h-[180px]" />
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="shrink-0 flex items-center gap-1 px-2 sm:px-6 py-1.5 sm:py-2 bg-[#FAF9F5] dark:bg-[#1C1C17] border-b border-[#E1E4D5] dark:border-[#43493E] overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('shape')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-colors shrink-0 ${
              activeTab === 'shape'
                ? 'bg-[#4A6D22] text-white'
                : 'text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
            <span>نوع شکل</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('size')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-colors shrink-0 ${
              activeTab === 'size'
                ? 'bg-[#4A6D22] text-white'
                : 'text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>ابعاد و چرخش</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('color')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-colors shrink-0 ${
              activeTab === 'color'
                ? 'bg-[#4A6D22] text-white'
                : 'text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>رنگ، گرادیان و الگو</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold whitespace-nowrap transition-colors shrink-0 ${
              activeTab === 'text'
                ? 'bg-[#4A6D22] text-white'
                : 'text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>متن شکل</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* TAB 1: SHAPE KIND & ALIGN */}
          {activeTab === 'shape' && (
            <div className="space-y-4">
              {categories.map((cat) => (
                <div key={cat} className="space-y-2">
                  <span className="text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285] block">{cat}</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SHAPE_KINDS.filter((k) => k.category === cat).map((item) => {
                      const isSelected = shape.kind === item.kind;
                      return (
                        <button
                          key={item.kind}
                          type="button"
                          onClick={() => setShape((s) => ({ ...s, kind: item.kind }))}
                          className={`flex items-center gap-2 p-2.5 rounded-2xl border transition-all text-right ${
                            isSelected
                              ? 'bg-[#D0E8B2]/40 dark:bg-[#4A6D22]/30 border-[#4A6D22] text-[#1A3700] dark:text-[#D0E8B2] font-bold shadow-xs'
                              : 'bg-white dark:bg-[#141510] border-[#E1E4D5] dark:border-[#43493E] text-[#3F4A35] dark:text-[#BCC2B2] hover:bg-[#EDEEEB]'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-[#4A6D22] text-white'
                                : 'bg-[#EDEEEB] dark:bg-[#282A22] text-[#5E6258] dark:text-[#8F9285]'
                            }`}
                          >
                            {item.icon}
                          </div>
                          <span className="truncate text-xs">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Layout Alignment & Layer Position within Block */}
              <div className="pt-3 border-t border-[#E1E4D5] dark:border-[#43493E] space-y-4">
                {/* 1. Layer Position relative to text & block elements */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#4A6D22] dark:text-[#D0E8B2]" />
                      <span>لایه‌بندی نسبت به متن و اجزای بلوک (Word Layer Position)</span>
                    </span>
                    <span className="text-[10px] text-[#4A6D22] dark:text-[#D0E8B2] font-semibold">
                      {shape.layerPosition === 'behind'
                        ? 'زیر تمام اجزا'
                        : shape.layerPosition === 'in-front'
                        ? 'روی تمام اجزا'
                        : 'هم‌تراز با متن'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Behind Elements */}
                    <button
                      type="button"
                      onClick={() => setShape((s) => ({ ...s, layerPosition: 'behind' }))}
                      className={`p-2.5 rounded-2xl border text-right transition-all flex flex-col gap-1 ${
                        shape.layerPosition === 'behind'
                          ? 'bg-[#4A6D22]/10 border-[#4A6D22] text-[#1A1C16] dark:text-[#E2E3DC] ring-1 ring-[#4A6D22]'
                          : 'bg-white dark:bg-[#141510] border-[#E1E4D5] dark:border-[#43493E] text-[#5E6258] dark:text-[#8F9285] hover:bg-[#EDEEEB]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <ArrowDownToLine className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2]" />
                        <span>پشت متن و اجزا</span>
                      </div>
                      <span className="text-[10px] text-[#5E6258] dark:text-[#8F9285]">
                        مناسب پس‌زمینه، واترمارک و هایلایت زیرین
                      </span>
                    </button>

                    {/* Inline Flow */}
                    <button
                      type="button"
                      onClick={() => setShape((s) => ({ ...s, layerPosition: 'inline' }))}
                      className={`p-2.5 rounded-2xl border text-right transition-all flex flex-col gap-1 ${
                        !shape.layerPosition || shape.layerPosition === 'inline'
                          ? 'bg-[#4A6D22]/10 border-[#4A6D22] text-[#1A1C16] dark:text-[#E2E3DC] ring-1 ring-[#4A6D22]'
                          : 'bg-white dark:bg-[#141510] border-[#E1E4D5] dark:border-[#43493E] text-[#5E6258] dark:text-[#8F9285] hover:bg-[#EDEEEB]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <AlignCenter className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2]" />
                        <span>هم‌تراز با متن (Inline)</span>
                      </div>
                      <span className="text-[10px] text-[#5E6258] dark:text-[#8F9285]">
                        جریان استاندارد و متوالی در بدنه بلوک
                      </span>
                    </button>

                    {/* In Front of Elements */}
                    <button
                      type="button"
                      onClick={() => setShape((s) => ({ ...s, layerPosition: 'in-front' }))}
                      className={`p-2.5 rounded-2xl border text-right transition-all flex flex-col gap-1 ${
                        shape.layerPosition === 'in-front'
                          ? 'bg-[#4A6D22]/10 border-[#4A6D22] text-[#1A1C16] dark:text-[#E2E3DC] ring-1 ring-[#4A6D22]'
                          : 'bg-white dark:bg-[#141510] border-[#E1E4D5] dark:border-[#43493E] text-[#5E6258] dark:text-[#8F9285] hover:bg-[#EDEEEB]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <ArrowUpFromLine className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2]" />
                        <span>روی متن و اجزا</span>
                      </div>
                      <span className="text-[10px] text-[#5E6258] dark:text-[#8F9285]">
                        شناور در بالاترین لایه (مناسب استیکر و مهر)
                      </span>
                    </button>
                  </div>
                </div>

                {/* 2. Horizontal Alignment in block */}
                <div className="space-y-2 pt-2 border-t border-[#E1E4D5]/60 dark:border-[#43493E]/60">
                  <span className="text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285] block">چینش افقی در بلوک</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { id: 'start', label: 'راست‌چین' },
                      { id: 'center', label: 'وسط‌چین' },
                      { id: 'end', label: 'چپ‌چین' },
                      { id: 'float-right', label: 'شناور راست (متن کنار شکل)' },
                      { id: 'float-left', label: 'شناور چپ (متن کنار شکل)' },
                    ].map((alignOpt) => (
                      <button
                        key={alignOpt.id}
                        type="button"
                        onClick={() => setShape((s) => ({ ...s, align: alignOpt.id as any }))}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                          shape.align === alignOpt.id
                            ? 'bg-[#4A6D22] text-white border-[#4A6D22]'
                            : 'bg-white dark:bg-[#141510] border-[#E1E4D5] dark:border-[#43493E] text-[#5E6258] dark:text-[#8F9285] hover:bg-[#EDEEEB]'
                        }`}
                      >
                        {alignOpt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SIZE & 360° ROTATION */}
          {activeTab === 'size' && (
            <div className="space-y-4">
              {/* Width & Height Box */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#141510] border border-[#E1E4D5] dark:border-[#43493E] space-y-4 shadow-xs">
                {/* Width */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                    <span>طول / عرض شکل (Width)</span>
                    <span className="text-[#4A6D22] dark:text-[#D0E8B2] tabular-nums font-mono" dir="ltr">
                      {shape.width || 220} px
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={60}
                      max={750}
                      step={5}
                      value={shape.width || 220}
                      onChange={(e) => handleWidthChange(Number(e.target.value))}
                      className="flex-1 h-2 accent-[#4A6D22] dark:accent-[#D0E8B2] cursor-pointer"
                    />
                    <input
                      type="number"
                      min={60}
                      max={750}
                      value={shape.width || 220}
                      onChange={(e) => handleWidthChange(Number(e.target.value))}
                      className="w-18 px-2 py-1 text-center font-bold bg-[#EDEEEB] dark:bg-[#23251D] rounded-xl border border-[#E1E4D5] dark:border-[#43493E] text-xs outline-none"
                    />
                  </div>
                  {/* Quick width presets */}
                  <div className="flex items-center gap-1 pt-1 flex-wrap">
                    {[
                      { label: 'کوچک', w: 120 },
                      { label: 'متوسط', w: 220 },
                      { label: 'بزرگ', w: 380 },
                      { label: 'عریض', w: 550 },
                    ].map((pre) => (
                      <button
                        key={pre.w}
                        type="button"
                        onClick={() => handleWidthChange(pre.w)}
                        className="px-2 py-0.5 rounded-lg text-[10px] bg-black/5 dark:bg-white/5 hover:bg-[#D0E8B2] hover:text-[#1A3700] transition-colors"
                      >
                        {pre.label} ({pre.w}px)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Height */}
                <div className="space-y-1.5 pt-2 border-t border-[#E1E4D5]/60 dark:border-[#43493E]/60">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                    <span>ارتفاع شکل (Height)</span>
                    <span className="text-[#4A6D22] dark:text-[#D0E8B2] tabular-nums font-mono" dir="ltr">
                      {shape.height || 110} px
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={30}
                      max={500}
                      step={5}
                      value={shape.height || 110}
                      onChange={(e) => handleHeightChange(Number(e.target.value))}
                      className="flex-1 h-2 accent-[#4A6D22] dark:accent-[#D0E8B2] cursor-pointer"
                    />
                    <input
                      type="number"
                      min={30}
                      max={500}
                      value={shape.height || 110}
                      onChange={(e) => handleHeightChange(Number(e.target.value))}
                      className="w-18 px-2 py-1 text-center font-bold bg-[#EDEEEB] dark:bg-[#23251D] rounded-xl border border-[#E1E4D5] dark:border-[#43493E] text-xs outline-none"
                    />
                  </div>
                  {/* Quick height presets */}
                  <div className="flex items-center gap-1 pt-1 flex-wrap">
                    {[
                      { label: 'باریک', h: 50 },
                      { label: 'استاندارد', h: 110 },
                      { label: 'بلند', h: 200 },
                    ].map((pre) => (
                      <button
                        key={pre.h}
                        type="button"
                        onClick={() => handleHeightChange(pre.h)}
                        className="px-2 py-0.5 rounded-lg text-[10px] bg-black/5 dark:bg-white/5 hover:bg-[#D0E8B2] hover:text-[#1A3700] transition-colors"
                      >
                        {pre.label} ({pre.h}px)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Aspect Ratio Lock */}
                <div className="pt-2 flex items-center justify-between text-xs border-t border-[#E1E4D5]/60 dark:border-[#43493E]/60">
                  <span className="text-[#5E6258] dark:text-[#8F9285]">قفل نسبت ابعاد (تناسب طول و عرض):</span>
                  <button
                    type="button"
                    onClick={() => setShape((s) => ({ ...s, aspectLocked: !s.aspectLocked }))}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-bold transition-colors ${
                      shape.aspectLocked
                        ? 'bg-[#4A6D22] text-white'
                        : 'bg-[#EDEEEB] dark:bg-[#23251D] text-[#5E6258] dark:text-[#8F9285]'
                    }`}
                  >
                    {shape.aspectLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>{shape.aspectLocked ? 'نسبت قفل است' : 'آزاد'}</span>
                  </button>
                </div>
              </div>

              {/* 3. Full 360° Rotation Section */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#141510] border border-[#E1E4D5] dark:border-[#43493E] space-y-3 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                  <div className="flex items-center gap-1.5">
                    <RotateCw className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2]" />
                    <span>چرخش آزاد شکل (Full 360° Rotation)</span>
                  </div>
                  <span className="text-[#4A6D22] dark:text-[#D0E8B2] font-mono font-bold" dir="ltr">
                    {shape.rotation || 0}°
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={shape.rotation || 0}
                    onChange={(e) => handleRotationChange(Number(e.target.value))}
                    className="flex-1 h-2 accent-[#4A6D22] dark:accent-[#D0E8B2] cursor-pointer"
                  />
                  <input
                    type="number"
                    min={0}
                    max={360}
                    value={shape.rotation || 0}
                    onChange={(e) => handleRotationChange(Number(e.target.value))}
                    className="w-18 px-2 py-1 text-center font-bold bg-[#EDEEEB] dark:bg-[#23251D] rounded-xl border border-[#E1E4D5] dark:border-[#43493E] text-xs outline-none"
                  />
                </div>

                {/* Quick Angle Presets */}
                <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                  {[
                    { label: '۰° (افقی)', deg: 0 },
                    { label: '۴۵°', deg: 45 },
                    { label: '۹۰° (عمودی)', deg: 90 },
                    { label: '۱۳۵°', deg: 135 },
                    { label: '۱۸۰° (معکوس)', deg: 180 },
                    { label: '۲۷۰°', deg: 270 },
                  ].map((ang) => (
                    <button
                      key={ang.deg}
                      type="button"
                      onClick={() => handleRotationChange(ang.deg)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-colors ${
                        (shape.rotation || 0) === ang.deg
                          ? 'bg-[#4A6D22] text-white border-[#4A6D22]'
                          : 'bg-[#EDEEEB] dark:bg-[#23251D] border-[#E1E4D5] dark:border-[#43493E] text-[#5E6258] dark:text-[#8F9285]'
                      }`}
                    >
                      {ang.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Free Canvas Coordinate Positioning (X & Y Offsets) */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#141510] border border-[#E1E4D5] dark:border-[#43493E] space-y-4 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                  <div className="flex items-center gap-1.5">
                    <Move className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2]" />
                    <span>موقعیت و جابجایی دقیق در صفحه (Position X / Y)</span>
                  </div>
                  {(shape.posX || shape.posY) ? (
                    <button
                      type="button"
                      onClick={() => setShape((s) => ({ ...s, posX: 0, posY: 0 }))}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-[#EDEEEB] dark:bg-[#23251D] hover:bg-[#D0E8B2] hover:text-[#1A3700] transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>بازنشانی به مرکز</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-[#8F9285]">در مرکز مبدأ (۰, ۰)</span>
                  )}
                </div>

                {/* X Position */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#5E6258] dark:text-[#8F9285]">
                    <span>افست افقی X (چپ / راست):</span>
                    <span className="text-[#4A6D22] dark:text-[#D0E8B2] font-mono font-bold" dir="ltr">
                      {shape.posX ? (shape.posX > 0 ? `+${shape.posX}` : shape.posX) : 0} px
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={-400}
                      max={400}
                      step={2}
                      value={shape.posX || 0}
                      onChange={(e) => setShape((s) => ({ ...s, posX: Number(e.target.value) }))}
                      className="flex-1 h-2 accent-[#4A6D22] dark:accent-[#D0E8B2] cursor-pointer"
                    />
                    <input
                      type="number"
                      min={-400}
                      max={400}
                      value={shape.posX || 0}
                      onChange={(e) => setShape((s) => ({ ...s, posX: Number(e.target.value) }))}
                      className="w-18 px-2 py-1 text-center font-bold bg-[#EDEEEB] dark:bg-[#23251D] rounded-xl border border-[#E1E4D5] dark:border-[#43493E] text-xs outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Y Position */}
                <div className="space-y-1.5 pt-2 border-t border-[#E1E4D5]/60 dark:border-[#43493E]/60">
                  <div className="flex items-center justify-between text-xs text-[#5E6258] dark:text-[#8F9285]">
                    <span>افست عمودی Y (بالا / پایین):</span>
                    <span className="text-[#4A6D22] dark:text-[#D0E8B2] font-mono font-bold" dir="ltr">
                      {shape.posY ? (shape.posY > 0 ? `+${shape.posY}` : shape.posY) : 0} px
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={-300}
                      max={300}
                      step={2}
                      value={shape.posY || 0}
                      onChange={(e) => setShape((s) => ({ ...s, posY: Number(e.target.value) }))}
                      className="flex-1 h-2 accent-[#4A6D22] dark:accent-[#D0E8B2] cursor-pointer"
                    />
                    <input
                      type="number"
                      min={-300}
                      max={300}
                      value={shape.posY || 0}
                      onChange={(e) => setShape((s) => ({ ...s, posY: Number(e.target.value) }))}
                      className="w-18 px-2 py-1 text-center font-bold bg-[#EDEEEB] dark:bg-[#23251D] rounded-xl border border-[#E1E4D5] dark:border-[#43493E] text-xs outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Opacity & Visibility Section */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#141510] border border-[#E1E4D5] dark:border-[#43493E] space-y-4 shadow-xs">
                {/* Opacity Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                    <span>میزان نمایان بودن و شفافیت (Opacity)</span>
                    <span className="text-[#4A6D22] dark:text-[#D0E8B2] tabular-nums font-bold" dir="ltr">
                      {currentOpacityPercent}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    step={1}
                    value={currentOpacityPercent}
                    onChange={(e) => setShape((s) => ({ ...s, opacity: Number(e.target.value) / 100 }))}
                    className="w-full h-2 accent-[#4A6D22] dark:accent-[#D0E8B2] cursor-pointer"
                  />
                  <div className="flex items-center justify-between text-[10px] text-[#8F9285]">
                    <span>شفاف و کم‌رنگ (۵٪)</span>
                    <span>کاملاً پررنگ و مات (۱۰۰٪)</span>
                  </div>
                </div>

                {/* Visibility Toggle */}
                <div className="pt-2 border-t border-[#E1E4D5]/60 dark:border-[#43493E]/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {shape.visible !== false ? (
                      <Eye className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2]" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-[#A64D3B]" />
                    )}
                    <span className="text-xs font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                      وضعیت نمایش شکل در متن
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShape((s) => ({ ...s, visible: s.visible === false ? true : false }))}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                      shape.visible !== false
                        ? 'bg-[#4A6D22] text-white'
                        : 'bg-[#A64D3B] text-white'
                    }`}
                  >
                    {shape.visible !== false ? 'نمایان (فعال)' : 'مخفی'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: COLOR, GRADIENT & 3D SHADOW */}
          {activeTab === 'color' && (
            <div className="space-y-4">
              {/* 2. Gradients & Fill Color Box */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#141510] border border-[#E1E4D5] dark:border-[#43493E] space-y-4 shadow-xs">
                {/* Header with Mode Switches */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                    رنگ‌آمیزی و گرادیان شکل
                  </span>
                  
                  <div className="flex items-center gap-3 text-xs">
                    {/* Transparent check */}
                    <label className="flex items-center gap-1.5 text-[#5E6258] dark:text-[#8F9285] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(shape.fillTransparent)}
                        onChange={(e) => setShape((s) => ({ ...s, fillTransparent: e.target.checked }))}
                        className="accent-[#4A6D22]"
                      />
                      <span>شفاف (بدون پر کردن)</span>
                    </label>

                    {/* Gradient mode toggle */}
                    {!shape.fillTransparent && (
                      <button
                        type="button"
                        onClick={() => setShape((s) => ({ ...s, gradient: !s.gradient }))}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold text-[11px] transition-colors ${
                          shape.gradient
                            ? 'bg-[#4A6D22] text-white shadow-xs'
                            : 'bg-[#EDEEEB] dark:bg-[#23251D] text-[#5E6258] dark:text-[#8F9285]'
                        }`}
                      >
                        <Blend className="w-3.5 h-3.5" />
                        <span>گرادیان دورنگ</span>
                      </button>
                    )}
                  </div>
                </div>

                {!shape.fillTransparent && (
                  <>
                    {/* Two-color Gradient Options */}
                    {shape.gradient ? (
                      <div className="space-y-3 pt-1">
                        {/* Ready-made gradient presets */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285] block">
                            پالت‌های آماده گرادیان مایکروسافت ورد:
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {PRESET_GRADIENTS.map((p) => {
                              const isCurrent =
                                shape.color === p.start && shape.gradientEndColor === p.end;
                              return (
                                <button
                                  key={p.name}
                                  type="button"
                                  onClick={() =>
                                    setShape((s) => ({
                                      ...s,
                                      color: p.start,
                                      gradientEndColor: p.end,
                                      strokeColor: p.stroke,
                                      gradientAngle: p.angle,
                                    }))
                                  }
                                  className={`flex items-center gap-2 p-2 rounded-xl border text-right transition-all ${
                                    isCurrent
                                      ? 'ring-2 ring-[#4A6D22] border-[#4A6D22] font-bold shadow-xs'
                                      : 'border-[#E1E4D5] dark:border-[#43493E] hover:scale-102'
                                  }`}
                                >
                                  <div
                                    className="w-6 h-6 rounded-lg shrink-0 border border-black/10 shadow-xs"
                                    style={{
                                      background: `linear-gradient(${p.angle}deg, ${p.start}, ${p.end})`,
                                    }}
                                  />
                                  <span className="text-[11px] truncate text-[#1A1C16] dark:text-[#E2E3DC]">
                                    {p.name}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Custom Two-Color Selection */}
                        <div className="pt-2 border-t border-[#E1E4D5]/60 dark:border-[#43493E]/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Start Color */}
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#EDEEEB]/60 dark:bg-[#23251D]/60 border border-[#E1E4D5] dark:border-[#43493E]">
                            <span className="text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285]">
                              رنگ شروع:
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={shape.color || '#4A6D22'}
                                onChange={(e) => setShape((s) => ({ ...s, color: e.target.value }))}
                                className="w-7 h-7 rounded-lg border border-[#E1E4D5] dark:border-[#43493E] cursor-pointer bg-transparent"
                              />
                              <input
                                type="text"
                                value={shape.color || '#4A6D22'}
                                onChange={(e) => setShape((s) => ({ ...s, color: e.target.value }))}
                                className="w-20 px-1.5 py-0.5 text-xs font-mono bg-white dark:bg-[#141510] rounded-md border border-[#E1E4D5] dark:border-[#43493E]"
                                dir="ltr"
                              />
                            </div>
                          </div>

                          {/* End Color */}
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#EDEEEB]/60 dark:bg-[#23251D]/60 border border-[#E1E4D5] dark:border-[#43493E]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285]">
                                رنگ پایان:
                              </span>
                              <button
                                type="button"
                                onClick={handleSwapGradientColors}
                                className="p-1 rounded-md hover:bg-black/10 text-[#5E6258] dark:text-[#8F9285]"
                                title="جابجایی دو رنگ"
                              >
                                <RotateCcw className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={shape.gradientEndColor || '#88B04B'}
                                onChange={(e) => setShape((s) => ({ ...s, gradientEndColor: e.target.value }))}
                                className="w-7 h-7 rounded-lg border border-[#E1E4D5] dark:border-[#43493E] cursor-pointer bg-transparent"
                              />
                              <input
                                type="text"
                                value={shape.gradientEndColor || '#88B04B'}
                                onChange={(e) => setShape((s) => ({ ...s, gradientEndColor: e.target.value }))}
                                className="w-20 px-1.5 py-0.5 text-xs font-mono bg-white dark:bg-[#141510] rounded-md border border-[#E1E4D5] dark:border-[#43493E]"
                                dir="ltr"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Gradient Angle Slider */}
                        <div className="space-y-1 pt-2">
                          <div className="flex items-center justify-between text-xs font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                            <span>زاویه تابش گرادیان (Gradient Angle)</span>
                            <span className="text-[#4A6D22] dark:text-[#D0E8B2] font-mono" dir="ltr">
                              {shape.gradientAngle ?? 135}°
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min={0}
                              max={360}
                              step={5}
                              value={shape.gradientAngle ?? 135}
                              onChange={(e) => setShape((s) => ({ ...s, gradientAngle: Number(e.target.value) }))}
                              className="flex-1 h-2 accent-[#4A6D22] dark:accent-[#D0E8B2] cursor-pointer"
                            />
                            <div className="flex items-center gap-1">
                              {[0, 45, 90, 135, 180, 270].map((ang) => (
                                <button
                                  key={ang}
                                  type="button"
                                  onClick={() => setShape((s) => ({ ...s, gradientAngle: ang }))}
                                  className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-black/5 dark:bg-white/5 hover:bg-[#D0E8B2] hover:text-[#1A3700]"
                                >
                                  {ang}°
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Solid Colors Palette */
                      <div className="space-y-3">
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                          {PRESET_SOLID_COLORS.map((c) => {
                            const isChosen = shape.color === c.fill;
                            return (
                              <button
                                key={c.fill}
                                type="button"
                                title={c.name}
                                onClick={() => setShape((s) => ({ ...s, color: c.fill, strokeColor: c.stroke }))}
                                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-transform ${
                                  isChosen ? 'scale-110 ring-2 ring-[#4A6D22] ring-offset-2' : 'hover:scale-105'
                                }`}
                                style={{ backgroundColor: c.fill, borderColor: c.stroke }}
                              >
                                {isChosen && <Check className="w-4 h-4 text-white drop-shadow-sm" />}
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                          <span className="text-[11px] text-[#5E6258] dark:text-[#8F9285]">انتخاب رنگ سفارشی:</span>
                          <input
                            type="color"
                            value={shape.color || '#4A6D22'}
                            onChange={(e) => setShape((s) => ({ ...s, color: e.target.value }))}
                            className="w-8 h-8 rounded-lg border border-[#E1E4D5] dark:border-[#43493E] cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={shape.color || '#4A6D22'}
                            onChange={(e) => setShape((s) => ({ ...s, color: e.target.value }))}
                            className="w-24 px-2 py-1 text-xs font-mono bg-[#EDEEEB] dark:bg-[#23251D] rounded-lg border border-[#E1E4D5] dark:border-[#43493E] outline-none"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* 2. 3D Lighting & Filter Shadow System */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#141510] border border-[#E1E4D5] dark:border-[#43493E] space-y-3 shadow-xs">
                <span className="text-xs font-bold text-[#1A1C16] dark:text-[#E2E3DC] block">
                  افکت‌های سایه، نورپردازی سه‌بعدی و درخشش نئونی (SVG Filters)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SHADOW_TYPES.map((st) => {
                    const isSelected =
                      (shape.shadowType || (shape.shadow === false ? 'none' : 'soft')) === st.id;
                    return (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() =>
                          setShape((s) => ({
                            ...s,
                            shadow: st.id !== 'none',
                            shadowType: st.id,
                          }))
                        }
                        className={`flex items-start gap-2.5 p-2.5 rounded-2xl border text-right transition-all ${
                          isSelected
                            ? 'bg-[#D0E8B2]/40 dark:bg-[#4A6D22]/30 border-[#4A6D22] text-[#1A3700] dark:text-[#D0E8B2] font-bold shadow-xs'
                            : 'bg-[#EDEEEB]/40 dark:bg-[#1A1C16] border-[#E1E4D5] dark:border-[#43493E] text-[#5E6258] dark:text-[#8F9285] hover:bg-[#EDEEEB]'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isSelected
                              ? 'bg-[#4A6D22] text-white'
                              : 'bg-black/5 dark:bg-white/10 text-[#5E6258] dark:text-[#8F9285]'
                          }`}
                        >
                          {st.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold">{st.label}</div>
                          <div className="text-[10px] text-[#8F9285] font-normal">{st.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. SVG Background Patterns (الگوهای بافت و پس‌زمینه اسناد) */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#141510] border border-[#E1E4D5] dark:border-[#43493E] space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                    <Grid className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2]" />
                    <span>الگوهای بافت و پس‌زمینه (SVG Patterns)</span>
                  </div>
                  {shape.pattern && shape.pattern !== 'none' && (
                    <button
                      type="button"
                      onClick={() => setShape((s) => ({ ...s, pattern: 'none' }))}
                      className="text-[10px] text-red-600 dark:text-red-400 hover:underline"
                    >
                      حذف الگو
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-[#5E6258] dark:text-[#8F9285]">
                  افزودن بافت‌های خط‌دار، شطرنجی، نقشه‌کشی یا نقطه‌چین اسناد اداری روی زمینه شکل
                </p>

                {/* Pattern Buttons Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SHAPE_PATTERNS.map((pat) => {
                    const isSelected = (shape.pattern || 'none') === pat.id;
                    return (
                      <button
                        key={pat.id}
                        type="button"
                        onClick={() =>
                          setShape((s) => ({
                            ...s,
                            pattern: pat.id,
                            patternColor: s.patternColor || '#FFFFFF',
                            patternScale: s.patternScale || 1,
                          }))
                        }
                        className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#D0E8B2]/40 dark:bg-[#4A6D22]/30 border-[#4A6D22] text-[#1A3700] dark:text-[#D0E8B2] font-bold shadow-xs'
                            : 'bg-[#EDEEEB]/40 dark:bg-[#1A1C16] border-[#E1E4D5] dark:border-[#43493E] text-[#5E6258] dark:text-[#8F9285] hover:bg-[#EDEEEB]'
                        }`}
                      >
                        <div className="text-xs font-bold truncate">{pat.label}</div>
                        <div className="text-[9px] text-[#8F9285] font-normal truncate mt-0.5">{pat.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Pattern Adjustments (Color & Scale) when a pattern is active */}
                {shape.pattern && shape.pattern !== 'none' && (
                  <div className="pt-3 border-t border-[#E1E4D5]/60 dark:border-[#43493E]/60 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Pattern Line/Dot Color */}
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#EDEEEB]/60 dark:bg-[#23251D]/60 border border-[#E1E4D5] dark:border-[#43493E]">
                        <span className="text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285]">
                          رنگ خطوط الگو:
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={shape.patternColor || '#FFFFFF'}
                            onChange={(e) => setShape((s) => ({ ...s, patternColor: e.target.value }))}
                            className="w-7 h-7 rounded-lg border border-[#E1E4D5] dark:border-[#43493E] cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={shape.patternColor || '#FFFFFF'}
                            onChange={(e) => setShape((s) => ({ ...s, patternColor: e.target.value }))}
                            className="w-20 px-1.5 py-0.5 text-xs font-mono bg-white dark:bg-[#141510] rounded-md border border-[#E1E4D5] dark:border-[#43493E]"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      {/* Pattern Scale Slider */}
                      <div className="p-2.5 rounded-xl bg-[#EDEEEB]/60 dark:bg-[#23251D]/60 border border-[#E1E4D5] dark:border-[#43493E] space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285]">
                          <div className="flex items-center gap-1">
                            <Sliders className="w-3.5 h-3.5" />
                            <span>تراکم / مقیاس الگو:</span>
                          </div>
                          <span className="text-[#4A6D22] dark:text-[#D0E8B2] font-mono">
                            {shape.patternScale || 1}x
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.5}
                          max={3}
                          step={0.25}
                          value={shape.patternScale || 1}
                          onChange={(e) => setShape((s) => ({ ...s, patternScale: Number(e.target.value) }))}
                          className="w-full h-1.5 accent-[#4A6D22] dark:accent-[#D0E8B2] cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Stroke / Border Box */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#141510] border border-[#E1E4D5] dark:border-[#43493E] space-y-3 shadow-xs">
                <span className="text-xs font-bold text-[#1A1C16] dark:text-[#E2E3DC] block">خط دور شکل (Border & Stroke)</span>

                {/* Stroke width */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-[#5E6258] dark:text-[#8F9285]">
                    <span>ضخامت خط دور:</span>
                    <span className="font-bold text-[#4A6D22] dark:text-[#D0E8B2]">{shape.strokeWidth ?? 2} px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={shape.strokeWidth ?? 2}
                    onChange={(e) => setShape((s) => ({ ...s, strokeWidth: Number(e.target.value) }))}
                    className="w-full h-2 accent-[#4A6D22] dark:accent-[#D0E8B2] cursor-pointer"
                  />
                </div>

                {/* Border Style */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-[#5E6258] dark:text-[#8F9285]">نوع خط:</span>
                  {[
                    { id: 'solid', label: 'ممتد / پیوسته' },
                    { id: 'dashed', label: 'خط‌چین' },
                    { id: 'dotted', label: 'نقطه‌چین' },
                  ].map((styleOpt) => (
                    <button
                      key={styleOpt.id}
                      type="button"
                      onClick={() => setShape((s) => ({ ...s, borderStyle: styleOpt.id as any }))}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-colors ${
                        (shape.borderStyle || 'solid') === styleOpt.id
                          ? 'bg-[#4A6D22] text-white border-[#4A6D22]'
                          : 'bg-[#EDEEEB] dark:bg-[#23251D] border-[#E1E4D5] dark:border-[#43493E] text-[#5E6258] dark:text-[#8F9285]'
                      }`}
                    >
                      {styleOpt.label}
                    </button>
                  ))}
                </div>

                {/* Stroke Color */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#E1E4D5]/60 dark:border-[#43493E]/60">
                  <span className="text-[11px] text-[#5E6258] dark:text-[#8F9285]">رنگ خط دور:</span>
                  <input
                    type="color"
                    value={shape.strokeColor || '#365314'}
                    onChange={(e) => setShape((s) => ({ ...s, strokeColor: e.target.value }))}
                    className="w-7 h-7 rounded-lg border border-[#E1E4D5] dark:border-[#43493E] cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={shape.strokeColor || '#365314'}
                    onChange={(e) => setShape((s) => ({ ...s, strokeColor: e.target.value }))}
                    className="w-24 px-2 py-1 text-xs font-mono bg-[#EDEEEB] dark:bg-[#23251D] rounded-lg border border-[#E1E4D5] dark:border-[#43493E] outline-none"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TEXT INSIDE SHAPE */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-[#141510] border border-[#E1E4D5] dark:border-[#43493E] space-y-4 shadow-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#1A1C16] dark:text-[#E2E3DC] block">
                      متن کادر متنی / درون شکل (چندخطی)
                    </label>
                    {shape.kind === 'textbox' && (
                      <span className="text-[10px] font-bold text-[#4A6D22] dark:text-[#D0E8B2] bg-[#D0E8B2]/30 px-2 py-0.5 rounded-md">
                        کادر متنی فعال
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={shape.text || ''}
                    onChange={(e) => setShape((s) => ({ ...s, text: e.target.value }))}
                    placeholder="متن دلخواه خود را اینجا بنویسید (برای خط بعد دکمه Enter را بزنید)..."
                    className="w-full px-3 py-2 bg-[#EDEEEB] dark:bg-[#23251D] rounded-xl border border-[#E1E4D5] dark:border-[#43493E] text-xs sm:text-sm text-[#1A1C16] dark:text-[#E2E3DC] outline-none focus:ring-2 focus:ring-[#4A6D22] resize-y"
                  />
                </div>

                {/* Text Alignment & Presets */}
                <div className="pt-2 border-t border-[#E1E4D5]/60 dark:border-[#43493E]/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285]">جهت چینش متن:</span>
                    <div className="flex items-center gap-1 bg-[#EDEEEB] dark:bg-[#23251D] p-1 rounded-xl border border-[#E1E4D5] dark:border-[#43493E]">
                      <button
                        type="button"
                        onClick={() => setShape((s) => ({ ...s, textAlign: 'right' }))}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          (shape.textAlign || 'right') === 'right'
                            ? 'bg-[#4A6D22] text-white'
                            : 'text-[#5E6258] dark:text-[#8F9285]'
                        }`}
                      >
                        راست‌چین (فارسی)
                      </button>
                      <button
                        type="button"
                        onClick={() => setShape((s) => ({ ...s, textAlign: 'center' }))}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          shape.textAlign === 'center'
                            ? 'bg-[#4A6D22] text-white'
                            : 'text-[#5E6258] dark:text-[#8F9285]'
                        }`}
                      >
                        وسط‌چین
                      </button>
                      <button
                        type="button"
                        onClick={() => setShape((s) => ({ ...s, textAlign: 'left' }))}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          shape.textAlign === 'left'
                            ? 'bg-[#4A6D22] text-white'
                            : 'text-[#5E6258] dark:text-[#8F9285]'
                        }`}
                      >
                        چپ‌چین (لاتین)
                      </button>
                    </div>
                  </div>

                  {/* Quick Style Presets for Text Box */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-[#8F9285] block">استایل‌های سریع کادر متنی:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setShape((s) => ({
                            ...s,
                            fillTransparent: true,
                            strokeWidth: 0,
                            textColor: '#1A1C16',
                            shadow: false,
                            shadowType: 'none',
                          }))
                        }
                        className="p-1.5 rounded-xl border border-[#E1E4D5] dark:border-[#43493E] bg-[#EDEEEB]/50 dark:bg-[#1C1C17] text-[10px] font-medium text-right hover:bg-[#D0E8B2]/30 transition-colors"
                      >
                        ✏️ بدون پس‌زمینه (متن آزاد)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setShape((s) => ({
                            ...s,
                            fillTransparent: false,
                            color: '#FFFFFF',
                            strokeColor: '#4A6D22',
                            strokeWidth: 1.5,
                            textColor: '#1A1C16',
                            shadow: true,
                            shadowType: 'soft',
                          }))
                        }
                        className="p-1.5 rounded-xl border border-[#E1E4D5] dark:border-[#43493E] bg-white dark:bg-[#1C1C17] text-[10px] font-medium text-right hover:bg-[#D0E8B2]/30 transition-colors"
                      >
                        📄 کادر متنی سفید استاندارد
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setShape((s) => ({
                            ...s,
                            fillTransparent: false,
                            color: '#F4F9EB',
                            strokeColor: '#4A6D22',
                            strokeWidth: 1.5,
                            textColor: '#1A3700',
                            shadow: true,
                            shadowType: 'soft',
                          }))
                        }
                        className="p-1.5 rounded-xl border border-[#E1E4D5] dark:border-[#43493E] bg-[#F4F9EB] text-[10px] font-medium text-[#1A3700] text-right hover:brightness-95 transition-colors"
                      >
                        🌿 کادر یادداشت زیتونی
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setShape((s) => ({
                            ...s,
                            fillTransparent: false,
                            color: '#FFF8E7',
                            strokeColor: '#B57C1E',
                            strokeWidth: 1.5,
                            textColor: '#664205',
                            shadow: true,
                            shadowType: 'soft',
                          }))
                        }
                        className="p-1.5 rounded-xl border border-[#E1E4D5] dark:border-[#43493E] bg-[#FFF8E7] text-[10px] font-medium text-[#664205] text-right hover:brightness-95 transition-colors"
                      >
                        💡 کادر یادآوری طلایی
                      </button>
                    </div>
                  </div>
                </div>

                {/* Text Color & Size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E1E4D5]/60 dark:border-[#43493E]/60">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285] block">رنگ متن:</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={shape.textColor || '#1A1C16'}
                        onChange={(e) => setShape((s) => ({ ...s, textColor: e.target.value }))}
                        className="w-8 h-8 rounded-lg border border-[#E1E4D5] dark:border-[#43493E] cursor-pointer bg-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShape((s) => ({ ...s, textColor: '#1A1C16' }))}
                        className="px-2 py-1 rounded-lg text-[10px] bg-black/5 dark:bg-white/5 font-bold"
                      >
                        مشکی
                      </button>
                      <button
                        type="button"
                        onClick={() => setShape((s) => ({ ...s, textColor: '#FFFFFF' }))}
                        className="px-2 py-1 rounded-lg text-[10px] bg-black/5 dark:bg-white/5 font-bold"
                      >
                        سفید
                      </button>
                      <button
                        type="button"
                        onClick={() => setShape((s) => ({ ...s, textColor: '#4A6D22' }))}
                        className="px-2 py-1 rounded-lg text-[10px] bg-[#D0E8B2]/40 text-[#1A3700] font-bold"
                      >
                        سبز
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285]">
                      <span>اندازه فونت متن:</span>
                      <span className="text-[#4A6D22] dark:text-[#D0E8B2] font-mono">{shape.textSize || 13} px</span>
                    </div>
                    <input
                      type="range"
                      min={9}
                      max={32}
                      step={1}
                      value={shape.textSize || 13}
                      onChange={(e) => setShape((s) => ({ ...s, textSize: Number(e.target.value) }))}
                      className="w-full h-2 accent-[#4A6D22] dark:accent-[#D0E8B2] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Bold toggle */}
                <div className="pt-2 flex items-center justify-between text-xs border-t border-[#E1E4D5]/60 dark:border-[#43493E]/60">
                  <span className="text-[#5E6258] dark:text-[#8F9285]">ضخامت قلم (Bold):</span>
                  <button
                    type="button"
                    onClick={() => setShape((s) => ({ ...s, textBold: Boolean(!s.textBold) }))}
                    className={`px-3 py-1 rounded-xl font-bold transition-colors ${
                      shape.textBold
                        ? 'bg-[#4A6D22] text-white'
                        : 'bg-[#EDEEEB] dark:bg-[#23251D] text-[#5E6258] dark:text-[#8F9285]'
                    }`}
                  >
                    {shape.textBold ? 'پررنگ (Bold)' : 'عادی'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 border-t border-[#E1E4D5] dark:border-[#43493E] bg-[#F3F4EC] dark:bg-[#171813]">
          {onDelete ? (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className="px-3 py-2 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 text-xs font-bold transition-colors"
            >
              حذف شکل
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5E6258] dark:text-[#8F9285] text-xs font-bold transition-colors"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={() => {
                onSave(shape);
                onClose();
              }}
              className="flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-[#4A6D22] hover:bg-[#3D5A1C] text-white text-xs font-bold shadow-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>تأیید و اعمال</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
