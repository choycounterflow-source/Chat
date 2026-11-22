import React, { useRef, useState, useEffect } from 'react';
import { Volume2, VolumeX, Play, Maximize2, Minimize2, X } from 'lucide-react';

interface ChatVideoPlayerProps {
  src: string;
  title?: string;
  subtitle?: string;
  compact?: boolean;
  autoPlayWithSound?: boolean;
}

type FullscreenVideoElement = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitRequestFullscreen?: () => Promise<void> | void;
};

export const ChatVideoPlayer: React.FC<ChatVideoPlayerProps> = ({
  src,
  title,
  subtitle,
  compact = false,
  autoPlayWithSound = false,
}) => {
  const videoRef = useRef<FullscreenVideoElement>(null);
  const fsVideoRef = useRef<FullscreenVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreenOverlay, setIsFullscreenOverlay] = useState(false);
  const resumeTimeRef = useRef(0);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = false;
    el.volume = 1;
    if (autoPlayWithSound) {
      el.play().catch(() => {
        // Browser may require a direct tap if opened programmatically
      });
    }
  }, [src, autoPlayWithSound]);

  useEffect(() => {
    if (!isFullscreenOverlay) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseFullscreenOverlay();
    };
    window.addEventListener('keydown', onKeyDown);
    const fsEl = fsVideoRef.current;
    if (fsEl) {
      fsEl.currentTime = resumeTimeRef.current;
      fsEl.muted = isMuted;
      fsEl.volume = 1;
      fsEl.play().catch(() => {});
    }
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreenOverlay]);

  const handlePlayWithSound = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = false;
    el.volume = 1;
    setIsMuted(false);
    el.play().catch(() => {});
  };

  const handleToggleMute = () => {
    const el = isFullscreenOverlay ? fsVideoRef.current : videoRef.current;
    if (!el) return;
    const nextMuted = !el.muted;
    el.muted = nextMuted;
    if (!nextMuted && el.volume === 0) {
      el.volume = 1;
    }
    setIsMuted(nextMuted);
  };

  const handleOpenFullscreen = async () => {
    const el = videoRef.current;
    if (!el) return;

    resumeTimeRef.current = el.currentTime || 0;

    // Try native Fullscreen API first (Android Chrome / Desktop / iOS Safari)
    try {
      if (typeof el.requestFullscreen === 'function') {
        await el.requestFullscreen();
        el.play().catch(() => {});
        return;
      }
      if (typeof el.webkitRequestFullscreen === 'function') {
        await el.webkitRequestFullscreen();
        el.play().catch(() => {});
        return;
      }
      if (typeof el.webkitEnterFullscreen === 'function') {
        el.webkitEnterFullscreen();
        el.play().catch(() => {});
        return;
      }
    } catch {
      // Fall back to full-viewport theater modal (works in iframes & all WebViews)
    }

    el.pause();
    setIsFullscreenOverlay(true);
  };

  const handleCloseFullscreenOverlay = () => {
    const fsEl = fsVideoRef.current;
    const mainEl = videoRef.current;
    if (fsEl && mainEl) {
      mainEl.currentTime = fsEl.currentTime || 0;
      mainEl.muted = fsEl.muted;
      setIsMuted(fsEl.muted);
    }
    setIsFullscreenOverlay(false);
  };

  return (
    <div className="w-full space-y-1.5">
      <div className="relative w-full rounded-xl overflow-hidden bg-black border border-emerald-700/60">
        <video
          ref={videoRef}
          src={src}
          controls
          playsInline
          preload="metadata"
          muted={isMuted}
          onPlay={() => {
            if (videoRef.current) {
              setIsMuted(videoRef.current.muted);
            }
            setIsPlaying(true);
          }}
          onPause={() => setIsPlaying(false)}
          onVolumeChange={() => {
            if (videoRef.current) {
              setIsMuted(videoRef.current.muted || videoRef.current.volume === 0);
            }
          }}
          className={`w-full bg-black object-contain ${compact ? 'max-h-44' : 'max-h-72'}`}
        />

        {!isPlaying && (
          <button
            type="button"
            onClick={handlePlayWithSound}
            className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-emerald-400/95 text-slate-950 font-bold text-[10px] flex items-center gap-1 shadow hover:bg-emerald-300 transition"
            title="Play with sound"
          >
            <Play className="w-3 h-3 fill-current" /> Play with Sound
          </button>
        )}

        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleMute}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow transition ${
              isMuted
                ? 'bg-red-500/90 text-white'
                : 'bg-slate-950/80 border border-emerald-400/60 text-emerald-300'
            }`}
            title={isMuted ? 'Unmute video' : 'Mute video'}
          >
            {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            <span>{isMuted ? 'Muted' : 'Sound On'}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenFullscreen}
            className="px-2 py-1 rounded-lg bg-slate-950/85 border border-cyan-400/70 text-cyan-200 hover:bg-cyan-400 hover:text-slate-950 text-[10px] font-bold flex items-center gap-1 shadow transition"
            title="Fullscreen Video"
          >
            <Maximize2 className="w-3 h-3" />
            <span>Fullscreen</span>
          </button>
        </div>
      </div>

      {(title || subtitle) && (
        <div className="flex items-center justify-between text-[10px] px-0.5 gap-2">
          {title && <span className="font-bold text-white truncate">{title}</span>}
          {subtitle && <span className="text-emerald-300 shrink-0">{subtitle}</span>}
        </div>
      )}

      {/* Full-Viewport Video Fullscreen Fallback (for iframes & mobile browsers blocking native fullscreen) */}
      {isFullscreenOverlay && (
        <div className="fixed inset-0 z-[75] bg-black flex flex-col">
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-950/90 border-b border-emerald-800/70 shrink-0">
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{title || 'Video Fullscreen'}</div>
              {subtitle && <div className="text-[10px] text-emerald-300 truncate">{subtitle}</div>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleToggleMute}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 ${
                  isMuted
                    ? 'bg-red-500 text-white'
                    : 'bg-emerald-950 border border-emerald-500/60 text-emerald-200'
                }`}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                <span>{isMuted ? 'Muted' : 'Sound'}</span>
              </button>
              <button
                type="button"
                onClick={handleCloseFullscreenOverlay}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1"
                title="Exit Fullscreen"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
            <video
              ref={fsVideoRef}
              src={src}
              controls
              playsInline
              autoPlay
              muted={isMuted}
              onVolumeChange={() => {
                if (fsVideoRef.current) {
                  setIsMuted(fsVideoRef.current.muted || fsVideoRef.current.volume === 0);
                }
              }}
              className="w-full h-full object-contain bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
};
