/**
 * Cleans up a raw YouTube / SoundCloud track title for display.
 *
 * Since this is a 24/7 Jersey Club station:
 *  - The artist name is already shown beneath the title, so "Artist - Title"
 *    prefixes are stripped.
 *  - "Jersey Club" genre labels are redundant and removed.
 *  - Year tags, leftover separators, and platform noise are stripped.
 *  - Featuring credits (ft. / feat.) are intentionally KEPT.
 *  - If the result would be shorter than 3 chars the original is returned as-is.
 */

// ── Patterns stripped unconditionally ────────────────────────────────────────

const STRIP_PATTERNS: RegExp[] = [
  // Jersey Club genre labels — redundant on this site
  /\(?jersey\s*club\s*(music|banger|mix|remix|edit|flip|type\s*beat|instrumental|bounce|anthem|vibes?)?\)?/gi,
  /\[jersey\s*club[^\]]*\]/gi,

  // Year tags
  /\b20\d{2}\b/g,

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
  // Trailing separators / pipes / dashes
  t = t.replace(/[\s\-–—|,]+$/g, '');
  // Leading separators
  t = t.replace(/^[\s\-–—|,]+/g, '');
  // Multiple internal separators → single space
  t = t.replace(/\s*[\-–—|]{2,}\s*/g, ' ');
  // Collapse multiple spaces
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
  let t = decodeHtmlEntities(rawTitle);

  // ── Step 1: Strip "Artist - " prefix ──────────────────────────────────────
  // Pattern A: matches the channelTitle exactly at the start
  if (channelTitle) {
    const artistLower = channelTitle.trim().toLowerCase();
    const titleLower  = t.toLowerCase();
    // "Artist - rest" or "Artist- rest"
    const prefixA = artistLower + ' - ';
    const prefixB = artistLower + '- ';
    if (titleLower.startsWith(prefixA)) {
      t = t.slice(prefixA.length).trim();
    } else if (titleLower.startsWith(prefixB)) {
      t = t.slice(prefixB.length).trim();
    }
  }

  // Pattern B: generic "Short Name - rest" heuristic (catches mismatched
  // channel names vs. credited artist names in the title).
  // Only strip if the left side is ≤ 35 chars and contains no brackets.
  const dashIdx = t.indexOf(' - ');
  if (dashIdx > 0 && dashIdx <= 35) {
    const possibleArtist = t.slice(0, dashIdx).trim();
    if (possibleArtist.length <= 35 && !/[[(]/.test(possibleArtist)) {
      t = t.slice(dashIdx + 3).trim();
    }
  }

  // ── Step 2: Apply strip patterns ──────────────────────────────────────────
  for (const pattern of STRIP_PATTERNS) {
    t = t.replace(pattern, ' ');
  }

  // ── Step 3: Tidy up leftover separators ───────────────────────────────────
  t = cleanSeparators(t);

  // ── Step 4: Safety — never return an empty / trivially short result ────────
  if (t.length < 3) return rawTitle;

  return t;
}