import { useEffect, useRef } from 'react';

interface VisualizerProps {
  isPlaying: boolean;
  barCount?: number;
  height?: number;
  color?: string;
  className?: string;
  /** When true, bars fade to transparent at both edges */
  fade?: boolean;
}

/**
 * Premium waveform visualizer — mono-purple bars with edge fade,
 * designed to stretch across the desktop player and blend seamlessly.
 */
export function Visualizer({
  isPlaying,
  barCount = 48,
  height = 60,
  color = '#9D00FF',
  className = '',
  fade = false,
}: VisualizerProps) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const heightsRef = useRef<number[]>(Array.from({ length: barCount }, () => Math.random() * 0.3 + 0.05));
  const velocitiesRef = useRef<number[]>(Array.from({ length: barCount }, () => (Math.random() - 0.5) * 0.03));

  useEffect(() => {
    const animate = () => {
      heightsRef.current = heightsRef.current.map((h, i) => {
        if (!isPlaying) {
          return Math.max(0.03, h * 0.94);
        }
        let v = velocitiesRef.current[i];
        let newH = h + v;
        if (newH > 1 || newH < 0.04) {
          v = -v * (0.65 + Math.random() * 0.35);
          velocitiesRef.current[i] = v;
          newH = Math.max(0.04, Math.min(1, newH));
        }
        velocitiesRef.current[i] += (Math.random() - 0.5) * 0.012;
        velocitiesRef.current[i] = Math.max(-0.06, Math.min(0.06, velocitiesRef.current[i]));
        return newH;
      });

      heightsRef.current.forEach((h, i) => {
        const bar = barsRef.current[i];
        if (bar) {
          bar.style.height = `${h * height}px`;
          const opacity = isPlaying ? 0.4 + h * 0.6 : 0.15;
          bar.style.opacity = String(opacity);
        }
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, height, barCount]);

  return (
    <div
      className={`flex items-end gap-[1.5px] ${className}`}
      style={{
        height,
        // Edge fade: bars smoothly disappear at left and right edges
        ...(fade ? {
          maskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 30%, transparent 80%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 15%, black 30%, transparent 80%)',
        } : {}),
      }}
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          ref={el => { barsRef.current[i] = el; }}
          style={{
            width: 2,
            minWidth: 1.5,
            background: color,
            borderRadius: '1px',
          }}
        />
      ))}
    </div>
  );
}
