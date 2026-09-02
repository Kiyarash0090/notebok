import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Search,
  Maximize2,
  Minimize2,
  FileText,
  Code2,
  FileCheck,
  FileJson,
  WrapText,
  ListOrdered,
  RefreshCw,
  Sparkles,
  Eye,
  Pencil,
  Save,
  RotateCcw,
} from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import hljs from 'highlight.js/lib/common';
import 'highlight.js/styles/github-dark.css';
import { PdfPlayer } from './PdfPlayer';
import { NoteAttachment } from '../types';
import {
  getFileCategory,
  getFileExtension,
  getCodeLanguage,
  getHighlightLanguage,
  getDocumentBadgeInfo,
  isEditableDocument,
  FileCategory,
} from '../lib/fileViewerUtils';

// Renders code as highlighted HTML for the plain text/code viewer. Falls back
// to HTML-escaped plain text when the language is unknown or highlighting fails.
function highlightCode(code: string, lang: string): string {
  try {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    }
  } catch {
    /* fall through to escaped plain text */
  }
  return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface DocumentViewerModalProps {
  attachment: NoteAttachment | null;
  onClose: () => void;
  onSaveAttachment?: (updatedAtt: NoteAttachment, newContent: string) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  attachment,
  onClose,
  onSaveAttachment,
}) => {
  if (!attachment) return null;

  const category: FileCategory = getFileCategory(attachment.name);
  const badgeInfo = getDocumentBadgeInfo(attachment.name);
  const BadgeIcon = badgeInfo.icon;
  const language = getCodeLanguage(attachment.name);
  const canEdit = isEditableDocument(attachment.name);

  // States for text / code / markdown files
  const [textContent, setTextContent] = useState<string>('');
  const [editContent, setEditContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // View settings
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wordWrap, setWordWrap] = useState(true);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [isFullScreen, setIsFullScreen] = useState(false);

  // MD specific tab: 'rendered' | 'raw'
  const [mdViewMode, setMdViewMode] = useState<'rendered' | 'raw'>('rendered');

  // JSON specific pretty format toggle
  const [jsonPretty, setJsonPretty] = useState(true);

  // Scroll sync refs for editor
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lineNumbersRef = useRef<HTMLDivElement | null>(null);

  // Fetch file contents for TXT, CODE, and MD files
  useEffect(() => {
    if (category === 'office' || category === 'pdf') {
      setLoading(false);
      return;
    }

    // Check if there's a cached local edit first
    const localCacheKey = `doc_content_${attachment.id}`;
    const cached = localStorage.getItem(localCacheKey);
    if (cached !== null) {
      setTextContent(cached);
      setEditContent(cached);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(attachment.url)
      .then((res) => {
        if (!res.ok) throw new Error(`خطا در بارگذاری فایل (کد ${res.status})`);
        return res.text();
      })
      .then((data) => {
        if (!isMounted) return;
        setTextContent(data);
        setEditContent(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Document fetch error:', err);
        setError(err.message || 'عدم امکان خواندن محتوای متنی فایل');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [attachment.id, attachment.url, category]);

  // Show inline toast message
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Toggle Edit Mode
  const handleStartEdit = () => {
    setEditContent(textContent);
    setIsEditing(true);
    // If editing markdown, default view to raw mode so editor is immediately visible
    if (category === 'md') {
      setMdViewMode('raw');
    }
  };

  // Save changes directly
  const handleSaveChanges = () => {
    try {
      const blob = new Blob([editContent], { type: 'text/plain;charset=utf-8' });
      const newUrl = URL.createObjectURL(blob);
      const localCacheKey = `doc_content_${attachment.id}`;
      localStorage.setItem(localCacheKey, editContent);

      setTextContent(editContent);
      setIsEditing(false);

      const updatedAttachment: NoteAttachment = {
        ...attachment,
        url: newUrl,
        size: blob.size,
      };

      if (onSaveAttachment) {
        onSaveAttachment(updatedAttachment, editContent);
      }

      showToast('تغییرات فایل با موفقیت ذخیره شد ✨');
    } catch (e) {
      console.error('Error saving edited file:', e);
      showToast('خطا در ذخیره تغییرات فایل');
    }
  };

  // Cancel Editing
  const handleCancelEdit = () => {
    setEditContent(textContent);
    setIsEditing(false);
  };

  // Handle Tab key insertion inside textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newText = editContent.substring(0, start) + '  ' + editContent.substring(end);
      setEditContent(newText);

      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      handleSaveChanges();
    }
  };

  // Sync scrolling between line numbers column and textarea
  const handleEditorScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Handle Copy To Clipboard
  const handleCopy = () => {
    let textToCopy = isEditing ? editContent : textContent;
    if (!isEditing && category === 'code' && getFileExtension(attachment.name) === 'json' && jsonPretty) {
      try {
        textToCopy = JSON.stringify(JSON.parse(textContent), null, 2);
      } catch {
        // use raw text
      }
    }
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Formatted JSON string if JSON file
  const formattedJsonContent = useMemo(() => {
    const raw = isEditing ? editContent : textContent;
    if (category === 'code' && getFileExtension(attachment.name) === 'json' && jsonPretty) {
      try {
        return JSON.stringify(JSON.parse(raw), null, 2);
      } catch {
        return raw;
      }
    }
    return raw;
  }, [textContent, editContent, isEditing, category, attachment.name, jsonPretty]);

  // Text Lines for line numbers and search filter
  const activeText = isEditing ? editContent : (category === 'code' && getFileExtension(attachment.name) === 'json' ? formattedJsonContent : textContent);
  const lines = useMemo(() => activeText.split('\n'), [activeText]);

  // Match search count
  const searchMatchesCount = useMemo(() => {
    if (!searchQuery.trim() || !activeText) return 0;
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = activeText.match(regex);
    return matches ? matches.length : 0;
  }, [activeText, searchQuery]);

  // Font size CSS mapping
  const getFontSizeClass = () => {
    switch (fontSize) {
      case 'sm':
        return 'text-xs leading-relaxed';
      case 'lg':
        return 'text-base leading-loose';
      case 'xl':
        return 'text-lg leading-loose';
      default:
        return 'text-sm leading-relaxed';
    }
  };

  const isDirty = isEditing && editContent !== textContent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full bg-[#FAF9F6] dark:bg-[#151713] text-[#1A1C16] dark:text-[#E2E3DC] rounded-3xl border border-[#E1E4D5] dark:border-[#383C32] shadow-2xl flex flex-col overflow-hidden transition-all duration-300 relative ${
          isFullScreen ? 'h-full max-w-none rounded-none' : 'max-w-5xl h-[90vh]'
        }`}
      >
        {/* Floating Save Toast Notification */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-[#4A6D22] text-white text-xs font-bold shadow-xl flex items-center gap-2 animate-bounce">
            <Sparkles className="w-4 h-4 text-[#D0E8B2]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-[#1E211B] border-b border-[#E1E4D5] dark:border-[#383C32] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-2xl border ${badgeInfo.color} flex items-center justify-center shrink-0`}>
              <BadgeIcon className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold truncate max-w-[180px] sm:max-w-md dir-ltr text-right" dir="ltr">
                  {attachment.name}
                </h3>
                {isEditing && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[10px] font-bold flex items-center gap-1 animate-pulse shrink-0">
                    <Pencil className="w-3 h-3" />
                    <span>حالت ویرایش</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#5E6258] dark:text-[#8F9285]">
                <span className="font-semibold">{badgeInfo.label}</span>
                {attachment.size ? (
                  <>
                    <span>•</span>
                    <span>{(attachment.size / 1024).toFixed(1)} KB</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            {/* Direct Edit Buttons */}
            {canEdit && !isEditing && (
              <button
                type="button"
                onClick={handleStartEdit}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
                title="ویرایش مستقیم متن و کد بدون نیاز به آپلود مجدد"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>ویرایش</span>
              </button>
            )}

            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  className="px-3.5 py-1.5 rounded-xl bg-[#4A6D22] hover:bg-[#3B571B] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
                  title="ذخیره تغییرات (Ctrl + S)"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>ذخیره تغییرات</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-2.5 py-1.5 rounded-xl bg-[#F5F6EE] dark:bg-[#282B23] hover:bg-[#E1E4D5] dark:hover:bg-[#383C32] text-[#5E6258] dark:text-[#8F9285] text-xs font-bold flex items-center gap-1 transition-colors"
                  title="انصراف از ویرایش"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>انصراف</span>
                </button>
              </>
            )}

            {/* Search Tool for TXT / CODE / MD */}
            {(category === 'txt' || category === 'code' || (category === 'md' && mdViewMode === 'raw')) && !isEditing && (
              <div className="relative hidden sm:flex items-center">
                <Search className="w-3.5 h-3.5 absolute right-3 text-[#8F9285]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در متن..."
                  className="pr-8 pl-3 py-1 rounded-xl text-xs bg-[#F5F6EE] dark:bg-[#282B23] border border-[#E1E4D5] dark:border-[#43493E] focus:outline-none focus:border-[#4A6D22] dark:focus:border-[#D0E8B2] w-36 focus:w-48 transition-all"
                />
                {searchMatchesCount > 0 && (
                  <span className="absolute left-2.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#4A6D22] text-white">
                    {searchMatchesCount}
                  </span>
                )}
              </div>
            )}

            {/* Markdown View Toggle */}
            {category === 'md' && (
              <div className="flex items-center p-0.5 rounded-xl bg-[#F5F6EE] dark:bg-[#282B23] border border-[#E1E4D5] dark:border-[#43493E]">
                <button
                  type="button"
                  onClick={() => setMdViewMode('rendered')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    mdViewMode === 'rendered'
                      ? 'bg-[#4A6D22] text-white shadow-xs'
                      : 'text-[#5E6258] dark:text-[#8F9285] hover:text-[#1A1C16]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>پیش‌نمایش</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMdViewMode('raw')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    mdViewMode === 'raw'
                      ? 'bg-[#4A6D22] text-white shadow-xs'
                      : 'text-[#5E6258] dark:text-[#8F9285] hover:text-[#1A1C16]'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'ویرایش متن' : 'کد خام'}</span>
                </button>
              </div>
            )}

            {/* Pretty JSON Toggle */}
            {category === 'code' && getFileExtension(attachment.name) === 'json' && !isEditing && (
              <button
                type="button"
                onClick={() => setJsonPretty(!jsonPretty)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors ${
                  jsonPretty
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                    : 'bg-white dark:bg-[#282B23] text-[#5E6258] dark:text-[#8F9285] border-[#E1E4D5] dark:border-[#43493E]'
                }`}
                title="مرتب‌سازی هوشمند ساختار JSON"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">مرتب‌سازی JSON</span>
              </button>
            )}

            {/* Copy Button */}
            {(category === 'txt' || category === 'code' || category === 'md') && (textContent || editContent) && (
              <button
                type="button"
                onClick={handleCopy}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#282B23] hover:bg-[#F5F6EE] dark:hover:bg-[#32362C] border border-[#E1E4D5] dark:border-[#43493E] text-xs font-bold flex items-center gap-1.5 text-[#1A1C16] dark:text-[#E2E3DC] transition-colors shadow-2xs"
                title="کپی محتوا"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? 'کپی شد' : 'کپی'}</span>
              </button>
            )}

            {/* Direct Download Button */}
            <a
              href={attachment.url}
              download={attachment.name}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#2E3128] border border-[#E1E4D5] dark:border-[#43493E] text-[#4A6D22] dark:text-[#D0E8B2] hover:bg-[#D0E8B2] hover:text-[#1A3700] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs active:scale-95"
              title="دانلود فایل"
            >
              <Download className="w-3.5 h-3.5" />
              <span>دانلود</span>
            </a>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 rounded-xl bg-white dark:bg-[#282B23] hover:bg-[#F5F6EE] dark:hover:bg-[#32362C] border border-[#E1E4D5] dark:border-[#43493E] text-[#5E6258] dark:text-[#8F9285] transition-colors"
              title={isFullScreen ? 'خروج از حالت تمام صفحه' : 'تمام صفحه'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-red-100 dark:bg-red-950/70 hover:bg-red-200 dark:hover:bg-red-900 text-red-700 dark:text-red-300 transition-colors"
              title="بستن پنجره"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* View Controls Toolbar for Text / Code / Editor */}
        {(category === 'txt' || category === 'code' || (category === 'md' && mdViewMode === 'raw')) && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#F5F6EE] dark:bg-[#1C1E18] border-b border-[#E1E4D5] dark:border-[#383C32] text-xs shrink-0">
            <div className="flex items-center gap-2 text-[#5E6258] dark:text-[#8F9285]">
              <button
                type="button"
                onClick={() => setShowLineNumbers(!showLineNumbers)}
                className={`p-1 rounded-lg flex items-center gap-1 transition-colors ${
                  showLineNumbers ? 'bg-[#4A6D22]/15 text-[#4A6D22] dark:text-[#D0E8B2] font-bold' : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                title="نمایش شماره خطوط"
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>شماره خط</span>
              </button>

              <button
                type="button"
                onClick={() => setWordWrap(!wordWrap)}
                className={`p-1 rounded-lg flex items-center gap-1 transition-colors ${
                  wordWrap ? 'bg-[#4A6D22]/15 text-[#4A6D22] dark:text-[#D0E8B2] font-bold' : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                title="شکستن خطوط طولانی"
              >
                <WrapText className="w-3.5 h-3.5" />
                <span>Wrap خطوط</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Status indicator if dirty */}
              {isDirty && (
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                  ● ذخیره نشده
                </span>
              )}

              {/* Language Tag */}
              {category === 'code' && (
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] uppercase font-bold tracking-wider">
                  {language}
                </span>
              )}

              {/* Font Size Selector */}
              <div className="flex items-center gap-1 bg-white dark:bg-[#282B23] border border-[#E1E4D5] dark:border-[#43493E] rounded-lg p-0.5">
                {(['sm', 'base', 'lg', 'xl'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setFontSize(sz)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      fontSize === sz
                        ? 'bg-[#4A6D22] text-white'
                        : 'text-[#5E6258] dark:text-[#8F9285] hover:text-[#1A1C16]'
                    }`}
                  >
                    {sz === 'sm' ? 'A-' : sz === 'base' ? 'A' : sz === 'lg' ? 'A+' : 'A++'}
                  </button>
                ))}
              </div>

              <span className="text-[11px] font-mono text-[#8F9285]">
                {lines.length} خط • {activeText.length} کاراکتر
              </span>
            </div>
          </div>
        )}

        {/* Modal Main Body */}
        <div className="flex-1 overflow-auto relative">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <RefreshCw className="w-8 h-8 text-[#4A6D22] animate-spin mb-3" />
              <p className="text-sm font-bold text-[#5E6258] dark:text-[#8F9285]">در حال خواندن و بارگذاری محتوای سند...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center max-w-md mx-auto my-auto">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-300 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-red-600 dark:text-red-400 mb-1">خطا در بارگذاری فایل</h4>
              <p className="text-xs text-[#5E6258] dark:text-[#8F9285] mb-4">{error}</p>
              <a
                href={attachment.url}
                download={attachment.name}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4A6D22] text-white text-xs font-bold hover:bg-[#3B571B] transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>دانلود مستقیم فایل</span>
              </a>
            </div>
          ) : category === 'pdf' ? (
            /* Dedicated PDF Player */
            <PdfPlayer url={attachment.url} fileName={attachment.name} />
          ) : category === 'md' && mdViewMode === 'rendered' ? (
            /* Dedicated Markdown Rendered Player */
            <div className="p-6 sm:p-10 max-w-4xl mx-auto">
              <div className="prose dark:prose-invert max-w-none text-[#1A1C16] dark:text-[#E2E3DC] leading-relaxed">
                <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {isEditing ? editContent : textContent}
                </Markdown>
              </div>
            </div>
          ) : isEditing ? (
            /* INLINE EDITOR FOR TXT, CODE & MARKDOWN */
            <div
              className={`h-full min-h-[500px] flex font-mono dir-ltr text-left transition-colors ${
                category === 'code' ? 'bg-[#1E1E1E] text-[#D4D4D4]' : 'bg-[#FAF9F6] dark:bg-[#151713] text-[#1A1C16] dark:text-[#E2E3DC]'
              }`}
              dir="ltr"
            >
              {/* Line Numbers Column for Editor */}
              {showLineNumbers && (
                <div
                  ref={lineNumbersRef}
                  className="select-none text-right pr-4 pl-2 text-gray-500/60 font-mono shrink-0 border-r border-gray-500/20 text-xs leading-relaxed overflow-hidden py-4 bg-black/5 dark:bg-white/5"
                >
                  {lines.map((_, idx) => (
                    <div key={idx} className={getFontSizeClass()}>
                      {idx + 1}
                    </div>
                  ))}
                </div>
              )}

              {/* Interactive Live Editor Textarea */}
              <div className="flex-1 h-full relative">
                <textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onScroll={handleEditorScroll}
                  placeholder="محتوای متنی فایل را اینجا ویرایش کنید..."
                  className={`w-full h-full p-4 bg-transparent resize-none focus:outline-none font-mono ${getFontSizeClass()} ${
                    wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                  }`}
                  style={{
                    fontFamily: category === 'code' ? 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' : 'inherit',
                  }}
                  autoFocus
                  spellCheck={false}
                />
              </div>
            </div>
          ) : (
            /* Dedicated Text & Code Viewer */
            <div
              className={`min-h-full p-4 font-mono dir-ltr text-left transition-colors ${
                category === 'code' ? 'bg-[#1E1E1E] text-[#D4D4D4]' : 'bg-[#FAF9F6] dark:bg-[#151713] text-[#1A1C16] dark:text-[#E2E3DC]'
              }`}
              dir="ltr"
            >
              <div className="flex">
                {/* Line Numbers Column */}
                {showLineNumbers && (
                  <div className="select-none text-right pr-4 pl-2 text-gray-500/60 font-mono shrink-0 border-r border-gray-500/20 text-xs leading-relaxed">
                    {lines.map((_, idx) => (
                      <div key={idx} className={getFontSizeClass()}>
                        {idx + 1}
                      </div>
                    ))}
                  </div>
                )}

                {/* Main Code/Text View */}
                <div className={`flex-1 overflow-x-auto ${showLineNumbers ? 'pl-4' : 'px-2'}`}>
                  <pre
                    className={`font-mono ${getFontSizeClass()} ${
                      wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                    }`}
                  >
                    <code
                      dangerouslySetInnerHTML={{
                        __html: highlightCode(
                          category === 'code' && getFileExtension(attachment.name) === 'json'
                            ? formattedJsonContent
                            : textContent,
                          getHighlightLanguage(attachment.name),
                        ),
                      }}
                    />
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
