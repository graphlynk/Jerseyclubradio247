/**
 * Browser Fingerprinting — Persistent Guest ID with NO login required.
 *
 * Combines: userAgent, screen metrics, timezone, language, hardware
 * concurrency, device memory, and a canvas paint fingerprint.
 * The result is hashed with FNV-1a to produce a short, stable hex ID.
 *
 * NOT 100% collision-proof by design — this is privacy-respecting.
 * Same device + browser = same ID across refreshes and sessions.
 * Clearing browser data does NOT affect this (canvas/UA based, not cookie/storage).
 * BUT localStorage is still used as a fast cache to avoid re-computation.
 */

const FP_CACHE_KEY = 'jc_fp_v2';

async function computeFingerprint(): Promise<string> {
  const parts: string[] = [];

  // ── Hardware & platform signals
  parts.push(navigator.userAgent.slice(0, 100));
  parts.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
  parts.push(String(window.devicePixelRatio || 1));
  parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  parts.push(navigator.language || 'en');
  parts.push(String((navigator as any).hardwareConcurrency || 0));
  parts.push(String((navigator as any).deviceMemory || 0));
  parts.push(String(navigator.maxTouchPoints || 0));

  // ── Canvas fingerprint — renders text + geometry, encodes subtle GPU/font diffs
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 280; canvas.height = 60;
    const ctx = canvas.getContext('2d')!;

    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#9D00FF';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText('JerseyClub247 ♠♣♥♦', 4, 42);

    ctx.fillStyle = 'rgba(0,180,255,0.7)';
    ctx.font = '12px "Times New Roman", serif';
    ctx.fillText('Newark → London → Tokyo', 4, 20);

    // Geometric shapes (GPU-level variance)
    ctx.beginPath();
    ctx.arc(240, 30, 20, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,0,128,0.4)';
    ctx.fill();

    // Take a 60-char slice of the data URL as the "paint hash"
    const dataUrl = canvas.toDataURL('image/png');
    parts.push(dataUrl.slice(22, 82));
  } catch {
    parts.push('no-canvas');
  }

  // ── AudioContext fingerprint (oscillator frequency response differs per device)
  try {
    const ac = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });
    const osc = ac.createOscillator();
    const analyser = ac.createAnalyser();
    const gain = ac.createGain();
    gain.gain.value = 0; // silent
    osc.connect(analyser);
    analyser.connect(gain);
    gain.connect(ac.destination);
    osc.start(0);
    const data = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(data);
    parts.push(String(data[0]));
    osc.stop();
    ac.close();
  } catch {
    parts.push('no-audio');
  }

  // ── FNV-1a 32-bit hash
  const str = parts.join('||');
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }

  const hex = h.toString(16).toUpperCase().padStart(8, '0');
  return `Guest_${hex.slice(0, 7)}`;
}

/** Returns a stable fingerprint-based Guest ID. Cached in localStorage. */
export async function getOrCreateFingerprint(): Promise<string> {
  const cached = localStorage.getItem(FP_CACHE_KEY);
  if (cached) return cached;
  const fp = await computeFingerprint();
  localStorage.setItem(FP_CACHE_KEY, fp);
  return fp;
}
