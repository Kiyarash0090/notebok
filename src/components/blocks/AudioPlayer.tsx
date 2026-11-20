import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Download,
  Trash2,
  Mic,
  AlertCircle,
} from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  title?: string;
  duration?: number;
  compact?: boolean;
  onDelete?: () => void;
  showDownload?: boolean;
  className?: string;
}

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return '00:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  title,
  duration: propDuration,
  compact = false,
  onDelete,
  showDownload = true,
  className = '',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState<number>(
    propDuration && Number.isFinite(propDuration) && propDuration > 0 ? propDuration : 0
  );
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [muted, setMuted] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Sync prop duration if it updates
  useEffect(() => {
    if (propDuration && Number.isFinite(propDuration) && propDuration > 0) {
      setTotalDuration((prev) => (prev > 0 ? Math.max(prev, propDuration) : propDuration));
    }
  }, [propDuration]);

  // Audio element event listeners & WebM MediaRecorder duration fix
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    setPlaying(false);
    setCurrentTime(0);
    setAudioError(null);

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    const onTimeUpdate = () => {
      if (!isSeeking) {
        setCurrentTime(audio.currentTime);
        // If duration was Infinity (common in recorded WebM blobs in Chromium)
        if (!Number.isFinite(totalDuration) || totalDuration <= 0 || audio.currentTime > totalDuration) {
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            setTotalDuration(audio.duration);
          } else {
            setTotalDuration((prev) => Math.max(prev, audio.currentTime));
          }
        }
      }
    };

    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setTotalDuration(audio.duration);
      } else if (propDuration && propDuration > 0) {
        setTotalDuration(propDuration);
      } else {
        // Chromium WebM duration quirk: seek to end to read true duration, then restore
        try {
          audio.currentTime = 1e101;
          audio.ontimeupdate = function () {
            this.ontimeupdate = () => {};
            audio.currentTime = 0;
            if (Number.isFinite(audio.duration) && audio.duration > 0) {
              setTotalDuration(audio.duration);
            }
          };
        } catch {
          // ignore seek quirk
        }
      }
    };

    const onError = () => {
      const err = audio.error;
      console.warn('Audio playback error:', err);
      setAudioError('خطا در پخش فایل صوتی');
      setPlaying(false);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('error', onError);
      audio.pause();
    };
  }, [src, isSeeking, propDuration]);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    setAudioError(null);

    if (audio.paused) {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch((err) => {
          console.warn('Failed to start playback:', err);
          setPlaying(false);
          setAudioError('پخش صدا آغاز نشد');
        });
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = parseFloat(e.target.value);
    setCurrentTime(nextVal);
  };

  const handleSeekStart = () => {
    setIsSeeking(true);
  };

  const handleSeekEnd = (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
    setIsSeeking(false);
    const audio = audioRef.current;
    if (!audio) return;
    const target = e.currentTarget as HTMLInputElement;
    const nextVal = parseFloat(target.value);
    audio.currentTime = nextVal;
    setCurrentTime(nextVal);
  };

  const skipSeconds = (sec: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    const maxDur = totalDuration > 0 ? totalDuration : 99999;
    const target = Math.max(0, Math.min(maxDur, audio.currentTime + sec));
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const cycleSpeed = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    const rates = [1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const toggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !audio.muted;
    setMuted(audio.muted);
  };

  const progressPercent = totalDuration > 0 ? Math.min(100, Math.max(0, (currentTime / totalDuration) * 100)) : 0;
  const displayTitle = title?.trim() || 'ویس ضبط‌شده';

  if (compact) {
    return (
      <div
        className={`flex items-center gap-2.5 p-2 rounded-2xl bg-[#EDF5E0] dark:bg-[#232F1A] border border-[#D0E8B2] dark:border-[#3D522C] text-[#1A1C16] dark:text-[#E2E3DC] select-none ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <audio ref={audioRef} src={src} preload="metadata" />

        {/* Play/Pause */}
        <button
          type="button"
          onClick={togglePlay}
          className="w-8 h-8 shrink-0 rounded-xl bg-[#4A6D22] text-white flex items-center justify-center hover:bg-[#3d5a1c] active:scale-95 transition-all shadow-2xs"
          title={playing ? 'توقف' : 'پخش'}
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 mr-0.5" />}
        </button>

        {/* Title & Scrubber */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center justify-between gap-1 text-[11px] font-bold">
            <span className="truncate">{displayTitle}</span>
            <span dir="ltr" className="text-[10px] text-[#5E6258] dark:text-[#8F9285] font-mono shrink-0">
              {fmt(currentTime)} / {fmt(totalDuration)}
            </span>
          </div>

          {/* Mini Track */}
          <div className="relative w-full h-1.5 mt-1 bg-black/10 dark:bg-white/15 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 bottom-0 bg-[#4A6D22] dark:bg-[#D0E8B2] transition-all duration-75"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Speed */}
        <button
          type="button"
          onClick={cycleSpeed}
          className="px-1.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-white/70 dark:bg-black/30 hover:bg-[#D0E8B2] text-[#4A6D22] dark:text-[#D0E8B2] transition-colors"
          title="سرعت پخش"
        >
          {playbackRate}x
        </button>
      </div>
    );
  }

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-[#F4F8EC] to-[#EDF5E0] dark:from-[#1E2517] dark:to-[#171D12] border border-[#D0E8B2] dark:border-[#3D522C] shadow-xs space-y-2.5 text-[#1A1C16] dark:text-[#E2E3DC] select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Top Header: Title, Soundwave, Actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-[#4A6D22]/15 dark:bg-[#D0E8B2]/15 text-[#4A6D22] dark:text-[#D0E8B2] flex items-center justify-center shrink-0">
            <Mic className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs sm:text-sm font-bold truncate" title={displayTitle}>
              {displayTitle}
            </div>
            <div className="text-[10px] text-[#5E6258] dark:text-[#8F9285] flex items-center gap-2">
              <span>فایل صوتی ضبط‌شده</span>
              {playing && (
                <span className="flex items-center gap-1 text-[#4A6D22] dark:text-[#D0E8B2] font-semibold animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4A6D22] dark:bg-[#D0E8B2]" />
                  در حال پخش...
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Animated equalizer waves when playing */}
        <div className="flex items-end gap-1 h-6 px-1 shrink-0" aria-hidden="true">
          {[40, 70, 100, 50, 85, 30].map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${
                playing
                  ? 'bg-[#4A6D22] dark:bg-[#D0E8B2]'
                  : 'bg-[#D0E8B2]/50 dark:bg-[#43493E]/50'
              }`}
              style={{
                height: playing
                  ? `${Math.max(20, Math.sin((currentTime * 4) + i * 1.2) * 45 + 55)}%`
                  : '25%',
              }}
            />
          ))}
        </div>

        {/* Action icons (Download, Delete) */}
        <div className="flex items-center gap-1 shrink-0">
          {showDownload && (
            <a
              href={src}
              download={`${displayTitle.replace(/\s+/g, '_')}.webm`}
              className="p-2 rounded-xl text-[#5E6258] dark:text-[#8F9285] hover:text-[#4A6D22] dark:hover:text-[#D0E8B2] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="دانلود فایل صوتی"
            >
              <Download className="w-4 h-4" />
            </a>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-2 rounded-xl text-[#5E6258] dark:text-[#8F9285] hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="حذف فایل صوتی"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Error banner if any */}
      {audioError && (
        <div className="flex items-center gap-2 p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{audioError}</span>
        </div>
      )}

      {/* Interactive Timeline Scrubber */}
      <div className="space-y-1">
        <div className="relative flex items-center group/scrub py-1">
          <input
            type="range"
            min={0}
            max={totalDuration > 0 ? totalDuration : 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeekChange}
            onMouseDown={handleSeekStart}
            onTouchStart={handleSeekStart}
            onMouseUp={handleSeekEnd}
            onTouchEnd={handleSeekEnd}
            className="w-full h-2 rounded-lg appearance-none bg-black/10 dark:bg-white/15 cursor-pointer accent-[#4A6D22] dark:accent-[#D0E8B2] focus:outline-none"
            aria-label="نوار زمان صوت"
          />
        </div>

        {/* Timestamps */}
        <div className="flex items-center justify-between text-[11px] font-mono text-[#5E6258] dark:text-[#8F9285]" dir="ltr">
          <span>{fmt(currentTime)}</span>
          <span>{fmt(totalDuration)}</span>
        </div>
      </div>

      {/* Player Bottom Control Deck */}
      <div className="flex items-center justify-between pt-1 border-t border-[#D0E8B2]/60 dark:border-[#3D522C]/60">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Skip -10s */}
          <button
            type="button"
            onClick={(e) => skipSeconds(-10, e)}
            className="p-2 rounded-xl text-[#3F4A35] dark:text-[#BCC2B2] hover:bg-[#D0E8B2]/40 dark:hover:bg-[#324B10]/40 transition-colors"
            title="۱۰ ثانیه به عقب"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Primary Play / Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            className="px-4 py-2 rounded-xl bg-[#4A6D22] dark:bg-[#D0E8B2] text-white dark:text-[#1A3700] hover:bg-[#3B571B] dark:hover:bg-[#c2de9f] active:scale-95 transition-all shadow-xs flex items-center gap-1.5 text-xs font-bold"
            title={playing ? 'توقف' : 'پخش'}
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            <span>{playing ? 'توقف' : 'پخش'}</span>
          </button>

          {/* Skip +10s */}
          <button
            type="button"
            onClick={(e) => skipSeconds(10, e)}
            className="p-2 rounded-xl text-[#3F4A35] dark:text-[#BCC2B2] hover:bg-[#D0E8B2]/40 dark:hover:bg-[#324B10]/40 transition-colors"
            title="۱۰ ثانیه به جلو"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Speed Toggle */}
          <button
            type="button"
            onClick={cycleSpeed}
            className="px-2 py-1 rounded-xl text-xs font-mono font-bold bg-white dark:bg-[#232F1A] border border-[#D0E8B2] dark:border-[#3D522C] hover:bg-[#D0E8B2] text-[#4A6D22] dark:text-[#D0E8B2] hover:text-[#1A3700] transition-colors"
            title="تغییر سرعت پخش (۱x، ۱.۲۵x، ۱.۵x، ۲x)"
          >
            {playbackRate}x
          </button>

          {/* Mute Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className="p-2 rounded-xl text-[#5E6258] dark:text-[#8F9285] hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title={muted ? 'روشن کردن صدا' : 'بی‌صدا'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
