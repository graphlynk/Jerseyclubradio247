import { useEffect, useRef } from 'react';

interface VisualizerProps {
  isPlaying: boolean;
  barCount?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function Visualizer({ isPlaying, barCount = 32, height = 60, color = '#9D00FF', className = '' }: VisualizerProps) {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const heightsRef = useRef<number[]>(Array.from({ length: barCount }, () => Math.random() * 0.3 + 0.05));
  const velocitiesRef = useRef<number[]>(Array.from({ length: barCount }, () => (Math.random() - 0.5) * 0.04));

  useEffect(() => {
    const animate = () => {
      heightsRef.current = heightsRef.current.map((h, i) => {
        if (!isPlaying) {
          // Decay to minimal height when paused
          return Math.max(0.04, h * 0.92);
        }
        let v = velocitiesRef.current[i];
        let newH = h + v;
        if (newH > 1 || newH < 0.05) {
          v = -v * (0.7 + Math.random() * 0.3);
          velocitiesRef.current[i] = v;
          newH = Math.max(0.05, Math.min(1, newH));
        }
        // Add some randomness when playing
        velocitiesRef.current[i] += (Math.random() - 0.5) * 0.015;
        velocitiesRef.current[i] = Math.max(-0.08, Math.min(0.08, velocitiesRef.current[i]));
        return newH;
      });

      heightsRef.current.forEach((h, i) => {
        const bar = barsRef.current[i];
        if (bar) {
          bar.style.height = `${h * height}px`;
          const opacity = isPlaying ? 0.5 + h * 0.5 : 0.2;
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
    <div className={`flex items-end gap-[2px] ${className}`} style={{ height }}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          ref={el => { barsRef.current[i] = el; }}
          style={{
            width: `${100 / barCount}%`,
            minWidth: 2,
            background: i % 3 === 0
              ? color
              : i % 3 === 1
              ? '#00FF88'
              : '#FF0080',
            borderRadius: '2px 2px 0 0',
          }}
        />
      ))}
    </div>
  );
}
