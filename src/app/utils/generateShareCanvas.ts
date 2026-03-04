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
  bg.addColorStop(0, '#1a0033');
  bg.addColorStop(0.42, '#0D001E');
  bg.addColorStop(1, '#05000F');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);


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
  strip.addColorStop(0, '#9D00FF');
  strip.addColorStop(0.5, '#FF0080');
  strip.addColorStop(1, '#9D00FF');
  ctx.fillStyle = strip;
  ctx.fillRect(0, 0, W, 3);

  // ── 5. Load logo ─────────────────────────────────────────────────────────────
  let clubLogoImg: HTMLImageElement | null = null;
  try {
    clubLogoImg = await loadImage('/Black%20And%20White%20Minimalist%20Professional%20%20Initial%20Logo%20(4).png');
  } catch (err) {
    console.warn('Could not load club logo', err);
  }

  // ── 6. Center logo ────────────────────────────────────────────────────────
  const VX = W / 2;
  const VY = 255;
  const imgDrawSize = 360;

  if (clubLogoImg) {
    ctx.drawImage(
      clubLogoImg,
      VX - imgDrawSize / 2,
      VY - imgDrawSize / 2,
      imgDrawSize,
      imgDrawSize
    );
  }

  // Station label centered under logo
  const logoBottom = VY + imgDrawSize / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 18px ${FONT}`;
  ctx.fillText('JERSEY CLUB RADIO', VX, logoBottom + 30);
  const liveTextGrad = ctx.createLinearGradient(VX - 80, 0, VX + 80, 0);
  liveTextGrad.addColorStop(0, '#9D00FF');
  liveTextGrad.addColorStop(1, '#FF0080');
  ctx.fillStyle = liveTextGrad;
  ctx.font = `700 14px ${FONT}`;
  ctx.fillText('24/7 LIVE RADIO', VX, logoBottom + 52);

  // ── 7. Metadata block ────────────────────────────────────────────────────────
  const ML = 40;
  const MW = W - ML * 2;
  const FOOTER_TOP = H - 50;

  const artistFontSize = 28;
  const artistY = FOOTER_TOP - 56;

  const titleFontSize = 30;
  const titleLineH = Math.round(titleFontSize * 1.3);
  const titleFontStr = `700 ${titleFontSize}px ${FONT}`;
  const titleLines = wrapText(ctx, displayTitle, MW, titleFontStr).slice(0, 2);
  const titleBlockH = titleLines.length * titleLineH;
  const titleBottom = artistY - 12;
  const titleTop = titleBottom - titleBlockH;

  const nowPlayingY = titleTop - 24;
  const dividerY = nowPlayingY - 24;

  // Divider
  const divG = ctx.createLinearGradient(ML, 0, W - ML, 0);
  divG.addColorStop(0, 'rgba(157,0,255,0)');
  divG.addColorStop(0.3, 'rgba(157,0,255,0.4)');
  divG.addColorStop(0.5, 'rgba(255,0,128,0.3)');
  divG.addColorStop(0.7, 'rgba(157,0,255,0.4)');
  divG.addColorStop(1, 'rgba(157,0,255,0)');
  ctx.fillStyle = divG;
  ctx.fillRect(ML, dividerY, MW, 1);

  // "NOW PLAYING" — centered
  ctx.fillStyle = '#9D00FF';
  ctx.font = `800 12px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('NOW PLAYING', VX, nowPlayingY + 12);

  // Track title lines — centered
  ctx.fillStyle = '#FFFFFF';
  ctx.font = titleFontStr;
  ctx.textBaseline = 'alphabetic';
  titleLines.forEach((line, i) => {
    ctx.fillText(line, VX, titleTop + i * titleLineH + titleFontSize);
  });

  // Artist — centered under title
  ctx.fillStyle = '#E0AAFF';
  ctx.font = `800 ${artistFontSize}px ${FONT}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(artist, VX, artistY + artistFontSize);



  // ── Return PNG blob ───────────────────────────────────────────────────────────
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      b => b ? resolve(b) : reject(new Error('canvas.toBlob returned null')),
      'image/png',
      1,
    );
  });
}