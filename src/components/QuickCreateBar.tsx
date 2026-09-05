import React, { useState, useRef } from 'react';
import {
  CheckSquare,
  Palette,
  Folder,
  Star,
  Plus,
  X,
  AlertCircle,
  Sparkles,
  Tag,
  ArrowDownRight,
  Paperclip,
  Image as ImageIcon,
  Video,
  Mic,
  FileText,
} from 'lucide-react';
import { Category, ChecklistItem, ImportanceLevel, NoteColorOption, NoteAttachment } from '../types';
import { NOTE_COLORS } from '../constants';
import { AttachmentManager } from './AttachmentManager';
import { VoiceRecorderModule } from './VoiceRecorderModule';
import { LatexFormulaModal } from './LatexFormulaModal';
import { BatchUploadProgress, uploadMediaFiles } from '../lib/media';
import { UploadProgressBar } from './UploadProgressBar';
import { getFlattenedCategoryTree } from '../lib/categoryUtils';

interface QuickCreateBarProps {
  categories: Category[];
  onCreateNote: (note: {
    title: string;
    content: string;
    categoryId?: string;
    isPinned?: boolean;
    isImportant?: boolean;
    importanceLevel: ImportanceLevel;
    color: string;
    checklists?: ChecklistItem[];
    attachments?: NoteAttachment[];
    tags?: string[];
    summary?: string;
  }) => Promise<void>;
  defaultCategoryId?: string;
  onOpenCreateModal?: () => void;
}

export const QuickCreateBar: React.FC<QuickCreateBarProps> = ({
  categories,
  onCreateNote,
  defaultCategoryId,
  onOpenCreateModal,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [categoryId, setCategoryId] = useState(defaultCategoryId || '');
  const [isImportant, setIsImportant] = useState(false);
  const [importanceLevel, setImportanceLevel] = useState<ImportanceLevel>('normal');
  const [color, setColor] = useState('default');
  const [isChecklistMode, setIsChecklistMode] = useState(false);
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);
  const [showAttachmentsSection, setShowAttachmentsSection] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);
  const [isLatexModalOpen, setIsLatexModalOpen] = useState(false);

  // Upload progress tracking
  const [uploadProgress, setUploadProgress] = useState<BatchUploadProgress | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);

  const handleCancelUpload = () => {
    if (uploadAbortRef.current) {
      uploadAbortRef.current.abort();
      uploadAbortRef.current = null;
    }
    setUploadProgress(null);
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const quickDraftKey = 'draft_quick_create';

  // Restore quick draft on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(quickDraftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.title || parsed.content || parsed.summary)) {
          setTitle(parsed.title || '');
          setContent(parsed.content || '');
          setSummary(parsed.summary || '');
          if (parsed.categoryId) setCategoryId(parsed.categoryId);
          if (parsed.importanceLevel) setImportanceLevel(parsed.importanceLevel);
          if (parsed.color) setColor(parsed.color);
          if (parsed.checklists) setChecklists(parsed.checklists);
          if (parsed.attachments) setAttachments(parsed.attachments);
          if (parsed.tags) setTags(parsed.tags);
          setIsExpanded(true);
        }
      }
    } catch (e) {
      console.error('Failed to load quick draft', e);
    }
  }, []);

  // Save quick draft automatically
  React.useEffect(() => {
    if (!title && !content && !summary && checklists.length === 0 && attachments.length === 0) {
      localStorage.removeItem(quickDraftKey);
      return;
    }
    const timer = setTimeout(() => {
      try {
        const draftData: Record<string, unknown> = {
          title,
          content,
          summary,
          categoryId,
          importanceLevel,
          color,
          checklists,
          tags,
        };
        const safeAttachments = attachments.filter((a) => a.size < 500 * 1024);
        if (safeAttachments.length > 0) {
          draftData.attachments = safeAttachments;
        }
        localStorage.setItem(quickDraftKey, JSON.stringify(draftData));
      } catch (e) {
        console.error('Failed to save quick draft', e);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [title, content, summary, categoryId, importanceLevel, color, checklists, attachments, tags]);

  const activeColorObj = NOTE_COLORS.find((c) => c.id === color) || NOTE_COLORS[0];

  const resetForm = () => {
    setTitle('');
    setContent('');
    setSummary('');
    setCategoryId(defaultCategoryId || '');
    setIsImportant(false);
    setImportanceLevel('normal');
    setColor('default');
    setIsChecklistMode(false);
    setChecklists([]);
    setNewChecklistText('');
    setAttachments([]);
    setShowAttachmentsSection(false);
    setTags([]);
    setShowColorPicker(false);
    setIsExpanded(false);
    localStorage.removeItem(quickDraftKey);
  };

  const handleSubmit = async () => {
    if (!title.trim() && !content.trim() && checklists.length === 0 && attachments.length === 0) {
      setIsExpanded(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreateNote({
        title: title.trim(),
        content: content.trim(),
        categoryId: categoryId || undefined,
        isImportant,
        importanceLevel,
        color,
        checklists: checklists.filter((c) => c.text.trim().length > 0),
        attachments,
        tags,
        summary: summary.trim() || undefined,
      });
      resetForm();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setChecklists([
      ...checklists,
      {
        id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        text: newChecklistText.trim(),
        done: false,
      },
    ]);
    setNewChecklistText('');
  };

  const handleToggleChecklistDone = (id: string) => {
    setChecklists(checklists.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));
  };

  const handleRemoveChecklist = (id: string) => {
    setChecklists(checklists.filter((c) => c.id !== id));
  };

  const handleInsertSnippet = (snippet: string) => {
    setContent((prev) => (prev ? prev + '\n' + snippet : snippet));
  };

  const handleInsertMediaInline = async (file: File) => {
    if (file.size > 25 * 1024 * 1024) {
      alert('حجم فایل نباید بیشتر از ۲۵ مگابایت باشد');
      return;
    }

    const controller = new AbortController();
    uploadAbortRef.current = controller;

    try {
      const uploaded = (await uploadMediaFiles([file], (p) => setUploadProgress(p), controller.signal))[0];
      let markdown = '';
      switch (uploaded.type) {
        case 'image':
          markdown = `\n![${uploaded.name}](${uploaded.url})\n`;
          break;
        case 'video':
          markdown = `\n🎬[${uploaded.name}](${uploaded.url})\n`;
          break;
        case 'audio':
          markdown = `\n🎙️[${uploaded.name}](${uploaded.url})\n`;
          break;
        case 'document':
        default:
          markdown = `\n📄[${uploaded.name}](${uploaded.url})\n`;
          break;
      }
      setContent((prev) => (prev ? prev + '\n' + markdown : markdown));
      setAttachments((prev) => [...prev, uploaded]);
      setTimeout(() => setUploadProgress(null), 1800);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setUploadProgress({
        currentFileIndex: 1,
        totalFiles: 1,
        currentFileName: file.name,
        currentFilePercent: 0,
        currentFileLoaded: 0,
        currentFileSize: file.size,
        overallPercent: 0,
        stage: 'error',
      });
      setTimeout(() => setUploadProgress(null), 3000);
    } finally {
      uploadAbortRef.current = null;
    }
  };

  const handleInsertRecordedAudio = (base64: string, voiceTitle: string) => {
    const markdown = `\n🎙️[${voiceTitle}](${base64})\n`;
    setContent((prev) => (prev ? prev + '\n' + markdown : markdown));
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    if (!tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
    }
    setTagInput('');
  };

  const handleInsertLatex = (formula: string) => {
    setContent((prev) => (prev ? prev + '\n' + formula : formula));
  };

  if (!isExpanded) {
    return (
      <>
        {/* Floating Action Button (FAB) at bottom left - Desktop only (Mobile/Tablet uses bottom nav FAB) */}
        <div className="hidden lg:flex fixed bottom-8 left-8 z-40">
          <button
            type="button"
            id="btn-floating-create-note"
            onClick={() => {
              if (onOpenCreateModal) {
                onOpenCreateModal();
              } else {
                setIsExpanded(true);
              }
            }}
            className="group flex items-center gap-2.5 px-4.5 py-3 rounded-2xl bg-[#4A6D22] dark:bg-[#D0E8B2] hover:bg-[#3B571B] dark:hover:bg-[#c2de9f] text-white dark:text-[#1A3700] shadow-xl hover:shadow-2xl transition-all duration-200 active:scale-95 cursor-pointer"
            title="نوشتن جزوه یا نکته جدید"
          >
            <div className="w-7 h-7 rounded-xl bg-white/20 dark:bg-black/10 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="font-bold text-xs sm:text-sm">نوشتن جزوه جدید</span>
          </button>
        </div>

        <VoiceRecorderModule
          isOpen={isVoiceRecorderOpen}
          onClose={() => setIsVoiceRecorderOpen(false)}
          onInsertAudio={handleInsertRecordedAudio}
        />
      </>
    );
  }

  return (
    <>
      {/* Modal Overlay for Quick Create Note */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setIsExpanded(false);
          }
        }}
      >
        <div
          ref={containerRef}
          className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[28px] border shadow-2xl p-4 sm:p-6 space-y-4 ${
            activeColorObj.bgLight
          } ${activeColorObj.bgDark} ${activeColorObj.borderLight} ${activeColorObj.borderDark}`}
        >
          {/* Header with Title & Close button */}
          <div className="flex items-center justify-between pb-2 border-b border-[#E1E4D5] dark:border-[#43493E]">
            <span className="text-xs font-bold text-[#4A6D22] dark:text-[#D0E8B2] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              نوشتن جزوه و نکته جدید
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5E6258] dark:text-[#8F9285]"
              title="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Title & Star Action */}
          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان جزوه یا موضوع..."
              className="w-full bg-transparent font-bold text-sm sm:text-base text-[#1A1C16] dark:text-[#E2E3DC] placeholder-[#5E6258] dark:placeholder-[#8F9285] focus:outline-none"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                const next = !isImportant;
                setIsImportant(next);
                if (next && importanceLevel === 'normal') setImportanceLevel('high');
                if (!next) setImportanceLevel('normal');
              }}
              className={`p-2 rounded-2xl transition-colors ${
                isImportant
                  ? 'text-[#FFE086] bg-[#3B2F00] dark:bg-[#332A18]'
                  : 'text-[#5E6258] hover:bg-black/5 dark:hover:bg-white/10'
              }`}
              title={isImportant ? 'نکته طلایی و مهم' : 'علامت‌گذاری به عنوان نکته مهم'}
            >
              <Star className={`w-5 h-5 ${isImportant ? 'fill-current' : ''}`} />
            </button>
          </div>

            {/* Content Textarea */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={(e) => {
                const items = e.clipboardData?.items;
                if (items) {
                  for (let i = 0; i < items.length; i++) {
                    if (items[i].type.startsWith('image/')) {
                      const file = items[i].getAsFile();
                      if (file) {
                        e.preventDefault();
                        handleInsertMediaInline(file);
                        return;
                      }
                    }
                  }
                }
              }}
              placeholder="متن جزوه، فرمول‌ها، توضیحات و نکات اصلی..."
              rows={3}
              className="w-full bg-transparent text-xs sm:text-sm text-[#1A1C16] dark:text-[#E2E3DC] placeholder-[#5E6258] dark:placeholder-[#8F9285] focus:outline-none resize-none leading-relaxed"
            />

            {/* Attachments & Voice Recorder Component */}
            <div className="pt-2 border-t border-[#E1E4D5] dark:border-[#43493E]">
              {/* Inline Media Upload & Voice Recording Section */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-[#5E6258] dark:text-[#8F9285] flex items-center gap-1">
                    <Paperclip className="w-3.5 h-3.5 text-[#4A6D22] dark:text-[#D0E8B2]" />
                    درج رسانه و صوت در متن
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-[#12140E] rounded-xl border border-[#E1E4D5] dark:border-[#43493E] cursor-pointer hover:bg-[#D0E8B2]/20 transition-colors text-xs font-bold text-[#43493E] dark:text-[#E2E3DC]">
                    <Paperclip className="w-3.5 h-3.5 text-[#4A6D22]" />
                    <span>انتخاب رسانه</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleInsertMediaInline(f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsVoiceRecorderOpen(true)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-[#12140E] rounded-xl border border-[#E1E4D5] dark:border-[#43493E] hover:border-red-300 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-xs font-bold text-[#43493E] dark:text-[#E2E3DC] cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5 text-red-500" />
                    <span>ضبط صدا</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Checklist Section if enabled */}
            {isChecklistMode && (
              <div className="space-y-2 pt-2 border-t border-[#E1E4D5] dark:border-[#43493E]">
                <div className="text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285] flex items-center gap-1">
                  <CheckSquare className="w-3.5 h-3.5 text-[#4A6D22] dark:text-[#D0E8B2]" />
                  <span>آیتم‌های چک‌لیست:</span>
                </div>
                {checklists.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => handleToggleChecklistDone(item.id)}
                      className="w-4 h-4 rounded-md accent-[#4A6D22] cursor-pointer"
                    />
                    <span
                      className={`flex-1 ${
                        item.done ? 'line-through text-[#8F9285]' : 'text-[#1A1C16] dark:text-[#E2E3DC]'
                      }`}
                    >
                      {item.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklist(item.id)}
                      className="text-[#8F9285] hover:text-[#A64D3B]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistItem();
                      }
                    }}
                    placeholder="+ افزودن آیتم جدید و اینتر..."
                    className="flex-1 bg-black/5 dark:bg-white/5 rounded-xl px-3 py-1.5 text-xs text-[#1A1C16] dark:text-[#E2E3DC] placeholder-[#5E6258] dark:placeholder-[#8F9285] focus:outline-none border border-transparent focus:border-[#D0E8B2]"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="px-3 py-1.5 bg-[#D0E8B2] text-[#1A3700] rounded-xl text-xs font-bold shadow-xs hover:bg-[#c2de9f]"
                  >
                    افزودن
                  </button>
                </div>
              </div>
            )}

            {/* Quick Summary / Key Point Callout */}
            {isImportant && (
              <div className="bg-[#FAF2DE] dark:bg-[#332A18] border border-[#EFE1B8] dark:border-[#574728] rounded-2xl p-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#8B6814] dark:text-[#FFE086]">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    خلاصه طلایی / نکته امتحانی:
                  </span>
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="text-[#5E6258] dark:text-[#8F9285]">اهمیت:</span>
                    <select
                      value={importanceLevel}
                      onChange={(e) => setImportanceLevel(e.target.value as ImportanceLevel)}
                      className="bg-transparent border-none text-[#8B6814] dark:text-[#FFE086] font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="normal" className="bg-[#FAF2DE] dark:bg-[#1C1C17] text-black dark:text-white">عادی</option>
                      <option value="high" className="bg-[#FAF2DE] dark:bg-[#1C1C17] text-black dark:text-white">مهم ⭐</option>
                      <option value="critical" className="bg-[#FAF2DE] dark:bg-[#1C1C17] text-black dark:text-white">بسیار حیاتی 🔥</option>
                    </select>
                  </div>
                </div>
                <input
                  type="text"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="یک خط چکیده بسیار مهم که باید سریع مرور شود..."
                  className="w-full bg-transparent text-xs text-[#523C0A] dark:text-[#FFF1C2] placeholder-[#8B6814]/60 dark:placeholder-[#FFE086]/60 focus:outline-none font-medium"
                />
              </div>
            )}

            {/* Category and Tags row */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Category Picker */}
              <div className="flex items-center gap-1.5 text-xs">
                <Folder className="w-3.5 h-3.5 text-[#5E6258] dark:text-[#8F9285]" />
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="bg-black/5 dark:bg-white/10 rounded-full px-3 py-1 text-xs text-[#1A1C16] dark:text-[#E2E3DC] focus:outline-none cursor-pointer border border-transparent"
                >
                  <option value="" className="bg-white dark:bg-[#1C1C17] text-black dark:text-white">
                    بدون دسته‌بندی
                  </option>
                  {getFlattenedCategoryTree(categories).map((opt) => (
                    <option
                      key={opt.category.id}
                      value={opt.category.id}
                      className="bg-white dark:bg-[#1C1C17] text-black dark:text-white"
                    >
                      {'— '.repeat(opt.depth)} {opt.category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags displayed */}
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 text-[10px] font-medium bg-[#D0E8B2]/30 dark:bg-[#1A3700] px-2.5 py-0.5 rounded-full text-[#1A3700] dark:text-[#D0E8B2]"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => setTags(tags.filter((tag) => tag !== t))}
                    className="hover:text-red-500"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Color Palette Popover */}
            {showColorPicker && (
              <div className="flex flex-wrap gap-2 p-2.5 bg-white dark:bg-[#1C1C17] rounded-2xl shadow-xl border border-[#E1E4D5] dark:border-[#43493E]">
                {NOTE_COLORS.map((col) => (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => {
                      setColor(col.id);
                      setShowColorPicker(false);
                    }}
                    className={`w-6 h-6 rounded-full border border-[#E1E4D5] dark:border-[#43493E] transition-transform hover:scale-110 ${
                      col.bgLight
                    } ${col.bgDark} ${color === col.id ? 'ring-2 ring-[#4A6D22] dark:ring-[#D0E8B2] scale-110' : ''}`}
                    title={col.name}
                  />
                ))}
              </div>
            )}

            {/* Bottom Actions Bar */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E1E4D5] dark:border-[#43493E]">
              <div className="flex items-center gap-1">
                {/* Palette button */}
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 text-[#43493E] dark:text-[#E2E3DC] transition-colors"
                  title="تغییر رنگ پس‌زمینه"
                >
                  <Palette className="w-4 h-4" />
                </button>

                {/* Checklist toggle button */}
                <button
                  type="button"
                  onClick={() => setIsChecklistMode(!isChecklistMode)}
                  className={`p-2 rounded-2xl text-[#43493E] dark:text-[#E2E3DC] transition-colors ${
                    isChecklistMode ? 'bg-[#D0E8B2] text-[#1A3700]' : 'hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                  title="افزودن چک‌لیست"
                >
                  <CheckSquare className="w-4 h-4" />
                </button>

                {/* LaTeX Button */}
                <button
                  type="button"
                  onClick={() => setIsLatexModalOpen(true)}
                  className="px-2 py-1 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 transition-all font-bold text-xs flex items-center gap-1 border border-purple-500/20"
                  title="درج فرمول ریاضی با پاپ‌آپ LaTeX"
                >
                  <span>𝑥</span>
                  <span>LaTeX</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || (!title.trim() && !content.trim() && checklists.length === 0)}
                  onClick={handleSubmit}
                  className="px-5 py-2 rounded-full text-xs font-bold bg-[#D0E8B2] hover:bg-[#c2de9f] text-[#1A3700] shadow-xs disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {isSubmitting ? 'در حال ذخیره...' : 'ذخیره در سرور'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dedicated Voice Recorder Modal Module */}
        <VoiceRecorderModule
          isOpen={isVoiceRecorderOpen}
          onClose={() => setIsVoiceRecorderOpen(false)}
          onInsertAudio={handleInsertRecordedAudio}
        />

        {/* Dedicated LaTeX Formula Popup Modal */}
        <LatexFormulaModal
          isOpen={isLatexModalOpen}
          onClose={() => setIsLatexModalOpen(false)}
          onConfirm={handleInsertLatex}
        />

        {/* Floating Upload Progress Bar */}
        <UploadProgressBar
          progress={uploadProgress}
          onCancel={handleCancelUpload}
          onDismiss={() => setUploadProgress(null)}
        />
      </>
    );
};
