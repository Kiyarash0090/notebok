import React, { useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  FileText,
  Download,
  ExternalLink,
  Maximize2,
  X,
  Sparkles,
  GripVertical,
  BookOpen,
  Eye,
} from 'lucide-react';
import { NoteAttachment } from '../types';
import { MathRenderer } from './MathRenderer';
import { VideoPlayerModal } from './VideoPlayerModule';
import { useDocumentViewer } from '../context/DocumentViewerContext';
import { isOfficeFile, isViewableDocument, getDocumentBadgeInfo } from '../lib/fileViewerUtils';

interface RichNoteContentProps {
  content: string;
  attachments?: NoteAttachment[];
  summary?: string;
  clampLines?: number;
  className?: string;
  isInteractive?: boolean;
  onContentChange?: (newContent: string) => void;
}

export const RichNoteContent: React.FC<RichNoteContentProps> = ({
  content,
  attachments = [],
  summary,
  clampLines,
  className = '',
  isInteractive = true,
  onContentChange,
}) => {
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [activeImageZoom, setActiveImageZoom] = useState<string | null>(null);
  const [activeVideoPlayer, setActiveVideoPlayer] = useState<{ src: string; title: string } | null>(null);
  const [resizingImage, setResizingImage] = useState<{ src: string; width: number } | null>(null);
  const audioRefs = React.useRef<Record<string, HTMLAudioElement | null>>({});
  const { openDocument } = useDocumentViewer();

  // Set of sources already rendered inline in contentSegments
  const inlineSources = React.useMemo(() => {
    if (!content) return new Set<string>();
    const sources = new Set<string>();
    const matches = content.matchAll(/(?:!\[.*?\]|🎬\[.*?\]|🎙️\[.*?\]|📄\[.*?\])\((data:[^)]+|https?:\/\/[^)]+)\)/g);
    for (const match of matches) {
      if (match[1]) sources.add(match[1].replace(/\|\d+px$/, ''));
    }
    return sources;
  }, [content]);

  // Separate attachments based on position property, excluding those already inline
  const topAttachments = attachments.filter(
    (att) =>
      !inlineSources.has(att.url) &&
      (att.position === 'top' || (!att.position && (att.type === 'image' || att.type === 'video')))
  );

  const bottomAttachments = attachments.filter(
    (att) =>
      !inlineSources.has(att.url) &&
      (att.position === 'bottom' || (!att.position && (att.type === 'audio' || att.type === 'document')))
  );

  // Audio Playback Handler
  const handleToggleAudio = (att: NoteAttachment, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentAudio = audioRefs.current[att.id];

    if (playingAudioId === att.id) {
      currentAudio?.pause();
      setPlayingAudioId(null);
    } else {
      // Pause any previous playing audio
      if (playingAudioId && audioRefs.current[playingAudioId]) {
        audioRefs.current[playingAudioId]?.pause();
      }
      if (currentAudio) {
        currentAudio.currentTime = 0;
        currentAudio
          .play()
          .then(() => setPlayingAudioId(att.id))
          .catch((err) => console.error('Audio playback failed', err));
      }
    }
  };

  // Clean raw base64 or markdown links from content text to ensure clean document presentation
  const cleanContentText = React.useMemo(() => {
    if (!content) return '';
    // Strip markdown images: ![alt](url)
    let cleaned = content.replace(/!\[.*?\]\((data:image\/[^;]+;base64,[^\)]+|https?:\/\/[^\)]+)\)/gi, '');
    // Strip markdown media links with base64 data: [text](data:...)
    cleaned = cleaned.replace(/\[.*?\]\((data:[^;]+;base64,[^\)]+)\)/gi, '');
    // Strip standalone massive base64 strings if any leaked into text
    cleaned = cleaned.replace(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]{50,}/gi, '');
    return cleaned.trim();
  }, [content]);

  // Parse content into segments (text, images, videos, audio, documents)
  const contentSegments = React.useMemo(() => {
    if (!content) return [];
    type SegmentType = 'text' | 'image' | 'video' | 'audio' | 'document';
    const segments: Array<{ type: SegmentType; content: string; alt?: string }> = [];

    // Simpler approach: process line by line
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check for image: ![name](data:image/...)
      const imageMatch = trimmedLine.match(/^!\[(.*?)\]\((data:image\/[^)]+)\)$/);
      if (imageMatch) {
        segments.push({ type: 'image', content: imageMatch[2], alt: imageMatch[1] || 'تصویر' });
        continue;
      }

      // Check for video: 🎬[name](data:...)
      const videoMatch = trimmedLine.match(/^🎬\[(.*?)\]\((data:[^)]+)\)$/);
      if (videoMatch) {
        segments.push({ type: 'video', content: videoMatch[2], alt: videoMatch[1] || 'ویدیو' });
        continue;
      }

      // Check for audio: 🎙️[name](data:...)
      const audioMatch = trimmedLine.match(/^🎙️\[(.*?)\]\((data:[^)]+)\)$/);
      if (audioMatch) {
        segments.push({ type: 'audio', content: audioMatch[2], alt: audioMatch[1] || 'صدا' });
        continue;
      }

      // Check for document: 📄[name](data:...)
      const docMatch = trimmedLine.match(/^📄\[(.*?)\]\((data:[^)]+)\)$/);
      if (docMatch) {
        segments.push({ type: 'document', content: docMatch[2], alt: docMatch[1] || 'فایل' });
        continue;
      }

      // Regular text line
      if (trimmedLine) {
        segments.push({ type: 'text', content: line });
      } else {
        segments.push({ type: 'text', content: '' });
      }
    }

    return segments;
  }, [content]);

  // Handle image resize
  const handleResizeImage = (imageSrc: string, newWidth: number) => {
    if (!onContentChange) return;
    const clampedWidth = Math.max(100, Math.min(800, newWidth));
    const imageMarkdownRegex = new RegExp(`!\\[([^\\]]*)\\]\\(${imageSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
    const updatedContent = content.replace(imageMarkdownRegex, `![...](${imageSrc}|${clampedWidth}px)`);
    onContentChange(updatedContent);
    setResizingImage(null);
  };

  // Parse image width from markdown (supports src|width format)
  const getImageWidth = (src: string): number | undefined => {
    const widthMatch = src.match(/\|(\d+)px$/);
    return widthMatch ? parseInt(widthMatch[1]) : undefined;
  };

  const getImageCleanSrc = (src: string): string => {
    return src.replace(/\|\d+px$/, '');
  };

  // Format seconds to mm:ss
  const formatSeconds = (sec?: number) => {
    if (!sec) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Render an individual attachment block
  const renderAttachmentItem = (att: NoteAttachment) => {
    if (att.type === 'image') {
      return (
        <div
          key={att.id}
          className="relative group/img overflow-hidden rounded-2xl bg-black/5 dark:bg-white/5 border border-[#E1E4D5] dark:border-[#43493E] my-2 transition-all duration-200"
        >
          <img
            src={att.url}
            alt={att.name || 'پیوست تصویر'}
            className="w-full h-auto max-h-80 object-cover rounded-2xl transition-transform duration-300 group-hover/img:scale-[1.01]"
            loading="lazy"
          />
          {isInteractive && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveImageZoom(att.url);
              }}
              className="absolute bottom-2 left-2 p-1.5 rounded-xl bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center gap-1 text-[11px]"
              title="مشاهده تصویر در اندازه بزرگ"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>بزرگ‌نمایی</span>
            </button>
          )}
        </div>
      );
    }

    if (att.type === 'video') {
      return (
        <div
          key={att.id}
          className="my-2 rounded-2xl overflow-hidden bg-black/10 dark:bg-black/40 border border-[#E1E4D5] dark:border-[#43493E]"
          onClick={(e) => e.stopPropagation()}
        >
          <video
            src={att.url}
            controls
            className="w-full max-h-72 rounded-2xl bg-black"
            preload="metadata"
          />
          <div className="p-2.5 flex items-center justify-between text-[11px] text-[#5E6258] dark:text-[#8F9285] font-medium bg-black/5 dark:bg-white/5">
            <span className="truncate">🎥 {att.name}</span>
            <button
              type="button"
              onClick={() => setActiveVideoPlayer({ src: att.url, title: att.name })}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[#4A6D22] text-white hover:bg-[#3B571B] text-[10px] font-bold transition-colors"
            >
              <Maximize2 className="w-3 h-3" />
              <span>پلیر اختصاصی</span>
            </button>
          </div>
        </div>
      );
    }

    if (att.type === 'audio') {
      const isPlaying = playingAudioId === att.id;
      return (
        <div
          key={att.id}
          className="my-2 flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[#EAECE2] dark:bg-[#23261F] border border-[#E1E4D5] dark:border-[#43493E] text-[#1A1C16] dark:text-[#E2E3DC]"
          onClick={(e) => e.stopPropagation()}
        >
          <audio
            ref={(el) => {
              audioRefs.current[att.id] = el;
            }}
            src={att.url}
            onEnded={() => setPlayingAudioId(null)}
            preload="none"
          />
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={(e) => handleToggleAudio(att, e)}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                isPlaying
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-[#D0E8B2] text-[#1A3700] hover:bg-[#c2dea0]'
              }`}
              title={isPlaying ? 'توقف پخش' : 'پخش صوت'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 mr-0.5" />}
            </button>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold truncate max-w-[180px] sm:max-w-[240px]">
                {att.name}
              </span>
              <span className="text-[10px] text-[#5E6258] dark:text-[#8F9285]">
                {att.duration ? formatSeconds(att.duration) : 'یادداشت صوتی'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Volume2 className="w-4 h-4 text-[#5E6258] dark:text-[#8F9285]" />
          </div>
        </div>
      );
    }

    // Document type
    const isOffice = isOfficeFile(att.name);
    const isViewable = isViewableDocument(att.name);
    const badgeInfo = getDocumentBadgeInfo(att.name);

    return (
      <div
        key={att.id}
        onClick={(e) => e.stopPropagation()}
        className="my-1.5 flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white dark:bg-[#1C1C17] border border-[#E1E4D5] dark:border-[#43493E] text-[#1A1C16] dark:text-[#E2E3DC] transition-colors w-full group/doc"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#FAF2DE] dark:bg-[#332A18] text-[#8B6814] dark:text-[#FFE086] flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold truncate max-w-[180px] sm:max-w-[240px]" title={att.name}>
              {att.name}
            </span>
            <span className="text-[10px] text-[#5E6258] dark:text-[#8F9285]">
              {badgeInfo.label} • {(att.size / 1024).toFixed(1)} KB
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* If non-office viewable document (PDF, TXT, CODE, MD), show Open button */}
          {!isOffice && isViewable && (
            <button
              type="button"
              onClick={() => openDocument(att)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#4A6D22] text-white text-[10px] font-bold hover:bg-[#3B571B] transition-colors shadow-2xs"
              title="مشاهده و مطالعه فایل در برنامه"
            >
              <Eye className="w-3 h-3" />
              <span>مشاهده</span>
            </button>
          )}

          {/* Download button (ALWAYS present, and the ONLY button for Office files) */}
          <a
            href={att.url}
            download={att.name}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-[#2E3128] hover:bg-[#D0E8B2] hover:text-[#1A3700] text-[#4A6D22] dark:text-[#D0E8B2] border border-[#E1E4D5] dark:border-[#43493E] text-[10px] font-bold transition-colors shadow-2xs"
            title="دانلود فایل"
          >
            <Download className="w-3 h-3" />
            <span>دانلود</span>
          </a>
        </div>
      </div>
    );
  };

  // Render inline image with resize handles
  const renderInlineImage = (src: string, alt: string, index: number) => {
    const cleanSrc = getImageCleanSrc(src);
    const width = getImageWidth(src);

    return (
      <div
        key={`inline-img-${index}`}
        className="my-3 group/img relative rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 border border-[#E1E4D5] dark:border-[#43493E]"
        style={width ? { maxWidth: `${width}px` } : undefined}
      >
        <img
          src={cleanSrc}
          alt={alt}
          className="w-full h-auto rounded-2xl transition-all duration-200"
          loading="lazy"
          style={width ? { maxWidth: `${width}px` } : undefined}
        />

        {/* Image toolbar on hover */}
        {isInteractive && (
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveImageZoom(cleanSrc);
              }}
              className="p-1.5 rounded-xl bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs"
              title="بزرگ‌نمایی"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            {onContentChange && (
              <div className="flex items-center gap-1 bg-black/60 rounded-xl px-2 py-1 backdrop-blur-xs">
                <GripVertical className="w-3 h-3 text-white/70" />
                <input
                  type="range"
                  min="100"
                  max="800"
                  value={width || 400}
                  onChange={(e) => handleResizeImage(src, parseInt(e.target.value))}
                  className="w-20 h-1 accent-[#D0E8B2]"
                  title="تغییر اندازه"
                />
                <span className="text-[10px] text-white/80 w-8">{width || '100%'}</span>
              </div>
            )}
          </div>
        )}

        {/* Caption area below image */}
        <div className="px-3 py-2 text-[11px] text-[#5E6258] dark:text-[#8F9285] italic">
          {alt !== 'تصویر' ? alt : 'تصویر'}
        </div>
      </div>
    );
  };

  // Render inline video
  const renderInlineVideo = (src: string, alt: string, index: number) => {
    return (
      <div key={`inline-video-${index}`} className="my-3 rounded-2xl overflow-hidden bg-black border border-[#E1E4D5] dark:border-[#43493E]">
        <video
          src={src}
          controls
          className="w-full max-h-72 rounded-2xl bg-black"
          preload="metadata"
        />
        <div className="px-3 py-2 flex items-center justify-between text-[11px] text-[#5E6258] dark:text-[#8F9285] bg-black/5 dark:bg-white/5">
          <span className="truncate">🎥 {alt}</span>
          <button
            type="button"
            onClick={() => setActiveVideoPlayer({ src, title: alt })}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#4A6D22] text-white hover:bg-[#3B571B] text-[10px] font-bold transition-colors"
          >
            <Maximize2 className="w-3 h-3" />
            <span>پلیر حرفه‌ای</span>
          </button>
        </div>
      </div>
    );
  };

  // Render inline audio
  const renderInlineAudio = (src: string, alt: string, index: number) => {
    const audioId = `inline-audio-${index}`;
    const isPlaying = playingAudioId === audioId;

    const togglePlay = () => {
      if (isPlaying) {
        if (audioRefs.current[audioId]) {
          audioRefs.current[audioId]?.pause();
        }
        setPlayingAudioId(null);
      } else {
        if (playingAudioId && audioRefs.current[playingAudioId]) {
          audioRefs.current[playingAudioId]?.pause();
        }
        const audio = new Audio(src);
        audioRefs.current[audioId] = audio;
        audio.onended = () => setPlayingAudioId(null);
        audio.play().then(() => setPlayingAudioId(audioId)).catch(console.error);
      }
    };

    return (
      <div key={`inline-audio-${index}`} className="my-3 flex items-center gap-3 p-3 rounded-2xl bg-[#EAECE2] dark:bg-[#23261F] border border-[#E1E4D5] dark:border-[#43493E]">
        <audio ref={(el) => { audioRefs.current[audioId] = el; }} src={src} preload="none" />
        <button
          type="button"
          onClick={togglePlay}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
            isPlaying
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-[#D0E8B2] text-[#1A3700] hover:bg-[#c2dea0]'
          }`}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 mr-0.5" />}
        </button>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold truncate text-[#1A1C16] dark:text-[#E2E3DC]">🎙️ {alt}</span>
          <span className="text-[10px] text-[#5E6258] dark:text-[#8F9285]">فایل صوتی</span>
        </div>
      </div>
    );
  };

  // Render inline document
  const renderInlineDocument = (src: string, alt: string, index: number) => {
    return (
      <div
        key={`inline-doc-${index}`}
        className="my-3 flex items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-[#1C1C17] border border-[#E1E4D5] dark:border-[#43493E] text-[#1A1C16] dark:text-[#E2E3DC] transition-colors w-full"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#FAF2DE] dark:bg-[#332A18] text-[#8B6814] dark:text-[#FFE086] flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold truncate">📄 {alt}</span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FAF2DE] dark:bg-[#332A18] text-[#8B6814] dark:text-[#FFE086] text-[10px] font-bold hover:bg-[#F5E6C4] dark:hover:bg-[#433720] transition-colors"
            title="باز کردن فایل"
          >
            <ExternalLink className="w-3 h-3" />
            <span>باز کردن</span>
          </a>
          <a
            href={src}
            download={alt}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[#5E6258] dark:text-[#8F9285]"
            title="دانلود فایل"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className={`rich-document-flow space-y-2 ${className}`}>
      {/* 1. TOP ATTACHMENTS (Non-image files positioned Above Text) */}
      {topAttachments.length > 0 && (
        <div className="top-attachments-block space-y-2 mb-2">
          {topAttachments.filter((a) => a.type !== 'image').map(renderAttachmentItem)}
        </div>
      )}

      {/* 2. INLINE CONTENT WITH IMAGES AND TEXT */}
      {contentSegments.length > 0 ? (
        <div
          className={`text-content text-xs sm:text-sm text-[#24292F] dark:text-[#D1D5DB] leading-relaxed ${
            clampLines ? `line-clamp-${clampLines}` : ''
          }`}
          style={
            clampLines
              ? {
                  display: '-webkit-box',
                  WebkitLineClamp: clampLines,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }
              : undefined
          }
        >
          {contentSegments.map((segment, idx) => {
            switch (segment.type) {
              case 'image':
                return renderInlineImage(segment.content, segment.alt || 'تصویر', idx);
              case 'video':
                return renderInlineVideo(segment.content, segment.alt || 'ویدیو', idx);
              case 'audio':
                return renderInlineAudio(segment.content, segment.alt || 'صدا', idx);
              case 'document':
                return renderInlineDocument(segment.content, segment.alt || 'فایل', idx);
              default:
                return (
                  <div key={`text-${idx}`} className="whitespace-pre-wrap mb-2">
                    <MathRenderer text={segment.content} />
                  </div>
                );
            }
          })}
        </div>
      ) : cleanContentText ? (
        <div
          className={`text-content text-xs sm:text-sm text-[#24292F] dark:text-[#D1D5DB] leading-relaxed whitespace-pre-wrap ${
            clampLines ? `line-clamp-${clampLines}` : ''
          }`}
          style={
            clampLines
              ? {
                  display: '-webkit-box',
                  WebkitLineClamp: clampLines,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }
              : undefined
          }
        >
          <MathRenderer text={cleanContentText} />
        </div>
      ) : null}

      {/* 3. BOTTOM ATTACHMENTS (Non-image files positioned Below Text) */}
      {bottomAttachments.length > 0 && (
        <div className="bottom-attachments-block space-y-2 pt-1">
          {bottomAttachments.filter((a) => a.type !== 'image').map(renderAttachmentItem)}
        </div>
      )}

      {/* Lightbox / Zoom Modal for Images */}
      {activeImageZoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setActiveImageZoom(null);
          }}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveImageZoom(null);
              }}
              className="absolute -top-10 left-0 p-2 rounded-full bg-white/20 text-white hover:bg-white/40 transition-colors"
              title="بستن تصویر"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={activeImageZoom}
              alt="بزرگ‌نمایی تصویر"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {activeVideoPlayer && (
        <VideoPlayerModal
          isOpen={Boolean(activeVideoPlayer)}
          onClose={() => setActiveVideoPlayer(null)}
          src={activeVideoPlayer.src}
          title={activeVideoPlayer.title}
        />
      )}
    </div>
  );
};
