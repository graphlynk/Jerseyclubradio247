import { useEffect, useRef, useCallback } from 'react';

interface SpectrumAnalyzerProps {
    isPlaying: boolean;
    className?: string;
}

const N = 96; // frequency bins
const CANVAS_H = 78; // display height in px
const PEAK_HOLD_FRAMES = 55;
const PEAK_DECAY = 0.007;

// Frequency labels for bottom axis
const FREQ_LABELS = ['20', '50', '100', '200', '500', '1k', '2k', '5k', '10k', '20k'];
// dB labels for right axis
const DB_LABELS = ['0', '-6', '-12', '-18'];

/**
 * Get the gradient color for a bar at a given normalized height (0–1).
 * Green → Yellow → Orange → Red (mimics a real dB color scale).
 */
function getBarColor(t: number): string {
    if (t < 0.4) return '#00FF77';
    if (t < 0.6) return '#AAFF00';
    if (t < 0.75) return '#FFCC00';
    if (t < 0.88) return '#FF6600';
    return '#FF1100';
}

/**
 * Professional canvas-based frequency spectrum analyzer.
 * Mimics a real audio plugin / DJ interface — 96 bins with gradient coloring,
 * peak hold dots, glow effects, dB grid, and frequency labels.
 */
export function SpectrumAnalyzer({ isPlaying, className = '' }: SpectrumAnalyzerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number | null>(null);
    const isPlayingRef = useRef(isPlaying);

    // Simulation state (persisted across frames via refs)
    const heightsRef = useRef<number[]>(new Array(N).fill(0).map(() => Math.random() * 0.03));
    const peaksRef = useRef<number[]>(new Array(N).fill(0));
    const peakHoldRef = useRef<number[]>(new Array(N).fill(0));
    const phaseRef = useRef(0);

    // Keep isPlaying ref in sync
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    /**
     * Compute synthetic FFT amplitudes for the current frame.
     * Uses psychoacoustic shaping: sub-bass is loudest, highs taper off.
     * Three harmonic humps + kick transients for realism.
     */
    const computeAmplitudes = useCallback(() => {
        const phase = phaseRef.current;
        const playing = isPlayingRef.current;
        const amps = new Array(N);

        for (let i = 0; i < N; i++) {
            if (!playing) {
                // Noise floor when paused
                amps[i] = 0.008 + Math.random() * 0.027;
                continue;
            }

            const freq = i / N; // 0..1 normalized frequency position

            // Base: sub-bass is louder, highs taper off
            let base = Math.max(0, 1.0 - freq * 0.9) * 0.55;

            // Three harmonic humps at different phase speeds
            const h1 = Math.sin(phase * 1.3 + i * 0.15) * 0.3;
            const h2 = Math.sin(phase * 0.7 + i * 0.25 + 1.5) * 0.2;
            const h3 = Math.sin(phase * 2.1 + i * 0.08 + 3.0) * 0.15;
            base += Math.max(0, h1) + Math.max(0, h2) + Math.max(0, h3);

            // Kick transient: first 6 bins spike strongly (~every 1.4s)
            if (i < 6) {
                const kick = Math.sin(phase * 4.5) * 0.5;
                if (kick > 0.3) base += kick * (1 - i / 6);
            }

            // Random variation
            base += (Math.random() - 0.5) * 0.12;

            amps[i] = Math.max(0, Math.min(1, base));
        }

        phaseRef.current += 0.04;
        return amps;
    }, []);

    /**
     * Main render loop — draw spectrum bars, peaks, reflections, grid, and labels.
     */
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const dpr = window.devicePixelRatio || 1;
        const w = container.offsetWidth;
        const h = CANVAS_H;

        // Size the canvas for HiDPI
        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Background
        ctx.fillStyle = '#03010A';
        ctx.fillRect(0, 0, w, h);

        // Compute amplitudes
        const targetAmps = computeAmplitudes();
        const heights = heightsRef.current;
        const peaks = peaksRef.current;
        const peakHold = peakHoldRef.current;

        // Smoothing: fast attack, slow release
        for (let i = 0; i < N; i++) {
            const target = targetAmps[i];
            if (target > heights[i]) {
                heights[i] += (target - heights[i]) * 0.5; // fast attack
            } else {
                heights[i] += (target - heights[i]) * 0.07; // slow release
            }

            // Peak hold
            if (heights[i] > peaks[i]) {
                peaks[i] = heights[i];
                peakHold[i] = PEAK_HOLD_FRAMES;
            } else {
                if (peakHold[i] > 0) {
                    peakHold[i]--;
                } else {
                    peaks[i] = Math.max(0, peaks[i] - PEAK_DECAY);
                }
            }
        }

        // Layout constants
        const barWidth = (w / N) * 0.68;
        const gap = w / N;
        const baselineY = h * 0.72; // main bars live in top 72%
        const reflectionH = h * 0.35;

        // Draw bars + reflections
        for (let i = 0; i < N; i++) {
            const x = i * gap + (gap - barWidth) / 2;
            const barH = heights[i] * baselineY;

            if (barH < 1) continue;

            // Main bar — vertical gradient via per-pixel coloring (simplified: use top color)
            const segments = 8;
            const segH = barH / segments;
            for (let s = 0; s < segments; s++) {
                const t = s / segments; // 0=bottom, 1=top of bar
                ctx.fillStyle = getBarColor(t);
                const sy = baselineY - (s + 1) * segH;
                ctx.fillRect(x, sy, barWidth, segH + 0.5);
            }

            // Hot bar glow for high-amplitude bars
            if (heights[i] > 0.7) {
                ctx.save();
                ctx.shadowColor = heights[i] > 0.88 ? '#FF1100' : '#FF6600';
                ctx.shadowBlur = 8 + (heights[i] - 0.7) * 30;
                ctx.fillStyle = 'rgba(255,100,0,0.15)';
                ctx.fillRect(x, baselineY - barH, barWidth, barH);
                ctx.restore();
            }

            // Reflection below baseline
            const refGrad = ctx.createLinearGradient(0, baselineY, 0, baselineY + reflectionH);
            refGrad.addColorStop(0, `rgba(0, 255, 119, 0.12)`);
            refGrad.addColorStop(1, 'rgba(0, 255, 119, 0)');
            ctx.fillStyle = refGrad;
            const refH = Math.min(barH * 0.35, reflectionH);
            ctx.fillRect(x, baselineY, barWidth, refH);
        }

        // Peak hold dots
        for (let i = 0; i < N; i++) {
            if (peaks[i] < 0.02) continue;
            const x = i * gap + (gap - barWidth) / 2;
            const peakY = baselineY - peaks[i] * baselineY;
            const peakT = peaks[i]; // color = position
            ctx.fillStyle = getBarColor(peakT);

            // Glow for red-zone peaks
            if (peakT > 0.88) {
                ctx.save();
                ctx.shadowColor = '#FF1100';
                ctx.shadowBlur = 6;
                ctx.fillRect(x, peakY, barWidth, 2);
                ctx.restore();
            } else {
                ctx.fillRect(x, peakY, barWidth, 2);
            }
        }

        // dB grid lines
        const dbPositions = [0, 0.25, 0.5, 0.75]; // 0dB, -6dB, -12dB, -18dB
        for (let d = 0; d < dbPositions.length; d++) {
            const y = baselineY * dbPositions[d];
            ctx.strokeStyle = d === 0 ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();

            // Right-edge dB label
            ctx.fillStyle = 'rgba(255,255,255,0.22)';
            ctx.font = '8px monospace';
            ctx.textAlign = 'right';
            ctx.fillText(DB_LABELS[d], w - 4, y + 10);
        }

        // Bottom frequency labels
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.font = '7.5px monospace';
        ctx.textAlign = 'center';
        const labelY = h - 3;
        for (let f = 0; f < FREQ_LABELS.length; f++) {
            const x = (f / (FREQ_LABELS.length - 1)) * (w - 20) + 10;
            ctx.fillText(FREQ_LABELS[f], x, labelY);
        }

        animRef.current = requestAnimationFrame(draw);
    }, [computeAmplitudes]);

    // Set up animation loop and ResizeObserver
    useEffect(() => {
        animRef.current = requestAnimationFrame(draw);

        const container = containerRef.current;
        let observer: ResizeObserver | null = null;
        if (container) {
            observer = new ResizeObserver(() => {
                // Trigger redraw on resize — canvas will be resized in draw()
            });
            observer.observe(container);
        }

        return () => {
            if (animRef.current) cancelAnimationFrame(animRef.current);
            if (observer) observer.disconnect();
        };
    }, [draw]);

    return (
        <div className={className}>
            {/* Plugin header bar */}
            <div
                className="flex items-center justify-between px-3 py-1.5"
                style={{
                    background: '#080314',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px 8px 0 0',
                }}
            >
                <div className="flex items-center gap-2">
                    <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                            background: isPlaying ? '#00FF77' : '#333',
                            boxShadow: isPlaying ? '0 0 4px #00FF77, 0 0 8px #00FF77' : 'none',
                            transition: 'all 0.3s',
                        }}
                    />
                    <span
                        style={{
                            fontFamily: 'monospace',
                            fontSize: '8.5px',
                            color: '#555',
                            letterSpacing: '1.5px',
                            fontWeight: 600,
                        }}
                    >
                        SPECTRUM ANALYZER
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    {['FFT', 'LOG', 'PEAK'].map(label => (
                        <span
                            key={label}
                            style={{
                                fontFamily: 'monospace',
                                fontSize: '7.5px',
                                color: '#00CC66',
                                background: 'rgba(0,255,120,0.07)',
                                border: '1px solid rgba(0,255,120,0.18)',
                                borderRadius: '3px',
                                padding: '1px 5px',
                                letterSpacing: '0.5px',
                                fontWeight: 700,
                            }}
                        >
                            {label}
                        </span>
                    ))}
                </div>
            </div>

            {/* Canvas container */}
            <div
                ref={containerRef}
                style={{
                    background: '#03010A',
                    borderRadius: '0 0 8px 8px',
                    overflow: 'hidden',
                }}
            >
                <canvas
                    ref={canvasRef}
                    style={{ display: 'block', width: '100%', height: `${CANVAS_H}px` }}
                />
            </div>
        </div>
    );
}
