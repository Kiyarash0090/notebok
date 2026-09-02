import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import { MediaGalleryItem, NoteAttachment } from '../../types';
import { MediaFrame } from '../blocks/MediaFrame';
import { GalleryFrame } from '../blocks/GalleryFrame';

interface MediaGalleryEditorProps {
  items: MediaGalleryItem[];
  attachments: NoteAttachment[];
  onUpdateItems: (items: MediaGalleryItem[]) => void;
  onAdd: () => void;
  onReplace: (index: number) => void;
  onRemoveItem: (index: number) => void;
  onZoom: (url: string) => void;
  active: boolean;
}

export const MediaGalleryEditor: React.FC<MediaGalleryEditorProps> = ({
  items,
  attachments,
  onUpdateItems,
  onAdd,
  onReplace,
  onRemoveItem,
  onZoom,
  active,
}) => {
  const [index, setIndex] = useState(0);
  const cur = items.length ? Math.min(index, items.length - 1) : 0;
  const item = items[cur];

  const setItem = (idx: number, patch: Partial<MediaGalleryItem>) =>
    onUpdateItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const remove = () => {
    onRemoveItem(cur);
    setIndex(0);
  };
  const prevItem = () => setIndex((cur - 1 + items.length) % items.length);
  const nextItem = () => setIndex((cur + 1) % items.length);

  const controlBtn =
    'flex items-center gap-1 px-1.5 py-0.5 rounded-lg text-[10px] font-bold text-[#5E6258] dark:text-[#8F9285] hover:bg-[#E8ECE0] dark:hover:bg-[#23261F] transition-colors';

  const renderItem = (it: MediaGalleryItem, att: NoteAttachment) => {
    if (att.type === 'image') return <img src={att.url} alt="" className="max-w-full max-h-full object-contain mx-auto block select-none" />;
    if (att.type === 'video')
      return <video src={att.url} controls preload="metadata" className="max-w-full max-h-full object-contain mx-auto block" />;
    return <MediaFrame attachment={att} editable />;
  };

  return (
    <div className="space-y-2">
      {items.length ? (
        <GalleryFrame items={items} attachments={attachments} index={index} onChange={setIndex} renderItem={renderItem} />
      ) : (
        <button
          type="button"
          onClick={onAdd}
          className="w-full py-6 rounded-2xl border-2 border-dashed border-[#D0E8B2] dark:border-[#3D522C] text-[#4A6D22] dark:text-[#D0E8B2] hover:bg-[#EDF5E0] dark:hover:bg-[#232F1A] text-xs font-bold flex items-center justify-center gap-2"
        >
          <ImagePlus className="w-4 h-4" />
          افزودن رسانه به گالری
        </button>
      )}

      {/* Caption + counter */}
      {item && (
        <div className="flex items-center justify-between">
          <input
            value={item.caption || ''}
            onChange={(e) => setItem(cur, { caption: e.target.value })}
            placeholder="کپشن این رسانه..."
            className="flex-1 min-w-0 bg-transparent outline-none text-xs text-[#1A1C16] dark:text-[#E2E3DC] placeholder:text-[#8F9285] border-b border-[#E1E4D5] dark:border-[#43493E] py-1"
          />
          <span className="text-[10px] text-[#8F9285] tabular-nums shrink-0 mr-2" dir="ltr">
            {cur + 1} / {items.length}
          </span>
        </div>
      )}

      {/* Controls */}
      {active && (
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" className={controlBtn} onClick={onAdd}>
            <ImagePlus className="w-3.5 h-3.5" />
            افزودن
          </button>
          {item && (
            <>
              <button type="button" className={controlBtn} onClick={() => onReplace(cur)} title="جایگزینی رسانه">
                <RefreshCw className="w-3.5 h-3.5" />
                جایگزینی
              </button>
              <button type="button" dir="ltr" className={controlBtn} onClick={prevItem} title="رسانه قبلی">
                <ChevronLeft className="w-3.5 h-3.5" />
                قبلی
              </button>
              <button type="button" dir="ltr" className={controlBtn} onClick={nextItem} title="رسانه بعدی">
                بعدی
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button type="button" className={`${controlBtn} hover:!text-[#A64D3B]`} onClick={remove} title="حذف رسانه">
                <Trash2 className="w-3.5 h-3.5" />
                حذف
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
