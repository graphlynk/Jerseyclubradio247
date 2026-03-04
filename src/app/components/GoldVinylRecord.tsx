import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';

interface GoldVinylRecordProps {
  is24k: boolean;
  size?: number;
  spinning?: boolean;
  className?: string;
  thumbnail?: string;
}

export function GoldVinylRecord({ is24k, size = 80, spinning = false, className = '', thumbnail }: GoldVinylRecordProps) {
  const [shimmerAngle, setShimmerAngle] = useState(0);
  const rafRef = useRef<number | null>(null);
  const targetAngle = useRef(0);
  const currentAngle = useRef(0);

  useEffect(() => {
    if (!is24k) return;

    // ── Desktop: mouse position drives shimmer ──────────────────────────
    const onMouse = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      targetAngle.current = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) + 90;
    };

    // ── Mobile: gyroscope drives shimmer ────────────────────────────────
    const onOrientation = (e: DeviceOrientationEvent) => {
      const gamma = e.gamma ?? 0; // tilt left/right
      const beta = e.beta ?? 0;   // tilt front/back
      targetAngle.current = gamma * 2 + beta * 0.5;
    };

    // ── Smooth lerp animation loop ───────────────────────────────────────
    const animate = () => {
      currentAngle.current += (targetAngle.current - currentAngle.current) * 0.08;
      setShimmerAngle(Math.round(currentAngle.current));
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);

    window.addEventListener('mousemove', onMouse);
    window.addEventListener('deviceorientation', onOrientation);
    return () => {
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('deviceorientation', onOrientation);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [is24k]);

  const r = size / 2;
  const SPINDLE = size * 0.1;
  const LABEL_R = size * 0.22;

  // ── Gold conic gradient angle ─────────────────────────────────────────
  const goldBase = `conic-gradient(from ${shimmerAngle}deg at 50% 50%,
    #7d5a00 0%,
    #bf953f 12%,
    #fcf6ba 25%,
    #b38728 38%,
    #fbf5b7 50%,
    #aa7c00 62%,
    #fcf6ba 75%,
    #b38728 88%,
    #7d5a00 100%
  )`;

  const blackBase = `radial-gradient(circle at 35% 30%, #2a0050 0%, #0f0022 40%, #060010 80%, #020008 100%)`;

  const grooveStyle = `repeating-radial-gradient(
    circle at 50%,
    transparent 0,
    transparent 3px,
    rgba(0,0,0,${is24k ? '0.12' : '0.18'}) 3px,
    rgba(0,0,0,${is24k ? '0.12' : '0.18'}) 4px
  )`;

  // Shimmer highlight overlay (only on gold)
  const shimmerOverlay = is24k
    ? `linear-gradient(${shimmerAngle + 30}deg, transparent 30%, rgba(255,255,255,0.55) 50%, transparent 70%)`
    : null;

  return (
    <motion.div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      animate={{ rotate: spinning ? 360 : 0 }}
      transition={spinning ? { duration: 2.5, repeat: Infinity, ease: 'linear' } : { duration: 0.5 }}
    >
      {/* ── Outer glow ─────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: is24k
            ? `0 0 ${size * 0.25}px rgba(191,149,63,0.6), 0 0 ${size * 0.5}px rgba(191,149,63,0.25), 0 0 ${size * 0.75}px rgba(191,149,63,0.1)`
            : `0 0 ${size * 0.2}px rgba(157,0,255,0.4), 0 0 ${size * 0.4}px rgba(157,0,255,0.15)`,
        }}
      />

      {/* ── Record body ────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{ background: is24k ? goldBase : blackBase }}
      >
        {/* Groove overlay */}
        <div className="absolute inset-0 rounded-full" style={{ background: grooveStyle }} />

        {/* Shimmer highlight (gold only) */}
        {shimmerOverlay && (
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: shimmerOverlay, opacity: 0.45 }}
          />
        )}

        {/* Sparkle particles (gold only) */}
        {is24k && [0, 60, 120, 180, 240, 300].map(deg => {
          const rad = (deg + shimmerAngle * 0.3) * (Math.PI / 180);
          const dist = size * 0.33;
          const px = r + Math.cos(rad) * dist;
          const py = r + Math.sin(rad) * dist;
          return (
            <motion.div
              key={deg}
              className="absolute pointer-events-none"
              style={{
                width: size * 0.04,
                height: size * 0.04,
                borderRadius: '50%',
                background: 'rgba(255,255,200,0.9)',
                left: px - size * 0.02,
                top: py - size * 0.02,
                boxShadow: `0 0 ${size * 0.06}px rgba(255,255,150,0.8)`,
              }}
              animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.5 + (deg / 360) * 0.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          );
        })}
      </div>

      {/* ── Center label disk ──────────────────────────────────────────── */}
      <div
        className="absolute rounded-full overflow-hidden flex items-center justify-center"
        style={{
          width: LABEL_R * 2,
          height: LABEL_R * 2,
          top: r - LABEL_R,
          left: r - LABEL_R,
          background: is24k
            ? `radial-gradient(circle at 40% 35%, #8a6500 0%, #5a4000 40%, #2a1a00 100%)`
            : `radial-gradient(circle at 40% 35%, #3a0060 0%, #1a0030 50%, #0a0018 100%)`,
          border: `1.5px solid ${is24k ? 'rgba(191,149,63,0.6)' : 'rgba(157,0,255,0.4)'}`,
        }}
      >
        {thumbnail ? (
          <img src={thumbnail} alt="" className="w-full h-full object-cover opacity-70" />
        ) : (
          <span
            className="font-black text-center leading-none select-none"
            style={{
              fontSize: LABEL_R * 0.45,
              color: is24k ? '#fcf6ba' : '#E0AAFF',
              textShadow: is24k ? '0 0 4px rgba(191,149,63,0.8)' : '0 0 4px rgba(157,0,255,0.8)',
            }}
          >
            {is24k ? '' : 'JCR'}
          </span>
        )}
      </div>

      {/* ── Spindle hole ───────────────────────────────────────────────── */}
      <div
        className="absolute rounded-full"
        style={{
          width: SPINDLE * 2,
          height: SPINDLE * 2,
          top: r - SPINDLE,
          left: r - SPINDLE,
          background: is24k ? 'rgba(0,0,0,0.9)' : '#000',
          border: `1px solid ${is24k ? 'rgba(191,149,63,0.4)' : 'rgba(157,0,255,0.3)'}`,
        }}
      />

    </motion.div>
  );
}