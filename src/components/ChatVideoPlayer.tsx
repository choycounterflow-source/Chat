import React, { useRef, useState, useEffect } from 'react';
import { Volume2, VolumeX, Play } from 'lucide-react';

interface ChatVideoPlayerProps {
  src: string;
  title?: string;
  subtitle?: string;
  compact?: boolean;
  autoPlayWithSound?: boolean;
}

export const ChatVideoPlayer: React.FC<ChatVideoPlayerProps> = ({
  src,
  title,
  subtitle,
  compact = false,
  autoPlayWithSound = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

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

  const handlePlayWithSound = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = false;
    el.volume = 1;
    setIsMuted(false);
    el.play().catch(() => {});
  };

  const handleToggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    const nextMuted = !el.muted;
    el.muted = nextMuted;
    if (!nextMuted && el.volume === 0) {
      el.volume = 1;
    }
    setIsMuted(nextMuted);
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

        <button
          type="button"
          onClick={handleToggleMute}
          className={`absolute top-2 right-2 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow transition ${
            isMuted
              ? 'bg-red-500/90 text-white'
              : 'bg-slate-950/80 border border-emerald-400/60 text-emerald-300'
          }`}
          title={isMuted ? 'Unmute video' : 'Mute video'}
        >
          {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          <span>{isMuted ? 'Muted' : 'Sound On'}</span>
        </button>
      </div>

      {(title || subtitle) && (
        <div className="flex items-center justify-between text-[10px] px-0.5 gap-2">
          {title && <span className="font-bold text-white truncate">{title}</span>}
          {subtitle && <span className="text-emerald-300 shrink-0">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
