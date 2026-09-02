import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Check,
  X,
  Volume2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface VoiceRecorderModuleProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertAudio: (audioDataUrl: string, title: string, durationSeconds: number) => void;
}

export const VoiceRecorderModule: React.FC<VoiceRecorderModuleProps> = ({
  isOpen,
  onClose,
  onInsertAudio,
}) => {
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'review'>('idle');
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [title, setTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);

  // Audio visualization
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize title with current date/time
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      setTitle(`ویس ضبط‌شده (${timeStr})`);
      setErrorMessage(null);
      setRecordingState('idle');
      setDuration(0);
      setAudioUrl(null);
      setAudioBlob(null);
    }
  }, [isOpen]);

  // Clean up on unmount or close
  useEffect(() => {
    return () => {
      stopAllMedia();
    };
  }, []);

  const stopAllMedia = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
    }
  };

  const startRecording = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio visualizer setup
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevel = () => {
          if (analyserRef.current && mediaRecorderRef.current?.state === 'recording') {
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(avg / 255);
            animFrameRef.current = requestAnimationFrame(updateLevel);
          }
        };
        animFrameRef.current = requestAnimationFrame(updateLevel);
      } catch (e) {
        console.warn('Audio context analyzer not available', e);
      }

      // MediaRecorder setup
      const options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4';
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setRecordingState('review');
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      };

      recorder.start(100);
      setRecordingState('recording');
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      console.error('Error starting recording:', err);
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Permission') || msg.includes('NotAllowedError')) {
        setErrorMessage('دسترسی به میکروفون رد شد. لطفاً در تنظیمات مرورگر اجازه دسترسی به میکروفون را بدهید.');
      } else {
        setErrorMessage('امکان دسترسی به میکروفون وجود ندارد یا دستگاه شما میکروفون فعال ندارد.');
      }
      setRecordingState('idle');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const resetRecording = () => {
    stopAllMedia();
    setRecordingState('idle');
    setDuration(0);
    setAudioUrl(null);
    setAudioBlob(null);
    setIsPlayingPreview(false);
    setPreviewTime(0);
  };

  const handleSaveAndInsert = () => {
    if (!audioBlob) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const finalTitle = title.trim() || 'ویس صوتی';
      onInsertAudio(base64, finalTitle, duration);
      resetRecording();
      onClose();
    };
    reader.readAsDataURL(audioBlob);
  };

  const togglePreviewPlayback = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#F5F6EE] dark:bg-[#1C1C17] border border-[#E1E4D5] dark:border-[#43493E] rounded-[28px] shadow-2xl p-5 space-y-4 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E1E4D5] dark:border-[#43493E]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#A64D3B]/10 dark:bg-[#FFAB91]/20 text-[#A64D3B] dark:text-[#FFAB91] flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#1A1C16] dark:text-[#E2E3DC]">
                ماژول ضبط صدای هوشمند
              </h3>
              <p className="text-[11px] text-[#5E6258] dark:text-[#8F9285]">
                ضبط ویس کلاسی، نکات استاد و یادداشت‌های صوتی
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              resetRecording();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-[#5E6258] dark:text-[#8F9285] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Title Input */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#43493E] dark:text-[#C4C8BA]">
            عنوان ویس:
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: توضیحات استاد درباره فصل ۳"
            className="w-full px-3.5 py-2 bg-white dark:bg-[#12140E] border border-[#E1E4D5] dark:border-[#43493E] focus:border-[#4A6D22] dark:focus:border-[#D0E8B2] rounded-xl text-xs sm:text-sm text-[#1A1C16] dark:text-[#E2E3DC] placeholder-[#5E6258] dark:placeholder-[#8F9285] focus:outline-none transition-colors"
          />
        </div>

        {/* Main Recording Interactive Arena */}
        <div className="py-6 px-4 bg-white/70 dark:bg-[#12140E]/70 rounded-2xl border border-[#E1E4D5] dark:border-[#43493E] flex flex-col items-center justify-center gap-4">
          {/* Timer & Status */}
          <div className="flex flex-col items-center gap-1">
            <div className="text-3xl font-mono font-bold tracking-wider text-[#1A1C16] dark:text-[#E2E3DC]">
              {formatTime(duration)}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium">
              {recordingState === 'recording' && (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-red-600 dark:text-red-400">در حال ضبط صدا...</span>
                </>
              )}
              {recordingState === 'paused' && (
                <span className="text-amber-600 dark:text-amber-400">ضبط متوقف شده است</span>
              )}
              {recordingState === 'idle' && (
                <span className="text-[#5E6258] dark:text-[#8F9285]">برای شروع روی دکمه میکروفون بزنید</span>
              )}
              {recordingState === 'review' && (
                <span className="text-[#4A6D22] dark:text-[#D0E8B2] flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  ویس با موفقیت ضبط شد
                </span>
              )}
            </div>
          </div>

          {/* Sound Wave Dynamic Visualizer */}
          {recordingState === 'recording' && (
            <div className="w-full flex items-center justify-center gap-1.5 h-12 py-1">
              {Array.from({ length: 16 }).map((_, i) => {
                const heightPercent = Math.max(15, Math.min(100, (audioLevel * 100 * (1 + Math.sin(i * 0.8 + Date.now() / 200))) * 1.2));
                return (
                  <div
                    key={i}
                    className="w-1.5 bg-gradient-to-t from-red-500 to-rose-400 rounded-full transition-all duration-75"
                    style={{ height: `${heightPercent}%` }}
                  />
                );
              })}
            </div>
          )}

          {/* Audio Review Player */}
          {recordingState === 'review' && audioUrl && (
            <div className="w-full space-y-2">
              <audio
                ref={previewAudioRef}
                src={audioUrl}
                onEnded={() => setIsPlayingPreview(false)}
                onTimeUpdate={(e) => setPreviewTime((e.target as HTMLAudioElement).currentTime)}
                className="hidden"
              />
              <div className="flex items-center gap-3 p-3 bg-[#E8ECE0] dark:bg-[#23261F] rounded-xl border border-[#E1E4D5] dark:border-[#43493E]">
                <button
                  type="button"
                  onClick={togglePreviewPlayback}
                  className="w-9 h-9 rounded-full bg-[#4A6D22] text-white flex items-center justify-center shadow-sm hover:scale-105 active:scale-95 transition-transform"
                >
                  {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 mr-0.5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[11px] text-[#5E6258] dark:text-[#8F9285] mb-1">
                    <span>{formatTime(Math.floor(previewTime))}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <div className="w-full bg-[#D0E8B2]/40 dark:bg-[#43493E] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#4A6D22] dark:bg-[#D0E8B2] h-full transition-all duration-100"
                      style={{ width: `${duration > 0 ? (previewTime / duration) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <Volume2 className="w-4 h-4 text-[#5E6258] dark:text-[#8F9285]" />
              </div>
            </div>
          )}

          {/* Recording Control Buttons */}
          <div className="flex items-center gap-3 mt-1">
            {recordingState === 'idle' && (
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-sm rounded-full shadow-lg shadow-red-600/20 transition-all cursor-pointer"
              >
                <Mic className="w-5 h-5 animate-pulse" />
                <span>شروع ضبط صدا</span>
              </button>
            )}

            {(recordingState === 'recording' || recordingState === 'paused') && (
              <>
                <button
                  type="button"
                  onClick={recordingState === 'recording' ? pauseRecording : resumeRecording}
                  className="p-3 bg-[#E8ECE0] dark:bg-[#23261F] hover:bg-[#D0E8B2]/30 text-[#1A1C16] dark:text-[#E2E3DC] rounded-full border border-[#E1E4D5] dark:border-[#43493E] transition-colors"
                  title={recordingState === 'recording' ? 'توقف موقت' : 'ادامه ضبط'}
                >
                  {recordingState === 'recording' ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-sm rounded-full shadow-md transition-all"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>تکمیل و ذخیره ویس</span>
                </button>

                <button
                  type="button"
                  onClick={resetRecording}
                  className="p-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-colors"
                  title="انصراف و حذف"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </>
            )}

            {recordingState === 'review' && (
              <>
                <button
                  type="button"
                  onClick={resetRecording}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ضبط مجدد</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAndInsert}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#4A6D22] hover:bg-[#3d5a1c] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>درج در متن جزوه</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="text-[11px] text-[#5E6258] dark:text-[#8F9285] text-center pt-1">
          ویس ضبط‌شده مستقیماً در محل نشانگر در متن سند ذخیره می‌شود و قابل پخش خواهد بود.
        </div>
      </div>
    </div>
  );
};
