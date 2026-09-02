import React from 'react';
import { Note } from '../types';
import { ensureBlocks } from '../lib/blocks';
import { BlockRenderer } from './blocks/BlockRenderer';

// Renders a clean, printable version of a note (used for the PDF/print export).
export const PrintView: React.FC<{ note: Note }> = ({ note }) => {
  const blocks = ensureBlocks(note);
  return (
    <div className="print-doc">
      <div className="p-8" style={{ color: '#1A1C16', background: '#ffffff' }}>
        {note.title && <h1 className="text-2xl font-extrabold mb-3">{note.title}</h1>}
        {note.summary && (
          <div className="mb-4 p-3 rounded-lg text-xs" style={{ background: '#FAF2DE' }}>
            {note.summary}
          </div>
        )}
        <BlockRenderer blocks={blocks} attachments={note.attachments} />
        <div className="mt-6 text-[10px]" style={{ color: '#8F9285' }}>
          ساخته‌شده با NIVRA — Write Learn Remember · {new Date(note.updatedAt || note.createdAt).toLocaleDateString('fa-IR')}
        </div>
      </div>
    </div>
  );
};
