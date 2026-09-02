import React from 'react';
import { MathRenderer } from '../MathRenderer';

interface InlineTextProps {
  text: string;
  className?: string;
}

// Renders markdown-ish emphasis + inline $...$ math, used inside block text.
export const InlineText: React.FC<InlineTextProps> = ({ text, className }) => {
  const parts = React.useMemo(() => {
    // Tokenize into code, inline math, bold, italic, strike, and plain text.
    // Order matters: math and code first so their `*` / `_` are not consumed.
    const regex =
      /(\$[^$\n]+\$)|(`[^`]+`)|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(\*[^*\n]+\*)|(_[^_\n]+_)|(~~[^~\n]+~~)/g;

    const out: Array<{ key: string; node: React.ReactNode }> = [];
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > lastIndex) {
        out.push({ key: `t${i++}`, node: text.slice(lastIndex, m.index) });
      }
      const token = m[0];
      if (token.startsWith('$')) {
        out.push({ key: `m${i++}`, node: <MathRenderer key={`math-${i}`} text={token} /> });
      } else if (token.startsWith('`')) {
        out.push({
          key: `c${i++}`,
          node: (
            <code key={`code-${i}`} className="px-1 py-0.5 rounded-md bg-[#EDEEEB] dark:bg-[#1C1C17] font-mono text-[0.9em]">
              {token.slice(1, -1)}
            </code>
          ),
        });
      } else if (token.startsWith('**')) {
        out.push({ key: `b${i++}`, node: <strong key={`b-${i}`}>{token.slice(2, -2)}</strong> });
      } else if (token.startsWith('__')) {
        out.push({ key: `b2${i++}`, node: <strong key={`b2-${i}`}>{token.slice(2, -2)}</strong> });
      } else if (token.startsWith('~~')) {
        out.push({ key: `s${i++}`, node: <del key={`s-${i}`}>{token.slice(2, -2)}</del> });
      } else if (token.startsWith('*')) {
        out.push({ key: `i${i++}`, node: <em key={`i-${i}`}>{token.slice(1, -1)}</em> });
      } else {
        out.push({ key: `i2${i++}`, node: <em key={`i2-${i}`}>{token.slice(1, -1)}</em> });
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      out.push({ key: `t${i++}`, node: text.slice(lastIndex) });
    }
    return out.map((o) => o.node);
  }, [text]);

  return <span className={className}>{parts}</span>;
};
