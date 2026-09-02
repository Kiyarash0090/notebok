import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  BookOpen,
  Star,
  Pin,
  Sparkles,
  Search,
  Plus,
  Trash2,
  RotateCcw,
  AlertCircle,
  Folder,
  Layers,
  Inbox,
  ShieldCheck,
} from 'lucide-react';
import { Note, Category, ViewFilter, ThemeMode, ImportanceLevel } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { NoteCard } from './components/NoteCard';
import { LoadingScreen } from './components/LoadingScreen';
import { PrintView } from './components/PrintView';
import { NoteEditor } from './components/editor/NoteEditor';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { AdvancedSearchModal, AdvancedSearchFilters } from './components/AdvancedSearchModal';
import { TelegramModal } from './components/TelegramModal';
import { MobileBottomNav } from './components/MobileBottomNav';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('app_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.getElementById('theme-color-meta')?.setAttribute('content', '#12140E');
    } else {
      root.classList.remove('dark');
      document.getElementById('theme-color-meta')?.setAttribute('content', '#FAF9F5');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Main Data States
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search States
  const [currentFilter, setCurrentFilter] = useState<ViewFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Advanced Search Filter State
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedSearchFilters>({
    search: '',
    category: 'all',
    tag: '',
    importanceLevel: '',
    hasAttachment: false,
    attachmentType: '',
    fromDate: '',
    toDate: '',
  });

  // Modals & Drawers
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorInitialMode, setEditorInitialMode] = useState<'edit' | 'preview'>('edit');
  const [printNote, setPrintNote] = useState<Note | null>(null);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);

  // ---- Browser/hardware Back should close the top overlay, not leave the app.
  // We push one history entry while any overlay is open and consume it on Back;
  // programmatic closes mirror it with a suppressed history.back().
  const suppressBackRef = useRef(false);
  const anyOverlayOpen =
    isEditorOpen ||
    isSidebarOpen ||
    isCategoryManagerOpen ||
    isBackupModalOpen ||
    isAdvancedSearchOpen ||
    isTelegramModalOpen;
  const prevAnyOverlayOpenRef = useRef(anyOverlayOpen);

  useEffect(() => {
    if (prevAnyOverlayOpenRef.current === anyOverlayOpen) return;
    prevAnyOverlayOpenRef.current = anyOverlayOpen;
    if (anyOverlayOpen) {
      window.history.pushState({ overlay: true }, '');
    } else {
      // Unwind the entry a programmatic close left behind; ignore the popstate it triggers.
      suppressBackRef.current = true;
      window.history.back();
    }
  }, [anyOverlayOpen]);

  useEffect(() => {
    const onPop = () => {
      if (suppressBackRef.current) {
        suppressBackRef.current = false;
        return;
      }
      // Close the topmost open overlay (full-screen editor first, then dialogs).
      if (isEditorOpen) setIsEditorOpen(false);
      else if (isCategoryManagerOpen) setIsCategoryManagerOpen(false);
      else if (isBackupModalOpen) setIsBackupModalOpen(false);
      else if (isAdvancedSearchOpen) setIsAdvancedSearchOpen(false);
      else if (isSidebarOpen) setIsSidebarOpen(false);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [isEditorOpen, isCategoryManagerOpen, isBackupModalOpen, isAdvancedSearchOpen, isSidebarOpen]);

  // Lock the background page scroll while any overlay/popup is open so the
  // wheel only scrolls the layer in front, not the layers underneath.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = anyOverlayOpen ? 'hidden' : prev;
    return () => {
      document.body.style.overflow = prev;
    };
  }, [anyOverlayOpen]);

  // PDF/print export: mount the print view, open the browser print dialog, then reset
  const handleDownloadPdf = useCallback((note: Note) => {
    setPrintNote(note);
  }, []);
  useEffect(() => {
    if (!printNote) return;
    const t = setTimeout(() => {
      window.print();
      setPrintNote(null);
    }, 200);
    return () => clearTimeout(t);
  }, [printNote]);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch initial data from server
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedNotes, fetchedCategories] = await Promise.all([
        api.getNotes(),
        api.getCategories(),
      ]);
      setNotes(fetchedNotes);
      setCategories(fetchedCategories);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError('عدم برقراری ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculations & Counts
  const counts = useMemo(() => {
    const active = notes.filter((n) => !n.isTrash && !n.isArchived);
    return {
      all: active.length,
      important: active.filter((n) => n.isImportant).length,
      checklists: active.filter((n) => n.checklists && n.checklists.length > 0).length,
      archive: notes.filter((n) => !n.isTrash && n.isArchived).length,
      trash: notes.filter((n) => n.isTrash).length,
    };
  }, [notes]);

  const categoryCounts = useMemo(() => {
    const countsMap: Record<string, number> = {};
    const active = notes.filter((n) => !n.isTrash && !n.isArchived);
    active.forEach((n) => {
      if (n.categoryId) {
        countsMap[n.categoryId] = (countsMap[n.categoryId] || 0) + 1;
      }
    });
    return countsMap;
  }, [notes]);

  // Extract unique tags across all notes for search suggestions
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach((n) => {
      if (n.tags) n.tags.forEach((t) => set.add(t));
    });
    return Array.from(set);
  }, [notes]);

  const hasActiveAdvancedFilters = useMemo(() => {
    return Boolean(
      (advancedFilters.category && advancedFilters.category !== 'all') ||
      advancedFilters.tag ||
      advancedFilters.importanceLevel ||
      advancedFilters.hasAttachment ||
      advancedFilters.attachmentType ||
      advancedFilters.fromDate ||
      advancedFilters.toDate
    );
  }, [advancedFilters]);

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // Filter by view
    if (currentFilter === 'trash') {
      result = result.filter((n) => n.isTrash);
    } else if (currentFilter === 'archive') {
      result = result.filter((n) => !n.isTrash && n.isArchived);
    } else {
      result = result.filter((n) => !n.isTrash && !n.isArchived);

      if (currentFilter === 'important') {
        result = result.filter((n) => n.isImportant);
      } else if (currentFilter === 'checklists') {
        result = result.filter((n) => n.checklists && n.checklists.length > 0);
      } else if (currentFilter === 'category' && selectedCategory) {
        result = result.filter((n) => n.categoryId === selectedCategory);
      }
    }

    // Apply Advanced Filter Criteria
    if (advancedFilters.category && advancedFilters.category !== 'all') {
      result = result.filter((n) => n.categoryId === advancedFilters.category);
    }

    if (advancedFilters.tag) {
      const targetTag = advancedFilters.tag.toLowerCase();
      result = result.filter((n) => n.tags && n.tags.some((t) => t.toLowerCase() === targetTag));
    }

    if (advancedFilters.importanceLevel) {
      result = result.filter((n) => n.importanceLevel === advancedFilters.importanceLevel);
    }

    if (advancedFilters.hasAttachment) {
      result = result.filter((n) => n.attachments && n.attachments.length > 0);
    }

    if (advancedFilters.attachmentType) {
      result = result.filter(
        (n) => n.attachments && n.attachments.some((a) => a.type === advancedFilters.attachmentType)
      );
    }

    if (advancedFilters.fromDate) {
      const from = new Date(advancedFilters.fromDate).getTime();
      result = result.filter((n) => new Date(n.createdAt).getTime() >= from);
    }

    if (advancedFilters.toDate) {
      const to = new Date(advancedFilters.toDate).getTime() + 86400000;
      result = result.filter((n) => new Date(n.createdAt).getTime() <= to);
    }

    // Filter by search query
    const effectiveQuery = (advancedFilters.search || searchQuery).trim().toLowerCase();
    if (effectiveQuery) {
      result = result.filter(
        (n) =>
          (n.title && n.title.toLowerCase().includes(effectiveQuery)) ||
          (n.content && n.content.toLowerCase().includes(effectiveQuery)) ||
          (n.summary && n.summary.toLowerCase().includes(effectiveQuery)) ||
          (n.tags && n.tags.some((t) => t.toLowerCase().includes(effectiveQuery))) ||
          (n.attachments && n.attachments.some((a) => a.name.toLowerCase().includes(effectiveQuery)))
      );
    }

    // Sort: Pinned first, then newest updated
    return result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }, [notes, currentFilter, selectedCategory, searchQuery, advancedFilters]);

  // Pinned vs Unpinned division
  const pinnedNotes = useMemo(
    () => filteredNotes.filter((n) => n.isPinned && !n.isTrash && !n.isArchived),
    [filteredNotes]
  );
  const otherNotes = useMemo(
    () => (currentFilter === 'trash' || currentFilter === 'archive' ? filteredNotes : filteredNotes.filter((n) => !n.isPinned)),
    [filteredNotes, currentFilter]
  );

  // Handlers for Notes
  const handleOpenCreateModal = () => {
    setEditingNote(null);
    setIsEditorOpen(true);
  };

  const handleCreateNote = async (newNoteData: any) => {
    setIsSaving(true);
    try {
      const created = await api.createNote(newNoteData);
      setNotes((prev) => [created, ...prev]);
      showToast('جزوه جدید در سرور ذخیره شد');
    } catch (err: any) {
      showToast(err.message || 'خطا در ایجاد یادداشت', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateNote = async (id: string, updates: Partial<Note>) => {
    setIsSaving(true);
    // Optimistic UI update
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n)));
    try {
      const updated = await api.updateNote(id, updates);
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch (err: any) {
      showToast('خطا در ذخیره تغییرات در سرور', 'error');
      loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePin = async (id: string) => {
    const target = notes.find((n) => n.id === id);
    if (!target) return;
    const nextVal = !target.isPinned;
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, isPinned: nextVal } : n)));
    try {
      await api.togglePin(id);
      showToast(nextVal ? 'یادداشت سنجاق شد' : 'سنجاق برداشته شد');
    } catch (err) {
      loadData();
    }
  };

  const handleToggleImportant = async (id: string) => {
    const target = notes.find((n) => n.id === id);
    if (!target) return;
    const nextVal = !target.isImportant;
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, isImportant: nextVal } : n)));
    try {
      await api.toggleImportant(id);
      showToast(nextVal ? 'به نکات طلایی اضافه شد ⭐' : 'از نکات طلایی حذف شد');
    } catch (err) {
      loadData();
    }
  };

  const handleDeleteNote = async (id: string, permanent = false) => {
    if (permanent) {
      if (!confirm('آیا از حذف دائمی این یادداشت اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) return;
      setNotes((prev) => prev.filter((n) => n.id !== id));
      try {
        await api.deleteNote(id, true);
        showToast('یادداشت برای همیشه حذف شد');
      } catch (err) {
        loadData();
      }
    } else {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, isTrash: true } : n)));
      try {
        await api.deleteNote(id, false);
        showToast('یادداشت به سطل زباله منتقل شد');
      } catch (err) {
        loadData();
      }
    }
  };

  const handleRestoreNote = async (id: string) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, isTrash: false, isArchived: false } : n)));
    try {
      await api.restoreNote(id);
      showToast('یادداشت با موفقیت بازگردانی شد');
    } catch (err) {
      loadData();
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm('آیا از پاک‌سازی کامل سطل زباله اطمینان دارید؟')) return;
    try {
      const count = await api.emptyTrash();
      setNotes((prev) => prev.filter((n) => !n.isTrash));
      showToast(`${count} یادداشت از سطل زباله حذف گردید`);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handlers for Categories
  const handleCreateCategory = async (catData: any) => {
    try {
      const created = await api.createCategory(catData);
      setCategories((prev) => [...prev, created]);
      showToast('دسته‌بندی جدید ایجاد شد');
    } catch (err: any) {
      showToast(err.message || 'خطا در ایجاد دسته', 'error');
    }
  };

  const handleUpdateCategory = async (id: string, updates: Partial<Category>) => {
    try {
      const updated = await api.updateCategory(id, updates);
      setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
      showToast('دسته‌بندی به‌روز شد');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await api.deleteCategory(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      if (selectedCategory === id) {
        setSelectedCategory(null);
        setCurrentFilter('all');
      }
      showToast('دسته‌بندی حذف شد');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Header Title description based on current view
  const currentViewTitle = useMemo(() => {
    if (searchQuery.trim()) return `نتایج جستجو برای "${searchQuery}"`;
    if (currentFilter === 'important') return 'نکات طلایی ⭐';
    if (currentFilter === 'checklists') return 'چک‌لیست‌ها و کارهای انجام‌دادنی';
    if (currentFilter === 'archive') return 'بایگانی یادداشت‌ها';
    if (currentFilter === 'trash') return 'سطل زباله';
    if (currentFilter === 'category' && selectedCategory) {
      const cat = categories.find((c) => c.id === selectedCategory);
      return cat ? `دسته‌بندی: ${cat.name}` : 'دسته‌بندی موضوعی';
    }
    return 'همه جزوه‌ها و یادداشت‌ها';
  }, [currentFilter, selectedCategory, categories, searchQuery]);

  // Full-screen splash while the app loads its data
  if (isLoading) return <LoadingScreen />;

  return (
    <>
    <div className="min-h-screen bg-[#FAF9F5] dark:bg-[#12140E] text-[#1A1C16] dark:text-[#E2E3DC] flex flex-col font-sans transition-colors selection:bg-[#D0E8B2] dark:selection:bg-[#324B10] anim-fade-in" dir="rtl">
      {/* Top Navigation Bar */}
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenAdvancedSearch={() => setIsAdvancedSearchOpen(true)}
        hasActiveAdvancedFilters={hasActiveAdvancedFilters}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
        onOpenTelegramStorage={() => setIsTelegramModalOpen(true)}
        isSaving={isSaving}
        notesCount={counts.all}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Navigation Sidebar Drawer */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          currentFilter={currentFilter}
          selectedCategory={selectedCategory}
          onSelectFilter={(filter, catId) => {
            setCurrentFilter(filter);
            setSelectedCategory(catId || null);
            setSearchQuery('');
          }}
          categories={categories}
          onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
          onOpenBackup={() => setIsBackupModalOpen(true)}
          onOpenTelegramStorage={() => setIsTelegramModalOpen(true)}
          counts={counts}
          categoryCounts={categoryCounts}
        />

        {/* Center Content Area */}
        <main className="flex-1 px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden pb-24 lg:pb-12">
          {/* Current View Header */}
          <div className="flex flex-col gap-2 mb-4 mt-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                  {currentViewTitle}
                </h1>
                <span className="text-xs text-[#5E6258] dark:text-[#8F9285]">
                  ({filteredNotes.length} مورد)
                </span>
              </div>

              {/* Trash Actions */}
              {currentFilter === 'trash' && counts.trash > 0 && (
                <button
                  type="button"
                  onClick={handleEmptyTrash}
                  className="px-4 py-1.5 bg-[#5C1A1A] hover:bg-[#722121] text-[#FFAB91] rounded-full text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  تخلیه کامل سطل زباله
                </button>
              )}
            </div>

            {/* Active Advanced Search Badges */}
            {hasActiveAdvancedFilters && (
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#D0E8B2]/20 dark:bg-[#1A3700]/30 rounded-2xl border border-[#D0E8B2]/40 text-xs">
                <span className="font-bold text-[#1A3700] dark:text-[#D0E8B2] flex items-center gap-1 text-[11px]">
                  فیلترهای فعال:
                </span>

                {advancedFilters.category && advancedFilters.category !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-[#FAF9F5] dark:bg-[#1C1C17] px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-[#E1E4D5] dark:border-[#43493E]">
                    موضوع: {categories.find((c) => c.id === advancedFilters.category)?.name || advancedFilters.category}
                  </span>
                )}

                {advancedFilters.tag && (
                  <span className="inline-flex items-center gap-1 bg-[#FAF9F5] dark:bg-[#1C1C17] px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-[#E1E4D5] dark:border-[#43493E]">
                    برچسب: #{advancedFilters.tag}
                  </span>
                )}

                {advancedFilters.importanceLevel && (
                  <span className="inline-flex items-center gap-1 bg-[#FAF9F5] dark:bg-[#1C1C17] px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-[#E1E4D5] dark:border-[#43493E]">
                    اهمیت: {advancedFilters.importanceLevel === 'critical' ? 'حیاتی 🔥' : 'مهم ⭐'}
                  </span>
                )}

                {advancedFilters.hasAttachment && (
                  <span className="inline-flex items-center gap-1 bg-[#FAF9F5] dark:bg-[#1C1C17] px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-[#E1E4D5] dark:border-[#43493E]">
                    دارای پیوست {advancedFilters.attachmentType ? `(${advancedFilters.attachmentType})` : ''}
                  </span>
                )}

                {(advancedFilters.fromDate || advancedFilters.toDate) && (
                  <span className="inline-flex items-center gap-1 bg-[#FAF9F5] dark:bg-[#1C1C17] px-2.5 py-0.5 rounded-full text-[11px] font-semibold border border-[#E1E4D5] dark:border-[#43493E]">
                    بازه زمانی: {advancedFilters.fromDate || '...'} تا {advancedFilters.toDate || '...'}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setAdvancedFilters({
                      search: '',
                      category: 'all',
                      tag: '',
                      importanceLevel: '',
                      hasAttachment: false,
                      attachmentType: '',
                      fromDate: '',
                      toDate: '',
                    })
                  }
                  className="mr-auto text-[11px] text-[#A64D3B] hover:underline font-bold"
                >
                  حذف همه فیلترها
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 my-4 rounded-2xl bg-[#5C1A1A]/20 text-[#A64D3B] dark:text-[#FFAB91] border border-[#5C1A1A]/40 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
              <button
                onClick={loadData}
                className="mr-auto underline font-bold"
              >
                تلاش مجدد
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && filteredNotes.length === 0 && (
            <div className="py-16 text-center flex flex-col items-center justify-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#D0E8B2]/20 dark:bg-[#324B10]/40 flex items-center justify-center text-[#4A6D22] dark:text-[#D0E8B2] mb-1">
                <Inbox className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-sm sm:text-base text-[#1A1C16] dark:text-[#E2E3DC]">
                هیچ یادداشتی در این بخش پیدا نشد
              </h3>
              <p className="text-xs text-[#5E6258] dark:text-[#8F9285] max-w-sm leading-relaxed">
                می‌توانید با استفاده از دکمه شناور پایین صفحه، اولین جزوه یا نکته مهم خود را بنویسید.
              </p>
            </div>
          )}

          {/* Notes List */}
          {!isLoading && filteredNotes.length > 0 && (
            <div className="space-y-6">
              {/* Pinned Notes Section */}
              {pinnedNotes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285] uppercase tracking-wider px-1">
                    <Pin className="w-3.5 h-3.5 text-[#4A6D22] dark:text-[#D0E8B2]" />
                    <span>سنجاق شده به بالا</span>
                  </div>

                  <div className="flex flex-col space-y-3.5 max-w-4xl w-full mx-auto anim-fade-up">
                    {pinnedNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        categories={categories}
                        onEdit={(n, mode) => {
                          setEditorInitialMode(mode || 'edit');
                          setEditingNote(n);
                          setIsEditorOpen(true);
                        }}
                        onDownloadPdf={handleDownloadPdf}
                        onTogglePin={handleTogglePin}
                        onToggleImportant={handleToggleImportant}
                        onDelete={handleDeleteNote}
                        onRestore={handleRestoreNote}
                        onUpdateNote={handleUpdateNote}
                        isTrashView={currentFilter === 'trash'}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Other Notes Section */}
              {otherNotes.length > 0 && (
                <div className="space-y-2">
                  {pinnedNotes.length > 0 && (
                    <div className="text-[11px] font-bold text-[#747775] dark:text-[#8E918F] uppercase tracking-wider px-1 pt-2">
                      سایر یادداشت‌ها
                    </div>
                  )}

                  <div className="flex flex-col space-y-3.5 max-w-4xl w-full mx-auto anim-fade-up">
                    {otherNotes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        categories={categories}
                        onEdit={(n, mode) => {
                          setEditorInitialMode(mode || 'edit');
                          setEditingNote(n);
                          setIsEditorOpen(true);
                        }}
                        onDownloadPdf={handleDownloadPdf}
                        onTogglePin={handleTogglePin}
                        onToggleImportant={handleToggleImportant}
                        onDelete={handleDeleteNote}
                        onRestore={handleRestoreNote}
                        onUpdateNote={handleUpdateNote}
                        isTrashView={currentFilter === 'trash'}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Floating Action Button (Desktop & Mobile) */}
      {(currentFilter !== 'trash' && currentFilter !== 'archive') && (
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="fixed bottom-8 right-8 z-40 w-14 h-14 rounded-2xl bg-[#4A6D22] hover:bg-[#3d5a1c] text-white shadow-xl shadow-black/25 hidden lg:flex items-center justify-center active:scale-95 transition-transform"
          title="نوشتن جزوه جدید"
          aria-label="ایجاد یادداشت جدید"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      )}

      {/* Floating Action Button on Mobile & Bottom Navigation */}
      <MobileBottomNav
        currentFilter={currentFilter}
        onSelectFilter={(filter) => {
          setCurrentFilter(filter);
          setSelectedCategory(null);
          setSearchQuery('');
        }}
        onOpenCreateModal={handleOpenCreateModal}
        onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        importantCount={counts.important}
      />

      {/* Full Screen Note Editor */}
      <NoteEditor
        note={editingNote}
        isOpen={isEditorOpen}
        initialMode={editorInitialMode}
        onClose={() => {
          setIsEditorOpen(false);
          setEditingNote(null);
        }}
        categories={categories}
        defaultCategoryId={selectedCategory || undefined}
        onSaved={async (savedNote, wasNew, reason) => {
          if (wasNew) {
            setNotes((prev) => [savedNote, ...prev]);
          } else {
            setNotes((prev) => prev.map((n) => (n.id === savedNote.id ? savedNote : n)));
          }
          // Manual saves close the editor; autosaves keep the user editing.
          if (reason !== 'ذخیره خودکار') {
            setIsEditorOpen(false);
            setEditingNote(null);
          }
        }}
        onDelete={(id, permanent) => handleDeleteNote(id, permanent ?? false)}
        isTrashView={currentFilter === 'trash'}
        onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        categories={categories}
        onCreateCategory={handleCreateCategory}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleDeleteCategory}
        categoryCounts={categoryCounts}
      />

      {/* Backup and Restore Modal */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onDataRestored={() => {
          loadData();
          showToast('اطلاعات با موفقیت از نسخه پشتیبان بازگردانی شد');
        }}
      />

      {/* Advanced Search Filter Modal */}
      <AdvancedSearchModal
        isOpen={isAdvancedSearchOpen}
        onClose={() => setIsAdvancedSearchOpen(false)}
        filters={advancedFilters}
        onApplyFilters={(f) => setAdvancedFilters(f)}
        categories={categories}
        availableTags={availableTags}
      />

      {/* Telegram Cloud Storage Modal */}
      <TelegramModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        onRefreshData={loadData}
      />

      {/* Toast Floating Notification */}
      {toast && (
        <div
          className={`fixed bottom-18 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full text-xs font-bold shadow-xl transition-all flex items-center gap-2 border ${
            toast.type === 'error'
              ? 'bg-[#5C1A1A] text-[#FFAB91] border-[#5C1A1A]'
              : 'bg-[#1C1C17] text-[#E2E3DC] border-[#43493E]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#D0E8B2]" />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
    {printNote && <PrintView note={printNote} />}
    </>
  );
}
