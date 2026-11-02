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
          className="border-b border-[#CBD5E1] pb-4 mb-4"
          style={{ borderBottomColor: '#CBD5E1' }}
        >
          <div className="flex items-center justify-between gap-4 mb-2">
            <span
              className="text-[10px] font-bold tracking-wider uppercase text-[#2D550A]"
              style={{ color: '#2D550A' }}
            >
              یادداشت NIVRA
            </span>
            <span
              className="text-[10px] text-[#475569] font-medium"
              dir="ltr"
              style={{ color: '#475569' }}
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
            <h1 className="text-2xl font-bold text-[#64748B] italic" style={{ color: '#64748B' }}>
              بدون عنوان
            </h1>
          )}

          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F1F5F9] text-[#1E293B] border border-[#CBD5E1]"
                  style={{
                    backgroundColor: '#F1F5F9',
                    color: '#1E293B',
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
            className="p-4 rounded-2xl text-xs leading-relaxed border border-[#D9C48F] bg-[#FAF5E8]"
            style={{
              backgroundColor: '#FAF5E8',
              borderColor: '#D9C48F',
              color: '#1A1C16',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            <div className="flex items-center gap-1.5 font-bold mb-1.5 text-xs text-[#5C3D00]">
              <span>💡</span>
              <span>نکته کلیدی و خلاصه یادداشت:</span>
            </div>
            <div className="text-[#1A1C16] font-medium leading-relaxed">
              <InlineText text={note.summary} isPrint={true} />
            </div>
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
          className="mt-8 pt-4 border-t border-[#CBD5E1] flex items-center justify-between text-[10px] text-[#475569] font-medium"
          style={{ borderTopColor: '#CBD5E1', color: '#475569' }}
        >
          <span>NIVRA — Write Learn Remember</span>
          <span>نسخه چاپ و خروجی PDF</span>
        </div>
      </div>
    </div>
  );
};

