import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Pin,
  Star,
  Trash2,
  Palette,
  Folder,
  Tag,
  Sparkles,
  CheckSquare,
  Download,
  List,
  ListOrdered,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading,
  Quote,
  FileText,
  Eye,
  Edit3,
  Eraser,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Printer,
  AlignRight,
  AlignCenter,
  AlignLeft,
  AlignJustify,
  Table,
  Plus,
  Layout,
  Layers,
  Sparkle,
  Save,
} from 'lucide-react';
import { Note, Category, ChecklistItem, ImportanceLevel, NoteAttachment } from '../types';
import { NOTE_COLORS } from '../constants';
import { VoiceRecorderModule } from './VoiceRecorderModule';
import { VisualDocumentEditor, VisualDocumentEditorRef } from './VisualDocumentEditor';
import { LatexFormulaModal } from './LatexFormulaModal';

interface NoteEditorModalProps {
  note: Note | null;
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSave: (id: string, updates: Partial<Note>) => Promise<void>;
  onDelete: (id: string) => void;
  onOpenCategoryManager: () => void;
}

export const NoteEditorModal: React.FC<NoteEditorModalProps> = ({
  note,
  isOpen,
  onClose,
  categories,
  onSave,
  onDelete,
  onOpenCategoryManager,
}) => {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [summary, setSummary] = useState(note?.summary || '');
  const [categoryId, setCategoryId] = useState(note?.categoryId || '');
  const [isPinned, setIsPinned] = useState(note?.isPinned || false);
  const [isImportant, setIsImportant] = useState(note?.isImportant || false);
  const [importanceLevel, setImportanceLevel] = useState<ImportanceLevel>(note?.importanceLevel || 'normal');
  const [color, setColor] = useState(note?.color || 'default');
  const [checklists, setChecklists] = useState<ChecklistItem[]>(note?.checklists || []);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [attachments, setAttachments] = useState<NoteAttachment[]>(note?.attachments || []);
  const [tags, setTags] = useState<string[]>(note?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isLatexModalOpen, setIsLatexModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasDraftRestored, setHasDraftRestored] = useState(false);
  const [isVoiceRecorderOpen, setIsVoiceRecorderOpen] = useState(false);

  // Document Processor Ribbon & View State
  const [activeRibbonTab, setActiveRibbonTab] = useState<'home' | 'insert' | 'layout' | 'tools'>('home');
  const [fontFamily, setFontFamily] = useState<string>('font-sans');
  const [fontSize, setFontSize] = useState<string>('text-base');
  const [paperMargin, setPaperMargin] = useState<'normal' | 'narrow' | 'wide'>('normal');
  const [paperTheme, setPaperTheme] = useState<'white' | 'ivory' | 'gray' | 'dark'>('white');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const visualEditorRef = useRef<VisualDocumentEditorRef>(null);

  // Auto-Draft storage key
  const draftKey = note ? `draft_note_${note.id}` : null;

  // Auto clean legacy base64 or raw links if user wants
  const handleCleanRawCodes = () => {
    let cleaned = content.replace(/!\[.*?\]\((data:image\/[^;]+;base64,[^\)]+|https?:\/\/[^\)]+)\)/gi, '');
    cleaned = cleaned.replace(/\[.*?\]\((data:[^;]+;base64,[^\)]+)\)/gi, '');
    cleaned = cleaned.replace(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]{50,}/gi, '');
    setContent(cleaned.trim());
  };

  // Sync state if note changes, check for auto-draft
  useEffect(() => {
    if (note && isOpen) {
      const savedDraft = draftKey ? localStorage.getItem(draftKey) : null;
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          if (parsed && (parsed.title || parsed.content)) {
            setTitle(parsed.title ?? note.title ?? '');
            setContent(parsed.content ?? note.content ?? '');
            setSummary(parsed.summary ?? note.summary ?? '');
            setCategoryId(parsed.categoryId ?? note.categoryId ?? '');
            setIsPinned(parsed.isPinned ?? note.isPinned ?? false);
            setIsImportant(parsed.isImportant ?? note.isImportant ?? false);
            setImportanceLevel(parsed.importanceLevel ?? note.importanceLevel ?? 'normal');
            setColor(parsed.color ?? note.color ?? 'default');
            setChecklists(parsed.checklists ?? note.checklists ?? []);
            setAttachments(parsed.attachments ?? note.attachments ?? []);
            setTags(parsed.tags ?? note.tags ?? []);
            setHasDraftRestored(true);
            return;
          }
        } catch (e) {
          console.error('Failed to parse draft', e);
        }
      }

      setTitle(note.title || '');
      setContent(note.content || '');
      setSummary(note.summary || '');
      setCategoryId(note.categoryId || '');
      setIsPinned(note.isPinned || false);
      setIsImportant(note.isImportant || false);
      setImportanceLevel(note.importanceLevel || 'normal');
      setColor(note.color || 'default');
      setChecklists(note.checklists || []);
      setAttachments(note.attachments || []);
      setTags(note.tags || []);
      setHasDraftRestored(false);
    }
  }, [note, isOpen, draftKey]);

  // Auto-Draft persistence on changes
  useEffect(() => {
    if (!isOpen || !note || !draftKey) return;
    const timer = setTimeout(() => {
      const draftData: Record<string, unknown> = {
        title,
        content,
        summary,
        categoryId,
        isPinned,
        isImportant,
        importanceLevel,
        color,
        checklists,
        tags,
        updatedAt: new Date().toISOString(),
      };
      const safeAttachments = attachments.filter((a) => a.size < 500 * 1024);
      if (safeAttachments.length > 0) {
        draftData.attachments = safeAttachments;
      }
      try {
        localStorage.setItem(draftKey, JSON.stringify(draftData));
      } catch (e) {
        console.error('Draft save failed', e);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [isOpen, note, draftKey, title, content, summary, categoryId, isPinned, isImportant, importanceLevel, color, checklists, attachments, tags]);

  if (!isOpen || !note) return null;

  const activeColorObj = NOTE_COLORS.find((c) => c.id === color) || NOTE_COLORS[0];

  const handleSaveAndClose = async () => {
    setIsSaving(true);
    try {
      await onSave(note.id, {
        title,
        content,
        summary: summary.trim() || undefined,
        categoryId: categoryId || undefined,
        isPinned,
        isImportant,
        importanceLevel,
        color,
        checklists,
        attachments,
        tags,
      });
      if (draftKey) {
        localStorage.removeItem(draftKey);
      }
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInsertFormatting = (prefix: string, suffix = '') => {
    if (visualEditorRef.current) {
      visualEditorRef.current.insertFormatting(prefix, suffix);
      return;
    }
    const formatted = `${prefix}متن نمونه${suffix}`;
    setContent((prev) => (prev ? prev + '\n' + formatted : formatted));
  };

  const handleInsertLatex = (formula: string) => {
    if (visualEditorRef.current) {
      visualEditorRef.current.insertLatex(formula);
      return;
    }
    setContent((prev) => (prev ? prev + '\n' + formula : formula));
  };

  const handleInsertTable = (rows = 3, cols = 3) => {
    let tableMarkdown = '\n\n| ' + Array(cols).fill('عنوان').map((t, i) => `${t} ${i + 1}`).join(' | ') + ' |\n';
    tableMarkdown += '| ' + Array(cols).fill('---').join(' | ') + ' |\n';
    for (let r = 0; r < rows; r++) {
      tableMarkdown += '| ' + Array(cols).fill('داده').map((d, i) => `${d} ${r + 1}-${i + 1}`).join(' | ') + ' |\n';
    }
    tableMarkdown += '\n';

    if (visualEditorRef.current) {
      visualEditorRef.current.insertSnippet(tableMarkdown);
    } else {
      setContent((prev) => prev + tableMarkdown);
    }
  };

  const handleInsertMediaInline = (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      alert('حجم فایل نباید بیشتر از ۱۵ مگابایت باشد');
      return;
    }

    if (visualEditorRef.current) {
      visualEditorRef.current.insertMediaBlock(file);
    }
  };

  const handleInsertRecordedAudio = (base64: string, voiceTitle: string) => {
    if (visualEditorRef.current) {
      visualEditorRef.current.insertAudioBlock(base64, voiceTitle);
      return;
    }
    const markdown = `\n\n🎙️[${voiceTitle}](${base64})\n\n`;
    setContent((prev) => (prev ? prev + markdown : markdown));
  };

  const handleAddChecklist = () => {
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

  const handleToggleChecklist = (id: string) => {
    setChecklists(checklists.map((c) => (c.id === id ? { ...c, done: !c.done } : c)));
  };

  const handleRemoveChecklist = (id: string) => {
    setChecklists(checklists.filter((c) => c.id !== id));
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    if (!tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
    }
    setTagInput('');
  };

  const handleDownload = () => {
    let fullText = `# ${title || 'سند جدید'}\n\n`;
    if (summary) fullText += `> 💡 **نکته کلیدی:** ${summary}\n\n`;
    fullText += `${content}\n\n`;
    if (checklists.length > 0) {
      fullText += `### چک‌لیست:\n` + checklists.map((c) => `- [${c.done ? 'x' : ' '}] ${c.text}`).join('\n') + '\n\n';
    }
    if (tags.length > 0) {
      fullText += `برچسب‌ها: ${tags.map((t) => `#${t}`).join(' ')}\n`;
    }

    const blob = new Blob([fullText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'document').replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const wordsCount = content.trim().split(/\s+/).filter(Boolean).length;
  const charsCount = content.length;
  const readingTime = Math.max(1, Math.ceil(wordsCount / 180));

  // Determine Paper Margin Padding Class
  const marginPaddingClass =
    paperMargin === 'narrow' ? 'p-6 sm:p-8' : paperMargin === 'wide' ? 'p-10 sm:p-20' : 'p-8 sm:p-14';

  // Determine Paper Theme Background
  const paperBgClass =
    paperTheme === 'ivory'
      ? 'bg-[#FAF6EE] text-[#2C2822]'
      : paperTheme === 'gray'
      ? 'bg-[#F4F4F2] text-[#1F1F1D]'
      : paperTheme === 'dark'
      ? 'bg-[#1E1E1A] text-[#E2E3DC]'
      : 'bg-white dark:bg-[#1E1E1A] text-[#1A1C16] dark:text-[#E2E3DC]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-3 bg-black/60 backdrop-blur-xs transition-all"
      onClick={handleSaveAndClose}
    >
      <div
        id="document-processor-workspace"
        onClick={(e) => e.stopPropagation()}
        className="w-full h-full sm:h-[94vh] max-h-[100dvh] sm:max-h-[94vh] sm:max-w-6xl flex flex-col sm:rounded-2xl shadow-2xl border border-[#D0D4C5] dark:border-[#383E33] bg-[#F7F7F5] dark:bg-[#181A14] overflow-hidden text-[#1A1C16] dark:text-[#E2E3DC]"
      >
        {/* OFFICE STYLE RIBBON TOOLBAR & DOCUMENT HEADER */}
        <div className="bg-[#F0F1EB] dark:bg-[#12140E] border-b border-[#E1E4D5] dark:border-[#383E33] shrink-0 select-none">
          {/* Top Integrated Row: Title Input, Quick Actions & Save/Close */}
          <div className="bg-white dark:bg-[#1C1C17] border-b border-[#E1E4D5]/70 dark:border-[#383E33]/70 px-3 py-1.5 sm:px-4 sm:py-2 flex items-center justify-between gap-2.5">
            {/* Title Input */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#4A6D22]/10 dark:bg-[#D0E8B2]/10 flex items-center justify-center text-[#4A6D22] dark:text-[#D0E8B2] shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان سند..."
                className="w-full min-w-0 bg-transparent font-bold text-sm sm:text-base text-[#1A1C16] dark:text-[#E2E3DC] placeholder-[#8F9285] focus:outline-none focus:bg-black/5 dark:focus:bg-white/5 rounded-md px-2 py-0.5 transition-colors border border-transparent focus:border-[#4A6D22]/30 truncate"
              />
            </div>

            {/* Quick Actions & Close */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Save & Close Button */}
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveAndClose}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#4A6D22] dark:bg-[#D0E8B2] hover:bg-[#3B5B1D] dark:hover:bg-[#c2de9f] text-white dark:text-[#1A3700] shadow-xs transition-all active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'ذخیره...' : 'ذخیره و بستن'}</span>
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleSaveAndClose}
                className="p-1.5 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-[#5E6258] dark:text-[#8F9285] transition-colors shrink-0"
                title="بستن"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Ribbon Bar Row: Ribbon Tabs + Metadata Controls (Category, Importance, Pin) */}
          <div className="flex items-center justify-between gap-2 px-3 pt-1 border-b border-[#E1E4D5]/60 dark:border-[#383E33]/60 overflow-x-auto scrollbar-none">
            {/* Ribbon Tabs */}
            <div className="flex items-center gap-1 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setActiveRibbonTab('home')}
                className={`px-3 py-1.5 rounded-t-xl transition-all border-b-2 ${
                  activeRibbonTab === 'home'
                    ? 'bg-white dark:bg-[#1C1C17] border-[#4A6D22] dark:border-[#D0E8B2] text-[#4A6D22] dark:text-[#D0E8B2] shadow-2xs'
                    : 'border-transparent text-[#5E6258] dark:text-[#8F9285] hover:text-[#1A1C16] dark:hover:text-[#E2E3DC]'
                }`}
              >
                اصلی (Home)
              </button>
              <button
                type="button"
                onClick={() => setActiveRibbonTab('insert')}
                className={`px-3 py-1.5 rounded-t-xl transition-all border-b-2 ${
                  activeRibbonTab === 'insert'
                    ? 'bg-white dark:bg-[#1C1C17] border-[#4A6D22] dark:border-[#D0E8B2] text-[#4A6D22] dark:text-[#D0E8B2] shadow-2xs'
                    : 'border-transparent text-[#5E6258] dark:text-[#8F9285] hover:text-[#1A1C16] dark:hover:text-[#E2E3DC]'
                }`}
              >
                درج (Insert)
              </button>
              <button
                type="button"
                onClick={() => setActiveRibbonTab('layout')}
                className={`px-3 py-1.5 rounded-t-xl transition-all border-b-2 ${
                  activeRibbonTab === 'layout'
                    ? 'bg-white dark:bg-[#1C1C17] border-[#4A6D22] dark:border-[#D0E8B2] text-[#4A6D22] dark:text-[#D0E8B2] shadow-2xs'
                    : 'border-transparent text-[#5E6258] dark:text-[#8F9285] hover:text-[#1A1C16] dark:hover:text-[#E2E3DC]'
                }`}
              >
                صفحه و چیدمان
              </button>
              <button
                type="button"
                onClick={() => setActiveRibbonTab('tools')}
                className={`px-3 py-1.5 rounded-t-xl transition-all border-b-2 ${
                  activeRibbonTab === 'tools'
                    ? 'bg-white dark:bg-[#1C1C17] border-[#4A6D22] dark:border-[#D0E8B2] text-[#4A6D22] dark:text-[#D0E8B2] shadow-2xs'
                    : 'border-transparent text-[#5E6258] dark:text-[#8F9285] hover:text-[#1A1C16] dark:hover:text-[#E2E3DC]'
                }`}
              >
                ابزارها و خروجی
              </button>
            </div>

            {/* Document Metadata (Category, Importance, Pin) */}
            <div className="flex items-center gap-1.5 shrink-0 text-xs py-0.5 pb-1">
              {/* Category Dropdown */}
              <div className="flex items-center gap-1 bg-white dark:bg-[#1C1C17] border border-[#D0D4C5] dark:border-[#383E33] rounded-lg px-2 py-0.5 text-xs">
                <Folder className="w-3.5 h-3.5 text-[#4A6D22] dark:text-[#D0E8B2]" />
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="bg-transparent border-none text-[#1A1C16] dark:text-[#E2E3DC] font-medium focus:outline-none cursor-pointer text-xs"
                >
                  <option value="" className="bg-white dark:bg-[#1C1C17]">
                    بدون موضوع
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-white dark:bg-[#1C1C17]">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Importance Level */}
              <div className="flex items-center gap-1 bg-[#FAF2DE] dark:bg-[#332A18] border border-[#EFE1B8] dark:border-[#574728] text-[#8B6814] dark:text-[#FFE086] rounded-lg px-2 py-0.5 text-xs font-semibold">
                <Star className="w-3.5 h-3.5 fill-current text-[#FFE086]" />
                <select
                  value={importanceLevel}
                  onChange={(e) => {
                    const val = e.target.value as ImportanceLevel;
                    setImportanceLevel(val);
                    setIsImportant(val !== 'normal');
                  }}
                  className="bg-transparent border-none text-[#523C0A] dark:text-[#FFF1C2] font-bold focus:outline-none cursor-pointer text-xs"
                >
                  <option value="normal" className="bg-[#FAF2DE] dark:bg-[#1C1C17]">عادی</option>
                  <option value="high" className="bg-[#FAF2DE] dark:bg-[#1C1C17]">مهم ⭐</option>
                  <option value="critical" className="bg-[#FAF2DE] dark:bg-[#1C1C17]">حیاتی 🔥</option>
                </select>
              </div>

              {/* Pin Toggle */}
              <button
                type="button"
                onClick={() => setIsPinned(!isPinned)}
                className={`p-1 rounded-lg transition-colors ${
                  isPinned ? 'text-[#1A3700] bg-[#D0E8B2]' : 'text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/10'
                }`}
                title={isPinned ? 'برداشتن سنجاق' : 'سنجاق کردن سند'}
              >
                <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current rotate-45' : ''}`} />
              </button>
            </div>
          </div>

          {/* Ribbon Command Panel depending on active tab */}
          <div className="p-2 sm:p-2.5 bg-white dark:bg-[#1C1C17] min-h-[50px] flex flex-wrap items-center gap-2 overflow-x-auto text-xs">
            {activeRibbonTab === 'home' && (
              <>
                {/* Font Selector */}
                <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-xl px-2 py-1">
                  <span className="text-[10px] text-[#8F9285] font-semibold">فونت:</span>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="bg-transparent border-none text-[#1A1C16] dark:text-[#E2E3DC] font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="font-sans" className="bg-white dark:bg-[#1C1C17]">وزیرمتن (استاندارد)</option>
                    <option value="font-serif" className="bg-white dark:bg-[#1C1C17]">ایران یکان / رسمی</option>
                    <option value="font-mono" className="bg-white dark:bg-[#1C1C17]">فونت یکنواخت / ریاضی</option>
                  </select>
                </div>

                {/* Font Size Selector */}
                <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-xl px-2 py-1">
                  <span className="text-[10px] text-[#8F9285] font-semibold">اندازه:</span>
                  <select
                    value={fontSize}
                    onChange={(e) => setFontSize(e.target.value)}
                    className="bg-transparent border-none text-[#1A1C16] dark:text-[#E2E3DC] font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="text-sm" className="bg-white dark:bg-[#1C1C17]">۱۴ (ریز)</option>
                    <option value="text-base" className="bg-white dark:bg-[#1C1C17]">۱۶ (معمولی)</option>
                    <option value="text-lg" className="bg-white dark:bg-[#1C1C17]">۱۸ (بزرگ)</option>
                    <option value="text-xl" className="bg-white dark:bg-[#1C1C17]">۲۰ (خیلی بزرگ)</option>
                    <option value="text-2xl" className="bg-white dark:bg-[#1C1C17]">۲۴ (تیتر)</option>
                  </select>
                </div>

                <div className="h-5 w-[1px] bg-[#E1E4D5] dark:bg-[#383E33] mx-1" />

                {/* Bold, Italic, Underline, Strikethrough */}
                <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => handleInsertFormatting('**', '**')}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#2C2C25] transition-colors"
                    title="ضخیم (Bold)"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormatting('*', '*')}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#2C2C25] transition-colors"
                    title="مورب (Italic)"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormatting('<u>', '</u>')}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#2C2C25] transition-colors"
                    title="زیرخط (Underline)"
                  >
                    <Underline className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormatting('~~', '~~')}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#2C2C25] transition-colors"
                    title="خط روی متن (Strikethrough)"
                  >
                    <Strikethrough className="w-4 h-4" />
                  </button>
                </div>

                <div className="h-5 w-[1px] bg-[#E1E4D5] dark:bg-[#383E33] mx-1" />

                {/* Paragraph Formatting: Heading, Lists, Quote */}
                <div className="flex items-center gap-0.5 bg-black/5 dark:bg-white/5 rounded-xl p-0.5">
                  <button
                    type="button"
                    onClick={() => handleInsertFormatting('## ')}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#2C2C25] transition-colors"
                    title="سرتیتر جدید"
                  >
                    <Heading className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormatting('• ')}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#2C2C25] transition-colors"
                    title="لیست بالت"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormatting('۱. ')}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#2C2C25] transition-colors"
                    title="لیست شماره‌دار"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInsertFormatting('> 💡 ')}
                    className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-[#2C2C25] transition-colors"
                    title="نقل قول / کادر ویژه"
                  >
                    <Quote className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {activeRibbonTab === 'insert' && (
              <>
                {/* Insert Table */}
                <button
                  type="button"
                  onClick={() => handleInsertTable(3, 3)}
                  className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-[#4A6D22]/10 dark:hover:bg-[#D0E8B2]/10 text-[#1A1C16] dark:text-[#E2E3DC] font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Table className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2]" />
                  <span>درج جدول (۳×۳)</span>
                </button>

                {/* Insert LaTeX Math Formula */}
                <button
                  type="button"
                  onClick={() => setIsLatexModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 font-bold flex items-center gap-1.5 border border-purple-500/20 transition-all"
                >
                  <span className="font-mono text-sm">𝑥</span>
                  <span>فرمول ریاضی LaTeX</span>
                </button>

                {/* Insert Media File */}
                <label className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors">
                  <Paperclip className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2]" />
                  <span>درج فایل و تصویر</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleInsertMediaInline(file);
                      e.target.value = '';
                    }}
                  />
                </label>

                {/* Record Voice Audio */}
                <button
                  type="button"
                  onClick={() => setIsVoiceRecorderOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-700 dark:text-red-300 hover:bg-red-500/20 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Mic className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span>ضبط ویس و صدا</span>
                </button>

                {/* Insert Horizontal Line */}
                <button
                  type="button"
                  onClick={() => handleInsertFormatting('\n---\n')}
                  className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Layout className="w-4 h-4" />
                  <span>خط جداکننده صفحه</span>
                </button>
              </>
            )}

            {activeRibbonTab === 'layout' && (
              <>
                {/* Paper Margins */}
                <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-xl px-2 py-1">
                  <span className="text-[10px] text-[#8F9285] font-semibold">حاشیه صفحه:</span>
                  <select
                    value={paperMargin}
                    onChange={(e) => setPaperMargin(e.target.value as 'normal' | 'narrow' | 'wide')}
                    className="bg-transparent border-none text-[#1A1C16] dark:text-[#E2E3DC] font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="normal" className="bg-white dark:bg-[#1C1C17]">استاندارد</option>
                    <option value="narrow" className="bg-white dark:bg-[#1C1C17]">باریک (فضای بیشتر)</option>
                    <option value="wide" className="bg-white dark:bg-[#1C1C17]">پهن (رسمی)</option>
                  </select>
                </div>

                {/* Paper Color Theme */}
                <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-xl px-2 py-1">
                  <span className="text-[10px] text-[#8F9285] font-semibold">بافه‌نمای کاغذ:</span>
                  <select
                    value={paperTheme}
                    onChange={(e) => setPaperTheme(e.target.value as 'white' | 'ivory' | 'gray' | 'dark')}
                    className="bg-transparent border-none text-[#1A1C16] dark:text-[#E2E3DC] font-medium focus:outline-none cursor-pointer"
                  >
                    <option value="white" className="bg-white dark:bg-[#1C1C17]">کاغذ سفید</option>
                    <option value="ivory" className="bg-white dark:bg-[#1C1C17]">کاغذ عاجی / خامه‌ای</option>
                    <option value="gray" className="bg-white dark:bg-[#1C1C17]">کاغذ طوسی</option>
                    <option value="dark" className="bg-white dark:bg-[#1C1C17]">کاغذ تیره</option>
                  </select>
                </div>

                {/* Document Color Accent */}
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Palette className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2]" />
                  <span>تم رنگی کارت</span>
                </button>
              </>
            )}

            {activeRibbonTab === 'tools' && (
              <>
                {/* Print Document */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2]" />
                  <span>چاپ / خروجی PDF</span>
                </button>

                {/* Download Markdown / Text */}
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2]" />
                  <span>دانلود فایل سند (.md)</span>
                </button>

                {/* Clean Raw Codes */}
                <button
                  type="button"
                  onClick={handleCleanRawCodes}
                  className="px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 font-semibold flex items-center gap-1.5 transition-colors"
                  title="پاکسازی کدهای بیس۶۴ اضافه"
                >
                  <Eraser className="w-4 h-4 text-[#8B6814] dark:text-[#FFE086]" />
                  <span>پاک‌سازی کدهای اضافه</span>
                </button>

                {/* Delete Document */}
                <button
                  type="button"
                  onClick={() => {
                    onDelete(note.id);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف سند</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Color Picker palette bar if toggled */}
        {showColorPicker && (
          <div className="px-6 py-2 border-b border-[#E1E4D5] dark:border-[#383E33] flex items-center gap-2 bg-black/5 dark:bg-white/5 text-xs">
            <span className="text-[#8F9285] font-medium">تم رنگی سند:</span>
            {NOTE_COLORS.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => setColor(col.id)}
                className={`w-5 h-5 rounded-full border border-[#E1E4D5] dark:border-[#43493E] ${col.bgLight} ${col.bgDark} ${
                  color === col.id ? 'ring-2 ring-[#4A6D22] dark:ring-[#D0E8B2] scale-110' : ''
                }`}
                title={col.name}
              />
            ))}
          </div>
        )}

        {/* 3. DOCUMENT PAPER WORKSPACE (A4 CANVAS WITH SHADOW) */}
        <div className="flex-1 bg-[#EBECE6] dark:bg-[#12140E] overflow-y-auto p-3 sm:p-8 flex justify-center custom-scrollbar">
          <div
            style={{ zoom: `${zoomLevel}%` }}
            className={`w-full max-w-[850px] min-h-[950px] ${paperBgClass} ${marginPaddingClass} ${fontFamily} ${fontSize} shadow-2xl rounded-xs border border-[#D0D4C5] dark:border-[#383E33] transition-all duration-200 relative my-2 mx-auto flex flex-col space-y-4`}
          >
            {/* Paper Top Ruler Line */}
            <div className="flex items-center justify-between text-[10px] font-mono text-[#8F9285] border-b border-[#E1E4D5] dark:border-[#383E33] pb-1.5 mb-2 select-none opacity-60">
              <span>◄ ۰cm</span>
              <span>سند استاندارد نگارش (A4)</span>
              <span>۲۱cm ►</span>
            </div>

            {/* Document Key Summary Box (if populated) */}
            <div className="bg-[#FAF2DE] dark:bg-[#332A18] border border-[#EFE1B8] dark:border-[#574728] rounded-2xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#8B6814] dark:text-[#FFE086]">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>نکته کلیدی و چکیده سند:</span>
                </span>
              </div>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="خلاصه و مهم‌ترین نکته این جزوه را بنویسید..."
                rows={1}
                className="w-full bg-transparent text-xs sm:text-sm text-[#523C0A] dark:text-[#FFF1C2] placeholder-[#8B6814]/50 dark:placeholder-[#FFE086]/50 focus:outline-none resize-none leading-relaxed font-medium"
              />
            </div>

            {/* Document Body Editor with In-Place Math Formula Rendering */}
            <div className="flex-1">
              <VisualDocumentEditor
                ref={visualEditorRef}
                content={content}
                onChange={setContent}
                placeholder="متن کامل جزوه، نکات درسی، فرمول‌های ریاضی و توضیحات را در اینجا بنویسید..."
              />
            </div>

            {/* Checklists Section on Document Paper */}
            <div className="pt-4 border-t border-[#E1E4D5] dark:border-[#383E33] space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#43493E] dark:text-[#E2E3DC]">
                <span className="flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2]" />
                  <span>چک‌لیست کارهای مرتبط:</span>
                </span>
                <span className="text-[11px] font-normal text-[#8F9285]">
                  {checklists.filter((c) => c.done).length} از {checklists.length} انجام شده
                </span>
              </div>

              <div className="space-y-1.5">
                {checklists.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-black/5 dark:bg-white/5 group text-xs border border-[#E1E4D5]/60 dark:border-[#43493E]/60"
                  >
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => handleToggleChecklist(item.id)}
                      className="w-4 h-4 rounded-md accent-[#4A6D22] cursor-pointer"
                    />
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => {
                        const text = e.target.value;
                        setChecklists(checklists.map((c) => (c.id === item.id ? { ...c, text } : c)));
                      }}
                      className={`flex-1 bg-transparent focus:outline-none ${
                        item.done ? 'line-through text-[#8F9285]' : 'text-[#1A1C16] dark:text-[#E2E3DC]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklist(item.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#8F9285] hover:text-red-500 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklist();
                      }
                    }}
                    placeholder="+ افزودن مورد جدید به چک‌لیست..."
                    className="flex-1 bg-black/5 dark:bg-white/5 rounded-xl px-3 py-1.5 text-xs text-[#1A1C16] dark:text-[#E2E3DC] placeholder-[#8F9285] focus:outline-none border border-[#E1E4D5] dark:border-[#383E33]"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklist}
                    className="px-3 py-1.5 bg-[#D0E8B2] text-[#1A3700] rounded-xl text-xs font-bold shadow-2xs hover:bg-[#c2de9f] transition-colors"
                  >
                    افزودن
                  </button>
                </div>
              </div>
            </div>

            {/* Document Tags on Paper Bottom */}
            <div className="pt-3 border-t border-[#E1E4D5] dark:border-[#383E33] space-y-1.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-[#8F9285] flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  برچسب‌ها:
                </span>
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-xs font-medium bg-[#4A6D22]/10 dark:bg-[#D0E8B2]/10 px-2.5 py-0.5 rounded-full text-[#4A6D22] dark:text-[#D0E8B2] border border-[#4A6D22]/20"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((t) => t !== tag))}
                      className="text-[#8F9285] hover:text-red-500 font-bold ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="+ برچسب (اینتر)"
                  className="bg-black/5 dark:bg-white/5 rounded-full px-3 py-0.5 text-xs focus:outline-none w-28 border border-[#E1E4D5] dark:border-[#383E33]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 4. DOCUMENT BOTTOM STATUS BAR */}
        <div className="bg-white dark:bg-[#1C1C17] border-t border-[#E1E4D5] dark:border-[#383E33] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#5E6258] dark:text-[#8F9285] shrink-0 select-none">
          {/* Document Stats Left */}
          <div className="flex items-center gap-3">
            <span>صفحه ۱ از ۱</span>
            <span className="hidden sm:inline">•</span>
            <span>{wordsCount} کلمه</span>
            <span className="hidden sm:inline">•</span>
            <span>{charsCount} کاراکتر</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden md:inline">زمان مطالعه: حدود {readingTime} دقیقه</span>
          </div>

          {/* Status Indicator Center */}
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#4A6D22] dark:text-[#D0E8B2]">
            <span className="w-2 h-2 rounded-full bg-[#4A6D22] dark:bg-[#D0E8B2] animate-pulse" />
            <span>حالت نگارش زنده سند</span>
          </div>

          {/* Zoom Slider Right */}
          <div className="flex items-center gap-2">
            <span className="text-[11px]">بزرگ‌نمایی:</span>
            <input
              type="range"
              min={75}
              max={125}
              step={5}
              value={zoomLevel}
              onChange={(e) => setZoomLevel(Number(e.target.value))}
              className="w-20 accent-[#4A6D22] dark:accent-[#D0E8B2] cursor-pointer"
            />
            <span className="font-mono text-[11px] w-8 text-right">{zoomLevel}%</span>
          </div>
        </div>

        {/* Voice Recorder Modal */}
        <VoiceRecorderModule
          isOpen={isVoiceRecorderOpen}
          onClose={() => setIsVoiceRecorderOpen(false)}
          onInsertAudio={handleInsertRecordedAudio}
        />

        {/* LaTeX Formula Modal */}
        <LatexFormulaModal
          isOpen={isLatexModalOpen}
          onClose={() => setIsLatexModalOpen(false)}
          onConfirm={(renderedLatex) => handleInsertLatex(renderedLatex)}
        />
      </div>
    </div>
  );
};

