// Click-to-insert LaTeX helpers for the math block editor.
// The `|` inside a template marks where the caret should land after insertion.
export interface MathSnippet {
  label: string;
  latex: string;
  // Glyph shown on the chip when it differs from the Persian label.
  display?: string;
}

export interface MathSnippetGroup {
  label: string;
  items: MathSnippet[];
}

export const MATH_SNIPPET_GROUPS: MathSnippetGroup[] = [
  {
    label: 'قالب‌های پرکاربرد',
    items: [
      { label: 'کسر', latex: '\\frac{|}{}' },
      { label: 'جذر', latex: '\\sqrt{|}' },
      { label: 'ریشه n', latex: '\\sqrt[|]{}' },
      { label: 'توان', latex: '^{|}' },
      { label: 'زیرنویس', latex: '_{|}' },
      { label: 'انتگرال', latex: '\\int_{|}^{}' },
      { label: 'مجموع', latex: '\\sum_{i=1}^{|}' },
      { label: 'حد', latex: '\\lim_{x \\to |}' },
      { label: 'لگاریتم', latex: '\\ln(|)' },
      { label: 'بردار', latex: '\\vec{|}' },
    ],
  },
  {
    label: 'ماتریس و سیستم',
    items: [
      { label: 'ماتریس پرانتز ( )', latex: '\\begin{pmatrix} | & a \\\\ b & c \\end{pmatrix}' },
      { label: 'ماتریس کروشه [ ]', latex: '\\begin{bmatrix} | & a \\\\ b & c \\end{bmatrix}' },
      { label: 'ماتریس آکولاد { }', latex: '\\begin{Bmatrix} | & a \\\\ b & c \\end{Bmatrix}' },
      { label: 'دترمینان | |', latex: '\\begin{vmatrix} | & a \\\\ b & c \\end{vmatrix}' },
      { label: 'نرم ‖ ‖', latex: '\\begin{Vmatrix} | & a \\\\ b & c \\end{Vmatrix}' },
      { label: 'دستگاه معادلات', latex: '\\begin{cases} | \\\\ a \\end{cases}' },
      { label: 'چندسطر تراز شده', latex: '\\begin{aligned} | \\\\ a \\end{aligned}' },
    ],
  },
  {
    label: 'نمادها',
    items: [
      { label: 'آلفا', latex: '\\alpha', display: 'α' },
      { label: 'بتا', latex: '\\beta', display: 'β' },
      { label: 'گاما', latex: '\\gamma', display: 'γ' },
      { label: 'دلتا کوچک', latex: '\\delta', display: 'δ' },
      { label: 'اپسیلون', latex: '\\varepsilon', display: 'ε' },
      { label: 'زتا', latex: '\\zeta', display: 'ζ' },
      { label: 'تا', latex: '\\eta', display: 'η' },
      { label: 'تتا', latex: '\\theta', display: 'θ' },
      { label: 'کاپا', latex: '\\kappa', display: 'κ' },
      { label: 'لامبدا', latex: '\\lambda', display: 'λ' },
      { label: 'میو', latex: '\\mu', display: 'μ' },
      { label: 'نیو', latex: '\\nu', display: 'ν' },
      { label: 'کسی', latex: '\\xi', display: 'ξ' },
      { label: 'پی', latex: '\\pi', display: 'π' },
      { label: 'رو', latex: '\\rho', display: 'ρ' },
      { label: 'سیگما', latex: '\\sigma', display: 'σ' },
      { label: 'فی', latex: '\\phi', display: 'φ' },
      { label: 'خی', latex: '\\chi', display: 'χ' },
      { label: 'پسی', latex: '\\psi', display: 'ψ' },
      { label: 'اُمگا', latex: '\\omega', display: 'ω' },
      { label: 'دلتای بزرگ', latex: '\\Delta', display: 'Δ' },
      { label: 'امگای بزرگ', latex: '\\Omega', display: 'Ω' },
      { label: 'بی‌نهایت', latex: '\\infty', display: '∞' },
      { label: 'ضرب', latex: '\\times', display: '×' },
      { label: 'تقسیم', latex: '\\div', display: '÷' },
      { label: 'مثبت/منفی', latex: '\\pm', display: '±' },
      { label: 'کوچکتر یا مساوی', latex: '\\leq', display: '≤' },
      { label: 'بزرگتر یا مساوی', latex: '\\geq', display: '≥' },
      { label: 'نامساوی', latex: '\\neq', display: '≠' },
      { label: 'تقریباً مساوی', latex: '\\approx', display: '≈' },
      { label: 'هم‌ارز', latex: '\\equiv', display: '≡' },
      { label: 'متناسب', latex: '\\propto', display: '∝' },
      { label: 'به‌مراتب کوچک', latex: '\\ll', display: '≪' },
      { label: 'به‌مراتب بزرگ', latex: '\\gg', display: '≫' },
      { label: 'میله به', latex: '\\to', display: '→' },
      { label: 'از چپ', latex: '\\leftarrow', display: '←' },
      { label: 'دو طرفه', latex: '\\leftrightarrow', display: '↔' },
      { label: 'لذا/پس', latex: '\\Rightarrow', display: '⇒' },
      { label: 'اگر و تنها اگر', latex: '\\Leftrightarrow', display: '⇔' },
      { label: 'عضو', latex: '\\in', display: '∈' },
      { label: 'عضو نیست', latex: '\\notin', display: '∉' },
      { label: 'اجتماع', latex: '\\cup', display: '∪' },
      { label: 'اشتراک', latex: '\\cap', display: '∩' },
      { label: 'زیرمجموعه', latex: '\\subset', display: '⊂' },
      { label: 'زیرمجموعه مساوی', latex: '\\subseteq', display: '⊆' },
      { label: 'مجموعه تهی', latex: '\\emptyset', display: '∅' },
      { label: 'پارشل', latex: '\\partial', display: '∂' },
      { label: 'نابلا', latex: '\\nabla', display: '∇' },
      { label: 'ال', latex: '\\ell', display: 'ℓ' },
      { label: 'سیگما جمع', latex: '\\sum', display: '∑' },
      { label: 'ضرب زنجیرهای', latex: '\\prod', display: '∏' },
      { label: 'انتگرال', latex: '\\int', display: '∫' },
      { label: 'جمع مستقیم', latex: '\\oplus', display: '⊕' },
      { label: 'ضرب تنسوری', latex: '\\otimes', display: '⊗' },
      { label: 'درجه', latex: '^{\\circ}', display: '°' },
    ],
  },
];
