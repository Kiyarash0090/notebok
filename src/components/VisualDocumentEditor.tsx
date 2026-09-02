import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Trash2,
  Volume2,
  FileText,
  Download,
  Maximize2,
  Plus,
  ImageIcon,
  Video,
  Mic,
  X,
  Sparkles,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { VideoPlayerModal } from './VideoPlayerModule';
import { MathRenderer } from './MathRenderer';

export interface VisualBlock {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document';
  text?: string;
  src?: string;
  alt?: string;
  name?: string;
  title?: string;
  width?: number;
}

export function parseContentToBlocks(content: string): VisualBlock[] {
  if (!content || !content.trim()) {
    return [{ id: 'block-' + Math.random().toString(36).slice(2, 9), type: 'text', text: '' }];
  }

  const lines = content.split('\n');
  const blocks: VisualBlock[] = [];
  let currentTextLines: string[] = [];

  const flushText = () => {
    if (currentTextLines.length > 0) {
      const text = currentTextLines.join('\n');
      blocks.push({
        id: 'block-' + Math.random().toString(36).slice(2, 9),
        type: 'text',
        text,
      });
      currentTextLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Match image: ![alt](data:image/... or url)
    const imgMatch = trimmed.match(/^!\[(.*?)\]\((data:image\/[^)]+|https?:\/\/[^)]+)\)$/);
    if (imgMatch) {
      flushText();
      const rawSrc = imgMatch[2];
      const widthMatch = rawSrc.match(/\|(\d+)px$/);
      const cleanSrc = rawSrc.replace(/\|\d+px$/, '');
      const width = widthMatch ? parseInt(widthMatch[1]) : undefined;
      blocks.push({
        id: 'block-' + Math.random().toString(36).slice(2, 9),
        type: 'image',
        src: cleanSrc,
        alt: imgMatch[1] || 'تصویر',
        width,
      });
      continue;
    }

    // Match video: 🎬[name](data:... or url)
    const vidMatch = trimmed.match(/^🎬\[(.*?)\]\((data:[^)]+|https?:\/\/[^)]+)\)$/);
    if (vidMatch) {
      flushText();
      blocks.push({
        id: 'block-' + Math.random().toString(36).slice(2, 9),
        type: 'video',
        src: vidMatch[2],
        name: vidMatch[1] || 'ویدیو',
      });
      continue;
    }

    // Match audio: 🎙️[title](data:... or url)
    const audMatch = trimmed.match(/^🎙️\[(.*?)\]\((data:[^)]+|https?:\/\/[^)]+)\)$/);
    if (audMatch) {
      flushText();
      blocks.push({
        id: 'block-' + Math.random().toString(36).slice(2, 9),
        type: 'audio',
        src: audMatch[2],
        title: audMatch[1] || 'ویس صوتی',
      });
      continue;
    }

    // Match document: 📄[name](data:... or url)
    const docMatch = trimmed.match(/^📄\[(.*?)\]\((data:[^)]+|https?:\/\/[^)]+)\)$/);
    if (docMatch) {
      flushText();
      blocks.push({
        id: 'block-' + Math.random().toString(36).slice(2, 9),
        type: 'document',
        src: docMatch[2],
        name: docMatch[1] || 'سند پیوست',
      });
      continue;
    }

    currentTextLines.push(line);
  }

  flushText();

  if (blocks.length === 0) {
    blocks.push({ id: 'block-' + Math.random().toString(36).slice(2, 9), type: 'text', text: '' });
  }

  return blocks;
}

export function blocksToContent(blocks: VisualBlock[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    if (block.type === 'text') {
      if (block.text !== undefined && block.text !== null) {
        parts.push(block.text);
      }
    } else if (block.type === 'image' && block.src) {
      const srcWithWidth = block.width ? `${block.src}|${block.width}px` : block.src;
      parts.push(`\n![${block.alt || 'تصویر'}](${srcWithWidth})\n`);
    } else if (block.type === 'video' && block.src) {
      parts.push(`\n🎬[${block.name || 'ویدیو'}](${block.src})\n`);
    } else if (block.type === 'audio' && block.src) {
      parts.push(`\n🎙️[${block.title || 'صدا'}](${block.src})\n`);
    } else if (block.type === 'document' && block.src) {
      parts.push(`\n📄[${block.name || 'فایل'}](${block.src})\n`);
    }
  }

  return parts.join('\n').replace(/\n{3,}/g, '\n\n');
}

export interface VisualDocumentEditorRef {
  insertFormatting: (prefix: string, suffix?: string) => void;
  insertSnippet: (snippet: string) => void;
  insertLatex: (formula: string) => void;
  insertMediaBlock: (file: File) => void;
  insertAudioBlock: (base64: string, title: string) => void;
}

interface VisualDocumentEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  placeholder?: string;
}

export const VisualDocumentEditor = React.forwardRef<VisualDocumentEditorRef, VisualDocumentEditorProps>(
  ({ content, onChange, placeholder }, ref) => {
    const [blocks, setBlocks] = useState<VisualBlock[]>(() => parseContentToBlocks(content));
    const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
    const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
    const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
    const [activeImageZoom, setActiveImageZoom] = useState<string | null>(null);
    const [activeVideoPlayer, setActiveVideoPlayer] = useState<{ src: string; title: string } | null>(null);

    const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
    const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
    const isInternalUpdate = useRef(false);

    // Synchronize when external content changes (e.g. initial load, draft restore)
    useEffect(() => {
      if (isInternalUpdate.current) {
        isInternalUpdate.current = false;
        return;
      }
      setBlocks(parseContentToBlocks(content));
    }, [content]);

    // Auto-adjust textarea heights whenever blocks change
    useEffect(() => {
      blocks.forEach((block) => {
        if (block.type === 'text') {
          const el = textareaRefs.current[block.id];
          if (el) {
            el.style.height = 'auto';
            el.style.height = `${Math.max(64, el.scrollHeight)}px`;
          }
        }
      });
    }, [blocks]);

    const updateBlocks = (newBlocks: VisualBlock[]) => {
      isInternalUpdate.current = true;
      setBlocks(newBlocks);
      const serialized = blocksToContent(newBlocks);
      onChange(serialized);
    };

    const handleTextChange = (id: string, text: string) => {
      const newBlocks = blocks.map((b) => (b.id === id ? { ...b, text } : b));
      updateBlocks(newBlocks);
    };

    const handleDeleteBlock = (id: string) => {
      if (playingAudioId === id) {
        audioRefs.current[id]?.pause();
        setPlayingAudioId(null);
      }
      let newBlocks = blocks.filter((b) => b.id !== id);
      // Ensure at least one text block remains
      if (newBlocks.length === 0) {
        newBlocks = [{ id: 'block-' + Math.random().toString(36).slice(2, 9), type: 'text', text: '' }];
      }
      updateBlocks(newBlocks);
    };

    const handleAddTextBlockBelow = (afterIndex: number) => {
      const newBlock: VisualBlock = {
        id: 'block-' + Math.random().toString(36).slice(2, 9),
        type: 'text',
        text: '',
      };
      const newBlocks = [...blocks.slice(0, afterIndex + 1), newBlock, ...blocks.slice(afterIndex + 1)];
      updateBlocks(newBlocks);
      setTimeout(() => {
        const el = textareaRefs.current[newBlock.id];
        el?.focus();
      }, 50);
    };

    // Toggle audio playback
    const toggleAudio = (id: string) => {
      const audioEl = audioRefs.current[id];
      if (!audioEl) return;

      if (playingAudioId === id) {
        audioEl.pause();
        setPlayingAudioId(null);
      } else {
        if (playingAudioId && audioRefs.current[playingAudioId]) {
          audioRefs.current[playingAudioId]?.pause();
        }
        audioEl.play().then(() => setPlayingAudioId(id)).catch(console.error);
      }
    };

    const processAndInsertMediaFile = (file: File, targetBlockId?: string) => {
      let type: 'image' | 'video' | 'audio' | 'document' = 'document';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';

      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const newMediaBlock: VisualBlock = {
          id: 'block-' + Math.random().toString(36).slice(2, 9),
          type,
          src: base64,
          alt: file.name && file.name !== 'image.png' ? file.name : 'تصویر پیست‌شده از کلیپ‌بورد',
          name: file.name || 'تصویر کلیپ‌بورد',
          title: file.name || 'تصویر کلیپ‌بورد',
        };

        const followUpTextBlock: VisualBlock = {
          id: 'block-' + Math.random().toString(36).slice(2, 9),
          type: 'text',
          text: '',
        };

        const targetId = targetBlockId || activeBlockId;
        const activeIndex = blocks.findIndex((b) => b.id === targetId);
        let newBlocks: VisualBlock[];

        if (activeIndex !== -1) {
          const current = blocks[activeIndex];
          const textarea = textareaRefs.current[current.id];
          if (current.type === 'text' && textarea) {
            const start = textarea.selectionStart ?? current.text?.length ?? 0;
            const textBefore = (current.text || '').substring(0, start).trimEnd();
            const textAfter = (current.text || '').substring(start).trimStart();

            const blockBefore: VisualBlock = { ...current, text: textBefore };
            const blockAfter: VisualBlock = { ...followUpTextBlock, text: textAfter };

            newBlocks = [
              ...blocks.slice(0, activeIndex),
              blockBefore,
              newMediaBlock,
              blockAfter,
              ...blocks.slice(activeIndex + 1),
            ];
          } else {
            newBlocks = [
              ...blocks.slice(0, activeIndex + 1),
              newMediaBlock,
              followUpTextBlock,
              ...blocks.slice(activeIndex + 1),
            ];
          }
        } else {
          newBlocks = [...blocks, newMediaBlock, followUpTextBlock];
        }

        updateBlocks(newBlocks);
        setTimeout(() => {
          const el = textareaRefs.current[followUpTextBlock.id];
          el?.focus();
        }, 60);
      };
      reader.readAsDataURL(file);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>, blockId: string) => {
      const items = e.clipboardData?.items;
      let imageFile: File | null = null;

      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            imageFile = items[i].getAsFile();
            break;
          }
        }
      }

      if (!imageFile && e.clipboardData?.files?.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          imageFile = file;
        }
      }

      if (imageFile) {
        e.preventDefault();
        processAndInsertMediaFile(imageFile, blockId);
      }
    };

    // Expose methods via ref
    React.useImperativeHandle(ref, () => ({
      insertFormatting: (prefix: string, suffix = '') => {
        const targetId = activeBlockId || blocks.find((b) => b.type === 'text')?.id;
        if (!targetId) return;

        const textarea = textareaRefs.current[targetId];
        const currentBlock = blocks.find((b) => b.id === targetId);
        const curText = currentBlock?.text || '';

        if (textarea) {
          const start = textarea.selectionStart ?? curText.length;
          const end = textarea.selectionEnd ?? curText.length;
          const selected = curText.substring(start, end);
          const replacement = selected ? `${prefix}${selected}${suffix}` : `${prefix}متن نمونه${suffix}`;
          const newText = curText.substring(0, start) + replacement + curText.substring(end);
          handleTextChange(targetId, newText);

          setTimeout(() => {
            textarea.focus();
            if (selected) {
              textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
            } else {
              textarea.setSelectionRange(start + prefix.length, start + prefix.length + 'متن نمونه'.length);
            }
          }, 50);
        } else {
          handleTextChange(targetId, curText ? curText + '\n' + prefix + 'متن نمونه' + suffix : prefix + 'متن نمونه' + suffix);
        }
      },

      insertSnippet: (snippet: string) => {
        const targetId = activeBlockId || blocks[blocks.length - 1]?.id;
        if (!targetId) return;

        const textarea = textareaRefs.current[targetId];
        const currentBlock = blocks.find((b) => b.id === targetId);
        const curText = currentBlock?.text || '';

        if (textarea) {
          const start = textarea.selectionStart ?? curText.length;
          const end = textarea.selectionEnd ?? curText.length;
          const newText = curText.substring(0, start) + snippet + curText.substring(end);
          handleTextChange(targetId, newText);
          setTimeout(() => {
            textarea.focus();
            const newPos = start + snippet.length;
            textarea.setSelectionRange(newPos, newPos);
          }, 50);
        } else {
          handleTextChange(targetId, curText ? curText + '\n' + snippet : snippet);
        }
      },

      insertLatex: (formula: string) => {
        const targetId = activeBlockId || blocks[blocks.length - 1]?.id;
        if (!targetId) return;

        const textarea = textareaRefs.current[targetId];
        const currentBlock = blocks.find((b) => b.id === targetId);
        const curText = currentBlock?.text || '';

        if (textarea) {
          const start = textarea.selectionStart ?? curText.length;
          const end = textarea.selectionEnd ?? curText.length;
          const newText = curText.substring(0, start) + formula + curText.substring(end);
          handleTextChange(targetId, newText);
          setTimeout(() => {
            textarea.focus();
            const newPos = start + formula.length;
            textarea.setSelectionRange(newPos, newPos);
          }, 50);
        } else {
          handleTextChange(targetId, curText ? curText + '\n' + formula : formula);
        }
      },

      insertMediaBlock: (file: File) => {
        processAndInsertMediaFile(file);
      },

      insertAudioBlock: (base64: string, title: string) => {
        const newAudioBlock: VisualBlock = {
          id: 'block-' + Math.random().toString(36).slice(2, 9),
          type: 'audio',
          src: base64,
          title,
        };

        const followUpTextBlock: VisualBlock = {
          id: 'block-' + Math.random().toString(36).slice(2, 9),
          type: 'text',
          text: '',
        };

        const activeIndex = blocks.findIndex((b) => b.id === activeBlockId);
        let newBlocks: VisualBlock[];

        if (activeIndex !== -1) {
          const current = blocks[activeIndex];
          const textarea = textareaRefs.current[current.id];
          if (current.type === 'text' && textarea) {
            const start = textarea.selectionStart ?? current.text?.length ?? 0;
            const textBefore = (current.text || '').substring(0, start).trimEnd();
            const textAfter = (current.text || '').substring(start).trimStart();

            const blockBefore: VisualBlock = { ...current, text: textBefore };
            const blockAfter: VisualBlock = { ...followUpTextBlock, text: textAfter };

            newBlocks = [
              ...blocks.slice(0, activeIndex),
              blockBefore,
              newAudioBlock,
              blockAfter,
              ...blocks.slice(activeIndex + 1),
            ];
          } else {
            newBlocks = [
              ...blocks.slice(0, activeIndex + 1),
              newAudioBlock,
              followUpTextBlock,
              ...blocks.slice(activeIndex + 1),
            ];
          }
        } else {
          newBlocks = [...blocks, newAudioBlock, followUpTextBlock];
        }

        updateBlocks(newBlocks);
        setTimeout(() => {
          const el = textareaRefs.current[followUpTextBlock.id];
          el?.focus();
        }, 60);
      },
    }));

    return (
      <div className="w-full space-y-3 bg-white/60 dark:bg-[#12140E]/60 rounded-2xl border border-[#E1E4D5] dark:border-[#43493E] p-4 sm:p-5 shadow-2xs">
        {blocks.map((block, index) => {
          if (block.type === 'text') {
            const hasMath = /\$\$[\s\S]*?\$\$|\$[^\$\n]+\$/.test(block.text || '');
            const isEditingThisBlock = editingBlockId === block.id;

            // If block has math formulas and is NOT actively being edited, render math in place!
            if (hasMath && !isEditingThisBlock) {
              return (
                <div
                  key={block.id}
                  onClick={() => {
                    setEditingBlockId(block.id);
                    setActiveBlockId(block.id);
                    setTimeout(() => {
                      textareaRefs.current[block.id]?.focus();
                    }, 50);
                  }}
                  className="w-full my-1.5 p-3 sm:p-4 bg-white/80 dark:bg-[#1C1C17]/80 hover:bg-white dark:hover:bg-[#1C1C17] border border-purple-500/20 hover:border-purple-500/50 rounded-2xl cursor-pointer transition-all shadow-2xs group/math-in-place relative"
                  title="برای ویرایش متن و کد فرمول کلیک کنید"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-purple-700 dark:text-purple-300 border-b border-purple-500/10 pb-1.5 mb-2">
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-xs bg-purple-500/10 px-1.5 py-0.5 rounded-md">𝑥</span>
                      <span>فرمول ریاضی رندر شده (جهت ویرایش کلیک کنید)</span>
                    </span>
                    <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-lg opacity-80 group-hover/math-in-place:opacity-100 transition-opacity">
                      ویرایش فرمول
                    </span>
                  </div>
                  <div className="py-1">
                    <MathRenderer text={block.text || ''} />
                  </div>
                </div>
              );
            }

            return (
              <div key={block.id} className="relative group/text space-y-1">
                {hasMath && isEditingThisBlock && (
                  <div className="flex items-center justify-between text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-3 py-1 rounded-xl border border-purple-500/20 mb-1">
                    <span>در حال ویرایش کد فرمول ریاضی...</span>
                    <button
                      type="button"
                      onClick={() => setEditingBlockId(null)}
                      className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      رندر زنده تصویری
                    </button>
                  </div>
                )}
                <textarea
                  id={`block-textarea-${block.id}`}
                  ref={(el) => {
                    textareaRefs.current[block.id] = el;
                  }}
                  value={block.text || ''}
                  onFocus={() => setActiveBlockId(block.id)}
                  onBlur={(e) => {
                    // Switch back to in-place math rendering when focus leaves
                    const currentTarget = e.currentTarget;
                    setTimeout(() => {
                      if (!currentTarget.contains(document.activeElement)) {
                        if (editingBlockId === block.id) {
                          setEditingBlockId(null);
                        }
                      }
                    }, 200);
                  }}
                  onPaste={(e) => handlePaste(e, block.id)}
                  onChange={(e) => {
                    handleTextChange(block.id, e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.max(64, e.target.scrollHeight)}px`;
                  }}
                  placeholder={index === 0 && blocks.length === 1 ? (placeholder || 'متن جزوه، فرمول‌ها و توضیحات را در اینجا بنویسید...') : 'ادامه متن یا یادداشت جدید...'}
                  rows={Math.max(2, (block.text?.split('\n').length || 1))}
                  className="w-full p-2.5 bg-transparent text-[#1A1C16] dark:text-[#E2E3DC] placeholder-[#5E6258] dark:placeholder-[#8F9285] text-sm sm:text-base leading-relaxed resize-none focus:outline-none transition-all rounded-xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] focus:bg-white dark:focus:bg-[#1C1C17] focus:ring-1 focus:ring-[#4A6D22] dark:focus:ring-[#D0E8B2]"
                  dir="auto"
                />
              </div>
            );
          }

          // Image Block
          if (block.type === 'image' && block.src) {
            return (
              <div
                key={block.id}
                className="relative group/media my-3 p-2.5 rounded-2xl bg-[#F0F2E8] dark:bg-[#1C1C17] border border-[#E1E4D5] dark:border-[#43493E] shadow-xs"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E1E4D5] dark:border-[#43493E] text-xs">
                  <div className="flex items-center gap-2 text-[#4A6D22] dark:text-[#D0E8B2] font-semibold">
                    <ImageIcon className="w-4 h-4" />
                    <span className="truncate max-w-[200px] sm:max-w-xs">{block.alt || 'تصویر پیوست‌شده'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveImageZoom(block.src || null)}
                      className="p-1.5 rounded-lg bg-white dark:bg-[#2A2B24] hover:bg-black/5 text-[#5E6258] dark:text-[#8F9285] transition-colors"
                      title="بزرگ‌نمایی تصویر"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBlock(block.id)}
                      className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 dark:text-red-400 transition-colors"
                      title="حذف تصویر"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-center bg-black/5 dark:bg-black/20 rounded-xl p-1 overflow-hidden">
                  <img
                    src={block.src}
                    alt={block.alt || 'تصویر'}
                    className="max-h-80 w-auto rounded-lg object-contain shadow-xs"
                    loading="lazy"
                  />
                </div>
              </div>
            );
          }

          // Video Block
          if (block.type === 'video' && block.src) {
            return (
              <div
                key={block.id}
                className="relative group/media my-3 p-2.5 rounded-2xl bg-[#F0F2E8] dark:bg-[#1C1C17] border border-[#E1E4D5] dark:border-[#43493E] shadow-xs"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E1E4D5] dark:border-[#43493E] text-xs">
                  <div className="flex items-center gap-2 text-[#8B6814] dark:text-[#FFE086] font-semibold">
                    <Video className="w-4 h-4" />
                    <span className="truncate max-w-[200px] sm:max-w-xs">{block.name || 'ویدیو پیوست‌'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActiveVideoPlayer({ src: block.src!, title: block.name || 'ویدیو' })}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#4A6D22] text-white hover:bg-[#3B571B] text-[11px] font-bold transition-colors"
                      title="باز کردن در پلیر پیشرفته"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>پلیر حرفه‌ای</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBlock(block.id)}
                      className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 text-red-600 dark:text-red-400 transition-colors"
                      title="حذف ویدیو"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="relative rounded-xl overflow-hidden bg-black group/vid">
                  <video
                    src={block.src}
                    controls
                    className="w-full max-h-72 rounded-xl bg-black"
                    preload="metadata"
                  />
                </div>
              </div>
            );
          }

          // Audio / Voice Block
          if (block.type === 'audio' && block.src) {
            const isPlaying = playingAudioId === block.id;
            return (
              <div
                key={block.id}
                className="relative my-3 p-3 rounded-2xl bg-[#E8ECE0] dark:bg-[#23261F] border border-[#E1E4D5] dark:border-[#43493E] shadow-xs flex items-center justify-between gap-3"
              >
                <audio
                  ref={(el) => {
                    audioRefs.current[block.id] = el;
                  }}
                  src={block.src}
                  onEnded={() => setPlayingAudioId(null)}
                  preload="none"
                />
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleAudio(block.id)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 shadow-sm ${
                      isPlaying
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-[#4A6D22] text-white hover:scale-105 active:scale-95'
                    }`}
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 mr-0.5" />}
                  </button>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-[#1A1C16] dark:text-[#E2E3DC] truncate max-w-[200px] sm:max-w-xs">
                        {block.title || 'ویس صوتی'}
                      </span>
                      {isPlaying && (
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-bold rounded-full animate-pulse">
                          در حال پخش
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[#5E6258] dark:text-[#8F9285] flex items-center gap-1 mt-0.5">
                      <Mic className="w-3 h-3 text-[#A64D3B] dark:text-[#FFAB91]" />
                      یادداشت صوتی پیوست‌شده در متن
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteBlock(block.id)}
                    className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 transition-colors"
                    title="حذف ویس"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          }

          // Document Block
          if (block.type === 'document' && block.src) {
            return (
              <div
                key={block.id}
                className="relative my-3 p-3 rounded-2xl bg-white dark:bg-[#1C1C17] border border-[#E1E4D5] dark:border-[#43493E] shadow-xs flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF2DE] dark:bg-[#332A18] text-[#8B6814] dark:text-[#FFE086] flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-[#1A1C16] dark:text-[#E2E3DC] truncate max-w-[200px] sm:max-w-xs">
                      {block.name || 'سند پیوست'}
                    </span>
                    <span className="text-[10px] text-[#5E6258] dark:text-[#8F9285]">
                      فایل پیوست شده در متن
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={block.src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FAF2DE] dark:bg-[#332A18] text-[#8B6814] dark:text-[#FFE086] hover:bg-[#F5E6C4] dark:hover:bg-[#42361E] text-xs font-bold transition-colors"
                    title="باز کردن فایل"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>باز کردن</span>
                  </a>
                  <a
                    href={block.src}
                    download={block.name || 'document'}
                    className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[#4A6D22] dark:text-[#D0E8B2] transition-colors"
                    title="دانلود فایل"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteBlock(block.id)}
                    className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 transition-colors"
                    title="حذف فایل"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          }

          return null;
        })}

        {/* Quick Add Section at bottom */}
        <div className="flex items-center justify-between pt-2 border-t border-[#E1E4D5]/60 dark:border-[#43493E]/60 text-[11px] text-[#5E6258] dark:text-[#8F9285]">
          <span>✨ هر رسانه، عکس یا ویس به صورت زنده در جای خود نمایش داده می‌شود</span>
          <button
            type="button"
            onClick={() => handleAddTextBlockBelow(blocks.length - 1)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[#4A6D22] dark:text-[#D0E8B2] font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>بخش متنی جدید</span>
          </button>
        </div>

        {/* Full Image Zoom Lightbox */}
        {activeImageZoom && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
            onClick={() => setActiveImageZoom(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] p-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setActiveImageZoom(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/70 text-white hover:bg-black transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={activeImageZoom}
                alt="تصویر تمام‌صفحه"
                className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
              />
            </div>
          </div>
        )}

        {/* Video Player Module Modal */}
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
  }
);

VisualDocumentEditor.displayName = 'VisualDocumentEditor';
