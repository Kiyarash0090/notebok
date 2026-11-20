import { Note, Category, BackupData, ServerSnapshot, NoteAttachment, NoteRevision, NoteDraft, TelegramConfig, AuthStatus, ManagedFile, ManagedFolder } from '../types';

export interface UploadProgressInfo {
  percent: number;
  loadedBytes: number;
  totalBytes: number;
  stage: 'reading' | 'uploading' | 'processing' | 'done' | 'error';
}

const AUTH_TOKEN_KEY = 'nivra_auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function notifyUnauthorized(): void {
  setAuthToken(null);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nivra:unauthorized'));
  }
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(input, {
    ...init,
    headers,
    credentials: init.credentials ?? 'same-origin',
  });

  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  if (
    res.status === 401 &&
    !urlStr.includes('/api/auth/login') &&
    !urlStr.includes('/api/auth/setup')
  ) {
    notifyUnauthorized();
  }

  return res;
}

export interface ApiError extends Error {
  needsSetup?: boolean;
  locked?: boolean;
  reason?: 'not_configured' | 'disabled';
  hasCredentials?: boolean;
  hasChatId?: boolean;
  enabled?: boolean;
  chatId?: string;
}

async function readError(res: Response, fallback: string): Promise<never> {
  let message = fallback;
  let body: any = null;
  try {
    body = await res.json();
    if (body?.error) message = body.error;
  } catch {
    // response had no JSON body; keep the fallback
  }
  const err = new Error(message) as ApiError;
  if (body?.needsSetup) err.needsSetup = true;
  if (body?.locked) err.locked = true;
  if (body?.reason) err.reason = body.reason;
  if (body?.hasCredentials !== undefined) err.hasCredentials = Boolean(body.hasCredentials);
  if (body?.hasChatId !== undefined) err.hasChatId = Boolean(body.hasChatId);
  if (body?.enabled !== undefined) err.enabled = Boolean(body.enabled);
  if (body?.chatId !== undefined) err.chatId = String(body.chatId || '');
  throw err;
}

export const api = {
  // Authentication
  async getAuthStatus(): Promise<AuthStatus> {
    const res = await apiFetch('/api/auth/status');
    if (!res.ok) throw new Error('خطا در بررسی وضعیت ورود');
    const data = await res.json();
    return {
      configured: Boolean(data.configured),
      authenticated: Boolean(data.authenticated),
      username: data.username,
    };
  },

  async setupAuth(payload: {
    username: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ token: string; user: { username: string } }> {
    const res = await apiFetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) await readError(res, 'خطا در تنظیم نام کاربری و رمز عبور');
    const data = await res.json();
    if (data.token) setAuthToken(data.token);
    return { token: data.token, user: data.user };
  },

  async login(payload: {
    username: string;
    password: string;
  }): Promise<{ token: string; user: { username: string } }> {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) await readError(res, 'نام کاربری یا رمز عبور اشتباه است');
    const data = await res.json();
    if (data.token) setAuthToken(data.token);
    return { token: data.token, user: data.user };
  },

  async logout(): Promise<void> {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setAuthToken(null);
    }
  },

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

    const res = await apiFetch(`/api/notes?${searchParams.toString()}`);
    if (!res.ok) throw new Error('خطا در دریافت یادداشت‌ها');
    const data = await res.json();
    return data.notes || [];
  },

  async createNote(note: Partial<Note>): Promise<Note> {
    const res = await apiFetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(note),
    });
    if (!res.ok) await readError(res, 'خطا در ذخیره یادداشت');
    const data = await res.json();
    return data.note;
  },

  async updateNote(id: string, updates: Partial<Note> & { revisionReason?: string }): Promise<Note> {
    const res = await apiFetch(`/api/notes/${id}`, {
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
        const token = getAuthToken();
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

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
            if (xhr.status === 401) {
              notifyUnauthorized();
            }
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
    await apiFetch(`/api/uploads/${encodeURIComponent(filename)}`, { method: 'DELETE' });
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
    const res = await apiFetch(`/api/uploads/${encodeURIComponent(filename)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) await readError(res, 'خطا در ذخیره‌ی متن فایل');
  },

  // Revision history
  async getRevisions(noteId: string): Promise<NoteRevision[]> {
    const res = await apiFetch(`/api/notes/${noteId}/revisions`);
    if (!res.ok) await readError(res, 'خطا در دریافت تاریخچه نسخه‌ها');
    const data = await res.json();
    return data.revisions || [];
  },

  async restoreRevision(noteId: string, revisionId: string): Promise<Note> {
    const res = await apiFetch(`/api/notes/${noteId}/revisions/${revisionId}/restore`, { method: 'POST' });
    if (!res.ok) await readError(res, 'خطا در بازگردانی نسخه');
    const data = await res.json();
    return data.note;
  },

  // Autosaved drafts
  async getDraft(key: string): Promise<NoteDraft | null> {
    const res = await apiFetch(`/api/drafts/${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.draft || null;
  },

  async saveDraft(key: string, payload: Partial<Note>): Promise<string | null> {
    const res = await apiFetch(`/api/drafts/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.savedAt || null;
  },

  async deleteDraft(key: string): Promise<void> {
    await apiFetch(`/api/drafts/${encodeURIComponent(key)}`, { method: 'DELETE' });
  },

  async togglePin(id: string): Promise<Note> {
    const res = await apiFetch(`/api/notes/${id}/toggle-pin`, { method: 'POST' });
    if (!res.ok) throw new Error('خطا در سنجاق کردن یادداشت');
    const data = await res.json();
    return data.note;
  },

  async toggleImportant(id: string): Promise<Note> {
    const res = await apiFetch(`/api/notes/${id}/toggle-important`, { method: 'POST' });
    if (!res.ok) throw new Error('خطا در تغییر وضعیت نکته مهم');
    const data = await res.json();
    return data.note;
  },

  async deleteNote(id: string, permanent = false): Promise<void> {
    const res = await apiFetch(`/api/notes/${id}?permanent=${permanent}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('خطا در حذف یادداشت');
  },

  async restoreNote(id: string): Promise<Note> {
    const res = await apiFetch(`/api/notes/${id}/restore`, { method: 'POST' });
    if (!res.ok) throw new Error('خطا در بازگردانی یادداشت');
    const data = await res.json();
    return data.note;
  },

  async emptyTrash(): Promise<number> {
    const res = await apiFetch('/api/trash/empty', { method: 'DELETE' });
    if (!res.ok) throw new Error('خطا در تخلیه سطل زباله');
    const data = await res.json();
    return data.deletedCount;
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    const res = await apiFetch('/api/categories');
    if (!res.ok) throw new Error('خطا در دریافت دسته‌بندی‌ها');
    const data = await res.json();
    return data.categories || [];
  },

  async createCategory(cat: {
    name: string;
    color?: string;
    icon?: string;
    description?: string;
    parentId?: string | null;
    subcategories?: string[];
  }): Promise<{ category: Category; createdCategories: Category[] }> {
    const res = await apiFetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'خطا در ایجاد دسته‌بندی');
    }
    const data = await res.json();
    const createdList: Category[] = Array.isArray(data.createdCategories) && data.createdCategories.length > 0
      ? data.createdCategories
      : [data.category];
    return { category: data.category, createdCategories: createdList };
  },

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const res = await apiFetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('خطا در ویرایش دسته‌بندی');
    const data = await res.json();
    return data.category;
  },

  async deleteCategory(id: string): Promise<void> {
    const res = await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('خطا در حذف دسته‌بندی');
  },

  async reorderCategories(orderedIds: string[]): Promise<Category[]> {
    const res = await apiFetch('/api/categories/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds }),
    });
    if (!res.ok) throw new Error('خطا در ذخیره ترتیب دسته‌بندی‌ها');
    const data = await res.json();
    return data.categories || [];
  },

  // Backup & Restore
  async downloadBackup(): Promise<BackupData> {
    const res = await apiFetch('/api/backup');
    if (!res.ok) throw new Error('خطا در تهیه نسخه پشتیبان');
    return await res.json();
  },

  async restoreBackup(data: BackupData, mode: 'overwrite' | 'merge'): Promise<{ message: string; totalNotes: number; totalCategories: number }> {
    const res = await apiFetch('/api/restore', {
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
    const res = await apiFetch('/api/snapshots');
    if (!res.ok) throw new Error('خطا در دریافت لیست اسنپ‌شات‌ها');
    const data = await res.json();
    return data.snapshots || [];
  },

  async createSnapshot(label?: string): Promise<ServerSnapshot> {
    const res = await apiFetch('/api/snapshots/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    if (!res.ok) throw new Error('خطا در ایجاد نقطه پشتیبان');
    const data = await res.json();
    return data.snapshot;
  },

  async restoreSnapshot(id: string): Promise<{ message: string }> {
    const res = await apiFetch(`/api/snapshots/restore/${id}`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'خطا در بازیابی اسنپ‌شات');
    }
    return await res.json();
  },

  async deleteSnapshot(id: string): Promise<void> {
    const res = await apiFetch(`/api/snapshots/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('خطا در حذف اسنپ‌شات');
  },

  // Stats
  async getStats(): Promise<any> {
    const res = await apiFetch('/api/stats');
    if (!res.ok) throw new Error('خطا در دریافت آمار');
    const data = await res.json();
    return data.stats;
  },

  // Telegram Cloud Storage (MTProto)
  async getTelegramConfig(): Promise<TelegramConfig> {
    const res = await apiFetch('/api/telegram/config');
    if (!res.ok) throw new Error('خطا در دریافت تنظیمات تلگرام');
    const data = await res.json();
    return data.config;
  },

  async saveTelegramConfig(config: TelegramConfig): Promise<TelegramConfig> {
    const res = await apiFetch('/api/telegram/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!res.ok) await readError(res, 'خطا در ذخیره تنظیمات تلگرام');
    const data = await res.json();
    return data.config;
  },

  async testTelegramConnection(config: Partial<TelegramConfig>): Promise<{ success: boolean; message: string }> {
    const res = await apiFetch('/api/telegram/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return await res.json();
  },

  async syncTelegramDb(): Promise<{ message: string }> {
    const res = await apiFetch('/api/telegram/sync-db', { method: 'POST' });
    if (!res.ok) await readError(res, 'خطا در همگام‌سازی دیتابیس به تلگرام');
    return await res.json();
  },

  async restoreTelegramDb(): Promise<{ message: string; totalNotes: number; totalCategories: number }> {
    const res = await apiFetch('/api/telegram/restore-db', { method: 'POST' });
    if (!res.ok) await readError(res, 'خطا در بازیابی دیتابیس از تلگرام');
    return await res.json();
  },

  async getTelegramStatus(): Promise<{
    ready: boolean;
    reason?: 'not_configured' | 'disabled';
    hasCredentials: boolean;
    hasChatId: boolean;
    enabled: boolean;
    chatId: string;
  }> {
    const res = await apiFetch('/api/telegram/status');
    if (!res.ok) throw new Error('خطا در بررسی وضعیت کانال تلگرام');
    return await res.json();
  },

  async migrateLocalFilesToTelegram(): Promise<{ message: string; migratedCount: number; freedBytes: number }> {
    const res = await apiFetch('/api/telegram/migrate', { method: 'POST' });
    if (!res.ok) await readError(res, 'خطا در انتقال فایل‌ها به تلگرام');
    return await res.json();
  },

  // File Manager (strictly Telegram channel backed)
  async getManagedFiles(refresh = false): Promise<{ files: ManagedFile[]; folders: ManagedFolder[]; chatId?: string }> {
    const res = await apiFetch(`/api/files${refresh ? '?refresh=1' : ''}`);
    if (!res.ok) await readError(res, 'خطا در دریافت لیست فایل‌ها');
    const data = await res.json();
    return {
      files: Array.isArray(data.files) ? data.files : [],
      folders: Array.isArray(data.folders) ? data.folders : [],
      chatId: data.chatId,
    };
  },

  async syncManagedFilesFromTelegram(): Promise<{ files: ManagedFile[]; folders: ManagedFolder[]; chatId?: string }> {
    const res = await apiFetch('/api/files/sync', { method: 'POST' });
    if (!res.ok) await readError(res, 'خطا در همگام‌سازی فایل‌ها از کانال تلگرام');
    const data = await res.json();
    return {
      files: Array.isArray(data.files) ? data.files : [],
      folders: Array.isArray(data.folders) ? data.folders : [],
      chatId: data.chatId,
    };
  },

  async uploadManagedFileToTelegram(
    file: File,
    folderId: string | null,
    onProgress?: (info: UploadProgressInfo) => void,
    signal?: AbortSignal
  ): Promise<ManagedFile> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        return reject(new DOMException('آپلود توسط کاربر لغو شد', 'AbortError'));
      }

      onProgress?.({
        percent: 5,
        loadedBytes: 0,
        totalBytes: file.size,
        stage: 'uploading',
      });

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/files/upload');
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name || 'file'));
      xhr.setRequestHeader('X-File-Mime', file.type || 'application/octet-stream');
      if (folderId) {
        xhr.setRequestHeader('X-Folder-Id', folderId);
      }
      const token = getAuthToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      const onAbort = () => {
        xhr.abort();
        reject(new DOMException('آپلود توسط کاربر لغو شد', 'AbortError'));
      };
      signal?.addEventListener('abort', onAbort, { once: true });

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = 5 + Math.round((e.loaded / e.total) * 75);
          onProgress?.({
            percent: Math.min(pct, 80),
            loadedBytes: e.loaded,
            totalBytes: e.total,
            stage: pct >= 80 ? 'processing' : 'uploading',
          });
        }
      };

      xhr.onload = () => {
        signal?.removeEventListener('abort', onAbort);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            onProgress?.({
              percent: 100,
              loadedBytes: file.size,
              totalBytes: file.size,
              stage: 'done',
            });
            resolve(data.file);
          } catch {
            reject(new Error('خطا در پردازش پاسخ سرور'));
          }
        } else {
          if (xhr.status === 401) {
            notifyUnauthorized();
          }
          onProgress?.({
            percent: 0,
            loadedBytes: 0,
            totalBytes: file.size,
            stage: 'error',
          });
          try {
            const body = JSON.parse(xhr.responseText);
            const err = new Error(body?.error || 'خطا در ذخیره فایل در کانال تلگرام') as ApiError;
            if (body?.locked) err.locked = true;
            if (body?.reason) err.reason = body.reason;
            reject(err);
          } catch {
            reject(new Error('خطا در ذخیره فایل در کانال تلگرام'));
          }
        }
      };

      xhr.onerror = () => {
        signal?.removeEventListener('abort', onAbort);
        onProgress?.({
          percent: 0,
          loadedBytes: 0,
          totalBytes: file.size,
          stage: 'error',
        });
        reject(new Error('خطای شبکه در ارسال فایل به تلگرام'));
      };

      xhr.onabort = () => {
        signal?.removeEventListener('abort', onAbort);
        reject(new DOMException('آپلود توسط کاربر لغو شد', 'AbortError'));
      };

      xhr.send(file);
    });
  },

  async registerManagedFile(payload: {
    name: string;
    mimeType: string;
    size: number;
    url: string;
    folderId?: string | null;
    storage?: 'local' | 'telegram';
  }): Promise<ManagedFile> {
    const res = await apiFetch('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) await readError(res, 'خطا در ثبت اطلاعات فایل');
    const data = await res.json();
    return data.file;
  },

  async updateManagedFile(
    id: string,
    updates: { name?: string; folderId?: string | null }
  ): Promise<ManagedFile> {
    const res = await apiFetch(`/api/files/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) await readError(res, 'خطا در ویرایش فایل');
    const data = await res.json();
    return data.file;
  },

  async deleteManagedFile(id: string): Promise<void> {
    const res = await apiFetch(`/api/files/${id}`, { method: 'DELETE' });
    if (!res.ok) await readError(res, 'خطا در حذف فایل');
  },

  async createManagedFolder(payload: { name: string; parentId?: string | null }): Promise<ManagedFolder> {
    const res = await apiFetch('/api/files/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) await readError(res, 'خطا در ایجاد پوشه');
    const data = await res.json();
    return data.folder;
  },

  async renameManagedFolder(id: string, name: string): Promise<ManagedFolder> {
    const res = await apiFetch(`/api/files/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) await readError(res, 'خطا در تغییر نام پوشه');
    const data = await res.json();
    return data.folder;
  },

  async deleteManagedFolder(id: string): Promise<void> {
    const res = await apiFetch(`/api/files/folders/${id}`, { method: 'DELETE' });
    if (!res.ok) await readError(res, 'خطا در حذف پوشه');
  },
};


