import { Track } from '../context/PlayerContext';
import { decodeHtmlEntities } from './decodeHtmlEntities';

// Matches all emoji characters and their variation selectors
const EMOJI_RE = /\p{Extended_Pictographic}[\uFE0E\uFE0F]?/gu;

// ── Radio station blocklist ──────────────────────────────────────────────────
export const RADIO_STATION_BLOCKLIST = [
    "TheLotRadio",
    "The Lot Radio",
    "@TheLotRadio",
    "Playgrnd Series",
    "PLAYGRND Series",
    "PLAYGRND",
    "Playgrnd",
    "@PlaygrndSeries",
];

// ── Genre blocklist — permanently excluded non-Jersey-Club genres ─────────────
// A track is blocked ONLY if it matches a blocked genre AND does NOT contain
// a Jersey Club indicator (so "Jersey Club x Amapiano Remix" still passes).
const JERSEY_INDICATORS = [
    'jersey club', 'jersey', 'jc ', 'jc-', 'jclub',
    'newark club', 'brick bandits', 'sliink',
];

const BLOCKED_GENRE_PATTERNS: RegExp[] = [
    // House family
    /\btech\s*house\b/i,
    /\blatin\s*house\b/i,
    /\bdeep\s*house\b/i,
    /\bfuture\s*house\b/i,
    /\bprogressive\s*house\b/i,
    /\bbass\s*house\b/i,
    /\bhouse\s*music\b/i,
    // Only match standalone "house" when preceded by genre-qualifying words
    /\b(?:afro|tribal|acid|minimal|soulful|melodic|organic)\s*house\b/i,

    // EDM / Electronic
    /\b(?:edm|electronic\s*dance|electronic\s*music)\b/i,

    // Techno
    /\btechno\b/i,

    // Lo-Fi
    /\blo[\s-]?fi\b/i,
    /\blofi\b/i,

    // Trap & Drill (standalone, not "jersey club trap remix")
    /\btrap\s*(?:music|beat|mix|nation|city|type)\b/i,
    /\bdrill\s*(?:music|beat|mix|type|rap)\b/i,

    // R&B (blocked unless JC context catches it first)
    /\b(?:r&b|rnb|r\s*and\s*b)\s*(?:music|mix|vibes?|soul|slow\s*jam)/i,

    // Amapiano
    /\bamapiano\b/i,

    // UK Garage
    /\buk\s*garage\b/i,
    /\bukg\b/i,
];

/**
 * Returns true if the track should be blocked for being a non-JC genre.
 * Tracks that also mention Jersey Club are always allowed.
 */
function isBlockedGenre(title: string, artist: string): boolean {
    const combined = `${title} ${artist}`.toLowerCase();

    // If it has a Jersey Club indicator, always allow
    if (JERSEY_INDICATORS.some(ind => combined.includes(ind))) {
        return false;
    }

    // Check against blocked genre patterns
    return BLOCKED_GENRE_PATTERNS.some(pattern => pattern.test(combined));
}

// ── Title cleaning: separators & parentheses ─────────────────────────────────

/** Labels inside parentheses that should be reformatted as suffix: "- Label" */
const PAREN_REFORMAT_RE = /\(\s*([\w\s.'&]+?\s+)?(bootleg|remix|edit|flip|rework|mashup|vip\s*mix|vip|club\s*mix|club\s*edit)\s*\)/gi;

/** Parenthesised noise that should be stripped entirely */
const PAREN_STRIP_RE = /\(\s*(?:official\s*(?:video|audio|music\s*video|visualizer)?|lyric\s*video|explicit|clean|prod\.?\s*(?:by\s*)?[\w\s]+|out\s*now|free\s*(?:download|dl)?|premiere|full\s*song|audio|video|hd|hq|4k)\s*\)/gi;

/**
 * Normalise `/` and `|` separators to ` - ` or `, `.
 * Slash between two short tokens (likely artist / artist) -> comma.
 * Pipe anywhere -> dash.
 */
function normalizeSeparators(title: string): string {
    // `|` -> ` - `
    title = title.replace(/\s*\|\s*/g, ' - ');

    // `/` between words -> `, ` (common in "Artist / Artist" or "Title / Subtitle")
    title = title.replace(/\s*\/\s*/g, ', ');

    // Collapse resulting double-separators: " - , " -> " - "
    title = title.replace(/\s*[-\u2013\u2014]\s*,\s*/g, ' - ');
    title = title.replace(/,\s*[-\u2013\u2014]\s*/g, ' - ');
    title = title.replace(/,\s*,/g, ',');

    return title.trim();
}

/**
 * Handle parenthesised labels:
 *  - (Official Video) etc. -> stripped
 *  - (Moguna Bootleg) -> " - Moguna Bootleg"
 *  - (Remix) -> " - Remix"
 *  - (DJ X Club Edit) -> " - DJ X Club Edit"
 */
function reformatParentheses(title: string): string {
    // Step 1: Strip noise parens entirely
    title = title.replace(PAREN_STRIP_RE, ' ');

    // Step 2: Reformat action labels: "(Something Remix)" -> " - Something Remix"
    title = title.replace(PAREN_REFORMAT_RE, (_match, prefix, action) => {
        const label = ((prefix || '') + action).trim();
        // Title-case the action word
        const formatted = label.replace(/\b\w/g, (c: string) => c.toUpperCase());
        return ` - ${formatted}`;
    });

    // Step 3: Strip any remaining empty parens or parens with only whitespace
    title = title.replace(/\(\s*\)/g, '');

    return title;
}

// ── Truncation ───────────────────────────────────────────────────────────────
const MAX_TITLE_LENGTH = 60;

function smartTruncate(title: string, max: number): string {
    if (title.length <= max) return title;
    const substr = title.substring(0, max);
    const lastSpace = substr.lastIndexOf(' ');
    const cut = lastSpace > 0 ? substr.substring(0, lastSpace) : substr;
    // Clean trailing punctuation
    return cut.replace(/[\s\-\u2013\u2014|.,!?]+$/, '').trim();
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Automates track cleaning before UI rendering or playlist ingestion.
 * Pipeline (order matters — clean first, truncate second):
 *  1. Decode HTML entities
 *  2. Filter blocklisted radio stations
 *  3. Filter blocked non-Jersey-Club genres (SKIPPED for curated SC playlist tracks)
 *  4. Strip @ handles
 *  5. Normalize separators (/ | -> comma/dash)
 *  6. Reformat parentheses: (Bootleg) -> "- Bootleg", (Official Video) -> stripped
 *  7. Clean hanging separators & collapse whitespace
 *  8. Truncate LAST (after all cleaning, on the final title)
 *
 * NOTE: Title normalization (artist dedup, title case, year formatting, SEO)
 * is applied separately at the DISPLAY layer via formatTrackTitle / normalizeTrackTitle.
 * This function only performs safe, non-breaking data cleanup.
 *
 * @returns Cleaned Track | null if the track is blocked
 */
export function sanitizeTrack(t: Track): Track | null {
    let title = decodeHtmlEntities(t.snippet.title);
    let artist = decodeHtmlEntities(t.snippet.channelTitle);

    // Curated SoundCloud playlist tracks (source === 'soundcloud') are hand-picked
    // by the station owner — skip radio station blocklist and genre filtering for them.
    const isCuratedSC = t.source === 'soundcloud';

    if (!isCuratedSC) {
        // 1. Filter out blocklisted radio stations
        const textToCheck = `${title} ${artist}`.toLowerCase();
        const isBlocked = RADIO_STATION_BLOCKLIST.some(blocked =>
            textToCheck.includes(blocked.toLowerCase())
        );
        if (isBlocked) return null;

        // 2. Filter out non-Jersey-Club genres
        if (isBlockedGenre(title, artist)) {
            console.log(`[Sanitize][GenreBlock] "${title}" by ${artist}`);
            return null;
        }
    }

    // 3. Strip emojis from title and artist
    EMOJI_RE.lastIndex = 0;
    title = title.replace(EMOJI_RE, '').trim();
    EMOJI_RE.lastIndex = 0;
    artist = artist.replace(EMOJI_RE, '').trim();

    // 4. Collapse excessive punctuation: !!! → !, ??? → ?, .... → …
    title = title.replace(/([!?]){2,}/g, '$1');
    title = title.replace(/\.{4,}/g, '…');

    // 5. Remove @ handles from title (e.g. @GuapyBeats)
    title = title.replace(/@[a-zA-Z0-9_-]+[\s]*[.,!?|-]*[\s]*/g, '').trim();

    // 4. Normalize separators: / and | -> comma or dash
    title = normalizeSeparators(title);

    // 5. Reformat parentheses: (Bootleg) -> "- Bootleg", (Official Video) -> gone
    title = reformatParentheses(title);

    // 6. Clean trailing/leading hanging separators & collapse whitespace
    title = title.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');  // ( text ) → (text)
    title = title.replace(/[\s\-\u2013\u2014|,]+$/, '').trim();
    title = title.replace(/^[\s\-\u2013\u2014|,]+/, '').trim();
    title = title.replace(/\s*[-\u2013\u2014]\s*[-\u2013\u2014]\s*/g, ' - '); // collapse double dashes
    title = title.replace(/\s{2,}/g, ' ').trim();

    // 7. Truncate LAST — after all cleaning is done
    title = smartTruncate(title, MAX_TITLE_LENGTH);

    // 7b. Strip orphaned open paren left by truncation or emoji stripping (e.g. "Somebody (")
    title = title.replace(/\s*\([^)]*$/, '').trim();

    // 8. Block tracks whose title is meaninglessly short after all cleaning
    // Curated SoundCloud tracks are hand-picked by the station owner — never block them.
    if (!isCuratedSC && title.replace(/\s/g, '').length < 3) {
        console.log(`[Sanitize][TooShort] "${t.snippet.title}"`);
        return null;
    }

    return {
        ...t,
        snippet: {
            ...t.snippet,
            title,
            channelTitle: artist,
        },
    };
}
