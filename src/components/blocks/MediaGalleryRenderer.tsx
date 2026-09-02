import React, { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { MediaGalleryData, NoteAttachment } from '../../types';
import { MediaFrame } from './MediaFrame';
import { GalleryFrame } from './GalleryFrame';

interface MediaGalleryRendererProps {
  gallery: MediaGalleryData;
  attachments: NoteAttachment[];
  onZoom?: (url: string) => void;
}

// Paginated media viewer: uniform frame, swipe, arrows, dots, and captions.
export const MediaGalleryRenderer: React.FC<MediaGalleryRendererProps> = ({ gallery, attachments, onZoom }) => {
  const [index, setIndex] = useState(0);
  const items = (gallery.items || []).filter((it) => attachments.some((a) => a.id === it.attachmentId));
  if (items.length === 0) return null;
  const cur = Math.min(index, items.length - 1) % items.length;

  const renderItem = (item: MediaGalleryData['items'][number], att: NoteAttachment) => {
    if (att.type === 'image') {
      return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          <div className="relative inline-flex items-center justify-center max-w-full max-h-full">
            <img
              src={att.url}
              alt={item.caption || att.name}
              className="max-w-full max-h-full object-contain mx-auto block select-none"
            />
            {onZoom && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onZoom(att.url);
                }}
                className="absolute top-2 left-2 z-10 p-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white shadow-md backdrop-blur-xs transition-colors"
                title="نمایش در اندازه کامل"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      );
    }
    if (att.type === 'video') {
      return <video src={att.url} controls preload="metadata" className="max-w-full max-h-full object-contain" />;
    }
    return <MediaFrame attachment={att} caption={item.caption} />;
  };

  return (
    <div className="space-y-1">
      <GalleryFrame items={items} attachments={attachments} index={index} onChange={setIndex} renderItem={renderItem} />
      {items[cur]?.caption && items[cur].caption.trim() !== '' && (
        <p className="text-center text-xs text-[#5E6258] dark:text-[#8F9285] px-2">
          {items[cur].caption}
        </p>
      )}
    </div>
  );
};
