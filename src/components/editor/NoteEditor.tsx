import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  FileClock,
  Filter,
  Flame,
  History,
  Image as ImageIcon,
  Link2,
  Loader2,
  LucideIcon,
  MoreHorizontal,
  Music,
  Palette,
  Pin,
  Plus,
  Printer,
  Save,
  Search,
  Star,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { Category, ImportanceLevel, Note, NoteAttachment, NoteBlock, NoteRevision } from '../../types';
import {
  blocksToPlainText,
  countBlockWords,
  createBlock,
  ensureEditableBlocks,
  pruneEmptyBlocks,
} from '../../lib/blocks';
import { BatchUploadProgress, pickMediaFiles, uploadMediaFiles } from '../../lib/media';
import { UploadProgressBar } from '../UploadProgressBar';
import { applyMark } from '../../lib/marks';
import { getActiveMarksAtSelection, HighlightColorId } from '../../lib/richText';
import { blockMatchesQuery } from '../blocks/BlockRenderer';
import { BlockEditor } from './BlockEditor';
import { EditorToolbar } from './EditorToolbar';
import { FloatingSelectionToolbar } from './FloatingSelectionToolbar';
import { api } from '../../services/api';
import { getFlattenedCategoryTree, getCategoryPathString } from '../../lib/categoryUtils';
import { useBackButton } from '../../lib/useBackButton';

type EditorSnapshot = {
  title: string;
  blocks: NoteBlock[];
  summary: string;
};

const MAX_HISTORY = 80;

function cloneSnapshot(snap: EditorSnapshot): EditorSnapshot {
  try {
    return structuredClone(snap);
  } catch {
    return JSON.parse(JSON.stringify(snap));
  }
}

function snapshotsEqual(a: EditorSnapshot, b: EditorSnapshot): boolean {
  return (
    a.title === b.title &&
    a.summary === b.summary &&
    JSON.stringify(a.blocks) === JSON.stringify(b.blocks)
  );
}

type ViewMode = 'edit' | 'preview';

interface NoteEditorProps {
  note: Note | null;
  isOpen: boolean;
  categories: Category[];
  defaultCategoryId?: string;
  initialMode?: ViewMode;
  onClose: () => void;
  onSaved: (note: Note, isNew: boolean, reason?: string) => Promise<void> | void;
  onDelete?: (id: string, permanent?: boolean) => void;
  isTrashView?: boolean;
  onOpenCategoryManager?: () => void;
  onDownloadPdf?: (note: Note) => void;
}

const IMPORTANCE_OPTIONS: { value: ImportanceLevel; label: string; icon: LucideIcon }[] = [
  { value: 'normal', label: 'عادی', icon: Circle },
  { value: 'high', label: 'مهم', icon: Star },
  { value: 'critical', label: 'حیاتی', icon: Flame },
];

const PALETTE: { id: string; swatch: string }[] = [
  { id: 'default', swatch: '#FFFFFF' },
  { id: 'sage', swatch: '#4A6D22' },
  { id: 'moss', swatch: '#2D5D34' },
  { id: 'sand', swatch: '#8B6814' },
  { id: 'clay', swatch: '#A64D3B' },
  { id: 'pine', swatch: '#1D664E' },
  { id: 'fog', swatch: '#36667F' },
  { id: 'heather', swatch: '#714C85' },
  { id: 'coral', swatch: '#A34648' },
  { id: 'mint', swatch: '#26693D' },
];

const AttachmentIcon = ({ type }: { type: NoteAttachment['type'] }) => {
  if (type === 'image') return <ImageIcon className="w-3.5 h-3.5" />;
  if (type === 'video') return <Video className="w-3.5 h-3.5" />;
  if (type === 'audio') return <Music className="w-3.5 h-3.5" />;
  return <Link2 className="w-3.5 h-3.5" />;
};

const formatBytes = (b: number) => {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)}KB`;
  return `${(b / 1024 / 1024).toFixed(1)}MB`;
};

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  isOpen,
  categories,
  defaultCategoryId,
  initialMode = 'edit',
  onClose,
  onSaved,
  onDelete,
  isTrashView = false,
  onOpenCategoryManager,
  onDownloadPdf,
}) => {
  // A null note means "compose a new one" — App passes null when the + button is used.
  const [noteId, setNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [color, setColor] = useState('default');
  const [importance, setImportance] = useState<ImportanceLevel>('normal');
  const [isPinned, setIsPinned] = useState(false);
  const [isImportant, setIsImportant] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [summary, setSummary] = useState('');
  const [attachments, setAttachments] = useState<NoteAttachment[]>([]);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [filterMatchesOnly, setFilterMatchesOnly] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [activeMarks, setActiveMarks] = useState<Set<string>>(() => new Set());
  const [activeHighlightColor, setActiveHighlightColor] = useState<HighlightColorId | null>(null);
  const [highlightColor, setHighlightColor] = useState<HighlightColorId>(() => {
    try {
      const saved = localStorage.getItem('notes-highlightColor');
      if (saved === 'yellow' || saved === 'green' || saved === 'blue' || saved === 'pink') {
        return saved;
      }
    } catch {
      /* ignore */
    }
    return 'yellow';
  });

  // Cross-block Undo / Redo history
  const pastRef = useRef<EditorSnapshot[]>([]);
  const futureRef = useRef<EditorSnapshot[]>([]);
  const committedRef = useRef<EditorSnapshot>({ title: '', blocks: [], summary: '' });
  const latestSnapRef = useRef<EditorSnapshot>({ title: '', blocks: [], summary: '' });
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstActiveRef = useRef(false);
  const isApplyingHistoryRef = useRef(false);
  const isInitializedRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const resetHistory = useCallback(
    (snap: EditorSnapshot) => {
      if (burstTimerRef.current) {
        clearTimeout(burstTimerRef.current);
        burstTimerRef.current = null;
      }
      burstActiveRef.current = false;
      isApplyingHistoryRef.current = false;
      pastRef.current = [];
      futureRef.current = [];
      const cloned = cloneSnapshot(snap);
      committedRef.current = cloned;
      latestSnapRef.current = cloned;
      isInitializedRef.current = true;
      syncHistoryFlags();
    },
    [syncHistoryFlags]
  );

  const flushTypingBurst = useCallback(() => {
    if (burstTimerRef.current) {
      clearTimeout(burstTimerRef.current);
      burstTimerRef.current = null;
    }
    if (burstActiveRef.current) {
      burstActiveRef.current = false;
      committedRef.current = cloneSnapshot(latestSnapRef.current);
    }
  }, []);

  const pushHistorySnapshot = useCallback(
    (snap: EditorSnapshot) => {
      pastRef.current.push(cloneSnapshot(snap));
      if (pastRef.current.length > MAX_HISTORY) {
        pastRef.current.shift();
      }
      futureRef.current = [];
      syncHistoryFlags();
    },
    [syncHistoryFlags]
  );
  // On narrow screens the panel is a slide-over, so it must not cover the editor on open
  const [activePanel, setActivePanel] = useState<'settings' | 'history' | 'attachments' | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  // Transient "ذخیره شد" toast — shown only right after a manual save.
  const [justSaved, setJustSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Import-text popover: paste text anywhere in the note.
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  // Autosave toggle: when on, the note persists ~1.2s after the last change
  const [autoSave, setAutoSave] = useState(() => {
    try {
      return localStorage.getItem('notes-autoSave') === '1';
    } catch {
      return false;
    }
  });
  const [error, setError] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<NoteRevision[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Mobile Back Button handlers for editor sub-modals & panels
  useBackButton(!!activePanel, () => setActivePanel(null), 'editor-active-panel');
  useBackButton(importOpen, () => setImportOpen(false), 'editor-import-open');
  useBackButton(menuOpen, () => setMenuOpen(false), 'editor-menu-open');
  useBackButton(!!zoomedImage, () => setZoomedImage(null), 'editor-zoom-image');
  useBackButton(
    isSearchOpen,
    () => {
      setIsSearchOpen(false);
      setSearchQuery('');
    },
    'editor-search-bar'
  );
  // Only one block's control rail is visible at a time (owned by the editor).
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  // Last block that was clicked/focused; kept even after blur so the "insert
  // block" toolbar can always place a new block right below the selected one.
  const lastActiveBlockIdRef = useRef<string | null>(null);
  // Tracks the last block that received focus (NOT cleared on blur). Used as
  // fallback when clicking the toolbar without a currently-focused block.
  const lastFocusedBlockIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeBlockId) lastFocusedBlockIdRef.current = activeBlockId;
  }, [activeBlockId]);
  // Bulletproof anchor: capture whichever block contains the currently focused
  // element via the DOM, independent of per-block focus handlers.
  useEffect(() => {
    const handler = () => {
      const el = document.activeElement as HTMLElement | null;
      const holder = el?.closest?.('[data-block-id]') as HTMLElement | null;
      if (holder) lastActiveBlockIdRef.current = holder.getAttribute('data-block-id');
    };
    document.addEventListener('focusin', handler, true);
    return () => document.removeEventListener('focusin', handler, true);
  }, []);
  // Blocks container ref: track which block was clicked during the capture
  // phase, BEFORE the document handler or blur events can interfere.
  const blocksContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = blocksContainerRef.current;
    if (!el) return;
    const onBlocksMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const block = target?.closest?.('[data-block-id]') as HTMLElement | null;
      if (block) lastActiveBlockIdRef.current = block.getAttribute('data-block-id');
    };
    el.addEventListener('mousedown', onBlocksMouseDown, true);
    return () => el.removeEventListener('mousedown', onBlocksMouseDown, true);
  }, []);
  // Clear the anchor when clicking outside the blocks area AND outside the
  // toolbar, so new blocks append at the end. When clicking the toolbar, the
  // anchor is preserved (from the blocks-container mousedown or focusin).
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      // Inside a block → already handled by blocks-container listener
      if (target?.closest?.('[data-block-id]')) return;
      // Inside the toolbar → preserve anchor (don't clear)
      if (target?.closest?.('[data-toolbar]')) return;
      // Truly outside → clear anchor
      lastActiveBlockIdRef.current = null;
    };
    document.addEventListener('mousedown', onDocMouseDown, true);
    return () => document.removeEventListener('mousedown', onDocMouseDown, true);
  }, []);

  // Voice recording (MediaRecorder) — an audio blob that uploads as an attachment
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recStartRef = useRef(0);
  const recCancelledRef = useRef(false);

  // Upload progress tracking
  const [uploadProgress, setUploadProgress] = useState<BatchUploadProgress | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);

  const handleCancelUpload = useCallback(() => {
    if (uploadAbortRef.current) {
      uploadAbortRef.current.abort();
      uploadAbortRef.current = null;
    }
    setUploadProgress(null);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftKey = noteId ?? 'new-note';

  const initFromNote = useCallback(
    (n: Note) => {
      const initialBlocks = ensureEditableBlocks(n);
      const initialTitle = n.title || '';
      const initialSummary = n.summary || '';
      setNoteId(n.id);
      setTitle(initialTitle);
      setBlocks(initialBlocks);
      setCategoryId(n.categoryId || '');
      setColor(n.color || 'default');
      setImportance(n.importanceLevel || 'normal');
      setIsPinned(n.isPinned);
      setIsImportant(n.isImportant);
      setTags(n.tags || []);
      setSummary(initialSummary);
      setAttachments(n.attachments || []);
      setSavedAt(n.updatedAt || null);
      setError(null);
      resetHistory({
        title: initialTitle,
        blocks: initialBlocks,
        summary: initialSummary,
      });
    },
    [resetHistory]
  );

  // Load the note being edited, or reset to a blank composer
  useEffect(() => {
    if (!isOpen) {
      isInitializedRef.current = false;
      if (burstTimerRef.current) {
        clearTimeout(burstTimerRef.current);
        burstTimerRef.current = null;
      }
      return;
    }
    if (note) {
      initFromNote(note);
    } else {
      const initialBlocks = [createBlock('paragraph')];
      setNoteId(null);
      setTitle('');
      setBlocks(initialBlocks);
      setCategoryId(defaultCategoryId || '');
      setColor('default');
      setImportance('normal');
      setIsPinned(false);
      setIsImportant(false);
      setTags([]);
      setSummary('');
      setAttachments([]);
      setSavedAt(null);
      setError(null);
      resetHistory({
        title: '',
        blocks: initialBlocks,
        summary: '',
      });
    }
    setIsSearchOpen(false);
    setSearchQuery('');
    setFilterMatchesOnly(false);
    setZoomedImage(null);
    // Desktop has room for the settings column; narrow screens open it on demand
    setActivePanel(window.innerWidth >= 1024 ? (note && initialMode === 'preview' ? null : 'settings') : null);
  }, [isOpen, note, defaultCategoryId, initFromNote, initialMode, resetHistory]);

  // Record cross-block history snapshots on edits (coalescing rapid typing bursts)
  useEffect(() => {
    if (!isOpen || !isInitializedRef.current) return;
    const current: EditorSnapshot = { title, blocks, summary };
    latestSnapRef.current = current;

    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false;
      committedRef.current = cloneSnapshot(current);
      return;
    }

    if (snapshotsEqual(current, committedRef.current)) return;

    const isStructuralChange =
      current.blocks.length !== committedRef.current.blocks.length ||
      current.blocks.some((b, i) => {
        const prevB = committedRef.current.blocks[i];
        return !prevB || b.id !== prevB.id || b.type !== prevB.type;
      });

    if (isStructuralChange) {
      if (burstTimerRef.current) {
        clearTimeout(burstTimerRef.current);
        burstTimerRef.current = null;
      }
      burstActiveRef.current = false;
      pushHistorySnapshot(committedRef.current);
      committedRef.current = cloneSnapshot(current);
      return;
    }

    if (!burstActiveRef.current) {
      burstActiveRef.current = true;
      pushHistorySnapshot(committedRef.current);
    }

    if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    burstTimerRef.current = setTimeout(() => {
      burstActiveRef.current = false;
      burstTimerRef.current = null;
      committedRef.current = cloneSnapshot(latestSnapRef.current);
    }, 550);
  }, [title, blocks, summary, isOpen, pushHistorySnapshot]);

  // Track active inline marks at caret/selection so toolbar buttons reflect state
  useEffect(() => {
    if (!isOpen) return;
    const syncMarks = () => {
      const el = document.activeElement;
      const richRoot = el instanceof HTMLElement ? (el.closest('[data-rich-editor="true"]') as HTMLElement | null) : null;
      if (richRoot) {
        const { marks, highlightColor: hlColor } = getActiveMarksAtSelection(richRoot);
        setActiveMarks(marks);
        setActiveHighlightColor(hlColor);
      } else {
        setActiveMarks(new Set());
        setActiveHighlightColor(null);
      }
    };
    document.addEventListener('selectionchange', syncMarks);
    return () => document.removeEventListener('selectionchange', syncMarks);
  }, [isOpen]);

  // Search matching inside the unified rendered editor
  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchQuery('');
      setFilterMatchesOnly(false);
    }
  }, [isSearchOpen]);

  const matchingBlocks = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return blocks.filter((b) => blockMatchesQuery(b, searchQuery));
  }, [blocks, searchQuery]);

  const totalMatches = matchingBlocks.length;
  const activeMatchBlockId = matchingBlocks[activeMatchIndex]?.id;

  useEffect(() => {
    setActiveMatchIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    if (!activeMatchBlockId) return;
    const el = document.getElementById(`editor-block-${activeMatchBlockId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeMatchBlockId]);

  const displayedBlocks = useMemo(() => {
    if (filterMatchesOnly && searchQuery.trim()) {
      return matchingBlocks;
    }
    return blocks;
  }, [blocks, matchingBlocks, filterMatchesOnly, searchQuery]);

  // Build the payload from current blocks, dropping the empty placeholders
  const payload = useMemo<Partial<Note>>(() => {
    const cleaned = pruneEmptyBlocks(blocks);
    return {
      title,
      content: blocksToPlainText(cleaned),
      blocks: cleaned,
      categoryId: categoryId || undefined,
      color,
      importanceLevel: importance,
      isPinned,
      isImportant,
      tags,
      summary,
      attachments,
      checklists: cleaned.filter((b) => b.type === 'checklist').flatMap((b) => b.items || []),
    };
  }, [title, blocks, categoryId, color, importance, isPinned, isImportant, tags, summary, attachments]);

  const wordCount = useMemo(() => countBlockWords(blocks), [blocks]);
  const hasContent =
    title.trim() !== '' ||
    blocks.some(
      (b) =>
        b.text.trim() !== '' ||
        b.attachmentId ||
        (b.items && b.items.length > 0) ||
        (b.table?.cells && b.table.cells.some((c) => c.text.trim() !== '')) ||
        (b.gallery?.items && b.gallery.items.length > 0)
    );

  // Revision history only exists once the note has been persisted
  useEffect(() => {
    if (!isOpen || !noteId) {
      setRevisions([]);
      return;
    }
    setLoadingHistory(true);
    api
      .getRevisions(noteId)
      .then(setRevisions)
      .catch(() => setRevisions([]))
      .finally(() => setLoadingHistory(false));
  }, [isOpen, noteId, savedAt]);

  // Autosave a draft so an accidental close doesn't lose work
  useEffect(() => {
    if (!isOpen || !hasContent) return;
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      api.saveDraft(draftKey, payload).catch(() => {});
    }, 2500);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [payload, isOpen, hasContent, draftKey]);

  // Save via the Save button or ⌘/Ctrl+S
  const handleSave = useCallback(
    async (reason?: string) => {
      if (saving) return;
      setSaving(true);
      setError(null);
      const wasNew = noteId === null;
      try {
        const saved = wasNew
          ? await api.createNote(payload)
          : await api.updateNote(noteId, { ...payload, revisionReason: reason });
        setNoteId(saved.id);
        setSavedAt(saved.updatedAt);
        // Only flash the "saved" indicator for a manual save, not autosave.
        if (reason !== 'ذخیره خودکار') {
          setJustSaved(true);
          if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
          savedTimerRef.current = setTimeout(() => setJustSaved(false), 2000);
        }
        await api.deleteDraft(wasNew ? 'new-note' : saved.id).catch(() => {});
        await onSaved(saved, wasNew, reason);
      } catch (err: any) {
        setError(err.message || 'خطا در ذخیره');
      } finally {
        setSaving(false);
      }
    },
    [saving, payload, noteId, onSaved]
  );

  // Keep a fresh handleSave for the debounced autosave without adding `saving`
  // to its deps (which would re-fire after every save and loop).
  const handleSaveRef = useRef(handleSave);
  useEffect(() => {
    handleSaveRef.current = handleSave;
  });
  // Clear any pending "saved" toast timer on unmount.
  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  // Autosave: debounce the payload; skip while closed or when there's no content.
  // `saving` is deliberately not a dep — including it would re-arm the timer on
  // every completed save and loop forever.
  useEffect(() => {
    if (!autoSave || !hasContent || !isOpen) return;
    const t = setTimeout(() => handleSaveRef.current('ذخیره خودکار'), 1200);
    return () => clearTimeout(t);
  }, [autoSave, payload, hasContent, isOpen]);

  // Block operations
  const updateBlock = useCallback((bid: string, patch: Partial<NoteBlock>) => {
    setBlocks((prev) => prev.map((b) => (b.id === bid ? { ...b, ...patch } : b)));
  }, []);

  // Toolbar/shortcut emphasis: rewrites the focused block's text around the selection
  const runMark = useCallback(
    (mark: string) => {
      flushTypingBurst();
      const result = applyMark(mark);
      if (result?.id) updateBlock(result.id, { text: result.text });
    },
    [updateBlock, flushTypingBurst]
  );

  const handleSelectHighlightColor = useCallback(
    (cid: HighlightColorId) => {
      setHighlightColor(cid);
      try {
        localStorage.setItem('notes-highlightColor', cid);
      } catch {
        /* ignore */
      }
      const el = document.activeElement;
      if (
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.closest('[data-rich-editor="true"]'))
      ) {
        runMark(`highlight:${cid}`);
      }
    },
    [runMark]
  );

  const handleUndo = useCallback(() => {
    if (burstTimerRef.current) {
      clearTimeout(burstTimerRef.current);
      burstTimerRef.current = null;
    }
    burstActiveRef.current = false;
    if (pastRef.current.length === 0) return;

    const prevSnap = pastRef.current.pop()!;
    futureRef.current.push(cloneSnapshot(latestSnapRef.current));
    const restored = cloneSnapshot(prevSnap);
    isApplyingHistoryRef.current = true;
    committedRef.current = cloneSnapshot(restored);
    latestSnapRef.current = restored;
    setTitle(restored.title);
    setBlocks(restored.blocks);
    setSummary(restored.summary);
    setActiveBlockId((cur) => (cur && restored.blocks.some((b) => b.id === cur) ? cur : null));
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const handleRedo = useCallback(() => {
    if (burstTimerRef.current) {
      clearTimeout(burstTimerRef.current);
      burstTimerRef.current = null;
    }
    burstActiveRef.current = false;
    if (futureRef.current.length === 0) return;

    const nextSnap = futureRef.current.pop()!;
    pastRef.current.push(cloneSnapshot(latestSnapRef.current));
    const restored = cloneSnapshot(nextSnap);
    isApplyingHistoryRef.current = true;
    committedRef.current = cloneSnapshot(restored);
    latestSnapRef.current = restored;
    setTitle(restored.title);
    setBlocks(restored.blocks);
    setSummary(restored.summary);
    setActiveBlockId((cur) => (cur && restored.blocks.some((b) => b.id === cur) ? cur : null));
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const handleExportPdf = useCallback(() => {
    if (!onDownloadPdf) return;
    const noteForPdf: Note = {
      ...(payload as any),
      id: noteId || 'preview-note',
      createdAt: note?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onDownloadPdf(noteForPdf);
  }, [onDownloadPdf, payload, noteId, note]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const code = e.code;

      if (mod && (key === 's' || code === 'KeyS')) {
        e.preventDefault();
        handleSave();
      } else if (mod && (key === 'p' || code === 'KeyP')) {
        e.preventDefault();
        handleExportPdf();
      } else if (mod && (key === 'z' || code === 'KeyZ')) {
        const activeEl = document.activeElement as HTMLElement | null;
        const inAuxiliaryInput =
          activeEl === searchInputRef.current ||
          Boolean(activeEl?.closest('aside, [data-native-undo="true"]'));
        if (!inAuxiliaryInput) {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        }
      } else if (mod && !e.shiftKey && (key === 'y' || code === 'KeyY')) {
        const activeEl = document.activeElement as HTMLElement | null;
        const inAuxiliaryInput =
          activeEl === searchInputRef.current ||
          Boolean(activeEl?.closest('aside, [data-native-undo="true"]'));
        if (!inAuxiliaryInput) {
          e.preventDefault();
          handleRedo();
        }
      } else if (mod && e.shiftKey && (key === 'x' || code === 'KeyX')) {
        e.preventDefault();
        runMark('strike');
      } else if (mod && (key === 'b' || code === 'KeyB')) {
        e.preventDefault();
        runMark('bold');
      } else if (mod && (key === 'i' || code === 'KeyI')) {
        e.preventDefault();
        runMark('italic');
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleSave, handleExportPdf, onClose, runMark, handleUndo, handleRedo]);

  const deleteBlock = useCallback(
    (bid: string) => {
      const target = blocks.find((b) => b.id === bid);
      if (target?.attachmentId) pendingOrphanRef.current.push(target.attachmentId);
      if (target?.type === 'mediaGallery') (target.gallery?.items || []).forEach((it) => pendingOrphanRef.current.push(it.attachmentId));
      setBlocks((prev) => {
        const next = prev.filter((b) => b.id !== bid);
        return next.length > 0 ? next : [createBlock('paragraph')];
      });
    },
    [blocks]
  );

  const moveBlock = useCallback((bid: string, dir: -1 | 1) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === bid);
      const target = idx + dir;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  // Insert a new block below the currently selected (last active) block. When
  // none is selected it falls back to appending at the very end.
  const insertAfterActive = useCallback((newBlock: NoteBlock) => {
    setBlocks((prev) => {
      const activeId = lastActiveBlockIdRef.current;
      const idx = activeId ? prev.findIndex((b) => b.id === activeId) : -1;
      if (idx === -1) return [...prev, newBlock];
      const next = [...prev];
      next.splice(idx + 1, 0, newBlock);
      return next;
    });
    setActiveBlockId(newBlock.id);
    lastActiveBlockIdRef.current = newBlock.id;
  }, []);

  const focusRichBlock = useCallback((blockId: string) => {
    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(
        `[data-block-id="${blockId}"] [data-rich-editor="true"], [data-block-id="${blockId}"] textarea`
      );
      target?.focus();
    });
  }, []);

  const insertBlock = useCallback(
    (type: NoteBlock['type'], overrides?: Partial<NoteBlock>, opts?: { atEnd?: boolean }) => {
      const newBlock = createBlock(type, overrides);
      if (opts?.atEnd) {
        setBlocks((prev) => [...prev, newBlock]);
        setActiveBlockId(newBlock.id);
        lastActiveBlockIdRef.current = newBlock.id;
      } else {
        insertAfterActive(newBlock);
      }
      focusRichBlock(newBlock.id);
    },
    [insertAfterActive, focusRichBlock]
  );

  // Insert a whole list of blocks right below the last active block.
  const insertBlocksAfterActive = useCallback((newBlocks: NoteBlock[]) => {
    if (!newBlocks.length) return;
    setBlocks((prev) => {
      const activeId = lastActiveBlockIdRef.current;
      const idx = activeId ? prev.findIndex((b) => b.id === activeId) : -1;
      if (idx === -1) return [...prev, ...newBlocks];
      const next = [...prev];
      next.splice(idx + 1, 0, ...newBlocks);
      return next;
    });
    const last = newBlocks[newBlocks.length - 1];
    setActiveBlockId(last.id);
    lastActiveBlockIdRef.current = last.id;
  }, []);

  // Import pasted text as one paragraph block per line, below the active block.
  const handleImportText = useCallback(() => {
    const lines = importText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const newBlocks = lines.map((text) => createBlock('paragraph', { text }));
    insertBlocksAfterActive(newBlocks.length ? newBlocks : [createBlock('paragraph')]);
    setImportText('');
    setImportOpen(false);
  }, [importText, insertBlocksAfterActive]);

  const runCommand = useCallback(
    (bid: string, command: string) => {
      if (command === 'insert_after') {
        const created = createBlock('paragraph');
        setBlocks((prev) => {
          const idx = prev.findIndex((b) => b.id === bid);
          if (idx === -1) return prev;
          const next = [...prev];
          next.splice(idx + 1, 0, created);
          return next;
        });
        setActiveBlockId(created.id);
        lastActiveBlockIdRef.current = created.id;
        focusRichBlock(created.id);
        return;
      }

      if (command === 'merge_up') {
        let prevFocusId: string | null = null;
        setBlocks((prev) => {
          const idx = prev.findIndex((b) => b.id === bid);
          // Never delete the only block, and never merge into a non-text block
          if (idx <= 0) return prev;
          const above = prev[idx - 1];
          if (above.type === 'media' || above.type === 'divider' || above.type === 'checklist') return prev;
          prevFocusId = above.id;
          const next = [...prev];
          next.splice(idx, 1);
          return next;
        });
        if (prevFocusId) {
          focusRichBlock(prevFocusId);
        }
      }
    },
    [focusRichBlock]
  );

  // Unified toolbar action: pick files and add them as a single media block
  // (one file) or a paginated gallery block (several files).
  const handleAddMedia = useCallback(async () => {
    const files = await pickMediaFiles(true);
    if (!files.length) return;
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    try {
      const uploaded = await uploadMediaFiles(files, (p) => setUploadProgress(p), controller.signal);
      setAttachments((prev) => [...prev, ...uploaded]);
      // Always insert a gallery so more media can be added later.
      const created = createBlock('mediaGallery', {
        gallery: { items: uploaded.map((u) => ({ attachmentId: u.id })) },
      });
      insertAfterActive(created);
      setTimeout(() => setUploadProgress(null), 1800);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setError(err.message || 'خطا در بارگذاری فایل');
      setUploadProgress({
        currentFileIndex: 1,
        totalFiles: files.length,
        currentFileName: files[0]?.name || '',
        currentFilePercent: 0,
        currentFileLoaded: 0,
        currentFileSize: files[0]?.size || 0,
        overallPercent: 0,
        stage: 'error',
      });
      setTimeout(() => setUploadProgress(null), 3000);
    } finally {
      uploadAbortRef.current = null;
    }
  }, []);

  const handlePickMedia = useCallback(
    async (bid?: string) => {
      const files = await pickMediaFiles(false);
      const file = files[0];
      if (!file) return;
      const controller = new AbortController();
      uploadAbortRef.current = controller;
      try {
        const uploaded = (await uploadMediaFiles([file], (p) => setUploadProgress(p), controller.signal))[0];
        setAttachments((prev) => [...prev, uploaded]);
        if (bid) {
          const old = blocks.find((b) => b.id === bid);
          if (old?.attachmentId && old.attachmentId !== uploaded.id) pendingOrphanRef.current.push(old.attachmentId);
          setBlocks((prev) => prev.map((b) => (b.id === bid ? { ...b, type: 'media' as const, attachmentId: uploaded.id } : b)));
        } else {
          const created = createBlock('media', { attachmentId: uploaded.id });
          insertAfterActive(created);
        }
        setTimeout(() => setUploadProgress(null), 1800);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        setError(err.message || 'خطا در بارگذاری فایل');
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
    },
    [blocks]
  );

  // Append uploaded files to an existing gallery block
  const handleAddGalleryItems = useCallback(async (bid: string) => {
    const files = await pickMediaFiles(true);
    if (!files.length) return;
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    try {
      const uploaded = await uploadMediaFiles(files, (p) => setUploadProgress(p), controller.signal);
      setAttachments((prev) => [...prev, ...uploaded]);
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === bid
            ? { ...b, gallery: { items: [...(b.gallery?.items || []), ...uploaded.map((u) => ({ attachmentId: u.id }))] } }
            : b
        )
      );
      setTimeout(() => setUploadProgress(null), 1800);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setError(err.message || 'خطا در بارگذاری فایل');
      setUploadProgress({
        currentFileIndex: 1,
        totalFiles: files.length,
        currentFileName: files[0]?.name || '',
        currentFilePercent: 0,
        currentFileLoaded: 0,
        currentFileSize: files[0]?.size || 0,
        overallPercent: 0,
        stage: 'error',
      });
      setTimeout(() => setUploadProgress(null), 3000);
    } finally {
      uploadAbortRef.current = null;
    }
  }, []);

  // Replace the media at a given gallery index with a freshly uploaded file
  const handleReplaceGalleryItem = useCallback(async (bid: string, index: number) => {
    const files = await pickMediaFiles(false);
    const file = files[0];
    if (!file) return;
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    try {
      const uploaded = (await uploadMediaFiles([file], (p) => setUploadProgress(p), controller.signal))[0];
      setAttachments((prev) => [...prev, uploaded]);
      const oldBlock = blocks.find((b) => b.id === bid);
      const oldId = oldBlock?.gallery?.items?.[index]?.attachmentId;
      if (oldId && oldId !== uploaded.id) pendingOrphanRef.current.push(oldId);
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === bid
            ? {
                ...b,
                gallery: {
                  items: (b.gallery?.items || []).map((it, i) => (i === index ? { ...it, attachmentId: uploaded.id } : it)),
                },
              }
            : b
        )
      );
      setTimeout(() => setUploadProgress(null), 1800);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setError(err.message || 'خطا در بارگذاری فایل');
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
  }, [blocks]);

  // Remove a gallery item at an index and orphan its attachment
  const handleRemoveGalleryItem = useCallback(
    (bid: string, index: number) => {
      const oldBlock = blocks.find((b) => b.id === bid);
      const oldId = oldBlock?.gallery?.items?.[index]?.attachmentId;
      if (oldId) pendingOrphanRef.current.push(oldId);
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === bid ? { ...b, gallery: { items: (b.gallery?.items || []).filter((_, i) => i !== index) } } : b
        )
      );
    },
    [blocks]
  );

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput('');
  };  // ---- Voice recording ----
  const finishRecording = async (blob: Blob, duration: number) => {
    setIsRecording(false);
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    if (recCancelledRef.current) {
      recCancelledRef.current = false;
      return;
    }
    if (!blob.size) return;
    const type = blob.type || 'audio/webm';
    const ext = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm';
    const fileName = `voice-${Date.now()}.${ext}`;

    setUploadProgress({
      currentFileIndex: 1,
      totalFiles: 1,
      currentFileName: fileName,
      currentFilePercent: 20,
      currentFileLoaded: 0,
      currentFileSize: blob.size,
      overallPercent: 20,
      stage: 'uploading',
    });

    try {
      const uploaded = await api.uploadBlob(
        blob,
        fileName,
        duration,
        (p) => {
          setUploadProgress({
            currentFileIndex: 1,
            totalFiles: 1,
            currentFileName: fileName,
            currentFilePercent: p.percent,
            currentFileLoaded: p.loadedBytes,
            currentFileSize: p.totalBytes,
            overallPercent: p.percent,
            stage: p.stage,
          });
        }
      );
      setAttachments((prev) => [...prev, uploaded]);
      const created = createBlock('media', { attachmentId: uploaded.id });
      insertAfterActive(created);
      setTimeout(() => setUploadProgress(null), 1800);
    } catch (err: any) {
      setError(err.message || 'خطا در بارگذاری فایل صوتی');
      setUploadProgress({
        currentFileIndex: 1,
        totalFiles: 1,
        currentFileName: fileName,
        currentFilePercent: 0,
        currentFileLoaded: 0,
        currentFileSize: blob.size,
        overallPercent: 0,
        stage: 'error',
      });
      setTimeout(() => setUploadProgress(null), 3000);
    }
  };

  const startRecording = async () => {
    if (isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((m) =>
          MediaRecorder.isTypeSupported(m)
        ) || '';
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        // Drop codec params (audio/webm;codecs=opus) — FileReader embeds them in
        // the data URL MIME, which the upload endpoint rejects.
        const mime = (recorder.mimeType || 'audio/webm').split(';')[0];
        const blob = new Blob(chunks, { type: mime });
        const duration = Math.max(1, Math.round((Date.now() - recStartRef.current) / 1000));
        finishRecording(blob, duration);
      };
      recorder.start(200);
      mediaRecorderRef.current = recorder;
      recChunksRef.current = chunks;
      recCancelledRef.current = false;
      recStartRef.current = Date.now();
      setRecSeconds(0);
      setIsRecording(true);
      recTimerRef.current = setInterval(
        () => setRecSeconds(Math.floor((Date.now() - recStartRef.current) / 1000)),
        500
      );
    } catch {
      setError('دسترسی به میکروفون ممکن نشد — مجوز دستگاه را بدهید');
    }
  };

  const stopRecording = () => mediaRecorderRef.current?.stop();

  const cancelRecording = () => {
    recCancelledRef.current = true;
    mediaRecorderRef.current?.stop();
  };

  // Stop and release the mic if the editor closes mid-recording
  useEffect(() => {
    return () => {
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      mediaRecorderRef.current?.stop();
    };
  }, []);

  const formatRecTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Attachments the user removed; once nothing references them, drop the
  // attachment entry and its file on disk.
  const pendingOrphanRef = useRef<string[]>([]);
  useEffect(() => {
    if (!pendingOrphanRef.current.length) return;
    const ids = pendingOrphanRef.current;
    pendingOrphanRef.current = [];
    const used = new Set<string>();
    blocks.forEach((b) => {
      if (b.type === 'media' && b.attachmentId) used.add(b.attachmentId);
      if (b.type === 'mediaGallery') (b.gallery?.items || []).forEach((it) => used.add(it.attachmentId));
    });
    ids.forEach((id) => {
      if (used.has(id)) return;
      const att = attachments.find((a) => a.id === id);
      setAttachments((prev) => prev.filter((a) => a.id !== id));
      if (att?.url.startsWith('/uploads/')) api.deleteUpload(att.url.replace('/uploads/', '')).catch(() => {});
    });
  }, [blocks, attachments]);

  const removeMedia = (attId: string) => {
    const att = attachments.find((a) => a.id === attId);
    setAttachments((prev) => prev.filter((a) => a.id !== attId));
    // Drop the media blocks that pointed at this file rather than leaving empty placeholders
    setBlocks((prev) => {
      const next = prev.filter((b) => !(b.type === 'media' && b.attachmentId === attId));
      return next.length > 0 ? next : [createBlock('paragraph')];
    });
    if (att?.url.startsWith('/uploads/')) {
      api.deleteUpload(att.url.replace('/uploads/', '')).catch(() => {});
    }
  };

  const restoreRevision = async (revId: string) => {
    if (!noteId) return;
    try {
      const restored = await api.restoreRevision(noteId, revId);
      initFromNote(restored);
      setRevisions(await api.getRevisions(noteId));
      await onSaved(restored, false);
    } catch (err: any) {
      setError(err.message || 'خطا در بازگردانی نسخه');
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const bid = e.dataTransfer.getData('text/block-id');
      setBlocks((prev) => {
        const from = prev.findIndex((b) => b.id === bid);
        if (from === -1 || draggedIndex === null || from === draggedIndex) return prev;
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(draggedIndex, 0, moved);
        return next;
      });
      setDraggedIndex(null);
    },
    [draggedIndex]
  );

  const blockCount = blocks.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-[#FAF9F5] dark:bg-[#12140E] flex flex-col anim-fade-in" dir="rtl">
      {/* Top bar */}
      <header className="shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2 border-b border-[#E1E4D5] dark:border-[#43493E] bg-[#FAF9F5]/95 dark:bg-[#12140E]/95 backdrop-blur">
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[#5E6258] dark:text-[#8F9285]"
          title="بستن (Esc)"
        >
          <ArrowRight className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان جزوه یا نکته..."
              className="flex-1 min-w-0 bg-transparent outline-none font-bold text-sm sm:text-base text-[#1A1C16] dark:text-[#E2E3DC] placeholder:text-[#8F9285]"
            />
            {justSaved && (
              <span className="flex items-center gap-1 text-[10px] text-[#8F9285] whitespace-nowrap">
                <Save className="w-3 h-3" />
                ذخیره شد
              </span>
            )}
          </div>
          {saving && (
            <div className="text-[10px] text-[#4A6D22] dark:text-[#D0E8B2] flex items-center gap-1">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              در حال ذخیره...
            </div>
          )}
          {error && <div className="text-[10px] text-[#A64D3B]">{error}</div>}
        </div>

        {/* Autosave toggle */}
        <label
          className="flex items-center gap-1.5 text-[10px] font-bold text-[#5E6258] dark:text-[#8F9285] cursor-pointer select-none"
          title="ذخیره خودکار پس از هر تغییر"
        >
          <input
            type="checkbox"
            checked={autoSave}
            onChange={(e) => {
              setAutoSave(e.target.checked);
              try {
                localStorage.setItem('notes-autoSave', e.target.checked ? '1' : '0');
              } catch {
                /* ignore */
              }
            }}
            className="peer sr-only"
          />
          <span
            className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#4A6D22]/40 ${
              autoSave
                ? 'bg-[#4A6D22] border-[#4A6D22] text-white'
                : 'bg-white dark:bg-[#12140E] border-[#E1E4D5] dark:border-[#43493E] text-transparent'
            }`}
          >
            <Check className="w-3 h-3" />
          </span>
          <span className="hidden sm:inline">ذخیره خودکار</span>
        </label>

        {/* Save button */}
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-2xl bg-[#4A6D22] hover:bg-[#3d5a1c] text-white text-xs font-bold shadow-sm disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          <span className="hidden sm:inline">ذخیره</span>
        </button>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Main editor column: toolbar + unified canvas */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Toolbar: search + block insert & WYSIWYG formatting */}
          <div className="shrink-0 px-3 sm:px-4 relative z-40">
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSearchOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                  isSearchOpen
                    ? 'bg-[#4A6D22] text-white shadow-xs'
                    : 'bg-[#EDEEEB] dark:bg-[#1C1C17] text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/10'
                }`}
                title="جستجو در متن جزوه"
              >
                <Search className="w-3.5 h-3.5" />
                <span>جستجو</span>
              </button>

              <div className="flex items-center gap-1 mr-auto">
                <span className="text-[10px] text-[#8F9285]">{wordCount} کلمه</span>
              </div>

              {onDownloadPdf && (
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#EDEEEB] dark:bg-[#1C1C17] hover:bg-black/5 dark:hover:bg-white/10 text-[#4A6D22] dark:text-[#D0E8B2] text-[11px] font-bold transition-colors"
                  title="خروجی PDF و چاپ (Ctrl+P)"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">خروجی PDF</span>
                </button>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="w-9 h-9 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[#5E6258] dark:text-[#8F9285]"
                  title="بیشتر"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {menuOpen && (
                  <>
                    {/* Above EditorToolbar (z-40) and below the dropdown menu (z-50) */}
                    <div className="fixed inset-0 z-[45]" onClick={() => setMenuOpen(false)} />
                    <div className="absolute left-0 top-10 z-50 w-52 bg-white dark:bg-[#1C1C17] rounded-2xl border border-[#E1E4D5] dark:border-[#43493E] shadow-2xl p-1.5">
                      {onDownloadPdf && (
                        <button
                          type="button"
                          onClick={() => {
                            handleExportPdf();
                            setMenuOpen(false);
                          }}
                          className="w-full text-right px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-xs font-bold flex items-center gap-2 text-[#4A6D22] dark:text-[#D0E8B2]"
                        >
                          <Printer className="w-4 h-4" /> خروجی PDF و چاپ
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setActivePanel((cur) => (cur === 'settings' ? null : 'settings'));
                          setMenuOpen(false);
                        }}
                        className={`w-full text-right px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-xs font-bold flex items-center justify-between gap-2 ${
                          activePanel === 'settings' ? 'bg-[#D0E8B2]/35 dark:bg-[#324B10]/40 text-[#4A6D22] dark:text-[#D0E8B2]' : ''
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Palette className="w-4 h-4 text-[#4A6D22]" /> تنظیمات
                        </span>
                        {activePanel === 'settings' && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActivePanel((cur) => (cur === 'attachments' ? null : 'attachments'));
                          setMenuOpen(false);
                        }}
                        className={`w-full text-right px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-xs font-bold flex items-center justify-between gap-2 ${
                          activePanel === 'attachments' ? 'bg-[#D0E8B2]/35 dark:bg-[#324B10]/40 text-[#4A6D22] dark:text-[#D0E8B2]' : ''
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-[#8B6814]" /> پیوست‌ها
                        </span>
                        {activePanel === 'attachments' && <Check className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActivePanel((cur) => (cur === 'history' ? null : 'history'));
                          setMenuOpen(false);
                        }}
                        className={`w-full text-right px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-xs font-bold flex items-center justify-between gap-2 ${
                          activePanel === 'history' ? 'bg-[#D0E8B2]/35 dark:bg-[#324B10]/40 text-[#4A6D22] dark:text-[#D0E8B2]' : ''
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <History className="w-4 h-4 text-[#36667F]" /> تاریخچه نسخه
                        </span>
                        {activePanel === 'history' && <Check className="w-3.5 h-3.5" />}
                      </button>
                      {!isTrashView && noteId && (
                        <button
                          type="button"
                          onClick={() => {
                            onDelete?.(noteId);
                            onClose();
                            setMenuOpen(false);
                          }}
                          className="w-full text-right px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-xs font-bold text-[#A64D3B] flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> حذف
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            <EditorToolbar
              onCommand={runMark}
              onInsertBlock={insertBlock}
              onAddMedia={handleAddMedia}
              onRecord={startRecording}
              onImportText={() => setImportOpen(true)}
              activeMarks={activeMarks}
              highlightColor={highlightColor}
              onSelectHighlightColor={handleSelectHighlightColor}
              activeHighlightColor={activeHighlightColor}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={handleUndo}
              onRedo={handleRedo}
            />
          </div>

          {/* Unified Rendered Editing Canvas */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6 py-4" ref={containerRef}>
            <div className="max-w-3xl mx-auto space-y-3">
            {/* Expandable Search Bar */}
            {isSearchOpen && (
              <div className="sticky top-0 z-30 pt-1 pb-2 bg-[#FAF9F6]/95 dark:bg-[#1C1C17]/95 backdrop-blur-md rounded-2xl border border-[#D0E8B2] dark:border-[#3D522C] p-2 sm:p-2.5 shadow-md transition-all animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 min-w-[180px] bg-white dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] focus-within:border-[#4A6D22] dark:focus-within:border-[#D0E8B2] px-3 py-1.5 rounded-xl transition-all">
                    <Search className="w-4 h-4 shrink-0 text-[#4A6D22] dark:text-[#D0E8B2]" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (totalMatches > 0) {
                            setActiveMatchIndex((prev) =>
                              e.shiftKey ? (prev - 1 + totalMatches) % totalMatches : (prev + 1) % totalMatches
                            );
                          }
                        } else if (e.key === 'Escape') {
                          setIsSearchOpen(false);
                          setSearchQuery('');
                        }
                      }}
                      placeholder="جستجو در متن، فرمول‌ها، چک‌لیست و جدول‌های جزوه..."
                      className="w-full bg-transparent text-xs sm:text-sm text-[#1A1C16] dark:text-[#E2E3DC] placeholder-[#8F9285] outline-none"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          searchInputRef.current?.focus();
                        }}
                        className="p-1 rounded-lg text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        title="پاک کردن جستجو"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {searchQuery.trim() && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-[#EDEEEB] dark:bg-[#12140E] text-[#5E6258] dark:text-[#8F9285] flex items-center gap-1">
                        {totalMatches > 0 ? (
                          <>
                            <span className="text-[#4A6D22] dark:text-[#D0E8B2] font-black">{activeMatchIndex + 1}</span>
                            <span>از</span>
                            <span className="font-bold">{totalMatches}</span>
                            <span className="hidden sm:inline">مورد</span>
                          </>
                        ) : (
                          <span className="text-[#A64D3B] dark:text-[#FF8A75]">نتیجه‌ای یافت نشد</span>
                        )}
                      </span>

                      {totalMatches > 0 && (
                        <div className="flex items-center gap-0.5 bg-[#EDEEEB] dark:bg-[#12140E] rounded-xl p-0.5">
                          <button
                            type="button"
                            onClick={() => setActiveMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches)}
                            className="p-1 rounded-lg text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            title="مورد قبلی (Shift+Enter)"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveMatchIndex((prev) => (prev + 1) % totalMatches)}
                            className="p-1 rounded-lg text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            title="مورد بعدی (Enter)"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setFilterMatchesOnly(!filterMatchesOnly)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-bold transition-colors ${
                          filterMatchesOnly
                            ? 'bg-[#4A6D22] text-white shadow-xs'
                            : 'bg-[#EDEEEB] dark:bg-[#12140E] text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/10'
                        }`}
                        title="فقط نمایش بلوک‌های شامل عبارت جستجو"
                      >
                        <Filter className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">فقط نتایج</span>
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsSearchOpen(false)}
                    className="p-1.5 rounded-xl bg-[#EDEEEB] dark:bg-[#12140E] text-[#5E6258] dark:text-[#8F9285] hover:text-[#1A1C16] dark:hover:text-[#E2E3DC] hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
                    title="بستن کادر جستجو"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {summary?.trim() && (
              <div className="p-3 rounded-2xl bg-[#EDF5E0] dark:bg-[#232F1A] border border-[#D0E8B2] dark:border-[#3D522C] text-xs text-[#4A6D22] dark:text-[#D0E8B2] leading-relaxed">
                {summary}
              </div>
            )}

            <div ref={blocksContainerRef} className="space-y-1.5 pb-24" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
              {displayedBlocks.map((block, idx) => {
                const isMatched = Boolean(searchQuery.trim() && blockMatchesQuery(block, searchQuery));
                const isActiveMatch = Boolean(searchQuery.trim() && activeMatchBlockId === block.id);
                return (
                  <div
                    key={block.id}
                    id={`editor-block-${block.id}`}
                    data-block-id={block.id}
                    onDragEnter={() => setDraggedIndex(idx)}
                    className={`transition-all duration-200 rounded-2xl ${
                      isActiveMatch
                        ? 'ring-2 ring-[#4A6D22] bg-[#EDF5E0] dark:bg-[#232F1A] p-1.5 shadow-md'
                        : isMatched
                        ? 'bg-[#F5F8F0]/70 dark:bg-[#1E2618]/50 p-1'
                        : ''
                    }`}
                  >
                    <BlockEditor
                      block={block}
                      attachments={attachments}
                      commandExecutor={runCommand}
                      onUpdate={updateBlock}
                      onDelete={deleteBlock}
                      onMove={moveBlock}
                      onPickMedia={handlePickMedia}
                      onZoomImage={(url) => setZoomedImage(url)}
                      onAddGalleryItems={handleAddGalleryItems}
                      onReplaceGalleryItem={handleReplaceGalleryItem}
                      onRemoveGalleryItem={handleRemoveGalleryItem}
                      active={activeBlockId === block.id}
                      searchQuery={searchQuery}
                      onActivateChange={(isActive) => {
                        // Keep the anchor even on blur: by the time the toolbar
                        // button is clicked the active block has blurred, so the
                        // blur callback (with this block's id) is what preserves
                        // which block a new block should be inserted below.
                        lastActiveBlockIdRef.current = block.id;
                        setActiveBlockId(isActive ? block.id : null);
                      }}
                    />
                  </div>
                );
              })}

              {/* Inline add button at the end */}
              <button
                type="button"
                onClick={() => insertBlock('paragraph', undefined, { atEnd: true })}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-[#E1E4D5] dark:border-[#43493E] text-[#8F9285] hover:text-[#4A6D22] hover:border-[#D0E8B2] dark:hover:text-[#D0E8B2] text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                بلوک جدید
              </button>
            </div>
          </div>

          <FloatingSelectionToolbar
            containerRef={blocksContainerRef}
            onCommand={runMark}
            activeMarks={activeMarks}
            activeHighlightColor={activeHighlightColor}
          />
          </div>
        </div>

        {/* Import-text popover */}
        {importOpen && (
          <div className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center p-4" onClick={() => setImportOpen(false)}>
            <div className="w-full max-w-lg rounded-2xl bg-[#FAF9F6] dark:bg-[#1C1C17] border border-[#E1E4D5] dark:border-[#43493E] p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-[#1A1C16] dark:text-[#E2E3DC]">ایمپورت متن</h4>
                <button type="button" onClick={() => setImportOpen(false)} className="p-1.5 rounded-lg text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/10" title="بستن">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                autoFocus
                data-native-undo="true"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="متن را اینجا بچسبانید... هر خط یک بلوک جدا می‌شود"
                dir="auto"
                className="w-full h-40 p-3 rounded-xl bg-white dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] text-xs text-[#1A1C16] dark:text-[#E2E3DC] outline-none focus:border-[#4A6D22] resize-y"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button type="button" onClick={() => setImportOpen(false)} className="px-3 py-1.5 rounded-xl text-xs font-bold text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/10">
                  انصراف
                </button>
                <button type="button" onClick={handleImportText} className="px-4 py-1.5 rounded-xl bg-[#4A6D22] hover:bg-[#3B571B] text-white text-xs font-bold">
                  درج متن
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Side settings / history panel — a slide-over on small screens, a dedicated column on desktop */}
        {activePanel && (
          <>
            <div
              className="lg:hidden fixed inset-0 z-[82] bg-black/40"
              onClick={() => setActivePanel(null)}
            />
            <aside className="fixed lg:static inset-y-0 left-0 z-[85] lg:z-auto w-80 max-w-[85vw] shrink-0 border-r border-[#E1E4D5] dark:border-[#43493E] overflow-y-auto bg-[#FAF9F5] dark:bg-[#12140E] lg:bg-[#F5F6EE]/40 lg:dark:bg-[#1C1C17]/20">
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-[#E1E4D5]/70 dark:border-[#43493E]/70 bg-[#FAF9F5]/95 dark:bg-[#12140E]/95 lg:bg-[#F5F6EE]/95 lg:dark:bg-[#1C1C17]/95 backdrop-blur-sm">
                <span className="text-xs font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                  {activePanel === 'settings' ? 'تنظیمات' : activePanel === 'attachments' ? 'پیوست‌ها' : 'تاریخچه'}
                </span>
                <button
                  type="button"
                  onClick={() => setActivePanel(null)}
                  className="w-8 h-8 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[#5E6258] dark:text-[#8F9285] transition-colors"
                  title="بستن پنل"
                  aria-label="بستن پنل"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {activePanel === 'settings' && (
                <SettingsPanel
                  categories={categories}
                  categoryId={categoryId}
                  setCategoryId={setCategoryId}
                  color={color}
                  setColor={setColor}
                  importance={importance}
                  setImportance={setImportance}
                  isPinned={isPinned}
                  setIsPinned={setIsPinned}
                  isImportant={isImportant}
                  setIsImportant={setIsImportant}
                  tags={tags}
                  setTags={setTags}
                  tagInput={tagInput}
                  setTagInput={setTagInput}
                  onAddTag={addTag}
                  summary={summary}
                  setSummary={setSummary}
                  onOpenCategoryManager={onOpenCategoryManager}
                />
              )}
              {activePanel === 'attachments' && (
                <AttachmentsPanel attachments={attachments} onAdd={() => handlePickMedia()} onRemove={removeMedia} />
              )}
              {activePanel === 'history' && (
                <HistoryPanel
                  loading={loadingHistory}
                  revisions={revisions}
                  onRestore={restoreRevision}
                  savedAt={savedAt}
                />
              )}
            </aside>
          </>
        )}
      </div>

      {/* Floating voice-recording control */}
      {isRecording && (
        <div className="fixed bottom-6 inset-x-0 z-[90] flex justify-center pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#1C1C17] dark:bg-black/70 border border-[#43493E] shadow-2xl text-white">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A64D3B] opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#A64D3B]" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-bold text-[#FFAB91]">در حال ضبط</span>
              <span dir="ltr" className="text-sm font-mono tabular-nums">{formatRecTime(recSeconds)}</span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#D0E8B2] text-[#1A3700] text-[10px] font-bold hover:bg-[#b9db8f] transition-colors"
              title="پایان و ذخیره در جزوه"
            >
              <span className="w-2.5 h-2.5 bg-[#1A3700] rounded-sm inline-block" />
              پایان و ذخیره
            </button>
            <button
              type="button"
              onClick={cancelRecording}
              className="p-2 rounded-xl text-[#8F9285] hover:bg-white/10 transition-colors"
              title="انصراف"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating upload progress indicator */}
      <UploadProgressBar
        progress={uploadProgress}
        onCancel={handleCancelUpload}
        onDismiss={() => setUploadProgress(null)}
      />

      {/* Image Zoom Lightbox */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <button
            type="button"
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 left-4 p-2.5 rounded-2xl bg-white/15 text-white hover:bg-white/30"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={zoomedImage}
            alt="نمایش کامل تصویر"
            className="max-w-full max-h-[88vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

/* ---------- Settings ---------- */
interface SettingsPanelProps {
  categories: Category[];
  categoryId: string;
  setCategoryId: (v: string) => void;
  color: string;
  setColor: (v: string) => void;
  importance: ImportanceLevel;
  setImportance: (v: ImportanceLevel) => void;
  isPinned: boolean;
  setIsPinned: (v: boolean) => void;
  isImportant: boolean;
  setIsImportant: (v: boolean) => void;
  tags: string[];
  setTags: (v: string[]) => void;
  tagInput: string;
  setTagInput: (v: string) => void;
  onAddTag: () => void;
  summary: string;
  setSummary: (v: string) => void;
  onOpenCategoryManager?: () => void;
}

const label = 'text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285] mb-1.5 flex items-center gap-1';

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  categories,
  categoryId,
  setCategoryId,
  color,
  setColor,
  importance,
  setImportance,
  isPinned,
  setIsPinned,
  isImportant,
  setIsImportant,
  tags,
  setTags,
  tagInput,
  setTagInput,
  onAddTag,
  summary,
  setSummary,
  onOpenCategoryManager,
}) => {
  const flatCategoryOptions = useMemo(() => getFlattenedCategoryTree(categories), [categories]);
  const activePathString = useMemo(
    () => (categoryId ? getCategoryPathString(categoryId, categories) : ''),
    [categoryId, categories]
  );

  return (
  <div className="p-4 space-y-5">
    <div>
      <div className={label}>موضوع / دسته‌بندی و زیرمجموعه</div>
      <div className="flex items-center gap-2">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="flex-1 bg-[#EDEEEB] dark:bg-[#1C1C17] rounded-xl px-3 py-2 text-xs font-bold text-[#1A1C16] dark:text-[#E2E3DC] outline-none border border-transparent focus:border-[#4A6D22]"
        >
          <option value="">بدون موضوع</option>
          {flatCategoryOptions.map((opt) => (
            <option key={opt.category.id} value={opt.category.id}>
              {'— '.repeat(opt.depth)} {opt.category.name}
            </option>
          ))}
        </select>
        {onOpenCategoryManager && (
          <button type="button" onClick={onOpenCategoryManager} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5E6258] dark:text-[#8F9285]" title="مدیریت دسته‌ها و زیرمجموعه‌ها">
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
      {activePathString && (
        <div className="text-[10px] text-[#4A6D22] dark:text-[#D0E8B2] mt-1.5 px-2 py-1 rounded-lg bg-[#D0E8B2]/20 dark:bg-[#1A3700]/50 border border-[#D0E8B2]/30 dark:border-[#3D522C]">
          مسیر کامل: {activePathString}
        </div>
      )}
    </div>

    <div>
      <div className={label}>رنگ پس‌زمینه</div>
      <div className="flex flex-wrap gap-2">
        {PALETTE.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setColor(p.id)}
            className={`w-8 h-8 rounded-2xl border-2 transition-all ${
              color === p.id ? 'border-[#4A6D22] scale-110 shadow-md' : 'border-[#E1E4D5] dark:border-[#43493E]'
            }`}
            style={{ background: p.swatch }}
            title={p.id}
          />
        ))}
      </div>
    </div>

    <div>
      <div className={label}>درجه اهمیت</div>
      <div className="grid grid-cols-3 gap-1.5">
        {IMPORTANCE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setImportance(opt.value)}
            className={`flex flex-col items-center gap-0.5 py-2 rounded-xl text-[10px] font-bold border transition-colors ${
              importance === opt.value
                ? 'bg-[#D0E8B2] border-[#4A6D22] text-[#1A3700]'
                : 'bg-[#EDEEEB] dark:bg-[#1C1C17] border-transparent text-[#5E6258] dark:text-[#8F9285]'
            }`}
          >
            <opt.icon className="w-4 h-4" />
            {opt.label}
          </button>
        ))}
      </div>
    </div>

    <div className="flex flex-col gap-1.5">
      <div className={label}>برچسب‌ها</div>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 bg-[#EDEEEB] dark:bg-[#1C1C17] px-2 py-1 rounded-full text-[10px] font-bold text-[#4A6D22] dark:text-[#D0E8B2]">
            #{t}
            <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="text-[#8F9285] hover:text-[#A64D3B]">×</button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-[10px] text-[#8F9285]">برچسبی ثبت نشده</span>}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddTag(); } }}
          placeholder="افزودن برچسب..."
          className="flex-1 bg-[#EDEEEB] dark:bg-[#1C1C17] rounded-xl px-3 py-2 text-xs text-[#1A1C16] dark:text-[#E2E3DC] outline-none border border-transparent focus:border-[#4A6D22]"
        />
        <button type="button" onClick={onAddTag} className="p-2 rounded-xl bg-[#4A6D22] text-white hover:bg-[#3d5a1c]">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>

    <div>
      <div className={label}>خلاصه / نکات کلیدی</div>
      <textarea
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        placeholder="خلاصه‌ای از نکات مهم این جزوه..."
        rows={3}
        className="w-full bg-[#EDEEEB] dark:bg-[#1C1C17] rounded-xl px-3 py-2 text-xs text-[#1A1C16] dark:text-[#E2E3DC] outline-none border border-transparent focus:border-[#4A6D22] resize-none"
      />
    </div>

    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setIsPinned(!isPinned)}
        className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-colors flex items-center justify-center gap-1.5 ${isPinned ? 'bg-[#D0E8B2] border-[#4A6D22] text-[#1A3700]' : 'bg-[#EDEEEB] dark:bg-[#1C1C17] border-transparent text-[#5E6258] dark:text-[#8F9285]'}`}
      >
        <Pin className="w-3.5 h-3.5" />
        سنجاق
      </button>
      <button
        type="button"
        onClick={() => setIsImportant(!isImportant)}
        className={`flex-1 py-2 rounded-xl text-[11px] font-bold border transition-colors flex items-center justify-center gap-1.5 ${isImportant ? 'bg-[#FFE086]/40 border-[#8B6814] text-[#8B6814] dark:text-[#FFE086]' : 'bg-[#EDEEEB] dark:bg-[#1C1C17] border-transparent text-[#5E6258] dark:text-[#8F9285]'}`}
      >
        <Star className="w-3.5 h-3.5" />
        نکته طلایی
      </button>
    </div>
  </div>
  );
};

/* ---------- Attachments ---------- */
const AttachmentsPanel: React.FC<{
  attachments: NoteAttachment[];
  onAdd: () => void;
  onRemove: (id: string) => void;
}> = ({ attachments, onAdd, onRemove }) => (
  <div className="p-4 space-y-3">
    <div className="text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285]">فایل‌های پیوست</div>
    <button type="button" onClick={onAdd} className="w-full py-3 rounded-2xl border-2 border-dashed border-[#4A6D22]/40 text-[#4A6D22] dark:text-[#D0E8B2] hover:bg-[#EDF5E0] dark:hover:bg-[#232F1A] text-xs font-bold flex items-center justify-center gap-2">
      <Plus className="w-4 h-4" /> افزودن فایل
    </button>
    {attachments.length === 0 ? (
      <p className="text-[10px] text-[#8F9285] text-center py-4">هنوز فایلی اضافه نشده است. در حالت ویرایش از دکمه + روی بلوک رسانه استفاده کنید.</p>
    ) : (
      attachments.map((att) => (
        <div key={att.id} className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[#EDEEEB] dark:bg-[#1C1C17]">
          <div className="w-8 h-8 rounded-xl bg-[#D0E8B2]/40 dark:bg-[#324B10]/60 text-[#4A6D22] dark:text-[#D0E8B2] flex items-center justify-center">
            <AttachmentIcon type={att.type} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold truncate text-[#1A1C16] dark:text-[#E2E3DC]">{att.name}</div>
            <div className="text-[9px] text-[#8F9285]">{att.type} · {formatBytes(att.size)}</div>
          </div>
          <button type="button" onClick={() => onRemove(att.id)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#8F9285] hover:text-[#A64D3B]">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))
    )}
  </div>
);

/* ---------- History ---------- */
const HistoryPanel: React.FC<{ loading: boolean; revisions: NoteRevision[]; onRestore: (id: string) => void; savedAt: string | null }> = ({
  loading,
  revisions,
  onRestore,
  savedAt,
}) => (
  <div className="p-4 space-y-2">
    <div className="text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285] flex items-center gap-1">
      <FileClock className="w-3.5 h-3.5" /> تاریخچه نسخه‌ها
    </div>
    {savedAt && (
      <div className="text-[10px] text-[#4A6D22] dark:text-[#D0E8B2] bg-[#EDF5E0] dark:bg-[#232F1A] rounded-xl p-2.5">
        آخرین ذخیره: {new Date(savedAt).toLocaleString('fa-IR')}
      </div>
    )}
    {loading ? (
      <div className="flex items-center gap-2 text-[10px] text-[#8F9285] py-4 justify-center">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> در حال بارگذاری...
      </div>
    ) : revisions.length === 0 ? (
      <p className="text-[10px] text-[#8F9285] text-center py-4">هنوز نسخه‌ای ثبت نشده است. با هر ذخیره، یک نسخه ایجاد می‌شود.</p>
    ) : (
      <div className="space-y-1.5">
        {revisions.map((rev, i) => (
          <div key={rev.revisionId} className="flex items-center gap-2 p-2.5 rounded-2xl bg-[#EDEEEB] dark:bg-[#1C1C17]">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold text-[#1A1C16] dark:text-[#E2E3DC] truncate">{rev.title || 'بدون عنوان'}</div>
              <div className="text-[9px] text-[#8F9285]">
                {new Date(rev.savedAt).toLocaleString('fa-IR')} · {rev.wordCount} کلمه
              </div>
            </div>
            {i !== 0 && (
              <button type="button" onClick={() => onRestore(rev.revisionId)} className="px-2.5 py-1.5 rounded-lg bg-[#4A6D22] text-white text-[10px] font-bold hover:bg-[#3d5a1c]">
                بازگردانی
              </button>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);
