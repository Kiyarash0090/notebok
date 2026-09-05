import React from 'react';
import { MathRenderer } from '../MathRenderer';

interface InlineTextProps {
  text: string;
  className?: string;
  isPrint?: boolean;
  highlightQuery?: string;
  renderMath?: boolean;
}

// Helper to highlight matching text search queries
function applySearchHighlight(node: React.ReactNode, query?: string, keyPrefix = 'hl'): React.ReactNode {
  if (!query || !query.trim() || node === null || node === undefined) return node;
  const q = query.trim();
  if (typeof node === 'string') {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = node.split(new RegExp(`(${escaped})`, 'gi'));
    if (parts.length <= 1) return node;
    return (
      <React.Fragment key={keyPrefix}>
        {parts.map((part, idx) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <mark
              key={`${keyPrefix}-${idx}`}
              className="bg-[#D0E8B2] dark:bg-[#4A6D22] text-[#1A3700] dark:text-[#E2E3DC] font-extrabold px-1 py-0.5 rounded shadow-sm border border-[#4A6D22]/40"
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
  return node;
}

// Code spans, inline/block math, environments, and HTML tags are atomic: emphasis markers inside them are literal.
const ATOMIC_PATTERN_MATH =
  '(`[^`\\n]+`)' +
  '|(\\$\\$[\\s\\S]*?\\$\\$)' +
  '|(\\\\[\\x5B\\x5D][\\s\\S]*?\\\\[\\x5B\\x5D])' +
  '|(\\$[^$\\n]+\\$)' +
  '|(\\\\[\\x28\\x29][\\s\\S]*?\\\\[\\x28\\x29])' +
  '|(\\\\begin\\{[a-zA-Z0-9_*]+\\}[\\s\\S]*?\\\\end\\{[a-zA-Z0-9_*]+\\})' +
  '|((?:(?:\\d+[\\.\\,]?\\d*\\s*)?\\\\[a-zA-Z]+(?:\\{[^\\}\\n]*\\}|\\[[^\\]\\n]*\\])*(?:\\s*(?:[\\+\\-\\*/=\\>\\<]|\\\\(?:rightarrow|leftarrow|Rightarrow|Leftarrow|to|times|div|le|ge|ne|approx|in|cdot)\\b|\\rightarrow|\\leftarrow|\\&)\\s*(?:\\d+[\\.\\,]?\\d*\\s*)?(?:\\\\[a-zA-Z]+(?:\\{[^\\}\\n]*\\}|\\[[^\\]\\n]*\\])*|[a-zA-Z0-9]+))*)+)' +
  '|(<mark>[\\s\\S]*?<\\/mark>)' +
  '|(<code>[\\s\\S]*?<\\/code>)' +
  '|(<u>[\\s\\S]*?<\\/u>)' +
  '|(<del>[\\s\\S]*?<\\/del>)' +
  '|(<s>[\\s\\S]*?<\\/s>)';

const ATOMIC_PATTERN_NO_MATH =
  '(`[^`\\n]+`)|(<mark>[\\s\\S]*?<\\/mark>)|(<code>[\\s\\S]*?<\\/code>)|(<u>[\\s\\S]*?<\\/u>)|(<del>[\\s\\S]*?<\\/del>)|(<s>[\\s\\S]*?<\\/s>)';

// Pair patterns: allow flexible content including trimmed whitespace
// Delimiters: ==highlight==, ***bold italic***, **bold**, ~~strike~~, __underline__
const PAIR1_PATTERN = '(\\*\\*\\*|\\*\\*|~~|__|==)([^\\n]+?)\\1';
const PAIR2_STAR_PATTERN = '(\\*)([^\\n*]+?)\\1';
const PAIR2_UNDER_PATTERN = '(_)([^\\n_]+?)\\1';

const PLACEHOLDER_SPLIT = /(\uE000\d+\uE001)/g;

type KeyedNode = (key: string) => React.ReactNode;

// Replaces each delimiter pair with a \uE000idx\uE001 token; the render closure
// builds the node lazily, so a placeholder inside later content stays resolvable.
const scanPairs = (
  text: string,
  pattern: string,
  render: (marker: string, inner: string) => KeyedNode,
  store: KeyedNode[]
): string => {
  const re = new RegExp(pattern, 'g');
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out += text.slice(last, m.index);
    const idx = store.push(render(m[1], m[2])) - 1;
    out += `\uE000${idx}\uE001`;
    last = re.lastIndex;
  }
  return out + text.slice(last);
};

const materialize = (text: string, store: KeyedNode[], kp: string, highlightQuery?: string): React.ReactNode[] =>
  text
    .split(PLACEHOLDER_SPLIT)
    .map((part, i) => {
      const ph = part.match(/^\uE000(\d+)\uE001$/);
      if (ph) return store[Number(ph[1])](`${kp}-n${i}`);
      return applySearchHighlight(part, highlightQuery, `${kp}-t${i}`);
    });

const renderEmphasis = (text: string, kp: string, isPrint = false, highlightQuery?: string): React.ReactNode[] => {
  const store: KeyedNode[] = [];
  let work = scanPairs(
    text,
    PAIR1_PATTERN,
    (marker, inner) => {
      if (marker === '~~') {
        return (key) => (
          <del key={key} className="line-through text-[#8F9285] dark:text-[#A8AC9F] print:text-[#64748B]">
            {renderEmphasis(inner, key, isPrint, highlightQuery)}
          </del>
        );
      }
      if (marker === '==') {
        return (key) => (
          <mark
            key={key}
            className="px-1 py-0.5 rounded bg-[#FEF08A] dark:bg-[#EAB308]/40 text-[#1A1C16] dark:text-[#FEF9C3] font-medium border border-[#FACC15]/70 shadow-[0_1px_2px_rgba(0,0,0,0.04)] print:bg-[#FEF08A] print:text-[#1A1C16] print:border-[#FACC15]"
            style={{
              backgroundColor: isPrint ? '#FEF08A' : undefined,
              color: isPrint ? '#1A1C16' : undefined,
              borderColor: isPrint ? '#FACC15' : undefined,
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
            data-mark="highlight"
          >
            {renderEmphasis(inner, key, isPrint, highlightQuery)}
          </mark>
        );
      }
      if (marker === '__') {
        return (key) => (
          <u key={key} className="underline underline-offset-2 decoration-[#4A6D22] dark:decoration-[#D0E8B2]">
            {renderEmphasis(inner, key, isPrint, highlightQuery)}
          </u>
        );
      }
      if (marker === '***') {
        return (key) => (
          <em key={key} className="italic font-bold">
            {renderEmphasis(inner, key, isPrint, highlightQuery)}
          </em>
        );
      }
      return (key) => (
        <strong key={key} className="font-bold text-[#1A1C16] dark:text-[#E2E3DC] print:text-[#0F172A]">
          {renderEmphasis(inner, key, isPrint, highlightQuery)}
        </strong>
      );
    },
    store
  );

  work = scanPairs(
    work,
    PAIR2_STAR_PATTERN,
    (_marker, inner) => (key) => (
      <em key={key} className="italic">
        {materialize(inner, store, key, highlightQuery)}
      </em>
    ),
    store
  );

  work = scanPairs(
    work,
    PAIR2_UNDER_PATTERN,
    (_marker, inner) => (key) => (
      <em key={key} className="italic">
        {materialize(inner, store, key, highlightQuery)}
      </em>
    ),
    store
  );

  return materialize(work, store, kp, highlightQuery);
};

// Renders markdown-ish emphasis + LaTeX math + code + highlights
export const InlineText: React.FC<InlineTextProps> = ({
  text,
  className,
  isPrint = false,
  highlightQuery,
  renderMath = true,
}) => {
  const parts = React.useMemo(() => {
    if (!text) return [];

    const lines = text.split('\n');
    const result: React.ReactNode[] = [];

    lines.forEach((line, lineIdx) => {
      if (lineIdx > 0) {
        result.push(<br key={`br-${lineIdx}`} />);
      }

      if (!line) return;

      const trimmedLine = line.trim();
      // Only render whole line as display MathRenderer if it's purely a display math formula block
      const isPureDisplayBlock =
        (trimmedLine.startsWith('$$') && trimmedLine.endsWith('$$')) ||
        (trimmedLine.startsWith('\\[') && trimmedLine.endsWith('\\]')) ||
        (trimmedLine.startsWith('\\begin{') && trimmedLine.endsWith('}'));

      if (renderMath && isPureDisplayBlock) {
        result.push(<MathRenderer key={`math-line-${lineIdx}`} text={line} />);
        return;
      }

      // Render standard markdown emphasis & inline formatting + inline math
      const out: Array<{ key: string; node: React.ReactNode }> = [];
      const re = new RegExp(renderMath ? ATOMIC_PATTERN_MATH : ATOMIC_PATTERN_NO_MATH, 'g');
      let lastIndex = 0;
      let i = 0;
      let m: RegExpExecArray | null;

      while ((m = re.exec(line)) !== null) {
        if (m.index > lastIndex) {
          out.push(
            ...renderEmphasis(line.slice(lastIndex, m.index), `t${lineIdx}-${i}`, isPrint, highlightQuery).map((node, k) => ({
              key: `p${lineIdx}-${i}-${k}`,
              node,
            }))
          );
          i += 1;
        }

        const token = m[0];

        // Check if token is an inline math formula
        const isMathToken =
          renderMath &&
          (token.startsWith('$') ||
            token.startsWith('\\') ||
            /^\d+[\.\,]?\d*\s*\\/.test(token));

        if (isMathToken) {
          out.push({
            key: `m${lineIdx}-${i++}`,
            node: <MathRenderer key={`math-inline-${lineIdx}-${i}`} text={token} inline={true} />,
          });
        } else if (token.startsWith('`')) {
          // Inline Code `...`
          const codeContent = token.slice(1, -1);
          out.push({
            key: `c${lineIdx}-${i++}`,
            node: (
              <code
                className="px-1.5 py-0.5 rounded-md bg-[#F1F5F9] dark:bg-[#1E293B] text-[#0F172A] dark:text-[#E2E8F0] border border-[#CBD5E1] dark:border-[#475569] font-mono text-[0.88em] shadow-[0_1px_1px_rgba(0,0,0,0.03)] print:bg-[#F1F5F9] print:text-[#0F172A] print:border-[#CBD5E1]"
                style={{
                  backgroundColor: isPrint ? '#F1F5F9' : undefined,
                  color: isPrint ? '#0F172A' : undefined,
                  borderColor: isPrint ? '#CBD5E1' : undefined,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
                data-mark="code"
              >
                {applySearchHighlight(codeContent, highlightQuery, `ic${lineIdx}-${i}`)}
              </code>
            ),
          });
        } else if (token.startsWith('<mark>')) {
          const inner = token.replace(/^<mark>|<\/mark>$/gi, '');
          out.push({
            key: `hm${lineIdx}-${i++}`,
            node: (
              <mark
                className="px-1 py-0.5 rounded bg-[#FEF08A] dark:bg-[#EAB308]/40 text-[#1A1C16] dark:text-[#FEF9C3] font-medium border border-[#FACC15]/70 print:bg-[#FEF08A] print:text-[#1A1C16] print:border-[#FACC15]"
                style={{
                  backgroundColor: isPrint ? '#FEF08A' : undefined,
                  color: isPrint ? '#1A1C16' : undefined,
                  borderColor: isPrint ? '#FACC15' : undefined,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
                data-mark="highlight"
              >
                {applySearchHighlight(inner, highlightQuery, `hm${lineIdx}-${i}`)}
              </mark>
            ),
          });
        } else if (token.startsWith('<code>')) {
          const inner = token.replace(/^<code>|<\/code>$/gi, '');
          out.push({
            key: `hc${lineIdx}-${i++}`,
            node: (
              <code
                className="px-1.5 py-0.5 rounded-md bg-[#F1F5F9] dark:bg-[#1E293B] text-[#0F172A] dark:text-[#E2E8F0] border border-[#CBD5E1] dark:border-[#475569] font-mono text-[0.88em] print:bg-[#F1F5F9] print:text-[#0F172A] print:border-[#CBD5E1]"
                style={{
                  backgroundColor: isPrint ? '#F1F5F9' : undefined,
                  color: isPrint ? '#0F172A' : undefined,
                  borderColor: isPrint ? '#CBD5E1' : undefined,
                  WebkitPrintColorAdjust: 'exact',
                  printColorAdjust: 'exact',
                }}
                data-mark="code"
              >
                {applySearchHighlight(inner, highlightQuery, `hc${lineIdx}-${i}`)}
              </code>
            ),
          });
        } else if (token.startsWith('<u>')) {
          const inner = token.replace(/^<u>|<\/u>$/gi, '');
          out.push({
            key: `hu${lineIdx}-${i++}`,
            node: <u className="underline underline-offset-2">{applySearchHighlight(inner, highlightQuery, `hu${lineIdx}-${i}`)}</u>,
          });
        } else if (token.startsWith('<del>') || token.startsWith('<s>')) {
          const inner = token.replace(/^<(del|s)>|<\/(del|s)>$/gi, '');
          out.push({
            key: `hd${lineIdx}-${i++}`,
            node: <del className="line-through text-[#8F9285] print:text-[#64748B]">{applySearchHighlight(inner, highlightQuery, `hd${lineIdx}-${i}`)}</del>,
          });
        }

        lastIndex = re.lastIndex;
      }

      if (lastIndex < line.length) {
        out.push(
          ...renderEmphasis(line.slice(lastIndex), `t${lineIdx}-${i}`, isPrint, highlightQuery).map((node, k) => ({
            key: `p${lineIdx}-${i}-${k}`,
            node,
          }))
        );
      }

      result.push(...out.map((o) => o.node));
    });

    return result;
  }, [text, isPrint, highlightQuery, renderMath]);

  return <span className={className}>{parts}</span>;
};

