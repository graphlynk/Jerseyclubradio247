import React, { forwardRef, useState, useEffect } from 'react';
import QRCodeLib from 'qrcode';

// ── Card dimensions (CSS px). Captured at ×2 → 1080×1920 ─────────────────────
export const CARD_W = 540;
export const CARD_H = 960;

// Pre-computed waveform bar heights (px within container) — 52 bars, natural audio curve
const WAVE_H = [
  20, 34, 50, 30, 64, 44, 74, 56, 28, 66, 42, 76, 36, 62, 46, 26,
  54, 70, 38, 78, 30, 62, 50, 68, 36, 50, 76, 40, 26, 64, 44, 58,
  28, 72, 48, 65, 34, 76, 44, 30, 62, 46, 74, 36, 56, 40, 68, 28,
  52, 38, 60, 24,
];

// ── Real QR code — generated once at module level, async ─────────────────────
const TARGET_URL = 'https://jerseyclubradio.com';

// Remove the old decorative QR_GRID and QRCode component entirely.
// Replace with a hook that generates a real scannable data URL.
function useQRCode(url: string) {
  const [dataUrl, setDataUrl] = useState<string>('');
  useEffect(() => {
    QRCodeLib.toDataURL(url, {
      width: 160,
      margin: 1,
      color: {
        dark: '#1a0033',   // dark purple modules — on-brand
        light: '#ffffff',  // white background — required for reliable scanning
      },
      errorCorrectionLevel: 'H', // highest correction so logo overlays work
    })
      .then(setDataUrl)
      .catch(console.error);
  }, [url]);
  return dataUrl;
}

// ── Groove rings inside vinyl ─────────────────────────────────────────────────
const GROOVE_SCALES = [0.86, 0.72, 0.58, 0.44, 0.32];

// ── Props ─────────────────────────────────────────────────────────────────────
export interface LiveShareCardProps {
  title: string;
  artist: string;
  listenerCount?: number;
}

// ═════════════════════════════════════════════════════════════════════════════
//  LiveShareCard — all inline styles so html-to-image captures it correctly
// ═════════════════════════════════════════════════════════════════════════════
export const LiveShareCard = forwardRef<HTMLDivElement, LiveShareCardProps>(
  ({ title, artist, listenerCount = 2847 }, ref) => {
    const displayTitle = title.toUpperCase();
    const formattedCount = listenerCount.toLocaleString();
    const qrDataUrl = useQRCode(TARGET_URL);

    return (
      <div
        ref={ref}
        style={{
          width: CARD_W,
          height: CARD_H,
          background: 'linear-gradient(180deg, #1a0033 0%, #0D001E 42%, #05000F 100%)',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >

        {/* ── Top accent strip ─────────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #9D00FF 0%, #FF0080 50%, #9D00FF 100%)',
        }} />

        {/* ── Watermark ────────────────────────────────────────────────────── */}
        <div style={{
          position: 'absolute',
          top: '32%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 96,
          fontWeight: 900,
          color: 'rgba(157,0,255,0.05)',
          whiteSpace: 'nowrap',
          letterSpacing: '0.06em',
          textAlign: 'center',
          lineHeight: 1.15,
          pointerEvents: 'none',
        }}>
          JERSEY<br />CLUB<br />RADIO
        </div>

        {/* ── Ambient glow blobs ───────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', top: '5%', left: '20%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(157,0,255,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '20%', right: '10%',
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,0,128,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* ── TOP BAR: LIVE badge + station name ───────────────────────────── */}
        <div style={{
          position: 'absolute', top: 28, left: 28, right: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* LIVE badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(40,0,0,0.75)',
            border: '1.5px solid rgba(220,50,50,0.55)',
            borderRadius: 40,
            padding: '7px 18px',
            backdropFilter: 'blur(4px)',
          }}>
            <div style={{
              width: 9, height: 9, borderRadius: '50%',
              background: '#FF3B3B',
              boxShadow: '0 0 8px #FF3B3B, 0 0 18px rgba(255,59,59,0.6)',
            }} />
            <span style={{
              color: '#FF7070', fontSize: 13, fontWeight: 800,
              letterSpacing: '0.18em',
            }}>LIVE</span>
          </div>

          {/* Station name */}
          <span style={{
            color: 'rgba(255,255,255,0.35)', fontSize: 11,
            fontWeight: 700, letterSpacing: '0.2em',
          }}>JERSEY CLUB RADIO</span>
        </div>

        {/* ── VINYL / RECORD ART ───────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', top: 88, left: '50%',
          transform: 'translateX(-50%)',
          width: 400, height: 400,
        }}>
          {/* Outer atmospheric glow — no CSS filter, use stacked radial gradients instead */}
          <div style={{
            position: 'absolute', inset: -40,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(157,0,255,0.32) 0%, rgba(157,0,255,0.14) 35%, rgba(157,0,255,0.05) 60%, transparent 80%)',
          }} />
          <div style={{
            position: 'absolute', inset: -20,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(157,0,255,0.18) 0%, rgba(120,0,220,0.08) 50%, transparent 75%)',
          }} />

          {/* Record body */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'radial-gradient(circle at 40% 35%, #240040 0%, #110020 28%, #060010 58%, #020008 85%, #010004 100%)',
            border: '2px solid rgba(157,0,255,0.3)',
            boxShadow: '0 0 70px rgba(157,0,255,0.3), inset 0 0 55px rgba(0,0,0,0.75)',
            overflow: 'hidden',
          }}>

            {/* Dense vinyl groove rings — 16 evenly spaced, alternating tone */}
            {Array.from({ length: 16 }).map((_, i) => {
              const scale = 0.94 - i * 0.034;
              if (scale < 0.38) return null;
              return (
                <div key={i} style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: `${scale * 100}%`, height: `${scale * 100}%`,
                  borderRadius: '50%',
                  border: `1px solid rgba(${i % 2 === 0 ? '160,30,255' : '200,80,255'},${0.07 + (i % 3) * 0.035})`,
                }} />
              );
            })}

            {/* Specular highlight — top-left arc (simulates light hitting vinyl) */}
            <div style={{
              position: 'absolute',
              top: '3%', left: '8%',
              width: '52%', height: '44%',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse at 38% 32%, rgba(255,255,255,0.10) 0%, rgba(180,80,255,0.04) 42%, transparent 68%)',
              transform: 'rotate(-12deg)',
              pointerEvents: 'none',
            }} />

            {/* Bottom-right counter-sheen */}
            <div style={{
              position: 'absolute',
              bottom: '5%', right: '7%',
              width: '38%', height: '28%',
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(157,0,255,0.07) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            {/* Center label disk — use calc() instead of transform to avoid html-to-image clip bug */}
            <div style={{
              position: 'absolute',
              top: 'calc(50% - 68px)',
              left: 'calc(50% - 68px)',
              width: 136, height: 136,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 38% 33%, #500090 0%, #2c0058 35%, #160030 65%, #0a0018 100%)',
              border: '1.5px solid rgba(192,132,252,0.5)',
              boxShadow: '0 0 24px rgba(157,0,255,0.6), inset 0 0 14px rgba(0,0,0,0.65)',
              overflow: 'hidden',
            }}>
              {/* Label inner shine */}
              <div style={{
                position: 'absolute', top: '6%', left: '12%',
                width: '52%', height: '44%',
                borderRadius: '50%',
                background: 'radial-gradient(ellipse at 40% 38%, rgba(255,255,255,0.11) 0%, rgba(10,0,24,0) 65%)',
                pointerEvents: 'none',
              }} />
              {/* Label text */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -54%)',
                textAlign: 'center', lineHeight: 1.2,
              }}>
                <div style={{
                  color: '#E0AAFF', fontSize: 15, fontWeight: 900,
                  letterSpacing: '0.14em',
                  textShadow: '0 0 10px rgba(224,170,255,0.9)',
                }}>JCR</div>
                <div style={{
                  color: 'rgba(192,132,252,0.55)', fontSize: 6,
                  fontWeight: 700, letterSpacing: '0.13em', marginTop: 2,
                }}>JERSEY CLUB</div>
              </div>
            </div>

            {/* Center spindle glow — overflow:hidden enforces circular clip in canvas */}
            <div style={{
              position: 'absolute',
              top: 'calc(50% - 36px)',
              left: 'calc(50% - 36px)',
              width: 72, height: 72,
              borderRadius: '50%',
              overflow: 'hidden',
              boxShadow: '0 0 30px rgba(200,0,255,0.9), 0 0 70px rgba(157,0,255,0.5)',
            }}>
              <div style={{
                width: '100%', height: '100%',
                background: 'radial-gradient(circle, #dd00ff 0%, #8800cc 45%, #3d0070 80%, #1a0030 100%)',
              }} />
            </div>

            {/* Center pin hole — calc() centering avoids transform+clip bug */}
            <div style={{
              position: 'absolute',
              top: 'calc(50% - 5.5px)',
              left: 'calc(50% - 5.5px)',
              width: 11, height: 11, borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 0 7px rgba(255,255,255,0.95)',
            }} />
          </div>

          {/* Outer rim highlight — inset glow to simulate edge catching light */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            boxShadow: 'inset 2px 3px 0 rgba(255,255,255,0.07), inset 0 0 0 1px rgba(157,0,255,0.12)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* ── METADATA BLOCK ──────────────────────────────────────────────── */}
        <div style={{
          position: 'absolute',
          bottom: 80, left: 0, right: 0,
          paddingLeft: 28, paddingRight: 28,
        }}>
          {/* Top divider */}
          <div style={{
            height: 1, marginBottom: 18,
            background: 'linear-gradient(90deg, transparent, rgba(157,0,255,0.4), rgba(255,0,128,0.3), rgba(157,0,255,0.4), transparent)',
          }} />

          {/* NOW PLAYING */}
          <div style={{
            color: '#9D00FF', fontSize: 12, fontWeight: 800,
            letterSpacing: '0.22em', marginBottom: 10,
            textShadow: '0 0 16px rgba(157,0,255,0.7)',
          }}>NOW PLAYING</div>

          {/* Track title */}
          <div style={{
            color: '#FFFFFF', fontSize: 44, fontWeight: 900,
            lineHeight: 1.05, letterSpacing: '-0.01em',
            marginBottom: 8,
            textShadow: '0 2px 30px rgba(255,255,255,0.08)',
            wordBreak: 'break-word',
          }}>
            {displayTitle}
          </div>

          {/* Artist */}
          <div style={{
            color: '#C084FC', fontSize: 20, fontWeight: 700,
            letterSpacing: '0.04em', marginBottom: 16,
            textShadow: '0 0 20px rgba(192,132,252,0.55)',
          }}>
            {artist}
          </div>

          {/* Thin rule */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: 16 }} />

          {/* DJ / Station row */}
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Avatar sphere */}
              <div style={{
                width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                background: 'radial-gradient(circle at 35% 30%, #d000ff 0%, #8800cc 40%, #2d0055 80%, #180030 100%)',
                boxShadow: '0 0 18px rgba(157,0,255,0.65), 0 0 40px rgba(157,0,255,0.25)',
                border: '2px solid rgba(157,0,255,0.45)',
              }} />
              <div>
                <div style={{ color: '#FFFFFF', fontSize: 15, fontWeight: 800, letterSpacing: '0.03em' }}>
                  JERSEY CLUB RADIO
                </div>
                <div style={{ color: 'rgba(255,255,255,0.42)', fontSize: 11, fontWeight: 500, marginTop: 2 }}>
                  24/7 LIVE STREAM
                </div>
              </div>
            </div>
            {/* Listener count */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#C084FC', fontSize: 14, fontWeight: 800 }}>{formattedCount}</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 500 }}>live</div>
            </div>
          </div>

          {/* ── Professional Waveform Visualizer ───────────────────────────── */}
          <div style={{
            position: 'relative',
            height: 88,
            marginBottom: 0,
            overflow: 'hidden',
          }}>
            {/* Top half — bars grow upward from center */}
            <div style={{
              position: 'absolute',
              bottom: '50%',
              left: 0, right: 0,
              display: 'flex',
              alignItems: 'flex-end',
              gap: 2,
              height: 44,
              paddingBottom: 2,
            }}>
              {WAVE_H.map((h, i) => {
                const pct = h / 78;
                const isHot = pct > 0.75;
                const isMid = pct > 0.45;
                return (
                  <div key={i} style={{
                    flex: 1,
                    height: Math.round(h * 0.51),
                    minWidth: 0,
                    borderRadius: '3px 3px 0 0',
                    background: isHot
                      ? 'linear-gradient(180deg, #FF0080 0%, #CC00FF 100%)'
                      : isMid
                      ? 'linear-gradient(180deg, #C000FF 0%, #7800CC 100%)'
                      : 'linear-gradient(180deg, #9D00FF 0%, #5500AA 100%)',
                    boxShadow: isHot
                      ? '0 0 8px rgba(255,0,128,0.75), 0 0 18px rgba(157,0,255,0.5)'
                      : '0 0 5px rgba(157,0,255,0.5)',
                  }} />
                );
              })}
            </div>

            {/* Center glow line */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: 0, right: 0,
              height: 2,
              transform: 'translateY(-50%)',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,0,128,0.5) 15%, rgba(157,0,255,0.95) 50%, rgba(255,0,128,0.5) 85%, transparent 100%)',
              boxShadow: '0 0 10px rgba(157,0,255,0.65), 0 0 22px rgba(157,0,255,0.3)',
            }} />

            {/* Bottom half — mirror reflection, dimmer & shorter */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: 0, right: 0,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              height: 44,
              paddingTop: 2,
            }}>
              {WAVE_H.map((h, i) => {
                const pct = h / 78;
                const isHot = pct > 0.75;
                const isMid = pct > 0.45;
                return (
                  <div key={`b${i}`} style={{
                    flex: 1,
                    height: Math.round(h * 0.31),
                    minWidth: 0,
                    borderRadius: '0 0 3px 3px',
                    background: isHot
                      ? 'linear-gradient(180deg, rgba(255,0,128,0.55) 0%, rgba(157,0,255,0.06) 100%)'
                      : isMid
                      ? 'linear-gradient(180deg, rgba(157,0,255,0.42) 0%, rgba(100,0,200,0.05) 100%)'
                      : 'linear-gradient(180deg, rgba(120,0,200,0.32) 0%, rgba(80,0,150,0.04) 100%)',
                  }} />
                );
              })}
            </div>
          </div>
        </div>

        {/* ── FOOTER ────────────────────────────────────────────────────────── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 72,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingLeft: 28, paddingRight: 28,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div>
            <div style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 900, letterSpacing: '0.06em' }}>
              JERSEY CLUB
            </div>
            <div style={{ color: 'rgba(255,255,255,0.32)', fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', marginTop: 2 }}>
              RADIO · 24/7
            </div>
          </div>

          {/* Real scannable QR code in a white rounded container */}
          {qrDataUrl ? (
            <div style={{
              background: '#ffffff',
              borderRadius: 8,
              padding: 4,
              width: 60,
              height: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(157,0,255,0.35)',
            }}>
              <img
                src={qrDataUrl}
                alt="Scan to visit jerseyclubradio.com"
                style={{ width: 52, height: 52, display: 'block' }}
              />
            </div>
          ) : (
            /* Placeholder while generating */
            <div style={{
              width: 60, height: 60, borderRadius: 8,
              background: 'rgba(157,0,255,0.12)',
              border: '1px solid rgba(157,0,255,0.25)',
            }} />
          )}
        </div>

      </div>
    );
  },
);

LiveShareCard.displayName = 'LiveShareCard';