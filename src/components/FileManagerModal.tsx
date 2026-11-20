import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  X,
  Upload,
  FolderPlus,
  Folder,
  FolderOpen,
  FileText,
  FileArchive,
  FileImage,
  FileAudio,
  FileVideo,
  FileCode,
  File as FileIcon,
  Download,
  Trash2,
  Pencil,
  Check,
  Search,
  LayoutGrid,
  List,
  ArrowRight,
  ChevronLeft,
  Eye,
  FolderInput,
  Loader2,
  AlertCircle,
  HardDrive,
  Cloud,
  Lock,
  RefreshCw,
  Send,
} from 'lucide-react';
import { ManagedFile, ManagedFolder, NoteAttachment } from '../types';
import { api, apiFetch, ApiError, UploadProgressInfo } from '../services/api';
import { useBackButton } from '../lib/useBackButton';
import { DocumentViewerModal } from './DocumentViewerModal';
import {
  getFileExtension,
  getFileCategory,
  AUDIO_EXTENSIONS,
  PDF_EXTENSIONS,
  OFFICE_EXTENSIONS,
  CODE_EXTENSIONS,
  MD_EXTENSIONS,
  TXT_EXTENSIONS,
} from '../lib/fileViewerUtils';

interface FileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTelegramSettings?: () => void;
  telegramRefreshKey?: number;
  onTelegramStatusChange?: (ready: boolean) => void;
}

type FileTypeFilter = 'all' | 'pdf' | 'archive' | 'media' | 'other';
type SortKey = 'newest' | 'name' | 'size';
type ViewMode = 'grid' | 'list';

const ARCHIVE_EXTENSIONS = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'tgz'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v'];

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatPersianDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

function classifyManagedFile(file: ManagedFile): 'pdf' | 'archive' | 'image' | 'video' | 'audio' | 'doc' | 'code' | 'other' {
  const ext = getFileExtension(file.name);
  const mime = (file.mimeType || '').toLowerCase();

  if (PDF_EXTENSIONS.includes(ext) || mime === 'application/pdf') return 'pdf';
  if (ARCHIVE_EXTENSIONS.includes(ext) || mime.includes('zip') || mime.includes('rar') || mime.includes('7z') || mime.includes('tar') || mime.includes('gzip')) {
    return 'archive';
  }
  if (IMAGE_EXTENSIONS.includes(ext) || mime.startsWith('image/')) return 'image';
  if (VIDEO_EXTENSIONS.includes(ext) || mime.startsWith('video/')) return 'video';
  if (AUDIO_EXTENSIONS.includes(ext) || mime.startsWith('audio/')) return 'audio';
  if (OFFICE_EXTENSIONS.includes(ext) || MD_EXTENSIONS.includes(ext) || TXT_EXTENSIONS.includes(ext)) return 'doc';
  if (CODE_EXTENSIONS.includes(ext)) return 'code';
  return 'other';
}

function getFileVisualMeta(file: ManagedFile) {
  const kind = classifyManagedFile(file);
  switch (kind) {
    case 'pdf':
      return {
        icon: FileText,
        label: 'PDF',
        bgClass: 'bg-[#5C1A1A]/12 dark:bg-[#5C1A1A]/35 text-[#A64D3B] dark:text-[#FFAB91]',
      };
    case 'archive':
      return {
        icon: FileArchive,
        label: (getFileExtension(file.name) || 'ZIP').toUpperCase(),
        bgClass: 'bg-[#8B6814]/12 dark:bg-[#4A380B]/50 text-[#8B6814] dark:text-[#FFE086]',
      };
    case 'image':
      return {
        icon: FileImage,
        label: (getFileExtension(file.name) || 'IMG').toUpperCase(),
        bgClass: 'bg-[#4A6D22]/15 dark:bg-[#2E4514] text-[#4A6D22] dark:text-[#D0E8B2]',
      };
    case 'video':
      return {
        icon: FileVideo,
        label: (getFileExtension(file.name) || 'VID').toUpperCase(),
        bgClass: 'bg-[#1A4B6E]/15 dark:bg-[#17364D] text-[#1A4B6E] dark:text-[#A8D3E6]',
      };
    case 'audio':
      return {
        icon: FileAudio,
        label: (getFileExtension(file.name) || 'AUD').toUpperCase(),
        bgClass: 'bg-[#4A366E]/15 dark:bg-[#31234A] text-[#5B428A] dark:text-[#D1C4E9]',
      };
    case 'doc':
      return {
        icon: FileText,
        label: (getFileExtension(file.name) || 'DOC').toUpperCase(),
        bgClass: 'bg-[#1A4B6E]/12 dark:bg-[#17364D]/70 text-[#1A4B6E] dark:text-[#A8D3E6]',
      };
    case 'code':
      return {
        icon: FileCode,
        label: (getFileExtension(file.name) || 'CODE').toUpperCase(),
        bgClass: 'bg-[#2C3626]/12 dark:bg-[#2A3324] text-[#4A6D22] dark:text-[#D0E8B2]',
      };
    default:
      return {
        icon: FileIcon,
        label: (getFileExtension(file.name) || 'FILE').toUpperCase(),
        bgClass: 'bg-[#EAECE2] dark:bg-[#252920] text-[#5E6258] dark:text-[#C4C8B9]',
      };
  }
}

function canPreviewFile(file: ManagedFile): boolean {
  const kind = classifyManagedFile(file);
  if (kind === 'image' || kind === 'video' || kind === 'pdf' || kind === 'audio') return true;
  const cat = getFileCategory(file.name);
  return cat === 'txt' || cat === 'code' || cat === 'md' || cat === 'office';
}

export const FileManagerModal: React.FC<FileManagerModalProps> = ({
  isOpen,
  onClose,
  onOpenTelegramSettings,
  telegramRefreshKey = 0,
  onTelegramStatusChange,
}) => {
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const [folders, setFolders] = useState<ManagedFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockState, setLockState] = useState<{
    reason?: 'not_configured' | 'disabled';
    message: string;
  } | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Filters, search, sort & layout
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<FileTypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // New folder state
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSavingFolder, setIsSavingFolder] = useState(false);

  // Inline rename state (file or folder)
  const [renamingTarget, setRenamingTarget] = useState<{ kind: 'file' | 'folder'; id: string; value: string } | null>(null);

  // Move file modal/popover state
  const [movingFile, setMovingFile] = useState<ManagedFile | null>(null);

  // Upload queue / drag-drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<{
    fileName: string;
    index: number;
    total: number;
    progress: UploadProgressInfo;
  } | null>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Preview state
  const [previewDoc, setPreviewDoc] = useState<NoteAttachment | null>(null);
  const [previewMedia, setPreviewMedia] = useState<{ kind: 'image' | 'video'; file: ManagedFile; blobUrl: string } | null>(null);
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const previewBlobUrlRef = useRef<string | null>(null);

  const revokePreviewBlob = useCallback(() => {
    if (previewBlobUrlRef.current) {
      URL.revokeObjectURL(previewBlobUrlRef.current);
      previewBlobUrlRef.current = null;
    }
  }, []);

  useBackButton(isOpen && !previewDoc && !previewMedia && !movingFile, onClose, 'app-file-manager');
  useBackButton(
    !!previewMedia,
    () => {
      setPreviewMedia(null);
      revokePreviewBlob();
    },
    'file-manager-media-preview'
  );
  useBackButton(!!movingFile, () => setMovingFile(null), 'file-manager-move');

  const loadFiles = useCallback(
    async (refreshFromTelegram = false) => {
      if (refreshFromTelegram) {
        setIsSyncing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      try {
        const data = refreshFromTelegram
          ? await api.syncManagedFilesFromTelegram()
          : await api.getManagedFiles(false);
        setFiles(data.files);
        setFolders(data.folders);
        setActiveChatId(data.chatId || null);
        setLockState(null);
        onTelegramStatusChange?.(true);
      } catch (err: any) {
        const apiErr = err as ApiError;
        if (apiErr?.locked) {
          setLockState({
            reason: apiErr.reason,
            message: apiErr.message || 'دسترسی به بخش فایل‌ها بسته است.',
          });
          setFiles([]);
          setFolders([]);
          setActiveChatId(null);
          onTelegramStatusChange?.(false);
        } else {
          setError(err?.message || 'خطا در بارگذاری فایل‌ها از کانال تلگرام');
        }
      } finally {
        setIsLoading(false);
        setIsSyncing(false);
      }
    },
    [onTelegramStatusChange]
  );

  useEffect(() => {
    if (isOpen) {
      loadFiles(false);
    } else {
      setIsCreatingFolder(false);
      setRenamingTarget(null);
      setMovingFile(null);
      setPreviewDoc(null);
      setPreviewMedia(null);
      revokePreviewBlob();
      setIsDragOver(false);
    }
  }, [isOpen, telegramRefreshKey, loadFiles, revokePreviewBlob]);

  // Breadcrumb path from root -> currentFolderId
  const breadcrumbs = useMemo(() => {
    const chain: ManagedFolder[] = [];
    const seen = new Set<string>();
    let curId = currentFolderId;
    while (curId && !seen.has(curId)) {
      seen.add(curId);
      const found = folders.find((f) => f.id === curId);
      if (!found) break;
      chain.unshift(found);
      curId = found.parentId || null;
    }
    return chain;
  }, [currentFolderId, folders]);

  // Total storage stats
  const totalStats = useMemo(() => {
    const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
    return {
      count: files.length,
      totalBytes,
    };
  }, [files]);

  // Visible folders & files for current view
  const { visibleFolders, visibleFiles } = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const isSearchingOrFiltering = Boolean(q || typeFilter !== 'all');

    let nextFolders = isSearchingOrFiltering
      ? folders.filter((fld) => (q ? fld.name.toLowerCase().includes(q) : false))
      : folders.filter((fld) => (fld.parentId || null) === (currentFolderId || null));

    let nextFiles = isSearchingOrFiltering
      ? files
      : files.filter((f) => (f.folderId || null) === (currentFolderId || null));

    if (q) {
      nextFiles = nextFiles.filter((f) => f.name.toLowerCase().includes(q));
    }

    if (typeFilter !== 'all') {
      nextFiles = nextFiles.filter((f) => {
        const kind = classifyManagedFile(f);
        if (typeFilter === 'pdf') return kind === 'pdf' || kind === 'doc';
        if (typeFilter === 'archive') return kind === 'archive';
        if (typeFilter === 'media') return kind === 'image' || kind === 'video' || kind === 'audio';
        return kind === 'code' || kind === 'other';
      });
    }

    nextFiles = [...nextFiles].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'fa');
      if (sortBy === 'size') return (b.size || 0) - (a.size || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    nextFolders = [...nextFolders].sort((a, b) => a.name.localeCompare(b.name, 'fa'));

    return { visibleFolders: nextFolders, visibleFiles: nextFiles };
  }, [files, folders, currentFolderId, searchQuery, typeFilter, sortBy]);

  // Count items inside a folder
  const folderItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of files) {
      if (f.folderId) counts[f.folderId] = (counts[f.folderId] || 0) + 1;
    }
    for (const fld of folders) {
      if (fld.parentId) counts[fld.parentId] = (counts[fld.parentId] || 0) + 1;
    }
    return counts;
  }, [files, folders]);

  const handleUploadFiles = async (fileList: FileList | File[]) => {
    if (lockState) return;
    const items = Array.from(fileList);
    if (items.length === 0) return;

    setError(null);
    const controller = new AbortController();
    uploadAbortRef.current = controller;

    for (let i = 0; i < items.length; i++) {
      if (controller.signal.aborted) break;
      const file = items[i];
      setUploadState({
        fileName: file.name,
        index: i + 1,
        total: items.length,
        progress: {
          percent: 5,
          loadedBytes: 0,
          totalBytes: file.size,
          stage: 'uploading',
        },
      });

      try {
        const savedRecord = await api.uploadManagedFileToTelegram(
          file,
          currentFolderId,
          (info) => {
            setUploadState((prev) => (prev ? { ...prev, progress: info } : prev));
          },
          controller.signal
        );

        setFiles((prev) => [savedRecord, ...prev]);
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          break;
        }
        const apiErr = err as ApiError;
        if (apiErr?.locked) {
          setLockState({
            reason: apiErr.reason,
            message: apiErr.message || 'دسترسی به بخش فایل‌ها بسته است.',
          });
          onTelegramStatusChange?.(false);
          break;
        }
        setError(err?.message || `خطا در آپلود فایل «${file.name}» به کانال تلگرام`);
        break;
      }
    }

    uploadAbortRef.current = null;
    setUploadState(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed || isSavingFolder) return;
    setIsSavingFolder(true);
    setError(null);
    try {
      const created = await api.createManagedFolder({
        name: trimmed,
        parentId: currentFolderId,
      });
      setFolders((prev) => [...prev, created]);
      setNewFolderName('');
      setIsCreatingFolder(false);
    } catch (err: any) {
      setError(err?.message || 'خطا در ایجاد پوشه');
    } finally {
      setIsSavingFolder(false);
    }
  };

  const handleCommitRename = async () => {
    if (!renamingTarget) return;
    const trimmed = renamingTarget.value.trim();
    if (!trimmed) {
      setRenamingTarget(null);
      return;
    }

    setError(null);
    try {
      if (renamingTarget.kind === 'file') {
        const updated = await api.updateManagedFile(renamingTarget.id, { name: trimmed });
        setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      } else {
        const updated = await api.renameManagedFolder(renamingTarget.id, trimmed);
        setFolders((prev) => prev.map((fld) => (fld.id === updated.id ? updated : fld)));
      }
      setRenamingTarget(null);
    } catch (err: any) {
      setError(err?.message || 'خطا در تغییر نام');
    }
  };

  const handleDeleteFile = async (file: ManagedFile) => {
    if (!confirm(`آیا از حذف فایل «${file.name}» اطمینان دارید؟`)) return;
    setError(null);
    try {
      await api.deleteManagedFile(file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err: any) {
      setError(err?.message || 'خطا در حذف فایل');
    }
  };

  const handleDeleteFolder = async (folder: ManagedFolder) => {
    const hasItems = (folderItemCounts[folder.id] || 0) > 0;
    const msg = hasItems
      ? `پوشه «${folder.name}» حذف شود؟ فایل‌ها و زیرپوشه‌های آن به پوشه بالایی منتقل می‌شوند.`
      : `آیا از حذف پوشه «${folder.name}» اطمینان دارید؟`;
    if (!confirm(msg)) return;

    setError(null);
    try {
      await api.deleteManagedFolder(folder.id);
      const fallbackParent = folder.parentId || null;
      setFolders((prev) =>
        prev
          .filter((f) => f.id !== folder.id)
          .map((f) => (f.parentId === folder.id ? { ...f, parentId: fallbackParent } : f))
      );
      setFiles((prev) =>
        prev.map((f) => (f.folderId === folder.id ? { ...f, folderId: fallbackParent } : f))
      );
      if (currentFolderId === folder.id) {
        setCurrentFolderId(fallbackParent);
      }
    } catch (err: any) {
      setError(err?.message || 'خطا در حذف پوشه');
    }
  };

  const handleMoveFile = async (targetFolderId: string | null) => {
    if (!movingFile) return;
    setError(null);
    try {
      const updated = await api.updateManagedFile(movingFile.id, { folderId: targetFolderId });
      setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
      setMovingFile(null);
    } catch (err: any) {
      setError(err?.message || 'خطا در جابه‌جایی فایل');
    }
  };

  const handleDownloadFile = async (file: ManagedFile) => {
    setDownloadingId(file.id);
    setError(null);
    try {
      const res = file.url.startsWith('/api/') ? await apiFetch(file.url) : await fetch(file.url);
      if (!res.ok) throw new Error('فایل برای دانلود در دسترس نیست');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      setError(err?.message || 'خطا در دانلود فایل');
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePreviewFile = async (file: ManagedFile) => {
    const kind = classifyManagedFile(file);
    const shouldPreviewMedia = kind === 'image' || kind === 'video';
    const shouldPreviewDoc = canPreviewFile(file);

    if (!shouldPreviewMedia && !shouldPreviewDoc) {
      handleDownloadFile(file);
      return;
    }

    setLoadingPreviewId(file.id);
    setError(null);
    try {
      const res = file.url.startsWith('/api/') ? await apiFetch(file.url) : await fetch(file.url);
      if (!res.ok) {
        let msg = 'خطا در خواندن فایل از کانال تلگرام';
        try {
          const body = await res.json();
          if (body?.error) msg = body.error;
        } catch {}
        throw new Error(msg);
      }
      const rawBlob = await res.blob();
      const typedBlob =
        file.mimeType && rawBlob.type !== file.mimeType
          ? new Blob([rawBlob], { type: file.mimeType })
          : rawBlob;

      revokePreviewBlob();
      const blobUrl = URL.createObjectURL(typedBlob);
      previewBlobUrlRef.current = blobUrl;

      if (shouldPreviewMedia) {
        setPreviewMedia({ kind: kind as 'image' | 'video', file, blobUrl });
      } else {
        setPreviewDoc({
          id: file.id,
          name: file.name,
          type: kind === 'audio' ? 'audio' : 'document',
          mimeType: file.mimeType,
          size: file.size,
          url: blobUrl,
          createdAt: file.createdAt,
        });
      }
    } catch (err: any) {
      setError(err?.message || 'خطا در دریافت و نمایش فایل از تلگرام');
    } finally {
      setLoadingPreviewId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-xs flex items-center justify-center sm:p-4 anim-fade-in"
        dir="rtl"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="relative bg-[#FAF9F5] dark:bg-[#1C1C17] border border-[#E1E4D5] dark:border-[#43493E] w-full h-full sm:h-[88vh] sm:max-w-4xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden anim-scale-in"
          onDragOver={(e) => {
            e.preventDefault();
            if (lockState || isLoading) return;
            if (!isDragOver) setIsDragOver(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setIsDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (lockState || isLoading) return;
            if (e.dataTransfer.files?.length) {
              handleUploadFiles(e.dataTransfer.files);
            }
          }}
        >
          {/* Drag & Drop Overlay */}
          {isDragOver && !lockState && (
            <div className="absolute inset-0 z-30 bg-[#D0E8B2]/90 dark:bg-[#1A3700]/90 backdrop-blur-xs border-2 border-dashed border-[#4A6D22] dark:border-[#D0E8B2] sm:rounded-3xl flex flex-col items-center justify-center gap-3 p-6 text-center pointer-events-none">
              <div className="w-16 h-16 rounded-2xl bg-white/80 dark:bg-[#12140E]/80 text-[#4A6D22] dark:text-[#D0E8B2] flex items-center justify-center shadow-sm">
                <Upload className="w-8 h-8" />
              </div>
              <p className="font-bold text-base text-[#1A3700] dark:text-[#ECF8DA]">
                فایل‌ها را اینجا رها کنید
              </p>
              <p className="text-xs text-[#3B571B] dark:text-[#D0E8B2]">
                فایل‌ها مستقیماً در کانال تلگرام شما ذخیره می‌شوند (PDF، ZIP، تصویر و...)
              </p>
            </div>
          )}

          {/* Modal Header */}
          <div className="px-4 sm:px-6 py-3.5 bg-[#F5F6EE] dark:bg-[#161812] border-b border-[#E1E4D5] dark:border-[#43493E] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs shrink-0 ${
                  lockState
                    ? 'bg-[#5C1A1A]/15 text-[#A64D3B] dark:text-[#FFAB91]'
                    : 'bg-[#D0E8B2] text-[#1A3700]'
                }`}
              >
                {lockState ? <Lock className="w-5 h-5" /> : <Cloud className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-sm sm:text-base text-[#1A1C16] dark:text-[#E2E3DC] truncate">
                    مدیریت فایل‌ها
                  </h2>
                  {!lockState && activeChatId && (
                    <span
                      className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0088cc]/12 text-[#0088cc] text-[10px] font-bold font-mono"
                      dir="ltr"
                      title={`کانال تلگرام فعال: ${activeChatId}`}
                    >
                      <Send className="w-2.5 h-2.5" />
                      {activeChatId}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#5E6258] dark:text-[#8F9285] tabular-nums">
                  {lockState
                    ? 'دسترسی قفل است — نیازمند تنظیم کانال تلگرام'
                    : `${totalStats.count} فایل در کانال تلگرام • ${formatBytes(totalStats.totalBytes)}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {!lockState && !isLoading && (
                <>
                  <button
                    type="button"
                    onClick={() => loadFiles(true)}
                    disabled={isSyncing}
                    className="p-2 rounded-xl border border-[#E1E4D5] dark:border-[#43493E] bg-white dark:bg-[#23261F] hover:bg-[#EAECE2] dark:hover:bg-[#2B3025] text-[#0088cc] transition-colors cursor-pointer disabled:opacity-50"
                    title="همگام‌سازی و خواندن مجدد از کانال تلگرام"
                    aria-label="همگام‌سازی از کانال تلگرام"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingFolder((prev) => !prev);
                      setNewFolderName('');
                    }}
                    className="px-2.5 sm:px-3 py-2 rounded-xl border border-[#E1E4D5] dark:border-[#43493E] bg-white dark:bg-[#23261F] hover:bg-[#EAECE2] dark:hover:bg-[#2B3025] text-[#1A1C16] dark:text-[#E2E3DC] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                    title="ایجاد پوشه جدید"
                  >
                    <FolderPlus className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2]" />
                    <span className="hidden sm:inline">پوشه جدید</span>
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.length) {
                        handleUploadFiles(e.target.files);
                      }
                    }}
                  />
                  <button
                    type="button"
                    id="btn-file-manager-upload"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!!uploadState}
                    className="px-3 sm:px-4 py-2 rounded-xl bg-[#4A6D22] hover:bg-[#3B571B] dark:bg-[#D0E8B2] dark:hover:bg-[#BDE098] text-white dark:text-[#1A3700] text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-60 cursor-pointer whitespace-nowrap"
                  >
                    <Upload className="w-4 h-4" />
                    <span>آپلود فایل</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-[#5E6258] dark:text-[#8F9285] hover:bg-[#EAECE2] dark:hover:bg-[#23261F] transition-colors cursor-pointer"
                aria-label="بستن مدیریت فایل‌ها"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Toolbar: Breadcrumbs + Search + Filters + View Mode (hidden when locked) */}
          {!lockState && (
          <div className="px-4 sm:px-6 py-3 border-b border-[#E1E4D5] dark:border-[#43493E] bg-white/70 dark:bg-[#1C1C17] space-y-2.5 shrink-0">
            {/* Breadcrumb Row */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-xs overflow-x-auto no-scrollbar py-0.5">
                {currentFolderId && (
                  <button
                    type="button"
                    onClick={() => {
                      const cur = folders.find((f) => f.id === currentFolderId);
                      setCurrentFolderId(cur?.parentId || null);
                    }}
                    className="p-1.5 rounded-lg bg-[#EAECE2] dark:bg-[#23261F] text-[#43493E] dark:text-[#E2E3DC] hover:bg-[#D0E8B2]/40 ml-1 cursor-pointer"
                    title="بازگشت به پوشه قبل"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setCurrentFolderId(null)}
                  className={`px-2 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    currentFolderId === null
                      ? 'font-bold text-[#4A6D22] dark:text-[#D0E8B2] bg-[#D0E8B2]/30 dark:bg-[#2E4514]'
                      : 'text-[#5E6258] dark:text-[#8F9285] hover:text-[#1A1C16] dark:hover:text-[#E2E3DC]'
                  }`}
                >
                  همه فایل‌ها
                </button>

                {breadcrumbs.map((fld, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={fld.id}>
                      <ChevronLeft className="w-3.5 h-3.5 text-[#8F9285] shrink-0" />
                      <button
                        type="button"
                        onClick={() => setCurrentFolderId(fld.id)}
                        className={`px-2 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                          isLast
                            ? 'font-bold text-[#4A6D22] dark:text-[#D0E8B2] bg-[#D0E8B2]/30 dark:bg-[#2E4514]'
                            : 'text-[#5E6258] dark:text-[#8F9285] hover:text-[#1A1C16] dark:hover:text-[#E2E3DC]'
                        }`}
                      >
                        {fld.name}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Sort & View Toggle */}
              <div className="flex items-center gap-1.5 shrink-0 mr-auto">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                  className="bg-[#F5F6EE] dark:bg-[#23261F] text-[#43493E] dark:text-[#E2E3DC] text-[11px] font-medium rounded-xl px-2.5 py-1.5 border border-[#E1E4D5] dark:border-[#43493E] focus:outline-none focus:ring-2 focus:ring-[#D0E8B2]"
                  aria-label="مرتب‌سازی"
                >
                  <option value="newest">جدیدترین</option>
                  <option value="name">بر اساس نام</option>
                  <option value="size">بیشترین حجم</option>
                </select>

                <div className="flex items-center bg-[#F5F6EE] dark:bg-[#23261F] p-0.5 rounded-xl border border-[#E1E4D5] dark:border-[#43493E]">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-[#12140E] text-[#4A6D22] dark:text-[#D0E8B2] shadow-2xs'
                        : 'text-[#5E6258] dark:text-[#8F9285]'
                    }`}
                    title="نمایش شبکه‌ای"
                    aria-label="نمایش شبکه‌ای"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-[#12140E] text-[#4A6D22] dark:text-[#D0E8B2] shadow-2xs'
                        : 'text-[#5E6258] dark:text-[#8F9285]'
                    }`}
                    title="نمایش لیستی"
                    aria-label="نمایش لیستی"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Search + Type Filter Pills */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#5E6258] dark:text-[#8F9285] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در نام فایل‌ها و پوشه‌ها..."
                  className="w-full bg-[#F5F6EE] dark:bg-[#12140E] text-[#1A1C16] dark:text-[#E2E3DC] placeholder-[#8F9285] text-xs rounded-xl pr-9 pl-8 py-2 border border-[#E1E4D5] dark:border-[#43493E] focus:bg-white dark:focus:bg-[#12140E] focus:border-[#4A6D22] dark:focus:border-[#D0E8B2] focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-[#5E6258] hover:text-[#1A1C16] dark:text-[#8F9285] dark:hover:text-[#E2E3DC]"
                    aria-label="پاک کردن جستجو"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {(
                  [
                    { id: 'all', label: 'همه' },
                    { id: 'pdf', label: 'PDF و جزوه' },
                    { id: 'archive', label: 'زیپ / فشرده' },
                    { id: 'media', label: 'تصویر و رسانه' },
                    { id: 'other', label: 'سایر' },
                  ] as const
                ).map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setTypeFilter(chip.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      typeFilter === chip.id
                        ? 'bg-[#D0E8B2] dark:bg-[#355118] text-[#1A3700] dark:text-[#ECF8DA]'
                        : 'bg-[#F5F6EE] dark:bg-[#23261F] text-[#43493E] dark:text-[#C4C8B9] hover:bg-[#EAECE2] dark:hover:bg-[#2B3025]'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inline New Folder Form */}
            {isCreatingFolder && (
              <form
                onSubmit={handleCreateFolder}
                className="flex items-center gap-2 pt-1 anim-fade-in"
              >
                <Folder className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2] shrink-0" />
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="نام پوشه جدید (مثلاً جزوه‌های ترم ۴)..."
                  autoFocus
                  className="flex-1 bg-[#F5F6EE] dark:bg-[#12140E] text-[#1A1C16] dark:text-[#E2E3DC] text-xs rounded-xl px-3 py-2 border border-[#4A6D22] dark:border-[#D0E8B2] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSavingFolder || !newFolderName.trim()}
                  className="px-3 py-2 rounded-xl bg-[#4A6D22] text-white dark:bg-[#D0E8B2] dark:text-[#1A3700] text-xs font-bold disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  {isSavingFolder ? 'در حال ساخت...' : 'ایجاد'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(false)}
                  className="px-2.5 py-2 rounded-xl text-xs text-[#5E6258] dark:text-[#8F9285] hover:bg-[#EAECE2] dark:hover:bg-[#23261F] cursor-pointer"
                >
                  انصراف
                </button>
              </form>
            )}
          </div>
          )}

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {/* Access Locked State (Telegram channel not set or disabled) */}
            {!isLoading && lockState && (
              <div className="h-full min-h-[320px] flex items-center justify-center p-2">
                <div className="max-w-md w-full bg-white dark:bg-[#23261F] border border-[#E1E4D5] dark:border-[#43493E] rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-[#5C1A1A]/12 dark:bg-[#5C1A1A]/35 text-[#A64D3B] dark:text-[#FFAB91] flex items-center justify-center mx-auto">
                    <Lock className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-bold text-base text-[#1A1C16] dark:text-[#E2E3DC]">
                      {lockState.reason === 'disabled'
                        ? 'ذخیره‌سازی ابری تلگرام غیرفعال است'
                        : 'دسترسی به بخش فایل‌ها بسته است'}
                    </h3>
                    <p className="text-xs text-[#5E6258] dark:text-[#C4C8B9] leading-relaxed">
                      {lockState.reason === 'disabled'
                        ? 'اطلاعات کانال تلگرام ثبت شده است، اما برای ذخیره و خواندن فایل‌ها از کانال باید گزینه «فعال‌سازی ذخیره‌سازی ابری تلگرام» را روشن کنید.'
                        : 'تمامی فایل‌ها مستقیماً در کانال تلگرام شما ذخیره و از همان‌جا خوانده می‌شوند. تا زمانی که کانال تلگرامی تنظیم و فعال نشود، دسترسی به این بخش بسته است.'}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                    {onOpenTelegramSettings && (
                      <button
                        type="button"
                        onClick={onOpenTelegramSettings}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0088cc] hover:bg-[#0077b3] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>تنظیم و اتصال کانال تلگرام</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => loadFiles(false)}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#F5F6EE] dark:bg-[#1C1C17] hover:bg-[#EAECE2] dark:hover:bg-[#2B3025] border border-[#E1E4D5] dark:border-[#43493E] text-[#1A1C16] dark:text-[#E2E3DC] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>بررسی مجدد</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {!lockState && error && (
              <div
                role="alert"
                className="p-3 rounded-2xl bg-[#5C1A1A]/12 dark:bg-[#5C1A1A]/35 border border-[#A64D3B]/30 text-[#8B2B1B] dark:text-[#FFAB91] text-xs flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="p-1 hover:opacity-80"
                  aria-label="بستن خطا"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Upload Progress Banner */}
            {!lockState && uploadState && (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-[#23261F] border border-[#D0E8B2] dark:border-[#4A6D22] shadow-xs space-y-2 anim-fade-in">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Loader2 className="w-4 h-4 animate-spin text-[#4A6D22] dark:text-[#D0E8B2] shrink-0" />
                    <span className="font-bold text-[#1A1C16] dark:text-[#E2E3DC] truncate" dir="auto">
                      {uploadState.fileName}
                    </span>
                    {uploadState.total > 1 && (
                      <span className="text-[11px] text-[#5E6258] dark:text-[#8F9285] tabular-nums shrink-0">
                        ({uploadState.index}/{uploadState.total})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-[#4A6D22] dark:text-[#D0E8B2] tabular-nums">
                      {uploadState.progress.stage === 'processing'
                        ? 'در حال ارسال به کانال تلگرام...'
                        : `${uploadState.progress.percent}%`}
                    </span>
                    <button
                      type="button"
                      onClick={() => uploadAbortRef.current?.abort()}
                      className="text-[11px] text-[#A64D3B] dark:text-[#FFAB91] hover:underline font-semibold cursor-pointer"
                    >
                      لغو
                    </button>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#E1E4D5] dark:bg-[#12140E] overflow-hidden">
                  <div
                    className="h-full bg-[#4A6D22] dark:bg-[#D0E8B2] transition-all duration-200"
                    style={{ width: `${uploadState.progress.percent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-xs text-[#5E6258] dark:text-[#8F9285]">
                <Loader2 className="w-7 h-7 animate-spin text-[#4A6D22] dark:text-[#D0E8B2]" />
                <span>در حال دریافت فایل‌ها از کانال تلگرام...</span>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !lockState && visibleFolders.length === 0 && visibleFiles.length === 0 && (
              <div className="py-12 px-4 border-2 border-dashed border-[#E1E4D5] dark:border-[#43493E] rounded-3xl text-center flex flex-col items-center justify-center gap-3 bg-white/50 dark:bg-[#12140E]/40">
                <div className="w-14 h-14 rounded-2xl bg-[#D0E8B2]/35 dark:bg-[#2E4514]/60 text-[#4A6D22] dark:text-[#D0E8B2] flex items-center justify-center">
                  <FolderOpen className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <h3 className="font-bold text-sm text-[#1A1C16] dark:text-[#E2E3DC]">
                    {searchQuery || typeFilter !== 'all'
                      ? 'فایلی با این فیلتر پیدا نشد'
                      : currentFolderId
                      ? 'این پوشه خالی است'
                      : 'هنوز فایلی در کانال تلگرام ذخیره نشده است'}
                  </h3>
                  <p className="text-xs text-[#5E6258] dark:text-[#8F9285] leading-relaxed">
                    فایل‌های PDF، جزوه‌ها، فایل‌های ZIP، اسناد، تصاویر یا هر فایل دیگری را اینجا بکشید و رها کنید تا مستقیماً در کانال تلگرام ذخیره شوند.
                  </p>
                </div>
                {!searchQuery && typeFilter === 'all' && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-1 px-4 py-2 rounded-xl bg-[#4A6D22] hover:bg-[#3B571B] dark:bg-[#D0E8B2] dark:hover:bg-[#BDE098] text-white dark:text-[#1A3700] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>انتخاب فایل برای آپلود</span>
                  </button>
                )}
              </div>
            )}

            {/* Folders Section */}
            {!isLoading && !lockState && visibleFolders.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285] px-1">
                  پوشه‌ها ({visibleFolders.length})
                </div>
                <div
                  className={
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5'
                      : 'flex flex-col gap-2'
                  }
                >
                  {visibleFolders.map((folder) => {
                    const isRenaming = renamingTarget?.kind === 'folder' && renamingTarget.id === folder.id;
                    const itemCount = folderItemCounts[folder.id] || 0;

                    return (
                      <div
                        key={folder.id}
                        className="group bg-white dark:bg-[#23261F] border border-[#E1E4D5] dark:border-[#43493E] hover:border-[#4A6D22]/60 dark:hover:border-[#D0E8B2]/60 rounded-2xl p-3 flex items-center justify-between gap-2 transition-all shadow-2xs"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (!isRenaming) setCurrentFolderId(folder.id);
                          }}
                          className="flex items-center gap-2.5 min-w-0 flex-1 text-right cursor-pointer"
                        >
                          <div className="w-9 h-9 rounded-xl bg-[#D0E8B2]/45 dark:bg-[#2E4514] text-[#4A6D22] dark:text-[#D0E8B2] flex items-center justify-center shrink-0">
                            <Folder className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            {isRenaming ? (
                              <input
                                type="text"
                                value={renamingTarget.value}
                                onChange={(e) =>
                                  setRenamingTarget({ ...renamingTarget, value: e.target.value })
                                }
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCommitRename();
                                  if (e.key === 'Escape') setRenamingTarget(null);
                                }}
                                autoFocus
                                className="w-full bg-[#F5F6EE] dark:bg-[#12140E] text-xs font-semibold rounded-lg px-2 py-1 border border-[#4A6D22] dark:border-[#D0E8B2] focus:outline-none"
                              />
                            ) : (
                              <>
                                <div className="font-bold text-xs text-[#1A1C16] dark:text-[#E2E3DC] truncate">
                                  {folder.name}
                                </div>
                                <div className="text-[10px] text-[#5E6258] dark:text-[#8F9285] tabular-nums">
                                  {itemCount} مورد
                                </div>
                              </>
                            )}
                          </div>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          {isRenaming ? (
                            <button
                              type="button"
                              onClick={handleCommitRename}
                              className="p-1.5 rounded-lg bg-[#4A6D22] text-white dark:bg-[#D0E8B2] dark:text-[#1A3700] cursor-pointer"
                              title="ذخیره نام"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setRenamingTarget({ kind: 'folder', id: folder.id, value: folder.name })
                                }
                                className="p-1.5 rounded-lg text-[#5E6258] dark:text-[#8F9285] hover:bg-[#EAECE2] dark:hover:bg-[#2B3025] sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                                title="تغییر نام پوشه"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteFolder(folder)}
                                className="p-1.5 rounded-lg text-[#A64D3B] dark:text-[#FFAB91] hover:bg-[#5C1A1A]/15 sm:opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                                title="حذف پوشه"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Files Section */}
            {!isLoading && !lockState && visibleFiles.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285] px-1">
                  فایل‌ها ({visibleFiles.length})
                </div>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {visibleFiles.map((file) => {
                      const meta = getFileVisualMeta(file);
                      const Icon = meta.icon;
                      const isRenaming = renamingTarget?.kind === 'file' && renamingTarget.id === file.id;
                      const previewable = canPreviewFile(file);
                      const isLoadingThisPreview = loadingPreviewId === file.id;

                      return (
                        <div
                          key={file.id}
                          className="group bg-white dark:bg-[#23261F] border border-[#E1E4D5] dark:border-[#43493E] hover:border-[#4A6D22]/60 dark:hover:border-[#D0E8B2]/60 rounded-2xl p-3 flex flex-col justify-between gap-3 transition-all shadow-2xs"
                        >
                          {/* Top Preview / Icon Area */}
                          <div
                            onClick={() => !isRenaming && handlePreviewFile(file)}
                            className="flex items-start gap-3 cursor-pointer"
                          >
                            <div
                              className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${meta.bgClass}`}
                            >
                              {isLoadingThisPreview ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                              ) : (
                                <>
                                  <Icon className="w-5 h-5" />
                                  <span className="text-[8px] font-extrabold mt-0.5 tracking-tight">
                                    {meta.label.slice(0, 4)}
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              {isRenaming ? (
                                <div
                                  className="flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="text"
                                    value={renamingTarget.value}
                                    onChange={(e) =>
                                      setRenamingTarget({ ...renamingTarget, value: e.target.value })
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleCommitRename();
                                      if (e.key === 'Escape') setRenamingTarget(null);
                                    }}
                                    autoFocus
                                    dir="auto"
                                    className="w-full bg-[#F5F6EE] dark:bg-[#12140E] text-xs font-semibold rounded-lg px-2 py-1 border border-[#4A6D22] dark:border-[#D0E8B2] focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleCommitRename}
                                    className="p-1.5 rounded-lg bg-[#4A6D22] text-white dark:bg-[#D0E8B2] dark:text-[#1A3700] cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <h4
                                    className="font-bold text-xs text-[#1A1C16] dark:text-[#E2E3DC] line-clamp-2 break-all leading-relaxed"
                                    dir="auto"
                                    title={file.name}
                                  >
                                    {file.name}
                                  </h4>
                                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-[#5E6258] dark:text-[#8F9285] tabular-nums flex-wrap">
                                    <span>{formatBytes(file.size)}</span>
                                    <span>•</span>
                                    <span>{formatPersianDate(file.createdAt)}</span>
                                    <span className="inline-flex items-center gap-0.5 text-[#0088cc]" title="ذخیره‌شده در کانال تلگرام">
                                      <Cloud className="w-3 h-3" />
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Card Actions Bar */}
                          <div className="pt-2 border-t border-[#E1E4D5]/70 dark:border-[#33372C] flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1">
                              {previewable && (
                                <button
                                  type="button"
                                  onClick={() => handlePreviewFile(file)}
                                  disabled={isLoadingThisPreview}
                                  className="px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-[#F5F6EE] dark:bg-[#1C1C17] hover:bg-[#D0E8B2]/40 text-[#4A6D22] dark:text-[#D0E8B2] flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-60"
                                  title="پیش‌نمایش"
                                >
                                  {isLoadingThisPreview ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" />
                                  )}
                                  <span>مشاهده</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDownloadFile(file)}
                                disabled={downloadingId === file.id}
                                className="p-1.5 rounded-lg text-[#43493E] dark:text-[#C4C8B9] hover:bg-[#EAECE2] dark:hover:bg-[#2B3025] transition-colors cursor-pointer disabled:opacity-50"
                                title="دانلود فایل از تلگرام"
                              >
                                {downloadingId === file.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Download className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => setMovingFile(file)}
                                className="p-1.5 rounded-lg text-[#5E6258] dark:text-[#8F9285] hover:bg-[#EAECE2] dark:hover:bg-[#2B3025] transition-colors cursor-pointer"
                                title="انتقال به پوشه"
                              >
                                <FolderInput className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setRenamingTarget({ kind: 'file', id: file.id, value: file.name })
                                }
                                className="p-1.5 rounded-lg text-[#5E6258] dark:text-[#8F9285] hover:bg-[#EAECE2] dark:hover:bg-[#2B3025] transition-colors cursor-pointer"
                                title="تغییر نام"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteFile(file)}
                                className="p-1.5 rounded-lg text-[#A64D3B] dark:text-[#FFAB91] hover:bg-[#5C1A1A]/15 transition-colors cursor-pointer"
                                title="حذف فایل"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-[#23261F] border border-[#E1E4D5] dark:border-[#43493E] rounded-2xl divide-y divide-[#E1E4D5]/70 dark:divide-[#33372C] overflow-hidden">
                    {visibleFiles.map((file) => {
                      const meta = getFileVisualMeta(file);
                      const Icon = meta.icon;
                      const isRenaming = renamingTarget?.kind === 'file' && renamingTarget.id === file.id;
                      const previewable = canPreviewFile(file);

                      return (
                        <div
                          key={file.id}
                          className="p-3 flex items-center justify-between gap-3 hover:bg-[#FAF9F5] dark:hover:bg-[#1C1C17] transition-colors"
                        >
                          <div
                            onClick={() => !isRenaming && handlePreviewFile(file)}
                            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          >
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.bgClass}`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              {isRenaming ? (
                                <div
                                  className="flex items-center gap-1.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="text"
                                    value={renamingTarget.value}
                                    onChange={(e) =>
                                      setRenamingTarget({ ...renamingTarget, value: e.target.value })
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleCommitRename();
                                      if (e.key === 'Escape') setRenamingTarget(null);
                                    }}
                                    autoFocus
                                    dir="auto"
                                    className="w-full max-w-xs bg-[#F5F6EE] dark:bg-[#12140E] text-xs font-semibold rounded-lg px-2 py-1 border border-[#4A6D22] dark:border-[#D0E8B2] focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={handleCommitRename}
                                    className="p-1.5 rounded-lg bg-[#4A6D22] text-white dark:bg-[#D0E8B2] dark:text-[#1A3700] cursor-pointer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div
                                    className="font-bold text-xs text-[#1A1C16] dark:text-[#E2E3DC] truncate"
                                    dir="auto"
                                    title={file.name}
                                  >
                                    {file.name}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[10px] text-[#5E6258] dark:text-[#8F9285] tabular-nums">
                                    <span>{meta.label}</span>
                                    <span>•</span>
                                    <span>{formatBytes(file.size)}</span>
                                    <span>•</span>
                                    <span>{formatPersianDate(file.createdAt)}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {previewable && (
                              <button
                                type="button"
                                onClick={() => handlePreviewFile(file)}
                                disabled={loadingPreviewId === file.id}
                                className="p-2 rounded-lg text-[#4A6D22] dark:text-[#D0E8B2] hover:bg-[#D0E8B2]/25 transition-colors cursor-pointer disabled:opacity-50"
                                title="مشاهده"
                              >
                                {loadingPreviewId === file.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDownloadFile(file)}
                              disabled={downloadingId === file.id}
                              className="p-2 rounded-lg text-[#43493E] dark:text-[#C4C8B9] hover:bg-[#EAECE2] dark:hover:bg-[#2B3025] transition-colors cursor-pointer"
                              title="دانلود"
                            >
                              {downloadingId === file.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setMovingFile(file)}
                              className="p-2 rounded-lg text-[#5E6258] dark:text-[#8F9285] hover:bg-[#EAECE2] dark:hover:bg-[#2B3025] transition-colors cursor-pointer"
                              title="انتقال به پوشه"
                            >
                              <FolderInput className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setRenamingTarget({ kind: 'file', id: file.id, value: file.name })
                              }
                              className="p-2 rounded-lg text-[#5E6258] dark:text-[#8F9285] hover:bg-[#EAECE2] dark:hover:bg-[#2B3025] transition-colors cursor-pointer"
                              title="تغییر نام"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteFile(file)}
                              className="p-2 rounded-lg text-[#A64D3B] dark:text-[#FFAB91] hover:bg-[#5C1A1A]/15 transition-colors cursor-pointer"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Move File to Folder Sub-Dialog */}
      {movingFile && (
        <div
          className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 anim-fade-in"
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMovingFile(null);
          }}
        >
          <div className="bg-white dark:bg-[#1C1C17] border border-[#E1E4D5] dark:border-[#43493E] rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 anim-scale-in">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-sm text-[#1A1C16] dark:text-[#E2E3DC]">
                انتقال فایل به پوشه
              </h3>
              <button
                type="button"
                onClick={() => setMovingFile(null)}
                className="p-1.5 rounded-xl text-[#5E6258] hover:bg-[#EAECE2] dark:hover:bg-[#23261F] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#5E6258] dark:text-[#8F9285] truncate" dir="auto">
              {movingFile.name}
            </p>
            <div className="max-h-60 overflow-y-auto space-y-1.5">
              <button
                type="button"
                onClick={() => handleMoveFile(null)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  !movingFile.folderId
                    ? 'bg-[#D0E8B2] text-[#1A3700]'
                    : 'bg-[#F5F6EE] dark:bg-[#23261F] text-[#1A1C16] dark:text-[#E2E3DC] hover:bg-[#EAECE2] dark:hover:bg-[#2B3025]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  پوشه اصلی (ریشه)
                </span>
                {!movingFile.folderId && <Check className="w-4 h-4" />}
              </button>

              {folders.map((fld) => (
                <button
                  key={fld.id}
                  type="button"
                  onClick={() => handleMoveFile(fld.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    movingFile.folderId === fld.id
                      ? 'bg-[#D0E8B2] text-[#1A3700]'
                      : 'bg-[#F5F6EE] dark:bg-[#23261F] text-[#1A1C16] dark:text-[#E2E3DC] hover:bg-[#EAECE2] dark:hover:bg-[#2B3025]'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Folder className="w-4 h-4 shrink-0" />
                    <span className="truncate">{fld.name}</span>
                  </span>
                  {movingFile.folderId === fld.id && <Check className="w-4 h-4 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Image / Video Inline Lightbox Preview */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-[85] bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 anim-fade-in"
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPreviewMedia(null);
              revokePreviewBlob();
            }
          }}
        >
          <div className="w-full max-w-4xl flex items-center justify-between gap-3 mb-3 text-white">
            <span className="text-xs sm:text-sm font-bold truncate" dir="auto">
              {previewMedia.file.name}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDownloadFile(previewMedia.file)}
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>دانلود</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreviewMedia(null);
                  revokePreviewBlob();
                }}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 cursor-pointer"
                aria-label="بستن پیش‌نمایش"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="max-w-4xl max-h-[82vh] w-full flex items-center justify-center">
            {previewMedia.kind === 'image' ? (
              <img
                src={previewMedia.blobUrl}
                alt={previewMedia.file.name}
                className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl"
              />
            ) : (
              <video
                src={previewMedia.blobUrl}
                controls
                autoPlay
                className="max-w-full max-h-[80vh] rounded-2xl shadow-2xl bg-black"
              />
            )}
          </div>
        </div>
      )}

      {/* Document / PDF / Audio / Code Viewer Modal */}
      {previewDoc && (
        <DocumentViewerModal
          attachment={previewDoc}
          onClose={() => {
            setPreviewDoc(null);
            revokePreviewBlob();
          }}
        />
      )}
    </>
  );
};
