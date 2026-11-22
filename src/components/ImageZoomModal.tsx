import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, X } from 'lucide-react';

interface ImageZoomModalProps {
  src: string;
  caption?: string;
  onClose: () => void;
}

export const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ src, caption, onClose }) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const offsetStartRef = useRef({ x: 0, y: 0 });
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef(1);
  const lastTapRef = useRef(0);

  const clampScale = (val: number) => Math.min(4.5, Math.max(0.5, Number(val.toFixed(2))));

  const handleZoomIn = () => setScale((s) => clampScale(s + 0.35));
  const handleZoomOut = () => {
    setScale((s) => {
      const next = clampScale(s - 0.35);
      if (next <= 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };
  const handleReset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === '0') handleReset();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchStartDistRef.current = getTouchDistance(e.touches);
      pinchStartScaleRef.current = scale;
      setIsDragging(false);
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        if (scale > 1.1) {
          handleReset();
        } else {
          setScale(2.25);
        }
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;

      if (scale > 1) {
        setIsDragging(true);
        dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        offsetStartRef.current = { ...offset };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      const dist = getTouchDistance(e.touches);
      const ratio = dist / pinchStartDistRef.current;
      const next = clampScale(pinchStartScaleRef.current * ratio);
      setScale(next);
      if (next <= 1) setOffset({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isDragging && scale > 1) {
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setOffset({
        x: offsetStartRef.current.x + dx,
        y: offsetStartRef.current.y + dy,
      });
    }
  };

  const handleTouchEnd = () => {
    pinchStartDistRef.current = null;
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    offsetStartRef.current = { ...offset };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setOffset({
      x: offsetStartRef.current.x + (e.clientX - dragStartRef.current.x),
      y: offsetStartRef.current.y + (e.clientY - dragStartRef.current.y),
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.2 : -0.2;
    setScale((s) => {
      const next = clampScale(s + delta);
      if (next <= 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/95 flex flex-col select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget && scale <= 1) onClose();
      }}
    >
      {/* Top Zoom Controls Bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-950/90 border-b border-emerald-800/70 shrink-0 z-10">
        <div className="text-xs font-bold text-emerald-200 truncate max-w-[35%]">
          {caption || 'Image Preview'}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 rounded-xl bg-emerald-950 border border-emerald-700 text-emerald-200 hover:bg-emerald-800 hover:text-white transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-950 border border-emerald-700 text-white font-mono text-xs font-bold min-w-[54px] text-center hover:bg-emerald-800 transition"
            title="Reset Zoom"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 rounded-xl bg-emerald-950 border border-emerald-700 text-emerald-200 hover:bg-emerald-800 hover:text-white transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="p-2 rounded-xl bg-emerald-950 border border-emerald-700 text-emerald-300 hover:bg-emerald-800 hover:text-white transition"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-bold transition ml-1"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Zoomable / Pannable Image Stage */}
      <div
        className={`flex-1 flex items-center justify-center overflow-hidden touch-none p-2 ${
          scale > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
        }`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          if (e.target === e.currentTarget && scale <= 1) onClose();
        }}
      >
        <img
          src={src}
          alt={caption || 'Zoomed image'}
          draggable={false}
          onDoubleClick={() => {
            if (scale > 1.1) {
              handleReset();
            } else {
              setScale(2.25);
            }
          }}
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 120ms ease-out',
          }}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        />
      </div>

      <div className="px-3 py-2 text-center text-[10px] text-emerald-300/80 bg-slate-950/80 border-t border-emerald-900/60 shrink-0">
        Pinch or tap + / - to zoom in &amp; zoom out • Double-tap to toggle zoom • Drag when zoomed
      </div>
    </div>
  );
};
