/**
 * Track Title Normalization Algorithm  (DISPLAY-LAYER ONLY)
 * ==========================================================
 * Runs AFTER tracks have loaded and rendered.  Never modifies source data.
 * Every public function is wrapped in a try/catch that falls back to the
 * original unformatted string so a bug here can never break track display.
 *
 * Pipeline:
 *  1. Extract years — capture any 20xx year BEFORE stripping so it isn't lost
 *  2. Normalize separators — / | → comma/dash
 *  3. Reformat parentheses — (Bootleg) → "- Bootleg", noise parens stripped
 *  4. Artist name deduplication — remove artist from title if redundant
 *  5. Symbol stripping — remove !, [], -, *, #, @, etc.
 *  6. Year re-insertion — append extracted year as (2025)
 *  7. Title case enforcement
 *  8. Flag for review — titles > 50 chars logged to console
 *  9. SEO structured data generation
 */

// ── Title-case constants ─────────────────────────────────────────────────────

const TITLE_CASE_LOWER = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'yet', 'so',
  'at', 'by', 'in', 'of', 'on', 'to', 'up', 'as', 'is', 'it',
  'vs', 'vs.', 'with', 'x',
]);

const ALWAYS_UPPER = new Set([
  'DJ', 'MC', 'TV', 'NYC', 'NJ', 'ATL', 'LA', 'DC', 'UK', 'US', 'USA',
  'LLC', 'II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'XL', 'EP', 'LP',
  'OG', 'YG', 'MF', 'JR', 'SR', 'BPM', 'AKA', 'MVP', 'VIP', 'JCR',
  'BTS', 'EDM', 'RnB', 'R&B',
]);

const FEAT_RE = /\b(feat\.?|ft\.?|featuring)\b/gi;

// ── 1. Year extraction ───────────────────────────────────────────────────────

const YEAR_RE = /\b(20\d{2})\b/;

/**
 * Extracts the FIRST standalone 20xx year from a string and returns
 * both the year and the string with the year removed.
 * Years already wrapped in parens "(2025)" are left untouched—the bare
 * occurrence is targeted instead.
 */
function extractYear(str: string): { year: string | null; rest: string } {
  // If there's already a properly-wrapped year like "(2025)", keep it as-is
  if (/\(20\d{2}\)/.test(str)) {
    return { year: null, rest: str };
  }
  const m = str.match(YEAR_RE);
  if (!m) return { year: null, rest: str };
  // Remove the bare year (and any surrounding whitespace / punctuation)
  const rest = str
    .replace(new RegExp(`\\s*\\b${m[1]}\\b[!.]*\\s*`), ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return { year: m[1], rest };
}

// ── 2. Normalize separators ──────────────────────────────────────────────────

function normalizeSeparators(str: string): string {
  return str.replace(/\/|\|/g, ', ');
}

// ── 3. Reformat parentheses ──────────────────────────────────────────────────

function reformatParentheses(str: string): string {
  // Only reformat action-label parens: (Remix), (DJ X Bootleg), (Club Edit), etc.
  // Preserve (feat. X), (2025), (Pt. 2), and other non-action content.
  const ACTION_LABELS = /\(\s*([\w\s.'&]+?\s+)?(bootleg|remix|edit|flip|rework|mashup|vip\s*mix|vip|club\s*mix|club\s*edit)\s*\)/gi;
  const NOISE_PARENS = /\(\s*(?:official\s*(?:video|audio|music\s*video|visualizer)?|lyric\s*video|explicit|clean|out\s*now|free\s*(?:download|dl)?|premiere|full\s*song|audio|video|hd|hq|4k)\s*\)/gi;

  str = str.replace(NOISE_PARENS, ' ');
  str = str.replace(ACTION_LABELS, (_m, prefix, action) => {
    const label = ((prefix || '') + action).trim();
    const formatted = label.replace(/\b\w/g, c => c.toUpperCase());
    return `- ${formatted}`;
  });
  str = str.replace(/\(\s*\)/g, '');
  return str.replace(/\s{2,}/g, ' ').trim();
}

// ── 4. Artist deduplication ──────────────────────────────────────────────────

function deduplicateArtist(title: string, artist: string): string {
  if (!artist || !title) return title;

  const artistClean = artist.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  if (!artistClean || artistClean.length < 2) return title;

  const artistWords = artistClean.split(/\s+/);
  const pattern = artistWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');

  // "Artist - Title" prefix
  let result = title.replace(new RegExp(`^${pattern}\\s*[-–—|:]\\s*`, 'i'), '');

  // Inline occurrence
  if (artistWords.length >= 1) {
    result = result.replace(new RegExp(`\\b${pattern}\\b`, 'gi'), '').trim();
  }

  // Cleanup separators
  result = result
    .replace(/^[\s\-–—|:,]+/, '')
    .replace(/[\s\-–—|:,]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return result.length < 3 ? title : result;
}

// ── 5. Symbol stripping ─────────────────────────────────────────────────────

function stripSymbols(str: string): string {
  let r = str;
  r = r.replace(/\[[^\]]*\]/g, ' ');           // [Official Video] etc.
  r = r.replace(/\{[^}]*\}/g, ' ');            // {Remix} etc.
  r = r.replace(/[!*#@~^+=<>\\]/g, '');         // junk symbols (| handled by normalizeSeparators)
  r = r.replace(/(?<=\s)-(?=\s)/g, ' ');        // standalone dashes
  r = r.replace(/^-\s+|\s+-$/g, '');            // leading/trailing dashes
  r = r.replace(/_/g, ' ');                     // underscores
  r = r.replace(/\s{2,}/g, ' ').trim();
  return r;
}

// ── 7. Title case ────────────────────────────────────────────────────────────

function toTitleCase(str: string): string {
  if (!str) return str;
  const words = str.split(/\s+/);
  const last = words.length - 1;

  return words.map((w, i) => {
    if (!w) return w;
    const upper = w.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (ALWAYS_UPPER.has(upper)) return w.replace(/[a-zA-Z]+/, upper);

    if (i !== 0 && i !== last) {
      FEAT_RE.lastIndex = 0;
      if (FEAT_RE.test(w)) { FEAT_RE.lastIndex = 0; return w.toLowerCase(); }
      if (TITLE_CASE_LOWER.has(w.toLowerCase())) return w.toLowerCase();
    }

    // Hyphenated: "re-mix" → "Re-Mix"
    if (w.includes('-')) {
      return w.split('-').map(p => {
        if (!p) return p;
        if (ALWAYS_UPPER.has(p.replace(/[^a-zA-Z]/g, '').toUpperCase())) return p.toUpperCase();
        return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
      }).join('-');
    }

    // Parenthesised: "(remix)" → "(Remix)", "(2025)" stays
    if (w.startsWith('(') && w.endsWith(')')) {
      const inner = w.slice(1, -1);
      if (/^\d+$/.test(inner)) return w;
      return '(' + inner.charAt(0).toUpperCase() + inner.slice(1).toLowerCase() + ')';
    }

    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
}

// ── 8. Review flag ───────────────────────────────────────────────────────────

const REVIEW_MAX = 50;

function flagForReview(title: string, artist: string, videoId: string): boolean {
  if (title.length > REVIEW_MAX) {
    console.log(`[Normalize][Review] Title exceeds ${REVIEW_MAX} chars (${title.length}): "${title}" by ${artist} [${videoId}]`);
    return true;
  }
  return false;
}

// ── 9. SEO structured data ───────────────────────────────────────────────────

export interface TrackSEO {
  title: string;
  description: string;
  jsonLd: Record<string, unknown>;
}

export function generateTrackSEO(title: string, artist: string): TrackSEO {
  const fullTitle = `${title} by ${artist} | Jersey Club Radio`;
  const description = `Listen to "${title}" by ${artist} on Jersey Club Radio - 24/7 Jersey Club music streaming.`;
  return {
    title: fullTitle,
    description,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'MusicRecording',
      name: title,
      byArtist: { '@type': 'MusicGroup', name: artist },
      inAlbum: { '@type': 'MusicPlaylist', name: 'Jersey Club Radio' },
      url: 'https://jerseyclubradio.com',
      description,
    },
  };
}

// ── Main exports ─────────────────────────────────────────────────────────────

export interface NormalizedResult {
  title: string;
  artist: string;
  needsReview: boolean;
  seo: TrackSEO;
}

/**
 * Full normalization pipeline — DISPLAY LAYER ONLY.
 *
 * Order:
 *  1. Extract year (capture before anything strips it)
 *  2. Normalize separators
 *  3. Reformat parentheses
 *  4. Artist deduplication
 *  5. Symbol stripping
 *  6. Re-insert year as (YYYY)
 *  7. Title case
 *  8. Review flag
 *  9. SEO generation
 *
 * If any step throws, falls back to the raw inputs so track display is never broken.
 */
export function normalizeTrackTitle(
  rawTitle: string,
  rawArtist: string,
  videoId: string = '',
): NormalizedResult {
  // Fallback result that mirrors the raw input — guaranteed safe
  const fallback: NormalizedResult = {
    title: rawTitle || '',
    artist: rawArtist || '',
    needsReview: false,
    seo: generateTrackSEO(rawTitle || '', rawArtist || ''),
  };

  try {
    if (!rawTitle) return fallback;

    // ── 1. Extract year before any stripping ──
    const { year, rest: titleWithoutYear } = extractYear(rawTitle);

    // ── 2. Normalize separators ──
    let title = normalizeSeparators(titleWithoutYear);

    // ── 3. Reformat parentheses ──
    title = reformatParentheses(title);

    // ── 4. Artist deduplication ──
    title = deduplicateArtist(title, rawArtist);

    // ── 5. Symbol stripping ──
    title = stripSymbols(title);
    let artist = stripSymbols(rawArtist);

    // ── 6. Re-insert year as (YYYY) ──
    if (year) {
      // Only append if the year isn't already present (e.g. inside a paren group)
      if (!title.includes(year)) {
        title = `${title} (${year})`.trim();
      } else if (!new RegExp(`\\(${year}\\)`).test(title)) {
        // Year exists bare — wrap it
        title = title.replace(new RegExp(`\\b${year}\\b`), `(${year})`);
      }
    }

    // ── 7. Title case ──
    title = toTitleCase(title);
    artist = toTitleCase(artist);

    // Final whitespace cleanup
    title = title.replace(/\s{2,}/g, ' ').trim();
    artist = artist.replace(/\s{2,}/g, ' ').trim();

    // Safety: if we ended up with an empty/trivial title, fall back
    if (!title || title.length < 2) return fallback;

    // ── 8. Review flag ──
    const needsReview = flagForReview(title, artist, videoId);

    // ── 9. SEO ──
    const seo = generateTrackSEO(title, artist);

    return { title, artist, needsReview, seo };
  } catch (err) {
    console.warn('[Normalize] Error in normalization pipeline, using raw title:', err);
    return fallback;
  }
}