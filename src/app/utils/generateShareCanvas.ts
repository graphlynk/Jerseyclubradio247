/**
 * generateShareCanvas.ts
 *
 * Draws the Jersey Club Radio share card entirely with Canvas 2D API.
 * This bypasses html-to-image completely, eliminating all mobile WebKit
 * border-radius / overflow:hidden rendering bugs.
 */
import QRCodeLib from 'qrcode';

export const CARD_W = 540;
export const CARD_H = 960;

const WAVE_H = [
  20, 34, 50, 30, 64, 44, 74, 56, 28, 66, 42, 76, 36, 62, 46, 26,
  54, 70, 38, 78, 30, 62, 50, 68, 36, 50, 76, 40, 26, 64, 44, 58,
  28, 72, 48, 65, 34, 76, 44, 30, 62, 46, 74, 36, 56, 40, 68, 28,
  52, 38, 60, 24,
];

const TARGET_URL = 'https://jerseyclubradio.com';
const FONT = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Rounded-rect path (equal radius on all four corners). */
function rrPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/** Wrap text to fit within maxWidth, return array of lines. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontStr: string,
): string[] {
  ctx.font = fontStr;
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateShareCanvas(
  title: string,
  artist: string,
): Promise<Blob> {
  const DPR = 2;
  const W = CARD_W;
  const H = CARD_H;

  const canvas = document.createElement('canvas');
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(DPR, DPR);

  const displayTitle = title.toUpperCase();

  // Pre-generate QR code
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCodeLib.toDataURL(TARGET_URL, {
      width: 160, margin: 1,
      color: { dark: '#1a0033', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    });
  } catch { /* skip QR if it fails */ }

  // ── 1. Background ────────────────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,    '#1a0033');
  bg.addColorStop(0.42, '#0D001E');
  bg.addColorStop(1,    '#05000F');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── 2. Watermark text ────────────────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#9D00FF';
  ctx.font = `900 80px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('JERSEY', W / 2, H * 0.28);
  ctx.fillText('CLUB',   W / 2, H * 0.28 + 88);
  ctx.fillText('RADIO',  W / 2, H * 0.28 + 176);
  ctx.restore();

  // ── 3. Ambient glow blobs ────────────────────────────────────────────────────
  const a1 = ctx.createRadialGradient(W * 0.5, 140, 0, W * 0.5, 140, 230);
  a1.addColorStop(0, 'rgba(157,0,255,0.18)');
  a1.addColorStop(1, 'rgba(157,0,255,0)');
  ctx.fillStyle = a1;
  ctx.fillRect(0, 0, W, H * 0.4);

  const a2 = ctx.createRadialGradient(W * 0.85, 240, 0, W * 0.85, 240, 140);
  a2.addColorStop(0, 'rgba(255,0,128,0.10)');
  a2.addColorStop(1, 'rgba(255,0,128,0)');
  ctx.fillStyle = a2;
  ctx.fillRect(W * 0.5, 0, W * 0.5, H * 0.5);

  // ── 4. Top accent strip ──────────────────────────────────────────────────────
  const strip = ctx.createLinearGradient(0, 0, W, 0);
  strip.addColorStop(0,   '#9D00FF');
  strip.addColorStop(0.5, '#FF0080');
  strip.addColorStop(1,   '#9D00FF');
  ctx.fillStyle = strip;
  ctx.fillRect(0, 0, W, 3);

  // ── 5. LIVE badge ────────────────────────────────────────────────────────────
  ctx.save();
  rrPath(ctx, 28, 28, 90, 34, 17);
  ctx.fillStyle = 'rgba(40,0,0,0.75)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,50,50,0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Red dot glow
  const dotX = 48, dotY = 45;
  const dg = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, 11);
  dg.addColorStop(0, 'rgba(255,59,59,0.9)');
  dg.addColorStop(1, 'rgba(255,59,59,0)');
  ctx.fillStyle = dg;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 11, 0, Math.PI * 2);
  ctx.fill();
  // Solid dot core
  ctx.fillStyle = '#FF3B3B';
  ctx.beginPath();
  ctx.arc(dotX, dotY, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FF7070';
  ctx.font = `800 13px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('LIVE', 64, 50);

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = `700 11px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText('JERSEY CLUB RADIO', W - 28, 50);

  // ── 6. Vinyl record ──────────────────────────────────────────────────────────
  const VX = W / 2;   // 270
  const VY = 288;     // 88 + 200
  const VR = 200;

  // Outer atmospheric glow (pure radial gradient — no CSS filter needed)
  const og = ctx.createRadialGradient(VX, VY, 0, VX, VY, VR + 65);
  og.addColorStop(0,    'rgba(157,0,255,0.30)');
  og.addColorStop(0.35, 'rgba(157,0,255,0.12)');
  og.addColorStop(0.65, 'rgba(157,0,255,0.04)');
  og.addColorStop(1,    'rgba(157,0,255,0)');
  ctx.fillStyle = og;
  ctx.fillRect(VX - VR - 65, VY - VR - 65, (VR + 65) * 2, (VR + 65) * 2);

  // Record body — arc clip, then fill gradient inside
  ctx.save();
  ctx.beginPath();
  ctx.arc(VX, VY, VR, 0, Math.PI * 2);
  ctx.clip();

  const rbg = ctx.createRadialGradient(VX - 80, VY - 70, 0, VX, VY, VR);
  rbg.addColorStop(0,    '#240040');
  rbg.addColorStop(0.28, '#110020');
  rbg.addColorStop(0.58, '#060010');
  rbg.addColorStop(0.85, '#020008');
  rbg.addColorStop(1,    '#010004');
  ctx.fillStyle = rbg;
  ctx.fillRect(VX - VR, VY - VR, VR * 2, VR * 2);

  // Groove rings
  for (let i = 0; i < 16; i++) {
    const scale = 0.94 - i * 0.034;
    if (scale < 0.38) break;
    const alpha = 0.07 + (i % 3) * 0.035;
    ctx.strokeStyle = i % 2 === 0
      ? `rgba(160,30,255,${alpha})`
      : `rgba(200,80,255,${alpha})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(VX, VY, VR * scale, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Specular highlight
  const sp = ctx.createRadialGradient(VX - 75, VY - 80, 0, VX - 45, VY - 55, 130);
  sp.addColorStop(0,    'rgba(255,255,255,0.10)');
  sp.addColorStop(0.42, 'rgba(180,80,255,0.04)');
  sp.addColorStop(1,    'rgba(180,80,255,0)');
  ctx.fillStyle = sp;
  ctx.fillRect(VX - VR, VY - VR, VR, VR * 0.88);

  ctx.restore(); // end record body clip

  // Record border ring
  ctx.strokeStyle = 'rgba(157,0,255,0.30)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(VX, VY, VR, 0, Math.PI * 2);
  ctx.stroke();

  // Center label disk (r = 68) — arc clip
  const LR = 68;
  ctx.save();
  ctx.beginPath();
  ctx.arc(VX, VY, LR, 0, Math.PI * 2);
  ctx.clip();

  const lg = ctx.createRadialGradient(VX - 26, VY - 23, 0, VX, VY, LR);
  lg.addColorStop(0,    '#500090');
  lg.addColorStop(0.35, '#2c0058');
  lg.addColorStop(0.65, '#160030');
  lg.addColorStop(1,    '#0a0018');
  ctx.fillStyle = lg;
  ctx.fillRect(VX - LR, VY - LR, LR * 2, LR * 2);

  // Label inner shine
  const ls = ctx.createRadialGradient(VX - 27, VY - 26, 0, VX - 14, VY - 14, 55);
  ls.addColorStop(0, 'rgba(255,255,255,0.11)');
  ls.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = ls;
  ctx.fillRect(VX - LR, VY - LR, LR * 2, LR * 2);

  ctx.restore(); // end label clip

  // Label border
  ctx.strokeStyle = 'rgba(192,132,252,0.50)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(VX, VY, LR, 0, Math.PI * 2);
  ctx.stroke();

  // Label "JCR" text
  ctx.fillStyle = '#E0AAFF';
  ctx.font = `900 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('JCR', VX, VY - 4);

  ctx.fillStyle = 'rgba(192,132,252,0.55)';
  ctx.font = `700 6px ${FONT}`;
  ctx.textBaseline = 'middle';
  ctx.fillText('JERSEY CLUB', VX, VY + 10);

  // Spindle glow (r = 36) — radial gradient arc fill, no DOM clipping needed
  const sg = ctx.createRadialGradient(VX, VY, 0, VX, VY, 36);
  sg.addColorStop(0,    '#dd00ff');
  sg.addColorStop(0.45, '#8800cc');
  sg.addColorStop(0.80, '#3d0070');
  sg.addColorStop(1,    '#1a0030');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(VX, VY, 36, 0, Math.PI * 2);
  ctx.fill();

  // Spindle outer bloom
  const sob = ctx.createRadialGradient(VX, VY, 18, VX, VY, 72);
  sob.addColorStop(0, 'rgba(200,0,255,0.50)');
  sob.addColorStop(1, 'rgba(157,0,255,0)');
  ctx.fillStyle = sob;
  ctx.beginPath();
  ctx.arc(VX, VY, 72, 0, Math.PI * 2);
  ctx.fill();

  // Center pin hole
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(VX, VY, 5.5, 0, Math.PI * 2);
  ctx.fill();

  // ── 7. Metadata block ────────────────────────────────────────────────────────
  const ML = 28;
  const MW = W - ML * 2;
  const FOOTER_TOP = H - 72;

  // Layout: work upward from the footer
  const waveBottom = FOOTER_TOP - 16;
  const waveH      = 88;
  const waveTop    = waveBottom - waveH;
  const waveCY     = waveTop + waveH / 2;

  const djBottom = waveTop - 18;
  const djTop    = djBottom - 46;

  const thinRuleY = djTop - 16;

  const artistFontSize = 20;
  const artistY = thinRuleY - 16 - artistFontSize;

  const titleFontSize = 40;
  const titleLineH    = Math.round(titleFontSize * 1.08);
  const titleFontStr  = `900 ${titleFontSize}px ${FONT}`;
  const titleLines    = wrapText(ctx, displayTitle, MW, titleFontStr).slice(0, 2);
  const titleBlockH   = titleLines.length * titleLineH;
  const titleBottom   = artistY - 8;
  const titleTop      = titleBottom - titleBlockH;

  const nowPlayingY = titleTop - 12 - 12;
  const dividerY    = nowPlayingY - 18;

  // Top divider
  const divG = ctx.createLinearGradient(ML, 0, W - ML, 0);
  divG.addColorStop(0,   'rgba(157,0,255,0)');
  divG.addColorStop(0.3, 'rgba(157,0,255,0.4)');
  divG.addColorStop(0.5, 'rgba(255,0,128,0.3)');
  divG.addColorStop(0.7, 'rgba(157,0,255,0.4)');
  divG.addColorStop(1,   'rgba(157,0,255,0)');
  ctx.fillStyle = divG;
  ctx.fillRect(ML, dividerY, MW, 1);

  // "NOW PLAYING"
  ctx.fillStyle = '#9D00FF';
  ctx.font = `800 12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('NOW PLAYING', ML, nowPlayingY + 12);

  // Track title lines
  ctx.fillStyle = '#FFFFFF';
  ctx.font = titleFontStr;
  ctx.textBaseline = 'alphabetic';
  titleLines.forEach((line, i) => {
    ctx.fillText(line, ML, titleTop + i * titleLineH + titleFontSize);
  });

  // Artist
  ctx.fillStyle = '#C084FC';
  ctx.font = `700 ${artistFontSize}px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(artist, ML, artistY + artistFontSize);

  // Thin rule
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(ML, thinRuleY, MW, 1);

  // Avatar sphere
  const avX = ML + 23, avY = djTop + 23, avR = 23;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2);
  ctx.clip();
  const avG = ctx.createRadialGradient(avX - 8, avY - 8, 0, avX, avY, avR);
  avG.addColorStop(0,   '#d000ff');
  avG.addColorStop(0.4, '#8800cc');
  avG.addColorStop(0.8, '#2d0055');
  avG.addColorStop(1,   '#180030');
  ctx.fillStyle = avG;
  ctx.fillRect(avX - avR, avY - avR, avR * 2, avR * 2);
  ctx.restore();

  ctx.strokeStyle = 'rgba(157,0,255,0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2);
  ctx.stroke();

  // Station label
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 15px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('JERSEY CLUB RADIO', ML + 56, djTop + 20);
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.font = `500 11px ${FONT}`;
  ctx.fillText('24/7 LIVE STREAM', ML + 56, djTop + 37);

  // ── 8. Waveform ──────────────────────────────────────────────────────────────
  const waveCount = WAVE_H.length;
  const waveGap   = 2;
  const barW      = (MW - (waveCount - 1) * waveGap) / waveCount;

  WAVE_H.forEach((h, i) => {
    const pct   = h / 78;
    const isHot = pct > 0.75;
    const isMid = pct > 0.45;
    const bx    = ML + i * (barW + waveGap);
    const topH  = Math.round(h * 0.51);
    const botH  = Math.round(h * 0.31);

    // Top bar
    let tg: CanvasGradient;
    if (isHot) {
      tg = ctx.createLinearGradient(0, waveCY, 0, waveCY - topH);
      tg.addColorStop(0, '#CC00FF'); tg.addColorStop(1, '#FF0080');
    } else if (isMid) {
      tg = ctx.createLinearGradient(0, waveCY, 0, waveCY - topH);
      tg.addColorStop(0, '#7800CC'); tg.addColorStop(1, '#C000FF');
    } else {
      tg = ctx.createLinearGradient(0, waveCY, 0, waveCY - topH);
      tg.addColorStop(0, '#5500AA'); tg.addColorStop(1, '#9D00FF');
    }
    ctx.fillStyle = tg;
    ctx.fillRect(bx, waveCY - topH, barW, topH);

    // Mirror bar below
    let bg2: CanvasGradient;
    if (isHot) {
      bg2 = ctx.createLinearGradient(0, waveCY, 0, waveCY + botH);
      bg2.addColorStop(0, 'rgba(255,0,128,0.55)'); bg2.addColorStop(1, 'rgba(157,0,255,0.06)');
    } else if (isMid) {
      bg2 = ctx.createLinearGradient(0, waveCY, 0, waveCY + botH);
      bg2.addColorStop(0, 'rgba(157,0,255,0.42)'); bg2.addColorStop(1, 'rgba(100,0,200,0.05)');
    } else {
      bg2 = ctx.createLinearGradient(0, waveCY, 0, waveCY + botH);
      bg2.addColorStop(0, 'rgba(120,0,200,0.32)'); bg2.addColorStop(1, 'rgba(80,0,150,0.04)');
    }
    ctx.fillStyle = bg2;
    ctx.fillRect(bx, waveCY, barW, botH);
  });

  // Center glow line
  const wlg = ctx.createLinearGradient(ML, 0, W - ML, 0);
  wlg.addColorStop(0,    'rgba(255,0,128,0)');
  wlg.addColorStop(0.15, 'rgba(255,0,128,0.5)');
  wlg.addColorStop(0.5,  'rgba(157,0,255,0.95)');
  wlg.addColorStop(0.85, 'rgba(255,0,128,0.5)');
  wlg.addColorStop(1,    'rgba(255,0,128,0)');
  ctx.fillStyle = wlg;
  ctx.fillRect(ML, waveCY - 1, MW, 2);

  // ── 9. Footer ────────────────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, FOOTER_TOP);
  ctx.lineTo(W, FOOTER_TOP);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 16px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('JERSEY CLUB', ML, FOOTER_TOP + 30);

  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.font = `600 10px ${FONT}`;
  ctx.fillText('RADIO · 24/7', ML, FOOTER_TOP + 47);

  // QR code
  if (qrDataUrl) {
    try {
      const qrImg = await loadImage(qrDataUrl);
      const qrX = W - 28 - 60 - 12;   // shifted left
      const qrY = FOOTER_TOP - 8;      // shifted up
      // White container
      ctx.fillStyle = '#ffffff';
      rrPath(ctx, qrX, qrY, 60, 60, 8);
      ctx.fill();
      ctx.drawImage(qrImg, qrX + 4, qrY + 4, 52, 52);
    } catch { /* skip */ }
  }

  // ── Return PNG blob ───────────────────────────────────────────────────────────
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      b => b ? resolve(b) : reject(new Error('canvas.toBlob returned null')),
      'image/png',
      1,
    );
  });
}