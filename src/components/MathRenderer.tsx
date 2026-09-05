import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  text: string;
  className?: string;
}

/**
 * Preprocesses LaTeX strings:
 * 1. Wraps Persian/Arabic words that are not already inside \text{...} in \text{...}
 *    so KaTeX treats them as text mode with proper fonts without warnings.
 */
export function preprocessLatex(latex: string): string {
  if (!latex) return '';
  return latex.replace(
    /(\\text\{[^\}]*\})|([\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:\s+[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*)/g,
    (match, alreadyText, persianText) => {
      if (alreadyText) return alreadyText;
      return `\\text{${persianText}}`;
    }
  );
}

/**
 * Splits a block formula into individual lines or logical environment blocks.
 * Preserves \begin{...} ... \end{...} environments intact (like matrix, cases, aligned).
 * Splits on newlines (\n) and LaTeX newline commands (\\) outside of environments.
 */
export function splitMathLines(formula: string): string[] {
  if (!formula) return [];
  const text = formula.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!text) return [];

  // If formula has unescaped & alignment tabs and no explicit \begin{ environment,
  // wrap in \begin{aligned} ... \end{aligned} so equations align properly.
  if (/(?<!\\)&/.test(text) && !text.includes('\\begin{')) {
    const rawLines = text
      .split('\n')
      .map((l) => l.trim().replace(/(?<!\\)\\\\[\s\S]*$/, '').trim())
      .filter(Boolean);
    if (rawLines.length > 1) {
      return [`\\begin{aligned} ${rawLines.join(' \\\\ ')} \\end{aligned}`];
    }
  }

  const rawLines = text.split('\n');
  const blocks: string[] = [];
  let currentBlock: string[] = [];
  let envDepth = 0;

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) {
      if (currentBlock.length > 0 && envDepth === 0) {
        blocks.push(currentBlock.join('\n'));
        currentBlock = [];
      }
      continue;
    }

    const begins = (line.match(/\\begin\{[^}]+\}/g) || []).length;
    const ends = (line.match(/\\end\{[^}]+\}/g) || []).length;

    currentBlock.push(line);
    envDepth += begins - ends;
    if (envDepth < 0) envDepth = 0;

    if (envDepth === 0) {
      blocks.push(currentBlock.join('\n'));
      currentBlock = [];
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join('\n'));
  }

  const result: string[] = [];
  for (let block of blocks) {
    block = block.trim();
    if (!block) continue;

    if (!block.includes('\\begin{')) {
      // Split on double backslash \\ outside environments
      const subLines = block.split(/(?<!\\)\\\\(?:\[[^\]]*\])?/);
      for (const s of subLines) {
        const trimmed = s.trim();
        if (trimmed) result.push(trimmed);
      }
    } else {
      result.push(block.trim());
    }
  }

  return result.length > 0 ? result : [text];
}

export const MathRenderer: React.FC<MathRendererProps> = ({ text, className = '' }) => {
  // Parse text segments: $$block math$$ or $inline math$
  const elements = useMemo(() => {
    if (!text) return null;

    // First split by $$ ... $$ (display mode math)
    const blockRegex = /\$\$([\s\S]*?)\$\$/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    const processInlineMath = (inlineText: string, keyPrefix: string): React.ReactNode[] => {
      const inlineRegex = /\$([^\$\n]+?)\$/g;
      const inlineParts: React.ReactNode[] = [];
      let inlineLastIndex = 0;
      let inlineMatch: RegExpExecArray | null;

      while ((inlineMatch = inlineRegex.exec(inlineText)) !== null) {
        // Text before inline math
        if (inlineMatch.index > inlineLastIndex) {
          inlineParts.push(
            <span key={`${keyPrefix}-t-${inlineLastIndex}`}>
              {inlineText.substring(inlineLastIndex, inlineMatch.index)}
            </span>
          );
        }

        const mathFormula = inlineMatch[1];
        const processed = preprocessLatex(mathFormula);
        try {
          const html = katex.renderToString(processed, {
            displayMode: false,
            throwOnError: false,
            strict: false,
            output: 'htmlAndMathml',
          });
          inlineParts.push(
            <span
              key={`${keyPrefix}-m-${inlineMatch.index}`}
              className="inline-katex mx-1 font-sans select-all inline-block align-middle"
              dir="ltr"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch {
          inlineParts.push(
            <code key={`${keyPrefix}-err-${inlineMatch.index}`} className="text-xs text-red-500 bg-red-50 px-1 rounded">
              ${mathFormula}$
            </code>
          );
        }

        inlineLastIndex = inlineRegex.lastIndex;
      }

      if (inlineLastIndex < inlineText.length) {
        inlineParts.push(
          <span key={`${keyPrefix}-t-end`}>
            {inlineText.substring(inlineLastIndex)}
          </span>
        );
      }

      return inlineParts;
    };

    let blockIdx = 0;
    while ((match = blockRegex.exec(text)) !== null) {
      // Process text before block
      if (match.index > lastIndex) {
        const textBefore = text.substring(lastIndex, match.index);
        parts.push(
          <span key={`block-prev-${blockIdx}`}>
            {processInlineMath(textBefore, `pre-${blockIdx}`)}
          </span>
        );
      }

      const blockFormula = match[1];
      const formulaLines = splitMathLines(blockFormula);

      // Render each line or environment
      const renderedLines: { html: string; isError: boolean; raw: string }[] = [];
      for (const line of formulaLines) {
        const processed = preprocessLatex(line);
        try {
          const html = katex.renderToString(processed, {
            displayMode: true,
            throwOnError: false,
            strict: false,
            output: 'htmlAndMathml',
          });
          renderedLines.push({ html, isError: false, raw: line });
        } catch {
          renderedLines.push({ html: '', isError: true, raw: line });
        }
      }

      if (renderedLines.length === 1 && !renderedLines[0].isError) {
        parts.push(
          <div
            key={`block-math-${blockIdx}`}
            className="my-2 p-2.5 sm:p-3 bg-black/5 dark:bg-white/5 rounded-2xl overflow-x-auto text-center dir-ltr border border-[#E1E4D5] dark:border-[#43493E]"
            dangerouslySetInnerHTML={{ __html: renderedLines[0].html }}
          />
        );
      } else {
        parts.push(
          <div
            key={`block-math-${blockIdx}`}
            className="my-2 p-2.5 sm:p-3 bg-black/5 dark:bg-white/5 rounded-2xl overflow-x-auto text-center dir-ltr border border-[#E1E4D5] dark:border-[#43493E] space-y-2.5 flex flex-col items-center justify-center"
          >
            {renderedLines.map((item, idx) =>
              item.isError ? (
                <pre
                  key={`err-${idx}`}
                  className="p-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/30 rounded-xl dir-ltr"
                >
                  $${item.raw}$$
                </pre>
              ) : (
                <div
                  key={`line-${idx}`}
                  className="w-full flex justify-center items-center py-0.5 overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: item.html }}
                />
              )
            )}
          </div>
        );
      }

      lastIndex = blockRegex.lastIndex;
      blockIdx++;
    }

    if (lastIndex < text.length) {
      parts.push(
        <span key={`block-last`}>
          {processInlineMath(text.substring(lastIndex), 'last')}
        </span>
      );
    }

    return parts;
  }, [text]);

  return <div className={className}>{elements}</div>;
};
