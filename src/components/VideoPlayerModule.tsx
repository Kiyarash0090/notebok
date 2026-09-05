import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Download,
  X,
  RotateCcw,
  RotateCw,
  Video,
  Settings,
} from 'lucide-react';
import { useBackButton } from '../lib/useBackButton';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  title?: string;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  onClose,
  src,
  title = 'ویدیو',
}) => {
  useBackButton(isOpen, onClose, 'video-player-modal');
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [isOpen, src]);

  if (!isOpen || !src) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  };

  const skipTime = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    }
  };

  const formatTime = (timeInSeconds: number) => {
    if (isNaN(timeInSeconds)) return '00:00';
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div
        ref={containerRef}
        className="relative w-full max-w-4xl bg-[#12140E] rounded-3xl overflow-hidden border border-[#43493E] shadow-2xl flex flex-col group"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-b from-black/80 to-transparent z-10">
          <div className="flex items-center gap-2.5 text-white">
            <div className="w-8 h-8 rounded-xl bg-[#8B6814]/40 flex items-center justify-center text-[#FFE086]">
              <Video className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm sm:text-base truncate max-w-[250px] sm:max-w-md">{title}</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={src}
              download={title || 'video.mp4'}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="دانلود ویدیو"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="بستن پلیر"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Video Viewport */}
        <div
          className="relative flex-1 bg-black flex items-center justify-center cursor-pointer min-h-[280px] sm:min-h-[420px]"
          onClick={togglePlay}
        >
          <video
            ref={videoRef}
            src={src}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            className="max-h-[70vh] w-auto max-w-full object-contain"
            playsInline
          />

          {/* Big Center Play/Pause Overlay Icon when paused */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#4A6D22] text-white flex items-center justify-center shadow-xl transform scale-100 hover:scale-110 transition-transform">
                <Play className="w-8 h-8 sm:w-10 sm:h-10 mr-1" />
              </div>
            </div>
          )}
        </div>

        {/* Custom Video Controls Bar */}
        <div
          className="p-4 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col gap-2.5 z-10 text-white"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress Bar */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold text-gray-300 min-w-[42px]">
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#D0E8B2]"
            />
            <span className="text-xs font-mono font-bold text-gray-400 min-w-[42px]">
              {formatTime(duration)}
            </span>
          </div>

          {/* Buttons & Options Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Play/Pause Button */}
              <button
                type="button"
                onClick={togglePlay}
                className="p-2.5 rounded-xl bg-[#4A6D22] text-white hover:bg-[#3B571B] transition-colors"
                title={isPlaying ? 'توقف' : 'پخش'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 mr-0.5" />}
              </button>

              {/* Skip 10s Backward / Forward */}
              <button
                type="button"
                onClick={() => skipTime(-10)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 transition-colors"
                title="۱۰ ثانیه عقب"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => skipTime(10)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 transition-colors"
                title="۱۰ ثانیه جلو"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Volume Slider & Mute Toggle */}
              <div className="flex items-center gap-2 group/vol">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 transition-colors"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 sm:w-20 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#D0E8B2]"
                />
              </div>
            </div>

            {/* Right Controls: Speed & Fullscreen */}
            <div className="flex items-center gap-2 relative">
              {/* Speed Dropdown Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-gray-200 transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-[#D0E8B2]" />
                  <span>{playbackRate}x</span>
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-full left-0 mb-2 w-28 bg-[#1C1C17] border border-[#43493E] rounded-2xl p-1.5 shadow-xl flex flex-col gap-1 z-30">
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                      <button
                        key={speed}
                        type="button"
                        onClick={() => handleSpeedChange(speed)}
                        className={`w-full px-3 py-1.5 text-right rounded-xl text-xs font-bold transition-colors ${
                          playbackRate === speed
                            ? 'bg-[#4A6D22] text-white'
                            : 'text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        {speed}x {speed === 1 ? '(عادی)' : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 transition-colors"
                title="تمام‌صفحه"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
