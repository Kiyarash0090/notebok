import React, { useState } from 'react';
import {
  Download,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Presentation,
  Maximize2,
  Pause,
  Play,
  Eye,
} from 'lucide-react';
import { NoteAttachment } from '../../types';
import { VideoPlayer } from './VideoPlayer';
import { useDocumentViewer } from '../../context/DocumentViewerContext';
import { isOfficeFile, isViewableDocument, getDocumentBadgeInfo } from '../../lib/fileViewerUtils';


interface MediaFrameProps {
  attachment: NoteAttachment;
  caption?: string;
  width?: number;
  onZoom?: (url: string) => void;
  compact?: boolean;
  editable?: boolean;
}

const formatSize = (bytes: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} بایت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} کیلوبایت`;
  return `${(bytes / 1024 / 1024).toFixed(1)} مگابایت`;
};

const formatDuration = (sec?: number) => {
  if (!sec || !Number.isFinite(sec)) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const getDocumentInfo = (attachment: NoteAttachment) => {
  const name = (attachment.name || '').toLowerCase();
  if (name.endsWith('.docx') || name.endsWith('.doc')) {
    return {
      label: 'سند Word',
      icon: FileText,
      iconBg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
    };
  }
  if (name.endsWith('.pptx') || name.endsWith('.ppt')) {
    return {
      label: 'ارائه PowerPoint',
      icon: Presentation,
      iconBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
    };
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
    return {
      label: 'کاربرگ Excel',
      icon: FileSpreadsheet,
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
    };
  }
  if (name.endsWith('.pdf')) {
    return {
      label: 'فایل PDF',
      icon: FileText,
      iconBg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300',
    };
  }
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.rtf') || name.endsWith('.json')) {
    return {
      label: 'فایل متنی',
      icon: FileText,
      iconBg: 'bg-[#FAF2DE] dark:bg-[#332A18] text-[#8B6814] dark:text-[#FFE086]',
    };
  }
  return {
    label: 'فایل ضمیمه',
    icon: FileText,
    iconBg: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
  };
};

export const MediaFrame: React.FC<MediaFrameProps> = ({
  attachment,
  caption,
  width = 100,
  onZoom,
  compact = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const { openDocument } = useDocumentViewer();

  const toggleAudio = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      el.pause();
      setIsPlaying(false);
    }
  };

  const body = () => {
    if (attachment.type === 'image') {
      return (
        <div className="group/media relative overflow-hidden rounded-2xl border border-[#E1E4D5] dark:border-[#43493E] bg-black/5 dark:bg-white/5">
          <img
            src={attachment.url}
            alt={caption || attachment.name}
            className={`w-full h-auto block ${
              compact ? 'max-h-44 object-cover object-center' : ''
            }`}
            loading="lazy"
          />
          {onZoom && (
            <button
              type="button"
              onClick={() => onZoom(attachment.url)}
              className="absolute top-2 left-2 p-1.5 rounded-xl bg-black/50 text-white opacity-0 group-hover/media:opacity-100 focus-visible:opacity-100 transition-opacity"
              title="نمایش در اندازه کامل"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      );
    }

    if (attachment.type === 'video') {
      return (
        <VideoPlayer
          src={attachment.url}
          initialMuted={compact}
          compact={compact}
        />
      );
    }

    if (attachment.type === 'audio') {
      return (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#EDF5E0] dark:bg-[#232F1A] border border-[#D0E8B2] dark:border-[#3D522C]">
          <audio
            ref={audioRef}
            src={attachment.url}
            preload="metadata"
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
          />
          <button
            type="button"
            onClick={toggleAudio}
            className="w-11 h-11 shrink-0 rounded-2xl bg-[#4A6D22] text-white flex items-center justify-center hover:bg-[#3d5a1c] active:scale-95 transition-all"
            title={isPlaying ? 'توقف' : 'پخش'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold truncate text-[#1A1C16] dark:text-[#E2E3DC]">
              {attachment.name}
            </div>
            <div className="text-[10px] text-[#5E6258] dark:text-[#8F9285] flex items-center gap-2">
              <span>فایل صوتی</span>
              {attachment.duration ? (
                <span dir="ltr">{formatDuration(attachment.duration)}</span>
              ) : null}
            </div>
          </div>
          <a
            href={attachment.url}
            download={attachment.name}
            className="p-2 rounded-xl text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="دانلود فایل صوتی"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      );
    }

    // All Documents (Word, PowerPoint, Excel, PDF, TXT, etc.): Clean, minimal file card
    const docInfo = getDocumentInfo(attachment);
    const DocIcon = docInfo.icon;

    return (
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-3 rounded-2xl bg-white dark:bg-[#1C1C17] border border-[#E1E4D5] dark:border-[#43493E] transition-all hover:border-[#D0E8B2] dark:hover:border-[#3D522C] group/doc ${
          compact ? 'p-2 sm:p-2' : 'p-3.5 sm:p-3'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`${
              compact ? 'w-8 h-8 rounded-xl' : 'w-10 h-10 rounded-2xl'
            } shrink-0 ${docInfo.iconBg} flex items-center justify-center transition-transform group-hover/doc:scale-105`}
          >
            <DocIcon className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
          </div>
          <div className="min-w-0 flex-1">
            <div
              className={`font-bold truncate text-[#1A1C16] dark:text-[#E2E3DC] ${
                compact ? 'text-[11px]' : 'text-xs sm:text-sm'
              }`}
            >
              {attachment.name}
            </div>
            <div
              className={`text-[#5E6258] dark:text-[#8F9285] ${
                compact ? 'text-[9px]' : 'text-[10px] sm:text-xs'
              } flex items-center gap-2`}
            >
              <span>{docInfo.label}</span>
              {attachment.size ? (
                <>
                  <span>•</span>
                  <span>{formatSize(attachment.size)}</span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#E1E4D5]/40 dark:border-[#43493E]/40" onClick={(e) => e.stopPropagation()}>
          {/* If non-office viewable file (PDF, TXT, CODE, MD), show Open viewer button */}
          {!isOfficeFile(attachment.name) && isViewableDocument(attachment.name) && (
            <button
              type="button"
              onClick={() => openDocument(attachment)}
              className={`flex items-center justify-center gap-1.5 font-bold bg-[#4A6D22] text-white hover:bg-[#3B571B] active:scale-95 transition-all shadow-2xs ${
                compact
                  ? 'px-3 py-1.5 rounded-xl text-[11px]'
                  : 'px-3.5 py-2 sm:px-3 sm:py-1.5 rounded-xl text-xs sm:text-[11px]'
              }`}
              title="مشاهده در پلیر اختصاصی برنامه"
            >
              <Eye className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4 sm:w-3.5 sm:h-3.5'} />
              <span>مشاهده</span>
            </button>
          )}

          {/* Direct Download button (ALWAYS present, and the ONLY button for Office files) */}
          <a
            href={attachment.url}
            download={attachment.name}
            className={`flex items-center justify-center gap-1.5 font-bold bg-white dark:bg-[#2E3128] hover:bg-[#D0E8B2] hover:text-[#1A3700] active:scale-95 border border-[#E1E4D5] dark:border-[#43493E] text-[#4A6D22] dark:text-[#D0E8B2] transition-all shadow-2xs ${
              compact
                ? 'px-3 py-1.5 rounded-xl text-[11px]'
                : 'px-3.5 py-2 sm:px-3 sm:py-1.5 rounded-xl text-xs sm:text-[11px]'
            }`}
            title="دانلود مستقیم فایل"
          >
            <Download className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4 sm:w-3.5 sm:h-3.5'} />
            <span>دانلود</span>
          </a>
        </div>
      </div>
    );
  };

  return (
    <figure
      className={compact ? 'my-0.5 mx-auto' : 'my-1 mx-auto'}
      style={{ width: `${Math.min(100, Math.max(20, width))}%` }}
    >
      {body()}
      {caption && caption.trim() !== '' ? (
        <figcaption
          className={`${
            compact ? 'mt-0.5' : 'mt-1.5'
          } text-center text-[11px] text-[#5E6258] dark:text-[#8F9285]`}
        >
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
};
