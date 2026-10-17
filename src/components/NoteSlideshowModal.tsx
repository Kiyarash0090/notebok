import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X,
  Play,
  Pause,
  Shuffle,
  ChevronRight,
  ChevronLeft,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  BookOpen,
  Folder,
  Layers,
  HelpCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Check,
  Star,
  Flame,
  Volume2,
} from 'lucide-react';
import { Note, Category } from '../types';
import { getCategoryDescendantIds, getCategoryPathString } from '../lib/categoryUtils';
import { BlockRenderer } from './blocks/BlockRenderer';
import { ensureBlocks } from '../lib/blocks';

interface NoteSlideshowModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  notes: Note[];
  initialCategoryId?: string | null;
  onToggleImportant?: (id: string) => void;
  onTogglePin?: (id: string) => void;
}

export const NoteSlideshowModal: React.FC<NoteSlideshowModalProps> = ({
  isOpen,
  onClose,
  categories,
  notes,
  initialCategoryId = null,
  onToggleImportant,
  onTogglePin,
}) => {
  // Category selection state
  const [selectedCatId, setSelectedCatId] = useState<string | 'all'>('all');
  const [includeSubcategories, setIncludeSubcategories] = useState<boolean>(true);

  // When opened or initialCategoryId changes, set selectedCatId
  useEffect(() => {
    if (isOpen) {
      if (initialCategoryId && categories.some((c) => c.id === initialCategoryId)) {
        setSelectedCatId(initialCategoryId);
      } else if (categories.length > 0) {
        setSelectedCatId(categories[0].id);
      } else {
        setSelectedCatId('all');
      }
    }
  }, [isOpen, initialCategoryId, categories]);

  // Slideshow play & presentation states
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [autoPlayInterval, setAutoPlayInterval] = useState<number>(6); // in seconds
  const [isShuffled, setIsShuffled] = useState<boolean>(false);
  const [isFlashcardMode, setIsFlashcardMode] = useState<boolean>(false);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [filterNeedsReviewOnly, setFilterNeedsReviewOnly] = useState<boolean>(false);

  // Study session tracking: mastered vs needs review
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [needsReviewIds, setNeedsReviewIds] = useState<Set<string>>(new Set());

  // Slide content scroll container
  const slideContainerRef = useRef<HTMLDivElement>(null);
  const modalRootRef = useRef<HTMLDivElement>(null);

  // Touch gesture refs
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  // Auto-play timer
  const autoPlayTimerRef = useRef<number | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const progressIntervalRef = useRef<number | null>(null);

  // Eligible notes based on selected category & includeSubcategories
  const eligibleNotes = useMemo(() => {
    // Exclude trash and archive
    const active = notes.filter((n) => !n.isTrash && !n.isArchived);

    let list: Note[] = [];
    if (selectedCatId === 'all') {
      list = [...active];
    } else {
      if (includeSubcategories) {
        const allowedIds = new Set(getCategoryDescendantIds(selectedCatId, categories));
        list = active.filter((n) => n.categoryId && allowedIds.has(n.categoryId));
      } else {
        list = active.filter((n) => n.categoryId === selectedCatId);
      }
    }

    if (filterNeedsReviewOnly) {
      list = list.filter((n) => needsReviewIds.has(n.id));
    }

    return list;
  }, [notes, selectedCatId, includeSubcategories, categories, filterNeedsReviewOnly, needsReviewIds]);

  // Display notes (ordered or shuffled)
  const displayNotes = useMemo(() => {
    if (!isShuffled) {
      return [...eligibleNotes].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
      });
    }
    // Deterministic shuffle copy
    const copy = [...eligibleNotes];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, [eligibleNotes, isShuffled]);

  // Ensure currentIndex stays within bounds
  useEffect(() => {
    if (currentIndex >= displayNotes.length && displayNotes.length > 0) {
      setCurrentIndex(displayNotes.length - 1);
    } else if (displayNotes.length === 0) {
      setCurrentIndex(0);
    }
  }, [displayNotes.length, currentIndex]);

  // Reset answer reveal state whenever slide index changes
  useEffect(() => {
    setIsAnswerRevealed(false);
    if (slideContainerRef.current) {
      slideContainerRef.current.scrollTop = 0;
    }
  }, [currentIndex]);

  const currentNote = displayNotes[currentIndex] || null;

  // Active Category details
  const activeCategory = useMemo(() => {
    if (selectedCatId === 'all') return null;
    return categories.find((c) => c.id === selectedCatId) || null;
  }, [selectedCatId, categories]);

  // Navigation handlers
  const handleNextSlide = useCallback(() => {
    if (displayNotes.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % displayNotes.length);
  }, [displayNotes.length]);

  const handlePrevSlide = useCallback(() => {
    if (displayNotes.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + displayNotes.length) % displayNotes.length);
  }, [displayNotes.length]);

  // Auto-play runner
  useEffect(() => {
    if (!isAutoPlaying || displayNotes.length <= 1) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setProgressPercent(0);
      return;
    }

    const intervalMs = autoPlayInterval * 1000;
    const tickMs = 100;
    let elapsedMs = 0;

    progressIntervalRef.current = window.setInterval(() => {
      elapsedMs += tickMs;
      const pct = Math.min(100, (elapsedMs / intervalMs) * 100);
      setProgressPercent(pct);
    }, tickMs);

    autoPlayTimerRef.current = window.setInterval(() => {
      handleNextSlide();
      elapsedMs = 0;
      setProgressPercent(0);
    }, intervalMs);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isAutoPlaying, autoPlayInterval, displayNotes.length, handleNextSlide]);

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (modalRootRef.current?.requestFullscreen) {
        modalRootRef.current.requestFullscreen().catch(() => {});
      } else if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Sync fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        // In Persian RTL, ArrowLeft navigates forward / next slide
        e.preventDefault();
        handleNextSlide();
      } else if (e.key === 'ArrowRight') {
        // ArrowRight navigates back / previous slide
        e.preventDefault();
        handlePrevSlide();
      } else if (e.key === ' ') {
        e.preventDefault();
        if (isFlashcardMode && !isAnswerRevealed) {
          setIsAnswerRevealed(true);
        } else {
          handleNextSlide();
        }
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFlashcardMode, isAnswerRevealed, handleNextSlide, handlePrevSlide, onClose]);

  // Touch swipe support (Mobile friendly)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Only swipe if horizontal movement is dominant and > 45px
    if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        // Swiped left -> in RTL this goes to next slide
        handleNextSlide();
      } else {
        // Swiped right -> goes to previous slide
        handlePrevSlide();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Toggle study mastery
  const toggleMastered = (id: string) => {
    setMasteredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Remove from needs review if mastered
        setNeedsReviewIds((curr) => {
          const cNext = new Set(curr);
          cNext.delete(id);
          return cNext;
        });
      }
      return next;
    });
  };

  const toggleNeedsReview = (id: string) => {
    setNeedsReviewIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Remove from mastered if needs review
        setMasteredIds((curr) => {
          const cNext = new Set(curr);
          cNext.delete(id);
          return cNext;
        });
      }
      return next;
    });
  };

  if (!isOpen) return null;

  // Font size classes
  const fontStyles = {
    normal: {
      title: 'text-xl sm:text-2xl md:text-3xl',
      body: 'text-sm sm:text-base leading-relaxed',
      summary: 'text-xs sm:text-sm',
    },
    large: {
      title: 'text-2xl sm:text-3xl md:text-4xl',
      body: 'text-base sm:text-lg leading-loose',
      summary: 'text-sm sm:text-base',
    },
    xlarge: {
      title: 'text-3xl sm:text-4xl md:text-5xl',
      body: 'text-lg sm:text-xl leading-loose',
      summary: 'text-base sm:text-lg',
    },
  }[fontSizeLevel];

  // Current note category info
  const noteCat = currentNote?.categoryId
    ? categories.find((c) => c.id === currentNote.categoryId)
    : null;
  const noteCatPath = currentNote?.categoryId
    ? getCategoryPathString(currentNote.categoryId, categories)
    : '';

  // Check if current note has blocks
  const currentBlocks = currentNote ? ensureBlocks(currentNote) : [];

  return (
    <div
      ref={modalRootRef}
      id="exam-slideshow-modal"
      dir="rtl"
      className="fixed inset-0 z-[100] bg-[#FAF9F5] dark:bg-[#12140E] text-[#1A1C16] dark:text-[#E2E3DC] flex flex-col select-none overflow-hidden"
    >
      {/* Top Header / Progress Bar */}
      {isAutoPlaying && (
        <div className="w-full h-1 bg-[#E1E4D5] dark:bg-[#2A2E24] overflow-hidden">
          <div
            className="h-full bg-[#4A6D22] dark:bg-[#D0E8B2] transition-all duration-100 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Control Header Bar */}
      <header className="shrink-0 px-3 sm:px-6 py-2.5 bg-[#FAF9F5]/90 dark:bg-[#12140E]/90 backdrop-blur-md border-b border-[#E1E4D5]/80 dark:border-[#2C3127]/80 flex flex-wrap items-center justify-between gap-2 z-20">
        {/* Right side (RTL start): Category Switcher & Presentation Badge */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 bg-[#D0E8B2]/30 dark:bg-[#1A3700]/40 border border-[#D0E8B2]/50 dark:border-[#334D18] px-2.5 py-1 rounded-full text-xs font-bold text-[#1A3700] dark:text-[#D0E8B2] shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">مرور امتحانی اسلایدشو</span>
            <span className="sm:hidden">امتحان</span>
          </div>

          {/* Category Dropdown Selector */}
          <div className="relative flex items-center">
            <select
              value={selectedCatId}
              onChange={(e) => {
                setSelectedCatId(e.target.value);
                setCurrentIndex(0);
              }}
              className="bg-[#EFF2E6] dark:bg-[#1C2016] text-[#1A1C16] dark:text-[#E2E3DC] text-xs sm:text-sm font-semibold rounded-xl px-2.5 py-1.5 border border-[#D5D9C9] dark:border-[#383E30] focus:outline-none focus:ring-1 focus:ring-[#4A6D22] cursor-pointer max-w-[130px] sm:max-w-[200px] truncate"
              title="انتخاب دسته‌بندی برای مرور"
            >
              <option value="all">📂 همه دسته‌بندی‌ها ({notes.filter((n) => !n.isTrash && !n.isArchived).length})</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.parentId ? ' ↳ ' : '📁 '}
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory inclusion toggle (if a specific category is chosen) */}
          {selectedCatId !== 'all' && (
            <label
              className="hidden md:flex items-center gap-1.5 text-xs text-[#5E6258] dark:text-[#8F9285] cursor-pointer hover:text-[#1A1C16] dark:hover:text-[#E2E3DC] select-none"
              title="شامل شدن یادداشت‌های زیرپوشه‌ها"
            >
              <input
                type="checkbox"
                checked={includeSubcategories}
                onChange={(e) => {
                  setIncludeSubcategories(e.target.checked);
                  setCurrentIndex(0);
                }}
                className="w-3.5 h-3.5 accent-[#4A6D22] rounded cursor-pointer"
              />
              <span className="text-[11px]">با زیرمجموعه‌ها</span>
            </label>
          )}

          {/* Progress Indicator */}
          {displayNotes.length > 0 && (
            <span className="text-xs font-bold text-[#5E6258] dark:text-[#8F9285] px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/5 shrink-0">
              {currentIndex + 1} از {displayNotes.length}
            </span>
          )}
        </div>

        {/* Left side (RTL end): Exam Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Flashcard / Quiz Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsFlashcardMode(!isFlashcardMode)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              isFlashcardMode
                ? 'bg-[#FFE086] text-[#4A3800] shadow-2xs'
                : 'text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title="حالت پرسش و پاسخ / فلش‌کارت (مخفی‌سازی پاسخ تا زمان لمس)"
          >
            {isFlashcardMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span className="hidden md:inline">حالت آزمون</span>
          </button>

          {/* Shuffle Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsShuffled(!isShuffled);
              setCurrentIndex(0);
            }}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              isShuffled
                ? 'bg-[#D0E8B2] text-[#1A3700] font-bold'
                : 'text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title="مرور تصادفی یادداشت‌ها (Shuffle)"
          >
            <Shuffle className="w-4 h-4" />
            <span className="hidden lg:inline">تصادفی</span>
          </button>

          {/* Auto-Play Toggle */}
          <div className="flex items-center bg-black/5 dark:bg-white/5 rounded-xl p-0.5">
            <button
              type="button"
              onClick={() => setIsAutoPlaying(!isAutoPlaying)}
              className={`p-1.5 sm:px-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                isAutoPlaying
                  ? 'bg-[#4A6D22] text-white shadow-2xs'
                  : 'text-[#5E6258] dark:text-[#8F9285] hover:text-[#1A1C16] dark:hover:text-[#E2E3DC]'
              }`}
              title={isAutoPlaying ? 'توقف اسلایدشو خودکار' : 'پخش خودکار اسلایدها'}
            >
              {isAutoPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span className="hidden xl:inline">{isAutoPlaying ? 'توقف' : 'پخش خودکار'}</span>
            </button>

            {isAutoPlaying && (
              <select
                value={autoPlayInterval}
                onChange={(e) => setAutoPlayInterval(Number(e.target.value))}
                className="bg-transparent text-[11px] font-bold px-1 py-0.5 border-none focus:outline-none cursor-pointer text-[#4A6D22] dark:text-[#D0E8B2]"
                title="فاصله زمانی هر اسلاید"
              >
                <option value={4}>۴ث</option>
                <option value={6}>۶ث</option>
                <option value={10}>۱۰ث</option>
                <option value={15}>۱۵ث</option>
              </select>
            )}
          </div>

          {/* Font Size Adjuster */}
          <button
            type="button"
            onClick={() => {
              setFontSizeLevel((prev) =>
                prev === 'normal' ? 'large' : prev === 'large' ? 'xlarge' : 'normal'
              );
            }}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center gap-1"
            title="تغییر اندازه متن"
          >
            <span className="text-xs">A</span>
            <span className="text-sm font-black">A</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 rounded-xl text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/5 hover:text-[#1A1C16] dark:hover:text-[#E2E3DC] transition-colors cursor-pointer"
            title={isFullscreen ? 'خروج از تمام‌صفحه (F)' : 'تمام‌صفحه (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close Modal Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-[#A64D3B]/20 hover:text-[#A64D3B] text-[#5E6258] dark:text-[#8F9285] transition-colors cursor-pointer mr-1"
            title="خروج از مرور اسلایدشو (Escape)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* Main Slide Canvas */}
      <main
        className="flex-1 relative flex flex-col justify-center items-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {displayNotes.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-md animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-[#D0E8B2]/30 dark:bg-[#1A3700]/30 flex items-center justify-center mb-4 text-[#4A6D22] dark:text-[#D0E8B2]">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#1A1C16] dark:text-[#E2E3DC] mb-1">
              هیچ یادداشتی در این بخش یافت نشد
            </h3>
            <p className="text-xs text-[#5E6258] dark:text-[#8F9285] mb-4">
              برای شروع مرور امتحانی، دسته‌بندی دیگری را از منوی بالا انتخاب کنید یا یادداشت جدید بسازید.
            </p>
            <button
              type="button"
              onClick={() => setSelectedCatId('all')}
              className="px-4 py-2 rounded-xl bg-[#4A6D22] hover:bg-[#3B571B] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              مشاهده همه یادداشت‌ها
            </button>
          </div>
        ) : (
          /* Active Slide Container */
          <div
            ref={slideContainerRef}
            className="w-full h-full overflow-y-auto px-4 sm:px-8 md:px-12 py-6 flex flex-col justify-start items-center"
          >
            <div className="w-full max-w-3xl my-auto py-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Slide Card Container */}
              <div
                className="relative bg-white dark:bg-[#181B13] rounded-3xl border border-[#E1E4D5] dark:border-[#2C3127] shadow-xl p-6 sm:p-8 md:p-10 transition-all select-text"
                style={{
                  borderTopColor: noteCat?.color || '#4A6D22',
                  borderTopWidth: '4px',
                }}
              >
                {/* Category & Metadata Top Row */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  {/* Category Breadcrumb */}
                  <div className="flex items-center gap-1.5 text-xs text-[#5E6258] dark:text-[#8F9285] font-medium">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: noteCat?.color || '#4A6D22' }}
                    />
                    <span className="font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                      {noteCatPath || noteCat?.name || 'بدون دسته‌بندی'}
                    </span>
                  </div>

                  {/* Badges & Session status */}
                  <div className="flex items-center gap-1.5">
                    {/* Importance */}
                    {currentNote.importanceLevel === 'critical' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFD8D8] dark:bg-[#5C1A1A] text-[#930006] dark:text-[#FFB4AB]">
                        <Flame className="w-3 h-3 fill-current" />
                        نکته حیاتی امتحانی
                      </span>
                    )}
                    {currentNote.importanceLevel === 'high' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FAF2DE] dark:bg-[#332A18] text-[#8B6814] dark:text-[#FFE086]">
                        <Star className="w-3 h-3 fill-current" />
                        نکته مهم
                      </span>
                    )}

                    {/* Mastered / Need Review Pills for this session */}
                    {masteredIds.has(currentNote.id) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#D0E8B2]/60 dark:bg-[#1A3700]/70 text-[#1A3700] dark:text-[#D0E8B2]">
                        <CheckCircle2 className="w-3 h-3" />
                        مسلط شدم
                      </span>
                    )}
                    {needsReviewIds.has(currentNote.id) && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FFE086]/50 dark:bg-[#5C4509]/60 text-[#5C4509] dark:text-[#FFE086]">
                        <RotateCcw className="w-3 h-3" />
                        نیاز به مرور
                      </span>
                    )}
                  </div>
                </div>

                {/* Note Title (Question / Main Concept) */}
                {currentNote.title && (
                  <h1 className={`font-extrabold text-[#1A1C16] dark:text-[#E2E3DC] mb-4 leading-tight ${fontStyles.title}`}>
                    {currentNote.title}
                  </h1>
                )}

                {/* Exam Key Summary Highlight Box (Always highlighted if available) */}
                {currentNote.summary && (
                  <div className="mb-6 p-4 rounded-2xl bg-[#FAF2DE]/80 dark:bg-[#2F2714]/80 border-r-4 border-[#C79824] dark:border-[#FFE086] text-[#523C0A] dark:text-[#FFF1C2] shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#8B6814] dark:text-[#FFE086] mb-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>نکته کلیدی و جمع‌بندی سریع برای امتحان:</span>
                    </div>
                    <p className={`font-semibold ${fontStyles.summary}`}>
                      {currentNote.summary}
                    </p>
                  </div>
                )}

                {/* Flashcard Hidden Answer Guard */}
                {isFlashcardMode && !isAnswerRevealed ? (
                  <div className="my-8 p-8 rounded-2xl bg-[#F4F5EB] dark:bg-[#20241A] border-2 border-dashed border-[#CCD0C0] dark:border-[#393E31] text-center flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#FFE086]/30 text-[#8B6814] dark:text-[#FFE086] flex items-center justify-center">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-[#1A1C16] dark:text-[#E2E3DC] mb-1">
                        پاسخ و جزئیات پنهان است
                      </h4>
                      <p className="text-xs text-[#5E6258] dark:text-[#8F9285]">
                        ابتدا سعی کنید پاسخ یا فرمول را در ذهن خود به خاطر بیاورید، سپس برای راستی‌آزمایی پاسخ را مشاهده کنید.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAnswerRevealed(true)}
                      className="mt-2 px-5 py-2.5 rounded-xl bg-[#4A6D22] hover:bg-[#3B571B] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-transform active:scale-95 cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      نمایش پاسخ و متن کامل (Space)
                    </button>
                  </div>
                ) : (
                  /* Full Note Content / Blocks */
                  <div className={`text-[#2D3128] dark:text-[#CCD0C2] space-y-4 my-2 ${fontStyles.body}`}>
                    {currentBlocks.length > 0 ? (
                      <BlockRenderer
                        blocks={currentBlocks}
                        attachments={currentNote.attachments}
                        compact={false}
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{currentNote.content}</p>
                    )}
                  </div>
                )}

                {/* Note Tags & Attachment badges footer */}
                {(currentNote.tags?.length || currentNote.attachments?.length) ? (
                  <div className="mt-8 pt-4 border-t border-[#E1E4D5]/60 dark:border-[#2C3127]/60 flex flex-wrap items-center justify-between gap-2">
                    {/* Tags */}
                    {currentNote.tags && currentNote.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {currentNote.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[11px] font-semibold bg-[#D0E8B2]/30 dark:bg-[#1A3700]/50 text-[#1A3700] dark:text-[#D0E8B2] px-2.5 py-0.5 rounded-full border border-[#D0E8B2]/40"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Attachments count */}
                    {currentNote.attachments && currentNote.attachments.length > 0 && (
                      <span className="text-[11px] text-[#5E6258] dark:text-[#8F9285] font-medium mr-auto">
                        📎 {currentNote.attachments.length} فایل ضمیمه
                      </span>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Study Self-Evaluation Action Buttons on this Slide */}
              <div className="mt-4 flex items-center justify-between gap-3 px-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleMastered(currentNote.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      masteredIds.has(currentNote.id)
                        ? 'bg-[#4A6D22] text-white shadow-2xs'
                        : 'bg-white dark:bg-[#1C2016] text-[#4A6D22] dark:text-[#D0E8B2] border border-[#CCD0C0] dark:border-[#383E30] hover:bg-[#D0E8B2]/20'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{masteredIds.has(currentNote.id) ? 'مسلط هستم ✓' : 'علامت‌گذاری: یاد گرفتم'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleNeedsReview(currentNote.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      needsReviewIds.has(currentNote.id)
                        ? 'bg-[#8B6814] text-white shadow-2xs'
                        : 'bg-white dark:bg-[#1C2016] text-[#8B6814] dark:text-[#FFE086] border border-[#CCD0C0] dark:border-[#383E30] hover:bg-[#FFE086]/20'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{needsReviewIds.has(currentNote.id) ? 'نیاز به مرور دارد ↺' : 'نیاز به مرور مجدد'}</span>
                  </button>
                </div>

                {/* Quick Hint */}
                <div className="hidden sm:block text-[11px] text-[#5E6258] dark:text-[#8F9285]">
                  کلیدهای <kbd className="px-1 py-0.5 bg-black/5 dark:bg-white/10 rounded font-mono">←</kbd> و <kbd className="px-1 py-0.5 bg-black/5 dark:bg-white/10 rounded font-mono">→</kbd> برای جابجایی
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Floating Navigation Dock */}
      {displayNotes.length > 0 && (
        <footer className="shrink-0 px-4 sm:px-6 py-2.5 bg-[#FAF9F5]/90 dark:bg-[#12140E]/90 backdrop-blur-md border-t border-[#E1E4D5]/80 dark:border-[#2C3127]/80 flex items-center justify-between gap-3 z-20 pb-safe">
          {/* Previous Slide Button (In RTL, Previous moves to the right arrow) */}
          <button
            type="button"
            onClick={handlePrevSlide}
            disabled={displayNotes.length <= 1}
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-white dark:bg-[#1C2016] border border-[#CCD0C0] dark:border-[#383E30] text-[#1A1C16] dark:text-[#E2E3DC] text-xs sm:text-sm font-bold shadow-2xs hover:bg-[#EAEEDF] dark:hover:bg-[#262C1E] disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">یادداشت قبلی</span>
          </button>

          {/* Slide Dots / Thumbnails Strip */}
          <div className="flex-1 flex items-center justify-center gap-1 overflow-x-auto no-scrollbar max-w-sm sm:max-w-md px-2">
            {displayNotes.map((n, idx) => {
              const isCurr = idx === currentIndex;
              const isMast = masteredIds.has(n.id);
              const isNeed = needsReviewIds.has(n.id);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`transition-all rounded-full cursor-pointer shrink-0 ${
                    isCurr
                      ? 'w-7 sm:w-8 h-2.5 bg-[#4A6D22] dark:bg-[#D0E8B2]'
                      : isMast
                      ? 'w-2 h-2 bg-[#4A6D22]/60 dark:bg-[#D0E8B2]/60 hover:scale-125'
                      : isNeed
                      ? 'w-2 h-2 bg-[#C79824] hover:scale-125'
                      : 'w-2 h-2 bg-[#CCD0C0] dark:bg-[#383E30] hover:scale-125'
                  }`}
                  title={`یادداشت ${idx + 1}: ${n.title || 'بدون عنوان'}`}
                />
              );
            })}
          </div>

          {/* Next Slide Button */}
          <button
            type="button"
            onClick={handleNextSlide}
            disabled={displayNotes.length <= 1}
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-[#4A6D22] hover:bg-[#3B571B] text-white text-xs sm:text-sm font-bold shadow-xs disabled:opacity-40 transition-colors cursor-pointer"
          >
            <span className="hidden xs:inline">یادداشت بعدی</span>
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </footer>
      )}
    </div>
  );
};
