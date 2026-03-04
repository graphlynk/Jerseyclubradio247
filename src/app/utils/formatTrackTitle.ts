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

  // Clickbait / spam phrases
  /\bmust[\s-]?(?:hear|listen|watch|see)\b/gi,
  /\btrending\b/gi,
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

// ── Title corrections for specific SoundCloud tracks ────────────────────────
// Uses a substring match on the lowercase raw title to identify the track,
// then returns the corrected display title.
const TITLE_OVERRIDES: [RegExp, string][] = [
  // ── Batch 1 ──
  [/it\s*depends\s*[-–—(]\s*jersey\s*club\s*remix\s*\)?/i, 'It Depends'],
  [/match\s*my\s*speed.*nasty\s*girl.*uniiqu3/i, 'Nasty Girl'],
  [/@djlilman973.*@djwizard_wiztv.*jersey\s*club\s*mixtape/i, 'Jersey Club'],
  [/kose\s*kuse\s*movie\s*thong\s*song\s*love\s*lock\s*down\s*wiztv/i, 'Kose Kuse Movie Thong Song Love Lock Down'],
  // ── Batch 2 ──
  [/rock\s*my\s*hips.*dj\s*jayhood.*ms\.?\s*porsh/i, 'Rock My Hips ft. DJ Jayhood'],
  [/05\s*dj\s*lilman\s*patty\s*cake/i, 'Patty Cake ft. DJ Lilman'],
  [/pop\s*that\s*thing\s*\(?\s*jersey\s*club\s*remix\s*\)?/i, 'Pop That Thing'],
  [/rock\s*it\s*ft\s*j\s*dub\s*soundcloud\s*version/i, 'Rock It ft. Jdub'],
  [/mutt\s*\(?\s*jersey\s*club\s*remix\s*\)?\s*streaming\s*on\s*all\s*platforms/i, 'Mutt (Rmx)'],
  [/dj\s*big\s*o.*pop\s*that\s*\(?\s*nadus\s*remix\s*\)?/i, 'Pop That (Rmx)'],
  [/blew?\s*new\s*jersey\s*up.*unicorn151.*chief\s*keef/i, 'Blow New Jersey Up ft. Chief Keef'],
  [/prince\s*hill.*biggie\s*wiztv\s*blend/i, 'Biggie (Rmx)'],
  [/in\s*your\s*eyes\s*\(?\s*jersey\s*club\s*remix\s*\)?/i, 'In Your Eyes (Rmx)'],
  [/luther\s*\(?\s*jersey\s*club\s*remix\s*\)?/i, 'Luther (Rmx)'],
  [/letoya\s*luckett.*torn\s*jersey\s*mix/i, 'Torn (Rmx)'],
  [/dj\s*sliink.*wiztv.*not\s*gu[n]+a\s*get\s*us.*blend/i, 'Not Gunna Get Us ft. DJ Sliink (Rmx)'],
  [/@djlilman973\s*ft\.?\s*40\s*cal.*i\s*like\s*the\s*way\s*she\s*move/i, 'I Like the Way She Move ft. 40 Cal'],
  [/a\s*jersey\s*club\s*party.*fade\s*segment/i, 'A Jersey Club Party'],
  [/knockin\s*da\s*boots.*dj\s*fade.*dj\s*taj/i, 'Exclusive ft. DJ Taj'],
  [/the\s*sound\s*of\s*jersey\s*club/i, 'The Sound of Jersey Club'],
  [/don.?t\s*play/i, "Don't Play (Rmx)"],
  [/beat\s*it.*chris\s*brown.*irresist[ai]ble/i, 'Beat It ft. DJ Irresistable (Rmx)'],
  [/e85\s*\(?\s*jersey\s*club\s*remix\s*\)?/i, 'Don Toliver, E85'],
  // ── Batch 3 ──
  [/dj\s*loki\s*x\s*tlc\s*[-–—]\s*creep'?n/i, "Creep'N"],
  [/justin\s*bieber\s*[-–—]\s*yukon.*dj\s*sliink/i, 'Yukon (DJ Sliink Rmx)'],
  [/jersey\s*club\s*new\s*years\s*mix\s*2026.*/i, 'New Years Mix 2026 (ft. DJ Taj, DJ Sliink, Jiddy, LilC4)'],
  [/dababy\s*[-–—]\s*pop\s*dat\s*thang\s*clean/i, 'Pop Dat Thang (DJ Sliink Rmx)'],
  [/dj\s*taj\s*jersey\s*club\s*spring\s*mix\s*2025/i, 'Spring Mix 2025'],
  [/heartbroken[\s-]*dj\s*jayhood/i, 'Heartbroken'],
  [/promiscuous\.\s*\+\s*@stackkie/i, 'Promiscuous'],
  [/don\s*toliver\s*[-–—]\s*e85\s*\(sjayy\s*remix\)/i, 'E85 (SJAYY Remix)'],
  [/dj\s*frosty\s*movie\s*pt\s*2\s*\(milly\s*rock\s*anthem\).*/i, 'Movie Pt 2 (Milly Rock Anthem)'],
  [/dj\s*jayhood\s*at\s*bunkr/i, 'DJ Jayhood @ Bunkr'],
  [/dj\s*taj,\s*brent\s*faiyaz\s*[-–—]\s*all\s*mine/i, 'All Mine'],
  [/brick\s*city\s*[-–—]\s*unicorn151/i, 'Brick City'],
  [/cookiee\s*kawaii\s*&\s*tyga\s*[-–—]\s*vibe/i, 'Vibe (If I Back It Up)'],
  [/mobbin\s*\(brock,\s*bril.*/i, "Mobbin' (ft. Brock, Bril, Lay Bankz, PGS Spence, JMoney, D Glizz)"],
  [/playboicarti\s*[-–—]\s*evil\s*j0rdan/i, 'Evil J0rdan (DJ Sliink & JIDDY Rmx)'],
  [/hit\s*it\s*[-–—]\s*4bandz\s*,\s*juiceboy/i, 'Hit It (ft. 4Bandz & JuiceBoy)'],
  [/bandmanrill\s*x\s*2rare\s*x\s*d4m\s*\$loan\s*cupid\s*remix/i, 'Cupid (Rmx) ft. 2Rare & D4M $loan'],
  [/dj\s*tameil,\s*dj\s*jayhood\s*&\s*adolf\s*joker\s*[-–—]\s*bbmg\s*anthem/i, 'BBMG Anthem'],
  [/can\s*you\s*bounce\?\s*\(remix\)\s*\[feat\.?\s*dj\s*blizz\]/i, 'Can You Bounce? (Rmx) ft. DJ Blizz'],
  [/beat\s*it[-–—]\s*chris\s*brown\s*\(dj\s*irresistible\s*remix\)/i, 'Beat It (DJ Irresistible Rmx)'],
  [/02\s*bille\s*jean\s*[-–—]\s*dj\s*frosty/i, 'Billie Jean'],
  [/lunch\s*money\s*lewis\s*[-–—]\s*bills/i, 'Bills (DJ Tim Dolla x DJ Problem)'],
  [/bounce\s*with\s*me\s*[-–—]\s*lil\s*bow\s*wow/i, 'Bounce With Me (DJ Big K Rmx)'],
  [/green\s*braids\s*[-–—]\s*unicorn151/i, 'Green Braids'],
  [/jersey\s*club\s*spring\s*mix\s*2025\s*\(\s*dj\s*sliink.*/i, 'Spring Mix 2025 (ft. DJ Sliink, DJ Taj, Fazobeats)'],
  [/bbe\s*challenge\s*pt\.\s*2\s*[-–—]\s*dj\s*taj/i, 'BBE Challenge Pt. 2'],
  [/peanut\s*butter\s*jelly\s*time\s*\(.*its_pbnj.*/i, 'Peanut Butter Jelly Time'],
  [/act\s*ii[-–—]\s*date\s*@\s*8\s*bake\s*x\s*dj\s*smallz/i, 'Date @ 8'],
  [/dj\s*taj,\s*tricks\s*[-–—]\s*i\s*wanna\s*love\s*you/i, 'I Wanna Love You'],
  [/i\s*left\s*my\s*home\s*ha\s*\(dj\s*sliink\s*edit\)/i, 'I Left My Home (DJ Sliink Edit)'],
  [/until\s*the\s*end\s*of\s*time\s*\(jersey\s*club\)\s*ft\.?\s*tricks\s*&\s*dj\s*taj/i, 'Until The End Of Time ft. Tricks & DJ Taj'],
  [/dj\s*lil\s*man\s*ft\.?\s*dj\s*40\s*cal\s*[-–—]\s*i\s*like\s*the\s*way\s*she\s*move/i, 'I Like The Way She Move ft. DJ 40 Cal'],
  [/chris\s*brown\s*x\s*bryson\s*tiller\s*[-–—]\s*it\s*depends/i, 'It Depends (DJ Sliink Rmx)'],
  [/a\s*timeless\s*throwback\s*jersey\s*club\s*set/i, 'A Timeless Throwback Set'],
  [/tim\s*dolla\s*ft\s*kanye\s*west\s*[-–—]\s*all\s*mine\s*remix/i, 'All Mine (Rmx) ft. Kanye West'],
  [/tricks,\s*dj\s*taj\s*[-–—]\s*in\s*your\s*eyes/i, 'In Your Eyes'],
];

export function formatTrackTitle(
  rawTitle: string,
  channelTitle?: string,
): string {
  if (!rawTitle) return rawTitle;

  // Check for exact title overrides before the main pipeline
  for (const [pattern, replacement] of TITLE_OVERRIDES) {
    if (pattern.test(rawTitle)) return replacement;
  }

  try {
    let t = decodeHtmlEntities(rawTitle);

    // ── Step 1: Strip "Artist - " prefix ──────────────────────────────────
    if (channelTitle) {
      const artistLower = channelTitle.trim().toLowerCase();
      const titleLower = t.toLowerCase();
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