import React from 'react';
import { MathRenderer } from '../MathRenderer';

interface InlineTextProps {
  text: string;
  className?: string;
  isPrint?: boolean;
  highlightQuery?: string;
}

// Helper to highlight matching text search queries
function renderTextWithHighlight(textStr: string, query?: string): React.ReactNode {
  if (!query || !query.trim() || !textStr) return textStr;
  const trimmed = query.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = textStr.split(new RegExp(`(${escaped})`, 'gi'));
  if (parts.length <= 1) return textStr;

  return (
    <>
      {parts.map((part, idx) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark
            key={idx}
            className="bg-[#D0E8B2] dark:bg-[#4A6D22] text-[#1A3700] dark:text-[#E2E3DC] font-bold px-1 py-0.5 rounded shadow-sm border border-[#4A6D22]/30 inline-block my-0.5"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

// Renders markdown-ish emphasis + inline $...$ math, used inside block text.
export const InlineText: React.FC<InlineTextProps> = ({ text, className, highlightQuery }) => {
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
        out.push({
          key: `t${i++}`,
          node: renderTextWithHighlight(text.slice(lastIndex, m.index), highlightQuery),
        });
      }
      const token = m[0];
      if (token.startsWith('$')) {
        out.push({ key: `m${i++}`, node: <MathRenderer key={`math-${i}`} text={token} /> });
      } else if (token.startsWith('`')) {
        out.push({
          key: `c${i++}`,
          node: (
            <code key={`code-${i}`} className="px-1 py-0.5 rounded-md bg-[#EDEEEB] dark:bg-[#1C1C17] font-mono text-[0.9em]">
              {renderTextWithHighlight(token.slice(1, -1), highlightQuery)}
            </code>
          ),
        });
      } else if (token.startsWith('**')) {
        out.push({ key: `b${i++}`, node: <strong key={`b-${i}`}>{renderTextWithHighlight(token.slice(2, -2), highlightQuery)}</strong> });
      } else if (token.startsWith('__')) {
        out.push({ key: `b2${i++}`, node: <strong key={`b2-${i}`}>{renderTextWithHighlight(token.slice(2, -2), highlightQuery)}</strong> });
      } else if (token.startsWith('~~')) {
        out.push({ key: `s${i++}`, node: <del key={`s-${i}`}>{renderTextWithHighlight(token.slice(2, -2), highlightQuery)}</del> });
      } else if (token.startsWith('*')) {
        out.push({ key: `i${i++}`, node: <em key={`i-${i}`}>{renderTextWithHighlight(token.slice(1, -1), highlightQuery)}</em> });
      } else {
        out.push({ key: `i2${i++}`, node: <em key={`i2-${i}`}>{renderTextWithHighlight(token.slice(1, -1), highlightQuery)}</em> });
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      out.push({
        key: `t${i++}`,
        node: renderTextWithHighlight(text.slice(lastIndex), highlightQuery),
      });
    }
    return out.map((o) => o.node);
  }, [text, highlightQuery]);

  return <span className={className}>{parts}</span>;
};

