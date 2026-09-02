import React from 'react';
import { MathRenderer } from '../MathRenderer';

interface InlineTextProps {
  text: string;
  className?: string;
}

// Code spans and inline math are atomic: emphasis markers inside them are literal.
const ATOMIC_PATTERN = '(`[^`\\n]+`)|(\\$[^$\\n]+\\$)';
// Pair content may not start or end with a space so a stray unmatched marker
// cannot swallow the rest of the line. Bold/strike run first; the single-marker
// pass then sees those spans as opaque placeholders, so both nesting orders work
// (e.g. **bold *italic* bold** and *italic **bold** italic*).
const PAIR1_PATTERN = '(\\*\\*\\*|\\*\\*|~~|__|==)([^\\s]([^\\n]*?)[^\\s]|[^\\s])\\1';
const PAIR2_STAR_PATTERN = '(\\*)([^\\s*]([^\\n]*?)[^\\s*]|[^\\s*])\\1';
const PAIR2_UNDER_PATTERN = '(_)([^\\s_]([^\\n]*?)[^\\s_]|[^\\s_])\\1';

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

const renderEmphasis = (text: string, kp: string): React.ReactNode[] => {
  const store: KeyedNode[] = [];
  let work = scanPairs(text, PAIR1_PATTERN, (marker, inner) => {
    if (marker === '~~') return (key) => <del key={key}>{renderEmphasis(inner, key)}</del>;
    if (marker === '==')
      return (key) => (
        <mark key={key} className="px-0.5 rounded-sm bg-[#F9E79F] dark:bg-[#4A4410] text-inherit">
          {renderEmphasis(inner, key)}
        </mark>
      );
    if (marker === '***')
      return (key) => (
        <em key={key}>
          <strong>{renderEmphasis(inner, key)}</strong>
        </em>
      );
    return (key) => <strong key={key}>{renderEmphasis(inner, key)}</strong>;
  }, store);
  work = scanPairs(
    work,
    PAIR2_STAR_PATTERN,
    (_marker, inner) => (key) => <em key={key}>{materialize(inner, store, key)}</em>,
    store
  );
  work = scanPairs(
    work,
    PAIR2_UNDER_PATTERN,
    (_marker, inner) => (key) => <em key={key}>{materialize(inner, store, key)}</em>,
    store
  );
  return materialize(work, store, kp);
};

// Renders markdown-ish emphasis + inline $...$ math, used inside block text.
export const InlineText: React.FC<InlineTextProps> = ({ text, className }) => {
  const parts = React.useMemo(() => {
    const out: Array<{ key: string; node: React.ReactNode }> = [];
    const re = new RegExp(ATOMIC_PATTERN, 'g');
    let lastIndex = 0;
    let i = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > lastIndex) {
        out.push(...renderEmphasis(text.slice(lastIndex, m.index), `t${i}`).map((node, k) => ({ key: `p${i}-${k}`, node })));
        i += 1;
      }
      const token = m[0];
      if (token.startsWith('$')) {
        out.push({ key: `m${i++}`, node: <MathRenderer text={token} /> });
      } else {
        out.push({
          key: `c${i++}`,
          node: (
            <code className="px-1 py-0.5 rounded-md bg-[#EDEEEB] dark:bg-[#1C1C17] font-mono text-[0.9em]">
              {token.slice(1, -1)}
            </code>
          ),
        });
      }
      lastIndex = re.lastIndex;
    }
    if (lastIndex < text.length) {
      out.push(...renderEmphasis(text.slice(lastIndex), `t${i}`).map((node, k) => ({ key: `p${i}-${k}`, node })));
    }
    return out.map((o) => o.node);
  }, [text]);

  return <span className={className}>{parts}</span>;
};
