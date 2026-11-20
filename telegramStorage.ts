import fs from 'fs';
import path from 'path';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { CustomFile } from 'telegram/client/uploads.js';

export interface TelegramConfig {
  enabled: boolean;
  apiId: number;
  apiHash: string;
  botToken: string;
  chatId: string; // e.g. "-1001234567890" or "@my_storage_channel"
  autoSyncDb: boolean;
  lastSyncAt?: string;
  lastSyncMessageId?: number;
  filesIndexMessageId?: number;
  filesIndexChatId?: string;
}

export interface TelegramChannelStatus {
  ready: boolean;
  reason?: 'not_configured' | 'disabled';
  hasCredentials: boolean;
  hasChatId: boolean;
  enabled: boolean;
  chatId: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'telegram_config.json');
const SESSION_FILE = path.join(DATA_DIR, 'telegram_session.txt');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getTelegramConfig(): TelegramConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        enabled: Boolean(parsed.enabled),
        apiId: Number(parsed.apiId) || 0,
        apiHash: String(parsed.apiHash || ''),
        botToken: String(parsed.botToken || ''),
        chatId: String(parsed.chatId || ''),
        autoSyncDb: parsed.autoSyncDb !== undefined ? Boolean(parsed.autoSyncDb) : true,
        lastSyncAt: parsed.lastSyncAt,
        lastSyncMessageId: parsed.lastSyncMessageId ? Number(parsed.lastSyncMessageId) : undefined,
        filesIndexMessageId: parsed.filesIndexMessageId ? Number(parsed.filesIndexMessageId) : undefined,
        filesIndexChatId: parsed.filesIndexChatId ? String(parsed.filesIndexChatId) : undefined,
      };
    }
  } catch (err) {
    console.error('Error reading telegram_config.json:', err);
  }
  return {
    enabled: false,
    apiId: 0,
    apiHash: '',
    botToken: '',
    chatId: '',
    autoSyncDb: true,
  };
}

export function getTelegramChannelStatus(cfg: TelegramConfig = getTelegramConfig()): TelegramChannelStatus {
  const hasCredentials = Boolean(cfg.apiId > 0 && cfg.apiHash?.trim() && cfg.botToken?.trim());
  const chatId = (cfg.chatId || '').trim();
  const hasChatId = Boolean(chatId);
  const enabled = Boolean(cfg.enabled);

  if (!hasCredentials || !hasChatId) {
    return {
      ready: false,
      reason: 'not_configured',
      hasCredentials,
      hasChatId,
      enabled,
      chatId,
    };
  }
  if (!enabled) {
    return {
      ready: false,
      reason: 'disabled',
      hasCredentials,
      hasChatId,
      enabled,
      chatId,
    };
  }
  return {
    ready: true,
    hasCredentials,
    hasChatId,
    enabled,
    chatId,
  };
}

export function saveTelegramConfig(config: TelegramConfig): void {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving telegram_config.json:', err);
  }
}

function getSavedSession(): string {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      return fs.readFileSync(SESSION_FILE, 'utf-8').trim();
    }
  } catch {}
  return '';
}

function saveSession(sessionStr: string): void {
  try {
    fs.writeFileSync(SESSION_FILE, sessionStr, 'utf-8');
  } catch (err) {
    console.error('Error saving session string:', err);
  }
}

let activeClient: TelegramClient | null = null;
let activeClientConfigKey = '';
let activeClientConnected = false;
let activeOperationsCount = 0;
let idleDisconnectTimer: NodeJS.Timeout | null = null;
const IDLE_TIMEOUT_MS = 25000; // 25 seconds of inactivity closes connection to free 100% resources

function beginTelegramOp(): void {
  activeOperationsCount++;
  if (idleDisconnectTimer) {
    clearTimeout(idleDisconnectTimer);
    idleDisconnectTimer = null;
  }
}

function endTelegramOp(): void {
  activeOperationsCount = Math.max(0, activeOperationsCount - 1);
  if (activeOperationsCount === 0) {
    resetTelegramIdleTimer();
  }
}

export function resetTelegramIdleTimer(): void {
  if (idleDisconnectTimer) {
    clearTimeout(idleDisconnectTimer);
    idleDisconnectTimer = null;
  }
  if (activeOperationsCount > 0) {
    return;
  }
  idleDisconnectTimer = setTimeout(async () => {
    idleDisconnectTimer = null;
    if (activeOperationsCount > 0) return;
    if (activeClient) {
      try {
        console.log('Telegram MTProto client idle: disconnecting to save 100% server resources.');
        await activeClient.disconnect();
      } catch (err: any) {
        console.warn('Error during Telegram idle disconnect:', err.message);
      } finally {
        activeClient = null;
        activeClientConnected = false;
        activeClientConfigKey = '';
      }
    }
  }, IDLE_TIMEOUT_MS);

  if (idleDisconnectTimer && typeof idleDisconnectTimer.unref === 'function') {
    idleDisconnectTimer.unref();
  }
}

export async function disconnectTelegramClient(): Promise<void> {
  if (idleDisconnectTimer) {
    clearTimeout(idleDisconnectTimer);
    idleDisconnectTimer = null;
  }
  if (activeClient) {
    try {
      await activeClient.disconnect();
    } catch {}
    activeClient = null;
    activeClientConnected = false;
    activeClientConfigKey = '';
  }
}

export async function getTelegramClient(customConfig?: TelegramConfig): Promise<TelegramClient> {
  const cfg = customConfig || getTelegramConfig();
  if (!cfg.apiId || !cfg.apiHash || !cfg.botToken) {
    throw new Error('تنظیمات تلگرام (API ID، API Hash یا Bot Token) کامل نیستند.');
  }

  const configKey = `${cfg.apiId}_${cfg.apiHash}_${cfg.botToken}`;
  if (activeClient && activeClientConnected && activeClientConfigKey === configKey) {
    resetTelegramIdleTimer();
    return activeClient;
  }

  // Close previous if config changed
  if (activeClient) {
    try {
      await activeClient.disconnect();
    } catch {}
    activeClient = null;
  }

  const savedSession = getSavedSession();
  const stringSession = new StringSession(savedSession);

  const client = new TelegramClient(stringSession, cfg.apiId, cfg.apiHash, {
    connectionRetries: 5,
    useWSS: false,
  });

  await client.start({
    botAuthToken: cfg.botToken,
  });

  const sessionStr = client.session.save() as unknown as string;
  if (sessionStr) {
    saveSession(sessionStr);
  }

  activeClient = client;
  activeClientConnected = true;
  activeClientConfigKey = configKey;

  resetTelegramIdleTimer();
  return client;
}

/**
  Test connection to Telegram and send a ping message to the specified chatId
 */
export async function testTelegramConnection(cfg: TelegramConfig): Promise<{ success: boolean; message: string }> {
  try {
    const client = await getTelegramClient(cfg);
    const me = await client.getMe();
    
    if (!cfg.chatId) {
      resetTelegramIdleTimer();
      return {
        success: true,
        message: `اتصال موفقیت‌آمیز بود! ربات متصل شد: @${(me as any)?.username || 'Bot'} (نکته: شناسه چت/کانال را وارد کنید تا تست ارسال نیز انجام شود).`,
      };
    }

    // Try sending test ping message to chatId
    const result = await client.sendMessage(cfg.chatId, {
      message: `🟢 **تست اتصال NIVRA**\nاتصال موفقیت‌آمیز به ابَر-فضای ابری تلگرام با MTProto در تاریخ ${new Date().toLocaleString('fa-IR')}`,
    });

    resetTelegramIdleTimer();
    return {
      success: true,
      message: `اتصال به تلگرام و ارسال پیام به چت/کانال با موفقیت انجام شد! (شناسه پیام: ${result.id})`,
    };
  } catch (err: any) {
    console.error('Telegram test connection error:', err);
    resetTelegramIdleTimer();
    return {
      success: false,
      message: err.message || 'خطا در برقرار ارتباط با تلگرام',
    };
  }
}

/**
  Upload a buffer to Telegram Cloud using MTProto chunked stream
 */
export async function uploadFileToTelegram(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
  options: { forceDocument?: boolean; captionTag?: string } = {}
): Promise<{ messageId: number; size: number; caption: string }> {
  const cfg = getTelegramConfig();
  if (!cfg.enabled || !cfg.chatId) {
    throw new Error('ذخیره‌سازی ابری تلگرام فعال نیست یا شناسه چت/کانال وارد نشده است.');
  }

  beginTelegramOp();
  try {
    const client = await getTelegramClient(cfg);

    const toUpload = new CustomFile(originalName, buffer.length, '', buffer);
    const tag = options.captionTag || 'NIVRA_ATTACHMENT';
    const sizeLabel =
      buffer.length >= 1024 * 1024
        ? `${(buffer.length / (1024 * 1024)).toFixed(2)} MB`
        : `${Math.max(1, Math.round(buffer.length / 1024))} KB`;

    const sentMessage = await client.sendFile(cfg.chatId, {
      file: toUpload,
      forceDocument: options.forceDocument ?? false,
      caption: `📦 **[${tag}]**\n📄 نام: \`${originalName}\`\n⚖️ حجم: ${sizeLabel}\n⏱️ تاریخ: ${new Date().toISOString()}`,
      workers: 4,
    });

    return {
      messageId: sentMessage.id,
      size: buffer.length,
      caption: originalName,
    };
  } finally {
    endTelegramOp();
  }
}

/**
  Download file media from Telegram Cloud using MTProto
 */
export async function downloadFileFromTelegram(messageId: number): Promise<{ buffer: Buffer; mimeType?: string }> {
  const cfg = getTelegramConfig();
  if (!cfg.chatId) {
    throw new Error('شناسه کانال/چت تلگرام تنظیم نشده است.');
  }

  beginTelegramOp();
  try {
    const client = await getTelegramClient(cfg);

    const messages = await client.getMessages(cfg.chatId, { ids: [messageId] });
    if (!messages || messages.length === 0 || !messages[0] || !messages[0].media) {
      throw new Error(`فایل مربوط به پیام ID=${messageId} در تلگرام یافت نشد.`);
    }

    const msg = messages[0];
    const downloaded = await client.downloadMedia(msg.media, {});

    if (!downloaded) {
      throw new Error('خطا در دانلود رسانه از تلگرام');
    }

    let mimeType = 'application/octet-stream';
    if ('document' in msg.media && (msg.media.document as any)?.mimeType) {
      mimeType = (msg.media.document as any).mimeType;
    } else if ('photo' in msg.media) {
      mimeType = 'image/jpeg';
    }

    const buffer = Buffer.isBuffer(downloaded) ? downloaded : Buffer.from(downloaded as any);
    return { buffer, mimeType };
  } finally {
    endTelegramOp();
  }
}

/**
  Delete a stored file message from Telegram channel (best-effort)
 */
export async function deleteFileFromTelegram(messageId: number): Promise<void> {
  const status = getTelegramChannelStatus();
  if (!status.ready || !Number.isFinite(messageId) || messageId <= 0) return;

  beginTelegramOp();
  try {
    const cfg = getTelegramConfig();
    const client = await getTelegramClient(cfg);
    await client.deleteMessages(cfg.chatId, [messageId], { revoke: true });
  } finally {
    endTelegramOp();
  }
}

/**
  Sync File Manager index (files & folders) to the configured Telegram channel.
  Edits the existing [NIVRA_FILES_INDEX] message in-place so the channel stays clean.
 */
export async function syncFilesIndexToTelegram(
  files: any[],
  folders: any[]
): Promise<{ messageId: number; edited: boolean }> {
  const cfg = getTelegramConfig();
  const status = getTelegramChannelStatus(cfg);
  if (!status.ready) {
    throw new Error('کانال تلگرام تنظیم یا فعال نشده است.');
  }

  beginTelegramOp();
  try {
    const client = await getTelegramClient(cfg);

    const channelFiles = (files || []).filter(
      (f) => f && f.storage === 'telegram' && (!f.telegramChatId || f.telegramChatId === status.chatId)
    );
    const channelFolders = (folders || []).filter(
      (fld) => fld && (!fld.telegramChatId || fld.telegramChatId === status.chatId)
    );

    const payload = {
      version: 1,
      chatId: status.chatId,
      files: channelFiles,
      folders: channelFolders,
      updatedAt: new Date().toISOString(),
    };

    const buffer = Buffer.from(JSON.stringify(payload, null, 2), 'utf-8');
    const fileToUpload = new CustomFile('nivra_files_index.json', buffer.length, '', buffer);
    const caption = `🗂️ **[NIVRA_FILES_INDEX]**\n📁 پوشه‌ها: ${channelFolders.length} | 📄 فایل‌ها: ${channelFiles.length}\n🕒 آخرین به‌روزرسانی: ${new Date().toLocaleString('fa-IR')}`;

    let targetMessageId =
      cfg.filesIndexChatId === status.chatId && cfg.filesIndexMessageId
        ? cfg.filesIndexMessageId
        : undefined;
    let didEdit = false;

    if (targetMessageId) {
      try {
        await client.editMessage(cfg.chatId, {
          message: targetMessageId,
          file: fileToUpload,
          text: caption,
        });
        didEdit = true;
      } catch (editErr: any) {
        console.warn('Could not edit Telegram files index in-place, replacing:', editErr.message);
        try {
          await client.deleteMessages(cfg.chatId, [targetMessageId], { revoke: true });
        } catch {}
        targetMessageId = undefined;
      }
    }

    if (!targetMessageId) {
      const sent = await client.sendFile(cfg.chatId, {
        file: fileToUpload,
        caption,
        forceDocument: true,
        workers: 2,
      });
      targetMessageId = sent.id;
    }

    cfg.filesIndexMessageId = targetMessageId;
    cfg.filesIndexChatId = status.chatId;
    saveTelegramConfig(cfg);

    return { messageId: targetMessageId, edited: didEdit };
  } finally {
    endTelegramOp();
  }
}

function extractDocumentMetadataFromMsg(msg: any): { name: string; mimeType: string; size: number } {
  let name = `telegram_file_${msg.id}`;
  let mimeType = 'application/octet-stream';
  let size = 0;

  const doc = msg?.media?.document;
  if (doc) {
    if (typeof doc.mimeType === 'string' && doc.mimeType) {
      mimeType = doc.mimeType;
    }
    if (doc.size !== undefined && doc.size !== null) {
      size = Number(doc.size) || 0;
    }
    if (Array.isArray(doc.attributes)) {
      for (const attr of doc.attributes) {
        if (attr && typeof attr.fileName === 'string' && attr.fileName.trim()) {
          name = attr.fileName.trim();
          break;
        }
      }
    }
  } else if (msg?.media?.photo) {
    name = `photo_${msg.id}.jpg`;
    mimeType = 'image/jpeg';
  }

  const text = String(msg?.message || msg?.text || '');
  const nameMatch = text.match(/📄\s*نام:\s*`([^`]+)`/);
  if (nameMatch?.[1]?.trim()) {
    name = nameMatch[1].trim();
  }

  return { name, mimeType, size };
}

/**
  Read File Manager files & folders directly from the configured Telegram channel.
  Reads [NIVRA_FILES_INDEX] if present and also scans recent [NIVRA_FILE] media messages.
 */
export async function readFilesIndexFromTelegram(): Promise<{
  files: any[];
  folders: any[];
  chatId: string;
}> {
  const cfg = getTelegramConfig();
  const status = getTelegramChannelStatus(cfg);
  if (!status.ready) {
    throw new Error('کانال تلگرام تنظیم یا فعال نشده است.');
  }

  beginTelegramOp();
  try {
    const client = await getTelegramClient(cfg);
    let indexMsg: any = null;
    const scannedMessages: any[] = [];

    if (cfg.filesIndexChatId === status.chatId && cfg.filesIndexMessageId) {
      try {
        const msgs = await client.getMessages(cfg.chatId, { ids: [cfg.filesIndexMessageId] });
        if (msgs?.[0]?.media && String(msgs[0].message || msgs[0].text || '').includes('[NIVRA_FILES_INDEX]')) {
          indexMsg = msgs[0];
        }
      } catch (err) {
        console.warn('Direct Telegram files index lookup failed:', err);
      }
    }

    if (!indexMsg) {
      let topId = 0;
      try {
        const probe = await client.sendMessage(cfg.chatId, {
          message: '🔍 در حال همگام‌سازی فایل‌های کانال تلگرام...',
        });
        topId = probe.id;
        try {
          await probe.delete({ revoke: true });
        } catch {}
      } catch (err: any) {
        console.warn('Telegram probe message failed during file scan:', err.message);
      }

      if (!topId && cfg.filesIndexMessageId) {
        topId = cfg.filesIndexMessageId + 50;
      }

      if (topId > 0) {
        const idsToCheck: number[] = [];
        for (let i = 0; i < 150; i++) {
          const id = topId - i;
          if (id > 0) idsToCheck.push(id);
        }
        for (let i = 0; i < idsToCheck.length; i += 50) {
          const chunk = idsToCheck.slice(i, i + 50);
          try {
            const msgs = await client.getMessages(cfg.chatId, { ids: chunk });
            if (Array.isArray(msgs)) {
              scannedMessages.push(...msgs.filter(Boolean));
            }
          } catch (err) {
            console.warn('Error scanning Telegram messages chunk:', err);
          }
        }
        scannedMessages.sort((a, b) => b.id - a.id);
        indexMsg = scannedMessages.find(
          (m) => m && m.media && String(m.message || m.text || '').includes('[NIVRA_FILES_INDEX]')
        );
      }
    }

    let files: any[] = [];
    let folders: any[] = [];

    if (indexMsg?.media) {
      try {
        const downloaded = await client.downloadMedia(indexMsg.media, {});
        if (downloaded) {
          const parsed = JSON.parse(downloaded.toString('utf-8'));
          if (Array.isArray(parsed?.files)) {
            files = parsed.files.map((f: any) => ({
              ...f,
              storage: 'telegram',
              telegramChatId: f.telegramChatId || status.chatId,
            }));
          }
          if (Array.isArray(parsed?.folders)) {
            folders = parsed.folders.map((fld: any) => ({
              ...fld,
              telegramChatId: fld.telegramChatId || status.chatId,
            }));
          }
        }
        cfg.filesIndexMessageId = indexMsg.id;
        cfg.filesIndexChatId = status.chatId;
        saveTelegramConfig(cfg);
      } catch (parseErr) {
        console.warn('Failed to parse Telegram files index JSON:', parseErr);
      }
    }

    // Also include any [NIVRA_FILE] media messages from the channel not already tracked in index
    const trackedMessageIds = new Set<number>(
      files
        .map((f) => Number(f.telegramMessageId))
        .filter((id) => Number.isFinite(id) && id > 0)
    );

    for (const m of scannedMessages) {
      const msgText = String(m?.message || m?.text || '');
      if (!m?.media || !msgText.includes('[NIVRA_FILE]')) continue;
      if (trackedMessageIds.has(m.id)) continue;

      const meta = extractDocumentMetadataFromMsg(m);
      const iso = m.date ? new Date(m.date * 1000).toISOString() : new Date().toISOString();
      files.push({
        id: `file_tg_${m.id}`,
        name: meta.name,
        mimeType: meta.mimeType,
        size: meta.size,
        url: `/api/telegram/file/${m.id}?filename=${encodeURIComponent(meta.name)}`,
        folderId: null,
        storage: 'telegram',
        telegramMessageId: m.id,
        telegramChatId: status.chatId,
        createdAt: iso,
        updatedAt: iso,
      });
      trackedMessageIds.add(m.id);
    }

    return { files, folders, chatId: status.chatId };
  } finally {
    endTelegramOp();
  }
}

/**
  Sync the JSON database (notes_db.json) directly to Telegram Cloud Channel.
  Edits the existing backup message in-place to keep the channel clean and prevent flooding!
 */
export async function syncDbToTelegram(dbData: any): Promise<{ messageId: number; edited: boolean }> {
  const cfg = getTelegramConfig();
  if (!cfg.enabled || !cfg.chatId) {
    throw new Error('اتصال به تلگرام فعال نیست یا شناسه چت/کانال تنظیم نشده است.');
  }

  beginTelegramOp();
  try {
    const client = await getTelegramClient(cfg);

    // Clean dbData for backup: omit internal drafts to keep file clean & lean
    const cleanDb = {
      version: dbData.version || 2,
      notes: dbData.notes || [],
      categories: dbData.categories || [],
      files: dbData.files || [],
      fileFolders: dbData.fileFolders || [],
      lastUpdated: dbData.lastUpdated || new Date().toISOString(),
    };

  const jsonStr = JSON.stringify(cleanDb, null, 2);
  const buffer = Buffer.from(jsonStr, 'utf-8');

  const filename = `notes_db_backup.json`;
  const fileToUpload = new CustomFile(filename, buffer.length, '', buffer);
  const caption = `💾 **[NIVRA_DB_SYNC]**\n📊 تعداد یادداشت‌ها: ${cleanDb.notes.length}\n📁 تعداد دسته‌ها: ${cleanDb.categories.length}\n🕒 آخرین به‌روزرسانی: ${new Date().toLocaleString('fa-IR')}`;

  let targetMessageId = cfg.lastSyncMessageId;
  let didEdit = false;

  // 1. If we have a previously synced message ID, try to edit it in-place
  if (targetMessageId) {
    try {
      await client.editMessage(cfg.chatId, {
        message: targetMessageId,
        file: fileToUpload,
        text: caption,
      });
      didEdit = true;
    } catch (editErr: any) {
      console.warn('Could not edit previous Telegram backup message in-place, falling back to clean replace:', editErr.message);
      // Try to delete the old message so the channel doesn't stay cluttered
      try {
        await client.deleteMessages(cfg.chatId, [targetMessageId], { revoke: true });
      } catch {
        // ignore if cannot delete
      }
      targetMessageId = undefined;
    }
  }

  // 2. If no previous message or edit failed, send as a new file message
  if (!targetMessageId) {
    const sent = await client.sendFile(cfg.chatId, {
      file: fileToUpload,
      caption,
      forceDocument: true,
      workers: 2,
    });
    targetMessageId = sent.id;
  }

    // Save last sync time & message ID
    cfg.lastSyncAt = new Date().toISOString();
    cfg.lastSyncMessageId = targetMessageId;
    saveTelegramConfig(cfg);

    return { messageId: targetMessageId, edited: didEdit };
  } finally {
    endTelegramOp();
  }
}

/**
  Restore latest DB backup from Telegram Cloud using Bot-allowed MTProto calls
 */
export async function restoreDbFromTelegram(): Promise<{ db: any; messageId: number }> {
  const cfg = getTelegramConfig();
  if (!cfg.chatId) {
    throw new Error('شناسه کانال/چت تلگرام تنظیم نشده است.');
  }

  const client = await getTelegramClient(cfg);
  let targetMsg: any = null;

  // 1. Try saved lastSyncMessageId directly if available
  if (cfg.lastSyncMessageId) {
    try {
      const msgs = await client.getMessages(cfg.chatId, { ids: [cfg.lastSyncMessageId] });
      if (msgs && msgs[0] && msgs[0].media && msgs[0].text && msgs[0].text.includes('[NIVRA_DB_SYNC]')) {
        targetMsg = msgs[0];
      }
    } catch (err) {
      console.log('lastSyncMessageId direct lookup failed, scanning channel:', err);
    }
  }

  // 2. If not found, probe channel top ID and scan message IDs in batches using GetMessages
  if (!targetMsg) {
    let topId = 0;
    try {
      const probeMsg = await client.sendMessage(cfg.chatId, {
        message: '🔍 در حال جستجوی بک‌آپ دیتابیس NIVRA...',
      });
      topId = probeMsg.id;
      try {
        await probeMsg.delete({ revoke: true });
      } catch {}
    } catch (err: any) {
      console.error('Probe message failed:', err.message);
    }

    if (!topId && cfg.lastSyncMessageId) {
      topId = cfg.lastSyncMessageId + 50;
    }

    if (!topId) {
      throw new Error('امکان دریافت وضعیت پیام‌های کانال تلگرام وجود ندارد. لطفاً دسترسی‌های ربات و Chat ID را بررسی کنید.');
    }

    // Generate array of previous 150 message IDs
    const idsToCheck: number[] = [];
    for (let i = 0; i < 150; i++) {
      const id = topId - i;
      if (id > 0) idsToCheck.push(id);
    }

    // Fetch messages in chunks of 50 via GetMessages (allowed for Bots)
    const foundMessages: any[] = [];
    const chunkSize = 50;
    for (let i = 0; i < idsToCheck.length; i += chunkSize) {
      const chunk = idsToCheck.slice(i, i + chunkSize);
      try {
        const msgs = await client.getMessages(cfg.chatId, { ids: chunk });
        if (Array.isArray(msgs)) {
          foundMessages.push(...msgs.filter(Boolean));
        }
      } catch (err) {
        console.error('Error fetching message chunk from Telegram:', err);
      }
    }

    // Sort newest first
    foundMessages.sort((a, b) => b.id - a.id);
    targetMsg = foundMessages.find((m) => m && m.text && m.text.includes('[NIVRA_DB_SYNC]') && m.media);
  }

  if (!targetMsg || !targetMsg.media) {
    throw new Error('هیچ بک‌آپی از دیتابیس با برچسب [NIVRA_DB_SYNC] در کانال پیدا نشد.');
  }

  const downloaded = await client.downloadMedia(targetMsg.media, {});
  if (!downloaded) {
    throw new Error('خطا در دانلود بک‌آپ دیتابیس از تلگرام');
  }

  const jsonStr = downloaded.toString('utf-8');
  const parsed = JSON.parse(jsonStr);

  // Update cfg with found message ID
  cfg.lastSyncMessageId = targetMsg.id;
  saveTelegramConfig(cfg);

  resetTelegramIdleTimer();

  return { db: parsed, messageId: targetMsg.id };
}

/**
  Migrate all existing files from local data/uploads/ folder to Telegram Cloud and delete local files
 */
export async function migrateLocalFilesToTelegram(db: any, writeDbCb: (updatedDb: any) => boolean): Promise<{ migratedCount: number; freedBytes: number }> {
  const cfg = getTelegramConfig();
  if (!cfg.enabled || !cfg.chatId) {
    throw new Error('ابتدا اتصال ابری تلگرام را فعال کرده و شناسه کانال را ثبت کنید.');
  }

  const uploadsDir = path.join(DATA_DIR, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    return { migratedCount: 0, freedBytes: 0 };
  }

  const files = fs.readdirSync(uploadsDir);
  let migratedCount = 0;
  let freedBytes = 0;

  for (const filename of files) {
    const filePath = path.join(uploadsDir, filename);
    if (!fs.statSync(filePath).isFile()) continue;

    try {
      const buffer = fs.readFileSync(filePath);
      const size = buffer.length;

      // Upload to telegram
      const { messageId } = await uploadFileToTelegram(buffer, filename, 'application/octet-stream');

      const oldUrl = `/uploads/${filename}`;
      const newUrl = `/api/telegram/file/${messageId}?filename=${encodeURIComponent(filename)}`;

      // Replace oldUrl with newUrl in notes attachments, blocks, and managed files
      for (const note of db.notes || []) {
        if (Array.isArray(note.attachments)) {
          for (const att of note.attachments) {
            if (att.url === oldUrl) {
              att.url = newUrl;
            }
          }
        }
        if (Array.isArray(note.blocks)) {
          for (const blk of note.blocks) {
            if (blk.type === 'media' && blk.attachmentId) {
              const att = note.attachments?.find((a: any) => a.id === blk.attachmentId);
              if (att && att.url === oldUrl) {
                att.url = newUrl;
              }
            }
          }
        }
      }
      for (const f of db.files || []) {
        if (f.url === oldUrl) {
          f.url = newUrl;
          f.storage = 'telegram';
          f.telegramMessageId = messageId;
          f.telegramChatId = cfg.chatId;
        }
      }

      // Unlink local file to free disk space!
      fs.unlinkSync(filePath);
      migratedCount++;
      freedBytes += size;
    } catch (err) {
      console.error(`Failed to migrate file ${filename}:`, err);
    }
  }

  // Save updated DB
  writeDbCb(db);

  // Sync DB to telegram
  try {
    await syncDbToTelegram(db);
  } catch {}

  return { migratedCount, freedBytes };
}
