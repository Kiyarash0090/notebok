import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Paperclip,
  Image as ImageIcon,
  Video,
  FileText,
  Trash2,
  Play,
  Pause,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  LayoutTemplate,
  Download,
  Eye,
} from 'lucide-react';
import { NoteAttachment, AttachmentType, AttachmentPosition } from '../types';
import { BatchUploadProgress, uploadMediaFiles } from '../lib/media';
import { UploadProgressBar } from './UploadProgressBar';
import { useDocumentViewer } from '../context/DocumentViewerContext';
import { isOfficeFile, isViewableDocument, getDocumentBadgeInfo } from '../lib/fileViewerUtils';

interface AttachmentManagerProps {
  attachments: NoteAttachment[];
  onChange: (attachments: NoteAttachment[]) => void;
  readOnly?: boolean;
}

export const AttachmentManager: React.FC<AttachmentManagerProps> = ({
  attachments,
  onChange,
  readOnly = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const { openDocument } = useDocumentViewer();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Clean up recording timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (currentAudioElementRef.current) {
        currentAudioElementRef.current.pause();
      }
    };
  }, []);

  // Voice recording handlers
  const startRecording = async () => {
    setAudioError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setAudioError('مرورگر شما از قابلیت ضبط صدا پشتیبانی نمی‌کند.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          const newAttachment: NoteAttachment = {
            id: `attach_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: `صوت ضبط شده - ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`,
            type: 'audio',
            mimeType: 'audio/webm',
            size: audioBlob.size,
            url: base64Audio,
            duration: recordingDuration || 1,
            position: 'bottom', // default voice notes below text
            createdAt: new Date().toISOString(),
          };

          const nextAttachments = [...attachments, newAttachment];
          onChange(nextAttachments);
        };

        // Stop all audio tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setAudioError(
        err.name === 'NotAllowedError'
          ? 'دسترسی به میکروفون داده نشد. لطفاً در تنظیمات مرورگر اجازه دهید.'
          : 'خطا در فعال‌سازی ضبط صدا: ' + err.message
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Generic File Upload Handlers (Images, PDF, Video, Docs)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const oversized = files.filter((f) => f.size > 25 * 1024 * 1024);
    if (oversized.length > 0) {
      alert(`حجم فایل "${oversized[0].name}" بیش از ۲۵ مگابایت است.`);
      return;
    }

    const controller = new AbortController();
    uploadAbortRef.current = controller;

    try {
      const uploadedAttachments = await uploadMediaFiles(
        files,
        (progress) => setUploadProgress(progress),
        controller.signal
      );

      // Enhance with default positions
      const enhanced: NoteAttachment[] = uploadedAttachments.map((att) => ({
        ...att,
        position: att.type === 'image' || att.type === 'video' ? 'top' : 'bottom',
      }));

      onChange([...attachments, ...enhanced]);
      setTimeout(() => setUploadProgress(null), 1800);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAttachment = (id: string) => {
    if (playingAudioId === id && currentAudioElementRef.current) {
      currentAudioElementRef.current.pause();
      setPlayingAudioId(null);
    }
    onChange(attachments.filter((a) => a.id !== id));
  };

  const toggleAttachmentPosition = (id: string, newPosition: AttachmentPosition) => {
    onChange(
      attachments.map((a) => (a.id === id ? { ...a, position: newPosition } : a))
    );
  };

  const moveAttachmentOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= attachments.length) return;

    const updated = [...attachments];
    const item = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = item;
    onChange(updated);
  };

  const toggleAudioPlay = (attachment: NoteAttachment) => {
    if (playingAudioId === attachment.id) {
      if (currentAudioElementRef.current) {
        currentAudioElementRef.current.pause();
      }
      setPlayingAudioId(null);
    } else {
      if (currentAudioElementRef.current) {
        currentAudioElementRef.current.pause();
      }
      const audio = new Audio(attachment.url);
      currentAudioElementRef.current = audio;
      setPlayingAudioId(attachment.id);

      audio.onended = () => {
        setPlayingAudioId(null);
      };
      audio.play().catch((e) => {
        console.error('Audio play error:', e);
        setPlayingAudioId(null);
      });
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' بایت';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-3">
      {/* Upload Actions Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />

          <div className="flex flex-wrap items-center gap-2">
            {/* Voice Record Button */}
            {isRecording ? (
              <button
                type="button"
                onClick={stopRecording}
                className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold flex items-center gap-2 animate-pulse shadow-sm"
                title="توقف ضبط و پیوست صوت"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>توقف ضبط ({formatSeconds(recordingDuration)})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="px-3 py-1.5 bg-white dark:bg-[#1C1C17] hover:bg-[#D0E8B2]/30 text-[#1A1C16] dark:text-[#E2E3DC] hover:text-[#1A3700] dark:hover:text-[#D0E8B2] rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all border border-[#E1E4D5] dark:border-[#43493E] shadow-xs"
                title="ضبط ویس با میکروفون و قرارگیری خودکار در جزوه"
              >
                <Mic className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2]" />
                <span>ضبط ویس (صدا)</span>
              </button>
            )}

            {/* Attach Image / Media Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white dark:bg-[#1C1C17] hover:bg-[#D0E8B2]/30 text-[#1A1C16] dark:text-[#E2E3DC] hover:text-[#1A3700] dark:hover:text-[#D0E8B2] rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all border border-[#E1E4D5] dark:border-[#43493E] shadow-xs"
              title="پیوست تصویر، ویدیو، PDF یا فایل"
            >
              <Paperclip className="w-4 h-4 text-[#4A6D22] dark:text-[#D0E8B2]" />
              <span>افزودن تصویر / فایل پیوست</span>
            </button>
          </div>
        </div>
      )}

      {/* Audio Error message */}
      {audioError && (
        <div className="p-2.5 bg-[#5C1A1A]/20 text-[#A64D3B] dark:text-[#FFAB91] rounded-2xl text-xs border border-[#5C1A1A]/40 flex items-center justify-between">
          <span>{audioError}</span>
          <button
            type="button"
            onClick={() => setAudioError(null)}
            className="text-[10px] underline hover:opacity-80 font-bold"
          >
            بستن
          </button>
        </div>
      )}

      {/* Attachments List with Word-Style Position Choosers */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#5E6258] dark:text-[#8F9285] px-1">
            <span className="flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" />
              <span>پیوست‌ها و رسانه‌های جزوه ({attachments.length}):</span>
            </span>
            <span className="text-[10px] text-[#4A6D22] dark:text-[#D0E8B2]">
              جایگاه هر رسانه را انتخاب کنید (بالا یا زیر متن)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {attachments.map((att, idx) => {
              const currentPos: AttachmentPosition =
                att.position || (att.type === 'image' || att.type === 'video' ? 'top' : 'bottom');

              return (
                <div
                  key={att.id}
                  className="p-2.5 rounded-2xl bg-white dark:bg-[#1E201A] border border-[#E1E4D5] dark:border-[#43493E] shadow-xs flex flex-col gap-2 relative transition-all"
                >
                  {/* Media Thumbnail / Preview */}
                  {att.type === 'image' && (
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-[#E1E4D5] dark:border-[#43493E] flex items-center justify-center">
                      <img
                        src={att.url}
                        alt={att.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {att.type === 'video' && (
                    <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                      <video
                        src={att.url}
                        controls
                        className="w-full max-h-36 object-contain"
                      />
                    </div>
                  )}

                  {att.type === 'audio' && (
                    <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#F5F6EE] dark:bg-[#23261F] border border-[#E1E4D5] dark:border-[#43493E]">
                      <button
                        type="button"
                        onClick={() => toggleAudioPlay(att)}
                        className="w-8 h-8 rounded-full bg-[#D0E8B2] text-[#1A3700] flex items-center justify-center shrink-0 shadow-xs hover:scale-105 transition-transform"
                        title={playingAudioId === att.id ? 'توقف پخش' : 'پخش صوت'}
                      >
                        {playingAudioId === att.id ? (
                          <Pause className="w-3.5 h-3.5" />
                        ) : (
                          <Play className="w-3.5 h-3.5 mr-0.5" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate text-[#1A1C16] dark:text-[#E2E3DC]">
                          {att.name}
                        </div>
                        <div className="text-[10px] text-[#5E6258] dark:text-[#8F9285]">
                          {att.duration ? formatSeconds(att.duration) : 'صدا'} • {formatFileSize(att.size)}
                        </div>
                      </div>
                    </div>
                  )}

                  {att.type === 'document' && (
                    <div
                      className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-[#F5F6EE] dark:bg-[#23261F] border border-[#E1E4D5] dark:border-[#43493E] hover:border-[#D0E8B2] dark:hover:border-[#3D522C] transition-colors group/doc"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-xl bg-[#FAF2DE] dark:bg-[#332A18] text-[#8B6814] dark:text-[#FFE086] flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold truncate text-[#1A1C16] dark:text-[#E2E3DC]" title={att.name}>
                            {att.name}
                          </div>
                          <div className="text-[10px] text-[#5E6258] dark:text-[#8F9285]">
                            {getDocumentBadgeInfo(att.name).label} • {formatFileSize(att.size)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* If non-office viewable document (PDF, TXT, CODE, MD), show Open button */}
                        {!isOfficeFile(att.name) && isViewableDocument(att.name) && (
                          <button
                            type="button"
                            onClick={() => openDocument(att)}
                            className="px-2.5 py-1 rounded-lg bg-[#4A6D22] text-white hover:bg-[#3B571B] text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
                            title="مشاهده و مطالعه فایل"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>مشاهده</span>
                          </button>
                        )}

                        {/* Direct Download Button (Always present, and the ONLY button for Office files) */}
                        <a
                          href={att.url}
                          download={att.name}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#2E3128] hover:bg-[#D0E8B2] hover:text-[#1A3700] text-xs font-bold text-[#4A6D22] dark:text-[#D0E8B2] border border-[#E1E4D5] dark:border-[#43493E] flex items-center gap-1 transition-colors shadow-2xs"
                          title="دانلود فایل"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>دانلود</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Positioning Toolbar: Word Style (Top vs Bottom) */}
                  <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-[#E1E4D5] dark:border-[#43493E]">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#5E6258] dark:text-[#8F9285] ml-1">
                        موقعیت:
                      </span>
                      {/* Top Button */}
                      <button
                        type="button"
                        onClick={() => toggleAttachmentPosition(att.id, 'top')}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                          currentPos === 'top'
                            ? 'bg-[#D0E8B2] text-[#1A3700] shadow-xs'
                            : 'bg-black/5 dark:bg-white/10 text-[#5E6258] dark:text-[#8F9285] hover:bg-black/10'
                        }`}
                        title="نمایش تصویر/فایل بالای متن جزوه"
                      >
                        <ArrowUp className="w-3 h-3" />
                        <span>بالای متن</span>
                      </button>

                      {/* Bottom Button */}
                      <button
                        type="button"
                        onClick={() => toggleAttachmentPosition(att.id, 'bottom')}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                          currentPos === 'bottom'
                            ? 'bg-[#D0E8B2] text-[#1A3700] shadow-xs'
                            : 'bg-black/5 dark:bg-white/10 text-[#5E6258] dark:text-[#8F9285] hover:bg-black/10'
                        }`}
                        title="نمایش تصویر/فایل زیر متن جزوه"
                      >
                        <ArrowDown className="w-3 h-3" />
                        <span>زیر متن</span>
                      </button>
                    </div>

                    {/* Order & Actions */}
                    <div className="flex items-center gap-1">
                      {/* Move Up */}
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => moveAttachmentOrder(idx, 'up')}
                          className="p-1 rounded-lg text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/10"
                          title="انتقال به قبل"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Move Down */}
                      {idx < attachments.length - 1 && (
                        <button
                          type="button"
                          onClick={() => moveAttachmentOrder(idx, 'down')}
                          className="p-1 rounded-lg text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/10"
                          title="انتقال به بعد"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete */}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => removeAttachment(att.id)}
                          className="p-1 rounded-lg text-[#5E6258] dark:text-[#8F9285] hover:text-[#A64D3B] dark:hover:text-[#FFAB91] hover:bg-[#5C1A1A]/10 transition-colors"
                          title="حذف پیوست"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Progress Bar */}
      <UploadProgressBar
        progress={uploadProgress}
        onCancel={handleCancelUpload}
        onDismiss={() => setUploadProgress(null)}
      />
    </div>
  );
};
