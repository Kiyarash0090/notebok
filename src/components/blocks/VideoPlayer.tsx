import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Pause, Play, Volume2, VolumeX } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  // Cards start muted so a click never blasts sound (play is always user-initiated).
  initialMuted?: boolean;
  compact?: boolean;
}

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, initialMuted = false, compact = false }) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(initialMuted);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);

  const reveal = () => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setControlsVisible(false);
      }
    }, 3000);
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = initialMuted;
    const onTime = () => setCurrent(v.currentTime);
    const onDur = () => setDuration(v.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onLoadedMeta = () => {
      if (Number.isFinite(v.duration) && v.duration > 0) v.currentTime = Math.min(0.1, v.duration / 10);
    };
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('durationchange', onDur);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('loadedmetadata', onLoadedMeta);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('durationchange', onDur);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('loadedmetadata', onLoadedMeta);
    };
  }, [initialMuted]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
    reveal();
  };

  const toggleMute = (e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    reveal();
  };

  const handleSeekPos = (clientX: number, target: HTMLDivElement) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration) || !v.duration) return;
    const rect = target.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    v.currentTime = ratio * v.duration;
    setCurrent(v.currentTime);
    reveal();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    handleSeekPos(e.clientX, e.currentTarget);
  };

  const handleTouchSeek = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      handleSeekPos(e.touches[0].clientX, e.currentTarget);
    }
  };

  const toggleFullscreen = (e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation();
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {});
    }
    reveal();
  };

  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      onMouseMove={reveal}
      onTouchStart={reveal}
      className="relative group/video overflow-hidden rounded-2xl border border-[#E1E4D5] dark:border-[#43493E] bg-black select-none"
    >
      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        playsInline
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
        }}
        className={`w-full h-auto block ${compact ? 'max-h-48 sm:max-h-56 object-contain' : ''}`}
      />

      {/* Center play affordance (big) when paused */}
      {!playing && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="absolute inset-0 m-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/60 backdrop-blur-xs text-white flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all shadow-lg"
          title="پخش"
        >
          <Play className="w-6 h-6 sm:w-7 sm:h-7 ml-0.5 fill-white" />
        </button>
      )}

      {/* Bottom control bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={reveal}
        className={`absolute inset-x-0 bottom-0 px-2.5 pt-8 pb-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex items-center gap-1.5 sm:gap-2 transition-opacity duration-200 ${
          controlsVisible || !playing ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="p-1.5 sm:p-2 rounded-xl text-white hover:bg-white/20 active:scale-95 transition-all"
          title={playing ? 'توقف' : 'پخش'}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
        </button>

        {/* Responsive Seek bar with touch & mouse scrub */}
        <div 
          onClick={seek}
          onTouchStart={handleTouchSeek}
          onTouchMove={handleTouchSeek}
          className="flex-1 h-7 flex items-center cursor-pointer px-1 group/seek"
        >
          <div className="relative w-full h-1.5 rounded-full bg-white/30 group-hover/seek:h-2 transition-all">
            <div className="absolute left-0 top-0 bottom-0 rounded-full bg-[#D0E8B2]" style={{ width: `${progress}%` }} />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md transform -translate-x-1/2 opacity-90 group-hover/seek:scale-125 transition-transform"
              style={{ left: `${progress}%` }}
            />
          </div>
        </div>

        <span dir="ltr" className="text-[10px] sm:text-xs text-white/90 font-mono tabular-nums shrink-0">
          {fmt(current)} / {fmt(duration)}
        </span>

        <button
          type="button"
          onClick={toggleMute}
          className="p-1.5 sm:p-2 rounded-xl text-white hover:bg-white/20 active:scale-95 transition-all"
          title={muted ? 'روشن کردن صدا' : 'بی‌صدا'}
        >
          {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1.5 sm:p-2 rounded-xl text-white hover:bg-white/20 active:scale-95 transition-all"
          title="تمام‌صفحه"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
