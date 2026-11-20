import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Star,
  Folder,
  FolderOpen,
  Plus,
  Lock,
} from 'lucide-react';
import { ViewFilter } from '../types';

interface MobileBottomNavProps {
  currentFilter: ViewFilter;
  onSelectFilter: (filter: ViewFilter) => void;
  onOpenCreateModal: () => void;
  onOpenCategoryManager: () => void;
  onOpenFileManager: () => void;
  isTelegramReady?: boolean;
  importantCount: number;
}

type NavTabKey = 'all' | 'important';

interface IndicatorRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentFilter,
  onSelectFilter,
  onOpenCreateModal,
  onOpenCategoryManager,
  onOpenFileManager,
  isTelegramReady = false,
  importantCount,
}) => {
  const navRef = useRef<HTMLDivElement>(null);
  const tabPillRefs = useRef<Record<NavTabKey, HTMLDivElement | null>>({
    all: null,
    important: null,
  });

  const [isHiddenOnScroll, setIsHiddenOnScroll] = useState(false);
  const lastScrollYRef = useRef(0);
  const [indicatorRect, setIndicatorRect] = useState<IndicatorRect | null>(null);

  const activeTabKey: NavTabKey | null =
    currentFilter === 'all' ? 'all' : currentFilter === 'important' ? 'important' : null;

  // Ensure nav reappears when switching filters
  useEffect(() => {
    setIsHiddenOnScroll(false);
  }, [currentFilter]);

  // Auto-hide on scroll down and reappear on scroll up for extra mobile reading space
  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const currentY = window.scrollY;
        const delta = currentY - lastScrollYRef.current;

        if (currentY <= 24) {
          setIsHiddenOnScroll(false);
        } else if (delta > 10 && currentY > 64) {
          setIsHiddenOnScroll(true);
        } else if (delta < -8) {
          setIsHiddenOnScroll(false);
        }

        lastScrollYRef.current = currentY;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const updateIndicator = useCallback(() => {
    const navEl = navRef.current;
    if (!navEl || !activeTabKey) return;
    const pillEl = tabPillRefs.current[activeTabKey];
    if (!pillEl) return;

    let left = 0;
    let top = 0;
    let cur: HTMLElement | null = pillEl;
    while (cur && cur !== navEl) {
      left += cur.offsetLeft;
      top += cur.offsetTop;
      cur = cur.offsetParent as HTMLElement | null;
    }

    setIndicatorRect({
      left,
      top,
      width: pillEl.offsetWidth,
      height: pillEl.offsetHeight,
    });
  }, [activeTabKey]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    const navEl = navRef.current;
    if (!navEl) return;

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateIndicator) : null;
    ro?.observe(navEl);
    window.addEventListener('resize', updateIndicator);

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updateIndicator);
    };
  }, [updateIndicator]);

  return (
    <div
      ref={navRef}
      className={`lg:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] inset-x-3 mx-auto max-w-md z-40 bg-[#FAF9F5]/92 dark:bg-[#1C1C17]/92 backdrop-blur-xl border border-[#E1E4D5]/90 dark:border-[#43493E]/90 rounded-3xl px-2.5 py-1.5 flex items-center justify-between shadow-2xl shadow-black/15 dark:shadow-black/45 transition-all duration-300 ease-out ${
        isHiddenOnScroll
          ? 'translate-y-24 opacity-0 scale-95 pointer-events-none'
          : 'translate-y-0 opacity-100 scale-100'
      }`}
    >
      {/* Smooth sliding active tab indicator */}
      {indicatorRect && (
        <span
          aria-hidden="true"
          style={{
            transform: `translate3d(${indicatorRect.left}px, ${indicatorRect.top}px, 0)`,
            width: `${indicatorRect.width}px`,
            height: `${indicatorRect.height}px`,
          }}
          className={`pointer-events-none absolute top-0 left-0 rounded-full transition-[transform,width,height,background-color,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            activeTabKey === 'important'
              ? 'bg-[#FFE086]/35 dark:bg-[#5C4509] opacity-100'
              : activeTabKey === 'all'
              ? 'bg-[#D0E8B2] dark:bg-[#324B10] opacity-100'
              : 'opacity-0'
          }`}
        />
      )}

      {/* All Notes Tab */}
      <button
        type="button"
        id="mobile-tab-all"
        onClick={() => onSelectFilter('all')}
        className={`relative z-10 flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors ${
          currentFilter === 'all'
            ? 'text-[#1A3700] dark:text-[#D0E8B2]'
            : 'text-[#5E6258] dark:text-[#8F9285]'
        }`}
      >
        <div
          ref={(el) => {
            tabPillRefs.current.all = el;
          }}
          className="px-2.5 py-0.5 rounded-full"
        >
          <BookOpen className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-bold">جزوه‌ها</span>
      </button>

      {/* Important / Starred Tab */}
      <button
        type="button"
        id="mobile-tab-important"
        onClick={() => onSelectFilter('important')}
        className={`relative z-10 flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors ${
          currentFilter === 'important'
            ? 'text-[#8B6814] dark:text-[#FFE086]'
            : 'text-[#5E6258] dark:text-[#8F9285]'
        }`}
      >
        <div
          ref={(el) => {
            tabPillRefs.current.important = el;
          }}
          className="px-2.5 py-0.5 rounded-full"
        >
          <Star className={`w-5 h-5 ${currentFilter === 'important' ? 'fill-current' : ''}`} />
        </div>
        <span className="text-[10px] font-bold">نکات طلایی</span>
        {importantCount > 0 && (
          <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#8B6814] dark:bg-[#FFE086]" />
        )}
      </button>

      {/* Central Floating Action Button (FAB) Natural Tones Style */}
      <div className="relative -top-3 flex items-center justify-center shrink-0 px-1">
        <button
          type="button"
          id="btn-mobile-fab"
          onClick={onOpenCreateModal}
          className="w-12 h-12 rounded-2xl bg-[#D0E8B2] hover:bg-[#c2de9f] text-[#1A3700] shadow-lg shadow-black/20 flex items-center justify-center active:scale-95 transition-transform"
          title="نوشتن جزوه یا نکته جدید"
          aria-label="یادداشت جدید"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Categories Tab */}
      <button
        type="button"
        id="mobile-tab-categories"
        onClick={onOpenCategoryManager}
        className="flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl text-[#5E6258] dark:text-[#8F9285] hover:text-[#1A1C16] dark:hover:text-[#E2E3DC]"
      >
        <div className="px-2.5 py-0.5 rounded-full">
          <Folder className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-bold">دسته‌ها</span>
      </button>

      {/* File Manager Tab */}
      <button
        type="button"
        id="mobile-tab-files"
        onClick={onOpenFileManager}
        title={isTelegramReady ? 'مدیریت فایل‌ها' : 'بسته است — نیازمند تنظیم کانال تلگرام'}
        className={`relative flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-colors ${
          isTelegramReady
            ? 'text-[#5E6258] dark:text-[#8F9285] hover:text-[#1A1C16] dark:hover:text-[#E2E3DC]'
            : 'text-[#8F9285] dark:text-[#72766A] opacity-85'
        }`}
      >
        <div className="relative px-2.5 py-0.5 rounded-full">
          <FolderOpen className="w-5 h-5" />
          {!isTelegramReady && (
            <Lock className="w-3 h-3 text-[#A64D3B] dark:text-[#FFAB91] absolute -top-0.5 left-1 bg-[#FAF9F5] dark:bg-[#1C1C17] rounded-full p-0.5" />
          )}
        </div>
        <span className="text-[10px] font-bold">فایل‌ها</span>
      </button>
    </div>
  );
};
