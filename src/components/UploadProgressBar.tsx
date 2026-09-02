import React from 'react';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  FileSpreadsheet,
  FileArchive,
  Loader2,
} from 'lucide-react';
import { BatchUploadProgress } from '../lib/media';

interface UploadProgressBarProps {
  progress: BatchUploadProgress | null;
  onCancel?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
    return <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
  }
  if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) {
    return <Film className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
  }
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) {
    return <Music className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return <FileSpreadsheet className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <FileArchive className="w-4 h-4 text-orange-600 dark:text-orange-400" />;
  }
  return <FileText className="w-4 h-4 text-[#8B6814] dark:text-[#FFE086]" />;
};

const formatBytes = (bytes: number) => {
  if (!bytes || bytes <= 0) return '۰ بایت';
  if (bytes < 1024) return `${bytes} بایت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} کیلوبایت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} مگابایت`;
};

export const UploadProgressBar: React.FC<UploadProgressBarProps> = ({
  progress,
  onCancel,
  onDismiss,
  className = '',
}) => {
  if (!progress) return null;

  const isDone = progress.stage === 'done' || progress.overallPercent === 100;
  const isError = progress.stage === 'error';
  const isMultiple = progress.totalFiles > 1;

  const stageLabel = (() => {
    if (isError) return 'خطا در بارگذاری';
    if (isDone) return 'آپلود با موفقیت انجام شد';
    if (progress.stage === 'reading') return 'در حال خواندن فایل…';
    if (progress.stage === 'processing') return 'در حال بهینه‌سازی و ذخیره…';
    return isMultiple
      ? `در حال آپلود (${progress.currentFileIndex} از ${progress.totalFiles})…`
      : 'در حال ارسال به سرور…';
  })();

  return (
    <div
      id="upload-progress-container"
      className={`fixed bottom-4 sm:bottom-6 right-3 sm:right-6 left-3 sm:left-auto z-[90] sm:w-96 max-w-full bg-white/95 dark:bg-[#1E201A]/95 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl border border-[#E1E4D5] dark:border-[#43493E] animate-in slide-in-from-bottom-5 duration-300 transition-all ${className}`}
      dir="rtl"
    >
      {/* Header with Title and Cancel/Dismiss button */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              isDone
                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                : isError
                ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                : 'bg-[#FAF2DE] dark:bg-[#332A18] text-[#8B6814] dark:text-[#FFE086]'
            }`}
          >
            {isDone ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : isError ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h5 className="text-xs font-bold text-[#1A1C16] dark:text-[#E2E3DC] truncate">
              {stageLabel}
            </h5>
            <div className="flex items-center gap-1 text-[10px] text-[#5E6258] dark:text-[#8F9285] truncate">
              {getFileIcon(progress.currentFileName)}
              <span className="truncate max-w-[180px]" title={progress.currentFileName}>
                {progress.currentFileName}
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Percentage & Action button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-bold font-mono text-[#4A6D22] dark:text-[#D0E8B2]">
            {progress.overallPercent}%
          </span>
          {onCancel && !isDone && !isError && (
            <button
              type="button"
              onClick={onCancel}
              className="p-1 rounded-lg text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="لغو آپلود"
              aria-label="لغو آپلود"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {(isDone || isError) && onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="p-1 rounded-lg text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="بستن"
              aria-label="بستن"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar Track */}
      <div className="relative w-full h-2 rounded-full bg-[#E1E4D5]/60 dark:bg-[#43493E]/60 overflow-hidden mb-1.5">
        <div
          className={`h-full rounded-full transition-all duration-200 ease-out ${
            isDone
              ? 'bg-emerald-500'
              : isError
              ? 'bg-red-500'
              : 'bg-gradient-to-r from-[#4A6D22] via-[#638E31] to-[#88B849] dark:from-[#D0E8B2] dark:via-[#A3D17A] dark:to-[#88B849]'
          }`}
          style={{ width: `${Math.max(2, progress.overallPercent)}%` }}
        />
        {!isDone && !isError && (
          <div
            className="absolute inset-0 bg-white/20 animate-pulse"
            style={{ width: `${Math.max(2, progress.overallPercent)}%` }}
          />
        )}
      </div>

      {/* Footer Info: Size details & Multitask status */}
      <div className="flex items-center justify-between text-[10px] text-[#5E6258] dark:text-[#8F9285] font-mono">
        <span>
          {formatBytes(progress.currentFileLoaded)} / {formatBytes(progress.currentFileSize)}
        </span>
        {isMultiple && (
          <span className="font-sans text-[10px] text-[#8B6814] dark:text-[#FFE086]">
            فایل {progress.currentFileIndex} از {progress.totalFiles}
          </span>
        )}
      </div>
    </div>
  );
};
