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

export async function getTelegramClient(customConfig?: TelegramConfig): Promise<TelegramClient> {
  const cfg = customConfig || getTelegramConfig();
  if (!cfg.apiId || !cfg.apiHash || !cfg.botToken) {
    throw new Error('تنظیمات تلگرام (API ID، API Hash یا Bot Token) کامل نیستند.');
  }

  const configKey = `${cfg.apiId}_${cfg.apiHash}_${cfg.botToken}`;
  if (activeClient && activeClientConnected && activeClientConfigKey === configKey) {
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

  return client;
}

let activeClientConnected = false;

/**
  Test connection to Telegram and send a ping message to the specified chatId
 */
export async function testTelegramConnection(cfg: TelegramConfig): Promise<{ success: boolean; message: string }> {
  try {
    const client = await getTelegramClient(cfg);
    const me = await client.getMe();
    
    if (!cfg.chatId) {
      return {
        success: true,
        message: `اتصال موفقیت‌آمیز بود! ربات متصل شد: @${(me as any)?.username || 'Bot'} (نکته: شناسه چت/کانال را وارد کنید تا تست ارسال نیز انجام شود).`,
      };
    }

    // Try sending test ping message to chatId
    const result = await client.sendMessage(cfg.chatId, {
      message: `🟢 **تست اتصال NIVRA**\nاتصال موفقیت‌آمیز به ابَر-فضای ابری تلگرام با MTProto در تاریخ ${new Date().toLocaleString('fa-IR')}`,
    });

    return {
      success: true,
      message: `اتصال به تلگرام و ارسال پیام به چت/کانال با موفقیت انجام شد! (شناسه پیام: ${result.id})`,
    };
  } catch (err: any) {
    console.error('Telegram test connection error:', err);
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
  mimeType: string
): Promise<{ messageId: number; size: number; caption: string }> {
  const cfg = getTelegramConfig();
  if (!cfg.enabled || !cfg.chatId) {
    throw new Error('ذخیره‌سازی ابری تلگرام فعال نیست یا شناسه چت/کانال وارد نشده است.');
  }

  const client = await getTelegramClient(cfg);
  
  const toUpload = new CustomFile(originalName, buffer.length, '', buffer);

  const sentMessage = await client.sendFile(cfg.chatId, {
    file: toUpload,
    caption: `📦 **[NIVRA_ATTACHMENT]**\n📄 نام: \`${originalName}\`\n⚖️ حجم: ${Math.round(buffer.length / 1024)} KB\n⏱️ تاریخ: ${new Date().toISOString()}`,
    workers: 4,
  });

  return {
    messageId: sentMessage.id,
    size: buffer.length,
    caption: originalName,
  };
}

/**
  Download file media from Telegram Cloud using MTProto
 */
export async function downloadFileFromTelegram(messageId: number): Promise<{ buffer: Buffer; mimeType?: string }> {
  const cfg = getTelegramConfig();
  if (!cfg.chatId) {
    throw new Error('شناسه کانال/چت تلگرام تنظیم نشده است.');
  }

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
}

/**
  Sync the JSON database (notes_db.json) directly to Telegram Cloud Channel
 */
export async function syncDbToTelegram(dbData: any): Promise<{ messageId: number }> {
  const cfg = getTelegramConfig();
  if (!cfg.enabled || !cfg.chatId) {
    throw new Error('اتصال به تلگرام فعال نیست.');
  }

  const client = await getTelegramClient(cfg);
  const jsonStr = JSON.stringify(dbData, null, 2);
  const buffer = Buffer.from(jsonStr, 'utf-8');

  const filename = `notes_db_sync_${Date.now()}.json`;
  const fileToUpload = new CustomFile(filename, buffer.length, '', buffer);

  const sent = await client.sendFile(cfg.chatId, {
    file: fileToUpload,
    caption: `💾 **[NIVRA_DB_SYNC]**\n📊 تعداد یادداشت‌ها: ${dbData.notes?.length || 0}\n📁 تعداد دسته‌ها: ${dbData.categories?.length || 0}\n🕒 زمان همگام‌سازی: ${new Date().toLocaleString('fa-IR')}`,
    workers: 2,
  });

  // Save last sync time
  cfg.lastSyncAt = new Date().toISOString();
  saveTelegramConfig(cfg);

  return { messageId: sent.id };
}

/**
  Restore latest DB backup from Telegram Cloud
 */
export async function restoreDbFromTelegram(): Promise<{ db: any; messageId: number }> {
  const cfg = getTelegramConfig();
  if (!cfg.chatId) {
    throw new Error('شناسه کانال/چت تلگرام تنظیم نشده است.');
  }

  const client = await getTelegramClient(cfg);

  // Get last 20 messages to find the latest [NIVRA_DB_SYNC]
  const messages = await client.getMessages(cfg.chatId, { limit: 20 });
  const dbMsg = messages.find((m) => m.text && m.text.includes('[NIVRA_DB_SYNC]') && m.media);

  if (!dbMsg || !dbMsg.media) {
    throw new Error('هیچ بک‌آپی از دیتابیس با برچسب [NIVRA_DB_SYNC] در کانال پیدا نشد.');
  }

  const downloaded = await client.downloadMedia(dbMsg.media, {});
  if (!downloaded) {
    throw new Error('خطا در دانلود بک‌آپ دیتابیس از تلگرام');
  }

  const jsonStr = downloaded.toString('utf-8');
  const parsed = JSON.parse(jsonStr);

  return { db: parsed, messageId: dbMsg.id };
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

      // Replace oldUrl with newUrl in notes attachments and blocks
      for (const note of db.notes) {
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
