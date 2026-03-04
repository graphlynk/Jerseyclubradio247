/**
 * Formats artist/channel names to look professional with proper capitalization.
 *
 * Handles common issues from YouTube & other sources:
 *  - ALL CAPS → Title Case
 *  - all lowercase → Title Case
 *  - Preserves intentional mixed-case (e.g. "DaBaby", "NLE Choppa")
 *  - Fixes common music abbreviations: dj → DJ, mc → MC, etc.
 *  - Preserves known all-caps tokens: TV, NYC, NJ, ATL, LLC, etc.
 *  - Handles "feat.", "ft.", "vs." connectors properly
 *  - Trims extra whitespace
 */

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

// Words that should always be uppercase
const ALWAYS_UPPER = new Set([
  'DJ', 'MC', 'TV', 'NYC', 'NJ', 'ATL', 'LA', 'DC', 'UK', 'US', 'USA',
  'LLC', 'II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'XL', 'EP', 'LP',
  'OG', 'YG', 'MF', 'JR', 'SR', 'BPM', 'AKA', 'MVP', 'VIP',
]);

// Words that should stay lowercase when not first
const LOWERCASE_WORDS = new Set([
  'a', 'an', 'the', 'and', 'but', 'or', 'nor', 'at', 'by', 'for', 'in',
  'of', 'on', 'to', 'up', 'vs', 'vs.', 'ft', 'ft.', 'feat', 'feat.',
  'with', 'x',
]);

// Check if a string is ALL CAPS (2+ letters, all uppercase)
function isAllCaps(str: string): boolean {
  const letters = str.replace(/[^a-zA-Z]/g, '');
  return letters.length >= 2 && letters === letters.toUpperCase();
}

// Check if a string is all lowercase (2+ letters)
function isAllLower(str: string): boolean {
  const letters = str.replace(/[^a-zA-Z]/g, '');
  return letters.length >= 2 && letters === letters.toLowerCase();
}

// Check if name has intentional mixed-case (e.g. "DaBaby", "NLE Choppa")
function hasIntentionalMixedCase(word: string): boolean {
  const letters = word.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 2) return false;
  // Mixed case means it has both upper and lower, but isn't simply "Word" (first-upper rest-lower)
  const hasUpper = /[A-Z]/.test(letters);
  const hasLower = /[a-z]/.test(letters);
  if (!hasUpper || !hasLower) return false;
  // Simple title case like "Word" is not intentional mixed case
  const simpleTitleCase = letters[0] === letters[0].toUpperCase() &&
    letters.slice(1) === letters.slice(1).toLowerCase();
  return !simpleTitleCase;
}

function titleCaseWord(word: string, isFirst: boolean): string {
  if (!word) return word;

  const upperCheck = word.toUpperCase();

  // Check if it's a known abbreviation
  if (ALWAYS_UPPER.has(upperCheck)) return upperCheck;

  // Check for lowercase connectors (only if not first word)
  if (!isFirst && LOWERCASE_WORDS.has(word.toLowerCase())) {
    return word.toLowerCase();
  }

  // Standard title case: capitalize first letter, lowercase rest
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

const EMOJI_RE = /\p{Extended_Pictographic}[\uFE0E\uFE0F]?/gu;

// ── Artist name corrections for specific SoundCloud tracks ──────────────────
const ARTIST_OVERRIDES: Record<string, string> = {
  'msporsh': 'Ms Porsh',
  'dj. frosty': 'DJ Frosty',
  'dj diamond kuts': 'DJ Diamond Kutz',
  'djdiamondkuts': 'DJ Diamond Kutz',
  'diamond kuts': 'DJ Diamond Kutz',
  'djjayhood973': 'DJ Jayhood',
  'jersey club blends': 'Wiztv',
  'djlilman973': 'DJ Lilman',
  'dj fade mixes': 'DJ Fade',
  'djfadethefuture remixes': 'DJ Fade',
  'tah': 'DJ MAG',
  'unicorn151, acemula': 'Unicorn151',
  'kiabhn (dj loki )': 'KiaBHN (DJ LoKi)',
  'bunkr.': 'Bunkr',
  'dj big k (remixes)': 'DJ Big K',
  'by dj calical': 'DJ Calical',
  'iamsbfmusic, tricks, dj taj': 'IamSBFmusic, Tricks, DJ Taj',
  'don toliver, dj irresistible': 'DJ Irresistible',
};

export function formatArtistName(name: string | undefined | null): string {
  if (!name) return '';

  // Check for exact artist overrides before any other processing
  const lowerName = name.trim().toLowerCase();
  if (ARTIST_OVERRIDES[lowerName]) return ARTIST_OVERRIDES[lowerName];

  // Decode HTML entities first, then strip emojis
  EMOJI_RE.lastIndex = 0;
  const decoded = decodeHtmlEntities(name).replace(EMOJI_RE, '');

  // Trim and collapse multiple spaces
  const cleaned = decoded.trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  // Determine if the entire name needs reformatting
  const needsReformat = isAllCaps(cleaned) || isAllLower(cleaned);

  if (!needsReformat) {
    // The name has intentional mixed case — only fix known abbreviations
    // e.g. "dj Smallz" → "DJ Smallz", "Mc Fly" → "MC Fly"
    return cleaned.split(' ').map((word, i) => {
      const upperCheck = word.toUpperCase();
      if (ALWAYS_UPPER.has(upperCheck)) return upperCheck;
      // Fix common prefix: "dj" at start of compound like "djSmallz"
      if (word.toLowerCase().startsWith('dj') && word.length > 2 && /[A-Z]/.test(word[2])) {
        return 'DJ ' + word.slice(2);
      }
      return word;
    }).join(' ');
  }

  // Full reformat: split into words and apply title case
  const words = cleaned.split(' ');
  return words.map((word, index) => {
    // Handle hyphenated names like "jay-z" → "Jay-Z"
    if (word.includes('-')) {
      return word.split('-').map((part, i) => {
        if (ALWAYS_UPPER.has(part.toUpperCase())) return part.toUpperCase();
        if (part.length === 1) return part.toUpperCase();
        return titleCaseWord(part, index === 0 && i === 0);
      }).join('-');
    }

    // Handle names with dots like "feat." or "ft."
    if (word.includes('.') && !LOWERCASE_WORDS.has(word.toLowerCase())) {
      return word.split('.').map((part, i) => {
        if (!part) return '';
        if (ALWAYS_UPPER.has(part.toUpperCase())) return part.toUpperCase();
        return titleCaseWord(part, index === 0 && i === 0);
      }).join('.');
    }

    return titleCaseWord(word, index === 0);
  }).join(' ');
}