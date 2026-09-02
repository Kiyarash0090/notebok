import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileJson,
  Calendar,
  Save,
  Trash2,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { BackupData, ServerSnapshot } from '../types';
import { api } from '../services/api';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'snapshots'>('export');
  const [snapshots, setSnapshots] = useState<ServerSnapshot[]>([]);
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [newSnapshotLabel, setNewSnapshotLabel] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);

  // Import State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<BackupData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'overwrite' | 'merge'>('merge');
  const [isRestoring, setIsRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSnapshots = async () => {
    setIsLoadingSnapshots(true);
    try {
      const data = await api.getSnapshots();
      setSnapshots(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingSnapshots(false);
    }
  };

  // Load snapshots when tab is selected and modal is open
  useEffect(() => {
    if (isOpen && activeTab === 'snapshots') {
      loadSnapshots();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleDownloadBackup = async () => {
    try {
      const data = await api.downloadBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `jozveh_backup_${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage({ type: 'success', text: 'فایل پشتیبان با موفقیت دانلود شد.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'خطا در دانلود پشتیبان: ' + err.message });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setParseError(null);
    setStatusMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.notes || !Array.isArray(json.notes) || !Array.isArray(json.categories)) {
          setParseError('فرمت فایل نامعتبر است. فایل پشتیبان باید شامل آرایه یادداشت‌ها و دسته‌ها باشد.');
          setParsedBackup(null);
          return;
        }
        setParsedBackup(json);
      } catch (err) {
        setParseError('خطا در خواندن فایل JSON. لطفاً از صحت فایل اطمینان حاصل کنید.');
        setParsedBackup(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!parsedBackup) return;
    setIsRestoring(true);
    setStatusMessage(null);
    try {
      const res = await api.restoreBackup(parsedBackup, restoreMode);
      setStatusMessage({ type: 'success', text: res.message });
      setUploadedFile(null);
      setParsedBackup(null);
      onDataRestored();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'خطا در بازگردانی اطلاعات' });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCreateSnapshot = async () => {
    setIsCreatingSnapshot(true);
    try {
      await api.createSnapshot(newSnapshotLabel.trim() || undefined);
      setNewSnapshotLabel('');
      await loadSnapshots();
      setStatusMessage({ type: 'success', text: 'نقطه پشتیبان جدید در سرور ذخیره شد.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'خطا در ایجاد اسنپ‌شات: ' + err.message });
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleRestoreSnapshot = async (id: string) => {
    if (!confirm('آیا از بازگردانی این نقطه پشتیبان در سرور اطمینان دارید؟ اطلاعات فعلی جایگزین خواهند شد.')) {
      return;
    }
    try {
      const res = await api.restoreSnapshot(id);
      setStatusMessage({ type: 'success', text: res.message });
      onDataRestored();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: 'خطا در بازگردانی: ' + err.message });
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    try {
      await api.deleteSnapshot(id);
      setSnapshots(snapshots.filter((s) => s.id !== id));
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#FAF9F5] dark:bg-[#1C1C17] text-[#1A1C16] dark:text-[#E2E3DC] rounded-[28px] shadow-2xl border border-[#E1E4D5] dark:border-[#43493E] overflow-hidden flex flex-col max-h-[90vh] anim-scale-in"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#E1E4D5] dark:border-[#43493E] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-[#4A6D22] dark:text-[#D0E8B2]" />
            <h2 className="font-bold text-base text-[#1A1C16] dark:text-[#E2E3DC]">
              مرکز پشتیبان‌گیری و بازگردانی
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl hover:bg-black/5 dark:hover:bg-white/10 text-[#5E6258] dark:text-[#8F9285] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#E1E4D5] dark:border-[#43493E] px-4 pt-2 gap-2 bg-black/5 dark:bg-[#12140E]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('export');
              setStatusMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'export'
                ? 'border-[#4A6D22] dark:border-[#D0E8B2] text-[#1A3700] dark:text-[#D0E8B2]'
                : 'border-transparent text-[#5E6258] dark:text-[#8F9285] hover:text-[#1A1C16]'
            }`}
          >
            دانلود پشتیبان (Export)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('import');
              setStatusMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'import'
                ? 'border-[#4A6D22] dark:border-[#D0E8B2] text-[#1A3700] dark:text-[#D0E8B2]'
                : 'border-transparent text-[#5E6258] dark:text-[#8F9285] hover:text-[#1A1C16]'
            }`}
          >
            بازگردانی از فایل (Restore)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('snapshots');
              setStatusMessage(null);
            }}
            className={`pb-2.5 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all ${
              activeTab === 'snapshots'
                ? 'border-[#4A6D22] dark:border-[#D0E8B2] text-[#1A3700] dark:text-[#D0E8B2]'
                : 'border-transparent text-[#5E6258] dark:text-[#8F9285] hover:text-[#1A1C16]'
            }`}
          >
            نقاط بازگردانی سرور
          </button>
        </div>

        {/* Status banner */}
        {statusMessage && (
          <div
            className={`m-4 p-3 rounded-2xl text-xs font-medium flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-[#D0E8B2]/30 text-[#1A3700] dark:text-[#D0E8B2] border border-[#D0E8B2]/50'
                : 'bg-[#5C1A1A]/20 text-[#A64D3B] dark:text-[#FFAB91] border border-[#5C1A1A]/40'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4A6D22] dark:text-[#D0E8B2]" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#A64D3B]" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 rounded-[20px] bg-[#D0E8B2]/15 dark:bg-[#1A3700]/30 border border-[#D0E8B2]/30 dark:border-[#3D522C] space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-[#1A3700] dark:text-[#D0E8B2]">
                  <ShieldCheck className="w-5 h-5" />
                  <span>پشتیبان‌گیری امن و جامع</span>
                </div>
                <p className="text-xs text-[#43493E] dark:text-[#8F9285] leading-relaxed">
                  با کلیک روی دکمه زیر، تمام جزوه‌ها، دسته‌بندی‌ها، نکات مهم، چک‌لیست‌ها و برچسب‌های شما در قالب یک فایل استاندارد JSON استخراج و ذخیره خواهد شد.
                </p>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="w-full sm:w-auto px-8 py-3.5 bg-[#D0E8B2] hover:bg-[#c2de9f] text-[#1A3700] rounded-full font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2.5"
                >
                  <Download className="w-4 h-4" />
                  دانلود فایل پشتیبان (JSON)
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT / RESTORE */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* File Upload Box */}
              <div className="border-2 border-dashed border-[#E1E4D5] dark:border-[#43493E] rounded-[24px] p-6 text-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors relative">
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <FileJson className="w-10 h-10 text-[#4A6D22] dark:text-[#D0E8B2] mx-auto mb-2" />
                <div className="font-bold text-xs sm:text-sm text-[#1A1C16] dark:text-[#E2E3DC]">
                  {uploadedFile ? uploadedFile.name : 'انتخاب یا رها کردن فایل پشتیبان JSON'}
                </div>
                <div className="text-[11px] text-[#5E6258] dark:text-[#8F9285] mt-1">
                  فقط فایل‌های پشتیبان معتبر با فرمت JSON
                </div>
              </div>

              {parseError && (
                <div className="p-3 bg-[#5C1A1A]/20 text-[#A64D3B] dark:text-[#FFAB91] rounded-2xl text-xs flex items-center gap-2 border border-[#5C1A1A]/40">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Preview of Backup Data */}
              {parsedBackup && (
                <div className="p-4 sm:p-5 rounded-[20px] bg-black/5 dark:bg-white/5 space-y-3.5 border border-[#E1E4D5] dark:border-[#43493E]">
                  <div className="font-bold text-xs text-[#1A1C16] dark:text-[#E2E3DC]">
                    پیش‌نمایش محتوای پشتیبان:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="p-2.5 bg-white dark:bg-[#12140E] rounded-xl border border-[#E1E4D5] dark:border-[#43493E]">
                      <span className="text-[#5E6258] dark:text-[#8F9285] block text-[10px]">تعداد یادداشت‌ها</span>
                      <span className="font-bold text-[#4A6D22] dark:text-[#D0E8B2] text-sm">{parsedBackup.notes.length}</span>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-[#12140E] rounded-xl border border-[#E1E4D5] dark:border-[#43493E]">
                      <span className="text-[#5E6258] dark:text-[#8F9285] block text-[10px]">دسته‌بندی‌ها</span>
                      <span className="font-bold text-[#8B6814] dark:text-[#FFE086] text-sm">{parsedBackup.categories.length}</span>
                    </div>
                    <div className="p-2.5 bg-white dark:bg-[#12140E] rounded-xl border border-[#E1E4D5] dark:border-[#43493E] col-span-2 sm:col-span-1">
                      <span className="text-[#5E6258] dark:text-[#8F9285] block text-[10px]">تاریخ خروجی</span>
                      <span className="font-bold text-xs truncate block text-[#1A1C16] dark:text-[#E2E3DC]">
                        {parsedBackup.exportedAt ? new Date(parsedBackup.exportedAt).toLocaleDateString('fa-IR') : 'نامشخص'}
                      </span>
                    </div>
                  </div>

                  {/* Mode Selector */}
                  <div className="pt-2 border-t border-[#E1E4D5] dark:border-[#43493E] space-y-2">
                    <div className="text-xs font-bold text-[#43493E] dark:text-[#E2E3DC]">
                      نوع عملیات بازگردانی:
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setRestoreMode('merge')}
                        className={`flex-1 p-3 rounded-2xl border text-xs font-bold transition-all text-right ${
                          restoreMode === 'merge'
                            ? 'border-[#D0E8B2] bg-[#D0E8B2]/30 text-[#1A3700] dark:text-[#D0E8B2]'
                            : 'border-[#E1E4D5] dark:border-[#43493E]'
                        }`}
                      >
                        ادغام (Merge)
                        <span className="block text-[10px] font-normal text-[#5E6258] dark:text-[#8F9285] mt-0.5">
                          اضافه کردن به یادداشت‌های فعلی بدون حذف
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRestoreMode('overwrite')}
                        className={`flex-1 p-3 rounded-2xl border text-xs font-bold transition-all text-right ${
                          restoreMode === 'overwrite'
                            ? 'border-[#A64D3B] bg-[#5C1A1A]/30 text-[#A64D3B] dark:text-[#FFAB91]'
                            : 'border-[#E1E4D5] dark:border-[#43493E]'
                        }`}
                      >
                        جایگزینی کامل (Overwrite)
                        <span className="block text-[10px] font-normal text-[#5E6258] dark:text-[#8F9285] mt-0.5">
                          جایگزین کردن کل دیتابیس با این فایل
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Restore Execute Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isRestoring}
                      onClick={handleExecuteRestore}
                      className="w-full py-3 bg-[#D0E8B2] hover:bg-[#c2de9f] text-[#1A3700] rounded-full font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {isRestoring ? 'در حال بازگردانی...' : 'تأیید و اجرای بازگردانی'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SERVER SNAPSHOTS */}
          {activeTab === 'snapshots' && (
            <div className="space-y-4">
              {/* Create Snapshot Form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSnapshotLabel}
                  onChange={(e) => setNewSnapshotLabel(e.target.value)}
                  placeholder="عنوان اسنپ‌شات (مثلاً: قبل از شروع آزمون)..."
                  className="flex-1 bg-white dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] rounded-2xl px-3.5 py-2 text-xs text-[#1A1C16] dark:text-[#E2E3DC] focus:outline-none focus:border-[#D0E8B2]"
                />
                <button
                  type="button"
                  disabled={isCreatingSnapshot}
                  onClick={handleCreateSnapshot}
                  className="px-4 py-2 bg-[#D0E8B2] hover:bg-[#c2de9f] text-[#1A3700] text-xs font-bold rounded-2xl flex items-center gap-1.5 shrink-0 transition-colors shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  ایجاد اسنپ‌شات
                </button>
              </div>

              {/* Snapshots List */}
              <div className="space-y-2.5">
                {isLoadingSnapshots ? (
                  <div className="py-6 text-center text-xs text-[#5E6258] dark:text-[#8F9285]">در حال بارگذاری اسنپ‌شات‌ها...</div>
                ) : snapshots.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#5E6258] dark:text-[#8F9285] border border-dashed border-[#E1E4D5] dark:border-[#43493E] rounded-2xl">
                    هنوز نقطه بازگردانی ثبت نشده است.
                  </div>
                ) : (
                  snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-3.5 rounded-2xl bg-white dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold text-xs text-[#1A1C16] dark:text-[#E2E3DC]">
                          {snap.label || 'پشتیبان سرور'}
                        </div>
                        <div className="text-[10px] text-[#5E6258] dark:text-[#8F9285] flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#4A6D22] dark:text-[#D0E8B2]" />
                            {new Date(snap.createdAt).toLocaleDateString('fa-IR')} -{' '}
                            {new Date(snap.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span>• {snap.notesCount} یادداشت</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRestoreSnapshot(snap.id)}
                          className="px-3 py-1.5 bg-[#D0E8B2] text-[#1A3700] rounded-xl text-[11px] font-bold hover:bg-[#c2de9f] transition-colors"
                        >
                          بازگردانی
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSnapshot(snap.id)}
                          className="p-1.5 rounded-xl hover:bg-[#5C1A1A]/30 text-[#5E6258] dark:text-[#8F9285] hover:text-[#A64D3B]"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#E1E4D5] dark:border-[#43493E] flex justify-end bg-black/5 dark:bg-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-black/5 dark:bg-white/10 text-[#1A1C16] dark:text-[#E2E3DC] rounded-full text-xs font-bold hover:bg-black/10 dark:hover:bg-white/15 transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
