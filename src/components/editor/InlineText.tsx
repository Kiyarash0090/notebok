import React from 'react';
import { MathRenderer } from '../MathRenderer';

interface InlineTextProps {
  text: string;
  className?: string;
  isPrint?: boolean;
  highlightQuery?: string;
}

// Helper to highlight matching text search queries
function renderTextWithHighlight(textStr: string, query?: string, keyPrefix = 'hl'): React.ReactNode {
  if (!query || !query.trim() || !textStr) return textStr;
  const trimmed = query.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = textStr.split(new RegExp(`(${escaped})`, 'gi'));
  if (parts.length <= 1) return textStr;

  return (
    <React.Fragment key={keyPrefix}>
      {parts.map((part, idx) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark
            key={`${keyPrefix}-${idx}`}
            className="bg-[#D0E8B2] dark:bg-[#4A6D22] text-[#1A3700] dark:text-[#E2E3DC] font-bold px-1 py-0.5 rounded shadow-sm border border-[#4A6D22]/30 inline-block my-0.5"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </React.Fragment>
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
        const k = `t${i++}`;
        out.push({
          key: k,
          node: renderTextWithHighlight(text.slice(lastIndex, m.index), highlightQuery, k),
        });
      }
      const token = m[0];
      const idx = i++;
      if (token.startsWith('$')) {
        out.push({ key: `m${idx}`, node: <MathRenderer key={`math-${idx}`} text={token} /> });
      } else if (token.startsWith('`')) {
        out.push({
          key: `c${idx}`,
          node: (
            <code key={`code-${idx}`} className="px-1 py-0.5 rounded-md bg-[#EDEEEB] dark:bg-[#1C1C17] font-mono text-[0.9em]">
              {renderTextWithHighlight(token.slice(1, -1), highlightQuery, `c${idx}`)}
            </code>
          ),
        });
      } else if (token.startsWith('**')) {
        out.push({ key: `b${idx}`, node: <strong key={`b-${idx}`}>{renderTextWithHighlight(token.slice(2, -2), highlightQuery, `b${idx}`)}</strong> });
      } else if (token.startsWith('__')) {
        out.push({ key: `b2${idx}`, node: <strong key={`b2-${idx}`}>{renderTextWithHighlight(token.slice(2, -2), highlightQuery, `b2${idx}`)}</strong> });
      } else if (token.startsWith('~~')) {
        out.push({ key: `s${idx}`, node: <del key={`s-${idx}`}>{renderTextWithHighlight(token.slice(2, -2), highlightQuery, `s${idx}`)}</del> });
      } else if (token.startsWith('*')) {
        out.push({ key: `i${idx}`, node: <em key={`i-${idx}`}>{renderTextWithHighlight(token.slice(1, -1), highlightQuery, `i${idx}`)}</em> });
      } else {
        out.push({ key: `i2${idx}`, node: <em key={`i2-${idx}`}>{renderTextWithHighlight(token.slice(1, -1), highlightQuery, `i2${idx}`)}</em> });
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
      const k = `t${i++}`;
      out.push({
        key: k,
        node: renderTextWithHighlight(text.slice(lastIndex), highlightQuery, k),
      });
    }
    return out.map((o) => o.node);
  }, [text, highlightQuery]);

  return <span className={className}>{parts}</span>;
};

