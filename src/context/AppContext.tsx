import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { Note, Category, ThemeMode, ImportanceLevel, NoteAttachment } from '../types';
import { INITIAL_CATEGORIES } from '../constants';
import { AdvancedSearchFilters } from '../components/AdvancedSearchModal';

interface AppContextType {
  // State
  notes: Note[];
  categories: Category[];
  selectedCategory: string;
  currentFilter: 'all' | 'pinned' | 'starred' | 'important' | 'trash';
  searchQuery: string;
  theme: ThemeMode;
  isSaving: boolean;
  toast: { message: string; type: 'success' | 'info' | 'error' } | null;

  // Filtered derivations
  filteredNotes: Note[];
  pinnedNotes: Note[];
  unpinnedNotes: Note[];
  counts: {
    all: number;
    pinned: number;
    starred: number;
    important: number;
    trash: number;
    byCategory: Record<string, number>;
  };
  availableTags: string[];
  hasActiveAdvancedFilters: boolean;

  // Advanced Search
  isAdvancedSearchOpen: boolean;
  advancedFilters: AdvancedSearchFilters;
  setIsAdvancedSearchOpen: (open: boolean) => void;
  setAdvancedFilters: React.Dispatch<React.SetStateAction<AdvancedSearchFilters>>;

  // Modals
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  editingNote: Note | null;
  setEditingNote: (note: Note | null) => void;
  isCategoryModalOpen: boolean;
  setIsCategoryModalOpen: (open: boolean) => void;
  isBackupModalOpen: boolean;
  setIsBackupModalOpen: (open: boolean) => void;

  // Actions
  setSelectedCategory: (cat: string) => void;
  setCurrentFilter: (filter: 'all' | 'pinned' | 'starred' | 'important' | 'trash') => void;
  setSearchQuery: (query: string) => void;
  toggleTheme: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;

  // Note CRUD
  handleSaveNote: (noteData: Partial<Note>) => Promise<void>;
  handleDeleteNote: (id: string) => Promise<void>;
  handlePermanentDelete: (id: string) => Promise<void>;
  handleRestoreNote: (id: string) => Promise<void>;
  handleTogglePin: (id: string) => Promise<void>;
  handleToggleStar: (id: string) => Promise<void>;
  handleChangeColor: (id: string, color: string) => Promise<void>;
  handleEmptyTrash: () => Promise<void>;

  // Category CRUD
  handleAddCategory: (name: string, color: string, icon?: string) => Promise<void>;
  handleUpdateCategory: (id: string, name: string, color: string, icon?: string) => Promise<void>;
  handleDeleteCategory: (id: string) => Promise<void>;

  // Backup
  handleRestoreBackup: (notes: Note[], categories: Category[]) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('app_theme');
    return (saved as ThemeMode) || 'light';
  });

  // Notes and Categories State
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem('app_notes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem('app_categories');
      return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  });

  // UI Navigation & Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentFilter, setCurrentFilter] = useState<'all' | 'pinned' | 'starred' | 'important' | 'trash'>('all');
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
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Status State
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Sync theme
  useEffect(() => {
    localStorage.setItem('app_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      const meta = document.getElementById('theme-color-meta');
      if (meta) meta.setAttribute('content', '#12140E');
    } else {
      document.documentElement.classList.remove('dark');
      const meta = document.getElementById('theme-color-meta');
      if (meta) meta.setAttribute('content', '#F5F6EE');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Sync Notes to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('app_notes', JSON.stringify(notes));
    } catch (e) {
      console.error('Failed to persist notes to localStorage', e);
    }
  }, [notes]);

  // Sync Categories to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('app_categories', JSON.stringify(categories));
    } catch (e) {
      console.error('Failed to persist categories to localStorage', e);
    }
  }, [categories]);

  // Load initial backend notes if empty
  useEffect(() => {
    const fetchServerNotes = async () => {
      try {
        const res = await fetch('/api/notes');
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0 && notes.length === 0) {
            setNotes(data);
          }
        }
      } catch (err) {
        console.log('No backend notes or running in offline client mode');
      }
    };
    fetchServerNotes();
  }, []);

  // Compute counts
  const counts = useMemo(() => {
    const activeNotes = notes.filter((n) => !n.isTrash && !n.isArchived);
    const countsMap: {
      all: number;
      pinned: number;
      starred: number;
      important: number;
      trash: number;
      byCategory: Record<string, number>;
    } = {
      all: activeNotes.length,
      pinned: activeNotes.filter((n) => n.isPinned).length,
      starred: activeNotes.filter((n) => n.isImportant).length,
      important: activeNotes.filter((n) => n.isImportant || n.importanceLevel === 'critical' || n.importanceLevel === 'high').length,
      trash: notes.filter((n) => n.isTrash).length,
      byCategory: {},
    };

    categories.forEach((cat) => {
      countsMap.byCategory[cat.id] = activeNotes.filter((n) => n.categoryId === cat.id).length;
    });

    return countsMap;
  }, [notes, categories]);

  // Extract unique tags
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

  // Filtered notes calculation
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    if (currentFilter === 'trash') {
      result = result.filter((n) => n.isTrash);
    } else {
      result = result.filter((n) => !n.isTrash && !n.isArchived);

      if (currentFilter === 'pinned') {
        result = result.filter((n) => n.isPinned);
      } else if (currentFilter === 'starred') {
        result = result.filter((n) => n.isImportant);
      } else if (currentFilter === 'important') {
        result = result.filter((n) => n.isImportant || n.importanceLevel === 'critical' || n.importanceLevel === 'high');
      }

      if (selectedCategory && selectedCategory !== 'all') {
        result = result.filter((n) => n.categoryId === selectedCategory);
      }
    }

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

    return result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
  }, [notes, currentFilter, selectedCategory, searchQuery, advancedFilters]);

  const pinnedNotes = useMemo(
    () => filteredNotes.filter((n) => n.isPinned && !n.isTrash),
    [filteredNotes]
  );
  const unpinnedNotes = useMemo(
    () => filteredNotes.filter((n) => !n.isPinned && !n.isTrash),
    [filteredNotes]
  );

  // Save Note Action
  const handleSaveNote = async (noteData: Partial<Note>) => {
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      let updatedList: Note[];

      if (noteData.id) {
        updatedList = notes.map((item) =>
          item.id === noteData.id
            ? ({
                ...item,
                ...noteData,
                updatedAt: now,
              } as Note)
            : item
        );
        showToast('یادداشت با موفقیت ویرایش شد', 'success');
      } else {
        const newNote: Note = {
          id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: noteData.title || '',
          content: noteData.content || '',
          blocks: noteData.blocks || [
            {
              id: `blk_${Math.random().toString(36).substring(2, 7)}`,
              type: 'paragraph',
              text: noteData.content || '',
            },
          ],
          summary: noteData.summary || '',
          categoryId: noteData.categoryId || (selectedCategory !== 'all' ? selectedCategory : undefined),
          importanceLevel: noteData.importanceLevel || 'normal',
          color: noteData.color || 'default',
          isPinned: noteData.isPinned || false,
          isImportant: noteData.isImportant || false,
          isArchived: false,
          isTrash: false,
          checklists: noteData.checklists || [],
          attachments: noteData.attachments || [],
          tags: noteData.tags || [],
          createdAt: now,
          updatedAt: now,
        };
        updatedList = [newNote, ...notes];
        showToast('جزوه جدید با موفقیت ذخیره شد', 'success');
      }

      setNotes(updatedList);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isTrash: true, updatedAt: new Date().toISOString() } : n))
    );
    showToast('یادداشت به سطل زباله منتقل شد', 'info');
  };

  const handlePermanentDelete = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    showToast('یادداشت برای همیشه حذف شد', 'info');
  };

  const handleRestoreNote = async (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isTrash: false, updatedAt: new Date().toISOString() } : n))
    );
    showToast('یادداشت بازیابی شد', 'success');
  };

  const handleTogglePin = async (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned, updatedAt: new Date().toISOString() } : n))
    );
  };

  const handleToggleStar = async (id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isImportant: !n.isImportant, updatedAt: new Date().toISOString() } : n))
    );
  };

  const handleChangeColor = async (id: string, color: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, color, updatedAt: new Date().toISOString() } : n))
    );
  };

  const handleEmptyTrash = async () => {
    if (window.confirm('آیا از پاک‌سازی دائمی تمام موارد موجود در سطل زباله اطمینان دارید؟')) {
      setNotes((prev) => prev.filter((n) => !n.isTrash));
      showToast('سطل زباله تخلیه شد', 'success');
    }
  };

  const handleAddCategory = async (name: string, color: string, icon = 'BookOpen') => {
    const newCat: Category = {
      id: `cat_${Date.now()}`,
      name,
      color,
      icon,
      createdAt: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, newCat]);
    showToast(`موضوع "${name}" ایجاد شد`, 'success');
  };

  const handleUpdateCategory = async (id: string, name: string, color: string, icon = 'BookOpen') => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name, color, icon } : c))
    );
    showToast('موضوع ویرایش شد', 'success');
  };

  const handleDeleteCategory = async (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    if (selectedCategory === id) {
      setSelectedCategory('all');
    }
    showToast('موضوع حذف شد', 'info');
  };

  const handleRestoreBackup = async (newNotes: Note[], newCategories: Category[]) => {
    setNotes(newNotes);
    setCategories(newCategories);
    showToast('نسخه پشتیبان با موفقیت بازیابی شد', 'success');
  };

  return (
    <AppContext.Provider
      value={{
        notes,
        categories,
        selectedCategory,
        currentFilter,
        searchQuery,
        theme,
        isSaving,
        toast,
        filteredNotes,
        pinnedNotes,
        unpinnedNotes,
        counts,
        availableTags,
        hasActiveAdvancedFilters,
        isAdvancedSearchOpen,
        advancedFilters,
        setIsAdvancedSearchOpen,
        setAdvancedFilters,
        isSidebarOpen,
        setIsSidebarOpen,
        editingNote,
        setEditingNote,
        isCategoryModalOpen,
        setIsCategoryModalOpen,
        isBackupModalOpen,
        setIsBackupModalOpen,
        setSelectedCategory,
        setCurrentFilter,
        setSearchQuery,
        toggleTheme,
        showToast,
        handleSaveNote,
        handleDeleteNote,
        handlePermanentDelete,
        handleRestoreNote,
        handleTogglePin,
        handleToggleStar,
        handleChangeColor,
        handleEmptyTrash,
        handleAddCategory,
        handleUpdateCategory,
        handleDeleteCategory,
        handleRestoreBackup,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
