import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Sparkles, HelpCircle, Copy, Code, Eye, RefreshCw } from 'lucide-react';
import { MathRenderer } from './MathRenderer';

interface LatexFormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (renderedLatex: string) => void;
  initialFormula?: string;
}

export const LatexFormulaModal: React.FC<LatexFormulaModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialFormula = '',
}) => {
  const [formula, setFormula] = useState(initialFormula);
  const [displayMode, setDisplayMode] = useState<'inline' | 'block'>('block');
  const [activeCategory, setActiveCategory] = useState<'basic' | 'calculus' | 'greek' | 'symbols' | 'matrices'>('basic');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Strip outer $ or $$ if initialFormula was passed
      let clean = initialFormula.trim();
      if (clean.startsWith('$$') && clean.endsWith('$$')) {
        clean = clean.slice(2, -2).trim();
        setDisplayMode('block');
      } else if (clean.startsWith('$') && clean.endsWith('$')) {
        clean = clean.slice(1, -1).trim();
        setDisplayMode('inline');
      }
      setFormula(clean);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, initialFormula]);

  if (!isOpen) return null;

  const handleInsertSymbol = (snippet: string) => {
    if (!textareaRef.current) {
      setFormula((prev) => prev + snippet);
      return;
    }
    const start = textareaRef.current.selectionStart ?? formula.length;
    const end = textareaRef.current.selectionEnd ?? formula.length;
    const newFormula = formula.substring(0, start) + snippet + formula.substring(end);
    setFormula(newFormula);

    setTimeout(() => {
      textareaRef.current?.focus();
      const newPos = start + snippet.length;
      textareaRef.current?.setSelectionRange(newPos, newPos);
    }, 50);
  };

  const handleConfirm = () => {
    const trimmed = formula.trim();
    if (!trimmed) {
      onClose();
      return;
    }

    let finalFormatted = '';
    // If user already wrote $ or $$, don't double wrap
    if (trimmed.startsWith('$')) {
      finalFormatted = trimmed;
    } else {
      if (displayMode === 'block') {
        finalFormatted = `\n$$ ${trimmed} $$\n`;
      } else {
        finalFormatted = `$${trimmed}$`;
      }
    }

    onConfirm(finalFormatted);
    onClose();
  };

  // Preview string formatted for MathRenderer
  const previewText = formula.trim()
    ? displayMode === 'block'
      ? `$$ ${formula.trim()} $$`
      : `$${formula.trim()}$`
    : '';

  const PRESET_CATEGORIES = [
    { id: 'basic', label: 'اصلی و پایه' },
    { id: 'calculus', label: 'حسابان و دیفرانسیل' },
    { id: 'greek', label: 'حروف یونانی' },
    { id: 'symbols', label: 'روابط و نمادها' },
    { id: 'matrices', label: 'ماتریس و سیستم' },
  ] as const;

  const BASIC_PRESETS = [
    { label: 'کسر', code: '\\frac{a}{b}', title: 'کسر ریاضی' },
    { label: 'توان', code: 'x^2', title: 'توان' },
    { label: 'زیرنویس', code: 'x_n', title: 'اندیس پایینی' },
    { label: 'رادیکال', code: '\\sqrt{x}', title: 'فرمول جذر' },
    { label: 'فرمول کسر و توان', code: '\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', title: 'معادله درجه دو' },
    { label: 'قدر مطلق', code: '|x|', title: 'قدر مطلق' },
  ];

  const CALCULUS_PRESETS = [
    { label: 'انتگرال معین', code: '\\int_{a}^{b} f(x) dx', title: 'انتگرال با حدود' },
    { label: 'انتگرال دوگانه', code: '\\iint_D f(x,y) dx dy', title: 'انتگرال دوگانه' },
    { label: 'سیگما (مجموع)', code: '\\sum_{i=1}^{n} x_i', title: 'مجموع سیگما' },
    { label: 'ضرب‌کننده (پای)', code: '\\prod_{i=1}^{n} a_i', title: 'حاصل‌ضرب' },
    { label: 'حد (Limit)', code: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1', title: 'حد ریاضی' },
    { label: 'مشتق نسبی', code: '\\frac{\\partial f}{\\partial x}', title: 'مشتق جزئی' },
  ];

  const GREEK_SYMBOLS = [
    '\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\zeta', '\\eta', '\\theta',
    '\\iota', '\\kappa', '\\lambda', '\\mu', '\\nu', '\\xi', '\\pi', '\\rho',
    '\\sigma', '\\tau', '\\phi', '\\chi', '\\psi', '\\omega',
    '\\Gamma', '\\Delta', '\\Theta', '\\Lambda', '\\Sigma', '\\Phi', '\\Psi', '\\Omega'
  ];

  const OPERATOR_SYMBOLS = [
    { label: '± مثبت‌منفی', code: '\\pm' },
    { label: '× ضرب', code: '\\times' },
    { label: '÷ تقسیم', code: '\\div' },
    { label: '≠ نامساوی', code: '\\neq' },
    { label: '≤ کوچک‌تر مساوی', code: '\\leq' },
    { label: '≥ بزرگ‌تر مساوی', code: '\\geq' },
    { label: '≈ تقریب', code: '\\approx' },
    { label: '∞ بی‌نهایت', code: '\\infty' },
    { label: '→ فلش راست', code: '\\rightarrow' },
    { label: '← فلش چپ', code: '\\leftarrow' },
    { label: '∈ عضویت', code: '\\in' },
    { label: '∀ به ازای هر', code: '\\forall' },
    { label: '∃ وجود دارد', code: '\\exists' },
    { label: '∇ نوبلا (Grad)', code: '\\nabla' },
    { label: '∂ مشتق', code: '\\partial' },
  ];

  const MATRIX_PRESETS = [
    {
      label: 'ماتریس ۲×۲',
      code: '\\begin{pmatrix}\na & b \\\\\nc & d\n\\end{pmatrix}',
      title: 'ماتریس با پرانتز'
    },
    {
      label: 'ماتریس ۳×۳',
      code: '\\begin{pmatrix}\na & b & c \\\\\nd & e & f \\\\\ng & h & i\n\\end{pmatrix}',
      title: 'ماتریس ۳ در ۳'
    },
    {
      label: 'دترمینان ۲×۲',
      code: '\\begin{vmatrix}\na & b \\\\\nc & d\n\\end{vmatrix}',
      title: 'دترمینان قدرمطلقی'
    },
    {
      label: 'دستگاه دو معادله',
      code: '\\begin{cases}\nx + y = 5 \\\\\n2x - y = 1\n\\end{cases}',
      title: 'دستگاه معادلات'
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="latex-formula-modal"
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-[28px] bg-white dark:bg-[#1A1C16] text-[#1A1C16] dark:text-[#E2E3DC] border border-[#E1E4D5] dark:border-[#43493E] shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E1E4D5] dark:border-[#43493E] flex items-center justify-between gap-3 bg-purple-500/5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold text-lg shadow-2xs">
              <span className="font-mono">𝑥</span>
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-[#1A1C16] dark:text-[#E2E3DC] flex items-center gap-2">
                درج و ساخت فرمول ریاضی (LaTeX)
              </h3>
              <p className="text-xs text-[#5E6258] dark:text-[#8F9285]">
                کد فرمول را وارد کنید تا پیش‌نمایش زنده آن رندر شود
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5E6258] dark:text-[#8F9285] transition-colors"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Display Mode Selector */}
          <div className="flex items-center justify-between gap-3 bg-black/5 dark:bg-white/5 p-1.5 rounded-2xl border border-[#E1E4D5] dark:border-[#43493E]">
            <span className="text-xs font-bold px-2 text-[#5E6258] dark:text-[#8F9285]">
              نحوه نمایش فرمول:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDisplayMode('block')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  displayMode === 'block'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                بلوکی و جداگانه ($$...$$)
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('inline')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  displayMode === 'inline'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/10'
                }`}
              >
                درون‌خطی ($...$)
              </button>
            </div>
          </div>

          {/* Formula Text Input Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1A1C16] dark:text-[#E2E3DC] flex items-center gap-1.5">
                <Code className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                متن کد فرمول (LaTeX Syntax):
              </label>
              {formula && (
                <button
                  type="button"
                  onClick={() => setFormula('')}
                  className="text-[11px] font-bold text-red-500 hover:underline"
                >
                  پاک‌سازی متن
                </button>
              )}
            </div>
            <textarea
              ref={textareaRef}
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="مثال: \frac{-b \pm \sqrt{b^2 - 4ac}}{2a} یا E = mc^2"
              rows={3}
              dir="ltr"
              className="w-full p-3.5 bg-black/5 dark:bg-white/5 border border-[#E1E4D5] dark:border-[#43493E] focus:border-purple-500 rounded-2xl text-sm font-mono text-[#1A1C16] dark:text-[#E2E3DC] placeholder-[#5E6258] dark:placeholder-[#8F9285] focus:outline-none transition-colors"
            />
          </div>

          {/* Real-time Rendered Live Preview Box */}
          <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-2">
            <div className="flex items-center justify-between border-b border-purple-500/10 pb-2">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                پیش‌نمایش زنده و رندر شده (KaTeX Live Preview):
              </span>
              <span className="text-[10px] text-purple-600/70 dark:text-purple-300/70 font-mono">
                {displayMode === 'block' ? 'Display Mode' : 'Inline Mode'}
              </span>
            </div>

            <div className="min-h-[70px] flex items-center justify-center p-3 bg-white dark:bg-[#12140E] rounded-xl border border-[#E1E4D5] dark:border-[#43493E]">
              {formula.trim() ? (
                <MathRenderer text={previewText} />
              ) : (
                <span className="text-xs text-[#5E6258] dark:text-[#8F9285] italic">
                  فرمول خود را در کادر بالا بنویسید یا روی نمادهای آماده کلیک کنید...
                </span>
              )}
            </div>
          </div>

          {/* Symbol & Preset Quick Palette */}
          <div className="space-y-3 pt-1 border-t border-[#E1E4D5] dark:border-[#43493E]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1A1C16] dark:text-[#E2E3DC] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-300" />
                نمادها و فرمول‌های آماده (افزودن سریع):
              </span>
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {PRESET_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
                    activeCategory === cat.id
                      ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700'
                      : 'bg-black/5 dark:bg-white/5 text-[#5E6258] dark:text-[#8F9285] hover:bg-black/10'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Category Items */}
            <div className="p-3 bg-black/5 dark:bg-white/5 rounded-2xl border border-[#E1E4D5] dark:border-[#43493E]">
              {activeCategory === 'basic' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BASIC_PRESETS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleInsertSymbol(item.code)}
                      className="p-2 bg-white dark:bg-[#12140E] hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-[#E1E4D5] dark:border-[#43493E] hover:border-purple-400 rounded-xl text-right transition-colors"
                      title={item.title}
                    >
                      <div className="text-[11px] font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                        {item.label}
                      </div>
                      <div className="text-[10px] font-mono text-purple-600 dark:text-purple-300 dir-ltr truncate mt-0.5">
                        {item.code}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {activeCategory === 'calculus' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CALCULUS_PRESETS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleInsertSymbol(item.code)}
                      className="p-2 bg-white dark:bg-[#12140E] hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-[#E1E4D5] dark:border-[#43493E] hover:border-purple-400 rounded-xl text-right transition-colors"
                      title={item.title}
                    >
                      <div className="text-[11px] font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                        {item.label}
                      </div>
                      <div className="text-[10px] font-mono text-purple-600 dark:text-purple-300 dir-ltr truncate mt-0.5">
                        {item.code}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {activeCategory === 'greek' && (
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                  {GREEK_SYMBOLS.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleInsertSymbol(sym)}
                      className="px-2.5 py-1.5 bg-white dark:bg-[#12140E] hover:bg-purple-100 dark:hover:bg-purple-900/40 border border-[#E1E4D5] dark:border-[#43493E] hover:border-purple-400 rounded-xl text-xs font-mono text-purple-700 dark:text-purple-300 transition-colors dir-ltr"
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              )}

              {activeCategory === 'symbols' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {OPERATOR_SYMBOLS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleInsertSymbol(item.code)}
                      className="p-2 bg-white dark:bg-[#12140E] hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-[#E1E4D5] dark:border-[#43493E] hover:border-purple-400 rounded-xl text-right transition-colors"
                    >
                      <div className="text-[11px] font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                        {item.label}
                      </div>
                      <div className="text-[10px] font-mono text-purple-600 dark:text-purple-300 dir-ltr truncate mt-0.5">
                        {item.code}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {activeCategory === 'matrices' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MATRIX_PRESETS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleInsertSymbol(item.code)}
                      className="p-2.5 bg-white dark:bg-[#12140E] hover:bg-purple-50 dark:hover:bg-purple-950/30 border border-[#E1E4D5] dark:border-[#43493E] hover:border-purple-400 rounded-xl text-right transition-colors"
                      title={item.title}
                    >
                      <div className="text-[11px] font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                        {item.label}
                      </div>
                      <div className="text-[10px] font-mono text-purple-600 dark:text-purple-300 dir-ltr whitespace-pre-wrap mt-1">
                        {item.code}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-[#E1E4D5] dark:border-[#43493E] bg-black/5 dark:bg-white/5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl border border-[#E1E4D5] dark:border-[#43493E] hover:bg-black/5 dark:hover:bg-white/5 text-xs font-bold text-[#5E6258] dark:text-[#8F9285] transition-colors"
          >
            انصراف
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>تأیید و درج فرمول در متن</span>
          </button>
        </div>
      </div>
    </div>
  );
};
