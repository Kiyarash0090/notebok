import React, { useState, useEffect, useRef } from 'react';
import {
  Pin,
  Star,
  Flame,
  MoreVertical,
  Trash2,
  Archive,
  Copy,
  Check,
  FileDown,
  Folder,
  Tag,
  Sparkles,
  PencilLine,
  Share2,
  Palette,
  RotateCcw,
} from 'lucide-react';
import { Note, Category, ImportanceLevel, NoteAttachment } from '../types';
import { NOTE_COLORS } from '../constants';
import { BlockRenderer } from './blocks/BlockRenderer';
import { ensureBlocks } from '../lib/blocks';

interface NoteCardProps {
  note: Note;
  categories: Category[];
  onEdit: (note: Note, mode?: 'edit' | 'preview') => void;
  onTogglePin: (id: string) => void;
  onToggleImportant: (id: string) => void;
  onDelete: (id: string, permanent?: boolean) => void;
  onRestore?: (id: string) => void;
  onDownloadPdf?: (note: Note) => void;
  onUpdateNote: (id: string, updates: Partial<Note>) => void;
  isTrashView?: boolean;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  categories,
  onEdit,
  onTogglePin,
  onToggleImportant,
  onDelete,
  onRestore,
  onDownloadPdf,
  onUpdateNote,
  isTrashView = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const colorMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showColorMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) {
        setShowColorMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorMenu]);

  const category = categories.find((c) => c.id === note.categoryId);
  const colorObj = NOTE_COLORS.find((c) => c.id === note.color) || NOTE_COLORS[0];

  // Checklist blocks render in their own section (never masked by the content
  // clamp) and toggle straight from the card. Both the block items (what is
  // displayed) and the note.checklists mirror are updated together so they
  // never drift apart.
  const allBlocks = ensureBlocks(note);
  const contentBlocks = allBlocks.filter((b) => b.type !== 'checklist');
  const checklistBlocks = allBlocks.filter((b) => b.type === 'checklist');

  const toggleChecklistItem = (_blockId: string, itemId: string) => {
    const toggleIn = <T extends { id: string; done: boolean }>(list: T[]): T[] =>
      list.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item));
    onUpdateNote(note.id, {
      blocks: (note.blocks || []).map((b) =>
        b.type === 'checklist' ? { ...b, items: toggleIn(b.items || []) } : b
      ),
      checklists: toggleIn(note.checklists || []),
    });
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    let text = `${note.title}\n\n${note.content}`;
    if (note.summary) {
      text += `\n\nنکته کلیدی: ${note.summary}`;
    }
    if (note.checklists && note.checklists.length > 0) {
      text += '\n\nچک‌لیست:\n' + note.checklists.map((c) => `${c.done ? '[x]' : '[ ]'} ${c.text}`).join('\n');
    }
    navigator.clipboard.writeText(text).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChangeColor = (e: React.MouseEvent, colorId: string) => {
    e.stopPropagation();
    onUpdateNote(note.id, { color: colorId });
    setShowColorMenu(false);
  };

  const importanceBadge = () => {
    if (note.importanceLevel === 'critical') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#3E2723] text-[#FFAB91] border border-[#633F38]">
          <Flame className="w-3 h-3" />
          بسیار حیاتی
        </span>
      );
    }
    if (note.importanceLevel === 'high' || note.isImportant) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#3B2F00] text-[#FFE086] border border-[#574728]">
          <Star className="w-3 h-3" />
          نکته مهم
        </span>
      );
    }
    return null;
  };

  return (
    <div
      id={`note-card-${note.id}`}
      // Opening a card reads the note; editing is the explicit ✎ action below
      onClick={() => !isTrashView && onEdit(note, 'preview')}
      className={`group relative rounded-[24px] border transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between overflow-hidden ${
        colorObj.bgLight
      } ${colorObj.bgDark} ${colorObj.borderLight} ${colorObj.borderDark}`}
    >
      {/* Top Banner with Category, Importance, and Pin */}
      <div className="p-4 sm:p-5 pb-2.5">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            {importanceBadge()}

            {category && (
              <span
                className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#D0E8B2]/20 dark:bg-[#1A3700] text-[#1A3700] dark:text-[#D0E8B2] border border-[#D0E8B2]/40 dark:border-[#3D522C]"
                title={category.name}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: category.color || '#4A6D22' }}
                />
                <span className="truncate max-w-[110px]">{category.name}</span>
              </span>
            )}
          </div>

          {/* Pin & Star Quick Actions */}
          {!isTrashView && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleImportant(note.id);
                }}
                className={`p-1.5 rounded-xl transition-colors ${
                  note.isImportant
                    ? 'text-[#FFE086]'
                    : 'text-[#5E6258] dark:text-[#8F9285] hover:text-[#FFE086] opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100'
                }`}
                title="نکته مهم"
              >
                <Star className={`w-4 h-4 ${note.isImportant ? 'fill-current' : ''}`} />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(note.id);
                }}
                className={`p-1.5 rounded-xl transition-colors ${
                  note.isPinned
                    ? 'text-[#4A6D22] dark:text-[#D0E8B2]'
                    : 'text-[#5E6258] dark:text-[#8F9285] hover:text-[#4A6D22] dark:hover:text-[#D0E8B2] opacity-100 sm:opacity-0 group-hover:opacity-100 focus:opacity-100'
                }`}
                title={note.isPinned ? 'برداشتن سنجاق' : 'سنجاق کردن به بالا'}
              >
                <Pin className={`w-4 h-4 ${note.isPinned ? 'fill-current rotate-45' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {/* Title */}
        {note.title && (
          <h3 className="font-bold text-sm sm:text-base text-[#1A1C16] dark:text-[#E2E3DC] mb-2 line-clamp-2 leading-snug">
            {note.title}
          </h3>
        )}

        {/* Block-based Content Flow (checklists live in their own section below) */}
        {contentBlocks.length > 0 && (
          <div className="my-2">
            <BlockRenderer blocks={contentBlocks} attachments={note.attachments} clampHeight={180} compact />
          </div>
        )}

        {/* Checklists — outside the content clamp so they never get masked, and toggleable */}
        {checklistBlocks.length > 0 && (
          <div className="my-2">
            <BlockRenderer
              blocks={checklistBlocks}
              attachments={note.attachments}
              onToggleChecklistItem={isTrashView ? undefined : toggleChecklistItem}
            />
          </div>
        )}

        {/* Summary Box if present */}
        {note.summary && (
          <div className="bg-[#FAF2DE] dark:bg-[#332A18] border-r-3 border-[#8B6814] dark:border-[#FFE086] rounded-xl p-2.5 my-2.5 text-xs text-[#523C0A] dark:text-[#FFF1C2]">
            <div className="font-bold text-[10px] text-[#8B6814] dark:text-[#FFE086] flex items-center gap-1 mb-0.5">
              <Sparkles className="w-3 h-3" />
              نکته کلیدی و خلاصه:
            </div>
            <p className="line-clamp-2 font-medium">{note.summary}</p>
          </div>
        )}

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium bg-[#D0E8B2]/20 dark:bg-[#1A3700]/70 px-2 py-0.5 rounded-full text-[#1A3700] dark:text-[#D0E8B2] border border-[#D0E8B2]/30 dark:border-[#3D522C]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer: Timestamps and Action Toolbar */}
      <div className="px-4 py-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between mt-auto">
        <span className="text-[10px] text-[#5E6258] dark:text-[#5C6156] font-medium">
          {new Date(note.updatedAt || note.createdAt).toLocaleDateString('fa-IR', {
            month: 'short',
            day: 'numeric',
          })}
        </span>

        {isTrashView ? (
          /* Trash specific actions */
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRestore?.(note.id);
              }}
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#4A6D22] dark:text-[#D0E8B2]"
              title="بازگردانی یادداشت"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(note.id, true);
              }}
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#A64D3B]"
              title="حذف برای همیشه"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Normal Action Toolbar */
          <div className="flex items-center gap-0.5 sm:opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Edit — opens the note in edit mode (card click opens it in read mode) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(note, 'edit');
              }}
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5E6258] dark:text-[#8F9285]"
              title="ویرایش"
            >
              <PencilLine className="w-3.5 h-3.5" />
            </button>

            {/* Color Palette dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowColorMenu(!showColorMenu);
                }}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5E6258] dark:text-[#8F9285]"
                title="تغییر رنگ"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>

              {showColorMenu && (
                <div
                  ref={colorMenuRef}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-8 left-0 z-20 flex flex-wrap gap-1.5 p-2 bg-white dark:bg-[#1C1C17] rounded-2xl shadow-xl border border-[#E1E4D5] dark:border-[#43493E] w-40"
                >
                  {NOTE_COLORS.map((col) => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={(e) => handleChangeColor(e, col.id)}
                      className={`w-5 h-5 rounded-full border border-[#E1E4D5] dark:border-[#43493E] ${col.bgLight} ${col.bgDark} transition-transform hover:scale-110 ${
                        note.color === col.id ? 'ring-2 ring-[#4A6D22] dark:ring-[#D0E8B2] scale-110' : ''
                      }`}
                      title={col.name}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Copy Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5E6258] dark:text-[#8F9285]"
              title={copied ? 'کپی شد' : 'کپی متن'}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#4A6D22] dark:text-[#D0E8B2]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {/* PDF export */}
            {onDownloadPdf && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadPdf(note);
                }}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5E6258] dark:text-[#8F9285]"
                title="دانلود PDF"
              >
                <FileDown className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Archive */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateNote(note.id, { isArchived: !note.isArchived });
              }}
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5E6258] dark:text-[#8F9285]"
              title={note.isArchived ? 'خروج از بایگانی' : 'بایگانی کردن'}
            >
              <Archive className="w-3.5 h-3.5" />
            </button>

            {/* Delete / Move to Trash */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(note.id, false);
              }}
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5E6258] hover:text-[#A64D3B]"
              title="انتقال به سطل زباله"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
