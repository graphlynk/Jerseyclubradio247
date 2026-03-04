import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
// Official Paddle Node SDK — used for typed webhook verification (unmarshal)
import { Paddle, EventName } from "npm:@paddle/paddle-node-sdk";

const app = new Hono();

// ── Supabase admin client (for Storage access) ──────────────────────────────
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const OG_BUCKET = "make-715f71b9-social";
const OG_FILE = "og-image.png";
const COVER_ART_BUCKET = "jc-cover-art";

// ── Admin key for event approval/deletion (must be set via env) ──────────────
const ADMIN_KEY = Deno.env.get("ADMIN_KEY") || "";
if (!ADMIN_KEY) console.warn("[SECURITY] ADMIN_KEY env var not set — admin endpoints will reject all requests until configured");

// Idempotently create storage buckets on cold start
(async () => {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const names = buckets?.map((b: any) => b.name) ?? [];
    if (!names.includes(OG_BUCKET)) {
      await supabaseAdmin.storage.createBucket(OG_BUCKET, { public: false });
      console.log(`[OG] Created storage bucket "${OG_BUCKET}"`);
    }
    if (!names.includes(COVER_ART_BUCKET)) {
      await supabaseAdmin.storage.createBucket(COVER_ART_BUCKET, { public: true });
      console.log(`[CoverArt] Created storage bucket "${COVER_ART_BUCKET}"`);
    }
  } catch (e) {
    console.log("[Storage] Bucket init (non-critical):", e);
  }
})();

app.use('*', logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

// ═══════════════════════════════════════════════════════════════════════════════
//  CROSS-PLATFORM DISCOVERY ENGINE
//  Surfaces Jersey Club tracks available on YouTube Music, Spotify & Apple Music
//  by searching YouTube/SoundCloud for known tracks, artists, and labels.
// ═══════════════════════════════════════════════════════════════════════════════

// Large rotating pool of Jersey Club search queries — ensures variety every refresh cycle
// Expanded with artist-specific searches that surface tracks from YouTube Music / Spotify / Apple Music catalogs
const QUERY_POOL = [
  // ── Core genre searches ──
  "jersey club music mix",
  "jersey club banger",
  "jersey club dj set",
  "jersey club 2025",
  "jersey club 2026 new",
  "jersey club bounce music",
  "jersey club newark nj music",
  "jersey club anthem 2025",
  "jersey club freestyle track",
  "jersey club footwork music",
  "jersey club baltimore club",
  "jersey club 140 bpm",
  "new jersey club music 2026",
  "jersey club artist 2025",
  "jersey club producer beat",
  "jersey club shuffle dance music",
  "jersey club underground mix",
  "jersey club best hits 2026",
  "jersey club instrumental",
  "jersey club set live 2026",
  "jersey club type beat 2026",
  "jersey club remix 2026",
  // ── Pioneer / Legend artist searches (YouTube Music + Spotify catalog) ──
  "DJ Tameil jersey club",
  "DJ Bavgate jersey club",
  "DJ Technics jersey club",
  "DJ Sliink jersey club 2025",
  "Jayhood jersey club new",
  "DJ Smallz 732 jersey club",
  "DJ Lil Man jersey club",
  "Trippy Turtle jersey club",
  "Nadus jersey club official",
  "Tim Dolla jersey club",
  "DJ Tray jersey club",
  "Brick Bandits jersey club",
  "Mike Cervello jersey club",
  "R3LL jersey club",
  "Cashmere Cat jersey club",
  "Ookay jersey club",
  "4B jersey club",
  "DJ Rondell jersey club",
  "DJ Rip jersey club newark",
  "Roddyrod jersey club",
  // ── YouTube Music Topic channel targeting ──
  "jersey club Topic",
  "jersey club official audio",
  "jersey club audio",
  "jersey club music video official",
  "jersey club visualizer",
  // ── Spotify / Apple Music playlist-surfacing queries ──
  "jersey club essentials playlist",
  "jersey club vibes",
  "jersey club party mix 2026",
  "best jersey club tracks all time",
  "jersey club classics",
  "jersey club hits compilation",
  "jersey club workout music",
  "jersey club driving music",
  // ── Sub-genre & cross-genre discovery ──
  "jersey club drill remix",
  "jersey club afrobeats",
  "jersey club amapiano",
  "jersey club house remix",
  "jersey club hip hop remix",
  "jersey club R&B remix",
  "jersey club pop remix 2025",
  "jersey club dancehall",
  "jersey club uk funky",
  "jersey club baile funk",
  "jersey club vogue beat",
  // ── Specific iconic tracks (cross-platform discovery) ──
  "DJ Sliink Vibrations jersey club",
  "DJ Sliink Put It Down",
  "DJ Sliink Higher jersey",
  "DJ Tameil certified jersey",
  "Nadus Nxwxrk",
  "Trippy Turtle jersey bounce",
  "4B jersey club remix",
  "Cashmere Cat jersey remix",
  "DJ Smallz 732 type beat",
  "Tim Dolla jersey club banger",
  "DJ Bavgate all i need jersey",
  "Jayhood shake jersey club",
  "R3LL jersey club original",
  // ── Label / collective searches ──
  "Brick Bandits crew jersey club",
  "Sliink Ent jersey club",
  "jersey club NJ collective",
  "jersey club newark sound",
  // ── Trending & algorithmic boost queries ──
  "jersey club viral tiktok",
  "jersey club trending 2026",
  "jersey club new release today",
  "jersey club fresh uploads",
  "jersey club premiere",
];

const NEW_RELEASE_QUERIES = [
  "jersey club 2026",
  "new jersey club music 2026",
  "jersey club fresh 2026",
  "jersey club latest 2026",
  "jersey club new drop 2026",
  "jersey club released this week",
  "jersey club new release 2025 2026",
  "jersey club premiere 2026",
  "jersey club official audio 2026",
  "jersey club first listen 2026",
  "jersey club brand new 2026",
];

// ─── SOUNDCLOUD DYNAMIC SEARCH ──────────────────────────────────────────────
// Mirrors YouTube's rotating query pool — dynamically searches SoundCloud API v2
// for the newest Jersey Club tracks uploaded daily, with automatic refresh & rotation.

const SC_QUERY_POOL = [
  // ── Core SoundCloud searches ──
  "jersey club",
  "jersey club remix",
  "jersey club type beat",
  "jersey club 2026",
  "jersey club 2025",
  "jersey club bounce",
  "jersey club banger",
  "jersey club new",
  "jersey club freestyle",
  "jersey club mix",
  "jersey club edit",
  "jersey club bootleg",
  "jersey club flip",
  "jersey club drill",
  "jersey club 140 bpm",
  "jersey club producer",
  "jersey club instrumental",
  "jersey club underground",
  "jersey club newark",
  "jersey club baltimore club",
  "jersey club anthem",
  "jersey club shuffle dance",
  // ── Artist-specific (Spotify / Apple Music catalog crossover) ──
  "DJ Tameil",
  "DJ Sliink",
  "Jayhood jersey",
  "DJ Bavgate",
  "DJ Smallz 732",
  "DJ Lil Man jersey",
  "Nadus nxwxrk",
  "Trippy Turtle jersey",
  "Tim Dolla",
  "DJ Tray jersey club",
  "R3LL jersey",
  "4B jersey club",
  "Brick Bandits",
  "Cashmere Cat jersey",
  "Mike Cervello jersey",
  "Ookay jersey",
  "DJ Rondell",
  "Roddyrod jersey",
  "DJ Rip newark",
  // ── Sub-genre crossover ──
  "jersey club afrobeats",
  "jersey club amapiano",
  "jersey club house",
  "jersey club drill remix",
  "jersey club R&B",
  "jersey club pop flip",
  "jersey club dancehall",
  "jersey club uk funky",
  "jersey club vogue",
  // ── Trending ──
  "jersey club viral",
  "jersey club tiktok",
  "jersey club trending",
  "jersey club premiere",
];

const SC_NEW_RELEASE_QUERIES = [
  "jersey club 2026",
  "new jersey club 2026",
  "jersey club latest",
  "jersey club new drop",
  "jersey club fresh 2025 2026",
  "jersey club premiere 2026",
  "jersey club brand new",
  "jersey club just released",
];

// ═══════════════════════════════════════════════════════════════════════════════
//  CURATED CROSS-PLATFORM CATALOG
//  Known Jersey Club tracks from Spotify & Apple Music playlists.
//  Each entry generates a targeted YouTube search to find the exact track.
//  This bridges the gap between streaming platforms and our YT/SC playback.
// ═══════════════════════════════════════════════════════════════════════════════
const CROSS_PLATFORM_CATALOG = [
  // ── Spotify "Jersey Club Essentials" + Apple Music "Jersey Club Hits" ──
  { artist: "DJ Sliink", title: "Vibrations" },
  { artist: "DJ Sliink", title: "Put It Down" },
  { artist: "DJ Sliink", title: "Higher" },
  { artist: "DJ Sliink", title: "Heads Up" },
  { artist: "DJ Sliink", title: "All I Know" },
  { artist: "DJ Sliink", title: "Run Up" },
  { artist: "DJ Sliink ft. Fatman Scoop", title: "Bounce" },
  { artist: "DJ Tameil", title: "NWK 2 BMORE" },
  { artist: "DJ Tameil", title: "Tameil Certified" },
  { artist: "DJ Tameil", title: "Jersey Bounce Anthem" },
  { artist: "DJ Tameil", title: "Club Life" },
  { artist: "DJ Tameil", title: "Get Ready" },
  { artist: "DJ Bavgate", title: "All I Need" },
  { artist: "DJ Bavgate", title: "Lit Bounce" },
  { artist: "DJ Bavgate", title: "Club Heaterz" },
  { artist: "DJ Bavgate", title: "Jersey Nights" },
  { artist: "Jayhood", title: "Jersey Streets" },
  { artist: "Jayhood", title: "Shake" },
  { artist: "Jayhood", title: "Ride Out" },
  { artist: "Nadus", title: "Nxwxrk" },
  { artist: "Nadus", title: "Count On Me" },
  { artist: "Nadus", title: "Broke" },
  { artist: "Trippy Turtle", title: "Jersey Bounce" },
  { artist: "Trippy Turtle", title: "You Make Me Feel So" },
  { artist: "Tim Dolla", title: "Work" },
  { artist: "Tim Dolla", title: "Do It Again" },
  { artist: "DJ Smallz 732", title: "Jersey Club Mix" },
  { artist: "DJ Smallz 732", title: "Bounce That" },
  { artist: "DJ Smallz 732", title: "Club Bangers" },
  { artist: "DJ Lil Man", title: "Jersey Club Anthem" },
  { artist: "DJ Lil Man", title: "Back It Up" },
  { artist: "DJ Technics", title: "Baltimore Club Banger" },
  { artist: "DJ Technics", title: "Get Low" },
  { artist: "DJ Tray", title: "Jersey Bounce" },
  { artist: "4B", title: "Jersey Club Remix" },
  { artist: "4B", title: "Whistle" },
  { artist: "4B x Aazar", title: "Pop Dat" },
  { artist: "Cashmere Cat", title: "Mirror Maru" },
  { artist: "Cashmere Cat", title: "Rice Rain" },
  { artist: "R3LL", title: "Jersey Club Original" },
  { artist: "R3LL", title: "Drop It" },
  { artist: "Mike Cervello", title: "Party Starter" },
  { artist: "Ookay", title: "Thief" },
  { artist: "DJ Rondell", title: "Club Banger" },
  { artist: "Roddyrod", title: "Jersey Club Freestyle" },
  { artist: "Brick Bandits", title: "Brick City" },
  // ── Apple Music "Jersey Club Radio" station rotation ──
  { artist: "DJ Sliink", title: "Lemonade jersey club" },
  { artist: "DJ Tameil", title: "Dollar and a Dream" },
  { artist: "Nadus", title: "Milli" },
  { artist: "DJ Smallz 732", title: "Touch The Sky" },
  { artist: "4B", title: "Ice Cold jersey club" },
  { artist: "DJ Sliink", title: "Prowler" },
  { artist: "Trippy Turtle", title: "How Does It Feel" },
  // ── Spotify "Jersey Club Bounce" playlist ──
  { artist: "DJ Tameil", title: "Heat Check" },
  { artist: "DJ Bavgate", title: "Bounce With Me" },
  { artist: "Jayhood", title: "We Outside" },
  { artist: "DJ Lil Man", title: "Jersey Vibes" },
  { artist: "DJ Sliink", title: "Diploma" },
  { artist: "DJ Sliink", title: "Actin' Up" },
  // ── Cross-genre Jersey Club remixes (Spotify discovery) ──
  { artist: "jersey club", title: "Beyonce remix jersey club" },
  { artist: "jersey club", title: "Drake jersey club remix" },
  { artist: "jersey club", title: "SZA jersey club remix" },
  { artist: "jersey club", title: "Kendrick Lamar jersey club remix" },
  { artist: "jersey club", title: "Doja Cat jersey club remix" },
  { artist: "jersey club", title: "Megan Thee Stallion jersey club remix" },
  { artist: "jersey club", title: "Chris Brown jersey club remix" },
  { artist: "jersey club", title: "GloRilla jersey club remix" },
  { artist: "jersey club", title: "Ice Spice jersey club remix" },
  { artist: "jersey club", title: "Usher jersey club remix" },
  { artist: "jersey club", title: "Nicki Minaj jersey club remix" },
  { artist: "jersey club", title: "Cardi B jersey club remix" },
  { artist: "jersey club", title: "Tyla jersey club remix" },
  { artist: "jersey club", title: "Sexyy Red jersey club remix" },
];

// Generate YouTube search queries from the curated catalog
// Picks a random subset each refresh to keep things fresh
function getCatalogSearchQueries(count: number): string[] {
  const shuffled = [...CROSS_PLATFORM_CATALOG].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(entry => {
    // For generic "jersey club" artist entries, just use the title as-is
    if (entry.artist === "jersey club") return entry.title;
    return `${entry.artist} ${entry.title}`;
  });
}

// Fallback curated URLs — used only when dynamic SC search is unavailable
const SOUNDCLOUD_FALLBACK_URLS = [
  "https://soundcloud.com/djtameil/sets/jersey-club-music",
  "https://soundcloud.com/djsliink/dj-sliink-run-up",
  "https://soundcloud.com/djsliink/dj-sliink-put-it-down",
  "https://soundcloud.com/djsliink/dj-sliink-vibrations",
  "https://soundcloud.com/djsliink/higher",
  "https://soundcloud.com/djsliink/all-i-know-dj-sliink",
  "https://soundcloud.com/djsliink/dj-sliink-heads-up",
  "https://soundcloud.com/djbavgate/all-i-need",
  "https://soundcloud.com/djbavgate/lit-bounce",
  "https://soundcloud.com/djbavgate/club-heaterz",
  "https://soundcloud.com/djtameil/jersey-bounce-anthem",
  "https://soundcloud.com/djtameil/tameil-certified",
  "https://soundcloud.com/djtameil/nwk-2-bmore",
  "https://soundcloud.com/jayhood/jersey-streets",
  "https://soundcloud.com/jayhood/jayhood-shake",
  "https://soundcloud.com/jayhood/ride-out-jersey-club",
  "https://soundcloud.com/r-i-p-cd/cashmere-jersey-club-type-beat",
  "https://soundcloud.com/r-i-p-cd/dont-want-it-jersey-club-type-beat",
  "https://soundcloud.com/r-i-p-cd/the-anthem-jersey-club-type-beat",
  "https://soundcloud.com/trippy-turtle/trippy-turtle-jersey-bounce",
  "https://soundcloud.com/trippy-turtle/you-make-me-feel-so-jersey",
];

// ─── SoundCloud client_id extraction ────────────────────────────────────────
// Dynamically extracts a client_id from SoundCloud's website JS bundles.
// Cached in-memory + KV for 12 hours.
let cachedSCClientId: { id: string; fetchedAt: number } | null = null;
const SC_CLIENT_ID_TTL = 12 * 60 * 60 * 1000;

async function getSCClientId(): Promise<string | null> {
  if (cachedSCClientId && Date.now() - cachedSCClientId.fetchedAt < SC_CLIENT_ID_TTL) {
    return cachedSCClientId.id;
  }
  try {
    const kvCached = (await kv.get('sc_client_id_cache')) as any;
    if (kvCached && Date.now() - new Date(kvCached.fetchedAt).getTime() < SC_CLIENT_ID_TTL) {
      cachedSCClientId = { id: kvCached.id, fetchedAt: new Date(kvCached.fetchedAt).getTime() };
      return kvCached.id;
    }
  } catch { }

  try {
    console.log('[SC] Extracting fresh client_id from SoundCloud...');
    const pageRes = await fetch('https://soundcloud.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!pageRes.ok) { console.log('[SC] Page fetch failed:', pageRes.status); return null; }
    const html = await pageRes.text();

    const scriptUrls = [...html.matchAll(/src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g)].map(m => m[1]);
    if (scriptUrls.length === 0) { console.log('[SC] No script URLs found'); return null; }

    for (const url of scriptUrls.slice(-5).reverse()) {
      try {
        const scriptRes = await fetch(url, {
          signal: AbortSignal.timeout(8000),
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        });
        const scriptText = await scriptRes.text();
        const match = scriptText.match(/client_id\s*[:=]\s*"([a-zA-Z0-9]{20,40})"/);
        if (match) {
          const clientId = match[1];
          cachedSCClientId = { id: clientId, fetchedAt: Date.now() };
          await kv.set('sc_client_id_cache', { id: clientId, fetchedAt: new Date().toISOString() });
          console.log('[SC] Extracted client_id:', clientId.slice(0, 8) + '...');
          return clientId;
        }
      } catch (e) { console.log('[SC] Script fetch error:', e); }
    }
    console.log('[SC] client_id not found in bundles');
    return null;
  } catch (e) {
    console.log('[SC] getSCClientId error:', e);
    return null;
  }
}

// ─── SoundCloud API v2 search ───────────────────────────────────────────────
async function searchSoundCloud(query: string, clientId: string, limit = 20): Promise<any[]> {
  try {
    const url = `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${clientId}&limit=${limit}&offset=0&linked_partitioning=1`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!res.ok) { console.log('[SC] Search API error:', res.status); return []; }
    const data = await res.json();
    return (data.collection || [])
      .filter((t: any) => t.permalink_url && t.streamable !== false)
      .map((t: any) => {
        const artworkUrl = (t.artwork_url || t.user?.avatar_url || '').replace('-large', '-t500x500');
        return {
          id: { videoId: `sc_${t.id}` },
          snippet: {
            title: t.title || 'Unknown Track',
            channelTitle: t.user?.username || 'SoundCloud Artist',
            description: t.description || '',
            publishedAt: t.created_at || new Date().toISOString(),
            thumbnails: {
              default: { url: artworkUrl },
              medium: { url: artworkUrl },
              high: { url: artworkUrl },
            },
          },
          source: 'soundcloud' as const,
          soundcloudUrl: t.permalink_url,
        };
      });
  } catch (e) {
    console.log('[SC] searchSoundCloud error:', e);
    return [];
  }
}

// Fetch SC tracks using rotating query pool — ALL queries fired in parallel
async function fetchSCItems(queries: string[], clientId: string, maxPerQuery = 15): Promise<any[]> {
  const results = await Promise.allSettled(
    queries.map(async (query) => {
      try {
        return await searchSoundCloud(query, clientId, maxPerQuery);
      } catch (e) {
        console.log('[SC] Query fetch error:', query, e);
        return [];
      }
    })
  );
  const allItems: any[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (r.status === 'fulfilled') {
      for (const item of r.value) {
        if (item.id?.videoId && !seen.has(item.id.videoId)) {
          seen.add(item.id.videoId);
          allItems.push(item);
        }
      }
    }
  }
  return allItems;
}

// ─── SoundCloud Playlist Resolver ───────────────────────────────────────────
// Resolves a SoundCloud playlist/set URL into individual tracks via API v2.
// This is the PRIMARY track source — the user's curated playlist.
const CURATED_SC_PLAYLIST = "https://soundcloud.com/jersey-club-radio/sets/jersey-club-radio";

async function fetchSCPlaylist(playlistUrl: string, clientId: string): Promise<any[]> {
  try {
    console.log('[SC Playlist] Resolving:', playlistUrl);
    const resolveUrl = `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(playlistUrl)}&client_id=${clientId}`;
    const res = await fetch(resolveUrl, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!res.ok) {
      console.log('[SC Playlist] Resolve failed:', res.status);
      return [];
    }
    const data = await res.json();

    // data.tracks is the ORDERED list from the playlist.
    // Some entries are full objects, others are stubs with just { id }.
    // We MUST preserve the original playlist order exactly.
    const rawTracks: any[] = data.tracks || [];
    console.log(`[SC Playlist] Found ${rawTracks.length} tracks in playlist`);

    // Index full tracks by ID; collect stub IDs for hydration
    const trackById = new Map<number, any>();
    const stubIds: number[] = [];

    for (const t of rawTracks) {
      if (t.title && t.permalink_url) {
        trackById.set(t.id, t);
      } else if (t.id) {
        stubIds.push(t.id);
      }
    }

    // Hydrate stubs in parallel batches of 50
    if (stubIds.length > 0) {
      console.log(`[SC Playlist] Hydrating ${stubIds.length} stub tracks...`);
      const batchSize = 50;
      const batchPromises: Promise<void>[] = [];
      for (let i = 0; i < stubIds.length; i += batchSize) {
        const batch = stubIds.slice(i, i + batchSize);
        batchPromises.push((async () => {
          const idsParam = batch.join(',');
          try {
            const hydrateUrl = `https://api-v2.soundcloud.com/tracks?ids=${idsParam}&client_id=${clientId}`;
            const hydrateRes = await fetch(hydrateUrl, {
              signal: AbortSignal.timeout(10000),
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            });
            if (hydrateRes.ok) {
              const hydrated = await hydrateRes.json();
              if (Array.isArray(hydrated)) {
                for (const h of hydrated) {
                  if (h.id) trackById.set(h.id, h);
                }
              }
            }
          } catch (e) {
            console.log('[SC Playlist] Hydration batch error:', e);
          }
        })());
      }
      await Promise.all(batchPromises);
    }

    // Walk rawTracks IN ORIGINAL PLAYLIST ORDER — look up each by ID
    const converted: any[] = [];
    let skipped = 0;
    for (const raw of rawTracks) {
      const t = trackById.get(raw.id);
      if (!t || !t.permalink_url || t.streamable === false) {
        skipped++;
        continue;
      }
      const artworkUrl = (t.artwork_url || t.user?.avatar_url || '').replace('-large', '-t500x500');
      converted.push({
        id: { videoId: `sc_${t.id}` },
        snippet: {
          title: t.title || 'Unknown Track',
          channelTitle: t.user?.username || 'SoundCloud Artist',
          description: t.description || '',
          publishedAt: t.created_at || new Date().toISOString(),
          thumbnails: {
            default: { url: artworkUrl },
            medium: { url: artworkUrl },
            high: { url: artworkUrl },
          },
        },
        source: 'soundcloud' as const,
        soundcloudUrl: t.permalink_url,
      });
    }

    console.log(`[SC Playlist] Converted ${converted.length} playable tracks in playlist order (${skipped} skipped)`);
    return converted;
  } catch (e) {
    console.log('[SC Playlist] fetchSCPlaylist error:', e);
    return [];
  }
}

// Fallback: resolves curated URLs via oEmbed (no API key needed)
async function resolveSoundCloudTrack(scUrl: string): Promise<any | null> {
  try {
    const oembedUrl = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(scUrl)}`;
    const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = await res.json();
    const scId = 'sc_' + scUrl.replace(/[^a-zA-Z0-9]/g, '').slice(-20);
    return {
      id: { videoId: scId },
      snippet: {
        title: data.title || 'Unknown Track',
        channelTitle: data.author_name || 'SoundCloud Artist',
        description: data.description || '',
        publishedAt: new Date().toISOString(),
        thumbnails: {
          default: { url: data.thumbnail_url || '' },
          medium: { url: data.thumbnail_url || '' },
          high: { url: data.thumbnail_url || '' },
        },
      },
      source: 'soundcloud',
      soundcloudUrl: scUrl,
    };
  } catch (e) {
    console.log('[SC] oEmbed fallback error for', scUrl, e);
    return null;
  }
}

app.get("/make-server-715f71b9/health", (c) => c.json({ status: "ok" }));

// ── Genre filter — block non-Jersey-Club tracks at the server level ──────────
const JERSEY_INDICATORS_SERVER = ['jersey club', 'jersey', 'jc ', 'jc-', 'jclub', 'newark club', 'brick bandits', 'sliink'];
const BLOCKED_GENRE_RE_SERVER: RegExp[] = [
  /\btech\s*house\b/i, /\blatin\s*house\b/i, /\bdeep\s*house\b/i,
  /\bfuture\s*house\b/i, /\bprogressive\s*house\b/i, /\bbass\s*house\b/i,
  /\bhouse\s*music\b/i,
  /\b(?:afro|tribal|acid|minimal|soulful|melodic|organic)\s*house\b/i,
  /\b(?:edm|electronic\s*dance|electronic\s*music)\b/i,
  /\btechno\b/i,
  /\blo[\s-]?fi\b/i, /\blofi\b/i,
  /\btrap\s*(?:music|beat|mix|nation|city|type)\b/i,
  /\bdrill\s*(?:music|beat|mix|type|rap)\b/i,
  /\b(?:r&b|rnb|r\s*and\s*b)\s*(?:music|mix|vibes?|soul|slow\s*jam)/i,
  /\bamapiano\b/i,
  /\buk\s*garage\b/i, /\bukg\b/i,
];

function isBlockedGenreServer(title: string, channel: string): boolean {
  const combined = `${title} ${channel}`.toLowerCase();
  if (JERSEY_INDICATORS_SERVER.some(ind => combined.includes(ind))) return false;
  return BLOCKED_GENRE_RE_SERVER.some(re => re.test(combined));
}

// Get cached tracks — return the 100 most recent, genre-filtered
app.get("/make-server-715f71b9/tracks", async (c) => {
  try {
    let allTracks = ((await kv.get("jc_tracks_v2")) as any[]) || [];
    const newReleases = ((await kv.get("jc_new_releases_v2")) as any[]) || [];
    const lastRefresh = await kv.get("jc_last_refresh_v2") as string | null;

    // Auto-sync SC playlist order when cache is stale (older than 1 hour).
    // This keeps the website in sync whenever the curated SoundCloud playlist
    // has tracks added, removed, or reordered by the station owner.
    const STALE_MS = 60 * 60 * 1000; // 1 hour
    const isStale = !lastRefresh || (Date.now() - new Date(lastRefresh).getTime() > STALE_MS);
    if (isStale) {
      try {
        const scClientId = await getSCClientId();
        if (scClientId) {
          const freshSC = await fetchSCPlaylist(CURATED_SC_PLAYLIST, scClientId);
          if (freshSC.length > 0) {
            // Rebuild cache: fresh SC tracks in exact playlist order, keep YouTube supplement
            const ytTracks = allTracks.filter((t: any) => t.source !== 'soundcloud');
            const syncedCache = [...freshSC, ...ytTracks.slice(0, Math.max(0, 150 - freshSC.length))];
            await kv.set("jc_tracks_v2", syncedCache);
            await kv.set("jc_last_refresh_v2", new Date().toISOString());
            allTracks = syncedCache;
            console.log(`[SC Sync] Auto-synced ${freshSC.length} SC tracks in playlist order`);
          }
        }
      } catch (syncErr) {
        console.log('[SC Sync] Auto-sync failed (non-fatal):', syncErr);
      }
    }

    // Retroactive genre filter on cached tracks — skip for curated SoundCloud playlist tracks
    const filtered = allTracks.filter((t: any) =>
      t.source === 'soundcloud' || !isBlockedGenreServer(t.snippet?.title || '', t.snippet?.channelTitle || '')
    );
    let tracks = filtered.slice(0, 100);

    // Merge in custom cover art URLs from KV map
    const coverArtMap = ((await kv.get('jc_cover_art_v1')) as Record<string, string>) || {};
    tracks = tracks.map((t: any) => {
      const id = t.id?.videoId || t.videoId || t.id || '';
      return id && coverArtMap[id] ? { ...t, coverArtUrl: coverArtMap[id] } : t;
    });

    const filteredNR = newReleases.filter((t: any) =>
      !isBlockedGenreServer(t.snippet?.title || '', t.snippet?.channelTitle || '')
    );
    return c.json({
      tracks,
      newReleases: filteredNR,
      lastRefresh: lastRefresh || null,
      totalCached: allTracks.length,
      filteredCount: filtered.length,
    });
  } catch (error) {
    console.log("Get tracks error:", error);
    return c.json({ error: "Failed to get tracks", details: String(error) }, 500);
  }
});

// Full refresh — resets the query rotation index and fetches fresh tracks
app.post("/make-server-715f71b9/tracks/refresh", async (c) => {
  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) return c.json({ error: "YouTube API key not configured" }, 500);

  try {
    // Reset both rotation indices on manual refresh
    await kv.set("jc_query_index", 0);
    await kv.set("jc_sc_query_index", 0);

    // Fire ALL queries in parallel for speed (avoids Edge Function timeouts)
    const fetchItems = async (queries: string[], order = "relevance", maxPerQuery = 15) => {
      const results = await Promise.allSettled(
        queries.map(async (query) => {
          try {
            const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=${maxPerQuery}&order=${order}&key=${apiKey}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
            const data = await res.json();
            if (data.error) {
              console.log("YouTube API error:", query, JSON.stringify(data.error));
              return [];
            }
            return (data.items || []).map((item: any) => ({ ...item, source: 'youtube' }));
          } catch (e) {
            console.log("Query fetch error:", query, e);
            return [];
          }
        })
      );
      const allItems: any[] = [];
      const seen = new Set<string>();
      for (const r of results) {
        if (r.status === 'fulfilled') {
          for (const item of r.value) {
            if (item.id?.videoId && !seen.has(item.id.videoId)) {
              // Server-side genre filter — block non-JC genres before caching
              const title = item.snippet?.title || '';
              const channel = item.snippet?.channelTitle || '';
              if (isBlockedGenreServer(title, channel)) continue;
              seen.add(item.id.videoId);
              allItems.push(item);
            }
          }
        }
      }
      return allItems;
    };

    // ── PRIMARY SOURCE: Curated SoundCloud playlist ───────────────────────────
    // The user's hand-picked playlist is the core of the radio station.
    // YouTube search + SC search are used as supplements to fill toward 100.
    const scClientId = await getSCClientId();

    const [curatedTracks, ytTracks, newReleases] = await Promise.all([
      // Phase 1: Curated SoundCloud playlist (primary)
      (async () => {
        if (!scClientId) {
          console.log('[SC Playlist] No client_id — falling back to curated URLs');
          const resolved = await Promise.all(SOUNDCLOUD_FALLBACK_URLS.map(resolveSoundCloudTrack));
          return resolved.filter(Boolean) as any[];
        }
        return await fetchSCPlaylist(CURATED_SC_PLAYLIST, scClientId);
      })(),
      // Phase 2: YouTube supplement (only fires in parallel)
      (async () => {
        const shuffledPool = [...QUERY_POOL].sort(() => Math.random() - 0.5);
        const initialQueries = shuffledPool.slice(0, 8);
        return await fetchItems(initialQueries, "relevance");
      })(),
      // Phase 3: New releases from YouTube
      fetchItems(NEW_RELEASE_QUERIES, "date", 10),
    ]);

    console.log(`[SC Playlist] Curated playlist: ${curatedTracks.length} tracks`);
    console.log(`[YT] Supplement search: ${ytTracks.length} tracks`);

    // ── Merge: curated playlist first, then YouTube supplement ───────────────
    // Curated tracks take priority — YouTube fills toward the 100-track target
    const seenIds = new Set(curatedTracks.map((t: any) => t.id.videoId));
    const ytSupplement = ytTracks.filter((t: any) => !seenIds.has(t.id.videoId));

    const mixedTracks = [...curatedTracks, ...ytSupplement];
    console.log(`[REFRESH] Total: ${mixedTracks.length} tracks (Curated SC: ${curatedTracks.length}, YT supplement: ${ytSupplement.length})`);

    // Keep only the latest 100 tracks to avoid unbounded growth
    const finalTracks = mixedTracks.slice(0, 100);
    await kv.set("jc_tracks_v2", finalTracks);
    await kv.set("jc_new_releases_v2", newReleases);
    await kv.set("jc_last_refresh_v2", new Date().toISOString());
    await kv.set("jc_query_index", 8);
    await kv.set("jc_catalog_index", 0);

    return c.json({
      success: true,
      trackCount: finalTracks.length,
      newReleasesCount: newReleases.length,
      sources: { curatedPlaylist: curatedTracks.length, youtube: ytSupplement.length },
    });
  } catch (error) {
    console.log("Refresh error:", error);
    return c.json({ error: "Failed to refresh", details: String(error) }, 500);
  }
});

// Fetch MORE tracks — called automatically when playlist is running low.
// Rotates through YouTube QUERY_POOL, Cross-Platform Catalog, and SC_QUERY_POOL.
app.post("/make-server-715f71b9/tracks/more", async (c) => {
  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) return c.json({ error: "YouTube API key not configured" }, 500);

  try {
    const body = await c.req.json().catch(() => ({}));
    const existingIds: string[] = body.existingIds || [];
    const existingSet = new Set<string>(existingIds);

    // ─── PRIMARY: Re-fetch curated SoundCloud playlist for missing tracks ──
    const scClientId = await getSCClientId();
    let curatedNewTracks: any[] = [];
    if (scClientId) {
      const curatedAll = await fetchSCPlaylist(CURATED_SC_PLAYLIST, scClientId);
      curatedNewTracks = curatedAll.filter(t => !existingSet.has(t.id.videoId));
      for (const t of curatedNewTracks) existingSet.add(t.id.videoId);
      console.log(`[SC Playlist] Found ${curatedNewTracks.length} new tracks from curated playlist`);
    }

    // ─── YouTube rotation (supplement) ────────────────────────────────────
    const queryIndex = ((await kv.get("jc_query_index")) as number) || 0;
    const query = QUERY_POOL[queryIndex % QUERY_POOL.length];
    const nextIndex = (queryIndex + 1) % QUERY_POOL.length;

    console.log(`[YT] Fetching more tracks with query [${queryIndex}]: "${query}"`);

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&videoCategoryId=10&maxResults=20&order=relevance&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();

    let ytNewTracks: any[] = [];
    if (data.items) {
      ytNewTracks = data.items
        .filter((item: any) => item.id?.videoId && !existingSet.has(item.id.videoId))
        .filter((item: any) => !isBlockedGenreServer(item.snippet?.title || '', item.snippet?.channelTitle || ''))
        .map((item: any) => ({ ...item, source: 'youtube' }));
    } else {
      console.log("[YT] No items returned, YouTube error:", JSON.stringify(data.error || data));
    }
    await kv.set("jc_query_index", nextIndex);

    // Merge: curated playlist first, then YouTube supplement
    const allNewTracks = [...curatedNewTracks, ...ytNewTracks];
    console.log(`[MORE] Total: ${allNewTracks.length} new tracks (Curated SC: ${curatedNewTracks.length}, YT: ${ytNewTracks.length})`);

    // Append to persistent cache.
    // SC playlist tracks are NEVER dropped — they're curated and bounded in size.
    // Only the YouTube supplement is capped to prevent unbounded growth.
    const cached = ((await kv.get("jc_tracks_v2")) as any[]) || [];
    const cachedIds = new Set(cached.map((t: any) => t.id?.videoId));
    const toAdd = allNewTracks.filter((t: any) => !cachedIds.has(t.id.videoId));
    if (toAdd.length > 0) {
      const allCombined = [...cached, ...toAdd];
      const allSC = allCombined.filter((t: any) => t.source === 'soundcloud');
      const allYT = allCombined.filter((t: any) => t.source !== 'soundcloud');
      const maxYT = Math.max(0, 150 - allSC.length);
      const merged = [...allSC, ...allYT.slice(-maxYT)];
      await kv.set("jc_tracks_v2", merged);
    }

    return c.json({
      tracks: allNewTracks,
      query,
      nextQueryIndex: nextIndex,
      newCount: allNewTracks.length,
      sources: { curatedPlaylist: curatedNewTracks.length, youtube: ytNewTracks.length },
    });
  } catch (error) {
    console.log("Fetch more error:", error);
    return c.json({ error: "Failed to fetch more tracks", details: String(error) }, 500);
  }
});

// Resolve a SoundCloud track to a fresh progressive MP3 stream URL.
// Called by the client just before playback — CDN URLs are time-limited so we
// always fetch a fresh one rather than caching.
app.get("/make-server-715f71b9/sc-stream", async (c) => {
  const trackId = c.req.query("id"); // numeric part of "sc_XXXXXXXX"
  if (!trackId) return c.json({ error: "Missing id" }, 400);
  const scClientId = await getSCClientId();
  if (!scClientId) return c.json({ error: "No SC client_id available" }, 503);
  try {
    // Fetch track object (includes media.transcodings)
    const trackRes = await fetch(
      `https://api-v2.soundcloud.com/tracks?ids=${trackId}&client_id=${scClientId}`,
      { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!trackRes.ok) return c.json({ error: "SC API error" }, 502);
    const tracks = await trackRes.json();
    const track = Array.isArray(tracks) ? tracks[0] : null;
    if (!track) return c.json({ error: "Track not found" }, 404);

    // Prefer progressive (MP3) over HLS for maximum Web Audio API compatibility
    const progressive = track.media?.transcodings?.find(
      (t: any) => t.format?.protocol === 'progressive' && !t.snipped
    );
    if (!progressive) return c.json({ error: "No progressive stream available" }, 404);

    // Resolve transcoding URL → actual CDN URL
    const streamRes = await fetch(
      `${progressive.url}?client_id=${scClientId}`,
      { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!streamRes.ok) return c.json({ error: "Stream resolve failed" }, 502);
    const streamData = await streamRes.json();
    if (!streamData.url) return c.json({ error: "No stream URL in response" }, 502);

    return c.json({ url: streamData.url });
  } catch (e) {
    console.log('[SC Stream] error:', e);
    return c.json({ error: "Failed to resolve stream" }, 500);
  }
});

// Search YouTube directly
app.get("/make-server-715f71b9/search", async (c) => {
  const query = c.req.query("q") || "";
  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) return c.json({ error: "YouTube API key not configured" }, 500);
  try {
    const searchQuery = `jersey club ${query}`.trim();
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&videoCategoryId=10&maxResults=24&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) return c.json({ error: "YouTube API error", details: data }, res.status);
    return c.json(data.items || []);
  } catch (error) {
    console.log("Search error:", error);
    return c.json({ error: "Search failed", details: String(error) }, 500);
  }
});

// ─── GAME LEADERBOARD ───────────────────────────────────────────────────────

// ─── EVENTS / FLYERS ─────────────────────────────────────────────────────────

interface Flyer {
  id: string;
  title: string;
  venue: string;
  city: string;
  state: string;
  country: string;
  date: string;        // "YYYY-MM-DD" — date only, avoids timezone ambiguity
  time: string;        // "10:00 PM"
  djs: string[];
  genres: string[];
  price: string;
  ticketUrl: string;
  description: string;
  submittedBy: string;
  approved: boolean;
  featured: boolean;
  createdAt: string;
}

// Seed data — real-looking Jersey Club events across core cities
const SEED_FLYERS: Flyer[] = [
  {
    id: 'seed_1', approved: true, featured: true,
    title: 'Jersey Club Fridays', venue: 'Club Excess', city: 'Newark', state: 'NJ', country: 'US',
    date: '2026-03-06', time: '10:00 PM', djs: ['DJ Tameil', 'DJ Bavgate', 'DJ Rondell'],
    genres: ['Jersey Club', 'Bounce'], price: '$15 adv · $20 door',
    ticketUrl: 'https://jerseyclub247.com/tickets', description: 'The original Jersey Club night returns to Newark. Three legendary DJs, one floor, zero excuses.',
    submittedBy: 'admin', createdAt: new Date().toISOString(),
  },
  {
    id: 'seed_2', approved: true, featured: false,
    title: 'B-More vs Jersey Clash', venue: '1722 Club', city: 'Baltimore', state: 'MD', country: 'US',
    date: '2026-03-13', time: '9:00 PM', djs: ['DJ Sliink', 'DJ Technics', 'Jayhood'],
    genres: ['Jersey Club', 'B-More Bounce'], price: '$12 adv · $18 door',
    ticketUrl: 'https://jerseyclub247.com/tickets', description: 'Baltimore meets Newark in the ultimate club clash. Sister cities, one dance floor — who runs it?',
    submittedBy: 'admin', createdAt: new Date().toISOString(),
  },
  {
    id: 'seed_3', approved: true, featured: false,
    title: 'All Jersey Everything', venue: 'Santos Party House', city: 'New York', state: 'NY', country: 'US',
    date: '2026-03-20', time: '11:00 PM', djs: ['DJ Bavgate', 'DJ Tameil'],
    genres: ['Jersey Club', 'Drill'], price: '$20 adv · $25 door',
    ticketUrl: 'https://jerseyclub247.com/tickets', description: 'NYC gets educated. Jersey Club takes over Santos for a night you won\'t forget.',
    submittedBy: 'admin', createdAt: new Date().toISOString(),
  },
  {
    id: 'seed_4', approved: true, featured: false,
    title: 'Philly Club Takeover', venue: 'Underground Arts', city: 'Philadelphia', state: 'PA', country: 'US',
    date: '2026-03-27', time: '9:30 PM', djs: ['DJ Rondell', 'Special Guest TBA'],
    genres: ['Jersey Club', 'Philly Club'], price: '$10 adv · $15 door',
    ticketUrl: 'https://jerseyclub247.com/tickets', description: 'Philly shows out for its own. Fast-paced, chopped heavy — this is what the Delaware Valley sounds like.',
    submittedBy: 'admin', createdAt: new Date().toISOString(),
  },
  {
    id: 'seed_5', approved: true, featured: true,
    title: 'Jersey Club London', venue: 'Fabric', city: 'London', state: '', country: 'UK',
    date: '2026-04-03', time: '11:00 PM', djs: ['DJ Tameil', 'Mura Masa (DJ Set)', 'Jayhood'],
    genres: ['Jersey Club', 'UK Club'], price: '£15 adv · £22 door',
    ticketUrl: 'https://jerseyclub247.com/tickets', description: 'Newark comes to London. Fabric opens its legendary room 1 to the original Jersey Club sound.',
    submittedBy: 'admin', createdAt: new Date().toISOString(),
  },
  {
    id: 'seed_6', approved: true, featured: false,
    title: 'Garden State Takeover', venue: 'The Stone Pony', city: 'Asbury Park', state: 'NJ', country: 'US',
    date: '2026-04-10', time: '9:00 PM', djs: ['DJ Sliink', 'DJ Bavgate'],
    genres: ['Jersey Club', 'Shore Scene'], price: '$18 adv · $25 door',
    ticketUrl: 'https://jerseyclub247.com/tickets', description: 'The Shore lights up. Jersey Club hits the legendary Stone Pony for a full-capacity summer warm-up.',
    submittedBy: 'admin', createdAt: new Date().toISOString(),
  },
  {
    id: 'seed_7', approved: true, featured: false,
    title: 'Club 24/7 Showcase', venue: 'Brooklyn Mirage', city: 'Brooklyn', state: 'NY', country: 'US',
    date: '2026-04-18', time: '10:00 PM', djs: ['DJ Tameil', 'DJ Rondell', 'DJ Technics', 'Jayhood'],
    genres: ['Jersey Club', 'NYC Club'], price: '$25 adv · $35 door',
    ticketUrl: 'https://jerseyclub247.com/tickets', description: 'Four legends. One outdoor stage. The biggest Jersey Club event ever staged in Brooklyn.',
    submittedBy: 'admin', createdAt: new Date().toISOString(),
  },
  {
    id: 'seed_8', approved: true, featured: false,
    title: 'Tri-State Club Night', venue: 'Revel Atlantic City', city: 'Atlantic City', state: 'NJ', country: 'US',
    date: '2026-05-01', time: '10:30 PM', djs: ['DJ Sliink', 'Roddyrod', 'Special Guest'],
    genres: ['Jersey Club', 'Bounce', 'Trap'], price: '$22 adv · $30 door',
    ticketUrl: 'https://jerseyclub247.com/tickets', description: 'Casino floor meets club floor. AC goes hard for a massive May Day Jersey Club bash.',
    submittedBy: 'admin', createdAt: new Date().toISOString(),
  },
  // Past events (for "Show Past Events" toggle)
  {
    id: 'past_1', approved: true, featured: false,
    title: "Valentine's Day Jersey", venue: 'Club Excess', city: 'Newark', state: 'NJ', country: 'US',
    date: '2026-02-14', time: '9:00 PM', djs: ['DJ Bavgate', 'DJ Tameil'],
    genres: ['Jersey Club'], price: '$20', ticketUrl: '',
    description: "The most romantic Jersey Club night of the year.", submittedBy: 'admin', createdAt: new Date().toISOString(),
  },
  {
    id: 'past_2', approved: true, featured: false,
    title: "New Year's Club Night", venue: 'Echostage', city: 'Washington', state: 'DC', country: 'US',
    date: '2026-01-01', time: '9:00 PM', djs: ['DJ Tameil', 'DJ Sliink', 'Jayhood'],
    genres: ['Jersey Club', 'B-More'], price: '$30', ticketUrl: '',
    description: "Rang in 2026 with the hardest Jersey Club set of the year.", submittedBy: 'admin', createdAt: new Date().toISOString(),
  },
];

const EVENTS_KV_KEY = 'jc_events_v2';

async function getFlyers(): Promise<Flyer[]> {
  const stored = await kv.get(EVENTS_KV_KEY);
  if (!stored) {
    // First run: seed sample data
    await kv.set(EVENTS_KV_KEY, SEED_FLYERS);
    return SEED_FLYERS;
  }
  return stored as Flyer[];
}

// GET /events — all APPROVED upcoming events (date >= today in UTC)
app.get("/make-server-715f71b9/events", async (c) => {
  try {
    const all = await getFlyers();
    const approved = all.filter((f: Flyer) => f.approved);

    // ── Senior Dev Logic: Only show flyers where date >= today ──────────────
    const todayStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const upcomingFlyers = approved.filter((f: Flyer) => f.date >= todayStr);
    const pastFlyers = approved.filter((f: Flyer) => f.date < todayStr);

    // Sort upcoming soonest-first, past most-recent-first
    upcomingFlyers.sort((a: Flyer, b: Flyer) => a.date.localeCompare(b.date));
    pastFlyers.sort((a: Flyer, b: Flyer) => b.date.localeCompare(a.date));

    return c.json({ upcoming: upcomingFlyers, past: pastFlyers });
  } catch (err) {
    console.log("Events fetch error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// POST /events — submit a new flyer (pending approval)
app.post("/make-server-715f71b9/events", async (c) => {
  try {
    const body = await c.req.json();
    const { title, venue, city, state, country, date, time, djs, genres, price, ticketUrl, description, submittedBy } = body;
    if (!title || !date || !city || !venue) return c.json({ error: 'Missing required fields: title, date, city, venue' }, 400);

    // Validate date is not in the past
    const todayStr = new Date().toISOString().split('T')[0];
    if (date < todayStr) return c.json({ error: 'Cannot submit a flyer for a past date' }, 400);

    const all = await getFlyers();
    const newFlyer: Flyer = {
      id: `flyer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title, venue, city: city.trim(), state: state?.trim() || '', country: country?.trim() || 'US',
      date, time: time || 'TBA', djs: Array.isArray(djs) ? djs : [djs].filter(Boolean),
      genres: Array.isArray(genres) ? genres : ['Jersey Club'],
      price: price || 'TBA', ticketUrl: ticketUrl || '', description: description || '',
      submittedBy: submittedBy || 'anonymous', approved: false, featured: false,
      createdAt: new Date().toISOString(),
    };
    await kv.set(EVENTS_KV_KEY, [...all, newFlyer]);

    // Notify ticker
    await appendTickerEvent(`📅 New event submitted: "${title}" in ${city} on ${date}`);
    return c.json({ success: true, id: newFlyer.id, message: 'Flyer submitted! It will appear after review.' });
  } catch (err) {
    console.log("Event submit error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// POST /events/:id/approve — admin approve/feature a flyer
app.post("/make-server-715f71b9/events/:id/approve", async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    // Admin key check — rejects if ADMIN_KEY env var is unset
    if (!ADMIN_KEY || body.adminKey !== ADMIN_KEY) return c.json({ error: 'Unauthorized' }, 401);
    const all = await getFlyers();
    const updated = all.map((f: Flyer) => f.id === id ? { ...f, approved: true, featured: !!body.featured } : f);
    await kv.set(EVENTS_KV_KEY, updated);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// DELETE /events/:id — remove a flyer (admin only)
app.delete("/make-server-715f71b9/events/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    if (!ADMIN_KEY || body.adminKey !== ADMIN_KEY) return c.json({ error: 'Unauthorized' }, 401);
    const all = await getFlyers();
    await kv.set(EVENTS_KV_KEY, all.filter((f: Flyer) => f.id !== id));
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ─── DAILY CROSSWORD PUZZLE SCHEDULE ────────────────────────────────────────
// Returns today's puzzle index so ALL users see the same daily puzzle.
// Also tracks a per-day cache to avoid re-computing.
app.get("/make-server-715f71b9/games/daily-puzzle", async (c) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const cacheKey = `daily_xword_v3_${today}`;

    const cached = await kv.get(cacheKey);
    if (cached) return c.json(cached);

    // daysSince drives both themeIndex (12 themes = rich variety) and the seed
    const epoch = new Date('2024-01-01').getTime();
    const daysSince = Math.floor((Date.now() - epoch) / 86400000);
    const themeIndex = daysSince % 12;
    // Large-prime multiply ensures two different days never share a seed even if theme repeats
    const seed = ((daysSince * 999983) + 123457) >>> 0;

    const data = { date: today, themeIndex, seed, v: 3 };
    await kv.set(cacheKey, data);
    return c.json(data);
  } catch (err) {
    console.log("Daily puzzle error:", err);
    const epoch = new Date('2024-01-01').getTime();
    const daysSince = Math.floor((Date.now() - epoch) / 86400000);
    return c.json({
      date: new Date().toISOString().split('T')[0],
      themeIndex: daysSince % 12,
      seed: ((daysSince * 999983) + 123457) >>> 0,
      v: 3,
    });
  }
});

// Sync (upsert) a guest player's scores to the global leaderboard
app.post("/make-server-715f71b9/leaderboard/sync", async (c) => {
  try {
    const body = await c.req.json();
    const { guestId, totalScore, spadesWins, blackjackHighScore, crosswordsCompleted } = body;
    if (!guestId) return c.json({ error: "No guestId" }, 400);
    await kv.set(`lb_${guestId}`, {
      guestId, totalScore: totalScore || 0,
      spadesWins: spadesWins || 0,
      blackjackHighScore: blackjackHighScore || 0,
      crosswordsCompleted: crosswordsCompleted || 0,
      updatedAt: new Date().toISOString(),
    });
    return c.json({ success: true });
  } catch (err) {
    console.log("Leaderboard sync error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// Get top 20 leaderboard entries, sorted by totalScore
app.get("/make-server-715f71b9/leaderboard", async (c) => {
  try {
    const entries = await kv.getByPrefix("lb_Guest_");
    const sorted = (entries as any[])
      .filter(Boolean)
      .sort((a: any, b: any) => (b.totalScore || 0) - (a.totalScore || 0))
      .slice(0, 20);
    return c.json(sorted);
  } catch (err) {
    console.log("Leaderboard get error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ─── SPADES ROOM MANAGEMENT ──────────────────────────────────────────────────

const AI_BOSSES = [
  { name: 'The Newark Machine', tagline: 'Undefeated since 2019', discount: 'NWKMACHINE15' },
  { name: 'Ghost of DJ Tameil', tagline: 'Original Jersey Club pioneer — digital form', discount: 'TAMEIL10' },
  { name: 'B-More Executioner', tagline: "Baltimore's hardest export", discount: 'BMORE20' },
  { name: 'The Garden State Ghost', tagline: 'Never loses on home turf', discount: 'GARDEN15' },
  { name: 'DJ Tech-AI', tagline: 'Turntable precision, algorithmic mind', discount: 'DJTECHAI10' },
  { name: 'Brick Bandit Bot', tagline: 'Crew-built, algorithm-tuned, unbeatable', discount: 'BRICKBOT20' },
  { name: 'The Shore Shark', tagline: 'Cleaned out every club from Asbury to Cape May', discount: 'SHORE15' },
];
const BOT_NAMES = ['BAVGATE', 'TAMEIL', 'TECHNICS', 'RONDELL', 'SLIINK', 'JAYHOOD'];

function currentBoss() {
  const epoch = new Date('2024-01-01').getTime();
  const weeksSince = Math.floor((Date.now() - epoch) / (7 * 86400000));
  return AI_BOSSES[weeksSince % AI_BOSSES.length];
}

function makeRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// POST /spades/room — find a waiting room or create one
app.post("/make-server-715f71b9/spades/room", async (c) => {
  try {
    const body = await c.req.json();
    const { guestId, guestName, isBossGame } = body;
    if (!guestId) return c.json({ error: 'No guestId' }, 400);

    // Look for an existing waiting room (not boss-mode for regular, boss for boss-mode)
    const existing = await kv.getByPrefix('spades_room_');
    const available = (existing as any[]).filter(r =>
      r && r.status === 'waiting' &&
      r.isBossGame === !!isBossGame &&
      r.players.length < 4 &&
      !r.players.find((p: any) => p.guestId === guestId)
    );

    if (available.length > 0) {
      const room = available[0];
      room.players.push({
        seat: room.players.length, guestId, name: guestName,
        isBot: false, botDifficulty: 'normal', joinedAt: new Date().toISOString(),
      });
      await kv.set(`spades_room_${room.id}`, room);
      return c.json({ roomId: room.id, isNew: false, players: room.players, bossName: room.bossName });
    }

    // Create new room
    const boss = isBossGame ? currentBoss() : null;
    const roomId = makeRoomId();
    const room = {
      id: roomId,
      status: 'waiting',
      isBossGame: !!isBossGame,
      bossName: boss?.name,
      players: [{
        seat: 0, guestId, name: guestName,
        isBot: false, botDifficulty: 'normal', joinedAt: new Date().toISOString(),
      }],
      createdAt: new Date().toISOString(),
      handCount: 0,
    };
    await kv.set(`spades_room_${roomId}`, room);
    // Expire after 1 hour via metadata (KV doesn't have TTL, so we track it in the record)
    return c.json({ roomId, isNew: true, players: room.players, bossName: boss?.name });
  } catch (err) {
    console.log('Spades room create error:', err);
    return c.json({ error: String(err) }, 500);
  }
});

// GET /spades/room/:id — poll room state
app.get("/make-server-715f71b9/spades/room/:id", async (c) => {
  try {
    const id = c.req.param('id');
    const room = await kv.get(`spades_room_${id}`);
    if (!room) return c.json({ error: 'Room not found' }, 404);
    return c.json(room);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /spades/room/:id/bot-fill — fill remaining seats with bots and start
app.post("/make-server-715f71b9/spades/room/:id/bot-fill", async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const room = (await kv.get(`spades_room_${id}`)) as any;
    if (!room) return c.json({ error: 'Room not found' }, 404);

    for (let seat = 0; seat < 4; seat++) {
      if (!room.players.find((p: any) => p.seat === seat)) {
        const boss = room.isBossGame ? currentBoss() : null;
        room.players.push({
          seat, guestId: `bot_${seat}_${id}`,
          name: boss ? boss.name : BOT_NAMES[seat % BOT_NAMES.length],
          isBot: true,
          botDifficulty: (room.isBossGame && seat % 2 === 1) ? 'pro' : 'normal',
          joinedAt: new Date().toISOString(),
        });
      }
    }
    room.status = 'playing';
    room.startedAt = new Date().toISOString();
    await kv.set(`spades_room_${id}`, room);
    return c.json(room);
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// GET /spades/rooms/open — rooms with bot seats available for hot-swap
app.get("/make-server-715f71b9/spades/rooms/open", async (c) => {
  try {
    const all = await kv.getByPrefix('spades_room_');
    const open = (all as any[]).filter(r =>
      r && r.status === 'playing' &&
      r.players.some((p: any) => p.isBot && !p.hotSwapPending)
    ).map(r => ({
      id: r.id,
      botSeats: r.players.filter((p: any) => p.isBot).length,
      humanSeats: r.players.filter((p: any) => !p.isBot).length,
    }));
    return c.json(open.slice(0, 5));
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /spades/room/:id/hot-join — join as hot-swap candidate
app.post("/make-server-715f71b9/spades/room/:id/hot-join", async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { guestId, guestName } = body;
    const room = (await kv.get(`spades_room_${id}`)) as any;
    if (!room) return c.json({ error: 'Room not found' }, 404);

    // Mark a bot seat as pending hot-swap
    const botSeat = room.players.find((p: any) => p.isBot && !p.hotSwapPending);
    if (!botSeat) return c.json({ error: 'No bot seats available' }, 409);

    // Queue the hot-swap: store candidate, will replace at next hand
    botSeat.hotSwapPending = true;
    botSeat.swapCandidate = { guestId, name: guestName, queuedAt: new Date().toISOString() };
    await kv.set(`spades_room_${id}`, room);

    return c.json({ ...room, hotSwapQueued: true });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// GET /spades/boss — current weekly AI Boss info
app.get("/make-server-715f71b9/spades/boss", async (c) => {
  return c.json(currentBoss());
});

// POST /spades/boss/victory — player defeated the boss; generate discount code
app.post("/make-server-715f71b9/spades/boss/victory", async (c) => {
  try {
    const body = await c.req.json();
    const { guestId } = body;
    const boss = currentBoss();

    // Record the victory
    await kv.set(`boss_victory_${guestId}_${new Date().toISOString().split('T')[0]}`, {
      guestId, boss: boss.name, discount: boss.discount, at: new Date().toISOString(),
    });

    // Add ticker event
    await appendTickerEvent(`🏆 ${guestId} defeated "${boss.name}" at Spades and claimed a merch discount!`);

    return c.json({ discount: boss.discount, boss: boss.name, message: `You beat ${boss.name}! Use code ${boss.discount} for a merch discount.` });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ─── SOCIAL PROOF TICKER ─────────────────────────────────────────────────────

async function appendTickerEvent(message: string) {
  const events = ((await kv.get('ticker_events')) as any[]) || [];
  events.unshift({ id: Date.now().toString(), message, timestamp: new Date().toISOString() });
  await kv.set('ticker_events', events.slice(0, 100));
}

app.post("/make-server-715f71b9/ticker/event", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.message) return c.json({ error: 'No message' }, 400);
    await appendTickerEvent(body.message);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

app.get("/make-server-715f71b9/ticker/events", async (c) => {
  try {
    const events = ((await kv.get('ticker_events')) as any[]) || [];
    return c.json(events.slice(0, 50));
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// ─── CITY → APPROXIMATE COORDINATES (for historical data backfill) ──────────
const CITY_COORDS: Record<string, [number, number]> = {
  // NJ / NYC metro (core Jersey Club territory)
  'Newark': [40.7357, -74.1724], 'New York': [40.7128, -74.0060],
  'Brooklyn': [40.6782, -73.9442], 'Bronx': [40.8448, -73.8648],
  'Queens': [40.7282, -73.7949], 'Staten Island': [40.5795, -74.1502],
  'Jersey City': [40.7178, -74.0431], 'Hoboken': [40.7440, -74.0324],
  'Paterson': [40.9168, -74.1718], 'Trenton': [40.2171, -74.7429],
  'Camden': [39.9259, -75.1196], 'Elizabeth': [40.6640, -74.2107],
  'Irvington': [40.7237, -74.2296], 'East Orange': [40.7676, -74.2049],
  'Orange': [40.7712, -74.2318], 'Plainfield': [40.6376, -74.4121],
  // East Coast US
  'Philadelphia': [39.9526, -75.1652], 'Baltimore': [39.2904, -76.6122],
  'Washington': [38.9072, -77.0369], 'Boston': [42.3601, -71.0589],
  'Charlotte': [35.2271, -80.8431], 'Richmond': [37.5407, -77.4360],
  'Virginia Beach': [36.8529, -75.9780], 'Norfolk': [36.8508, -76.2859],
  'Pittsburgh': [40.4406, -79.9959], 'Providence': [41.8240, -71.4128],
  'Hartford': [41.7658, -72.6851], 'New Haven': [41.3083, -72.9279],
  'Albany': [42.6526, -73.7562], 'Buffalo': [42.8864, -78.8784],
  // Southeast US
  'Atlanta': [33.7490, -84.3880], 'Miami': [25.7617, -80.1918],
  'Orlando': [28.5383, -81.3792], 'Tampa': [27.9506, -82.4572],
  'Jacksonville': [30.3322, -81.6557], 'Raleigh': [35.7796, -78.6382],
  'Durham': [35.9940, -78.8986], 'Nashville': [36.1627, -86.7816],
  'Memphis': [35.1495, -90.0490], 'New Orleans': [29.9511, -90.0715],
  'Birmingham': [33.5186, -86.8104], 'Jackson': [32.2988, -90.1848],
  // Midwest US
  'Chicago': [41.8781, -87.6298], 'Detroit': [42.3314, -83.0458],
  'Cleveland': [41.4993, -81.6944], 'Columbus': [39.9612, -82.9988],
  'Cincinnati': [39.1031, -84.5120], 'Indianapolis': [39.7684, -86.1581],
  'St. Louis': [38.6270, -90.1994], 'Kansas City': [39.0997, -94.5786],
  'Milwaukee': [43.0389, -87.9065], 'Minneapolis': [44.9778, -93.2650],
  // Southwest / West US
  'Dallas': [32.7767, -96.7970], 'Houston': [29.7604, -95.3698],
  'San Antonio': [29.4241, -98.4936], 'Austin': [30.2672, -97.7431],
  'Phoenix': [33.4484, -112.0740], 'Las Vegas': [36.1699, -115.1398],
  'Denver': [39.7392, -104.9903], 'Los Angeles': [34.0522, -118.2437],
  'San Francisco': [37.7749, -122.4194], 'San Diego': [32.7157, -117.1611],
  'Seattle': [47.6062, -122.3321], 'Portland': [45.5051, -122.6750],
  // Canada
  'Toronto': [43.6532, -79.3832], 'Montreal': [45.5017, -73.5673],
  'Vancouver': [49.2827, -123.1207], 'Ottawa': [45.4215, -75.6972],
  'Calgary': [51.0447, -114.0719], 'Winnipeg': [49.8951, -97.1384],
  // UK
  'London': [51.5074, -0.1278], 'Birmingham UK': [52.4862, -1.8904],
  'Manchester': [53.4808, -2.2426], 'Leeds': [53.8008, -1.5491],
  'Liverpool': [53.4084, -2.9916], 'Bristol': [51.4545, -2.5879],
  'Glasgow': [55.8642, -4.2518], 'Edinburgh': [55.9533, -3.1883],
  'Nottingham': [52.9548, -1.1581], 'Sheffield': [53.3811, -1.4701],
  // Europe
  'Paris': [48.8566, 2.3522], 'Berlin': [52.5200, 13.4050],
  'Amsterdam': [52.3676, 4.9041], 'Lisbon': [38.7223, -9.1393],
  'Madrid': [40.4168, -3.7038], 'Barcelona': [41.3851, 2.1734],
  'Dublin': [53.3498, -6.2603], 'Frankfurt': [50.1109, 8.6821],
  'Hamburg': [53.5753, 10.0153], 'Stockholm': [59.3293, 18.0686],
  'Copenhagen': [55.6761, 12.5683], 'Brussels': [50.8503, 4.3517],
  // Caribbean / Latin America
  'Kingston': [17.9714, -76.7936], 'Port of Spain': [10.6549, -61.5019],
  'Bridgetown': [13.1132, -59.5988], 'Nassau': [25.0480, -77.3558],
  'San Juan': [18.4655, -66.1057], 'Havana': [23.1136, -82.3666],
  'Santo Domingo': [18.4861, -69.9312], 'Mexico City': [19.4326, -99.1332],
  'Bogota': [4.7110, -74.0721], 'Sao Paulo': [-23.5505, -46.6333],
  'Rio de Janeiro': [-22.9068, -43.1729], 'Buenos Aires': [-34.6037, -58.3816],
  // Africa
  'Lagos': [6.5244, 3.3792], 'Accra': [5.6037, -0.1870],
  'Nairobi': [-1.2921, 36.8219], 'Johannesburg': [-26.2041, 28.0473],
  'Cape Town': [-33.9249, 18.4241], 'Cairo': [30.0444, 31.2357],
  // Asia / Pacific
  'Tokyo': [35.6762, 139.6503], 'Seoul': [37.5665, 126.9780],
  'Beijing': [39.9042, 116.4074], 'Shanghai': [31.2304, 121.4737],
  'Hong Kong': [22.3193, 114.1694], 'Singapore': [1.3521, 103.8198],
  'Mumbai': [19.0760, 72.8777], 'Delhi': [28.7041, 77.1025],
  'Bangkok': [13.7563, 100.5018], 'Manila': [14.5995, 120.9842],
  'Sydney': [-33.8688, 151.2093], 'Melbourne': [-37.8136, 144.9631],
  'Auckland': [-36.8509, 174.7645], 'Dubai': [25.2048, 55.2708],
  'Istanbul': [41.0082, 28.9784],
  // Additional cities found in real visitor data
  'Piscataway': [40.5490, -74.4636], 'Clifton': [40.8584, -74.1638],
  'Woodbridge': [40.5576, -74.2846], 'Edison': [40.5187, -74.4121],
  'Hackensack': [40.8859, -74.0432], 'Plainfield': [40.6376, -74.4071],
  'Bayonne': [40.6688, -74.1135], 'Perth Amboy': [40.5068, -74.2654],
  'Mountain View': [37.3861, -122.0839], 'San Jose': [37.3382, -121.8863],
  'Sunnyvale': [37.3688, -122.0363], 'Palo Alto': [37.4419, -122.1430],
  'Longwood': [28.7028, -81.3470], 'Kissimmee': [28.2919, -81.4076],
  'Naperville': [41.7508, -88.1535], 'Monte Vista': [37.5794, -106.1494],
  'Burlington': [44.4759, -73.2121], 'Hamilton': [43.2557, -79.8711],
  'Mississauga': [43.5890, -79.6441], 'Ottawa': [45.4215, -75.6972],
  'Calgary': [51.0447, -114.0719], 'Edmonton': [53.5461, -113.4938],
  'Winnipeg': [49.8951, -97.1384], 'Scarborough': [43.7731, -79.2578],
  'New York City': [40.7128, -74.0060], 'Harlem': [40.8116, -73.9465],
  'Yonkers': [40.9312, -73.8988], 'Mount Vernon': [40.9126, -73.8371],
  'Warsaw': [52.2297, 21.0122], 'Krakow': [50.0647, 19.9450],
  'Gdansk': [54.3520, 18.6466], 'Wroclaw': [51.1079, 17.0385],
  'Santo Domingo': [18.4861, -69.9312], 'Santiago DR': [19.4517, -70.6970],
  'Riyadh': [24.6877, 46.7219], 'Jeddah': [21.4858, 39.1925],
  'Dammam': [26.3927, 49.9777], 'Mecca': [21.3891, 39.8579],
  'Port-au-Prince': [18.5944, -72.3074], 'Montego Bay': [18.4762, -77.8939],
  'Caracas': [10.4806, -66.9036], 'Bogota': [4.7110, -74.0721],
  'Lima': [-12.0464, -77.0428], 'Buenos Aires': [-34.6037, -58.3816],
  'Sao Paulo': [-23.5505, -46.6333], 'Mexico City': [19.4326, -99.1332],
  'Havana': [23.1136, -82.3666], 'Georgetown': [6.8013, -58.1551],
  'Cape Verde': [16.5388, -23.0418], 'Luanda': [-8.8368, 13.2343],
  'Kinshasa': [-4.4419, 15.2663], 'Abidjan': [5.3600, -4.0083],
  'Dakar': [14.7167, -17.4677], 'Addis Ababa': [9.0192, 38.7525],
  'Dar es Salaam': [-6.7924, 39.2083], 'Kampala': [0.3476, 32.5825],
  'Frankfurt': [50.1109, 8.6821], 'Munich': [48.1351, 11.5820],
  'Hamburg': [53.5753, 10.0153], 'Rome': [41.9028, 12.4964],
  'Milan': [45.4654, 9.1859], 'Stockholm': [59.3293, 18.0686],
  'Oslo': [59.9139, 10.7522], 'Copenhagen': [55.6761, 12.5683],
  'Helsinki': [60.1699, 24.9384], 'Zurich': [47.3769, 8.5417],
  'Vienna': [48.2082, 16.3738], 'Brussels': [50.8503, 4.3517],
  'Lisbon': [38.7169, -9.1395], 'Athens': [37.9838, 23.7275],
  'Cairo': [30.0444, 31.2357], 'Casablanca': [33.5731, -7.5898],
  'Kuala Lumpur': [3.1390, 101.6869], 'Jakarta': [-6.2088, 106.8456],
  'Taipei': [25.0330, 121.5654], 'Shanghai': [31.2304, 121.4737],
  'Beijing': [39.9042, 116.4074], 'Guangzhou': [23.1291, 113.2644],
  'Shenzhen': [22.5431, 114.0579], 'Wellington': [-41.2866, 174.7756],
};

// Country-level fallback — used when city is Unknown or not in CITY_COORDS
const COUNTRY_COORDS: Record<string, [number, number]> = {
  'United States': [37.0902, -95.7129],
  'Canada': [56.1304, -106.3468],
  'United Kingdom': [55.3781, -3.4360],
  'Poland': [51.9194, 19.1451],
  'Dominican Republic': [18.7357, -70.1627],
  'Saudi Arabia': [23.8859, 45.0792],
  'Jamaica': [18.1096, -77.2975],
  'Trinidad and Tobago': [10.6918, -61.2225],
  'Barbados': [13.1939, -59.5432],
  'Bahamas': [25.0343, -77.3963],
  'Nigeria': [9.0820, 8.6753],
  'Ghana': [7.9465, -1.0232],
  'Kenya': [-0.0236, 37.9062],
  'South Africa': [-30.5595, 22.9375],
  'Brazil': [-14.2350, -51.9253],
  'Colombia': [4.5709, -74.2973],
  'Mexico': [23.6345, -102.5528],
  'Puerto Rico': [18.2208, -66.5901],
  'Haiti': [18.9712, -72.2852],
  'Cuba': [21.5218, -77.7812],
  'Australia': [-25.2744, 133.7751],
  'New Zealand': [-40.9006, 174.8860],
  'Japan': [36.2048, 138.2529],
  'South Korea': [35.9078, 127.7669],
  'China': [35.8617, 104.1954],
  'India': [20.5937, 78.9629],
  'Singapore': [1.3521, 103.8198],
  'Malaysia': [4.2105, 101.9758],
  'Indonesia': [-0.7893, 113.9213],
  'Philippines': [12.8797, 121.7740],
  'France': [46.2276, 2.2137],
  'Germany': [51.1657, 10.4515],
  'Netherlands': [52.1326, 5.2913],
  'Spain': [40.4637, -3.7492],
  'Italy': [41.8719, 12.5674],
  'Ireland': [53.1424, -7.6921],
  'Sweden': [60.1282, 18.6435],
  'Norway': [60.4720, 8.4689],
  'Denmark': [56.2639, 9.5018],
  'Belgium': [50.5039, 4.4699],
  'Switzerland': [46.8182, 8.2275],
  'Austria': [47.5162, 14.5501],
  'Portugal': [39.3999, -8.2245],
  'Greece': [39.0742, 21.8243],
  'Turkey': [38.9637, 35.2433],
  'Russia': [61.5240, 105.3188],
  'Ukraine': [48.3794, 31.1656],
  'United Arab Emirates': [23.4241, 53.8478],
  'Kuwait': [29.3117, 47.4818],
  'Qatar': [25.3548, 51.1839],
  'Egypt': [26.8206, 30.8025],
  'Morocco': [31.7917, -7.0926],
  'Ethiopia': [9.1450, 40.4897],
  'Tanzania': [-6.3690, 34.8888],
  'Uganda': [1.3733, 32.2903],
  'Ivory Coast': [7.5400, -5.5471],
  'Senegal': [14.4974, -14.4524],
  'Angola': [-11.2027, 17.8739],
};

// ─── PLAY TRACKING & LISTENER MAP ───────────────────────────────────────────

// POST /plays/track — record a play (fire-and-forget from frontend)
app.post("/make-server-715f71b9/plays/track", async (c) => {
  try {
    const body = await c.req.json();
    const { videoId, title, channelTitle, thumbnail, guestId, city, country, lat, lon } = body;
    if (!videoId) return c.json({ error: 'No videoId' }, 400);

    // 1. Increment play count for this track
    const playKey = `play_count_${videoId}`;
    const existing = (await kv.get(playKey)) as any;
    const count = (existing?.count || 0) + 1;
    await kv.set(playKey, {
      videoId,
      title: title || existing?.title || 'Unknown',
      channelTitle: channelTitle || existing?.channelTitle || '',
      thumbnail: thumbnail || existing?.thumbnail || '',
      count,
      lastPlayed: new Date().toISOString(),
    });

    // 2. Update a rolling "top tracks" index (top 50)
    const topKey = 'jc_top_tracks_v1';
    const topList = ((await kv.get(topKey)) as any[]) || [];
    const idx = topList.findIndex((t: any) => t.videoId === videoId);
    if (idx >= 0) {
      topList[idx].count = count;
      topList[idx].lastPlayed = new Date().toISOString();
      if (title) topList[idx].title = title;
      if (channelTitle) topList[idx].channelTitle = channelTitle;
      if (thumbnail) topList[idx].thumbnail = thumbnail;
    } else {
      topList.push({
        videoId,
        title: title || 'Unknown',
        channelTitle: channelTitle || '',
        thumbnail: thumbnail || '',
        count,
        lastPlayed: new Date().toISOString(),
      });
    }
    topList.sort((a: any, b: any) => (b.count || 0) - (a.count || 0));
    await kv.set(topKey, topList.slice(0, 50));

    // 3. Resolve coordinates — GPS → city → country fallback chain
    const cityName = (city || '').trim();
    const cityCoords = CITY_COORDS[cityName] ?? COUNTRY_COORDS[(country || '').trim()];
    const resolvedLat: number | null = lat ?? (cityCoords?.[0] ?? null);
    const resolvedLon: number | null = lon ?? (cityCoords?.[1] ?? null);

    // 4. Track active listener (location + current track)
    if (guestId) {
      const listenerKey = `listener_${guestId}`;
      await kv.set(listenerKey, {
        guestId,
        city: cityName || 'Unknown',
        country: country || 'Unknown',
        lat: resolvedLat,
        lon: resolvedLon,
        currentTrack: title || 'Unknown',
        videoId,
        lastSeen: new Date().toISOString(),
      });

      // 5. Accumulate all-time visitor map (persistent — only adds, never removes)
      if (resolvedLat != null && resolvedLon != null) {
        const mapKey = 'jc_visitor_map_v1';
        const visitorMap = ((await kv.get(mapKey)) as any[]) || [];
        const alreadyMapped = visitorMap.some((v: any) => v.guestId === guestId);
        if (!alreadyMapped && visitorMap.length < 10000) {
          visitorMap.push({
            guestId,
            lat: resolvedLat,
            lon: resolvedLon,
            city: cityName || 'Unknown',
            country: country || 'Unknown',
            firstSeen: new Date().toISOString(),
          });
          await kv.set(mapKey, visitorMap);
        }
      }
    }

    // 6. Prepend to play history feed (newest first, max 100 entries)
    const histKey = 'jc_play_history_v1';
    const hist = ((await kv.get(histKey)) as any[]) || [];
    hist.unshift({
      videoId,
      title: title || 'Unknown',
      channelTitle: channelTitle || '',
      thumbnail: thumbnail || '',
      playedAt: new Date().toISOString(),
      city: cityName || 'Unknown',
      country: country || 'Unknown',
    });
    await kv.set(histKey, hist.slice(0, 100));

    return c.json({ success: true, count });
  } catch (err) {
    console.log("Play track error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// GET /plays/top — most played tracks
app.get("/make-server-715f71b9/plays/top", async (c) => {
  try {
    const topList = ((await kv.get('jc_top_tracks_v1')) as any[]) || [];
    return c.json(topList.slice(0, 15));
  } catch (err) {
    console.log("Top tracks error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// GET /plays/listeners — where people are listening from
app.get("/make-server-715f71b9/plays/listeners", async (c) => {
  try {
    const all = await kv.getByPrefix('listener_');
    const listeners = (all as any[]).filter(Boolean);

    // Only count listeners seen in the last 30 minutes as "active"
    const cutoff = Date.now() - 30 * 60 * 1000;
    const active = listeners.filter(
      (l: any) => new Date(l.lastSeen).getTime() > cutoff
    );

    // Group by city
    const cityMap: Record<string, { city: string; country: string; count: number; listeners: string[] }> = {};
    for (const l of active) {
      const key = `${l.city}|${l.country}`;
      if (!cityMap[key]) {
        cityMap[key] = { city: l.city, country: l.country, count: 0, listeners: [] };
      }
      cityMap[key].count++;
      if (cityMap[key].listeners.length < 3) {
        cityMap[key].listeners.push(l.currentTrack || 'Unknown');
      }
    }

    const cities = Object.values(cityMap).sort((a, b) => b.count - a.count);

    return c.json({
      totalActive: active.length,
      cities,
      listeners: active
        .sort((a: any, b: any) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
        .slice(0, 20)
        .map((l: any) => ({
          guestId: l.guestId,
          city: l.city,
          country: l.country,
          lat: l.lat ?? null,
          lon: l.lon ?? null,
          currentTrack: l.currentTrack,
          lastSeen: l.lastSeen,
        })),
      // All-time visitor history — every unique listener ever, not just last 30 min.
      // Used by the Global Reach heatmap to show historical reach.
      allVisitors: listeners
        .filter(Boolean)
        .map((l: any) => ({
          guestId: l.guestId,
          city: l.city || 'Unknown',
          country: l.country || 'Unknown',
          lat: l.lat ?? null,
          lon: l.lon ?? null,
          lastSeen: l.lastSeen,
        })),
    });
  } catch (err) {
    console.log("Listeners error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// GET /plays/visitor-map — all-time persistent visitor dots for the heatmap.
// On first call (empty map), auto-migrates all historical listener_ entries.
app.get("/make-server-715f71b9/plays/visitor-map", async (c) => {
  try {
    let visitorMap = ((await kv.get('jc_visitor_map_v1')) as any[]) || [];

    // One-time migration: backfill historical visitor data from listener_ keys
    if (visitorMap.length === 0) {
      const allListeners = (await kv.getByPrefix('listener_') as any[]).filter(Boolean);
      const migrated: any[] = [];
      for (const l of allListeners) {
        if (!l.guestId) continue;
        const useLat = l.lat ?? (CITY_COORDS[l.city]?.[0] ?? null);
        const useLon = l.lon ?? (CITY_COORDS[l.city]?.[1] ?? null);
        if (useLat != null && useLon != null) {
          migrated.push({
            guestId: l.guestId,
            lat: useLat,
            lon: useLon,
            city: l.city || 'Unknown',
            country: l.country || 'Unknown',
            firstSeen: l.lastSeen || new Date().toISOString(),
          });
        }
      }
      if (migrated.length > 0) {
        await kv.set('jc_visitor_map_v1', migrated);
        visitorMap = migrated;
      }
    }

    return c.json(
      visitorMap.map((v: any) => ({
        lat: v.lat,
        lon: v.lon,
        city: v.city,
        country: v.country,
      }))
    );
  } catch (err) {
    console.log("Visitor map error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// GET /plays/history — recent play activity feed (newest first, max 100)
app.get("/make-server-715f71b9/plays/history", async (c) => {
  try {
    const hist = ((await kv.get('jc_play_history_v1')) as any[]) || [];
    return c.json(hist.slice(0, 60));
  } catch (err) {
    console.log("Play history error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ─── CHAT ROOM ──────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  guestId: string;
  guestName: string;
  message: string;
  timestamp: string;
  ipId: string;
  ipHash: string;
  type?: 'message' | 'system';
  replyTo?: { id: string; ipId: string; message: string; gifUrl?: string };
  gifUrl?: string;
  mentions?: string[];
}

interface ChatPresence {
  guestId: string;
  ipId: string;
  ipHash: string;
  lastSeen: string;
  typing: boolean;
  typingAt?: string;
}

const CHAT_MESSAGES_KEY = 'chat_messages_v3';
const CHAT_PRESENCE_KEY = 'chat_presence_v3';
const MESSAGE_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour — auto-expire old messages
const PRESENCE_TIMEOUT_MS = 30 * 1000; // 30s — user considered offline
const TYPING_TIMEOUT_MS = 5 * 1000; // 5s — typing indicator expires

// Simple hash function for IP addresses
function hashIP(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase().slice(0, 6);
}

function ipToUserId(ip: string): string {
  return `User_${hashIP(ip)}`;
}

function extractIP(c: any): string {
  return c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    || c.req.header('x-real-ip')
    || c.req.header('cf-connecting-ip')
    || 'unknown';
}

// Auto-purge expired messages
async function getCleanMessages(): Promise<ChatMessage[]> {
  const messages = ((await kv.get(CHAT_MESSAGES_KEY)) as ChatMessage[]) || [];
  const cutoff = Date.now() - MESSAGE_MAX_AGE_MS;
  const clean = messages.filter((m: ChatMessage) => new Date(m.timestamp).getTime() > cutoff);
  if (clean.length !== messages.length) {
    await kv.set(CHAT_MESSAGES_KEY, clean);
  }
  return clean;
}

// Get active presence map, auto-prune stale entries
async function getPresenceMap(): Promise<Record<string, ChatPresence>> {
  const map = ((await kv.get(CHAT_PRESENCE_KEY)) as Record<string, ChatPresence>) || {};
  const now = Date.now();
  let changed = false;
  for (const key of Object.keys(map)) {
    if (now - new Date(map[key].lastSeen).getTime() > PRESENCE_TIMEOUT_MS * 4) {
      delete map[key];
      changed = true;
    }
    // Clear stale typing flags
    if (map[key]?.typing && map[key].typingAt && now - new Date(map[key].typingAt!).getTime() > TYPING_TIMEOUT_MS) {
      map[key].typing = false;
      changed = true;
    }
  }
  if (changed) await kv.set(CHAT_PRESENCE_KEY, map);
  return map;
}

// POST /chat/join — user enters the chat room; clears stale messages from previous session
app.post("/make-server-715f71b9/chat/join", async (c) => {
  try {
    const body = await c.req.json();
    const { guestId } = body;
    if (!guestId) return c.json({ error: 'No guestId' }, 400);

    const ip = extractIP(c);
    const ipHash = hashIP(ip);
    const ipId = ipToUserId(ip);

    // Remove any stale messages from this guestId (previous session)
    const messages = await getCleanMessages();
    const cleaned = messages.filter((m: ChatMessage) => m.guestId !== guestId);

    // Add system join message
    cleaned.push({
      id: `sys_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      guestId: 'system',
      guestName: 'System',
      message: `${ipId} joined the chat`,
      timestamp: new Date().toISOString(),
      ipId: 'system',
      ipHash: '',
      type: 'system',
    });
    await kv.set(CHAT_MESSAGES_KEY, cleaned.slice(-200));

    // Register presence
    const presenceMap = await getPresenceMap();
    presenceMap[guestId] = { guestId, ipId, ipHash, lastSeen: new Date().toISOString(), typing: false };
    await kv.set(CHAT_PRESENCE_KEY, presenceMap);

    console.log(`Chat join: ${ipId} (#${ipHash}) guestId=${guestId}`);
    return c.json({ success: true, ipId, ipHash });
  } catch (err) {
    console.log('Chat join error:', err);
    return c.json({ error: String(err) }, 500);
  }
});

// POST /chat/heartbeat  keep user presence alive + report typing state
app.post("/make-server-715f71b9/chat/heartbeat", async (c) => {
  try {
    const body = await c.req.json();
    const { guestId, typing } = body;
    if (!guestId) return c.json({ error: 'No guestId' }, 400);

    const ip = extractIP(c);
    const presenceMap = await getPresenceMap();

    if (presenceMap[guestId]) {
      presenceMap[guestId].lastSeen = new Date().toISOString();
      presenceMap[guestId].typing = !!typing;
      if (typing) presenceMap[guestId].typingAt = new Date().toISOString();
    } else {
      // Auto-register if missing
      presenceMap[guestId] = {
        guestId,
        ipId: ipToUserId(ip),
        ipHash: hashIP(ip),
        lastSeen: new Date().toISOString(),
        typing: !!typing,
        typingAt: typing ? new Date().toISOString() : undefined,
      };
    }
    await kv.set(CHAT_PRESENCE_KEY, presenceMap);
    return c.json({ success: true });
  } catch (err) {
    return c.json({ error: String(err) }, 500);
  }
});

// POST /chat/messages — post a new chat message
app.post("/make-server-715f71b9/chat/messages", async (c) => {
  try {
    const body = await c.req.json();
    const { guestId, guestName, message, replyTo, gifUrl, mentions } = body;

    // GIF messages can have empty message text
    if (!guestId) return c.json({ error: 'Missing guestId' }, 400);
    if (!gifUrl && (!message || message.trim().length === 0)) return c.json({ error: 'Message cannot be empty' }, 400);
    if (message && message.length > 500) return c.json({ error: 'Message too long (max 500 characters)' }, 400);

    const ip = extractIP(c);
    const ipHash = hashIP(ip);
    const ipId = ipToUserId(ip);

    console.log(`Chat message from ${ipId} (#${ipHash}): ${(message || '[GIF]').trim().slice(0, 50)}...`);

    const messages = await getCleanMessages();

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      guestId,
      guestName: guestName || guestId.slice(0, 12),
      message: (message || '').trim(),
      timestamp: new Date().toISOString(),
      ipId,
      ipHash,
      type: 'message',
      ...(replyTo ? { replyTo } : {}),
      ...(gifUrl ? { gifUrl } : {}),
      ...(mentions && mentions.length > 0 ? { mentions } : {}),
    };

    messages.push(newMessage);
    await kv.set(CHAT_MESSAGES_KEY, messages.slice(-200));

    // Clear typing flag
    const presenceMap = await getPresenceMap();
    if (presenceMap[guestId]) {
      presenceMap[guestId].typing = false;
      presenceMap[guestId].lastSeen = new Date().toISOString();
      await kv.set(CHAT_PRESENCE_KEY, presenceMap);
    }

    return c.json({ success: true, message: newMessage });
  } catch (err) {
    console.log('Chat post error:', err);
    return c.json({ error: String(err) }, 500);
  }
});

// GET /chat/messages — get recent messages + online users + typing users
app.get("/make-server-715f71b9/chat/messages", async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const messages = await getCleanMessages();
    const presenceMap = await getPresenceMap();
    const now = Date.now();

    // Build online user list
    const onlineUsers = Object.values(presenceMap)
      .filter((p: ChatPresence) => now - new Date(p.lastSeen).getTime() < PRESENCE_TIMEOUT_MS)
      .map((p: ChatPresence) => ({
        guestId: p.guestId,
        ipId: p.ipId,
        typing: p.typing && p.typingAt ? now - new Date(p.typingAt).getTime() < TYPING_TIMEOUT_MS : false,
      }));

    // Return chronological (oldest first in the slice)
    const sliced = messages.slice(-Math.min(limit, 200));

    return c.json({
      messages: sliced,
      onlineUsers,
      onlineCount: onlineUsers.length,
    });
  } catch (err) {
    console.log('Chat get error:', err);
    return c.json({ error: String(err) }, 500);
  }
});

// POST /chat/leave — user leaves: remove their messages + presence silently
app.post("/make-server-715f71b9/chat/leave", async (c) => {
  try {
    const body = await c.req.json();
    const { guestId } = body;
    if (!guestId) return c.json({ error: 'No guestId provided' }, 400);

    // Get presence to find their display name for logging
    const presenceMap = await getPresenceMap();
    const presence = presenceMap[guestId];
    const displayName = presence?.ipId || guestId.slice(0, 12);

    // Remove all their messages — no system message, clean exit
    // Also remove any system join/leave messages that reference this user
    const messages = await getCleanMessages();
    const filtered = messages.filter((m: ChatMessage) => {
      // Remove all messages sent by this user
      if (m.guestId === guestId) return false;
      // Remove system messages that mention this user (joined/left notifications)
      if (m.type === 'system' && displayName && m.message.includes(displayName)) return false;
      return true;
    });
    const removed = messages.length - filtered.length;

    await kv.set(CHAT_MESSAGES_KEY, filtered.slice(-200));

    // Remove from presence
    delete presenceMap[guestId];
    await kv.set(CHAT_PRESENCE_KEY, presenceMap);

    console.log(`Chat leave: removed ${removed} messages from ${displayName} (${guestId})`);
    return c.json({ success: true, removedCount: removed });
  } catch (err) {
    console.log('Chat leave error:', err);
    return c.json({ error: String(err) }, 500);
  }
});

// ─── DANCE VIDEOS (TikTok + YouTube) ─────────────────────────────────────────

const DANCE_YT_QUERIES = [
  // ─── YouTube Shorts-only Jersey Club dance searches ────────────────────────
  "jersey club dance #shorts",
  "jersey club dance shorts",
  "jersey club dancing #shorts",
  "jersey club dance challenge #shorts",
  "jersey club shuffle #shorts",
  "jersey club footwork #shorts",
  "jersey club bounce dance #shorts",
  "jersey club dance viral #shorts",
  "jersey club dance 2026 #shorts",
  "jersey club dance 2025 #shorts",
  "jersey club dance battle #shorts",
  "jersey club dance tutorial #shorts",
  "jersey club leg work #shorts",
  "jersey club body roll #shorts",
  "jersey club choreography #shorts",
  "jersey club dance routine #shorts",
  "jersey club dance trending #shorts",
  "jersey club dance compilation shorts",
  "#jerseyclubdance #shorts",
  "jersey club dance reaction #shorts",
  "DJ Tameil dance #shorts",
  "DJ Sliink dance #shorts",
  "jersey club dance cypher #shorts",
  "jersey club party dance #shorts",
  "newark jersey club dance #shorts",
  "baltimore club dance #shorts",
  "philly club dance #shorts",
  "new york jersey club dance #shorts",
  "jersey club hip hop dance #shorts",
  "jersey club house dance #shorts",
  "jersey club dance floor #shorts",
  "jersey club club night dance #shorts",
];

// Large rotating pool for 2-hour top-ups — 28 diverse queries so each cycle
// finds fresh unique videos across different styles, artists, and locations
const DANCE_YT_DAILY_QUERIES = [
  // Core dance terms
  "jersey club dance #shorts",
  "jersey club dancing 2026 #shorts",
  "jersey club dance challenge #shorts",
  "jersey club dance viral #shorts",
  "jersey club shuffle #shorts",
  "jersey club footwork #shorts",
  "jersey club bounce dance #shorts",
  "#jerseyclubdance #shorts",
  // Style-specific
  "jersey club choreography #shorts",
  "jersey club dance moves #shorts",
  "jersey club dance routine #shorts",
  "jersey club leg work #shorts",
  "jersey club body roll #shorts",
  "jersey club cypher dance #shorts",
  "jersey club dance battle #shorts",
  "jersey club dance freestyle #shorts",
  // Artist & location
  "DJ Tameil jersey club dance #shorts",
  "DJ Sliink jersey club dance #shorts",
  "newark jersey club dance #shorts",
  "baltimore club dance #shorts",
  "philly club dance #shorts",
  "jersey club party dance #shorts",
  // Trending / viral
  "jersey club dance trending 2026 #shorts",
  "jersey club dance tutorial #shorts",
  "jersey club dance competition #shorts",
  "jersey club hip hop dance #shorts",
  "jersey club dance floor #shorts",
  "jersey club twerk dance #shorts",
];

// Rotating index key — advances by 4 each cycle so we cover all 28 queries evenly
const DANCE_QUERY_ROTATE_KEY = 'dance_rotate_idx_v1';

const DANCE_TIKTOK_QUERIES = [
  "jersey club dance",
  "jersey club bounce",
  "jersey club challenge",
  "jersey club shuffle",
  "jersey club footwork",
  "jersey club dance viral",
  "jersey club choreography",
  "jersey club dance battle",
  "jersey club body roll",
  "jersey club leg work",
  "jersey club dance 2026",
  "jersey club trending dance",
  "#jerseyclubdance",
  "newark dance jersey club",
  "jersey club party dance",
];

const DANCE_CACHE_KEY = 'jc_dance_videos_v1';
const DANCE_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours — matches refresh interval
const DANCE_DAILY_KEY = 'jc_dance_daily_ts_v1'; // tracks last auto top-up
const DANCE_DAILY_INTERVAL = 2 * 60 * 60 * 1000; // every 2 hours
const DANCE_VIDEO_CAP = 500; // keep newest 500 so KV doesn't grow unbounded

// ─── TikTok OAuth 2.0 Client Credentials ────────────────────────────────────
// The Research API v2 requires an access_token obtained via client_key + client_secret.
// Tokens are cached in-memory + KV for their lifetime (usually 7200s / 2 hours).
let cachedTikTokToken: { token: string; expiresAt: number } | null = null;

async function getTikTokAccessToken(): Promise<string | null> {
  // Check in-memory cache
  if (cachedTikTokToken && Date.now() < cachedTikTokToken.expiresAt - 60_000) {
    return cachedTikTokToken.token;
  }

  // Check KV cache
  try {
    const kvCached = (await kv.get('tiktok_access_token_cache')) as any;
    if (kvCached && kvCached.token && Date.now() < new Date(kvCached.expiresAt).getTime() - 60_000) {
      cachedTikTokToken = { token: kvCached.token, expiresAt: new Date(kvCached.expiresAt).getTime() };
      console.log('[TikTok] Using cached access token from KV');
      return kvCached.token;
    }
  } catch { }

  // Exchange client credentials for access token
  const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY");
  const clientSecret = Deno.env.get("TIKTOK_CLIENT_SECRET");

  if (!clientKey || !clientSecret) {
    console.log("[TikTok] TIKTOK_CLIENT_KEY or TIKTOK_CLIENT_SECRET not configured");
    return null;
  }

  try {
    console.log('[TikTok] Requesting new access token via client credentials...');
    const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }).toString(),
      signal: AbortSignal.timeout(10000),
    });

    const data = await res.json();

    if (!res.ok || !data.access_token) {
      console.log("[TikTok] OAuth token error:", res.status, JSON.stringify(data));
      return null;
    }

    const expiresIn = data.expires_in || 7200;
    const expiresAt = Date.now() + expiresIn * 1000;

    cachedTikTokToken = { token: data.access_token, expiresAt };
    await kv.set('tiktok_access_token_cache', {
      token: data.access_token,
      expiresAt: new Date(expiresAt).toISOString(),
    });

    console.log(`[TikTok] Got access token, expires in ${expiresIn}s`);
    return data.access_token;
  } catch (e) {
    console.log("[TikTok] OAuth token request failed:", e);
    return null;
  }
}

// TikTok API — Research API v2 with OAuth client credentials flow
// Runs ALL queries in the expanded pool, 20 results per query, for maximum coverage
async function fetchTikTokVideos(): Promise<any[]> {
  const accessToken = await getTikTokAccessToken();
  if (!accessToken) {
    console.log("[TikTok] No access token available — skipping TikTok fetch");
    return [];
  }

  const allVideos: any[] = [];
  const seen = new Set<string>();

  for (const query of DANCE_TIKTOK_QUERIES) {
    try {
      const res = await fetch("https://open.tiktokapis.com/v2/research/video/query/?fields=id,video_description,create_time,like_count,share_count,view_count,cover_image_url,share_url,embed_link,title", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          query: {
            and: [
              { field_name: "keyword", operation: "IN", field_values: [query] },
            ],
          },
          max_count: 20,
          search_id: "",
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const data = await res.json();
        const videos = data.data?.videos || [];
        for (const v of videos) {
          if (v.id && !seen.has(v.id.toString())) {
            seen.add(v.id.toString());
            allVideos.push({
              id: `tt_${v.id}`,
              title: v.video_description || v.title || query,
              thumbnail: v.cover_image_url || '',
              shareUrl: v.share_url || '',
              embedLink: v.embed_link || '',
              views: v.view_count || 0,
              likes: v.like_count || 0,
              shares: v.share_count || 0,
              createdAt: v.create_time ? new Date(v.create_time * 1000).toISOString() : new Date().toISOString(),
              source: 'tiktok',
            });
          }
        }
        console.log(`[TikTok] Query "${query}" returned ${videos.length} videos`);
      } else {
        const errText = await res.text().catch(() => 'Unknown error');
        console.log(`[TikTok] Research API error for "${query}": ${res.status} — ${errText}`);
      }
    } catch (e) {
      console.log(`[TikTok] Fetch error for "${query}":`, e);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`[TikTok] Total: ${allVideos.length} unique dance videos`);
  return allVideos;
}

// YouTube dance videos — two-pass system:
// Pass 1: "Relevance" — picks 8 random queries from the main pool for best-quality results
// Pass 2: "Daily" — uses date-ordered queries with publishedAfter to pull uploads from the last 24h
async function fetchYTDanceVideos(): Promise<any[]> {
  const apiKey = Deno.env.get("YOUTUBE_API_KEY");
  if (!apiKey) {
    console.log("[DanceYT] YOUTUBE_API_KEY not configured");
    return [];
  }

  const allVideos: any[] = [];
  const seen = new Set<string>();

  // ── Aggressive blocklist: block ALL beat / instrumental / producer content ──
  const BEAT_BLOCKLIST = [
    'type beat', 'typebeat', 'beat maker', 'beatmaker', 'beat making', 'beatmaking',
    'making a beat', 'made a beat', 'making beats', 'how to make',
    'instrumental', 'fl studio', 'ableton', 'logic pro', 'beat tape', 'beattape',
    'producer', 'producing', 'production', 'prod by', 'prod.', 'produced by',
    'cookup', 'cook up', 'cook-up', 'cookin',
    'sample pack', 'drum kit', 'loop kit', 'sound kit', 'midi kit',
    'beat breakdown', 'beat switch', 'beat drop',
    'free beat', 'sold beat', 'lease beat', 'exclusive beat',
    'beat for sale', 'beats for sale', 'buy beat', 'buy beats',
    'remix contest', 'stem', 'wav', 'mp3',
    'tutorial beat', 'beat tutorial', 'music production',
    'studio session', 'in the studio', 'studio vlog',
    'mixing', 'mastering', 'eq tutorial',
    'unboxing', 'review', 'reaction video',
    'lyric video', 'lyrics', 'karaoke',
    'podcast', 'interview',
  ];

  // ── Positive filter: must contain at least one dance-related keyword ───────
  const DANCE_REQUIRED = [
    'dance', 'dancing', 'dancer', 'shuffle', 'footwork', 'choreography',
    'choreo', 'bounce', 'moves', 'routine', 'cypher', 'battle',
    'challenge', 'tutorial', 'vibes', 'party', 'club night', 'floor',
    'leg work', 'body roll', 'twerk', 'hip hop', 'groove', 'grooving',
    'moving', 'move', 'step', 'stepping',
  ];

  // Helper to parse YT items
  const parseItems = (items: any[]) => {
    for (const item of items) {
      const vid = item.id?.videoId;
      const titleLower = (item.snippet?.title || '').toLowerCase();
      const descLower = (item.snippet?.description || '').toLowerCase();
      const combined = titleLower + ' ' + descLower;

      // Hard block: any beat / producer / non-dance content
      const isBeatVideo = BEAT_BLOCKLIST.some(kw => combined.includes(kw))
        || /\bbeats?\b/.test(titleLower);

      // Must be Shorts
      const isShortsContent = titleLower.includes('#shorts') || titleLower.includes('shorts')
        || descLower.includes('#shorts');

      // Must have at least one dance keyword in title OR description
      const hasDanceKeyword = DANCE_REQUIRED.some(kw => combined.includes(kw))
        || /jersey\s*club/.test(combined);

      if (vid && !seen.has(vid) && !isBeatVideo && isShortsContent && hasDanceKeyword) {
        seen.add(vid);
        allVideos.push({
          id: `yt_${vid}`,
          videoId: vid,
          title: item.snippet?.title || 'Jersey Club Dance',
          thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || '',
          channelTitle: item.snippet?.channelTitle || '',
          publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
          source: 'youtube',
        });
      }
    }
  };

  // ─── Pass 1: Relevance — 8 random queries, ALL fired IN PARALLEL ───────────
  const relevanceQueries = [...DANCE_YT_QUERIES].sort(() => Math.random() - 0.5).slice(0, 8);
  const relevanceResults = await Promise.allSettled(
    relevanceQueries.map(async (query) => {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=15&order=relevance&videoDuration=short&key=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      return { query, items: data.items || [], error: data.error };
    })
  );
  for (const r of relevanceResults) {
    if (r.status === 'fulfilled') {
      if (r.value.error) console.log(`[DanceYT] YT API error for "${r.value.query}":`, JSON.stringify(r.value.error));
      else { parseItems(r.value.items); console.log(`[DanceYT] Relevance "${r.value.query}" → ${r.value.items.length} videos`); }
    } else {
      console.log(`[DanceYT] Relevance fetch failed:`, r.reason);
    }
  }

  // ─── Pass 2: Daily uploads — ALL fired IN PARALLEL (last 48h) ───────────────
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const dailyQueries = [...DANCE_YT_DAILY_QUERIES].sort(() => Math.random() - 0.5).slice(0, 4);
  const dailyResults = await Promise.allSettled(
    dailyQueries.map(async (query) => {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=20&order=date&publishedAfter=${encodeURIComponent(cutoff)}&key=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      return { query, items: data.items || [], error: data.error };
    })
  );
  for (const r of dailyResults) {
    if (r.status === 'fulfilled') {
      if (r.value.error) console.log(`[DanceYT] YT daily API error for "${r.value.query}":`, JSON.stringify(r.value.error));
      else { parseItems(r.value.items); console.log(`[DanceYT] Daily "${r.value.query}" → ${r.value.items.length} new uploads`); }
    } else {
      console.log(`[DanceYT] Daily fetch failed:`, r.reason);
    }
  }

  console.log(`[DanceYT] Total: ${allVideos.length} unique dance videos (relevance + daily)`);
  return allVideos;
}

// ─── 2-hour rotating top-up: picks the next 4 queries from the 28-query pool ──
// Rotates through every query over 14 hours — maximum variety, minimum quota burn
async function fetchDailyOnlyDanceVideos(): Promise<any[]> {
  const apiKey = Deno.env.get('YOUTUBE_API_KEY');
  if (!apiKey) return [];

  const allVideos: any[] = [];
  const seen = new Set<string>();

  const BEAT_BLOCKLIST = [
    'type beat', 'typebeat', 'beat maker', 'beatmaker', 'beat making', 'beatmaking',
    'making a beat', 'made a beat', 'making beats', 'how to make',
    'instrumental', 'fl studio', 'ableton', 'logic pro', 'beat tape', 'beattape',
    'producer', 'producing', 'production', 'prod by', 'prod.', 'produced by',
    'cookup', 'cook up', 'cook-up', 'cookin',
    'sample pack', 'drum kit', 'loop kit', 'sound kit', 'midi kit',
    'beat breakdown', 'beat switch', 'beat drop',
    'free beat', 'sold beat', 'lease beat', 'exclusive beat',
    'beat for sale', 'beats for sale', 'buy beat', 'buy beats',
    'remix contest', 'stem', 'wav', 'mp3',
    'tutorial beat', 'beat tutorial', 'music production',
    'studio session', 'in the studio', 'studio vlog',
    'mixing', 'mastering', 'eq tutorial',
    'unboxing', 'review', 'reaction video',
    'lyric video', 'lyrics', 'karaoke',
    'podcast', 'interview',
  ];

  const DANCE_REQUIRED = [
    'dance', 'dancing', 'dancer', 'shuffle', 'footwork', 'choreography',
    'choreo', 'bounce', 'moves', 'routine', 'cypher', 'battle',
    'challenge', 'tutorial', 'vibes', 'party', 'club night', 'floor',
    'leg work', 'body roll', 'twerk', 'hip hop', 'groove', 'grooving',
    'moving', 'move', 'step', 'stepping',
  ];

  const parseItems = (items: any[]) => {
    for (const item of items) {
      const vid = item.id?.videoId;
      const titleLower = (item.snippet?.title || '').toLowerCase();
      const descLower = (item.snippet?.description || '').toLowerCase();
      const combined = titleLower + ' ' + descLower;
      const isBeatVideo = BEAT_BLOCKLIST.some(kw => combined.includes(kw)) || /\bbeats?\b/.test(titleLower);
      const isShortsContent = titleLower.includes('#shorts') || titleLower.includes('shorts') || descLower.includes('#shorts');
      const hasDanceKeyword = DANCE_REQUIRED.some(kw => combined.includes(kw)) || /jersey\s*club/.test(combined);

      if (vid && !seen.has(vid) && !isBeatVideo && isShortsContent && hasDanceKeyword) {
        seen.add(vid);
        allVideos.push({
          id: `yt_${vid}`,
          videoId: vid,
          title: item.snippet?.title || 'Jersey Club Dance',
          thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || '',
          channelTitle: item.snippet?.channelTitle || '',
          publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
          source: 'youtube',
        });
      }
    }
  };

  // ── Rotating query selection: advance 4 positions each cycle ────────────────
  const pool = DANCE_YT_DAILY_QUERIES;
  const storedIdx = ((await kv.get(DANCE_QUERY_ROTATE_KEY)) as number) || 0;
  const idx = storedIdx % pool.length;
  // Pick 4 queries starting at idx, wrapping around the pool
  const selectedQueries: string[] = [];
  for (let i = 0; i < 4; i++) {
    selectedQueries.push(pool[(idx + i) % pool.length]);
  }
  const nextIdx = (idx + 4) % pool.length;
  await kv.set(DANCE_QUERY_ROTATE_KEY, nextIdx);
  console.log(`[DanceDaily] Rotation ${idx}→${nextIdx}: queries [${selectedQueries.join(', ')}]`);

  // Use a 7-day window — catches new uploads AND recently indexed older videos
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Fire all 4 selected queries IN PARALLEL
  const dailyOnlyResults = await Promise.allSettled(
    selectedQueries.map(async (query) => {
      // Alternate order=relevance and order=date based on index for max variety
      const order = idx % 2 === 0 ? 'relevance' : 'date';
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=25&order=${order}&publishedAfter=${encodeURIComponent(cutoff)}&videoDuration=short&key=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      return { query, items: data.items || [], error: data.error };
    })
  );
  for (const r of dailyOnlyResults) {
    if (r.status === 'fulfilled') {
      if (r.value.error) console.log(`[DanceDaily] API error for "${r.value.query}":`, JSON.stringify(r.value.error));
      else { parseItems(r.value.items); console.log(`[DanceDaily] "${r.value.query}" → ${r.value.items.length} items, ${allVideos.length} kept`); }
    } else {
      console.log(`[DanceDaily] Fetch failed:`, r.reason);
    }
  }

  console.log(`[DanceDaily] 2h top-up complete: ${allVideos.length} new videos (rotation idx ${idx})`);
  return allVideos;
}

// ─── Merge helper: combine new videos into existing cache, dedup by videoId ──
function mergeDanceVideos(existing: any[], incoming: any[]): any[] {
  const seen = new Set<string>();
  const merged: any[] = [];

  // Existing first (preserves archive)
  for (const v of existing) {
    const key = v.videoId || v.id;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(v);
    }
  }
  // Then new ones
  for (const v of incoming) {
    const key = v.videoId || v.id;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(v);
    }
  }

  // Sort newest → oldest, then cap at DANCE_VIDEO_CAP (keeps the freshest videos)
  merged.sort((a, b) => {
    const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return db - da;
  });

  return merged.slice(0, DANCE_VIDEO_CAP);
}

// GET /dance-videos — returns cached dance videos.
// Uses stale-while-revalidate: if cache exists (even stale), return it INSTANTLY
// and kick off a background refresh so the NEXT visit is fast.
app.get("/make-server-715f71b9/dance-videos", async (c) => {
  try {
    const cached = (await kv.get(DANCE_CACHE_KEY)) as any;
    const cacheAge = cached?.fetchedAt ? Date.now() - new Date(cached.fetchedAt).getTime() : Infinity;

    // ── Check if daily auto-fetch is due ────────────────────────────────────
    const dailyTs = (await kv.get(DANCE_DAILY_KEY)) as any;
    const lastDaily = dailyTs?.ts ? new Date(dailyTs.ts).getTime() : 0;
    const dailyDue = Date.now() - lastDaily > DANCE_DAILY_INTERVAL;

    // ── Fresh cache, daily not due → return instantly ────────────────────────
    if (cached && cacheAge < DANCE_CACHE_TTL && !dailyDue) {
      return c.json(cached);
    }

    // ── Stale cache exists → stale-while-revalidate ──────────────────────────
    // Return existing data IMMEDIATELY, refresh happens in the background.
    // The next visit will get the fresh data — zero wait time for the user.
    if (cached?.videos?.length > 0) {
      // Stamp daily key FIRST to prevent refresh stampede on concurrent requests
      if (dailyDue) await kv.set(DANCE_DAILY_KEY, { ts: new Date().toISOString() });

      // Fire-and-forget — parallel queries make this complete in ~1-2s in the background
      const bgRefresh = dailyDue
        ? fetchDailyOnlyDanceVideos()
          .then((newVideos) => {
            const merged = mergeDanceVideos(cached.videos, newVideos);
            return kv.set(DANCE_CACHE_KEY, {
              videos: merged,
              tiktokCount: 0,
              youtubeCount: merged.length,
              fetchedAt: new Date().toISOString(),
              lastDailyMerge: new Date().toISOString(),
              newToday: newVideos.length,
            });
          })
          .catch((e) => console.log('[Dance] BG daily merge error:', e))
        : fetchYTDanceVideos()
          .then((ytVideos) => {
            const merged = mergeDanceVideos(cached.videos, ytVideos);
            return kv.set(DANCE_CACHE_KEY, {
              videos: merged,
              tiktokCount: 0,
              youtubeCount: merged.length,
              fetchedAt: new Date().toISOString(),
            });
          })
          .catch((e) => console.log('[Dance] BG full refresh error:', e));

      void bgRefresh; // intentionally not awaited — returns response now
      console.log(`[Dance] SWR: returning ${cached.videos.length} cached videos instantly, refreshing in background`);
      return c.json({ ...cached, isStale: true });
    }

    // ── No cache at all → blocking full fetch (first-ever load only) ─────────
    console.log('[Dance] No cache — running initial parallel fetch...');
    const ytVideos = await fetchYTDanceVideos();

    const allVideos = [...ytVideos].sort((a: any, b: any) => {
      const da = a.publishedAt || '';
      const db = b.publishedAt || '';
      return new Date(db).getTime() - new Date(da).getTime();
    });

    const result = {
      videos: allVideos,
      tiktokCount: 0,
      youtubeCount: ytVideos.length,
      fetchedAt: new Date().toISOString(),
    };

    await kv.set(DANCE_CACHE_KEY, result);
    await kv.set(DANCE_DAILY_KEY, { ts: new Date().toISOString() });
    console.log(`[Dance] Cached ${allVideos.length} YouTube Shorts — sorted newest first`);
    return c.json(result);
  } catch (err) {
    console.log("[Dance] Fetch error:", err);
    const stale = (await kv.get(DANCE_CACHE_KEY)) as any;
    if (stale) return c.json(stale);
    return c.json({ error: String(err), videos: [] }, 500);
  }
});

// POST /dance-videos/refresh — force refresh: full fetch MERGED with existing archive
app.post("/make-server-715f71b9/dance-videos/refresh", async (c) => {
  try {
    // Reset rotation index so next auto-cycle starts from 0 (fresh variety)
    await kv.set(DANCE_QUERY_ROTATE_KEY, 0);

    // Grab existing archive before clearing
    const existing = (await kv.get(DANCE_CACHE_KEY)) as any;
    const existingVideos = existing?.videos || [];

    // Full fresh fetch (all 8 relevance + 4 daily queries, parallel)
    const ytVideos = await fetchYTDanceVideos();

    // Merge new + existing (dedup, newest first)
    const merged = mergeDanceVideos(existingVideos, ytVideos);

    const result = {
      videos: merged,
      tiktokCount: 0,
      youtubeCount: merged.length,
      fetchedAt: new Date().toISOString(),
      mergedFrom: existingVideos.length,
      freshFetch: ytVideos.length,
    };

    await kv.set(DANCE_CACHE_KEY, result);
    await kv.set(DANCE_DAILY_KEY, { ts: new Date().toISOString() });
    console.log(`[Dance] Force refresh + merge: ${ytVideos.length} new + ${existingVideos.length} existing = ${merged.length} total`);
    return c.json({ success: true, ...result });
  } catch (err) {
    console.log("[Dance] Refresh error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ─── GIF SEARCH (via GIPHY API) ──────────────────────────────────────────────
app.get("/make-server-715f71b9/chat/gifs", async (c) => {
  try {
    const q = c.req.query("q") || "";
    const apiKey = Deno.env.get("GIPHY_API_KEY");
    if (!apiKey) {
      console.log("[GIF] GIPHY_API_KEY not configured");
      return c.json({ error: "GIPHY API key not configured" }, 500);
    }

    const giphyBase = "https://api.giphy.com/v1/gifs";
    const params = new URLSearchParams({
      api_key: apiKey,
      limit: "24",
      rating: "pg-13",
      lang: "en",
    });

    let url: string;
    if (q.trim()) {
      params.set("q", q.trim());
      url = `${giphyBase}/search?${params}`;
    } else {
      url = `${giphyBase}/trending?${params}`;
    }

    console.log(`[GIF] Fetching: ${q.trim() ? `search "${q.trim()}"` : "trending"}`);
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      const errText = await res.text();
      console.log("[GIF] GIPHY API error:", res.status, errText);
      return c.json({ error: `GIPHY API error: ${res.status}`, details: errText }, 500);
    }
    const data = await res.json();

    const gifs = (data.data || []).map((g: any) => ({
      id: g.id,
      title: g.title || "",
      preview: g.images?.fixed_height_small?.url || g.images?.fixed_height?.url || "",
      url: g.images?.fixed_height?.url || g.images?.original?.url || "",
      width: parseInt(g.images?.fixed_height_small?.width || "200"),
      height: parseInt(g.images?.fixed_height_small?.height || "200"),
    }));

    console.log(`[GIF] Returned ${gifs.length} results`);
    return c.json({ gifs });
  } catch (err) {
    console.log("[GIF] Search error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  MULTIPLAYER GAME ROOMS (Checkers & Chess)
// ═══════════════════════════════════════════════════════════════════════════════

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Create a new game room
app.post('/make-server-715f71b9/games/create', async (c) => {
  try {
    const { game, playerId, playerName } = await c.req.json();
    if (!game || !playerId) return c.json({ error: 'Missing game or playerId' }, 400);

    const roomCode = generateRoomCode();
    const roomKey = `gameroom:${game}:${roomCode}`;

    const roomData = {
      game,
      roomCode,
      createdAt: Date.now(),
      status: 'waiting',
      players: {
        red: { id: playerId, name: playerName || 'Player 1' },
        black: null,
      },
      board: null,
      turn: 'red',
      moveHistory: [],
      lastMoveAt: Date.now(),
      jumpingFrom: null,
      winner: null,
    };

    await kv.set(roomKey, roomData);
    console.log(`[Games] Room ${roomCode} created for ${game} by ${playerName}`);
    return c.json({ roomCode, room: roomData });
  } catch (err) {
    console.log('[Games] Create error:', err);
    return c.json({ error: String(err) }, 500);
  }
});

// Join an existing game room
app.post('/make-server-715f71b9/games/join', async (c) => {
  try {
    const { game, roomCode, playerId, playerName } = await c.req.json();
    if (!game || !roomCode || !playerId) return c.json({ error: 'Missing fields' }, 400);

    const roomKey = `gameroom:${game}:${roomCode.toUpperCase()}`;
    const room = await kv.get(roomKey) as any;
    if (!room) return c.json({ error: 'Room not found' }, 404);
    if (room.status !== 'waiting') return c.json({ error: 'Game already started' }, 400);
    if (room.players.red?.id === playerId) {
      return c.json({ room });
    }

    room.players.black = { id: playerId, name: playerName || 'Player 2' };
    room.status = 'playing';
    room.lastMoveAt = Date.now();

    await kv.set(roomKey, room);
    console.log(`[Games] ${playerName} joined room ${roomCode}`);
    return c.json({ room });
  } catch (err) {
    console.log('[Games] Join error:', err);
    return c.json({ error: String(err) }, 500);
  }
});

// Get current game state (polled by both players)
app.get('/make-server-715f71b9/games/:game/:roomCode', async (c) => {
  try {
    const game = c.req.param('game');
    const roomCode = c.req.param('roomCode')?.toUpperCase();
    const roomKey = `gameroom:${game}:${roomCode}`;
    const room = await kv.get(roomKey);
    if (!room) return c.json({ error: 'Room not found' }, 404);
    return c.json({ room });
  } catch (err) {
    console.log('[Games] Get state error:', err);
    return c.json({ error: String(err) }, 500);
  }
});

// Submit a move (supports both Checkers and Chess fields)
app.post('/make-server-715f71b9/games/:game/:roomCode/move', async (c) => {
  try {
    const game = c.req.param('game');
    const roomCode = c.req.param('roomCode')?.toUpperCase();
    const body = await c.req.json();
    const { playerId, board, turn, moveNotation, jumpingFrom, status, winner,
      castling, enPassant, lastMove, checkStatus } = body;

    const roomKey = `gameroom:${game}:${roomCode}`;
    const room = await kv.get(roomKey) as any;
    if (!room) return c.json({ error: 'Room not found' }, 404);

    const playerColor = room.players.red?.id === playerId ? 'red' : room.players.black?.id === playerId ? 'black' : null;
    if (!playerColor) return c.json({ error: 'Not a player in this room' }, 403);

    room.board = board;
    room.turn = turn;
    room.lastMoveAt = Date.now();
    room.jumpingFrom = jumpingFrom || null;
    if (moveNotation) room.moveHistory.push(moveNotation);
    if (status) room.status = status;
    if (winner) room.winner = winner;
    // Chess-specific fields
    if (castling !== undefined) room.castling = castling;
    if (enPassant !== undefined) room.enPassant = enPassant;
    if (lastMove !== undefined) room.lastMove = lastMove;
    if (checkStatus !== undefined) room.checkStatus = checkStatus;

    await kv.set(roomKey, room);
    return c.json({ room });
  } catch (err) {
    console.log('[Games] Move error:', err);
    return c.json({ error: String(err) }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  OG IMAGE — Social sharing preview for Facebook, Twitter, iMessage, etc.
//
//  GET  /og-image           → Serves the uploaded social sharing image (public)
//  POST /og-image           → Upload / replace the social sharing image
//  GET  /og-image/info      → Returns metadata about the current OG image
//
//  The image is stored in Supabase Storage bucket "make-715f71b9-social"
//  as "og-image.png". A fallback KV key "og_image_url" can hold an external URL.
// ═══════════════════════════════════════════════════════════════════════════════

// Serve the OG image — Facebook / Twitter crawlers hit this URL
app.get('/make-server-715f71b9/og-image', async (c) => {
  try {
    // ── Strategy 1: Serve from Supabase Storage bucket ──────────────────
    const { data: fileData, error: downloadErr } = await supabaseAdmin
      .storage
      .from(OG_BUCKET)
      .download(OG_FILE);

    if (fileData && !downloadErr) {
      const arrayBuf = await fileData.arrayBuffer();
      return new Response(arrayBuf, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // ── Strategy 2: Try alternate image formats in the bucket ───────────
    for (const alt of ['og-image.jpg', 'og-image.jpeg', 'og-image.webp', 'social-share.png', 'social-share.jpg']) {
      const { data: altData, error: altErr } = await supabaseAdmin
        .storage
        .from(OG_BUCKET)
        .download(alt);
      if (altData && !altErr) {
        const buf = await altData.arrayBuffer();
        const mime = alt.endsWith('.webp') ? 'image/webp'
          : alt.endsWith('.jpg') || alt.endsWith('.jpeg') ? 'image/jpeg'
            : 'image/png';
        return new Response(buf, {
          status: 200,
          headers: {
            'Content-Type': mime,
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    }

    // ── Strategy 3: Check KV for an external OG image URL ───────────────
    const kvUrl = await kv.get('og_image_url');
    if (kvUrl && typeof kvUrl === 'string') {
      // Redirect to the stored URL
      return c.redirect(kvUrl, 302);
    }

    // ── Strategy 4: Check ALL storage buckets for common OG image names ─
    const { data: allBuckets } = await supabaseAdmin.storage.listBuckets();
    if (allBuckets?.length) {
      for (const bucket of allBuckets) {
        for (const fname of ['og-image.png', 'og-image.jpg', 'social-share.png', 'social-share.jpg', 'share.png', 'share.jpg']) {
          try {
            const { data: bData, error: bErr } = await supabaseAdmin
              .storage
              .from(bucket.name)
              .download(fname);
            if (bData && !bErr) {
              const buf = await bData.arrayBuffer();
              const mime = fname.endsWith('.jpg') ? 'image/jpeg' : 'image/png';
              console.log(`[OG] Found image in bucket "${bucket.name}/${fname}"`);
              return new Response(buf, {
                status: 200,
                headers: {
                  'Content-Type': mime,
                  'Cache-Control': 'public, max-age=3600, s-maxage=86400',
                  'Access-Control-Allow-Origin': '*',
                },
              });
            }
          } catch { /* skip */ }
        }

        // Also check if there are any image files at the root of each bucket
        try {
          const { data: files } = await supabaseAdmin.storage.from(bucket.name).list('', { limit: 50 });
          if (files?.length) {
            const imageFile = files.find((f: any) =>
              /\.(png|jpg|jpeg|webp)$/i.test(f.name) &&
              (f.name.toLowerCase().includes('og') ||
                f.name.toLowerCase().includes('social') ||
                f.name.toLowerCase().includes('share') ||
                f.name.toLowerCase().includes('preview'))
            );
            if (imageFile) {
              const { data: imgData } = await supabaseAdmin.storage
                .from(bucket.name)
                .download(imageFile.name);
              if (imgData) {
                const buf = await imgData.arrayBuffer();
                const mime = imageFile.name.endsWith('.jpg') || imageFile.name.endsWith('.jpeg')
                  ? 'image/jpeg' : imageFile.name.endsWith('.webp') ? 'image/webp' : 'image/png';
                console.log(`[OG] Found image "${imageFile.name}" in bucket "${bucket.name}"`);
                return new Response(buf, {
                  status: 200,
                  headers: {
                    'Content-Type': mime,
                    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
                    'Access-Control-Allow-Origin': '*',
                  },
                });
              }
            }
          }
        } catch { /* skip */ }
      }
    }

    console.log('[OG] No social sharing image found in any bucket or KV');
    return c.json({ error: 'No OG image found. Upload one via POST /og-image or place it in Supabase Storage.' }, 404);
  } catch (err) {
    console.log('[OG] Error serving OG image:', err);
    return c.json({ error: `OG image error: ${err}` }, 500);
  }
});

// Upload / replace the OG image
app.post('/make-server-715f71b9/og-image', async (c) => {
  try {
    const contentType = c.req.header('Content-Type') || '';

    // ── Option A: Direct binary upload (Content-Type: image/*) ──────────
    if (contentType.startsWith('image/')) {
      const blob = await c.req.blob();
      const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg'
        : contentType.includes('webp') ? 'webp' : 'png';
      const fileName = `og-image.${ext}`;

      const { error } = await supabaseAdmin.storage
        .from(OG_BUCKET)
        .upload(fileName, blob, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.log('[OG] Upload error:', error);
        return c.json({ error: `Upload failed: ${error.message}` }, 500);
      }

      console.log(`[OG] Uploaded social sharing image → ${OG_BUCKET}/${fileName}`);
      return c.json({ success: true, bucket: OG_BUCKET, file: fileName });
    }

    // ── Option B: JSON body with a URL to store in KV ───────────────────
    if (contentType.includes('json')) {
      const { url } = await c.req.json();
      if (!url) return c.json({ error: 'Provide { url: "..." } or upload image binary' }, 400);
      await kv.set('og_image_url', url);
      console.log(`[OG] Stored OG image URL in KV: ${url}`);
      return c.json({ success: true, url });
    }

    // ── Option C: multipart/form-data ───────────────────────────────────
    if (contentType.includes('multipart')) {
      const formData = await c.req.formData();
      const file = formData.get('image') || formData.get('file');
      if (!file || !(file instanceof File)) {
        return c.json({ error: 'Include an "image" or "file" field in the form data' }, 400);
      }
      const mime = file.type || 'image/png';
      const ext = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg'
        : mime.includes('webp') ? 'webp' : 'png';
      const fileName = `og-image.${ext}`;

      const { error } = await supabaseAdmin.storage
        .from(OG_BUCKET)
        .upload(fileName, file, {
          contentType: mime,
          upsert: true,
        });

      if (error) {
        console.log('[OG] Form upload error:', error);
        return c.json({ error: `Upload failed: ${error.message}` }, 500);
      }

      console.log(`[OG] Uploaded social sharing image (form) → ${OG_BUCKET}/${fileName}`);
      return c.json({ success: true, bucket: OG_BUCKET, file: fileName });
    }

    return c.json({ error: 'Unsupported Content-Type. Send image/* binary, multipart form, or JSON with url.' }, 400);
  } catch (err) {
    console.log('[OG] Upload error:', err);
    return c.json({ error: `OG image upload error: ${err}` }, 500);
  }
});

// Get info about the current OG image
app.get('/make-server-715f71b9/og-image/info', async (c) => {
  try {
    const results: any = { found: false, sources: [] };

    // Check primary bucket
    const { data: files } = await supabaseAdmin.storage.from(OG_BUCKET).list('', { limit: 20 });
    if (files?.length) {
      const imageFiles = files.filter((f: any) => /\.(png|jpg|jpeg|webp)$/i.test(f.name));
      if (imageFiles.length) {
        results.found = true;
        results.sources.push({
          type: 'storage',
          bucket: OG_BUCKET,
          files: imageFiles.map((f: any) => ({ name: f.name, size: f.metadata?.size })),
        });
      }
    }

    // Check KV
    const kvUrl = await kv.get('og_image_url');
    if (kvUrl) {
      results.found = true;
      results.sources.push({ type: 'kv', url: kvUrl });
    }

    // Check other buckets
    const { data: allBuckets } = await supabaseAdmin.storage.listBuckets();
    if (allBuckets?.length) {
      for (const bucket of allBuckets) {
        if (bucket.name === OG_BUCKET) continue;
        try {
          const { data: bFiles } = await supabaseAdmin.storage.from(bucket.name).list('', { limit: 50 });
          const imgs = bFiles?.filter((f: any) =>
            /\.(png|jpg|jpeg|webp)$/i.test(f.name) &&
            (f.name.toLowerCase().includes('og') ||
              f.name.toLowerCase().includes('social') ||
              f.name.toLowerCase().includes('share') ||
              f.name.toLowerCase().includes('preview'))
          );
          if (imgs?.length) {
            results.found = true;
            results.sources.push({
              type: 'storage',
              bucket: bucket.name,
              files: imgs.map((f: any) => ({ name: f.name, size: f.metadata?.size })),
            });
          }
        } catch { /* skip */ }
      }
    }

    const ogUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/make-server-715f71b9/og-image`;
    results.ogImageUrl = ogUrl;
    results.instructions = results.found
      ? 'Your OG image is configured. Facebook/Twitter will use the URL in ogImageUrl when your link is shared.'
      : 'No OG image found. Upload one via: POST /make-server-715f71b9/og-image (image binary, form-data, or JSON { url })';

    return c.json(results);
  } catch (err) {
    console.log('[OG] Info error:', err);
    return c.json({ error: String(err) }, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
//  PROJECT 24K CRATE — VAULT + PADDLE PAYMENT ENGINE
// ══════════════════════════════════════════════════════════════════════════════

const PADDLE_WEBHOOK_SECRET = Deno.env.get("PADDLE_WEBHOOK_SECRET") || "";

// ── Two separate SDK instances ───────────────────────────────────────────────
// paddleSDK  — webhook-only; unmarshal() uses PADDLE_WEBHOOK_SECRET, not the
//              API key, so passing "" here is intentional.
const paddleSDK = new Paddle("");

// paddleAPI  — server-side API calls (Customer Portal, etc.).
//              Requires PADDLE_API_SECRET (your Paddle secret/API key).
//              The server boots safely even when this secret is absent.
const PADDLE_API_SECRET = Deno.env.get("PADDLE_API_SECRET") || "";
const paddleAPI = PADDLE_API_SECRET ? new Paddle(PADDLE_API_SECRET) : null;

const GUEST_CRATE_LIMIT = 7;

interface CrateItem {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  source?: string;
  soundcloudUrl?: string;
  addedAt: string;
}

interface VaultRecord {
  visitorId: string;
  secretKey: string | null;
  crate: CrateItem[];
  paddleCustomerId: string | null;
  is24k: boolean;
  createdAt: string;
  updatedAt: string;
}

const vaultKey = (v: string) => `vault:v:${v}`;
const secretRevKey = (s: string) => `vault:s:${s}`;

function generateVaultSecretKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `J-CLUB-${seg(4)}-${seg(4)}-${seg(4)}`;
}

async function getVault(visitorId: string): Promise<VaultRecord | null> {
  return (await kv.get(vaultKey(visitorId))) as VaultRecord | null;
}

async function saveVault(vault: VaultRecord): Promise<void> {
  vault.updatedAt = new Date().toISOString();
  await kv.set(vaultKey(vault.visitorId), vault);
}

// POST /vault/identify — get or create vault record for a visitorId
app.post("/make-server-715f71b9/vault/identify", async (c) => {
  try {
    const { visitorId } = await c.req.json();
    if (!visitorId) return c.json({ error: "Missing visitorId" }, 400);
    let vault = await getVault(visitorId);
    if (!vault) {
      vault = { visitorId, secretKey: null, crate: [], paddleCustomerId: null, is24k: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await saveVault(vault);
      console.log(`[Vault] New vault for ${visitorId.slice(0, 12)}`);
    }
    return c.json({ visitorId: vault.visitorId, is24k: vault.is24k, crate: vault.crate, hasSecretKey: !!vault.secretKey, secretKey: vault.is24k ? vault.secretKey : null });
  } catch (err) {
    console.log("[Vault] identify error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// GET /vault/status/:visitorId — poll 24k status (called after Paddle redirect)
app.get("/make-server-715f71b9/vault/status/:visitorId", async (c) => {
  try {
    const visitorId = c.req.param("visitorId");
    const vault = await getVault(visitorId);
    if (!vault) return c.json({ is24k: false, crate: [], hasSecretKey: false, secretKey: null });
    return c.json({ is24k: vault.is24k, crate: vault.crate, hasSecretKey: !!vault.secretKey, secretKey: vault.is24k ? vault.secretKey : null });
  } catch (err) {
    console.log("[Vault] status error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// POST /vault/claim — claim new device using Secret Key
app.post("/make-server-715f71b9/vault/claim", async (c) => {
  try {
    const { secretKey, newVisitorId } = await c.req.json();
    if (!secretKey || !newVisitorId) return c.json({ error: "Missing secretKey or newVisitorId" }, 400);
    const normalizedKey = secretKey.trim().toUpperCase();
    const originalVisitorId = (await kv.get(secretRevKey(normalizedKey))) as string | null;
    if (!originalVisitorId) return c.json({ error: "Invalid secret key. Double-check your code and try again." }, 404);
    const vault = await getVault(originalVisitorId);
    if (!vault || !vault.is24k) return c.json({ error: "No active 24k Gold subscription for this key." }, 404);
    const newVault: VaultRecord = { ...vault, visitorId: newVisitorId, updatedAt: new Date().toISOString() };
    await saveVault(newVault);
    console.log(`[Vault] Device claimed: ${newVisitorId.slice(0, 12)} via ${normalizedKey.slice(0, 10)}`);
    return c.json({ visitorId: newVisitorId, is24k: true, crate: newVault.crate, hasSecretKey: true, secretKey: newVault.secretKey });
  } catch (err) {
    console.log("[Vault] claim error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// POST /vault/crate/sync — add or remove a track from the crate
app.post("/make-server-715f71b9/vault/crate/sync", async (c) => {
  try {
    const { visitorId, action, item, videoId } = await c.req.json();
    if (!visitorId || !action) return c.json({ error: "Missing visitorId or action" }, 400);
    let vault = await getVault(visitorId);
    if (!vault) return c.json({ error: "Vault not found. Call /vault/identify first." }, 404);
    if (action === "add") {
      if (!item?.videoId) return c.json({ error: "Missing item.videoId for add" }, 400);
      if (!vault.is24k && vault.crate.length >= GUEST_CRATE_LIMIT) {
        return c.json({ error: "PAYWALL", crateCount: vault.crate.length }, 403);
      }
      if (!vault.crate.find((x) => x.videoId === item.videoId)) {
        vault.crate = [...vault.crate, { ...item, addedAt: item.addedAt || new Date().toISOString() }];
        await saveVault(vault);
      }
    } else if (action === "remove") {
      const vid = videoId || item?.videoId;
      if (!vid) return c.json({ error: "Missing videoId for remove" }, 400);
      vault.crate = vault.crate.filter((x) => x.videoId !== vid);
      await saveVault(vault);
    } else {
      return c.json({ error: 'Invalid action. Use "add" or "remove".' }, 400);
    }
    return c.json({ success: true, crate: vault.crate, crateCount: vault.crate.length });
  } catch (err) {
    console.log("[Vault] crate sync error:", err);
    return c.json({ error: String(err) }, 500);
  }
});

// ── Paddle entity reference ────────────────────────────────────────────────
//  pro_  →  Product  — name, image, tax category (configured once in dashboard)
//  pri_  →  Price    — the $7.99 one-time amount + billing frequency
//
//  PADDLE_CLIENT_TOKEN   live_***  public — safe to send to the browser
//  PADDLE_PRICE_ID       pri_***   public — passed to Paddle.js Checkout.open()
//  PADDLE_WEBHOOK_SECRET secret    server-only — signs/verifies webhook events
// ──────────────────────────────────────────────────────────────────────────

// GET /paddle/config — return public client token + price ID (safe to expose)
app.get("/make-server-715f71b9/paddle/config", (c) => {
  const clientToken = Deno.env.get("PADDLE_CLIENT_TOKEN") || "";
  const priceId = Deno.env.get("PADDLE_PRICE_ID") || "";

  // Auto-detect environment from token prefix; PADDLE_ENVIRONMENT can override.
  let environment = Deno.env.get("PADDLE_ENVIRONMENT") || "";
  if (!environment) {
    environment = clientToken.startsWith("test_") ? "sandbox" : "production";
  }

  // Guard: must have both secrets to proceed
  if (!clientToken) {
    console.log("[Paddle] Config: PADDLE_CLIENT_TOKEN is not set");
    return c.json({ error: "PADDLE_CLIENT_TOKEN is not set in Supabase secrets. Add your Paddle client-side token (live_… or test_…)." }, 500);
  }
  if (!priceId) {
    console.log("[Paddle] Config: PADDLE_PRICE_ID is not set");
    return c.json({ error: "PADDLE_PRICE_ID is not set in Supabase secrets. Add your Paddle Price ID (starts with pri_)." }, 500);
  }

  // Guard: PADDLE_PRICE_ID must be a Price entity (pri_…), never a Product (pro_…)
  if (!priceId.startsWith("pri_")) {
    console.log(`[Paddle] Config error: PADDLE_PRICE_ID "${priceId}" must start with pri_, not pro_`);
    return c.json({ error: `PADDLE_PRICE_ID must be a Price entity starting with "pri_". Got: "${priceId}". Open Paddle dashboard → Catalog → Prices to copy the correct ID.` }, 500);
  }

  // Auto-fix env/token mismatch
  if (environment === "production" && clientToken.startsWith("test_")) {
    console.log("[Paddle] Warning: test_ token used with production — auto-switching to sandbox");
    environment = "sandbox";
  }
  if (environment === "sandbox" && clientToken.startsWith("live_")) {
    console.log("[Paddle] Warning: live_ token used with sandbox — auto-switching to production");
    environment = "production";
  }

  console.log(`[Paddle] Config served: env=${environment}, priceId=${priceId.slice(0, 12)}…`);
  return c.json({ clientToken, priceId, environment });
});

// POST /paddle/webhook — Paddle event handler (transaction.completed → activate 24K)
// Uses @paddle/paddle-node-sdk unmarshal() for official signature verification
// and typed EventName constants — no manual HMAC needed.
app.post("/make-server-715f71b9/paddle/webhook", async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header("Paddle-Signature") || "";

  // ── Step 1: verify + parse via official SDK ─────────────────────────────
  // unmarshal(body, secretKey, signature) checks ts= / h1= and returns a
  // fully-typed Event with camelCase fields (customData, customerId, etc.)
  let eventData: any;
  try {
    if (!PADDLE_WEBHOOK_SECRET) {
      console.log("[Paddle] PADDLE_WEBHOOK_SECRET not set — cannot verify webhook");
      return c.json({ error: "Webhook secret not configured" }, 500);
    }
    eventData = await paddleSDK.webhooks.unmarshal(rawBody, PADDLE_WEBHOOK_SECRET, signature);
  } catch (err: any) {
    console.log("[Paddle] Webhook verification failed:", err?.message ?? err);
    return c.text("Invalid Signature", 400);
  }

  console.log(`[Paddle] Event received: ${eventData.eventType}`);

  // ── Step 2: transaction.completed → flip the 24K Gold switch ────────────
  // customData.visitorId was set by CrateContext.tsx's Checkout.open() call,
  // so we know exactly which browser fingerprint to upgrade.
  if (eventData.eventType === EventName.TransactionCompleted) {
    const data = eventData.data;
    const visitorId = (data?.customData as any)?.visitorId as string | undefined;

    if (!visitorId) {
      console.log("[Paddle] transaction.completed — no customData.visitorId, skipping");
      return c.json({ received: true });
    }

    console.log(`[Paddle] Activating 24K Gold for visitor: ${visitorId.slice(0, 12)}…`);

    try {
      let vault = await getVault(visitorId);
      if (!vault) {
        vault = {
          visitorId,
          secretKey: null,
          crate: [],
          paddleCustomerId: null,
          is24k: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      vault.is24k = true;
      vault.paddleCustomerId = data?.customerId ?? vault.paddleCustomerId;

      if (!vault.secretKey) {
        const sk = generateVaultSecretKey();
        vault.secretKey = sk;
        await kv.set(secretRevKey(sk), visitorId);
        console.log(`[Paddle] Secret key minted for ${visitorId.slice(0, 12)}…`);
      }

      await saveVault(vault);
      await appendTickerEvent("⭐ A fan just went 24K GOLD on Jersey Club Radio! 🏆");
      console.log(`[Paddle] 24K Gold activated: ${visitorId.slice(0, 12)}…`);
    } catch (err) {
      console.log("[Paddle] Vault update error:", err);
    }
  }

  return c.json({ received: true });
});

// GET /paddle/portal/:visitorId — create a Paddle Customer Portal session
// and return the secure overview URL so the user can view receipts / invoices.
// This is a one-time payment product so subscriptionIds is an empty array;
// the portal still surfaces full billing history and invoice PDFs.
app.get("/make-server-715f71b9/paddle/portal/:visitorId", async (c) => {
  const visitorId = c.req.param("visitorId");
  if (!visitorId) {
    return c.json({ error: "visitorId is required" }, 400);
  }

  if (!paddleAPI) {
    console.log("[Paddle] Portal request failed — PADDLE_API_SECRET not configured");
    return c.json({ error: "PADDLE_API_SECRET not configured on the server" }, 500);
  }

  // Verify the visitor is a genuine 24K member
  const vault = await getVault(visitorId);
  if (!vault?.is24k) {
    console.log(`[Paddle] Portal denied — visitor ${visitorId.slice(0, 12)}… is not 24K`);
    return c.json({ error: "Not a 24K Gold member" }, 403);
  }

  const customerId = vault.paddleCustomerId;
  if (!customerId) {
    console.log(`[Paddle] Portal denied — no Paddle customerId for ${visitorId.slice(0, 12)}…`);
    return c.json({ error: "No Paddle customer on file for this visitor" }, 404);
  }

  try {
    // Create a short-lived, authenticated portal session for this customer.
    // subscriptionIds is empty because Project 24K is a one-time payment product.
    const portalSession = await paddleAPI.customerPortals.create(customerId, {
      subscriptionIds: [],
    });
    const url = portalSession.urls.general.overview;
    console.log(`[Paddle] Portal session created for ${visitorId.slice(0, 12)}…`);
    return c.json({ url });
  } catch (err: any) {
    console.log("[Paddle] Portal creation error:", err?.message ?? err);
    return c.json({ error: `Portal creation failed: ${err?.message ?? "unknown error"}` }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  RADIO STATION SYNC — keeps all listeners hearing the same track
//  Server stores a lightweight "now playing" state; clients sync on connect.
//  Manual user actions (browse, skip) NEVER touch this — only automatic
//  crossfade progression in radio mode updates the global station clock.
// ═══════════════════════════════════════════════════════════════════════════════

// GET /radio/now-playing — returns current global radio state
// Includes stale walk-forward with true compare-and-swap (up to 3 retries).
app.get("/make-server-715f71b9/radio/now-playing", async (c) => {
  try {
    const state: any = await kv.get("radio_now_playing_v1");
    console.log(`[Radio][DEBUG] now-playing read:`, JSON.stringify(state));

    // ── Stale walk-forward with CAS retry loop ─────────────────────────────
    if (state?.videoId && state.durationSec > 0 && state.startedAt) {
      const elapsed = (Date.now() - state.startedAt) / 1000;
      if (elapsed > state.durationSec + 2) {
        const playlist: any[] = ((await kv.get("jc_tracks_v2")) as any[]) || [];
        if (playlist.length > 0) {
          const MAX_CAS_RETRIES = 3;

          for (let attempt = 0; attempt < MAX_CAS_RETRIES; attempt++) {
            // Re-read state on each CAS attempt (first iteration reuses initial read)
            const casState: any = attempt === 0
              ? state
              : await kv.get("radio_now_playing_v1");

            if (!casState?.videoId || !casState.startedAt) break;

            const casElapsed = (Date.now() - casState.startedAt) / 1000;
            const casDur = casState.durationSec || 0;
            if (casDur <= 0 || casElapsed <= casDur + 2) {
              // State is no longer stale (another client advanced it) — return it
              console.log(`[Radio] CAS attempt ${attempt + 1}: state no longer stale, returning current`);
              return c.json({ state: casState });
            }

            const currentIdx = playlist.findIndex((t: any) => t.id?.videoId === casState.videoId);
            if (currentIdx < 0) break;

            // ── Dynamic avg duration ──────────────────────────────────────────
            const FALLBACK_DUR = 210;
            let avgDur = FALLBACK_DUR;
            try {
              const stats: any = await kv.get("radio_avg_duration_v1");
              if (stats?.totalSec && stats?.count && stats.count > 0) {
                avgDur = Math.round(stats.totalSec / stats.count);
                if (avgDur < 60 || avgDur > 600) avgDur = FALLBACK_DUR;
              }
            } catch { /* fall back to 210 */ }

            // ── Walk through playlist ─────────────────────────────────────────
            let walkTime = casElapsed - casDur;
            let idx = (currentIdx + 1) % playlist.length;
            let walked = 0;
            const MAX_WALK = 200;
            let targetIdx = -1;
            let targetWalkTime = 0;

            while (walked < MAX_WALK) {
              if (walkTime <= avgDur) {
                targetIdx = idx;
                targetWalkTime = walkTime;
                break;
              }
              walkTime -= avgDur;
              idx = (idx + 1) % playlist.length;
              walked++;
            }

            if (targetIdx < 0) break; // walked too far, give up

            // ── CAS: re-read and compare before writing ───────────────────────
            const freshState: any = await kv.get("radio_now_playing_v1");
            if (freshState?.videoId !== casState.videoId || freshState?.startedAt !== casState.startedAt) {
              console.log(`[Radio] CAS conflict attempt ${attempt + 1}/${MAX_CAS_RETRIES}: expected ${casState.videoId}@${casState.startedAt}, found ${freshState?.videoId}@${freshState?.startedAt}`);
              if (attempt === MAX_CAS_RETRIES - 1) {
                console.log(`[Radio] CAS gave up after ${MAX_CAS_RETRIES} retries, returning current state`);
                return c.json({ state: freshState || casState });
              }
              continue; // retry with fresh state
            }

            // CAS succeeded — safe to write
            const newStartedAt = Date.now() - (targetWalkTime * 1000);
            const newState = { videoId: playlist[targetIdx].id.videoId, startedAt: newStartedAt, durationSec: 0 };
            await kv.set("radio_now_playing_v1", newState);
            console.log(`[Radio] Walk-forward CAS success (attempt ${attempt + 1}): skipped ${walked} tracks → ${playlist[targetIdx].id.videoId} (avgDur=${avgDur}s)`);
            return c.json({ state: newState, walkedForward: true });
          }
        }
      }
    }

    return c.json({ state: state || null });
  } catch (e) {
    console.log("[Radio] now-playing error:", e);
    return c.json({ state: null });
  }
});

// POST /radio/advance — a client's crossfade engine reports the new track
// Only accepts if the new startedAt is newer than current (prevents races)
app.post("/make-server-715f71b9/radio/advance", async (c) => {
  try {
    const { videoId, startedAt, durationSec } = await c.req.json();
    if (!videoId || !startedAt) {
      return c.json({ error: "videoId and startedAt required" }, 400);
    }

    const current: any = await kv.get("radio_now_playing_v1");
    console.log(`[Radio][DEBUG] advance: current=${JSON.stringify(current)}, incoming=${videoId}@${startedAt}`);

    // Only accept the advance if it's genuinely newer
    if (current && current.startedAt >= startedAt) {
      return c.json({ status: "stale", state: current });
    }

    const newState = { videoId, startedAt, durationSec: durationSec || 0 };
    await kv.set("radio_now_playing_v1", newState);
    console.log(`[Radio] Station advanced → ${videoId} at ${new Date(startedAt).toISOString()}`);
    return c.json({ status: "ok", state: newState });
  } catch (e) {
    console.log("[Radio] advance error:", e);
    return c.json({ error: "Advance failed", details: String(e) }, 500);
  }
});

// POST /radio/report-duration — clients report actual track duration once known
// Also feeds a KV-backed running average used by walk-forward logic.
app.post("/make-server-715f71b9/radio/report-duration", async (c) => {
  try {
    const { videoId, durationSec } = await c.req.json();
    if (!videoId || !durationSec) return c.json({ status: "ok" });

    const current: any = await kv.get("radio_now_playing_v1");
    console.log(`[Radio][DEBUG] report-duration: current=${JSON.stringify(current)}, reported=${videoId} dur=${durationSec}s`);
    if (current && current.videoId === videoId && durationSec > 0) {
      current.durationSec = durationSec;
      await kv.set("radio_now_playing_v1", current);

      // ── Feed running average for walk-forward dynamic duration ──────────
      try {
        const stats: any = (await kv.get("radio_avg_duration_v1")) || { totalSec: 0, count: 0 };
        // Only add reasonable durations (30s–900s) to avoid polluting the average
        if (durationSec >= 30 && durationSec <= 900) {
          stats.totalSec = (stats.totalSec || 0) + durationSec;
          stats.count = (stats.count || 0) + 1;
          // Cap at 500 samples — halve to keep the average weighted toward recent
          if (stats.count > 500) {
            stats.totalSec = Math.round(stats.totalSec / stats.count) * 250;
            stats.count = 250;
          }
          await kv.set("radio_avg_duration_v1", stats);
        }
      } catch (e) {
        console.log("[Radio] avg duration update (non-critical):", e);
      }
    }
    return c.json({ status: "ok" });
  } catch (e) {
    console.log("[Radio] report-duration error (non-critical):", e);
    return c.json({ status: "ok" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  LISTENER COUNT — single summary key, no prefix scan
//  Uses radio_listener_summary_v1: { listeners: {id: lastSeen}, count, updatedAt }
//  Heartbeat POST updates the summary + prunes expired (>90s) entries in-place.
//  GET reads the single key directly — O(1) instead of O(n) prefix scan.
//
//  VISITOR LOG — persistent record of every unique visitor (never pruned)
//  Uses radio_visitor_log_v1: { visitors: {id: {firstSeen, lastSeen, visits}}, totalUnique, updatedAt }
//  Heartbeat also upserts into this log so we keep a permanent record.
// ═══════════════════════════════════════════════════════════════════════════════

const LISTENER_TTL_MS = 90_000; // 90 seconds — matches client 30s heartbeat × 3 missed

// POST /radio/heartbeat — update summary key with this listener, prune expired
app.post("/make-server-715f71b9/radio/heartbeat", async (c) => {
  try {
    const { guestId } = await c.req.json().catch(() => ({ guestId: "anon" }));
    const id = guestId || "anon_" + Math.random().toString(36).slice(2, 8);
    const now = Date.now();

    // ── 1. Active listeners (TTL-based, same as before) ──────────────────
    const summary: any = (await kv.get("radio_listener_summary_v1")) || { listeners: {}, count: 0, updatedAt: 0 };
    const listeners: Record<string, number> = summary.listeners || {};

    listeners[id] = now;

    const cutoff = now - LISTENER_TTL_MS;
    const expiredIds: string[] = [];
    for (const [lid, lastSeen] of Object.entries(listeners)) {
      if ((lastSeen as number) < cutoff) expiredIds.push(lid);
    }
    for (const eid of expiredIds) {
      delete listeners[eid];
    }

    const activeCount = Object.keys(listeners).length;
    await kv.set("radio_listener_summary_v1", { listeners, count: activeCount, updatedAt: now });

    if (expiredIds.length > 0) {
      console.log(`[Radio] Heartbeat: pruned ${expiredIds.length} expired listeners, ${activeCount} active`);
    }

    // ── 2. Persistent visitor log (never pruned) ─────────────────────────
    // Skip anonymous fallback IDs — only persist real guest identities
    if (!id.startsWith("anon_")) {
      try {
        const visitorLog: any = (await kv.get("radio_visitor_log_v1")) || { visitors: {}, totalUnique: 0, updatedAt: 0 };
        const visitors: Record<string, { firstSeen: number; lastSeen: number; visits: number }> = visitorLog.visitors || {};

        if (visitors[id]) {
          visitors[id].lastSeen = now;
          visitors[id].visits += 1;
        } else {
          visitors[id] = { firstSeen: now, lastSeen: now, visits: 1 };
          console.log(`[Radio] New unique visitor: ${id.slice(0, 8)}… (total: ${Object.keys(visitors).length})`);
        }

        const totalUnique = Object.keys(visitors).length;
        await kv.set("radio_visitor_log_v1", { visitors, totalUnique, updatedAt: now });
      } catch (vErr) {
        console.log("[Radio] Visitor log update error:", vErr);
      }
    }

    return c.json({ status: "ok" });
  } catch (e) {
    console.log("[Radio] heartbeat error:", e);
    return c.json({ status: "ok" });
  }
});

// GET /radio/listeners — active count + persistent total visitors
app.get("/make-server-715f71b9/radio/listeners", async (c) => {
  try {
    const [summary, visitorLog]: [any, any] = await Promise.all([
      kv.get("radio_listener_summary_v1"),
      kv.get("radio_visitor_log_v1"),
    ]);

    let activeCount = 1;
    if (summary?.listeners) {
      const now = Date.now();
      const cutoffTime = now - LISTENER_TTL_MS;
      const lsnrs: Record<string, number> = summary.listeners;
      activeCount = 0;
      for (const lastSeen of Object.values(lsnrs)) {
        if ((lastSeen as number) >= cutoffTime) activeCount++;
      }
      console.log(`[Radio][DEBUG] listeners: ${activeCount} active (summary has ${Object.keys(lsnrs).length} entries, updatedAt=${new Date(summary.updatedAt).toISOString()})`);
    }

    const totalVisitors = visitorLog?.totalUnique || 0;

    return c.json({ count: Math.max(1, activeCount), totalVisitors });
  } catch (e) {
    console.log("[Radio] listeners error:", e);
    return c.json({ count: 1, totalVisitors: 0 });
  }
});

// GET /radio/visitors — full visitor log with recent visitors list
app.get("/make-server-715f71b9/radio/visitors", async (c) => {
  try {
    const visitorLog: any = await kv.get("radio_visitor_log_v1");
    if (!visitorLog?.visitors) {
      return c.json({ totalUnique: 0, recentVisitors: [] });
    }

    const visitors = visitorLog.visitors as Record<string, { firstSeen: number; lastSeen: number; visits: number }>;
    const totalUnique = Object.keys(visitors).length;

    // Return the 50 most recent visitors (sorted by lastSeen descending)
    const recentVisitors = Object.entries(visitors)
      .map(([vid, data]) => ({
        id: vid.slice(0, 8) + "…",
        firstSeen: new Date(data.firstSeen).toISOString(),
        lastSeen: new Date(data.lastSeen).toISOString(),
        visits: data.visits,
      }))
      .sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime())
      .slice(0, 50);

    return c.json({ totalUnique, recentVisitors, updatedAt: visitorLog.updatedAt });
  } catch (e) {
    console.log("[Radio] visitors error:", e);
    return c.json({ totalUnique: 0, recentVisitors: [] });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SITE VISITOR TRACKING — server-side IP geolocation for the heat map
//  Tracks EVERY page visitor (not just track plays) using ip-api.com (free for
//  server-side use). Stores lat/lon, city, country, region in a persistent KV
//  key so the heat map displays days/weeks of historical visitor data.
//
//  Key: jc_site_visitors_v2
//  Shape: { visitors: { [guestId]: { lat, lon, city, country, region, firstSeen, lastSeen, visits } }, updatedAt }
// ═══════════════════════════════════════════════════════════════════════════════

// Server-side IP geolocation via ipapi.co (HTTPS, works with datacenter IPs, 1000 req/day free)
async function geolocateIP(ip: string): Promise<{ lat: number | null; lon: number | null; city: string; country: string; region: string }> {
  const fallback = { lat: null, lon: null, city: 'Unknown', country: 'Unknown', region: '' };
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1') return fallback;
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json();
    if (data.latitude != null && data.longitude != null) {
      return {
        lat: data.latitude,
        lon: data.longitude,
        city: data.city || 'Unknown',
        country: data.country_name || data.country || 'Unknown',
        region: data.region || '',
      };
    }
  } catch (e) {
    console.log('[Geo] ipapi.co lookup failed:', e);
  }
  return fallback;
}


const SITE_VISITORS_KEY = 'jc_site_visitors_v2';
const MAX_SITE_VISITORS = 15000; // cap to prevent unbounded growth

// POST /visits/log — record a page visit with server-side geolocation
// Called once on every page load (fire-and-forget from frontend).
app.post("/make-server-715f71b9/visits/log", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const guestId = body.guestId || 'anon_' + Math.random().toString(36).slice(2, 8);
    const now = Date.now();

    // Get visitor's real IP from proxy headers
    const ip = extractIP(c);

    // Server-side geolocation
    const geo = await geolocateIP(ip);

    // If geo API failed, try client-provided fallbacks then CITY_COORDS → COUNTRY_COORDS
    const _resolvedCity = geo.city !== 'Unknown' ? geo.city : (body.city || 'Unknown');
    const _resolvedCountry = geo.country !== 'Unknown' ? geo.country : (body.country || 'Unknown');
    const _fallbackCoords = CITY_COORDS[_resolvedCity] ?? COUNTRY_COORDS[_resolvedCountry];
    const lat = geo.lat ?? body.lat ?? (_fallbackCoords?.[0] ?? null);
    const lon = geo.lon ?? body.lon ?? (_fallbackCoords?.[1] ?? null);
    const city = geo.city !== 'Unknown' ? geo.city : (body.city || 'Unknown');
    const country = geo.country !== 'Unknown' ? geo.country : (body.country || 'Unknown');
    const region = geo.region || body.region || '';

    // Persist to the site visitors store
    const store: any = (await kv.get(SITE_VISITORS_KEY)) || { visitors: {}, updatedAt: 0 };
    const visitors = store.visitors || {};

    if (visitors[guestId]) {
      // Returning visitor — update lastSeen and increment visits
      visitors[guestId].lastSeen = now;
      visitors[guestId].visits = (visitors[guestId].visits || 1) + 1;
      // Update geo if we got better data this time
      if (lat != null && visitors[guestId].lat == null) {
        visitors[guestId].lat = lat;
        visitors[guestId].lon = lon;
        visitors[guestId].city = city;
        visitors[guestId].country = country;
        visitors[guestId].region = region;
      }
    } else {
      // New visitor
      if (Object.keys(visitors).length < MAX_SITE_VISITORS) {
        visitors[guestId] = {
          lat, lon, city, country, region,
          firstSeen: now,
          lastSeen: now,
          visits: 1,
        };
        console.log(`[Visits] New visitor: ${guestId.slice(0, 8)}… from ${city}, ${country} (${lat?.toFixed(2)}, ${lon?.toFixed(2)})`);
      }
    }

    await kv.set(SITE_VISITORS_KEY, { visitors, updatedAt: now });

    // Also persist into the legacy play-based visitor map so both systems stay synced
    if (lat != null && lon != null) {
      const mapKey = 'jc_visitor_map_v1';
      const visitorMap = ((await kv.get(mapKey)) as any[]) || [];
      const alreadyMapped = visitorMap.some((v: any) => v.guestId === guestId);
      if (!alreadyMapped && visitorMap.length < 10000) {
        visitorMap.push({
          guestId, lat, lon,
          city: city || 'Unknown',
          country: country || 'Unknown',
          firstSeen: new Date(now).toISOString(),
        });
        await kv.set(mapKey, visitorMap);
      }
    }

    return c.json({ success: true, city, country, lat, lon });
  } catch (err) {
    console.log('[Visits] log error:', err);
    return c.json({ error: String(err) }, 500);
  }
});

// GET /visits/map — all-time visitor dots for the heat map, merged from three sources:
//  1. jc_site_visitors_v2 — richest: has visit counts + accurate GPS coords
//  2. jc_visitor_map_v1  — play-based legacy dots
//  3. listener_* keys    — historical play-listener data (city→coords fallback)
// Returns { dots, totalVisitors, uniqueCountries } with density weighting.
app.get("/make-server-715f71b9/visits/map", async (c) => {
  try {
    // Fetch all three data sources in parallel
    const [siteStore, legacyMap, listenerEntries]: [any, any[], any[]] = await Promise.all([
      kv.get(SITE_VISITORS_KEY),
      kv.get('jc_visitor_map_v1').then((v: any) => (v as any[]) || []),
      kv.getByPrefix('listener_').then((v: any) => (v as any[]).filter(Boolean)),
    ]);

    const seen = new Set<string>();
    const countries = new Set<string>();
    const dots: { lat: number; lon: number; city: string; country: string; visits: number }[] = [];

    const addDot = (lat: number, lon: number, city: string, country: string, visits: number, dedupKey: string) => {
      if (seen.has(dedupKey)) return;
      seen.add(dedupKey);
      if (country && country !== 'Unknown') countries.add(country);
      dots.push({ lat, lon, city: city || 'Unknown', country: country || 'Unknown', visits });
    };

    // 1. Site visitors (richest — has accurate GPS + visit counts)
    // Fallback chain: GPS → city → country so no visitor is lost.
    if (siteStore?.visitors) {
      for (const [gId, v] of Object.entries(siteStore.visitors) as [string, any][]) {
        let lat = v.lat ?? null;
        let lon = v.lon ?? null;
        if (lat == null || lon == null) {
          const coords = CITY_COORDS[(v.city || '').trim()] ?? COUNTRY_COORDS[(v.country || '').trim()];
          if (!coords) continue;
          [lat, lon] = coords;
        }
        addDot(lat, lon, v.city, v.country, v.visits || 1, `${lat.toFixed(2)},${lon.toFixed(2)},${gId}`);
      }
    }

    // 2. Legacy play-based visitor map
    for (const v of legacyMap) {
      if (v.lat == null || v.lon == null) continue;
      addDot(v.lat, v.lon, v.city, v.country, 1, `${v.lat.toFixed(2)},${v.lon.toFixed(2)},${v.guestId || 'legacy'}`);
    }

    // 3. Historical listener_ keys — GPS → city → country fallback chain
    for (const l of listenerEntries) {
      if (!l.guestId) continue;
      let lat = l.lat ?? null;
      let lon = l.lon ?? null;
      if (lat == null || lon == null) {
        const cityKey = (l.city || '').trim();
        const coords = CITY_COORDS[cityKey] ?? COUNTRY_COORDS[(l.country || '').trim()];
        if (!coords) continue;
        [lat, lon] = coords;
      }
      addDot(lat, lon, l.city, l.country, 1, `${lat.toFixed(2)},${lon.toFixed(2)},${l.guestId}`);
    }

    const totalVisitors = siteStore?.visitors
      ? Object.keys(siteStore.visitors).length
      : dots.length;

    return c.json({ dots, totalVisitors, uniqueCountries: countries.size });
  } catch (err) {
    console.log('[Visits] map error:', err);
    return c.json({ dots: [], totalVisitors: 0, uniqueCountries: 0 }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ADMIN PANEL ROUTES
//  Protected endpoints for managing playlist order and Most Played pins
// ═══════════════════════════════════════════════════════════════════════════════

// Helper: verify admin auth
async function requireAdmin(c: any): Promise<{ userId: string } | Response> {
  const accessToken = c.req.header('Authorization')?.split(' ')[1];
  if (!accessToken) return c.json({ error: 'No auth token provided' }, 401);
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !data?.user?.id) return c.json({ error: 'Unauthorized: invalid token' }, 401);
    return { userId: data.user.id };
  } catch (e) {
    return c.json({ error: `Auth error: ${e}` }, 401);
  }
}

// POST /admin/signup — create admin account (one-time use)
app.post("/make-server-715f71b9/admin/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    if (!email || !password) return c.json({ error: 'Email and password required' }, 400);
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || 'Admin' },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });
    if (error) return c.json({ error: `Signup failed: ${error.message}` }, 400);
    return c.json({ success: true, userId: data.user?.id });
  } catch (e) {
    console.log("[Admin] signup error:", e);
    return c.json({ error: String(e) }, 500);
  }
});

// GET /admin/most-played-pins — get pinned Most Played tracks
app.get("/make-server-715f71b9/admin/most-played-pins", async (c) => {
  try {
    const pins = ((await kv.get('admin_most_played_pins')) as any[]) || [];
    return c.json(pins);
  } catch (e) {
    console.log("[Admin] get pins error:", e);
    return c.json({ error: String(e) }, 500);
  }
});

// PUT /admin/most-played-pins — save pinned Most Played tracks (auth required)
app.put("/make-server-715f71b9/admin/most-played-pins", async (c) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;
  try {
    const pins = await c.req.json();
    if (!Array.isArray(pins)) return c.json({ error: 'Expected array of pins' }, 400);
    await kv.set('admin_most_played_pins', pins);
    console.log(`[Admin] ${auth.userId} updated most-played pins: ${pins.length} entries`);
    return c.json({ success: true });
  } catch (e) {
    console.log("[Admin] save pins error:", e);
    return c.json({ error: String(e) }, 500);
  }
});

// GET /admin/playlist-order — get custom playlist order overrides
app.get("/make-server-715f71b9/admin/playlist-order", async (c) => {
  try {
    const order = ((await kv.get('admin_playlist_order')) as any[]) || [];
    return c.json(order);
  } catch (e) {
    console.log("[Admin] get order error:", e);
    return c.json({ error: String(e) }, 500);
  }
});

// PUT /admin/playlist-order — save custom playlist order (auth required)
app.put("/make-server-715f71b9/admin/playlist-order", async (c) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;
  try {
    const order = await c.req.json();
    if (!Array.isArray(order)) return c.json({ error: 'Expected array of videoIds' }, 400);
    await kv.set('admin_playlist_order', order);
    console.log(`[Admin] ${auth.userId} updated playlist order: ${order.length} entries`);
    return c.json({ success: true });
  } catch (e) {
    console.log("[Admin] save order error:", e);
    return c.json({ error: String(e) }, 500);
  }
});

// GET /admin/all-tracks — returns all cached tracks for admin reordering
app.get("/make-server-715f71b9/admin/all-tracks", async (c) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;
  try {
    const allTracks = ((await kv.get("jc_tracks_v2")) as any[]) || [];
    const coverArtMap = ((await kv.get('jc_cover_art_v1')) as Record<string, string>) || {};
    return c.json(allTracks.map((t: any) => {
      const videoId = t.id?.videoId || t.videoId || '';
      return {
        videoId,
        title: t.snippet?.title || 'Unknown',
        channelTitle: t.snippet?.channelTitle || '',
        thumbnail: t.snippet?.thumbnails?.default?.url || t.thumbnail || '',
        source: t.source || 'youtube',
        soundcloudUrl: t.soundcloudUrl,
        coverArtUrl: coverArtMap[videoId] || t.coverArtUrl || null,
      };
    }));
  } catch (e) {
    console.log("[Admin] all-tracks error:", e);
    return c.json({ error: String(e) }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  COVER ART — Per-track custom cover art uploaded by admin
// ═══════════════════════════════════════════════════════════════════════════════

// POST /admin/cover-art/:trackId — upload a custom cover art image for a track
app.post("/make-server-715f71b9/admin/cover-art/:trackId", async (c: any) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;

  const trackId = c.req.param('trackId');
  const contentType = c.req.header('Content-Type') || '';

  try {
    let file: Blob | File;
    let mime: string;

    if (contentType.startsWith('image/')) {
      file = await c.req.blob();
      mime = contentType;
    } else if (contentType.includes('multipart')) {
      const formData = await c.req.formData();
      const uploaded = formData.get('image') || formData.get('file');
      if (!uploaded || !(uploaded instanceof File)) {
        return c.json({ error: 'Include "image" or "file" field in form data' }, 400);
      }
      file = uploaded;
      mime = uploaded.type || 'image/png';
    } else {
      return c.json({ error: 'Send image/* binary or multipart/form-data' }, 400);
    }

    const ext = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg'
      : mime.includes('webp') ? 'webp' : 'png';
    const fileName = `${trackId}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(COVER_ART_BUCKET)
      .upload(fileName, file, { contentType: mime, upsert: true });

    if (uploadError) {
      console.log('[CoverArt] Upload error:', uploadError);
      return c.json({ error: `Upload failed: ${uploadError.message}` }, 500);
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(COVER_ART_BUCKET)
      .getPublicUrl(fileName);

    // Store trackId → publicUrl in KV map
    const map = ((await kv.get('jc_cover_art_v1')) as Record<string, string>) || {};
    map[trackId] = publicUrl;
    await kv.set('jc_cover_art_v1', map);

    console.log(`[CoverArt] ${auth.userId} uploaded cover art for ${trackId} → ${publicUrl}`);
    return c.json({ success: true, url: publicUrl });
  } catch (e) {
    console.log('[CoverArt] Error:', e);
    return c.json({ error: String(e) }, 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TOP SONGS PICKS
//  Editorial curated list managed by admin drag-and-drop UI
// ═══════════════════════════════════════════════════════════════════════════════

// GET /top-songs — public read of editorial picks (cover art merged in dynamically)
app.get("/make-server-715f71b9/top-songs", async (c: any) => {
  try {
    const picks = await kv.get('top_songs_picks_v1');
    const coverArtMap = ((await kv.get('jc_cover_art_v1')) as Record<string, string>) || {};
    const enriched = (Array.isArray(picks) ? picks : []).map((p: any) => ({
      ...p,
      coverArtUrl: coverArtMap[p.id] || p.coverArtUrl || null,
    }));
    return c.json(enriched);
  } catch (e) {
    console.log("[TopSongs] get error:", e);
    return c.json({ error: String(e) }, 500);
  }
});

// PUT /top-songs — admin-only write
app.put("/make-server-715f71b9/top-songs", async (c: any) => {
  const auth = await requireAdmin(c);
  if (auth instanceof Response) return auth;
  try {
    const picks = await c.req.json();
    if (!Array.isArray(picks)) return c.json({ error: 'Expected array of picks' }, 400);
    // Re-number ranks to match array position
    const ranked = picks.map((p: any, i: number) => ({ ...p, rank: i + 1 }));
    await kv.set('top_songs_picks_v1', ranked);
    console.log(`[TopSongs] ${auth.userId} saved ${ranked.length} picks`);
    return c.json({ success: true });
  } catch (e) {
    console.log("[TopSongs] save error:", e);
    return c.json({ error: String(e) }, 500);
  }
});

Deno.serve(app.fetch);