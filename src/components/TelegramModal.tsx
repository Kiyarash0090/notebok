import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Cloud,
  CloudUpload,
  CloudDownload,
  Trash2,
  HardDrive,
  RefreshCw,
  HelpCircle,
  ExternalLink,
  Shield,
  Zap,
} from 'lucide-react';
import { api } from '../services/api';
import { TelegramConfig } from '../types';

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export const TelegramModal: React.FC<TelegramModalProps> = ({ isOpen, onClose, onRefreshData }) => {
  const [config, setConfig] = useState<TelegramConfig>({
    enabled: false,
    apiId: 0,
    apiHash: '',
    botToken: '',
    chatId: '',
    autoSyncDb: true,
  });

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncingDb, setSyncingDb] = useState(false);
  const [restoringDb, setRestoringDb] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoading(true);
    setStatusMessage(null);
    setTestResult(null);
    try {
      const cfg = await api.getTelegramConfig();
      setConfig(cfg);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'خطا در بارگیری تنظیمات' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setStatusMessage(null);
    try {
      const updated = await api.saveTelegramConfig(config);
      setConfig(updated);
      setStatusMessage({ type: 'success', text: 'تنظیمات تلگرام با موفقیت ذخیره شد.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'خطا در ذخیره تنظیمات' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.testTelegramConnection(config);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'خطا در برقراری ارتباط با تلگرام',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSyncDb = async () => {
    setSyncingDb(true);
    setStatusMessage(null);
    try {
      const res = await api.syncTelegramDb();
      setStatusMessage({ type: 'success', text: res.message || 'دیتابیس با موفقیت به کانال تلگرام ارسال شد.' });
      loadConfig();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'خطا در همگام‌سازی دیتابیس' });
    } finally {
      setSyncingDb(false);
    }
  };

  const handleRestoreDb = async () => {
    if (!window.confirm('آیا از بازگردانی آخرین دیتابیس از تلگرام مطمئن هستید؟ یک نسخه پشتیبان ایمنی از اطلاعات فعلی ایجاد خواهد شد.')) {
      return;
    }
    setRestoringDb(true);
    setStatusMessage(null);
    try {
      const res = await api.restoreTelegramDb();
      setStatusMessage({
        type: 'success',
        text: `${res.message} (تعداد ${res.totalNotes} یادداشت و ${res.totalCategories} دسته بازیابی شد).`,
      });
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'خطا در بازیابی اطلاعات از تلگرام' });
    } finally {
      setRestoringDb(false);
    }
  };

  const handleMigrateFiles = async () => {
    if (!window.confirm('تمام فایل‌های موجود در دیسک سرور به تلگرام منتقل شده و فایل‌های محلی حذف می‌شوند تا فضای دیسک ۱۰۰٪ آزاد شود. ادامه می‌دهید؟')) {
      return;
    }
    setMigrating(true);
    setStatusMessage(null);
    try {
      const res = await api.migrateLocalFilesToTelegram();
      setStatusMessage({ type: 'success', text: res.message });
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'خطا در انتقال فایل‌ها' });
    } finally {
      setMigrating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-[#1C1C17] text-[#1A1C16] dark:text-[#E2E3DC] border border-[#E1E4D5] dark:border-[#43493E] rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E1E4D5] dark:border-[#43493E] bg-[#F5F6EE]/50 dark:bg-[#12140E]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0088cc]/10 text-[#0088cc] flex items-center justify-center font-bold shadow-xs">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg tracking-tight flex items-center gap-2">
                <span>ابَر-فضای ابری تلگرام (MTProto)</span>
                <span className="text-[10px] bg-[#0088cc] text-white px-2 py-0.5 rounded-full font-normal">
                  نامحدود
                </span>
              </h3>
              <p className="text-xs text-[#5E6258] dark:text-[#8F9285]">
                ذخیره‌سازی رایگان دیتابیس و رسانه‌ها در تلگرام با رفع محدودیت حجم
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-[#E8ECE0] dark:hover:bg-[#23261F] text-[#5E6258] dark:text-[#8F9285] transition-colors"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#5E6258]">
              <Loader2 className="w-8 h-8 animate-spin text-[#0088cc]" />
              <span className="text-sm">در حال دریافت تنظیمات تلگرام...</span>
            </div>
          ) : (
            <>
              {/* Alert / Notification banner */}
              {statusMessage && (
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm flex items-start gap-2.5 ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                      : statusMessage.type === 'error'
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                      : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
                  }`}
                >
                  {statusMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />}
                  {statusMessage.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />}
                  {statusMessage.type === 'info' && <HelpCircle className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" />}
                  <span className="leading-relaxed">{statusMessage.text}</span>
                </div>
              )}

              {/* Info Feature Card */}
              <div className="bg-[#0088cc]/5 border border-[#0088cc]/20 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-[#0088cc]">
                  <Zap className="w-4 h-4" />
                  <span>چرا ذخیره‌سازی ابری تلگرام با MTProto؟</span>
                </div>
                <p className="text-xs text-[#5E6258] dark:text-[#8F9285] leading-relaxed">
                  با فعال کردن این قابلیت، تمام فایل‌ها (عکس، ویدیو، ویس، سند) و نسخه پشتیبان دیتابیس مستقیماً در کانال خصوصی تلگرام شما ذخیره می‌شوند. مصرف دیسک سرور به **صفر مگابایت** می‌رسد و سقف ۵۰ مگابایت Bot API حذف شده و فایل‌ها تا **۲ گیگابایت** قابل ذخیره هستند!
                </p>
              </div>

              {/* Main Toggle */}
              <div className="flex items-center justify-between p-4 bg-[#F5F6EE] dark:bg-[#12140E] rounded-2xl border border-[#E1E4D5] dark:border-[#43493E]">
                <div className="space-y-0.5">
                  <div className="font-bold text-sm flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-[#0088cc]" />
                    <span>فعال‌سازی ذخیره‌سازی ابری تلگرام</span>
                  </div>
                  <div className="text-xs text-[#5E6258] dark:text-[#8F9285]">
                    ارسال خودکار تمامی آپلودهای جدید به کانال تلگرام
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0088cc]"></div>
                </label>
              </div>

              {/* Credentials Form */}
              <div className="space-y-4">
                <h4 className="font-bold text-xs sm:text-sm text-[#1A1C16] dark:text-[#E2E3DC] flex items-center gap-2 border-b border-[#E1E4D5] dark:border-[#43493E] pb-2">
                  <Shield className="w-4 h-4 text-[#0088cc]" />
                  <span>اطلاعات اتصال MTProto تلگرام</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* API ID */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#43493E] dark:text-[#E2E3DC]">
                        API ID *
                      </label>
                      <a
                        href="https://my.telegram.org"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#0088cc] hover:underline flex items-center gap-0.5"
                      >
                        <span>my.telegram.org</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <input
                      type="number"
                      value={config.apiId || ''}
                      onChange={(e) => setConfig({ ...config, apiId: parseInt(e.target.value) || 0 })}
                      placeholder="مثال: 12345678"
                      className="w-full bg-[#EAECE2] dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] rounded-xl px-3 py-2 text-xs font-mono text-[#1A1C16] dark:text-[#E2E3DC] focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
                    />
                  </div>

                  {/* API Hash */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#43493E] dark:text-[#E2E3DC]">
                      API Hash *
                    </label>
                    <input
                      type="text"
                      value={config.apiHash || ''}
                      onChange={(e) => setConfig({ ...config, apiHash: e.target.value.trim() })}
                      placeholder="مثال: 0123456789abcdef0123456789abcdef"
                      className="w-full bg-[#EAECE2] dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] rounded-xl px-3 py-2 text-xs font-mono text-[#1A1C16] dark:text-[#E2E3DC] focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Bot Token */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#43493E] dark:text-[#E2E3DC]">
                        Bot Token *
                      </label>
                      <span className="text-[10px] text-[#5E6258]">از BotFather@</span>
                    </div>
                    <input
                      type="password"
                      value={config.botToken || ''}
                      onChange={(e) => setConfig({ ...config, botToken: e.target.value.trim() })}
                      placeholder="123456789:ABCdefGhIJKlmNo..."
                      className="w-full bg-[#EAECE2] dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] rounded-xl px-3 py-2 text-xs font-mono text-[#1A1C16] dark:text-[#E2E3DC] focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
                    />
                  </div>

                  {/* Storage Chat ID */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#43493E] dark:text-[#E2E3DC]">
                      شناسه کانال یا چت (Chat ID) *
                    </label>
                    <input
                      type="text"
                      value={config.chatId || ''}
                      onChange={(e) => setConfig({ ...config, chatId: e.target.value.trim() })}
                      placeholder="مثال: 1001234567890- یا my_storage_channel@"
                      className="w-full bg-[#EAECE2] dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] rounded-xl px-3 py-2 text-xs font-mono text-[#1A1C16] dark:text-[#E2E3DC] focus:outline-none focus:ring-2 focus:ring-[#0088cc]"
                    />
                  </div>
                </div>

                {/* Auto sync DB checkbox */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="chk-auto-sync-db"
                    checked={config.autoSyncDb}
                    onChange={(e) => setConfig({ ...config, autoSyncDb: e.target.checked })}
                    className="w-4 h-4 text-[#0088cc] rounded border-[#E1E4D5] dark:border-[#43493E] focus:ring-[#0088cc]"
                  />
                  <label htmlFor="chk-auto-sync-db" className="text-xs text-[#43493E] dark:text-[#E2E3DC] cursor-pointer">
                    همگام‌سازی خودکار دیتابیس با هر تغییر در یادداشت‌ها (ذخیره‌سازی بک‌آپ خودکار در کانال)
                  </label>
                </div>
              </div>

              {/* Connection Test Result */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{testResult.message}</span>
                </div>
              )}

              {/* Action Buttons Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing || !config.apiId || !config.apiHash || !config.botToken}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#E8ECE0] dark:bg-[#23261F] text-[#1A1C16] dark:text-[#E2E3DC] hover:bg-[#DCE1D2] dark:hover:bg-[#2E332A] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0088cc]" /> : <RefreshCw className="w-3.5 h-3.5 text-[#0088cc]" />}
                  <span>تست اتصال به تلگرام</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0088cc] text-white hover:bg-[#0077b3] disabled:opacity-50 transition-colors flex items-center gap-2 shadow-xs"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>ذخیره تنظیمات</span>
                </button>
              </div>

              {/* Advanced Operations Section */}
              <div className="border-t border-[#E1E4D5] dark:border-[#43493E] pt-5 space-y-4">
                <h4 className="font-bold text-xs sm:text-sm text-[#1A1C16] dark:text-[#E2E3DC] flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-[#0088cc]" />
                  <span>عملیات فضای ابری و آزادسازی دیسک</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Backup DB Now */}
                  <button
                    type="button"
                    onClick={handleSyncDb}
                    disabled={syncingDb || !config.enabled}
                    className="p-3 rounded-2xl border border-[#E1E4D5] dark:border-[#43493E] bg-[#F5F6EE]/60 dark:bg-[#12140E]/60 hover:bg-[#E8ECE0] dark:hover:bg-[#23261F] text-right text-xs transition-all disabled:opacity-40 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                      {syncingDb ? <Loader2 className="w-4 h-4 animate-spin text-[#0088cc]" /> : <CloudUpload className="w-4 h-4 text-[#0088cc]" />}
                      <span>ارسال دیتابیس به تلگرام</span>
                    </div>
                    <span className="text-[11px] text-[#5E6258] dark:text-[#8F9285]">
                      ارسال دستی فایل JSON یادداشت‌ها به کانال
                    </span>
                  </button>

                  {/* Restore DB from Telegram */}
                  <button
                    type="button"
                    onClick={handleRestoreDb}
                    disabled={restoringDb || !config.chatId}
                    className="p-3 rounded-2xl border border-[#E1E4D5] dark:border-[#43493E] bg-[#F5F6EE]/60 dark:bg-[#12140E]/60 hover:bg-[#E8ECE0] dark:hover:bg-[#23261F] text-right text-xs transition-all disabled:opacity-40 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                      {restoringDb ? <Loader2 className="w-4 h-4 animate-spin text-amber-500" /> : <CloudDownload className="w-4 h-4 text-amber-500" />}
                      <span>بازیابی دیتابیس از تلگرام</span>
                    </div>
                    <span className="text-[11px] text-[#5E6258] dark:text-[#8F9285]">
                      دانلود و جایگزینی آخرین نسخه دیتابیس از کانال
                    </span>
                  </button>

                  {/* Migrate Local Files */}
                  <button
                    type="button"
                    onClick={handleMigrateFiles}
                    disabled={migrating || !config.enabled}
                    className="p-3 rounded-2xl border border-[#E1E4D5] dark:border-[#43493E] bg-[#F5F6EE]/60 dark:bg-[#12140E]/60 hover:bg-[#E8ECE0] dark:hover:bg-[#23261F] text-right text-xs transition-all disabled:opacity-40 flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 font-bold text-[#1A1C16] dark:text-[#E2E3DC]">
                      {migrating ? <Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> : <Trash2 className="w-4 h-4 text-emerald-500" />}
                      <span>انتقال و آزادسازی دیسک</span>
                    </div>
                    <span className="text-[11px] text-[#5E6258] dark:text-[#8F9285]">
                      انتقال تمامی فایل‌های محلی به تلگرام و پاک کردن دیسک سرور
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#E1E4D5] dark:border-[#43493E] bg-[#F5F6EE]/50 dark:bg-[#12140E]/50 flex items-center justify-between text-xs text-[#5E6258] dark:text-[#8F9285]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#0088cc] animate-pulse"></span>
            <span>پروتکل MTProto بومی فعال (GramJS)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#E8ECE0] dark:bg-[#23261F] text-[#1A1C16] dark:text-[#E2E3DC] font-semibold hover:bg-[#DCE1D2] dark:hover:bg-[#2E332A] transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
