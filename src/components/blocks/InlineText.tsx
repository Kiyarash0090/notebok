import React from 'react';
import { MathRenderer } from '../MathRenderer';

interface InlineTextProps {
  text: string;
  className?: string;
  isPrint?: boolean;
}

// Code spans, inline math, and HTML tags are atomic: emphasis markers inside them are literal.
const ATOMIC_PATTERN = '(`[^`\\n]+`)|(\\$[^$\\n]+\\$)|(<mark>[\\s\\S]*?<\\/mark>)|(<code>[\\s\\S]*?<\\/code>)|(<u>[\\s\\S]*?<\\/u>)|(<del>[\\s\\S]*?<\\/del>)|(<s>[\\s\\S]*?<\\/s>)';

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

const materialize = (text: string, store: KeyedNode[], kp: string): React.ReactNode[] =>
  text
    .split(PLACEHOLDER_SPLIT)
    .map((part, i) => {
      const ph = part.match(/^\uE000(\d+)\uE001$/);
      if (ph) return store[Number(ph[1])](`${kp}-n${i}`);
      return part;
    });

const renderEmphasis = (text: string, kp: string, isPrint = false): React.ReactNode[] => {
  const store: KeyedNode[] = [];
  let work = scanPairs(
    text,
    PAIR1_PATTERN,
    (marker, inner) => {
      if (marker === '~~') {
        return (key) => (
          <del key={key} className="line-through text-[#8F9285] dark:text-[#A8AC9F] print:text-[#64748B]">
            {renderEmphasis(inner, key, isPrint)}
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
            {renderEmphasis(inner, key, isPrint)}
          </mark>
        );
      }
      if (marker === '__') {
        return (key) => (
          <u key={key} className="underline underline-offset-2 decoration-[#4A6D22] dark:decoration-[#D0E8B2]">
            {renderEmphasis(inner, key, isPrint)}
          </u>
        );
      }
      if (marker === '***') {
        return (key) => (
          <em key={key} className="italic font-bold">
            {renderEmphasis(inner, key, isPrint)}
          </em>
        );
      }
      return (key) => (
        <strong key={key} className="font-bold text-[#1A1C16] dark:text-[#E2E3DC] print:text-[#0F172A]">
          {renderEmphasis(inner, key, isPrint)}
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
        {materialize(inner, store, key)}
      </em>
    ),
    store
  );

  work = scanPairs(
    work,
    PAIR2_UNDER_PATTERN,
    (_marker, inner) => (key) => (
      <em key={key} className="italic">
        {materialize(inner, store, key)}
      </em>
    ),
    store
  );

  return materialize(work, store, kp);
};

// Renders markdown-ish emphasis + inline $...$ math + code + highlights
export const InlineText: React.FC<InlineTextProps> = ({ text, className, isPrint = false }) => {
  const parts = React.useMemo(() => {
    if (!text) return [];
    const out: Array<{ key: string; node: React.ReactNode }> = [];
    const re = new RegExp(ATOMIC_PATTERN, 'g');
    let lastIndex = 0;
    let i = 0;
    let m: RegExpExecArray | null;

    while ((m = re.exec(text)) !== null) {
      if (m.index > lastIndex) {
        out.push(
          ...renderEmphasis(text.slice(lastIndex, m.index), `t${i}`, isPrint).map((node, k) => ({
            key: `p${i}-${k}`,
            node,
          }))
        );
        i += 1;
      }

      const token = m[0];

      if (token.startsWith('$')) {
        // Inline Math
        out.push({ key: `m${i++}`, node: <MathRenderer text={token} /> });
      } else if (token.startsWith('`')) {
        // Inline Code `...`
        const codeContent = token.slice(1, -1);
        out.push({
          key: `c${i++}`,
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
              {codeContent}
            </code>
          ),
        });
      } else if (token.startsWith('<mark>')) {
        // HTML <mark>...</mark>
        const inner = token.replace(/^<mark>|<\/mark>$/gi, '');
        out.push({
          key: `hm${i++}`,
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
              {inner}
            </mark>
          ),
        });
      } else if (token.startsWith('<code>')) {
        // HTML <code>...</code>
        const inner = token.replace(/^<code>|<\/code>$/gi, '');
        out.push({
          key: `hc${i++}`,
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
              {inner}
            </code>
          ),
        });
      } else if (token.startsWith('<u>')) {
        // HTML <u>...</u>
        const inner = token.replace(/^<u>|<\/u>$/gi, '');
        out.push({
          key: `hu${i++}`,
          node: <u className="underline underline-offset-2">{inner}</u>,
        });
      } else if (token.startsWith('<del>') || token.startsWith('<s>')) {
        // HTML <del> / <s>
        const inner = token.replace(/^<(del|s)>|<\/(del|s)>$/gi, '');
        out.push({
          key: `hd${i++}`,
          node: <del className="line-through text-[#8F9285] print:text-[#64748B]">{inner}</del>,
        });
      }

      lastIndex = re.lastIndex;
    }

    if (lastIndex < text.length) {
      out.push(
        ...renderEmphasis(text.slice(lastIndex), `t${i}`, isPrint).map((node, k) => ({
          key: `p${i}-${k}`,
          node,
        }))
      );
    }

    return out.map((o) => o.node);
  }, [text, isPrint]);

  return <span className={className}>{parts}</span>;
};

