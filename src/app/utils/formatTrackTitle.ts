/**
 * Cleans up a raw YouTube / SoundCloud track title for display.
 *
 * This is a DISPLAY-LAYER ONLY function — it never mutates source data.
 * It runs after tracks have loaded and rendered, and applies visual
 * formatting before the user sees the title.
 *
 * Pipeline:
 *  1. Strip "Artist - Title" prefix
 *  2. Strip platform noise / genre labels
 *  3. Normalize via normalizeTrackTitle (artist dedup, symbols, years, title case)
 *  4. Safety: falls back to raw title if anything goes wrong
 *
 * Since this is a 24/7 Jersey Club station:
 *  - The artist name is already shown beneath the title, so "Artist - Title"
 *    prefixes are stripped.
 *  - "Jersey Club" genre labels are redundant and removed.
 *  - Featuring credits (ft. / feat.) are intentionally KEPT.
 */

import { normalizeTrackTitle } from './normalizeTrackTitle';

// ── Patterns stripped unconditionally ────────────────────────────────────────

const STRIP_PATTERNS: RegExp[] = [
  // Jersey Club genre labels — redundant on this site
  /\(?jersey\s*club\s*(music|banger|mix|remix|edit|flip|type\s*beat|instrumental|bounce|anthem|vibes?)?\)?/gi,
  /\[jersey\s*club[^\]]*\]/gi,

  // NOTE: Year stripping REMOVED — years are now handled by normalizeTrackTitle
  // which extracts them first and re-inserts as (2025). Stripping here would
  // eat the year after normalization wrapped it, leaving empty "( )".

  // Leftover platform noise the server sanitizer doesn't catch
  /\bfree\s*download\b/gi,
  /\bout\s*now\b/gi,
  /\bnew\s*music\b/gi,
  /\bofficial\b/gi,
  /\baudio\b/gi,
  /\bmusic\s*video\b/gi,
  /\bvisualizer\b/gi,
  /\btype\s*beat\b/gi,
  /\bpremiere\b/gi,
  /\b(4k|hd|hq)\b/gi,
];

// ── Separator cleanup after stripping ────────────────────────────────────────

function cleanSeparators(t: string): string {
  // Normalize / and | separators first
  t = t.replace(/\s*\|\s*/g, ' - ');
  t = t.replace(/\s*\/\s*/g, ', ');
  t = t.replace(/\s*[-–—]\s*,\s*/g, ' - ');
  t = t.replace(/,\s*[-–—]\s*/g, ' - ');
  t = t.replace(/,\s*,/g, ',');
  t = t.replace(/[\s\-–—|,]+$/g, '');
  t = t.replace(/^[\s\-–—|,]+/g, '');
  t = t.replace(/\s*[\-–—|]{2,}\s*/g, ' ');
  t = t.replace(/\s{2,}/g, ' ');
  return t.trim();
}

// ── HTML entity decoding ─────────────────────────────────────────────────────

const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&#x27;': "'",
  '&#x2F;': '/',
  '&nbsp;': ' ',
};

const ENTITY_RE = /&(?:amp|lt|gt|quot|apos|nbsp|#39|#x27|#x2F);/gi;

function decodeHtmlEntities(str: string): string {
  return str.replace(ENTITY_RE, (match) => ENTITY_MAP[match.toLowerCase()] ?? match);
}

// ── Main export ───────────────────────────────────────────────────────────────

export function formatTrackTitle(
  rawTitle: string,
  channelTitle?: string,
): string {
  if (!rawTitle) return rawTitle;

  try {
    let t = decodeHtmlEntities(rawTitle);

    // ── Step 1: Strip "Artist - " prefix ──────────────────────────────────
    if (channelTitle) {
      const artistLower = channelTitle.trim().toLowerCase();
      const titleLower  = t.toLowerCase();
      const prefixA = artistLower + ' - ';
      const prefixB = artistLower + '- ';
      if (titleLower.startsWith(prefixA)) {
        t = t.slice(prefixA.length).trim();
      } else if (titleLower.startsWith(prefixB)) {
        t = t.slice(prefixB.length).trim();
      }
    }

    // Pattern B: generic "Short Name - rest" heuristic
    const dashIdx = t.indexOf(' - ');
    if (dashIdx > 0 && dashIdx <= 35) {
      const possibleArtist = t.slice(0, dashIdx).trim();
      if (possibleArtist.length <= 35 && !/[[(]/.test(possibleArtist)) {
        t = t.slice(dashIdx + 3).trim();
      }
    }

    // ── Step 2: Apply strip patterns (noise removal) ──────────────────────
    for (const pattern of STRIP_PATTERNS) {
      t = t.replace(pattern, ' ');
    }

    // ── Step 3: Tidy up leftover separators ───────────────────────────────
    t = cleanSeparators(t);

    // ── Step 4: Normalize (artist dedup, symbols, year → (YYYY), title case)
    // This is the display-layer normalization — never touches source data.
    const normalized = normalizeTrackTitle(t, channelTitle || '');
    t = normalized.title;

    // ── Step 5: Safety — never return an empty / trivially short result ───
    if (!t || t.length < 3) return rawTitle;

    return t;
  } catch (err) {
    // If anything in the pipeline throws, return the original raw title
    // so track display is never broken.
    console.warn('[formatTrackTitle] Error formatting title, using raw:', err);
    return rawTitle;
  }
}