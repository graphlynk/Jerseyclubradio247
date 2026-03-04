import React, { useRef, useEffect } from 'react';

// ─── Perlin Noise ──────────────────────────────────────────────────────────────
class PerlinNoise {
    private perm: number[];

    constructor(seed = 0) {
        const p: number[] = [];
        for (let i = 0; i < 256; i++) p[i] = i;
        // Fisher-Yates with seed
        let s = seed;
        for (let i = 255; i > 0; i--) {
            s = (s * 16807 + 0) % 2147483647;
            const j = s % (i + 1);
            [p[i], p[j]] = [p[j], p[i]];
        }
        this.perm = [...p, ...p];
    }

    private fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
    private lerp(a: number, b: number, t: number) { return a + t * (b - a); }
    private grad(hash: number, x: number, y: number) {
        const h = hash & 3;
        const u = h < 2 ? x : y;
        const v = h < 2 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    noise2d(x: number, y: number): number {
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);
        const u = this.fade(xf);
        const v = this.fade(yf);
        const aa = this.perm[this.perm[X] + Y];
        const ab = this.perm[this.perm[X] + Y + 1];
        const ba = this.perm[this.perm[X + 1] + Y];
        const bb = this.perm[this.perm[X + 1] + Y + 1];
        return this.lerp(
            this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u),
            this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u),
            v
        );
    }

    fbm(x: number, y: number, octaves = 3): number {
        let val = 0, amp = 1, freq = 1, max = 0;
        for (let i = 0; i < octaves; i++) {
            val += this.noise2d(x * freq, y * freq) * amp;
            max += amp;
            amp *= 0.5;
            freq *= 2;
        }
        return val / max;
    }
}

// ─── Tier configuration ────────────────────────────────────────────────────────
interface TierConfig {
    intensity: number;
    numColor: string;
    textShadow: string;
    // Color stops: [r, g, b] at life fraction thresholds
    flameColors: [number, number, number][];
    flameThresholds: number[];
}

const TIERS: Record<1 | 2 | 3, TierConfig> = {
    1: {
        intensity: 1.0,
        numColor: '#ff1a1a',
        textShadow: '0 0 6px rgba(255,60,20,0.5), 0 0 14px rgba(255,30,0,0.2)',
        // Gold fire: warm yellow → deep amber → orange → red-orange → dark red
        flameColors: [
            [255, 230, 80],   // 0.0 — bright yellow
            [255, 180, 30],   // 0.25 — amber
            [255, 120, 10],   // 0.50 — orange
            [220, 60, 5],     // 0.75 — red-orange
            [120, 20, 0],     // 1.0  — dark red
        ],
        flameThresholds: [0, 0.25, 0.5, 0.75, 1.0],
    },
    2: {
        intensity: 0.65,
        numColor: '#c8c8e0',
        textShadow: '0 0 5px rgba(160,180,255,0.4), 0 0 12px rgba(100,120,220,0.15)',
        // Silver fire: white-blue → blue-violet → deep blue
        flameColors: [
            [220, 230, 255],  // 0.0 — white-blue
            [160, 180, 255],  // 0.3 — lavender-blue
            [100, 110, 220],  // 0.6 — blue-violet
            [50, 50, 160],    // 0.85 — deep blue
            [20, 20, 80],     // 1.0  — fade
        ],
        flameThresholds: [0, 0.3, 0.6, 0.85, 1.0],
    },
    3: {
        intensity: 0.4,
        numColor: '#c8935a',
        textShadow: '0 0 4px rgba(200,150,80,0.35), 0 0 10px rgba(160,100,40,0.12)',
        // Bronze fire: warm cream → copper → dark brown
        flameColors: [
            [255, 225, 180],  // 0.0 — warm cream
            [220, 170, 100],  // 0.3 — light copper
            [180, 110, 50],   // 0.6 — copper
            [120, 60, 20],    // 0.85 — dark brown
            [50, 20, 5],      // 1.0  — fade
        ],
        flameThresholds: [0, 0.3, 0.6, 0.85, 1.0],
    },
};

function lerpColor(
    colors: [number, number, number][],
    thresholds: number[],
    t: number
): [number, number, number] {
    const tc = Math.max(0, Math.min(1, t));
    let idx = 0;
    for (let i = 0; i < thresholds.length - 1; i++) {
        if (tc >= thresholds[i]) idx = i;
    }
    const next = Math.min(idx + 1, thresholds.length - 1);
    const range = thresholds[next] - thresholds[idx] || 1;
    const frac = (tc - thresholds[idx]) / range;
    return [
        colors[idx][0] + (colors[next][0] - colors[idx][0]) * frac,
        colors[idx][1] + (colors[next][1] - colors[idx][1]) * frac,
        colors[idx][2] + (colors[next][2] - colors[idx][2]) * frac,
    ];
}

// ─── Particle types ────────────────────────────────────────────────────────────
interface Particle {
    x: number; y: number;
    vx: number; vy: number;
    life: number; maxLife: number;
    size: number; maxSize: number;
    seed: number;
    isEmber: boolean;
}

// ─── Shape detection: find edge pixels of the rendered number ──────────────────
function getShapePoints(
    char: string,
    w: number,
    h: number,
    font: string,
    dpr: number
): { edges: [number, number][]; surface: [number, number][] } {
    const oc = document.createElement('canvas');
    oc.width = w * dpr;
    oc.height = h * dpr;
    const ctx = oc.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(char, w / 2, h / 2);

    const imgData = ctx.getImageData(0, 0, oc.width, oc.height);
    const d = imgData.data;
    const sw = oc.width;
    const sh = oc.height;

    const isFilled = (px: number, py: number) => {
        if (px < 0 || py < 0 || px >= sw || py >= sh) return false;
        return d[(py * sw + px) * 4 + 3] > 80;
    };

    const edges: [number, number][] = [];
    const surface: [number, number][] = [];
    const step = Math.max(1, Math.round(dpr));

    for (let y = 0; y < sh; y += step) {
        for (let x = 0; x < sw; x += step) {
            if (!isFilled(x, y)) continue;
            const cx = x / dpr;
            const cy = y / dpr;
            // Check if edge pixel
            const isEdge =
                !isFilled(x - step, y) || !isFilled(x + step, y) ||
                !isFilled(x, y - step) || !isFilled(x, y + step);
            if (isEdge) {
                edges.push([cx, cy]);
            } else {
                surface.push([cx, cy]);
            }
        }
    }
    return { edges, surface };
}

// ─── Canvas dimensions ─────────────────────────────────────────────────────────
const CW = 50;   // canvas logical width
const CH = 60;    // canvas logical height
const NUM_FONT = 'bold 32px "Bebas Neue", "Arial Black", sans-serif';

// ─── Component ─────────────────────────────────────────────────────────────────
export function FireRankNumber({ rank }: { rank: 1 | 2 | 3 }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const tier = TIERS[rank];
        const dpr = window.devicePixelRatio || 1;
        canvas.width = CW * dpr;
        canvas.height = CH * dpr;
        const ctx = canvas.getContext('2d')!;
        ctx.scale(dpr, dpr);

        const perlin = new PerlinNoise(rank * 1337);
        let particles: Particle[] = [];
        let edges: [number, number][] = [];
        let surface: [number, number][] = [];
        let lastTime = performance.now();
        let running = true;

        // Particle counts scaled by intensity
        const maxFlame = Math.round(55 * tier.intensity);
        const maxEmber = Math.round(14 * tier.intensity);
        const spawnRate = 2.5 * tier.intensity; // particles per frame

        function spawnParticle() {
            // 70% edge, 30% surface
            const useEdge = Math.random() < 0.7 || surface.length === 0;
            const pool = useEdge ? edges : surface;
            if (pool.length === 0) return null;
            const [sx, sy] = pool[Math.floor(Math.random() * pool.length)];

            const isEmber = Math.random() < 0.2;
            const life = isEmber
                ? 0.4 + Math.random() * 0.3       // embers: 0.4–0.7s
                : 1.0 + Math.random() * 1.5;      // flames: 1.0–2.5s

            const baseVy = isEmber
                ? -(0.3 + Math.random() * 0.4)    // embers rise faster
                : -(0.1 + Math.random() * 0.25 * tier.intensity); // flames slow

            const size = isEmber
                ? 1.0 + Math.random() * 1.5
                : 3.0 + Math.random() * 4.0 * tier.intensity;

            return {
                x: sx,
                y: sy,
                vx: (Math.random() - 0.5) * 0.3,
                vy: baseVy,
                life,
                maxLife: life,
                size,
                maxSize: size,
                seed: Math.random() * 1000,
                isEmber,
            } as Particle;
        }

        function update(dt: number) {
            // Cap dt to avoid explosion on tab refocus
            const cdt = Math.min(dt, 0.033);

            // Spawn
            const flameCount = particles.filter(p => !p.isEmber).length;
            const emberCount = particles.filter(p => p.isEmber).length;
            const toSpawn = Math.floor(spawnRate + Math.random());

            for (let i = 0; i < toSpawn; i++) {
                const p = spawnParticle();
                if (!p) continue;
                if (p.isEmber && emberCount >= maxEmber) continue;
                if (!p.isEmber && flameCount >= maxFlame) continue;
                particles.push(p);
            }

            // Update
            for (const p of particles) {
                p.life -= cdt;
                const lf = 1 - (p.life / p.maxLife); // 0..1 life fraction

                // Noise-based horizontal turbulence — increases as particle rises
                const turbulence = 0.3 + lf * 0.8;
                const noiseVal = perlin.fbm(
                    p.x * 0.06 + p.seed,
                    p.y * 0.06 + performance.now() * 0.0005,
                    3
                );
                p.vx = noiseVal * turbulence * 1.5;

                // Gentle upward acceleration
                p.vy -= 0.005 * cdt * 60;

                p.x += p.vx * cdt * 60;
                p.y += p.vy * cdt * 60;

                // Size: swell at birth, hold, then taper
                if (lf < 0.15) {
                    p.size = p.maxSize * (0.5 + lf / 0.15 * 0.5);
                } else if (lf > 0.7) {
                    p.size = p.maxSize * (1 - (lf - 0.7) / 0.3) * 0.8;
                } else {
                    p.size = p.maxSize;
                }
            }

            // Remove dead
            particles = particles.filter(p => p.life > 0);
        }

        function draw() {
            ctx.clearRect(0, 0, CW, CH);
            ctx.globalCompositeOperation = 'lighter';

            for (const p of particles) {
                const lf = 1 - (p.life / p.maxLife);

                // Alpha: fade in quickly, hold, slow fade out + noise flicker
                let alpha: number;
                if (lf < 0.08) {
                    alpha = lf / 0.08;
                } else if (lf < 0.38) {
                    alpha = 1;
                } else {
                    alpha = 1 - ((lf - 0.38) / 0.62);
                }
                // Perlin flicker
                const flicker = 0.85 + 0.15 * perlin.noise2d(p.seed + lf * 5, performance.now() * 0.003);
                alpha *= flicker;
                alpha = Math.max(0, Math.min(1, alpha));

                // Color from tier palette based on life fraction
                const [cr, cg, cb] = lerpColor(tier.flameColors, tier.flameThresholds, lf);

                if (p.isEmber) {
                    // Ember: tiny bright dot
                    const r = Math.max(0.5, p.size * 0.5);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},${(alpha * 0.9).toFixed(3)})`;
                    ctx.fill();
                    // Bright white center
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, r * 0.4, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255,255,255,${(alpha * 0.7).toFixed(3)})`;
                    ctx.fill();
                } else {
                    // Flame: soft radial gradient circle
                    const r = Math.max(1, p.size);
                    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
                    const a1 = alpha;
                    const a2 = alpha * 0.65;
                    const a3 = alpha * 0.2;
                    grad.addColorStop(0, `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},${a1.toFixed(3)})`);
                    grad.addColorStop(0.2, `rgba(${Math.round(cr)},${Math.round(cg)},${Math.round(cb)},${a2.toFixed(3)})`);
                    grad.addColorStop(0.5, `rgba(${Math.round(cr * 0.8)},${Math.round(cg * 0.6)},${Math.round(cb * 0.4)},${a3.toFixed(3)})`);
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                    ctx.fillStyle = grad;
                    ctx.fill();
                }
            }

            ctx.globalCompositeOperation = 'source-over';
        }

        function loop(now: number) {
            if (!running) return;
            const dt = (now - lastTime) / 1000;
            lastTime = now;
            update(dt);
            draw();
            rafRef.current = requestAnimationFrame(loop);
        }

        // Wait for fonts then initialize shape detection
        document.fonts.ready.then(() => {
            const shape = getShapePoints(String(rank), CW, CH, NUM_FONT, dpr);
            edges = shape.edges;
            surface = shape.surface;
            // Fallback: if detection found nothing, seed with center points
            if (edges.length === 0 && surface.length === 0) {
                edges = [[CW / 2, CH / 2]];
            }
            lastTime = performance.now();
            rafRef.current = requestAnimationFrame(loop);
        });

        return () => {
            running = false;
            cancelAnimationFrame(rafRef.current);
        };
    }, [rank]);

    const tier = TIERS[rank];

    return (
        <div
            style={{
                position: 'relative',
                width: CW,
                height: CH,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {/* Fire canvas — behind the number */}
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: CW,
                    height: CH,
                    zIndex: 1,
                    pointerEvents: 'none',
                }}
            />
            {/* The rank number — above the fire */}
            <span
                style={{
                    position: 'relative',
                    zIndex: 2,
                    fontFamily: '"Bebas Neue", "Arial Black", sans-serif',
                    fontSize: 32,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: tier.numColor,
                    textShadow: tier.textShadow,
                    userSelect: 'none',
                }}
            >
                {rank}
            </span>
        </div>
    );
}
