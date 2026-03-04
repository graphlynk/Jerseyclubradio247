import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, RefreshCw, Play, Film, Square, Clock, Sparkles, RotateCcw, Zap,
} from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { formatArtistName } from '../utils/formatArtistName';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-715f71b9`;

interface DanceVideo {
  id: string;
  videoId?: string;
  title: string;
  thumbnail: string;
  channelTitle?: string;
  publishedAt?: string;
  source: 'youtube';
}

/** Frontend safety net — block any beat content that slips through backend */
const FRONT_BLOCKLIST = [
  'type beat', 'typebeat', 'beat maker', 'beatmaker', 'instrumental',
  'fl studio', 'ableton', 'producer', 'production', 'cookup', 'cook up',
  'sample pack', 'drum kit', 'loop kit', 'free beat', 'beat for sale',
  'beat tape', 'beat tutorial', 'making a beat', 'making beats',
  'studio session', 'music production', 'podcast', 'interview',
  'unboxing', 'review', 'reaction video', 'lyrics', 'karaoke',
];

function isBeatContent(title: string): boolean {
  const t = title.toLowerCase();
  return FRONT_BLOCKLIST.some(kw => t.includes(kw)) || /\bbeats?\b/.test(t);
}

function formatRelativeDate(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function getVideoDate(v: DanceVideo): number {
  return v.publishedAt ? new Date(v.publishedAt).getTime() : 0;
}

export function DanceVideos() {
  const [videos, setVideos] = useState<DanceVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newToday, setNewToday] = useState(0);
  const [newlyAdded, setNewlyAdded] = useState(0); // badge count when background adds videos
  const prevCountRef = useRef(0);
  const lastFetchRef = useRef(0); // timestamp of last fetch

  const fetchVideos = useCallback(async (force = false, silent = false) => {
    try {
      if (force) setRefreshing(true);
      else if (!silent) setLoading(true);
      if (!silent) setError(null);

      const endpoint = force ? `${API}/dance-videos/refresh` : `${API}/dance-videos`;
      const res = await fetch(endpoint, {
        method: force ? 'POST' : 'GET',
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();

      const incoming = data.videos || [];
      lastFetchRef.current = Date.now();

      // Show "+N new" badge when background top-up added videos
      if (silent && prevCountRef.current > 0 && incoming.length > prevCountRef.current) {
        setNewlyAdded(incoming.length - prevCountRef.current);
      }
      prevCountRef.current = incoming.length;
      setVideos(incoming);
      if (data.newToday) setNewToday(data.newToday);
    } catch (err) {
      if (!silent) {
        console.error('[DanceVideos] Fetch error:', err);
        setError(String(err));
      } else {
        console.warn('[DanceVideos] Silent refresh failed:', err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load + 2-hour auto-refresh interval + tab visibility check
  useEffect(() => {
    fetchVideos();

    // Silent auto-refresh every 2 hours while the page is open
    const interval = setInterval(() => {
      fetchVideos(false, true);
    }, 2 * 60 * 60 * 1000);

    // Also silently refresh when user comes back to the tab after 5+ minutes away
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const minutesAway = (Date.now() - lastFetchRef.current) / 60000;
        if (minutesAway >= 5) fetchVideos(false, true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchVideos]);

  // Auto-dismiss the "newly added" badge after 8 seconds
  useEffect(() => {
    if (newlyAdded > 0) {
      const t = setTimeout(() => setNewlyAdded(0), 8000);
      return () => clearTimeout(t);
    }
  }, [newlyAdded]);

  // Frontend safety: filter out any beat content that slipped past backend, sort newest first
  const sorted = videos
    .filter(v => !isBeatContent(v.title))
    .sort((a, b) => getVideoDate(b) - getVideoDate(a));

  return (
    <div className="min-h-[calc(100vh-96px)] p-4 md:p-6" style={{ background: '#06000F' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/"
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{ background: '#1a003a', border: '1px solid #9D00FF40' }}
          >
            <ArrowLeft className="w-4 h-4 text-[#C084FC]" />
          </Link>
          <div className="flex-1">
            <h1
              className="text-2xl md:text-3xl font-black text-white uppercase"
              style={{
                textShadow: '0 0 20px #C084FC80, 0 0 40px #9D00FF40, 0 0 60px #9D00FF20',
              }}
            >
              Dance Shorts
            </h1>
            <p className="text-xs text-[#7B6F90] mt-0.5">
              Jersey Club dance shorts &middot; auto-updates every 2 hours &middot; newest first
            </p>
          </div>
          <button
            onClick={() => fetchVideos(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: '#1a003a', border: '1px solid #9D00FF40', color: '#C084FC' }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Stats Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
            style={{ background: '#0D001E', border: '1px solid #2a0060' }}
          >
            <Film className="w-3.5 h-3.5 text-[#9D00FF]" />
            <span className="text-[#C084FC] font-bold">{sorted.length}</span>
            <span className="text-[#5B4F70]">shorts</span>
          </div>
          {newToday > 0 && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
              style={{ background: '#0D001E', border: '1px solid #C084FC40' }}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C084FC]" />
              <span className="text-[#E0AAFF] font-bold">+{newToday}</span>
              <span className="text-[#5B4F70]">new today</span>
            </div>
          )}
          {/* "New videos just added" toast — appears after background top-up */}
          <AnimatePresence>
            {newlyAdded > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold"
                style={{
                  background: 'linear-gradient(135deg, #1a0040, #0d0028)',
                  border: '1px solid #C084FC70',
                  boxShadow: '0 0 16px #C084FC30',
                  color: '#E0AAFF',
                  textShadow: '0 0 8px #C084FC80',
                }}
              >
                <Zap className="w-3.5 h-3.5 text-[#C084FC]" />
                +{newlyAdded} new shorts just added!
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 rounded-full border-3 border-[#9D00FF] border-t-transparent animate-spin mb-4" />
            <p
              className="text-sm font-bold text-[#C084FC]"
              style={{ textShadow: '0 0 12px #C084FC60' }}
            >
              LOADING DANCE SHORTS...
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            className="rounded-2xl p-6 text-center mb-6"
            style={{ background: '#1a0020', border: '1px solid #FF008040' }}
          >
            <p className="text-[#FF0080] text-sm font-bold mb-2">Failed to load shorts</p>
            <p className="text-[#5B4F70] text-xs mb-4">{error}</p>
            <button
              onClick={() => fetchVideos(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #9D00FF, #FF0080)' }}
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && sorted.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">💃</p>
            <p className="text-white font-black text-lg mb-2">NO SHORTS YET</p>
            <p className="text-[#7B6F90] text-sm mb-4">
              Hit refresh to pull the latest Jersey Club dance shorts.
            </p>
            <button
              onClick={() => fetchVideos(true)}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #9D00FF, #FF0080)' }}
            >
              Fetch Shorts
            </button>
          </div>
        )}

        {/* ────── Shorts Grid — true 9:16 portrait cards like YouTube Shorts ────── */}
        {!loading && sorted.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {sorted.map((video, i) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.015, 0.25), duration: 0.18 }}
              >
                <ShortsCard
                  video={video}
                  isPlaying={playingId === video.id}
                  onTogglePlay={() =>
                    setPlayingId(prev => (prev === video.id ? null : video.id))
                  }
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Shorts Card — always 9:16, matching real YouTube Shorts ─────────────── */
/* Uses YouTube IFrame postMessage API to detect video end and show replay overlay */

function ShortsCard({
  video,
  isPlaying,
  onTogglePlay,
}: {
  video: DanceVideo;
  isPlaying: boolean;
  onTogglePlay: () => void;
}) {
  const dateLabel = formatRelativeDate(video.publishedAt);
  const isRecent = dateLabel === 'Today' || dateLabel === 'Yesterday';
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ended, setEnded] = useState(false);
  const [iframeKey, setIframeKey] = useState(0); // used to force remount on replay

  // Reset ended state when play state changes
  useEffect(() => {
    if (!isPlaying) setEnded(false);
  }, [isPlaying]);

  // Listen for YouTube postMessage events to detect video end (state === 0)
  useEffect(() => {
    if (!isPlaying || !video.videoId) return;

    const handleMessage = (e: MessageEvent) => {
      if (e.origin !== 'https://www.youtube.com') return;
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        // YT sends { event: "onStateChange", info: 0 } when video ends
        if (data?.event === 'onStateChange' && data?.info === 0) {
          setEnded(true);
        }
        // Also catch infoDelivery with playerState === 0
        if (data?.info?.playerState === 0) {
          setEnded(true);
        }
      } catch {
        // ignore non-JSON messages
      }
    };

    window.addEventListener('message', handleMessage);

    // After iframe loads, tell YT we want to listen for events
    const timer = setTimeout(() => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ event: 'listening' }),
          'https://www.youtube.com'
        );
      }
    }, 1500);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timer);
    };
  }, [isPlaying, video.videoId, iframeKey]);

  const handleReplay = () => {
    setEnded(false);
    setIframeKey(k => k + 1); // force iframe remount = fresh autoplay
  };

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background: '#0D001E',
        border: isPlaying ? '1.5px solid #C084FC80' : '1.5px solid #9D00FF20',
        boxShadow: isPlaying ? '0 0 28px #C084FC25' : '0 0 12px #9D00FF08',
      }}
    >
      {/* ─── 9:16 video area — same for thumbnail & player ─── */}
      <div
        className="relative w-full bg-black overflow-hidden"
        style={{ aspectRatio: '9 / 16' }}
      >
        {isPlaying && video.videoId ? (
          /* ═══ PLAYING — embedded Shorts player, branding fully masked ═══ */
          <>
            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&controls=1&disablekb=0&fs=1&cc_load_policy=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
              className="absolute border-0"
              style={{
                top: '-8%',
                left: '-4%',
                width: '108%',
                height: '116%',
              }}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title={video.title}
            />
            {/* Top black strip — kills YouTube title / channel name completely */}
            <div
              className="absolute top-0 left-0 right-0 z-[2] pointer-events-none"
              style={{
                height: '16%',
                background: 'linear-gradient(to bottom, #000 0%, #000000F5 25%, #000000CC 50%, #00000066 75%, transparent 100%)',
              }}
            />
            {/* Bottom strip — kills YT branding at bottom edge */}
            <div
              className="absolute bottom-0 left-0 right-0 z-[2] pointer-events-none"
              style={{
                height: '8%',
                background: 'linear-gradient(to top, #000000CC 0%, #00000066 40%, transparent 100%)',
              }}
            />
            {/* Bottom-right corner — kills YT logo watermark */}
            <div
              className="absolute bottom-0 right-0 z-[2] pointer-events-none"
              style={{
                width: '70px',
                height: '36px',
                background: 'linear-gradient(135deg, transparent 0%, #000000DD 100%)',
              }}
            />

            {/* Stop button */}
            <button
              onClick={onTogglePlay}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
              style={{ background: '#000000CC', backdropFilter: 'blur(8px)' }}
            >
              <Square className="w-3 h-3 text-white fill-white" />
            </button>

            {/* ═══ VIDEO ENDED OVERLAY — covers "Watch on YouTube" completely ═══ */}
            {ended && (
              <div
                className="absolute inset-0 z-[5] flex flex-col items-center justify-center"
                style={{
                  background: 'radial-gradient(ellipse at center, #0D001EF0 0%, #06000FF8 60%, #000000 100%)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                {/* Thumbnail behind overlay for visual context */}
                {video.thumbnail && (
                  <img
                    src={video.thumbnail}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover opacity-15 blur-sm"
                  />
                )}

                {/* Replay button */}
                <button
                  onClick={handleReplay}
                  className="relative z-10 group flex flex-col items-center gap-3 transition-transform hover:scale-105"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                    style={{
                      background: 'linear-gradient(135deg, #9D00FF, #C084FC)',
                      boxShadow: '0 0 30px #C084FC60, 0 0 60px #9D00FF30',
                    }}
                  >
                    <RotateCcw className="w-7 h-7 text-white" />
                  </div>
                  <span
                    className="text-white font-black text-sm uppercase tracking-wider"
                    style={{
                      textShadow: '0 0 12px #C084FC80, 0 0 24px #9D00FF40',
                    }}
                  >
                    REPLAY
                  </span>
                </button>

                {/* Video title */}
                <p
                  className="relative z-10 text-[10px] text-[#B0A0C8] uppercase text-center px-4 mt-3 line-clamp-2 leading-tight"
                  style={{ textShadow: '0 0 8px #000' }}
                >
                  {video.title}
                </p>

                {/* Close / back to thumbnail */}
                <button
                  onClick={onTogglePlay}
                  className="relative z-10 mt-4 px-4 py-1.5 rounded-full text-[10px] font-bold text-[#7B6F90] transition-colors hover:text-white"
                  style={{ background: '#ffffff10', border: '1px solid #ffffff15' }}
                >
                  CLOSE
                </button>
              </div>
            )}
          </>
        ) : (
          /* ═══ THUMBNAIL — 9:16 portrait with play overlay ═══ */
          <button onClick={onTogglePlay} className="group w-full h-full block relative">
            {video.thumbnail ? (
              <img
                src={video.thumbnail}
                alt={video.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: '#0a0018' }}
              >
                <Film className="w-10 h-10 text-[#3B2F50]" />
              </div>
            )}

            {/* Dark gradient at bottom for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

            {/* Centered play button on hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: '#C084FCCC', boxShadow: '0 0 24px #C084FC80' }}
              >
                <Play className="w-6 h-6 text-white fill-white ml-0.5" />
              </div>
            </div>

            {/* Shorts badge */}
            <div
              className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider text-white"
              style={{ background: '#C084FCBB' }}
            >
              SHORTS
            </div>

            {/* Bottom overlay: title + channel + date inside the 9:16 frame */}
            <div className="absolute bottom-0 left-0 right-0 p-3 z-[3]">
              <p
                className="text-white font-bold text-[11px] uppercase leading-tight line-clamp-2 mb-1"
                style={{ textShadow: '0 1px 6px #000, 0 0 10px #C084FC30' }}
              >
                {video.title}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {video.channelTitle && (
                  <span className="text-[10px] text-[#B0A0C8] truncate max-w-[60%]" style={{ textShadow: '0 1px 4px #000' }}>
                    {formatArtistName(video.channelTitle)}
                  </span>
                )}
                {dateLabel && (
                  <>
                    <span className="text-[#5B4F70]">&middot;</span>
                    <span
                      className="text-[10px] font-bold flex-shrink-0"
                      style={{ color: '#00FF88', textShadow: '0 1px 4px #000' }}
                    >
                      {dateLabel}
                    </span>
                  </>
                )}
              </div>
            </div>
          </button>
        )}

        {/* Purple date badge — always visible top-left */}
        {dateLabel && (
          <div
            className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{
              background: isRecent ? '#C084FC40' : '#1a003aDD',
              color: '#E0AAFF',
              border: `1px solid ${isRecent ? '#C084FC60' : '#9D00FF50'}`,
              backdropFilter: 'blur(6px)',
              textShadow: '0 0 6px #C084FC80',
            }}
          >
            <Clock className="w-2.5 h-2.5" />
            {dateLabel}
          </div>
        )}
      </div>
    </div>
  );
}