import { useState, useEffect, useRef } from 'react';

// Jersey Club is typically 130–150 BPM. We default to 140.
const DEFAULT_BPM = 140;

export function useBPMPulse(active = true, bpm = DEFAULT_BPM) {
  const [pulse, setPulse] = useState(false);
  const [beat, setBeat] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const ms = (60 / bpm) * 1000; // ms per beat
    timerRef.current = setInterval(() => {
      setPulse(true);
      setBeat(b => b + 1);
      setTimeout(() => setPulse(false), 70);
    }, ms);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [active, bpm]);

  // Returns a style object for pulsing borders/glows
  const pulseStyle = (baseColor = '#9D00FF', pulseColor = '#FF00FF'): React.CSSProperties => ({
    boxShadow: pulse
      ? `0 0 0 2px ${pulseColor}, 0 0 24px ${pulseColor}80`
      : `0 0 0 1px ${baseColor}60, 0 0 12px ${baseColor}30`,
    transition: pulse ? 'none' : 'box-shadow 0.25s ease',
    borderColor: pulse ? pulseColor : baseColor,
  });

  return { pulse, beat, pulseStyle };
}
