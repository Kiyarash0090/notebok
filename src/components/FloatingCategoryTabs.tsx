import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import {
  Layers,
  ChevronDown,
  BookOpen,
  Plus,
  Presentation,
} from 'lucide-react';
import { Category, ViewFilter } from '../types';
import { getTotalCategoryNoteCount, getCategoryPath } from '../lib/categoryUtils';

interface FloatingCategoryTabsProps {
  categories: Category[];
  selectedCategory: string | null;
  currentFilter: ViewFilter;
  categoryCounts: Record<string, number>;
  totalNotesCount: number;
  onSelectCategory: (categoryId: string | null) => void;
  onReorderCategories?: (categories: Category[]) => void;
  onOpenCategoryManager?: (initialParentId?: string | null) => void;
  onOpenSlideshow?: (categoryId?: string | null) => void;
}

/**
 * Reorders an array by moving an item from index fromIdx to toIdx.
 */
function moveItemInArray<T>(list: T[], fromIdx: number, toIdx: number): T[] {
  if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= list.length || toIdx >= list.length) {
    return list;
  }
  const result = [...list];
  const [removed] = result.splice(fromIdx, 1);
  result.splice(toIdx, 0, removed);
  return result;
}

export const FloatingCategoryTabs: React.FC<FloatingCategoryTabsProps> = ({
  categories,
  selectedCategory,
  currentFilter,
  categoryCounts,
  totalNotesCount,
  onSelectCategory,
  onReorderCategories,
  onOpenCategoryManager,
  onOpenSlideshow,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const subScrollContainerRef = useRef<HTMLDivElement>(null);

  // Automatic Compact mode based on scrolling down the page
  const [isCompact, setIsCompact] = useState(false);

  // Local categories state for instantaneous 60fps reordering during drag
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const localCategoriesRef = useRef<Category[]>(categories);

  // Active Dragging State (Telegram-style long-press)
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isDraggingSubcategory, setIsDraggingSubcategory] = useState(false);

  // Drag tracking refs
  const longPressTimerRef = useRef<number | null>(null);
  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const activeDragIdRef = useRef<string | null>(null);
  const isDragActiveRef = useRef(false);
  const isSubcategoryDragRef = useRef(false);
  const preventClickRef = useRef(false);
  const initialOrderIdsRef = useRef<string[]>([]);
  const lastSwapTimeRef = useRef<number>(0);

  // Auto-scroll on drag near edges
  const autoScrollIntervalRef = useRef<number | null>(null);

  // Sync local categories whenever external prop changes and NOT currently dragging
  useEffect(() => {
    if (!isDragActiveRef.current) {
      setLocalCategories(categories);
      localCategoriesRef.current = categories;
    }
  }, [categories]);

  // Window scroll listener for 100% automatic compact mode
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY || document.documentElement.scrollTop;
          if (scrollY > 50) {
            setIsCompact(true);
          } else if (scrollY < 20) {
            setIsCompact(false);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter root categories based on localCategories
  const rootCategories = useMemo(() => {
    return localCategories.filter((c) => !c.parentId);
  }, [localCategories]);

  // Map of parentId -> children categories
  const childrenByParent = useMemo(() => {
    const map: Record<string, Category[]> = {};
    localCategories.forEach((cat) => {
      if (cat.parentId) {
        if (!map[cat.parentId]) map[cat.parentId] = [];
        map[cat.parentId].push(cat);
      }
    });
    return map;
  }, [localCategories]);

  // Active category calculations
  const { activeRootCategory, activeParentCategory, currentSubcategories } = useMemo(() => {
    if (currentFilter !== 'category' || !selectedCategory) {
      return { activeRootCategory: null, activeParentCategory: null, currentSubcategories: [] };
    }

    const path = getCategoryPath(selectedCategory, localCategories);
    const root = path.length > 0 ? path[0] : localCategories.find((c) => c.id === selectedCategory) || null;

    // Check if the selected category has direct subcategories
    const directChildren = childrenByParent[selectedCategory] || [];
    if (directChildren.length > 0) {
      const parentCat = localCategories.find((c) => c.id === selectedCategory) || null;
      return {
        activeRootCategory: root,
        activeParentCategory: parentCat,
        currentSubcategories: directChildren,
      };
    }

    // If it's a subcategory, show its siblings under its parent
    if (path.length > 1) {
      const parentCat = path[path.length - 2];
      const siblings = childrenByParent[parentCat.id] || [];
      return {
        activeRootCategory: root,
        activeParentCategory: parentCat,
        currentSubcategories: siblings,
      };
    }

    return { activeRootCategory: root, activeParentCategory: null, currentSubcategories: [] };
  }, [selectedCategory, currentFilter, localCategories, childrenByParent]);

  const activeParentCategoryRef = useRef(activeParentCategory);
  useEffect(() => {
    activeParentCategoryRef.current = activeParentCategory;
  }, [activeParentCategory]);

  // Auto-scroll active tab into view when selection changes
  useEffect(() => {
    if (selectedCategory && scrollContainerRef.current && !activeDragId) {
      const activeEl = scrollContainerRef.current.querySelector('[data-active="true"]') as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedCategory, activeDragId]);

  // Stop edge auto-scrolling
  const stopAutoScroll = useCallback(() => {
    if (autoScrollIntervalRef.current) {
      window.clearInterval(autoScrollIntervalRef.current);
      autoScrollIntervalRef.current = null;
    }
  }, []);

  // Swap root categories locally
  const moveRootCategoryToIndex = useCallback((sourceId: string, toIdx: number) => {
    const currentList = localCategoriesRef.current;
    const roots = currentList.filter((c) => !c.parentId);
    const fromIdx = roots.findIndex((c) => c.id === sourceId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx || toIdx >= roots.length) return;

    const newRoots = moveItemInArray(roots, fromIdx, toIdx);

    // Reconstruct full list preserving subcategories
    const childMap: Record<string, Category[]> = {};
    currentList.forEach((cat) => {
      if (cat.parentId) {
        if (!childMap[cat.parentId]) childMap[cat.parentId] = [];
        childMap[cat.parentId].push(cat);
      }
    });

    const fullResult: Category[] = [];
    const addWithKids = (cat: Category) => {
      fullResult.push(cat);
      (childMap[cat.id] || []).forEach((k) => addWithKids(k));
    };

    newRoots.forEach((root) => addWithKids(root));
    currentList.forEach((cat) => {
      if (!fullResult.some((r) => r.id === cat.id)) {
        fullResult.push(cat);
      }
    });

    localCategoriesRef.current = fullResult;
    setLocalCategories(fullResult);

    try {
      if ('vibrate' in navigator) navigator.vibrate(18);
    } catch {}
  }, []);

  // Swap subcategories locally
  const moveSubcategoryToIndex = useCallback((sourceId: string, toIdx: number, parentId: string) => {
    const currentList = localCategoriesRef.current;
    const siblings = currentList.filter((c) => c.parentId === parentId);
    const fromIdx = siblings.findIndex((c) => c.id === sourceId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx || toIdx >= siblings.length) return;

    const newSiblings = moveItemInArray(siblings, fromIdx, toIdx);
    const siblingIds = new Set(newSiblings.map((s) => s.id));
    const others = currentList.filter((c) => !siblingIds.has(c.id));
    const parentIdx = others.findIndex((c) => c.id === parentId);

    const fullResult = [...others];
    if (parentIdx !== -1) {
      fullResult.splice(parentIdx + 1, 0, ...newSiblings);
    } else {
      fullResult.push(...newSiblings);
    }

    localCategoriesRef.current = fullResult;
    setLocalCategories(fullResult);

    try {
      if ('vibrate' in navigator) navigator.vibrate(18);
    } catch {}
  }, []);

  // Coordinate-based hit testing: tracks pointer position across tabs with hysteresis
  const handlePointerCoordMove = useCallback((clientX: number, clientY: number) => {
    const sourceId = activeDragIdRef.current;
    if (!sourceId || !isDragActiveRef.current) return;

    // Minimum 40ms throttle between swaps to eliminate jitter
    const now = Date.now();
    if (now - lastSwapTimeRef.current < 40) return;

    const isSub = isSubcategoryDragRef.current;
    const container = isSub ? subScrollContainerRef.current : scrollContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();

    // Generous vertical tolerance (±120px) so natural finger drift doesn't lose tracking
    if (clientY < containerRect.top - 120 || clientY > containerRect.bottom + 120) {
      return;
    }

    // Edge auto-scroll
    const edgeThreshold = 45;
    const scrollSpeed = 7;
    stopAutoScroll();

    if (clientX < containerRect.left + edgeThreshold) {
      autoScrollIntervalRef.current = window.setInterval(() => {
        container.scrollBy({ left: -scrollSpeed });
      }, 16);
    } else if (clientX > containerRect.right - edgeThreshold) {
      autoScrollIntervalRef.current = window.setInterval(() => {
        container.scrollBy({ left: scrollSpeed });
      }, 16);
    }

    // Query all tab elements in the container
    const tabElements = Array.from(
      container.querySelectorAll<HTMLElement>(
        `[data-category-id][data-is-subcategory="${isSub ? 'true' : 'false'}"]`
      )
    );

    if (tabElements.length < 2) return;

    // Get current item list
    const currentList = localCategoriesRef.current;
    const activeItems = isSub
      ? (activeParentCategoryRef.current ? currentList.filter((c) => c.parentId === activeParentCategoryRef.current?.id) : [])
      : currentList.filter((c) => !c.parentId);

    const currentIndex = activeItems.findIndex((c) => c.id === sourceId);
    if (currentIndex === -1) return;

    // Find the target tab index based on pointer clientX crossing tab centers
    let targetIndex = currentIndex;

    for (let i = 0; i < tabElements.length; i++) {
      const el = tabElements[i];
      const id = el.getAttribute('data-category-id');
      if (!id) continue;

      const rect = el.getBoundingClientRect();
      const midX = rect.left + rect.width / 2;

      // Hysteresis: only switch when pointer moves well past the center of adjacent item
      if (clientX >= rect.left && clientX <= rect.right) {
        const itemIdx = activeItems.findIndex((c) => c.id === id);
        if (itemIdx !== -1) {
          targetIndex = itemIdx;
          break;
        }
      } else if (clientX < rect.left && i === 0) {
        // Dragged beyond leftmost tab
        const itemIdx = activeItems.findIndex((c) => c.id === id);
        if (itemIdx !== -1) targetIndex = itemIdx;
      } else if (clientX > rect.right && i === tabElements.length - 1) {
        // Dragged beyond rightmost tab
        const itemIdx = activeItems.findIndex((c) => c.id === id);
        if (itemIdx !== -1) targetIndex = itemIdx;
      }
    }

    if (targetIndex !== currentIndex && targetIndex >= 0 && targetIndex < activeItems.length) {
      lastSwapTimeRef.current = now;
      if (isSub) {
        if (activeParentCategoryRef.current) {
          moveSubcategoryToIndex(sourceId, targetIndex, activeParentCategoryRef.current.id);
        }
      } else {
        moveRootCategoryToIndex(sourceId, targetIndex);
      }
    }
  }, [stopAutoScroll, moveRootCategoryToIndex, moveSubcategoryToIndex]);

  // End drag and commit final order if changed
  const endDrag = useCallback(() => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    stopAutoScroll();

    if (isDragActiveRef.current) {
      preventClickRef.current = true;
      isDragActiveRef.current = false;
      setActiveDragId(null);
      activeDragIdRef.current = null;
      activePointerIdRef.current = null;

      const initialIds = initialOrderIdsRef.current;
      const finalIds = localCategoriesRef.current.map((c) => c.id);
      const hasOrderChanged =
        initialIds.length === finalIds.length &&
        initialIds.some((id, idx) => id !== finalIds[idx]);

      if (hasOrderChanged && onReorderCategories) {
        try {
          if ('vibrate' in navigator) navigator.vibrate(35);
        } catch {}
        onReorderCategories(localCategoriesRef.current);
      }

      setTimeout(() => {
        preventClickRef.current = false;
      }, 200);
    } else {
      activeDragIdRef.current = null;
      activePointerIdRef.current = null;
      pointerStartPosRef.current = null;
    }
  }, [stopAutoScroll, onReorderCategories]);

  // Global window listeners for pointermove / pointerup
  useEffect(() => {
    const onWindowPointerMove = (e: PointerEvent) => {
      if (isDragActiveRef.current) {
        handlePointerCoordMove(e.clientX, e.clientY);
      } else if (pointerStartPosRef.current && longPressTimerRef.current) {
        const dx = Math.abs(e.clientX - pointerStartPosRef.current.x);
        const dy = Math.abs(e.clientY - pointerStartPosRef.current.y);
        // If pointer moves more than 10px before 320ms, cancel long-press so user can scroll naturally
        if (dx > 10 || dy > 10) {
          window.clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
    };

    const onWindowPointerUp = () => {
      endDrag();
    };

    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerUp);
    };
  }, [handlePointerCoordMove, endDrag]);

  // Pointer Down initiator for Long-Press (works seamlessly on touch and mouse)
  const handleTabPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    id: string,
    isSubcategory = false
  ) => {
    // Only primary button (left click or touch)
    if (e.button !== 0) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    pointerStartPosRef.current = { x: e.clientX, y: e.clientY };
    activePointerIdRef.current = e.pointerId;
    activeDragIdRef.current = id;
    isSubcategoryDragRef.current = isSubcategory;
    isDragActiveRef.current = false;

    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }

    // 320ms Telegram-style long-press timer
    longPressTimerRef.current = window.setTimeout(() => {
      isDragActiveRef.current = true;
      setActiveDragId(id);
      setIsDraggingSubcategory(isSubcategory);
      initialOrderIdsRef.current = localCategoriesRef.current.map((c) => c.id);

      try {
        if ('vibrate' in navigator) {
          navigator.vibrate(40);
        }
      } catch {}
    }, 320);
  };

  // Tab click handler with suppression if user was dragging
  const handleTabClick = (categoryId: string | null) => {
    if (preventClickRef.current || isDragActiveRef.current) {
      return;
    }
    onSelectCategory(categoryId);
  };

  const isAllActive = currentFilter === 'all' && !selectedCategory;

  return (
    <aside
      aria-label="دسته‌بندی‌ها"
      className="w-full max-w-5xl mx-auto sticky top-[56px] sm:top-[60px] z-30 select-none mb-3"
    >
      {/* Floating Glass Dock Container (Automatically compacts on scroll) */}
      <div
        className={`w-full bg-[#FAF9F5]/95 dark:bg-[#181A13]/95 backdrop-blur-xl border border-[#E2E6D8] dark:border-[#33372C] shadow-xs transition-all duration-300 ease-out flex flex-col ${
          isCompact ? 'rounded-xl p-1 sm:p-1.5' : 'rounded-2xl p-1.5 sm:p-2'
        }`}
      >
        {/* Top Dock Bar: Categories Row */}
        <div className="flex items-center gap-1.5 w-full">
          {/* "All" Tab Button */}
          <button
            type="button"
            onClick={() => handleTabClick(null)}
            data-active={isAllActive}
            title="نمایش همه جزوه‌ها"
            className={`shrink-0 flex items-center gap-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
              isCompact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
            } ${
              isAllActive
                ? 'bg-[#4A6D22] text-white shadow-xs font-bold'
                : 'text-[#43493E] dark:text-[#E2E3DC] hover:bg-[#EAEEDF] dark:hover:bg-[#23271E]'
            }`}
          >
            <BookOpen
              className={`shrink-0 transition-transform ${isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5'} ${
                isAllActive ? 'text-white' : 'text-[#4A6D22] dark:text-[#D0E8B2]'
              }`}
            />
            <span className="font-medium">همه</span>
            <span
              className={`rounded-full transition-all ${
                isCompact ? 'text-[9px] px-1 py-0.1' : 'text-[10px] px-1.5 py-0.5'
              } ${
                isAllActive
                  ? 'bg-white/20 text-white font-bold'
                  : 'bg-[#E5E9DB] dark:bg-[#252920] text-[#55594F] dark:text-[#9EA294]'
              }`}
            >
              {totalNotesCount}
            </span>
          </button>

          {/* Vertical Divider */}
          <div className="w-px h-4 bg-[#E0E4D5] dark:bg-[#383D33] shrink-0 mx-0.5" />

          {/* Smooth Horizontal Scrollable Categories Container */}
          <div
            ref={scrollContainerRef}
            className="flex-1 flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5"
            style={{
              WebkitOverflowScrolling: 'touch',
              touchAction: activeDragId && !isDraggingSubcategory ? 'none' : 'pan-x',
            }}
          >
            {rootCategories.map((cat) => {
              const hasChildren = (childrenByParent[cat.id] || []).length > 0;
              const isDirectlySelected = currentFilter === 'category' && selectedCategory === cat.id;
              const isParentOfSelected = activeRootCategory?.id === cat.id;
              const isCategoryActive = isDirectlySelected || isParentOfSelected;
              const totalCount = getTotalCategoryNoteCount(cat.id, localCategories, categoryCounts);

              const isDraggingThis = activeDragId === cat.id;

              return (
                <div
                  key={cat.id}
                  data-category-id={cat.id}
                  data-is-subcategory="false"
                  onPointerDown={(e) => handleTabPointerDown(e, cat.id, false)}
                  className={`relative shrink-0 flex items-center rounded-lg select-none transition-transform duration-150 ease-out ${
                    isDraggingThis
                      ? 'scale-108 shadow-xl shadow-black/25 ring-2 ring-[#4A6D22] dark:ring-[#D0E8B2] z-40 bg-white dark:bg-[#1E2319] cursor-grabbing -translate-y-0.5'
                      : 'cursor-pointer'
                  }`}
                  style={{
                    touchAction: isDraggingThis ? 'none' : 'pan-x',
                  }}
                >
                  {/* Category Pill Button */}
                  <button
                    type="button"
                    onClick={() => handleTabClick(cat.id)}
                    data-active={isCategoryActive}
                    className={`shrink-0 flex items-center gap-1.5 rounded-lg transition-colors duration-150 cursor-pointer ${
                      isCompact ? 'px-2 py-1 text-[11px]' : 'px-2.5 sm:px-3 py-1.5 text-xs'
                    } ${
                      isCategoryActive
                        ? 'bg-[#D0E8B2] dark:bg-[#2E4514] text-[#163300] dark:text-[#D5EBB6] font-bold shadow-xs'
                        : 'text-[#43493E] dark:text-[#E2E3DC] hover:bg-[#EAEEDF] dark:hover:bg-[#23271E]'
                    }`}
                  >
                    {/* Category Color Dot */}
                    <span
                      className={`rounded-full shrink-0 shadow-2xs transition-transform ${
                        isCompact ? 'w-2 h-2' : 'w-2.5 h-2.5'
                      } ${isDraggingThis ? 'scale-125' : ''}`}
                      style={{ backgroundColor: cat.color || '#4A6D22' }}
                    />

                    {/* Category Name */}
                    <span className="truncate max-w-[120px] sm:max-w-[170px] font-medium leading-none pointer-events-none">
                      {cat.name}
                    </span>

                    {/* Subcategories indicator arrow */}
                    {hasChildren && (
                      <ChevronDown
                        className={`transition-transform duration-200 shrink-0 pointer-events-none ${
                          isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3'
                        } ${
                          isParentOfSelected
                            ? 'rotate-180 text-[#163300] dark:text-[#D5EBB6]'
                            : 'opacity-50'
                        }`}
                      />
                    )}

                    {/* Note Count Badge */}
                    <span
                      className={`rounded-full transition-all shrink-0 pointer-events-none ${
                        isCompact ? 'text-[9px] px-1 py-0.1' : 'text-[10px] px-1.5 py-0.5'
                      } ${
                        isCategoryActive
                          ? 'bg-black/10 dark:bg-white/10 font-bold'
                          : 'bg-[#E5E9DB] dark:bg-[#252920] text-[#55594F] dark:text-[#9EA294]'
                      }`}
                    >
                      {totalCount}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Slideshow exam review button */}
          {onOpenSlideshow && (
            <button
              type="button"
              onClick={() => onOpenSlideshow(selectedCategory)}
              title="مرور امتحانی به صورت اسلایدشو"
              className="shrink-0 p-1 sm:p-1.5 rounded-lg text-[#55594F] dark:text-[#9EA294] hover:bg-[#EAEEDF] dark:hover:bg-[#23271E] hover:text-[#4A6D22] dark:hover:text-[#D0E8B2] transition-colors cursor-pointer"
            >
              <Presentation className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Clean minimal shortcut for Adding / Managing Categories */}
          {onOpenCategoryManager && (
            <button
              type="button"
              onClick={() => onOpenCategoryManager()}
              title="مدیریت و ایجاد دسته‌بندی جدید"
              className="shrink-0 p-1 sm:p-1.5 rounded-lg text-[#55594F] dark:text-[#9EA294] hover:bg-[#EAEEDF] dark:hover:bg-[#23271E] hover:text-[#1A1C16] dark:hover:text-white transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Bottom Shelf: Sleek Integrated Subcategories Drawer */}
        {currentSubcategories.length > 0 && activeParentCategory && (
          <div
            className={`w-full flex items-center gap-1.5 border-t border-[#E2E6D8]/80 dark:border-[#383D33]/80 transition-all duration-200 animate-in fade-in slide-in-from-top-1 ${
              isCompact ? 'pt-1 mt-1' : 'pt-1.5 mt-1.5'
            }`}
          >
            {/* Parent Breadcrumb Tag */}
            <div className="shrink-0 flex items-center gap-1 text-[10px] text-[#55594F] dark:text-[#9EA294] font-medium pr-1">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: activeParentCategory.color || '#4A6D22' }}
              />
              <span className="truncate max-w-[80px] sm:max-w-none">{activeParentCategory.name}:</span>
            </div>

            {/* Horizontally Scrollable Subcategories Pills */}
            <div
              ref={subScrollContainerRef}
              className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth py-0.5"
              style={{
                WebkitOverflowScrolling: 'touch',
                touchAction: activeDragId && isDraggingSubcategory ? 'none' : 'pan-x',
              }}
            >
              {/* "All in this Parent" Mini-Chip */}
              <button
                type="button"
                onClick={() => handleTabClick(activeParentCategory.id)}
                className={`shrink-0 flex items-center gap-1 rounded-md transition-all cursor-pointer ${
                  isCompact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
                } ${
                  selectedCategory === activeParentCategory.id
                    ? 'bg-[#4A6D22] text-white font-bold shadow-2xs'
                    : 'bg-[#F0F3E9] dark:bg-[#20241A] text-[#43493E] dark:text-[#E2E3DC] hover:bg-[#E5E9DB] dark:hover:bg-[#282D20]'
                }`}
              >
                <Layers className="w-2.5 h-2.5 shrink-0" />
                <span>همه</span>
                <span
                  className={`rounded-full ${
                    selectedCategory === activeParentCategory.id ? 'text-white/80' : 'text-[#6F7466] dark:text-[#888D7E]'
                  }`}
                >
                  {getTotalCategoryNoteCount(activeParentCategory.id, localCategories, categoryCounts)}
                </span>
              </button>

              {/* Subcategory Mini-Chips with Telegram-style long press & drag */}
              {currentSubcategories.map((subCat) => {
                const isSelected = selectedCategory === subCat.id;
                const subCount = getTotalCategoryNoteCount(subCat.id, localCategories, categoryCounts);
                const isDraggingThis = activeDragId === subCat.id;

                return (
                  <div
                    key={subCat.id}
                    data-category-id={subCat.id}
                    data-is-subcategory="true"
                    onPointerDown={(e) => handleTabPointerDown(e, subCat.id, true)}
                    className={`relative shrink-0 flex items-center rounded-md select-none transition-transform duration-150 ease-out ${
                      isDraggingThis
                        ? 'scale-108 shadow-lg shadow-black/25 ring-1.5 ring-[#4A6D22] dark:ring-[#D0E8B2] z-40 bg-white dark:bg-[#1F231B] cursor-grabbing -translate-y-0.5'
                        : 'cursor-pointer'
                    }`}
                    style={{
                      touchAction: isDraggingThis ? 'none' : 'pan-x',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleTabClick(subCat.id)}
                      className={`shrink-0 flex items-center gap-1 rounded-md transition-colors cursor-pointer ${
                        isCompact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
                      } ${
                        isSelected
                          ? 'bg-[#4A6D22] text-white font-bold shadow-2xs'
                          : 'bg-[#F0F3E9] dark:bg-[#20241A] text-[#43493E] dark:text-[#E2E3DC] hover:bg-[#E5E9DB] dark:hover:bg-[#282D20]'
                      }`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: subCat.color || '#4A6D22' }}
                      />
                      <span className="font-medium pointer-events-none">{subCat.name}</span>
                      <span
                        className={`rounded-full pointer-events-none ${
                          isSelected ? 'text-white/80' : 'text-[#6F7466] dark:text-[#888D7E]'
                        }`}
                      >
                        {subCount}
                      </span>
                    </button>
                  </div>
                );
              })}

              {/* Add Subcategory Shortcut directly in shelf */}
              {onOpenCategoryManager && (
                <button
                  type="button"
                  onClick={() => onOpenCategoryManager(activeParentCategory.id)}
                  title={`افزودن زیرمجموعه جدید به "${activeParentCategory.name}"`}
                  className={`shrink-0 flex items-center gap-1 rounded-md border border-dashed border-[#CCD1C1] dark:border-[#43493E] hover:border-[#4A6D22] dark:hover:border-[#D0E8B2] text-[#4A6D22] dark:text-[#D0E8B2] hover:bg-[#D0E8B2]/20 transition-all cursor-pointer ${
                    isCompact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]'
                  }`}
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>زیردسته جدید</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
