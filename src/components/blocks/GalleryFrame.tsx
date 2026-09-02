import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaGalleryItem, NoteAttachment } from '../../types';

// Measure image/video intrinsic sizes and pick a uniform frame (the largest
// media's aspect) so switching pages never shifts the layout.
function useGalleryRatio(items: MediaGalleryItem[], attachments: NoteAttachment[]): number {
  const [ratio, setRatio] = useState(0.75);
  useEffect(() => {
    let cancelled = false;
    let max = 0;
    let pending = 0;
    const finish = () => {
      if (!cancelled) setRatio(Math.max(0.5, Math.min(1.6, max || 0.75)));
    };
    const track = (att: NoteAttachment) => {
      pending++;
      if (att.type === 'image') {
        const img = new Image();
        img.onload = () => {
          max = Math.max(max, img.naturalHeight / Math.max(1, img.naturalWidth));
          if (!--pending) finish();
        };
        img.onerror = () => {
          if (!--pending) finish();
        };
        img.src = att.url;
      } else if (att.type === 'video') {
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.onloadedmetadata = () => {
          max = Math.max(max, (v.videoHeight || 1) / Math.max(1, v.videoWidth || 1));
          if (!--pending) finish();
        };
        v.onerror = () => {
          if (!--pending) finish();
        };
        v.src = att.url;
      } else {
        pending--;
      }
    };
    for (const item of items) {
      const att = attachments.find((a) => a.id === item.attachmentId);
      if (att) track(att);
    }
    return () => {
      cancelled = true;
    };
  }, [items, attachments]);
  return ratio;
}

interface GalleryFrameProps {
  items: MediaGalleryItem[];
  attachments: NoteAttachment[];
  index: number;
  onChange: (i: number) => void;
  renderItem: (item: MediaGalleryItem, att: NoteAttachment) => React.ReactNode;
}

// Shared paginated media frame: uniform aspect (based on the largest media),
// horizontal swipe on touch, slide animation, arrows and LTR dots.
export const GalleryFrame: React.FC<GalleryFrameProps> = ({ items, attachments, index, onChange, renderItem }) => {
  const ratio = useGalleryRatio(items, attachments);
  const [animClass, setAnimClass] = useState('');
  const firstRef = useRef(true);
  const touchX = useRef<number | null>(null);
  const cur = items.length ? Math.min(index, items.length - 1) : 0;
  const att = items[cur] ? attachments.find((a) => a.id === items[cur].attachmentId) : undefined;

  // Adapt the frame to the content: image/video galleries keep a uniform
  // aspect (based on the largest visual media), while file/audio-only
  // galleries hug their cards instead of reserving an empty 4:3 box.
  const hasImageOrVideo = items.some((item) => {
    const a = attachments.find((x) => x.id === item.attachmentId);
    return a && (a.type === 'image' || a.type === 'video');
  });
  const frameStyle = hasImageOrVideo
    ? { aspectRatio: String(1 / ratio), maxHeight: '72vh' }
    : { maxHeight: '72vh' };

  useEffect(() => {
    firstRef.current = false;
  }, []);

  const go = (target: number) => {
    if (!items.length) return;
    const t = ((target % items.length) + items.length) % items.length;
    if (t === cur) return;
    setAnimClass(t > cur ? 'gallery-slide-in-right' : 'gallery-slide-in-left');
    onChange(t);
  };
  const prev = () => go(cur - 1);
  const next = () => go(cur + 1);

  return (
    <div className="space-y-2">
      <div
        className="relative w-full overflow-hidden rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto"
        style={frameStyle}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 40) {
            if (dx < 0) next();
            else prev();
          }
        }}
      >
        <div key={cur} className={`w-full h-full flex items-center justify-center overflow-hidden ${firstRef.current ? '' : animClass}`}>
          {att ? renderItem(items[cur], att) : null}
        </div>

        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 hidden items-center justify-center rounded-full bg-black/60 sm:flex active:bg-black/80 text-white shadow-lg backdrop-blur-sm transition-transform active:scale-95 touch-manipulation pointer-events-auto"
              title="قبلی"
              aria-label="عکس قبلی"
            >
              <ChevronLeft className="w-6 h-6 text-white stroke-[2.5] block shrink-0" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 hidden items-center justify-center rounded-full bg-black/60 sm:flex active:bg-black/80 text-white shadow-lg backdrop-blur-sm transition-transform active:scale-95 touch-manipulation pointer-events-auto"
              title="بعدی"
              aria-label="عکس بعدی"
            >
              <ChevronRight className="w-6 h-6 text-white stroke-[2.5] block shrink-0" />
            </button>
          </>
        )}
      </div>

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5" dir="ltr">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === cur ? 'bg-[#4A6D22] dark:bg-[#D0E8B2]' : 'bg-[#D0E8B2]/50 dark:bg-[#43493E]'
              }`}
              title={`${i + 1} از ${items.length}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
