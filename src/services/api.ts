import { Note, Category, BackupData, ServerSnapshot, NoteAttachment, NoteRevision, NoteDraft, TelegramConfig } from '../types';

export interface UploadProgressInfo {
  percent: number;
  loadedBytes: number;
  totalBytes: number;
  stage: 'reading' | 'uploading' | 'processing' | 'done' | 'error';
}

async function readError(res: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const body = await res.json();
    if (body?.error) message = body.error;
  } catch {
    // response had no JSON body; keep the fallback
  }
  throw new Error(message);
}

export const api = {
  // Notes
  async getNotes(params?: {
    category?: string;
    search?: string;
    filter?: string;
    tag?: string;
    hasAttachment?: boolean;
    attachmentType?: string;
    fromDate?: string;
    toDate?: string;
    importanceLevel?: string;
  }): Promise<Note[]> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', params.category);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.filter) searchParams.append('filter', params.filter);
    if (params?.tag) searchParams.append('tag', params.tag);
    if (params?.hasAttachment) searchParams.append('hasAttachment', 'true');
    if (params?.attachmentType) searchParams.append('attachmentType', params.attachmentType);
    if (params?.fromDate) searchParams.append('fromDate', params.fromDate);
    if (params?.toDate) searchParams.append('toDate', params.toDate);
    if (params?.importanceLevel) searchParams.append('importanceLevel', params.importanceLevel);

    const res = await fetch(`/api/notes?${searchParams.toString()}`);
    if (!res.ok) throw new Error('خطا در دریافت یادداشت‌ها');
    const data = await res.json();
    return data.notes || [];
  },

  async createNote(note: Partial<Note>): Promise<Note> {
    const res = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!res.ok) await readError(res, 'خطا در ذخیره یادداشت');
    const data = await res.json();
    return data.note;
  },

  async updateNote(id: string, updates: Partial<Note> & { revisionReason?: string }): Promise<Note> {
    const res = await fetch(`/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) await readError(res, 'خطا در به‌روزرسانی یادداشت');
    const data = await res.json();
    return data.note;
  },

  // Media uploads — the file lands on disk and we store only its URL on the note
  async uploadFile(
    file: File,
    duration?: number,
    onProgress?: (info: UploadProgressInfo) => void,
    signal?: AbortSignal
  ): Promise<NoteAttachment> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        return reject(new DOMException('آپلود توسط کاربر لغو شد', 'AbortError'));
      }

      onProgress?.({
        percent: 5,
        loadedBytes: 0,
        totalBytes: file.size,
        stage: 'reading',
      });

      const reader = new FileReader();

      const onAbort = () => {
        reader.abort();
        reject(new DOMException('آپلود توسط کاربر لغو شد', 'AbortError'));
      };

      signal?.addEventListener('abort', onAbort, { once: true });

      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const readPct = Math.round((e.loaded / e.total) * 20);
          onProgress?.({
            percent: Math.min(readPct, 20),
            loadedBytes: e.loaded,
            totalBytes: file.size,
            stage: 'reading',
          });
        }
      };

      reader.onerror = () => {
        signal?.removeEventListener('abort', onAbort);
        onProgress?.({
          percent: 0,
          loadedBytes: 0,
          totalBytes: file.size,
          stage: 'error',
        });
        reject(new Error('خطا در خواندن فایل'));
      };

      reader.onload = () => {
        signal?.removeEventListener('abort', onAbort);
        if (signal?.aborted) {
          return reject(new DOMException('آپلود توسط کاربر لغو شد', 'AbortError'));
        }

        onProgress?.({
          percent: 20,
          loadedBytes: file.size,
          totalBytes: file.size,
          stage: 'uploading',
        });

        const dataUrl = String(reader.result);
        const payload = JSON.stringify({ dataUrl, name: file.name, duration });

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/uploads');
        xhr.setRequestHeader('Content-Type', 'application/json');

        const onXhrAbort = () => {
          xhr.abort();
          reject(new DOMException('آپلود توسط کاربر لغو شد', 'AbortError'));
        };

        signal?.addEventListener('abort', onXhrAbort, { once: true });

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const uploadPct = 20 + Math.round((e.loaded / e.total) * 75);
            onProgress?.({
              percent: Math.min(uploadPct, 95),
              loadedBytes: Math.round((e.loaded / e.total) * file.size),
              totalBytes: file.size,
              stage: 'uploading',
            });
          }
        };

        xhr.onload = () => {
          signal?.removeEventListener('abort', onXhrAbort);
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText);
              onProgress?.({
                percent: 100,
                loadedBytes: file.size,
                totalBytes: file.size,
                stage: 'done',
              });
              resolve(data.attachment);
            } catch {
              reject(new Error('خطا در پردازش پاسخ سرور'));
            }
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              onProgress?.({
                percent: 0,
                loadedBytes: 0,
                totalBytes: file.size,
                stage: 'error',
              });
              reject(new Error(data.error || 'خطا در بارگذاری فایل'));
            } catch {
              reject(new Error('خطا در بارگذاری فایل'));
            }
          }
        };

        xhr.onerror = () => {
          signal?.removeEventListener('abort', onXhrAbort);
          onProgress?.({
            percent: 0,
            loadedBytes: 0,
            totalBytes: file.size,
            stage: 'error',
          });
          reject(new Error('خطای شبکه در بارگذاری فایل به سرور'));
        };

        xhr.onabort = () => {
          signal?.removeEventListener('abort', onXhrAbort);
          reject(new DOMException('آپلود توسط کاربر لغو شد', 'AbortError'));
        };

        xhr.send(payload);
      };

      reader.readAsDataURL(file);
    });
  },

  async deleteUpload(filename: string): Promise<void> {
    await fetch(`/api/uploads/${encodeURIComponent(filename)}`, { method: 'DELETE' });
  },

  async uploadBlob(
    blob: Blob,
    name: string,
    duration?: number,
    onProgress?: (info: UploadProgressInfo) => void,
    signal?: AbortSignal
  ): Promise<NoteAttachment> {
    const file = new File([blob], name, { type: blob.type || 'application/octet-stream' });
    return api.uploadFile(file, duration, onProgress, signal);
  },

  // Rewrites the text content of an already-uploaded text file.
  async updateTextFile(filename: string, content: string): Promise<void> {
    const res = await fetch(`/api/uploads/${encodeURIComponent(filename)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) await readError(res, 'خطا در ذخیره‌ی متن فایل');
  },

  // Revision history
  async getRevisions(noteId: string): Promise<NoteRevision[]> {
    const res = await fetch(`/api/notes/${noteId}/revisions`);
    if (!res.ok) await readError(res, 'خطا در دریافت تاریخچه نسخه‌ها');
    const data = await res.json();
    return data.revisions || [];
  },

  async restoreRevision(noteId: string, revisionId: string): Promise<Note> {
    const res = await fetch(`/api/notes/${noteId}/revisions/${revisionId}/restore`, { method: 'POST' });
    if (!res.ok) await readError(res, 'خطا در بازگردانی نسخه');
    const data = await res.json();
    return data.note;
  },

  // Autosaved drafts
  async getDraft(key: string): Promise<NoteDraft | null> {
    const res = await fetch(`/api/drafts/${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.draft || null;
  },

  async saveDraft(key: string, payload: Partial<Note>): Promise<string | null> {
    const res = await fetch(`/api/drafts/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.savedAt || null;
  },

  async deleteDraft(key: string): Promise<void> {
    await fetch(`/api/drafts/${encodeURIComponent(key)}`, { method: 'DELETE' });
  },

  async togglePin(id: string): Promise<Note> {
    const res = await fetch(`/api/notes/${id}/toggle-pin`, { method: 'POST' });
    if (!res.ok) throw new Error('خطا در سنجاق کردن یادداشت');
    const data = await res.json();
    return data.note;
  },

  async toggleImportant(id: string): Promise<Note> {
    const res = await fetch(`/api/notes/${id}/toggle-important`, { method: 'POST' });
    if (!res.ok) throw new Error('خطا در تغییر وضعیت نکته مهم');
    const data = await res.json();
    return data.note;
  },

  async deleteNote(id: string, permanent = false): Promise<void> {
    const res = await fetch(`/api/notes/${id}?permanent=${permanent}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('خطا در حذف یادداشت');
  },

  async restoreNote(id: string): Promise<Note> {
    const res = await fetch(`/api/notes/${id}/restore`, { method: 'POST' });
    if (!res.ok) throw new Error('خطا در بازگردانی یادداشت');
    const data = await res.json();
    return data.note;
  },

  async emptyTrash(): Promise<number> {
    const res = await fetch('/api/trash/empty', { method: 'DELETE' });
    if (!res.ok) throw new Error('خطا در تخلیه سطل زباله');
    const data = await res.json();
    return data.deletedCount;
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    const res = await fetch('/api/categories');
    if (!res.ok) throw new Error('خطا در دریافت دسته‌بندی‌ها');
    const data = await res.json();
    return data.categories || [];
  },

  async createCategory(cat: { name: string; color?: string; icon?: string; description?: string }): Promise<Category> {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'خطا در ایجاد دسته‌بندی');
    }
    const data = await res.json();
    return data.category;
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('خطا در ویرایش دسته‌بندی');
    const data = await res.json();
    return data.category;
  },

  async deleteCategory(id: string): Promise<void> {
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('خطا در حذف دسته‌بندی');
  },

  // Backup & Restore
  async downloadBackup(): Promise<BackupData> {
    const res = await fetch('/api/backup');
    if (!res.ok) throw new Error('خطا در تهیه نسخه پشتیبان');
    return await res.json();
  },

  async restoreBackup(data: BackupData, mode: 'overwrite' | 'merge'): Promise<{ message: string; totalNotes: number; totalCategories: number }> {
    const res = await fetch('/api/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, mode }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'خطا در بازیابی فایل پشتیبان');
    }
    return await res.json();
  },

  // Server Snapshots
  async getSnapshots(): Promise<ServerSnapshot[]> {
    const res = await fetch('/api/snapshots');
    if (!res.ok) throw new Error('خطا در دریافت لیست اسنپ‌شات‌ها');
    const data = await res.json();
    return data.snapshots || [];
  },

  async createSnapshot(label?: string): Promise<ServerSnapshot> {
    const res = await fetch('/api/snapshots/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    if (!res.ok) throw new Error('خطا در ایجاد نقطه پشتیبان');
    const data = await res.json();
    return data.snapshot;
  },

  async restoreSnapshot(id: string): Promise<{ message: string }> {
    const res = await fetch(`/api/snapshots/restore/${id}`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'خطا در بازیابی اسنپ‌شات');
    }
    return await res.json();
  },

  async deleteSnapshot(id: string): Promise<void> {
    const res = await fetch(`/api/snapshots/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('خطا در حذف اسنپ‌شات');
  },

  // Stats
  async getStats(): Promise<any> {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('خطا در دریافت آمار');
    const data = await res.json();
    return data.stats;
  },

  // Telegram Cloud Storage (MTProto)
  async getTelegramConfig(): Promise<TelegramConfig> {
    const res = await fetch('/api/telegram/config');
    if (!res.ok) throw new Error('خطا در دریافت تنظیمات تلگرام');
    const data = await res.json();
    return data.config;
  },

  async saveTelegramConfig(config: TelegramConfig): Promise<TelegramConfig> {
    const res = await fetch('/api/telegram/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) await readError(res, 'خطا در ذخیره تنظیمات تلگرام');
    const data = await res.json();
    return data.config;
  },

  async testTelegramConnection(config: Partial<TelegramConfig>): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/telegram/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return await res.json();
  },

  async syncTelegramDb(): Promise<{ message: string }> {
    const res = await fetch('/api/telegram/sync-db', { method: 'POST' });
    if (!res.ok) await readError(res, 'خطا در همگام‌سازی دیتابیس به تلگرام');
    return await res.json();
  },

  async restoreTelegramDb(): Promise<{ message: string; totalNotes: number; totalCategories: number }> {
    const res = await fetch('/api/telegram/restore-db', { method: 'POST' });
    if (!res.ok) await readError(res, 'خطا در بازیابی دیتابیس از تلگرام');
    return await res.json();
  },

  async migrateLocalFilesToTelegram(): Promise<{ message: string; migratedCount: number; freedBytes: number }> {
    const res = await fetch('/api/telegram/migrate', { method: 'POST' });
    if (!res.ok) await readError(res, 'خطا در انتقال فایل‌ها به تلگرام');
    return await res.json();
  },
};
