import React, { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo } from 'react';
// @refresh reset
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';
import { decodeHtmlEntities } from '../utils/decodeHtmlEntities';
import { getMaxResThumbnail } from '../utils/getMaxResThumbnail';

import { sanitizeTrack } from '../utils/sanitizeTrack';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    SC: any;
  }
}

export interface Track {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default: { url: string };
      medium: { url: string };
      high: { url: string };
    };
  };
  source?: 'youtube' | 'soundcloud';
  soundcloudUrl?: string;
}

interface PlayerContextType {
  tracks: Track[];
  newReleases: Track[];
  currentTrack: Track | null;
  currentIndex: number;
  isPlaying: boolean;
  isShuffle: boolean;
  isRepeat: boolean;
  volume: number;
  isLoading: boolean;
  isRefreshing: boolean;
  isFetchingMore: boolean;
  playerReady: boolean;
  isRadioMode: boolean;
  listenerCount: number;
  totalVisitors: number;
  playTrack: (track: Track, trackList?: Track[]) => void;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setVolume: (v: number) => void;
  seekTo: (t: number) => void;
  refreshTracks: () => Promise<void>;
  searchTracks: (q: string) => Promise<Track[]>;
  backToLive: () => void;
}

// ── Separate lightweight context for progress/duration only ─────────────────
// Isolated so that 400ms progress ticks don't re-render the entire page tree.
interface PlayerProgressContextType {
  progress: number;
  duration: number;
}

// Default stub so components survive brief provider absence during HMR / React Refresh
const NOOP = () => {};
const NOOP_ASYNC = async () => {};
const NOOP_SEARCH = async (): Promise<Track[]> => [];
const DEFAULT_PLAYER: PlayerContextType = {
  tracks: [], newReleases: [], currentTrack: null, currentIndex: 0,
  isPlaying: false, isShuffle: false, isRepeat: false, volume: 80,
  isLoading: true, isRefreshing: false, isFetchingMore: false, playerReady: false,
  isRadioMode: false,
  listenerCount: 1,
  totalVisitors: 0,
  playTrack: NOOP as any, togglePlay: NOOP, nextTrack: NOOP, prevTrack: NOOP,
  toggleShuffle: NOOP, toggleRepeat: NOOP, setVolume: NOOP, seekTo: NOOP,
  refreshTracks: NOOP_ASYNC, searchTracks: NOOP_SEARCH,
  backToLive: NOOP,
};

const PlayerContext = createContext<PlayerContextType>(DEFAULT_PLAYER);
const PlayerProgressContext = createContext<PlayerProgressContextType>({ progress: 0, duration: 0 });

export function usePlayer() {
  return useContext(PlayerContext);
}

/** Subscribe ONLY to progress/duration — use in Player bar to avoid full-page re-renders */
export function usePlayerProgress() {
  return useContext(PlayerProgressContext);
}

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-715f71b9`;
const HEADERS = { Authorization: `Bearer ${publicAnonKey}` };

// ─── DJ Crossfade constants ──────────────────────────────────────────────────
// Two-phase crossfade: Phase 1 = solo fade-out, Phase 2 = overlap blend
const CROSSFADE_TOTAL    = 12;        // total seconds for the entire transition
const LEAD_IN            = 3;         // seconds of solo fade-out before incoming starts
const OVERLAP            = CROSSFADE_TOTAL - LEAD_IN; // seconds of both decks playing
const UI_SWITCH_POINT    = 9;         // seconds into crossfade when "now playing" switches
const CROSSFADE_TICK     = 40;        // ms between volume updates (25 fps for buttery smooth)
const MIN_TRACK_FOR_XFADE = 25;       // don't crossfade tracks shorter than this

const FETCH_MORE_THRESHOLD = 8;

// Equal-power crossfade curve (standard DJ S-curve)
// Prevents the perceived volume dip you get with linear fades
function equalPowerOut(t: number): number { return Math.cos(t * Math.PI * 0.5); }
function equalPowerIn(t: number): number  { return Math.sin(t * Math.PI * 0.5); }

// ─── Utility: location + guest ID + play reporting (unchanged) ───────────────
let cachedLocation: { city: string; country: string } | null = null;
async function getLocation() {
  if (cachedLocation) return cachedLocation;
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    cachedLocation = { city: data.city || 'Unknown', country: data.country_name || data.country || 'Unknown' };
  } catch {
    cachedLocation = { city: 'Unknown', country: 'Unknown' };
  }
  return cachedLocation;
}

function getGuestIdSync(): string {
  try {
    const stored = localStorage.getItem('jc_guest_profile_v1');
    if (stored) return JSON.parse(stored).id || 'Unknown';
  } catch {}
  try {
    const fp = localStorage.getItem('jc_fp_v2');
    if (fp) return fp;
  } catch {}
  return 'Unknown';
}

async function reportPlay(track: Track) {
  try {
    const loc = await getLocation();
    const guestId = getGuestIdSync();
    const thumb = track.source === 'soundcloud'
      ? (track.snippet.thumbnails.medium?.url || track.snippet.thumbnails.default?.url || '')
      : getMaxResThumbnail(track.id.videoId);
    await fetch(`${BASE}/plays/track`, {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId: track.id.videoId,
        title: track.snippet.title,
        channelTitle: track.snippet.channelTitle,
        thumbnail: thumb,
        guestId,
        city: loc.city,
        country: loc.country,
      }),
    });
  } catch (e) {
    console.log('[Player] reportPlay error (non-critical):', e);
  }
}

// ─── Types for dual-deck architecture ────────────────────────────────────────
type DeckId = 'A' | 'B';
type Engine = 'youtube' | 'soundcloud';

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  // ─── Public state ────────────────────────────────────────────────────────
  const [tracks, setTracks]                 = useState<Track[]>([]);
  const [newReleases, setNewReleases]       = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack]     = useState<Track | null>(null);
  const [currentIndex, setCurrentIndex]     = useState(0);
  const [isPlaying, setIsPlaying]           = useState(false);
  const [isShuffle, setIsShuffle]           = useState(false);
  const [isRepeat, setIsRepeat]             = useState(false);
  const [volume, setVolumeState]            = useState(80);
  const [progress, setProgress]             = useState(0);
  const [duration, setDuration]             = useState(0);
  const [isLoading, setIsLoading]           = useState(true);
  const [isRefreshing, setIsRefreshing]     = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [playerReady, setPlayerReady]       = useState(false);
  const [isRadioMode, setIsRadioMode]       = useState(false);
  const [listenerCount, setListenerCount]   = useState(1);
  const [totalVisitors, setTotalVisitors]   = useState(0);

  // ─── Radio sync refs ────────────────────────────────────────────────────
  const radioModeRef = useRef(false);
  const lastDurationReportRef = useRef<string>(''); // videoId of last reported duration
  const personalModeStartRef = useRef<number>(0);   // timestamp when user entered personal mode
  const reminderShownRef     = useRef(false);        // only show toast once per personal session

  // ─── Dual-deck refs ──────────────────────────────────────────────────────
  // YouTube players
  const ytPlayerA = useRef<any>(null);
  const ytPlayerB = useRef<any>(null);
  const ytReadyA  = useRef(false);
  const ytReadyB  = useRef(false);

  // SoundCloud widgets
  const scWidgetA  = useRef<any>(null);
  const scWidgetB  = useRef<any>(null);
  const scIframeA  = useRef<HTMLIFrameElement | null>(null);
  const scIframeB  = useRef<HTMLIFrameElement | null>(null);
  const scReadyA   = useRef(false);
  const scReadyB   = useRef(false);

  // Which deck is currently the "live" deck the listener hears at full volume
  const activeDeckRef = useRef<DeckId>('A');
  // What engine each deck is currently using
  const deckEngineA = useRef<Engine>('youtube');
  const deckEngineB = useRef<Engine>('youtube');

  // ─── Crossfade state ─────────────────────────────────────────────────────
  const isCrossfadingRef    = useRef(false);
  const crossfadeTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const crossfadeStartRef   = useRef(0);       // Date.now() when crossfade began
  const incomingDeckRef     = useRef<DeckId>('B');
  const incomingStartedRef  = useRef(false);    // has incoming deck begun playing?
  const uiSwitchedRef       = useRef(false);    // has "now playing" UI flipped to incoming?
  const pendingTrackRef     = useRef<{ track: Track; index: number } | null>(null);

  // ─── Shared refs (same as before) ────────────────────────────────────────
  const playlistRef        = useRef<Track[]>([]);
  const seenIdsRef         = useRef<Set<string>>(new Set());
  const currentIndexRef    = useRef(0);
  const currentTrackRef    = useRef<Track | null>(null);
  const isShuffleRef       = useRef(false);
  const isRepeatRef        = useRef(false);
  const isPlayingRef       = useRef(false);
  const isFetchingMoreRef  = useRef(false);
  const masterVolumeRef    = useRef(80);
  const progressTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef        = useRef(0);

  // Keep refs in sync
  useEffect(() => { isShuffleRef.current = isShuffle; }, [isShuffle]);
  useEffect(() => { isRepeatRef.current = isRepeat; }, [isRepeat]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { durationRef.current = duration; }, [duration]);

  // ── Progress ref — lets prevTrack read current position without being in
  //    its useCallback dependency array (avoids 400ms context churn)
  const progressRef = useRef(0);
  useEffect(() => { progressRef.current = progress; }, [progress]);

  // ─── Deck helpers ────────────────────────────────────────────────────────
  const getYtPlayer = (deck: DeckId) => deck === 'A' ? ytPlayerA.current : ytPlayerB.current;
  const getScWidget = (deck: DeckId) => deck === 'A' ? scWidgetA.current : scWidgetB.current;
  const getDeckEngine = (deck: DeckId) => deck === 'A' ? deckEngineA : deckEngineB;
  const otherDeck = (deck: DeckId): DeckId => deck === 'A' ? 'B' : 'A';

  /** Safely get an SC widget only if its iframe is still connected and ready */
  const getSafeSc = (deck: DeckId): any | null => {
    const widget = getScWidget(deck);
    if (!widget) return null;
    const iframe = deck === 'A' ? scIframeA.current : scIframeB.current;
    // The SC API uses postMessage internally — if contentWindow is null, it crashes
    if (!iframe || !iframe.contentWindow) return null;
    return widget;
  };

  /** Set volume on a specific deck (routes to the correct engine) */
  const setDeckVolume = useCallback((deck: DeckId, vol: number) => {
    const engine = getDeckEngine(deck).current;
    const clampedVol = Math.max(0, Math.min(100, Math.round(vol)));
    if (engine === 'youtube') {
      try { getYtPlayer(deck)?.setVolume(clampedVol); } catch {}
    } else {
      try { getSafeSc(deck)?.setVolume(clampedVol); } catch {}
    }
  }, []);

  /** Pause a specific deck entirely */
  const pauseDeck = useCallback((deck: DeckId) => {
    const engine = getDeckEngine(deck).current;
    if (engine === 'youtube') {
      try { getYtPlayer(deck)?.pauseVideo(); } catch {}
    } else {
      try { getSafeSc(deck)?.pause(); } catch {}
    }
  }, []);

  /** Hard-stop a deck — unlike pause, this fully unloads/stops audio to prevent leaks */
  const stopDeck = useCallback((deck: DeckId) => {
    // YouTube: stopVideo is more aggressive than pauseVideo — prevents auto-resume
    try { getYtPlayer(deck)?.stopVideo(); } catch {}
    try { getYtPlayer(deck)?.setVolume(0); } catch {}
    // SoundCloud: pause + mute
    try { getSafeSc(deck)?.pause(); } catch {}
    try { getSafeSc(deck)?.setVolume(0); } catch {}
  }, []);

  /** Silence whichever deck is NOT the active one — call after any transition */
  const silenceInactiveDeck = useCallback(() => {
    const inactive = otherDeck(activeDeckRef.current);
    stopDeck(inactive);
  }, [stopDeck]);

  /** Get current playback position (seconds) from a deck */
  const getDeckProgress = useCallback((deck: DeckId): number => {
    const engine = getDeckEngine(deck).current;
    if (engine === 'youtube') {
      try { return getYtPlayer(deck)?.getCurrentTime?.() || 0; } catch { return 0; }
    }
    // SC progress is polled async — we'll handle it in the unified timer
    return 0;
  }, []);

  /** Get duration from a deck */
  const getDeckDuration = useCallback((deck: DeckId): number => {
    const engine = getDeckEngine(deck).current;
    if (engine === 'youtube') {
      try { return getYtPlayer(deck)?.getDuration?.() || 0; } catch { return 0; }
    }
    return 0;
  }, []);

  /** Load a track onto a specific deck (does NOT auto-swap the active deck) */
  const loadOnDeck = useCallback((deck: DeckId, track: Track, autoPlay: boolean, vol: number) => {
    const isSC = track.source === 'soundcloud';
    const engineRef = getDeckEngine(deck);
    engineRef.current = isSC ? 'soundcloud' : 'youtube';

    if (isSC && track.soundcloudUrl) {
      // Ensure YT on this deck is paused
      try { getYtPlayer(deck)?.pauseVideo(); } catch {}
      const widget = getScWidget(deck);
      if (widget) {
        widget.load(track.soundcloudUrl, {
          auto_play: autoPlay,
          show_artwork: false,
          callback: () => {
            try { widget.setVolume(Math.round(vol)); } catch {}
          },
        });
      }
    } else {
      // Ensure SC on this deck is paused
      try { getSafeSc(deck)?.pause(); } catch {}
      const yt = getYtPlayer(deck);
      if (yt) {
        try { yt.setVolume(Math.round(vol)); } catch {}
        if (autoPlay) {
          yt.loadVideoById(track.id.videoId);
        } else {
          yt.cueVideoById(track.id.videoId);
        }
      }
    }
  }, []);

  // ─── Fetch more tracks in the background ───────────────────────────────
  const fetchMoreTracks = useCallback(async () => {
    if (isFetchingMoreRef.current) return;
    isFetchingMoreRef.current = true;
    setIsFetchingMore(true);
    console.log('[Player] Fetching more tracks...');
    try {
      const existingIds = Array.from(seenIdsRef.current);
      const res = await fetch(`${BASE}/tracks/more`, {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ existingIds }),
      });
      const data = await res.json();
      if (data.tracks?.length) {
        const incoming = (data.tracks.map(sanitizeTrack).filter(Boolean) as Track[]);
        const fresh = incoming.filter(t => !seenIdsRef.current.has(t.id.videoId));
        if (fresh.length > 0) {
          fresh.forEach(t => seenIdsRef.current.add(t.id.videoId));
          setTracks(prev => {
            const updated = [...prev, ...fresh];
            playlistRef.current = updated;
            return updated;
          });
          console.log(`[Player] Added ${fresh.length} new tracks.`);
        }
      }
    } catch (e) {
      console.log('[Player] fetchMoreTracks error:', e);
    } finally {
      isFetchingMoreRef.current = false;
      setIsFetchingMore(false);
    }
  }, []);

  // ─── Calculate next track index ────────────────────────────────────────
  const calcNextIndex = useCallback((): number => {
    const playlist = playlistRef.current;
    if (!playlist.length) return 0;
    if (isRepeatRef.current) return currentIndexRef.current;
    if (isShuffleRef.current) return Math.floor(Math.random() * playlist.length);
    return (currentIndexRef.current + 1) % playlist.length;
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  //  CROSSFADE ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  /** Cancel any in-progress crossfade and restore the active deck to full volume */
  const cancelCrossfade = useCallback(() => {
    if (crossfadeTimerRef.current) {
      clearInterval(crossfadeTimerRef.current);
      crossfadeTimerRef.current = null;
    }
    if (isCrossfadingRef.current) {
      const incoming = incomingDeckRef.current;
      // Hard-stop the incoming deck (stopVideo, not just pause)
      stopDeck(incoming);
      // Restore active deck to master volume
      setDeckVolume(activeDeckRef.current, masterVolumeRef.current);
      isCrossfadingRef.current = false;
      console.log('[DJ] Crossfade cancelled — Deck', incoming, 'hard-stopped');
    }
  }, [stopDeck, setDeckVolume]);

  /** Finish crossfade — swap active deck, clean up outgoing */
  const finishCrossfade = useCallback(() => {
    if (crossfadeTimerRef.current) {
      clearInterval(crossfadeTimerRef.current);
      crossfadeTimerRef.current = null;
    }

    const outgoing = activeDeckRef.current;
    const incoming = incomingDeckRef.current;

    // Hard-stop outgoing deck (stopVideo, not just pause — prevents audio leaks)
    stopDeck(outgoing);

    // Ensure incoming is at full master volume
    setDeckVolume(incoming, masterVolumeRef.current);

    // Swap the active deck
    activeDeckRef.current = incoming;
    isCrossfadingRef.current = false;

    console.log(`[DJ] Crossfade complete → Deck ${incoming} is now live (Deck ${outgoing} stopped)`);

    // ── Report to server if in radio mode (global station clock) ──────────
    if (radioModeRef.current && currentTrackRef.current) {
      const vid = currentTrackRef.current.id.videoId;
      fetch(`${BASE}/radio/advance`, {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: vid, startedAt: Date.now(), durationSec: 0 }),
      }).catch(() => {});
    }

    // Check if we need more tracks
    const tracksRemaining = playlistRef.current.length - currentIndexRef.current;
    if (tracksRemaining <= FETCH_MORE_THRESHOLD && !isFetchingMoreRef.current) {
      fetchMoreTracks();
    }
  }, [stopDeck, setDeckVolume, fetchMoreTracks]);

  /** Start a DJ crossfade into the next track */
  const startCrossfade = useCallback(() => {
    const playlist = playlistRef.current;
    if (!playlist.length || isCrossfadingRef.current) return;

    const nextIdx = calcNextIndex();
    const nextTrack = playlist[nextIdx];
    if (!nextTrack) return;

    const active = activeDeckRef.current;
    const incoming = otherDeck(active);
    incomingDeckRef.current = incoming;

    // Reset phase trackers
    incomingStartedRef.current = false;
    uiSwitchedRef.current = false;
    pendingTrackRef.current = { track: nextTrack, index: nextIdx };

    console.log(`[DJ] Starting ${CROSSFADE_TOTAL}s two-phase crossfade: Deck ${active} → Deck ${incoming} | "${nextTrack.snippet.title}"`);
    console.log(`[DJ]   Phase 1: ${LEAD_IN}s solo fade-out → Phase 2: ${OVERLAP}s overlap blend → UI switch at ${UI_SWITCH_POINT}s`);

    isCrossfadingRef.current = true;
    // Don't update currentTrack yet — keep showing the outgoing track during Phase 1

    // Pre-load (CUE) the incoming track without playing — it'll start in Phase 2
    loadOnDeck(incoming, nextTrack, false, 0);

    // Start the two-phase crossfade volume ramp
    crossfadeStartRef.current = Date.now();
    crossfadeTimerRef.current = setInterval(() => {
      const elapsed = (Date.now() - crossfadeStartRef.current) / 1000;

      let outVol: number;
      let inVol: number;

      if (elapsed < LEAD_IN) {
        // ── Phase 1: Solo fade-out (outgoing gently drops, incoming silent) ──
        const t1 = elapsed / LEAD_IN; // 0 → 1 over LEAD_IN seconds
        outVol = masterVolumeRef.current * (1.0 - 0.3 * t1); // 100% → 70%
        inVol = 0;
      } else {
        // ── Phase 2: Overlap blend (both decks playing) ──────────────────────

        // Start the incoming deck the first time we enter Phase 2
        if (!incomingStartedRef.current) {
          incomingStartedRef.current = true;
          const isSC = nextTrack.source === 'soundcloud';
          if (isSC && nextTrack.soundcloudUrl) {
            try { getSafeSc(incoming)?.play(); } catch {}
          } else {
            try { getYtPlayer(incoming)?.playVideo(); } catch {}
          }
          setDeckVolume(incoming, 0);
          reportPlay(nextTrack);
          console.log(`[DJ] Phase 2: Incoming Deck ${incoming} started playing`);
        }

        const overlapElapsed = elapsed - LEAD_IN;
        const t2 = Math.min(overlapElapsed / OVERLAP, 1); // 0 → 1 over OVERLAP seconds

        // Outgoing: continues from 70% down to 0 using equal-power curve
        outVol = masterVolumeRef.current * 0.7 * equalPowerOut(t2);
        // Incoming: ramps from 0 up to 100% using equal-power curve
        inVol = masterVolumeRef.current * equalPowerIn(t2);
      }

      setDeckVolume(active, outVol);
      setDeckVolume(incoming, inVol);

      // ── Switch the "now playing" UI late into the blend ──────────────────
      if (!uiSwitchedRef.current && elapsed >= UI_SWITCH_POINT && pendingTrackRef.current) {
        uiSwitchedRef.current = true;
        const { track: pt, index: pi } = pendingTrackRef.current;
        currentIndexRef.current = pi;
        setCurrentTrack(pt);
        setCurrentIndex(pi);
        setProgress(0);
        console.log(`[DJ] UI switched to incoming track at ${elapsed.toFixed(1)}s`);
      }

      // ── Complete ────────────────────────────────────────────────────────────
      if (elapsed >= CROSSFADE_TOTAL) {
        // Ensure UI switched even if we skipped the check above
        if (!uiSwitchedRef.current && pendingTrackRef.current) {
          const { track: pt, index: pi } = pendingTrackRef.current;
          currentIndexRef.current = pi;
          setCurrentTrack(pt);
          setCurrentIndex(pi);
          setProgress(0);
        }
        pendingTrackRef.current = null;
        finishCrossfade();
      }
    }, CROSSFADE_TICK);
  }, [calcNextIndex, loadOnDeck, setDeckVolume, finishCrossfade]);

  // ─── Hard advance (no crossfade — fallback for short tracks / errors) ──
  const hardAdvance = useCallback(() => {
    const playlist = playlistRef.current;
    if (!playlist.length) return;

    cancelCrossfade();

    const nextIdx = calcNextIndex();
    const next = playlist[nextIdx];
    if (!next) return;

    currentIndexRef.current = nextIdx;
    setCurrentTrack(next);
    setCurrentIndex(nextIdx);
    setProgress(0);

    const active = activeDeckRef.current;
    // Hard-stop the other deck to prevent any audio overlap / echo
    stopDeck(otherDeck(active));
    loadOnDeck(active, next, true, masterVolumeRef.current);
    reportPlay(next);

    // ── Report to server if in radio mode ────────────────────────────────
    if (radioModeRef.current) {
      fetch(`${BASE}/radio/advance`, {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: next.id.videoId, startedAt: Date.now(), durationSec: 0 }),
      }).catch(() => {});
    }

    const tracksRemaining = playlist.length - nextIdx;
    if (tracksRemaining <= FETCH_MORE_THRESHOLD && !isFetchingMoreRef.current) {
      fetchMoreTracks();
    }
  }, [calcNextIndex, cancelCrossfade, loadOnDeck, stopDeck, fetchMoreTracks]);

  // Stable ref so YT/SC event handlers never go stale
  const hardAdvanceRef = useRef(hardAdvance);
  useEffect(() => { hardAdvanceRef.current = hardAdvance; }, [hardAdvance]);
  const startCrossfadeRef = useRef(startCrossfade);
  useEffect(() => { startCrossfadeRef.current = startCrossfade; }, [startCrossfade]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  YOUTUBE DUAL-PLAYER SETUP
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let destroyed = false;

    // Create two hidden containers
    const containerA = document.createElement('div');
    containerA.id = 'jc-yt-player-a';
    containerA.style.cssText = 'position:fixed;width:1px;height:1px;bottom:-200px;left:-200px;opacity:0.01;pointer-events:none;z-index:9999;';
    document.body.appendChild(containerA);

    const containerB = document.createElement('div');
    containerB.id = 'jc-yt-player-b';
    containerB.style.cssText = 'position:fixed;width:1px;height:1px;bottom:-200px;left:-200px;opacity:0.01;pointer-events:none;z-index:9999;';
    document.body.appendChild(containerB);

    const makeStateHandler = (deck: DeckId) => (e: any) => {
      if (destroyed) return;
      const isActiveDeck = activeDeckRef.current === deck;
      const isIncomingDuringXfade = isCrossfadingRef.current && incomingDeckRef.current === deck;

      if (e.data === window.YT.PlayerState.PLAYING) {
        // Only update "isPlaying" from the active deck (or incoming during crossfade)
        if (isActiveDeck || isIncomingDuringXfade) {
          setIsPlaying(true);
          isPlayingRef.current = true;
        }
      } else if (e.data === window.YT.PlayerState.PAUSED) {
        // Only the active deck outside of crossfade should report pause
        if (isActiveDeck && !isCrossfadingRef.current) {
          setIsPlaying(false);
          isPlayingRef.current = false;
        }
      } else if (e.data === window.YT.PlayerState.ENDED) {
        if (isCrossfadingRef.current) {
          // During crossfade the outgoing deck may naturally end — just ignore it
          return;
        }
        if (isActiveDeck) {
          // Track ended without crossfade triggering (very short track?) — hard advance
          setIsPlaying(false);
          isPlayingRef.current = false;
          hardAdvanceRef.current();
        }
      }
    };

    const makeErrorHandler = (deck: DeckId) => (e: any) => {
      if (destroyed) return;
      console.log(`[Player] YouTube Deck ${deck} error, skipping:`, e?.data);
      if (isCrossfadingRef.current && incomingDeckRef.current === deck) {
        // Incoming deck errored during crossfade — stop both timer and errored deck, then advance
        if (crossfadeTimerRef.current) { clearInterval(crossfadeTimerRef.current); crossfadeTimerRef.current = null; }
        isCrossfadingRef.current = false;
        // Hard-stop the errored deck so it doesn't leak audio
        try { getYtPlayer(deck)?.stopVideo(); } catch {}
        try { getYtPlayer(deck)?.setVolume(0); } catch {}
        // Restore active deck volume
        try { setDeckVolume(activeDeckRef.current, masterVolumeRef.current); } catch {}
        hardAdvanceRef.current();
      } else if (activeDeckRef.current === deck && !isCrossfadingRef.current) {
        hardAdvanceRef.current();
      }
    };

    const createPlayers = () => {
      if (destroyed) return;
      try {
        ytPlayerA.current = new window.YT.Player('jc-yt-player-a', {
          playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, rel: 0 },
          events: {
            onReady: () => {
              if (destroyed) return;
              ytReadyA.current = true;
              setPlayerReady(true);
              try { ytPlayerA.current.setVolume(80); } catch {}
              console.log('[Player] YouTube Deck A ready');
            },
            onStateChange: makeStateHandler('A'),
            onError: makeErrorHandler('A'),
          },
        });

        ytPlayerB.current = new window.YT.Player('jc-yt-player-b', {
          playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, rel: 0 },
          events: {
            onReady: () => {
              if (destroyed) return;
              ytReadyB.current = true;
              try { ytPlayerB.current.setVolume(0); } catch {}
              console.log('[Player] YouTube Deck B ready');
            },
            onStateChange: makeStateHandler('B'),
            onError: makeErrorHandler('B'),
          },
        });
      } catch (e) {
        console.error('[Player] Failed to create YouTube players:', e);
        setPlayerReady(true); // don't lock the UI
      }
    };

    if (window.YT?.Player) {
      createPlayers();
    } else {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.onerror = () => { console.error('[Player] YT API script failed'); setPlayerReady(true); };
      document.body.appendChild(script);
      window.onYouTubeIframeAPIReady = createPlayers;
    }

    return () => {
      destroyed = true;
      try { containerA.remove(); } catch {}
      try { containerB.remove(); } catch {}
      try { ytPlayerA.current?.destroy(); } catch {}
      try { ytPlayerB.current?.destroy(); } catch {}
    };
  }, []); // no deps — created once, uses refs for callbacks

  // ═══════════════════════════════════════════════════════════════════════════
  //  SOUNDCLOUD DUAL-WIDGET SETUP
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let destroyed = false;

    const iframeA = document.createElement('iframe');
    iframeA.id = 'jc-sc-widget-a';
    iframeA.src = 'https://w.soundcloud.com/player/?url=https://soundcloud.com/placeholder&auto_play=false';
    iframeA.style.cssText = 'position:fixed;width:1px;height:1px;bottom:-200px;left:-200px;opacity:0.01;pointer-events:none;z-index:9999;';
    iframeA.allow = 'autoplay';
    document.body.appendChild(iframeA);
    scIframeA.current = iframeA;

    const iframeB = document.createElement('iframe');
    iframeB.id = 'jc-sc-widget-b';
    iframeB.src = 'https://w.soundcloud.com/player/?url=https://soundcloud.com/placeholder&auto_play=false';
    iframeB.style.cssText = 'position:fixed;width:1px;height:1px;bottom:-200px;left:-200px;opacity:0.01;pointer-events:none;z-index:9999;';
    iframeB.allow = 'autoplay';
    document.body.appendChild(iframeB);
    scIframeB.current = iframeB;

    const script = document.createElement('script');
    script.src = 'https://w.soundcloud.com/player/api.js';
    script.onload = () => {
      if (destroyed || !window.SC?.Widget) return;

      const initWidget = (iframe: HTMLIFrameElement, deck: DeckId) => {
        const widget = window.SC.Widget(iframe);
        const widgetRef = deck === 'A' ? scWidgetA : scWidgetB;
        const readyRef  = deck === 'A' ? scReadyA : scReadyB;
        widgetRef.current = widget;
        readyRef.current = true;

        widget.bind(window.SC.Widget.Events.PLAY, () => {
          const isActive = activeDeckRef.current === deck;
          const isIncoming = isCrossfadingRef.current && incomingDeckRef.current === deck;
          if (isActive || isIncoming) {
            setIsPlaying(true);
            isPlayingRef.current = true;
          }
        });

        widget.bind(window.SC.Widget.Events.PAUSE, () => {
          if (activeDeckRef.current === deck && !isCrossfadingRef.current) {
            setIsPlaying(false);
            isPlayingRef.current = false;
          }
        });

        widget.bind(window.SC.Widget.Events.FINISH, () => {
          if (isCrossfadingRef.current) return; // outgoing deck ended during fade — ignore
          if (activeDeckRef.current === deck) {
            setIsPlaying(false);
            isPlayingRef.current = false;
            hardAdvanceRef.current();
          }
        });

        widget.bind(window.SC.Widget.Events.READY, () => {
          console.log(`[Player] SoundCloud Deck ${deck} ready`);
        });
      };

      try {
        initWidget(iframeA, 'A');
        initWidget(iframeB, 'B');
        console.log('[Player] SoundCloud dual-widget loaded');
      } catch (e) {
        console.error('[Player] SC Widget init error:', e);
      }
    };
    script.onerror = () => console.error('[Player] SC Widget API script failed (non-critical)');
    document.body.appendChild(script);

    return () => {
      destroyed = true;
      try { iframeA.remove(); } catch {}
      try { iframeB.remove(); } catch {}
      try { script.remove(); } catch {}
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  //  UNIFIED PROGRESS TIMER + CROSSFADE TRIGGER
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // This timer always runs while playing — it handles:
    //   1. Progress & duration updates for the UI
    //   2. Detecting when to trigger a crossfade
    if (!isPlaying) {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
      return;
    }

    progressTimerRef.current = setInterval(() => {
      const active = activeDeckRef.current;
      const engine = getDeckEngine(active).current;

      // During crossfade Phase 1, keep reporting outgoing deck progress.
      // During Phase 2 (after incoming started), report incoming deck progress.
      const showIncoming = isCrossfadingRef.current && incomingStartedRef.current && uiSwitchedRef.current;
      const reportDeck = showIncoming ? incomingDeckRef.current : active;
      const reportEngine = getDeckEngine(reportDeck).current;

      if (reportEngine === 'youtube') {
        const yt = getYtPlayer(reportDeck);
        if (yt?.getCurrentTime) {
          const pos = yt.getCurrentTime();
          const dur = yt.getDuration?.() || 0;
          setProgress(pos);
          if (dur > 0) { setDuration(dur); durationRef.current = dur; }
        }
      } else {
        // SoundCloud — async getPosition (use safe accessor to avoid postMessage crash)
        const sc = getSafeSc(reportDeck);
        if (sc) {
          try {
            sc.getPosition((pos: number) => setProgress(pos / 1000));
            sc.getDuration((dur: number) => {
              if (dur > 0) { setDuration(dur / 1000); durationRef.current = dur / 1000; }
            });
          } catch {}
        }
      }

      // ── Safety: detect & kill leaked audio on inactive deck ────────────
      if (!isCrossfadingRef.current) {
        const inactive = otherDeck(active);
        const inactiveEngine = getDeckEngine(inactive).current;
        if (inactiveEngine === 'youtube') {
          const inactiveYt = getYtPlayer(inactive);
          if (inactiveYt?.getPlayerState) {
            const state = inactiveYt.getPlayerState();
            // YT.PlayerState.PLAYING === 1
            if (state === 1) {
              console.warn(`[DJ] SAFETY: Inactive Deck ${inactive} was still playing! Force-stopping.`);
              try { inactiveYt.stopVideo(); } catch {}
              try { inactiveYt.setVolume(0); } catch {}
            }
          }
        }
      }

      // ── Crossfade trigger check (only when NOT already crossfading) ──────
      if (!isCrossfadingRef.current) {
        let activeProg = 0;
        let activeDur = 0;

        if (engine === 'youtube') {
          const yt = getYtPlayer(active);
          if (yt?.getCurrentTime) {
            activeProg = yt.getCurrentTime();
            activeDur = yt.getDuration?.() || 0;
          }
        } else {
          // For SC, use the last known duration from state and poll position
          activeDur = durationRef.current;
          const sc = getSafeSc(active);
          if (sc) {
            try {
              sc.getPosition((pos: number) => {
                const posSec = pos / 1000;
                const dur = durationRef.current;
                if (dur > MIN_TRACK_FOR_XFADE && dur > 0 && (dur - posSec) <= CROSSFADE_TOTAL && (dur - posSec) > 0.5) {
                  if (!isCrossfadingRef.current) {
                    console.log(`[DJ] SC crossfade trigger: ${posSec.toFixed(1)}s / ${dur.toFixed(1)}s`);
                    startCrossfadeRef.current();
                  }
                }
              });
            } catch {}
            return; // SC check is async, exit early
          }
        }

        // YouTube crossfade trigger (synchronous)
        if (engine === 'youtube' && activeDur > MIN_TRACK_FOR_XFADE && activeDur > 0) {
          const remaining = activeDur - activeProg;
          if (remaining <= CROSSFADE_TOTAL && remaining > 0.5) {
            console.log(`[DJ] YT crossfade trigger: ${activeProg.toFixed(1)}s / ${activeDur.toFixed(1)}s (${remaining.toFixed(1)}s remaining)`);
            startCrossfadeRef.current();
          }
        }
      }
    }, 400);

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [isPlaying]);

  // ─── Fetch cached tracks ───────────────────────────────────────────────
  const fetchCachedTracks = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/tracks`, { headers: HEADERS });
      const data = await res.json();
      console.log(`[Player] fetchCachedTracks: server returned ${data.tracks?.length ?? 0} tracks (totalCached: ${data.totalCached ?? '?'})`);
      if (data.tracks?.length) {
        const trackList = (data.tracks.map(sanitizeTrack).filter(Boolean) as Track[]);
        console.log(`[Player] After sanitize/filter: ${trackList.length} tracks`);
        trackList.forEach(t => seenIdsRef.current.add(t.id.videoId));
        setTracks(trackList);
        playlistRef.current = trackList;
      }
      if (data.newReleases?.length) {
        setNewReleases(data.newReleases.map(sanitizeTrack).filter(Boolean) as Track[]);
      }
      return data;
    } catch (e) {
      console.log('[Player] fetchCachedTracks error:', e);
      return null;
    }
  }, []);

  const refreshTracks = useCallback(async () => {
    setIsRefreshing(true);
    seenIdsRef.current = new Set();
    try {
      await fetch(`${BASE}/tracks/refresh`, { method: 'POST', headers: HEADERS });
      await fetchCachedTracks();
    } catch (e) {
      console.log('[Player] refreshTracks error:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchCachedTracks]);

  // On mount: load cached tracks — auto-refresh if under 50 to fill toward 100
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const data = await fetchCachedTracks();
        const cachedCount = data?.tracks?.length ?? 0;
        console.log(`[Player] Init: cached ${cachedCount} tracks (totalCached on server: ${data?.totalCached ?? '?'})`);

        if (cachedCount < 50) {
          // Too few tracks — trigger a full server refresh to repopulate
          console.log(`[Player] Only ${cachedCount} tracks cached — triggering refresh to reach 100`);
          try {
            const refreshRes = await fetch(`${BASE}/tracks/refresh`, { method: 'POST', headers: HEADERS, signal: AbortSignal.timeout(25000) });
            const refreshData = await refreshRes.json();
            console.log('[Player] Refresh result:', refreshData);
          } catch (e) {
            console.log('[Player] Background refresh error:', e);
          }
          // Re-fetch the now-populated cache
          await fetchCachedTracks();
        }
      } catch (e) {
        console.log('[Player] init error:', e);
      } finally {
        // ALWAYS clear loading — never leave the UI stuck
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  //  PUBLIC API
  // ═══════════════════════════════════════════════════════════════════════════

  /** Play a specific track (user tapped a track in the UI) */
  const playTrack = useCallback((track: Track, trackList?: Track[]) => {
    cancelCrossfade();

    // ── User manually selected a track → exit radio mode (local only) ──
    // This does NOT touch the server — the global station keeps playing
    setIsRadioMode(false);
    radioModeRef.current = false;

    if (trackList) {
      playlistRef.current = trackList;
      trackList.forEach(t => seenIdsRef.current.add(t.id.videoId));
      const idx = trackList.findIndex(t => t.id.videoId === track.id.videoId);
      const newIdx = idx >= 0 ? idx : 0;
      currentIndexRef.current = newIdx;
      setCurrentIndex(newIdx);
    }

    setCurrentTrack(track);
    setProgress(0);

    const active = activeDeckRef.current;
    // Hard-stop the other deck to prevent any audio overlap / echo
    stopDeck(otherDeck(active));

    loadOnDeck(active, track, true, masterVolumeRef.current);
    reportPlay(track);
  }, [cancelCrossfade, loadOnDeck, stopDeck]);

  /** Toggle play / pause */
  const togglePlay = useCallback(() => {
    const active = activeDeckRef.current;
    const engine = getDeckEngine(active).current;
    const track = currentTrackRef.current;

    if (isPlayingRef.current) {
      // Pause — if crossfading, cancel it too
      cancelCrossfade();
      pauseDeck(active);
    } else {
      // Ensure the inactive deck is fully stopped before resuming
      // (prevents echo if it was left playing from a previous transition)
      stopDeck(otherDeck(active));
      if (track) {
        // Resume
        if (engine === 'youtube') {
          try { getYtPlayer(active)?.playVideo(); } catch {}
        } else {
          try { getSafeSc(active)?.play(); } catch {}
        }
      } else if (tracks[0]) {
        playTrack(tracks[0], tracks);
      }
    }
  }, [tracks, playTrack, cancelCrossfade, pauseDeck, stopDeck]);

  /** Skip to next track (manual — quick crossfade) */
  const nextTrack = useCallback(() => {
    // Manual skip exits radio mode — user is taking control
    setIsRadioMode(false);
    radioModeRef.current = false;
    cancelCrossfade();
    hardAdvance();
  }, [cancelCrossfade, hardAdvance]);

  /** Go to previous track */
  const prevTrack = useCallback(() => {
    // Manual prev exits radio mode
    setIsRadioMode(false);
    radioModeRef.current = false;
    cancelCrossfade();

    const playlist = playlistRef.current;
    if (!playlist.length) return;

    // If more than 3 seconds in, restart the current track
    // Use progressRef so this callback is stable and doesn't rebuild every 400ms
    if (progressRef.current > 3) {
      const active = activeDeckRef.current;
      const engine = getDeckEngine(active).current;
      if (engine === 'soundcloud') {
        try { getSafeSc(active)?.seekTo(0); } catch {}
      } else {
        try { getYtPlayer(active)?.seekTo(0, true); } catch {}
      }
      setProgress(0);
      return;
    }

    const prevIdx = (currentIndexRef.current - 1 + playlist.length) % playlist.length;
    currentIndexRef.current = prevIdx;
    const prev = playlist[prevIdx];
    if (prev) {
      setCurrentTrack(prev);
      setCurrentIndex(prevIdx);
      setProgress(0);

      const active = activeDeckRef.current;
      // Hard-stop the other deck to prevent any audio overlap / echo
      stopDeck(otherDeck(active));
      loadOnDeck(active, prev, true, masterVolumeRef.current);
    }
  }, [cancelCrossfade, loadOnDeck, stopDeck]); // no `progress` dep — uses progressRef

  const toggleShuffle = useCallback(() => setIsShuffle(s => !s), []);
  const toggleRepeat  = useCallback(() => setIsRepeat(r => !r), []);

  /** Set master volume — adjusts active deck (and both during crossfade) */
  const setVolume = useCallback((v: number) => {
    masterVolumeRef.current = v;
    setVolumeState(v);

    if (isCrossfadingRef.current) {
      // Recalculate both deck volumes based on two-phase crossfade progress
      const elapsed = (Date.now() - crossfadeStartRef.current) / 1000;
      if (elapsed < LEAD_IN) {
        const t1 = elapsed / LEAD_IN;
        setDeckVolume(activeDeckRef.current, v * (1.0 - 0.3 * t1));
        setDeckVolume(incomingDeckRef.current, 0);
      } else {
        const t2 = Math.min((elapsed - LEAD_IN) / OVERLAP, 1);
        setDeckVolume(activeDeckRef.current, v * 0.7 * equalPowerOut(t2));
        setDeckVolume(incomingDeckRef.current, v * equalPowerIn(t2));
      }
    } else {
      setDeckVolume(activeDeckRef.current, v);
      // Also force-mute the inactive deck — prevents echo from leaked audio
      setDeckVolume(otherDeck(activeDeckRef.current), 0);
    }
  }, [setDeckVolume]);

  /** Seek within current track */
  const seekTo = useCallback((t: number) => {
    // If crossfading, cancel it — user is interacting with the current track
    cancelCrossfade();

    const active = activeDeckRef.current;
    const engine = getDeckEngine(active).current;
    if (engine === 'soundcloud') {
      try { getSafeSc(active)?.seekTo(t * 1000); } catch {}
    } else {
      try { getYtPlayer(active)?.seekTo(t, true); } catch {}
    }
    setProgress(t);
  }, [cancelCrossfade]);

  const searchTracks = useCallback(async (q: string): Promise<Track[]> => {
    try {
      const res = await fetch(`${BASE}/search?q=${encodeURIComponent(q)}`, { headers: HEADERS });
      const data = await res.json();
      return (Array.isArray(data) ? data : (data.tracks || [])).map(sanitizeTrack).filter(Boolean) as Track[];
    } catch (e) {
      console.log('[Player] searchTracks error:', e);
      return [];
    }
  }, []);

  // ── Auto-start Radio: syncs with server-side radio clock ──────────────────
  // On first load, fetches what the station is currently playing and seeks to
  // the correct position. If no station state exists, starts from track 0 and
  // initializes the station clock. Enters radio mode automatically.

  /** Internal: start a track at a given position WITHOUT exiting radio mode */
  const startTrackInRadioMode = useCallback((track: Track, idx: number, seekSec: number) => {
    cancelCrossfade();

    playlistRef.current.forEach(t => seenIdsRef.current.add(t.id.videoId));
    currentIndexRef.current = idx;
    setCurrentIndex(idx);
    setCurrentTrack(track);
    setProgress(0);

    const active = activeDeckRef.current;
    // Hard-stop the other deck to prevent any audio overlap / echo
    stopDeck(otherDeck(active));
    loadOnDeck(active, track, true, masterVolumeRef.current);
    reportPlay(track);

    // Enter radio mode (don't use playTrack — it exits radio mode)
    setIsRadioMode(true);
    radioModeRef.current = true;

    // Seek to correct position after player has time to buffer
    if (seekSec > 2) {
      setTimeout(() => {
        const activeDeck = activeDeckRef.current;
        const eng = getDeckEngine(activeDeck).current;
        if (eng === 'youtube') {
          try { getYtPlayer(activeDeck)?.seekTo(seekSec, true); } catch {}
        } else {
          try { getSafeSc(activeDeck)?.seekTo(seekSec * 1000); } catch {}
        }
        setProgress(seekSec);
      }, 2000);
    }
  }, [cancelCrossfade, loadOnDeck, stopDeck]);

  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current || !playerReady || !tracks.length) return;
    autoStartedRef.current = true;

    // Sync with server radio clock
    (async () => {
      try {
        const res = await fetch(`${BASE}/radio/now-playing`, { headers: HEADERS });
        const { state } = await res.json();

        if (state?.videoId) {
          const idx = tracks.findIndex(t => t.id.videoId === state.videoId);
          if (idx >= 0) {
            const elapsed = (Date.now() - state.startedAt) / 1000;
            const dur = state.durationSec || 0;

            // If track is still playing (or we don't know its duration)
            if (dur <= 0 || elapsed < dur) {
              console.log(`[Radio] Syncing to station: "${tracks[idx].snippet.title}" at ${elapsed.toFixed(1)}s`);
              startTrackInRadioMode(tracks[idx], idx, elapsed);
              return;
            }

            // Track is over — play the next sequential track
            const nextIdx = (idx + 1) % tracks.length;
            console.log(`[Radio] Station track ended, advancing to: "${tracks[nextIdx].snippet.title}"`);
            startTrackInRadioMode(tracks[nextIdx], nextIdx, 0);

            // Update server with new track
            fetch(`${BASE}/radio/advance`, {
              method: 'POST',
              headers: { ...HEADERS, 'Content-Type': 'application/json' },
              body: JSON.stringify({ videoId: tracks[nextIdx].id.videoId, startedAt: Date.now(), durationSec: 0 }),
            }).catch(() => {});
            return;
          }
        }

        // No station state or track not found — initialize the radio
        console.log('[Radio] No station state found, initializing radio with:', tracks[0]?.snippet.title);
        startTrackInRadioMode(tracks[0], 0, 0);

        fetch(`${BASE}/radio/advance`, {
          method: 'POST',
          headers: { ...HEADERS, 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: tracks[0].id.videoId, startedAt: Date.now(), durationSec: 0 }),
        }).catch(() => {});
      } catch (e) {
        console.log('[Radio] Server sync failed, starting from track 0:', e);
        startTrackInRadioMode(tracks[0], 0, 0);
      }
    })();
  }, [playerReady, tracks, startTrackInRadioMode]);

  // ── Duration reporting: once per track, tell the server how long it is ────
  useEffect(() => {
    if (!radioModeRef.current || !currentTrack || duration <= 0) return;
    const vid = currentTrack.id.videoId;
    if (lastDurationReportRef.current === vid) return;
    lastDurationReportRef.current = vid;

    fetch(`${BASE}/radio/report-duration`, {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: vid, durationSec: duration }),
    }).catch(() => {});
  }, [currentTrack, duration]);

  // ── Heartbeat: tell the server we're listening (every 30s) ────────────────
  // Includes Page Visibility API so mobile users with screen-off re-register
  // when they come back, preventing listener count drops on mobile.
  useEffect(() => {
    if (!isPlaying) return;
    const guestId = getGuestIdSync();
    const sendHeartbeat = () => {
      fetch(`${BASE}/radio/heartbeat`, {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId }),
      }).catch(() => {});
    };
    sendHeartbeat(); // immediate
    const hbInterval = setInterval(sendHeartbeat, 60_000);

    // Re-send heartbeat when tab/app becomes visible again (mobile screen-on)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') sendHeartbeat();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(hbInterval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [isPlaying]);

  // ── Listener count poll (every 45s) ───────────────────────────────────────
  useEffect(() => {
    const poll = () => {
      fetch(`${BASE}/radio/listeners`, { headers: HEADERS })
        .then(r => r.json())
        .then(d => { if (d?.count) setListenerCount(d.count); if (d?.totalVisitors != null) setTotalVisitors(d.totalVisitors); })
        .catch(() => {});
    };
    poll();
    const interval = setInterval(poll, 60_000);
    return () => clearInterval(interval);
  }, []);

  // ── "Back to LIVE" reminder toast after 5 min in personal mode ────────────
  // Uses sessionStorage so the "shown" flag survives page reloads within the
  // same tab session, preventing toast spam on refresh during personal mode.
  useEffect(() => {
    const SS_KEY = 'jc_live_toast_shown';
    if (isRadioMode) {
      // Reset when re-entering radio mode
      personalModeStartRef.current = 0;
      reminderShownRef.current = false;
      try { sessionStorage.removeItem(SS_KEY); } catch {}
      return;
    }
    // Check sessionStorage on entry — if already shown this session, don't re-arm
    try {
      if (sessionStorage.getItem(SS_KEY) === '1') {
        reminderShownRef.current = true;
      }
    } catch {}
    // Entered personal mode
    if (!personalModeStartRef.current) {
      personalModeStartRef.current = Date.now();
    }
    const timer = setTimeout(() => {
      if (!radioModeRef.current && !reminderShownRef.current && isPlaying) {
        reminderShownRef.current = true;
        try { sessionStorage.setItem(SS_KEY, '1'); } catch {}
        toast('🎵 The station is still live!', {
          description: 'Tap "Back to LIVE" in the player to rejoin the radio.',
          duration: 8000,
          action: {
            label: 'Back to LIVE',
            onClick: () => { backToLiveRef.current(); },
          },
        });
      }
    }, 5 * 60 * 1000); // 5 minutes
    return () => clearTimeout(timer);
  }, [isRadioMode, isPlaying]);

  // ── Back to Live: fetch server state and re-sync ──────────────────────────
  const backToLive = useCallback(async () => {
    const playlist = playlistRef.current;
    if (!playlist.length) return;

    try {
      const res = await fetch(`${BASE}/radio/now-playing`, { headers: HEADERS });
      const { state } = await res.json();

      if (state?.videoId) {
        const idx = playlist.findIndex(t => t.id.videoId === state.videoId);
        if (idx >= 0) {
          const elapsed = (Date.now() - state.startedAt) / 1000;
          const dur = state.durationSec || 0;

          if (dur <= 0 || elapsed < dur) {
            console.log(`[Radio] Back to LIVE: "${playlist[idx].snippet.title}" at ${elapsed.toFixed(1)}s`);
            startTrackInRadioMode(playlist[idx], idx, elapsed);
            return;
          }

          // Track ended — play next
          const nextIdx = (idx + 1) % playlist.length;
          startTrackInRadioMode(playlist[nextIdx], nextIdx, 0);
          fetch(`${BASE}/radio/advance`, {
            method: 'POST',
            headers: { ...HEADERS, 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: playlist[nextIdx].id.videoId, startedAt: Date.now(), durationSec: 0 }),
          }).catch(() => {});
          return;
        }
      }

      // Fallback: no server state, just start from 0 in radio mode
      console.log('[Radio] Back to LIVE: no server state, starting from track 0');
      startTrackInRadioMode(playlist[0], 0, 0);
    } catch (e) {
      console.log('[Radio] Back to LIVE failed, starting from track 0:', e);
      startTrackInRadioMode(playlist[0], 0, 0);
    }
  }, [startTrackInRadioMode]);

  // Stable ref for backToLive so the toast action can call it
  const backToLiveRef = useRef(backToLive);
  useEffect(() => { backToLiveRef.current = backToLive; }, [backToLive]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  MEDIA SESSION API — lock screen controls (iOS & Android)
  // ═══════════════════════════════════════════════════════════════════════════

  // Silent AudioContext to keep iOS audio session alive for Media Session API.
  // Must be resumed inside a user gesture (handled in togglePlay).
  const audioCtxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC) audioCtxRef.current = new AC();
    } catch {}
    return () => {
      try { audioCtxRef.current?.close(); } catch {}
    };
  }, []);

  // ── Resume AudioContext on iOS (user gesture required) ────────────────────
  const resumeAudioContext = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }, []);

  // Ref-based wrapper so togglePlay always calls latest + resumes AudioContext
  const originalTogglePlayRef = useRef(togglePlay);
  useEffect(() => { originalTogglePlayRef.current = togglePlay; }, [togglePlay]);

  const togglePlayWithAudioCtx = useCallback(() => {
    resumeAudioContext();
    originalTogglePlayRef.current();
  }, [resumeAudioContext]);

  // ── Set media metadata whenever the current track changes ─────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    const thumb = currentTrack.source === 'soundcloud'
      ? (currentTrack.snippet.thumbnails.high?.url ||
         currentTrack.snippet.thumbnails.medium?.url ||
         currentTrack.snippet.thumbnails.default?.url || '')
      : getMaxResThumbnail(currentTrack.id.videoId);
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.snippet.title,
        artist: currentTrack.snippet.channelTitle,
        album: 'Jersey Club Radio',
        artwork: thumb ? [
          { src: thumb, sizes: '96x96', type: 'image/jpeg' },
          { src: thumb, sizes: '128x128', type: 'image/jpeg' },
          { src: thumb, sizes: '256x256', type: 'image/jpeg' },
          { src: thumb, sizes: '512x512', type: 'image/jpeg' },
        ] : [],
      });
    } catch (e) {
      console.log('[MediaSession] metadata error:', e);
    }
  }, [currentTrack]);

  // ── Register action handlers (play/pause/next/prev) ───────────────────────
  const nextTrackRef = useRef(nextTrack);
  useEffect(() => { nextTrackRef.current = nextTrack; }, [nextTrack]);
  const prevTrackRef = useRef(prevTrack);
  useEffect(() => { prevTrackRef.current = prevTrack; }, [prevTrack]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;

    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', () => { resumeAudioContext(); originalTogglePlayRef.current(); }],
      ['pause', () => { originalTogglePlayRef.current(); }],
      ['nexttrack', () => { nextTrackRef.current(); }],
      ['previoustrack', () => { prevTrackRef.current(); }],
    ];

    for (const [action, handler] of handlers) {
      try { ms.setActionHandler(action, handler); } catch {}
    }

    return () => {
      for (const [action] of handlers) {
        try { ms.setActionHandler(action, null); } catch {}
      }
    };
  }, [resumeAudioContext]);

  // ── Sync playbackState with actual player state ───────────────────────────
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch {}
  }, [isPlaying]);

  // ── Position state update on 1-second interval while playing ──────────────
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    if (!isPlaying) {
      // Update position one final time on pause so scrubber stays accurate
      try {
        if (durationRef.current > 0) {
          navigator.mediaSession.setPositionState({
            duration: durationRef.current,
            playbackRate: 1,
            position: Math.min(progressRef.current, durationRef.current),
          });
        }
      } catch {}
      return;
    }

    const posInterval = setInterval(() => {
      try {
        const dur = durationRef.current;
        const pos = progressRef.current;
        if (dur > 0 && pos >= 0 && pos <= dur) {
          navigator.mediaSession.setPositionState({
            duration: dur,
            playbackRate: 1,
            position: pos,
          });
        }
      } catch {}
    }, 1000);

    return () => clearInterval(posInterval);
  }, [isPlaying]);

  return (
    <PlayerContext.Provider value={useMemo(() => ({
      tracks, newReleases, currentTrack, currentIndex,
      isPlaying, isShuffle, isRepeat, volume,
      isLoading, isRefreshing, isFetchingMore, playerReady,
      isRadioMode, listenerCount, totalVisitors,
      playTrack, togglePlay: togglePlayWithAudioCtx, nextTrack, prevTrack,
      toggleShuffle, toggleRepeat, setVolume, seekTo,
      refreshTracks, searchTracks,
      backToLive,
    }), [
      tracks, newReleases, currentTrack, currentIndex,
      isPlaying, isShuffle, isRepeat, volume,
      isLoading, isRefreshing, isFetchingMore, playerReady,
      isRadioMode, listenerCount, totalVisitors,
      playTrack, togglePlayWithAudioCtx, nextTrack, prevTrack,
      toggleShuffle, toggleRepeat, setVolume, seekTo,
      refreshTracks, searchTracks,
      backToLive,
    ])}>
      <PlayerProgressContext.Provider value={useMemo(() => ({ progress, duration }), [progress, duration])}>
        {children}
      </PlayerProgressContext.Provider>
    </PlayerContext.Provider>
  );
}