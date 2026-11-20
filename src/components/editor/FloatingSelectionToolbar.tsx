import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bold, Code, Italic, Sigma, Strikethrough } from 'lucide-react';
import { HIGHLIGHT_COLOR_LIST, HIGHLIGHT_COLORS, HighlightColorId } from '../../lib/richText';

interface FloatingSelectionToolbarProps {
  containerRef: React.RefObject<HTMLElement | null>;
  onCommand: (mark: string) => void;
  activeMarks: Set<string>;
  activeHighlightColor: HighlightColorId | null;
}

interface ToolbarPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
}

export const FloatingSelectionToolbar: React.FC<FloatingSelectionToolbarProps> = ({
  containerRef,
  onCommand,
  activeMarks,
  activeHighlightColor,
}) => {
  const [pos, setPos] = useState<ToolbarPosition | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const isTouchInputRef = useRef<boolean>(
    typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(pointer: coarse)')?.matches)
  );
  const isTouchDraggingRef = useRef<boolean>(false);
  const lastRangeRef = useRef<Range | null>(null);
  const lastRootRef = useRef<HTMLElement | null>(null);

  const updatePosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      setPos(null);
      return;
    }

    if (isTouchDraggingRef.current) {
      setPos(null);
      return;
    }

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setPos(null);
      lastRangeRef.current = null;
      lastRootRef.current = null;
      return;
    }

    const range = sel.getRangeAt(0);
    const startNode = range.startContainer;
    const endNode = range.endContainer;

    const startEl = startNode.nodeType === Node.ELEMENT_NODE ? (startNode as HTMLElement) : startNode.parentElement;
    const endEl = endNode.nodeType === Node.ELEMENT_NODE ? (endNode as HTMLElement) : endNode.parentElement;

    const startRoot = startEl?.closest?.('[data-rich-editor="true"]') as HTMLElement | null;
    const endRoot = endEl?.closest?.('[data-rich-editor="true"]') as HTMLElement | null;

    if (!startRoot || startRoot !== endRoot || !container.contains(startRoot)) {
      setPos(null);
      lastRangeRef.current = null;
      lastRootRef.current = null;
      return;
    }

    if (startEl?.closest?.('[data-latex]') || endEl?.closest?.('[data-latex]')) {
      setPos(null);
      lastRangeRef.current = null;
      lastRootRef.current = null;
      return;
    }

    const selectedText = range.toString().replace(/\u200B/g, '').trim();
    if (!selectedText) {
      setPos(null);
      lastRangeRef.current = null;
      lastRootRef.current = null;
      return;
    }

    try {
      lastRangeRef.current = range.cloneRange();
      lastRootRef.current = startRoot;
    } catch {
      /* ignore */
    }

    let rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      const clientRects = range.getClientRects();
      if (clientRects.length > 0) {
        rect = clientRects[0];
      } else {
        setPos(null);
        return;
      }
    }

    const vv = window.visualViewport;
    const vvTop = vv ? vv.offsetTop : 0;
    const vvLeft = vv ? vv.offsetLeft : 0;
    const vvWidth = vv ? vv.width : window.innerWidth;
    const vvBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;

    const toolbarWidth = toolbarRef.current?.offsetWidth || 284;
    const toolbarHeight = toolbarRef.current?.offsetHeight || 42;
    const halfWidth = toolbarWidth / 2;
    const margin = 12;
    const rawCenter = rect.left + rect.width / 2;
    const clampedLeft = Math.min(
      vvLeft + vvWidth - halfWidth - margin,
      Math.max(vvLeft + halfWidth + margin, rawCenter)
    );

    const scrollViewport = container.closest('.overflow-y-auto') as HTMLElement | null;
    const viewportTop = scrollViewport ? scrollViewport.getBoundingClientRect().top : vvTop;
    const minTopBound = Math.max(vvTop + 10, viewportTop + 6);
    const maxBottomBound = vvBottom - 10;
    const spaceAbove = rect.top - minTopBound;
    const spaceBelow = maxBottomBound - rect.bottom;

    let placeBelow = false;
    let top = rect.top - 10;

    if (isTouchInputRef.current) {
      // On touch devices (iOS/Android), the OS copy/paste menu normally renders
      // ~56-68px above the selection (unless near the top, where it flips below),
      // while teardrop selection handles extend ~28px below the selection.
      const touchHandleGap = 36;
      const touchOsMenuGap = 68;
      const osMenuLikelyBelow = spaceAbove < 72;

      if (!osMenuLikelyBelow) {
        if (spaceBelow >= toolbarHeight + touchHandleGap) {
          placeBelow = true;
          top = rect.bottom + touchHandleGap;
        } else if (spaceAbove >= toolbarHeight + touchOsMenuGap) {
          placeBelow = false;
          top = rect.top - touchOsMenuGap;
        } else if (spaceBelow >= spaceAbove) {
          placeBelow = true;
          top = Math.min(maxBottomBound - toolbarHeight, rect.bottom + 14);
        } else {
          placeBelow = false;
          top = Math.max(minTopBound + toolbarHeight, rect.top - 12);
        }
      } else {
        // Selection is near the top so OS menu flips below the selection
        if (spaceBelow >= toolbarHeight + touchOsMenuGap) {
          placeBelow = true;
          top = rect.bottom + touchOsMenuGap;
        } else if (spaceBelow >= toolbarHeight + touchHandleGap) {
          placeBelow = true;
          top = rect.bottom + touchHandleGap;
        } else {
          placeBelow = true;
          top = Math.min(maxBottomBound - toolbarHeight, rect.bottom + 14);
        }
      }
    } else {
      const gap = 10;
      const needed = toolbarHeight + gap;
      placeBelow = spaceAbove < needed && spaceBelow >= spaceAbove;
      top = placeBelow
        ? Math.min(maxBottomBound - toolbarHeight, rect.bottom + gap)
        : Math.max(toolbarHeight + 8, rect.top - gap);
    }

    setPos({
      top,
      left: clampedLeft,
      placement: placeBelow ? 'bottom' : 'top',
    });
  }, [containerRef]);

  useEffect(() => {
    let rafId: number | null = null;
    let touchSettleTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleUpdate = (delayMs = 0) => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (touchSettleTimer !== null) {
        clearTimeout(touchSettleTimer);
        touchSettleTimer = null;
      }
      if (delayMs > 0) {
        touchSettleTimer = setTimeout(() => {
          touchSettleTimer = null;
          rafId = requestAnimationFrame(() => {
            rafId = null;
            updatePosition();
          });
        }, delayMs);
      } else {
        rafId = requestAnimationFrame(() => {
          rafId = null;
          updatePosition();
        });
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') {
        isTouchInputRef.current = true;
      } else if (e.pointerType === 'mouse') {
        isTouchInputRef.current = false;
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      isTouchInputRef.current = true;
      const target = e.target as Node | null;
      if (target && toolbarRef.current?.contains(target)) {
        return;
      }
      isTouchDraggingRef.current = true;
      setPos(null);
    };

    const onTouchEnd = (e: TouchEvent) => {
      const target = e.target as Node | null;
      if (target && toolbarRef.current?.contains(target)) {
        return;
      }
      isTouchDraggingRef.current = false;
      scheduleUpdate(160);
    };

    const onSelectionChange = () => {
      if (isTouchDraggingRef.current) return;
      scheduleUpdate(isTouchInputRef.current ? 120 : 0);
    };

    const onViewportChange = () => scheduleUpdate(0);

    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true, capture: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true, capture: true });
    document.addEventListener('selectionchange', onSelectionChange);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    window.visualViewport?.addEventListener('resize', onViewportChange);
    window.visualViewport?.addEventListener('scroll', onViewportChange);
    document.addEventListener('mouseup', onViewportChange);
    document.addEventListener('keyup', onSelectionChange);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (touchSettleTimer !== null) clearTimeout(touchSettleTimer);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('touchstart', onTouchStart, true);
      document.removeEventListener('touchend', onTouchEnd, true);
      document.removeEventListener('touchcancel', onTouchEnd, true);
      document.removeEventListener('selectionchange', onSelectionChange);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
      window.visualViewport?.removeEventListener('resize', onViewportChange);
      window.visualViewport?.removeEventListener('scroll', onViewportChange);
      document.removeEventListener('mouseup', onViewportChange);
      document.removeEventListener('keyup', onSelectionChange);
    };
  }, [updatePosition]);

  const handleToolbarCommand = useCallback(
    (mark: string) => {
      const sel = window.getSelection();
      const hasLiveRange =
        sel &&
        sel.rangeCount > 0 &&
        !sel.isCollapsed &&
        lastRootRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer);

      if (!hasLiveRange && lastRangeRef.current && lastRootRef.current) {
        try {
          lastRootRef.current.focus({ preventScroll: true });
          const nextSel = window.getSelection();
          if (nextSel) {
            nextSel.removeAllRanges();
            nextSel.addRange(lastRangeRef.current);
          }
        } catch {
          /* ignore */
        }
      }
      onCommand(mark);
    },
    [onCommand]
  );

  if (!pos) return null;

  const markButtons: { key: string; title: string; icon: React.ReactNode }[] = [
    { key: 'bold', title: 'ضخیم (Ctrl+B)', icon: <Bold className="w-3.5 h-3.5" /> },
    { key: 'italic', title: 'مورب (Ctrl+I)', icon: <Italic className="w-3.5 h-3.5" /> },
    { key: 'strike', title: 'خط‌خورده', icon: <Strikethrough className="w-3.5 h-3.5" /> },
    { key: 'code', title: 'کد درون‌خطی', icon: <Code className="w-3.5 h-3.5" /> },
    { key: 'math', title: 'تبدیل به فرمول ریاضی', icon: <Sigma className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      ref={toolbarRef}
      data-toolbar="floating"
      dir="rtl"
      onMouseDown={(e) => e.preventDefault()}
      style={{
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        transform:
          pos.placement === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      }}
      className="fixed z-[84] transition-[top,left] duration-150 ease-out select-none touch-manipulation max-w-[calc(100vw-24px)]"
    >
      <div className="flex items-center gap-0.5 sm:gap-1 px-1.5 py-1 rounded-2xl bg-[#FAF9F5]/95 dark:bg-[#1C1C17]/95 backdrop-blur-md border border-[#E1E4D5] dark:border-[#43493E] shadow-xl anim-scale-in">
        {/* 4 soft highlight color dots */}
        <div className="flex items-center gap-1 px-1">
          {HIGHLIGHT_COLOR_LIST.map((colorId) => {
            const cfg = HIGHLIGHT_COLORS[colorId];
            const isActive = activeHighlightColor === colorId;
            return (
              <button
                key={colorId}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleToolbarCommand(`highlight:${colorId}`)}
                title={`هایلایت ${cfg.label}`}
                aria-label={`هایلایت ${cfg.label}`}
                className={`w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full border transition-all active:scale-90 flex items-center justify-center touch-manipulation ${
                  isActive
                    ? 'ring-2 ring-[#4A6D22] dark:ring-[#D0E8B2] scale-110 border-[#4A6D22]'
                    : 'border-black/15 dark:border-white/20 hover:scale-110'
                }`}
                style={{ backgroundColor: cfg.swatch }}
              />
            );
          })}
        </div>

        <div className="w-px h-4 bg-[#E1E4D5] dark:bg-[#43493E] mx-0.5 shrink-0" />

        {/* Inline text & math formatting buttons */}
        {markButtons.map((btn) => {
          const isActive = btn.key !== 'math' && activeMarks.has(btn.key);
          return (
            <button
              key={btn.key}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleToolbarCommand(btn.key)}
              title={btn.title}
              className={`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-xl flex items-center justify-center transition-all active:scale-90 touch-manipulation ${
                isActive
                  ? 'bg-[#D0E8B2] dark:bg-[#324B10] text-[#1A3700] dark:text-[#D0E8B2] shadow-2xs'
                  : 'text-[#3F4A35] dark:text-[#BCC2B2] hover:bg-[#D0E8B2]/70 dark:hover:bg-[#324B10]/70 hover:text-[#1A3700] dark:hover:text-[#D0E8B2]'
              }`}
            >
              {btn.icon}
            </button>
          );
        })}
      </div>
    </div>
  );
};
