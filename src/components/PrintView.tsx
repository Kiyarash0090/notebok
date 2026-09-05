import React from 'react';
import { Note } from '../types';
import { ensureBlocks } from '../lib/blocks';
import { BlockRenderer } from './blocks/BlockRenderer';
import { InlineText } from './blocks/InlineText';

// Renders a clean, printable version of a note (used for the PDF/print export).
export const PrintView: React.FC<{ note: Note }> = ({ note }) => {
  const blocks = ensureBlocks(note);
  const formattedDate = new Date(note.updatedAt || note.createdAt).toLocaleDateString('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className="print-doc print-document bg-white text-[#1A1C16]"
      dir="rtl"
      style={{
        colorScheme: 'light',
        backgroundColor: '#FFFFFF',
        color: '#1A1C16',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      <div className="max-w-3xl mx-auto p-6 sm:p-10 space-y-4">
        {/* Document Header */}
        <div
          className="border-b border-[#E1E4D5] pb-4 mb-4"
          style={{ borderBottomColor: '#CBD5E1' }}
        >
          <div className="flex items-center justify-between gap-4 mb-2">
            <span
              className="text-[10px] font-bold tracking-wider uppercase text-[#4A6D22]"
              style={{ color: '#4A6D22' }}
            >
              یادداشت NIVRA
            </span>
            <span
              className="text-[10px] text-[#8F9285] font-medium"
              dir="ltr"
              style={{ color: '#64748B' }}
            >
              {formattedDate}
            </span>
          </div>

          {note.title ? (
            <h1
              className="text-2xl font-black text-[#1A1C16] leading-tight"
              style={{ color: '#1A1C16' }}
            >
              <InlineText text={note.title} isPrint={true} />
            </h1>
          ) : (
            <h1 className="text-2xl font-bold text-[#8F9285] italic" style={{ color: '#94A3B8' }}>
              بدون عنوان
            </h1>
          )}

          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]"
                  style={{
                    backgroundColor: '#F1F5F9',
                    color: '#475569',
                    borderColor: '#CBD5E1',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Note Summary if any */}
        {note.summary && (
          <div
            className="p-3.5 rounded-xl text-xs leading-relaxed border border-[#E8DFC5] text-[#4E3F1A]"
            style={{
              backgroundColor: '#FAF2DE',
              borderColor: '#E8DFC5',
              color: '#4E3F1A',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            <div className="font-bold mb-1 text-[11px] text-[#7A5B0B]">خلاصه یادداشت:</div>
            <InlineText text={note.summary} isPrint={true} />
          </div>
        )}

        {/* Main Note Blocks with isPrint={true} */}
        <div className="print-blocks space-y-3">
          <BlockRenderer
            blocks={blocks}
            attachments={note.attachments}
            isPrint={true}
          />
        </div>

        {/* Document Footer */}
        <div
          className="mt-8 pt-4 border-t border-[#E1E4D5] flex items-center justify-between text-[10px] text-[#8F9285]"
          style={{ borderTopColor: '#CBD5E1', color: '#94A3B8' }}
        >
          <span>NIVRA — Write Learn Remember</span>
          <span>نسخه چاپ و خروجی PDF</span>
        </div>
      </div>
    </div>
  );
};

