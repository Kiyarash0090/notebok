import React, { useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Run the PDF with pdf.js's own worker inside the app instead of handing the
// URL to the browser's built-in viewer.
pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfPlayerProps {
  url: string;
  fileName?: string;
}

// Internal PDF player: renders pages on a canvas via react-pdf / pdf.js.
// The chrome (toolbar + backdrop) is theme-aware and matches the app's
// Natural Tones palette (light off-white card, dark near-black in dark mode,
// green accent) instead of the browser/gray default.
export const PdfPlayer: React.FC<PdfPlayerProps> = ({ url, fileName }) => {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const touchY = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fit the page to the available width (with padding) unless zoomed.
  const pageWidth = containerWidth ? Math.max(300, Math.min(containerWidth - 48, 1024)) : 720;

  const spinner = (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-8 h-8 text-[#4A6D22] dark:text-[#D0E8B2] animate-spin" />
      <span className="text-[#5E6258] dark:text-[#8F9285] text-sm font-bold ms-3">در حال خواندن PDF...</span>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col bg-[#F5F6EE] dark:bg-[#1E211B]">
      {/* Header toolbar — wraps so it never overflows on narrow screens */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-white dark:bg-[#1E211B] text-[#1A1C16] dark:text-[#E2E3DC] border-b border-[#E1E4D5] dark:border-[#383C32] shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            title="صفحه قبلی"
            className="p-1.5 rounded-lg hover:bg-[#F5F6EE] dark:hover:bg-[#32362C] disabled:opacity-40 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold tabular-nums px-1">{pageNumber} / {numPages || '...'}</span>
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            title="صفحه بعدی"
            className="p-1.5 rounded-lg hover:bg-[#F5F6EE] dark:hover:bg-[#32362C] disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* File name is hidden on small screens so the controls always fit */}
        <span
          className="hidden sm:inline text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285] truncate max-w-[200px] md:max-w-xs"
          title={fileName}
        >
          {fileName}
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(2)))}
            title="کوچک‌نمایی"
            className="p-1.5 rounded-lg hover:bg-[#F5F6EE] dark:hover:bg-[#32362C] transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs tabular-nums w-12 text-center">{Math.round(scale * 100)}٪</span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(3, +(s + 0.2).toFixed(2)))}
            title="بزرگ‌نمایی"
            className="p-1.5 rounded-lg hover:bg-[#F5F6EE] dark:hover:bg-[#32362C] transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable page area — horizontal swipe flips pages on touch devices */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-[#EAEBE5] dark:bg-[#1A1C16]"
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
          touchY.current = e.touches[0].clientY;
        }}
        onTouchEnd={(e) => {
          if (touchX.current === null || touchY.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          const dy = e.changedTouches[0].clientY - touchY.current;
          touchX.current = null;
          touchY.current = null;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            if (dx < 0) setPageNumber((p) => Math.min(numPages, p + 1));
            else setPageNumber((p) => Math.max(1, p - 1));
          }
        }}
      >
        <div className="mx-auto my-4">
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={spinner}
            error={
              <div className="flex items-center justify-center py-16 text-[#5E6258] dark:text-[#8F9285] text-sm font-bold text-center px-6">
                خطا در بارگذاری فایل PDF
              </div>
            }
            className="flex flex-col items-center gap-4"
          >
            <Page
              pageNumber={pageNumber}
              width={Math.round(pageWidth * scale)}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={spinner}
            />
          </Document>
        </div>
      </div>
    </div>
  );
};
