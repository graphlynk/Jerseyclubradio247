'use client'

/**
 * AnimatedSwirls — recreates the decorative oval flourishes from the
 * High Class Experience logo as CSS-animated SVG ellipses.
 *
 * Each ellipse rotates continuously at a unique speed and direction.
 * Negative animation-delay staggers the starting positions so the
 * composition looks varied from the first frame.
 */

// [rx, ry, animDuration(s), direction(+1 CW/-1 CCW), opacity, strokeWidth]
const SWIRLS = [
  // Large outer horizontal ovals — most prominent, slow rotation
  { rx: 43, ry: 25, dur: 18,  dir:  1, op: 0.24, sw: 1.10 },
  { rx: 39, ry: 21, dur: 22,  dir: -1, op: 0.16, sw: 0.85 },
  // Medium tilted ovals — mid-layer
  { rx: 35, ry: 23, dur: 26,  dir:  1, op: 0.17, sw: 0.90 },
  { rx: 31, ry: 19, dur: 30,  dir: -1, op: 0.12, sw: 0.65 },
  // Wide, very flat ovals — nearly horizontal bands
  { rx: 48, ry: 14, dur: 19,  dir:  1, op: 0.20, sw: 1.00 },
  { rx: 45, ry: 11, dur: 24,  dir: -1, op: 0.14, sw: 0.70 },
  // Tall, narrow ovals — vertical counterpoints
  { rx: 17, ry: 32, dur: 34,  dir: -1, op: 0.09, sw: 0.55 },
  { rx: 13, ry: 29, dur: 40,  dir:  1, op: 0.07, sw: 0.40 },
  // Small accent ovals — fast subtle motion
  { rx: 27, ry: 13, dur: 44,  dir:  1, op: 0.11, sw: 0.50 },
  { rx: 29, ry: 10, dur: 49,  dir: -1, op: 0.08, sw: 0.40 },
] as const

interface Props {
  className?: string
  color?: string
}

export default function AnimatedSwirls({
  className = '',
  color = '#D4AF37',
}: Props) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
      style={{ overflow: 'visible' }}
    >
      {SWIRLS.map((s, i) => (
        <ellipse
          key={i}
          cx="50"
          cy="50"
          rx={s.rx}
          ry={s.ry}
          fill="none"
          stroke={color}
          strokeWidth={s.sw}
          opacity={s.op}
          style={{
            transformBox: 'fill-box',
            transformOrigin: 'center',
            animationName: s.dir > 0 ? 'swirlCW' : 'swirlCCW',
            animationDuration: `${s.dur}s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            // Negative delay offsets each ellipse to a unique start position
            animationDelay: `-${(i * 3.1).toFixed(1)}s`,
          }}
        />
      ))}
    </svg>
  )
}
