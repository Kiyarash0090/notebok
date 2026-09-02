import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  text: string;
  className?: string;
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
        try {
          const html = katex.renderToString(mathFormula, {
            displayMode: false,
            throwOnError: false,
            output: 'htmlAndMathml',
          });
          inlineParts.push(
            <span
              key={`${keyPrefix}-m-${inlineMatch.index}`}
              className="inline-katex mx-1 font-sans select-all"
              dir="ltr"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        } catch (e) {
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
      try {
        const html = katex.renderToString(blockFormula, {
          displayMode: true,
          throwOnError: false,
          output: 'htmlAndMathml',
        });
        parts.push(
          <div
            key={`block-math-${blockIdx}`}
            className="my-3 p-3 bg-black/5 dark:bg-white/5 rounded-2xl overflow-x-auto text-center dir-ltr border border-[#E1E4D5] dark:border-[#43493E]"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch (e) {
        parts.push(
          <pre key={`block-err-${blockIdx}`} className="p-2 text-xs text-red-500 bg-red-50 rounded-xl dir-ltr">
            $${blockFormula}$$
          </pre>
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
