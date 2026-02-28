import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { useCrateSafe } from '../context/CrateContext';
import { X, Search, Music2, Radio, Loader2, Disc3, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { formatArtistName } from '../utils/formatArtistName';
import { formatTrackTitle } from '../utils/formatTrackTitle';
import { getMaxResThumbnail, handleThumbnailError } from '../utils/getMaxResThumbnail';
import type { Track } from '../context/PlayerContext';

interface TrackBrowserProps {
  isOpen: boolean;
  onClose: () => void;
}

const POLL_INTERVAL = 60_000; // check for new tracks every 60s
const TOOLTIP_KEY = 'jcr_vinyl_tooltip_shown';

export function TrackBrowser({ isOpen, onClose }: TrackBrowserProps) {
  const {
    tracks, currentTrack, playTrack, isLoading, isFetchingMore,
    refreshTracks, isRefreshing,
  } = usePlayer();

  const crateCtx = useCrateSafe();
  const addToCrate = crateCtx?.addToCrate;
  const removeFromCrate = crateCtx?.removeFromCrate;
  const isInCrate = crateCtx?.isInCrate ?? (() => false);
  const is24k = crateCtx?.is24k ?? false;
  const addingIds = crateCtx?.addingIds ?? new Set<string>();
  const openPaywall = crateCtx?.openPaywall ?? (() => {});
  const isGuestAtLimit = crateCtx?.isGuestAtLimit ?? false;
  const visitorId = crateCtx?.visitorId;

  const [query, setQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasNewTracks, setHasNewTracks] = useState(false);
  const prevTrackCountRef = useRef(0);
  const [showTooltip, setShowTooltip] = useState(false);

  // Show first-use tooltip
  useEffect(() => {
    if (!isOpen) return;
    try {
      const shown = localStorage.getItem(TOOLTIP_KEY);
      if (!shown) {
        setShowTooltip(true);
        const timer = setTimeout(() => {
          setShowTooltip(false);
          localStorage.setItem(TOOLTIP_KEY, '1');
        }, 4000);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [isOpen]);

  // Focus search when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 250);
      prevTrackCountRef.current = tracks.length;
    } else {
      setQuery('');
      setHasNewTracks(false);
    }
  }, [isOpen]);

  // Auto-poll for new tracks while panel is open
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      // Silently check — refreshTracks updates the tracks array in context
      refreshTracks().catch(() => {});
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [isOpen, refreshTracks]);

  // Detect when new tracks arrive
  useEffect(() => {
    if (!isOpen) return;
    if (prevTrackCountRef.current > 0 && tracks.length > prevTrackCountRef.current) {
      const newCount = tracks.length - prevTrackCountRef.current;
      setHasNewTracks(true);
      toast(
        `${newCount} new track${newCount > 1 ? 's' : ''} added! \u2191 Scroll up to see latest`,
        {
          duration: 5000,
          style: {
            background: 'rgba(13,0,30,0.95)',
            border: '1px solid rgba(157,0,255,0.5)',
            color: '#C084FC',
            fontSize: 13,
          },
        }
      );
    }
    prevTrackCountRef.current = tracks.length;
  }, [tracks.length, isOpen]);

  // Scroll to currently playing track when panel opens
  useEffect(() => {
    if (!isOpen || !currentTrack || query) return;
    setTimeout(() => {
      const el = scrollRef.current?.querySelector('[data-current="true"]');
      if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 350);
  }, [isOpen, currentTrack, query]);

  const filtered = query.trim()
    ? tracks.filter(t =>
      t.snippet.title.toLowerCase().includes(query.toLowerCase()) ||
      t.snippet.channelTitle.toLowerCase().includes(query.toLowerCase())
    )
    : tracks;

  const handleSelect = (track: typeof tracks[0]) => {
    playTrack(track, tracks);
    onClose();
  };

  const handleCrateTap = useCallback((e: React.MouseEvent, track: Track) => {
    e.stopPropagation(); // Don't trigger row click (playTrack)
    if (!track) return;
    const videoId = track.id.videoId;
    if (isInCrate(videoId)) {
      removeFromCrate?.(videoId);
    } else if (!is24k && isGuestAtLimit) {
      openPaywall();
    } else {
      addToCrate?.(track);
    }
  }, [isInCrate, removeFromCrate, is24k, isGuestAtLimit, openPaywall, addToCrate]);

  const handleRefresh = async () => {
    setHasNewTracks(false);
    await refreshTracks();
    // Scroll to top after refresh
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(6,0,15,0.75)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Slide-up panel — sits directly above the fixed player bar */}
          <motion.div
            className="fixed left-0 right-0 z-50 flex flex-col"
            style={{
              bottom: 64,
              maxHeight: 'calc(100dvh - 130px)',
              background: 'linear-gradient(180deg, #0a0018 0%, #06000F 100%)',
              borderTop: '1px solid rgba(157,0,255,0.5)',
              boxShadow: '0 -12px 60px rgba(157,0,255,0.25), 0 -2px 0 rgba(157,0,255,0.7)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          >
            {/* ── Header ───────────────────────────────────────────────────── */}
            <div
              className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(42,0,96,0.8)' }}
            >
              {/* Title */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Radio className="w-4 h-4 text-[#9D00FF]" />
                <span className="text-sm font-bold text-white uppercase tracking-widest">
                  On The Radio
                </span>
                {(isFetchingMore || isRefreshing) && (
                  <Loader2 className="w-3 h-3 text-[#9D00FF] animate-spin ml-1" />
                )}
              </div>

              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1 px-2 py-1 rounded-full transition-all hover:scale-105 active:scale-95 flex-shrink-0"
                style={{
                  background: hasNewTracks ? 'rgba(157,0,255,0.25)' : 'rgba(26,0,58,0.6)',
                  border: `1px solid ${hasNewTracks ? 'rgba(157,0,255,0.7)' : 'rgba(42,0,96,0.6)'}`,
                  color: hasNewTracks ? '#C084FC' : '#5B4F70',
                }}
              >
                <RefreshCw
                  className="w-3 h-3"
                  style={{
                    animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                  }}
                />
                <span className="text-[9px] font-bold uppercase tracking-wider hidden sm:inline">
                  {hasNewTracks ? 'New!' : 'Refresh'}
                </span>
              </button>

              {/* Search */}
              <div className="relative flex-1 max-w-sm mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5B4F70] pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search artist or title\u2026"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-4 py-2 rounded-full outline-none placeholder-[#3B2F50] text-white"
                  style={{
                    background: 'rgba(26,0,58,0.9)',
                    border: '1px solid rgba(42,0,96,0.8)',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(157,0,255,0.7)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(42,0,96,0.8)')}
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#5B4F70] hover:text-white transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Close */}
              <button
                onClick={onClose}
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-[#1a003a] text-[#5B4F70] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── First-use tooltip ─────────────────────────────────────────── */}
            <AnimatePresence>
              {showTooltip && (
                <motion.div
                  className="mx-4 mt-2 px-3 py-2 rounded-lg text-center"
                  style={{
                    background: 'rgba(157,0,255,0.15)',
                    border: '1px solid rgba(157,0,255,0.4)',
                  }}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="text-[11px] text-[#C084FC]">
                    Tap the <Disc3 className="w-3 h-3 inline-block mx-0.5 -mt-0.5" /> vinyl to save to your crate
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Track list ───────────────────────────────────────────────── */}
            <div
              ref={scrollRef}
              className="overflow-y-auto flex-1"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A0060 transparent' }}
            >
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-6 h-6 text-[#9D00FF] animate-spin" />
                  <span className="text-[#5B4F70] text-xs uppercase tracking-wider">Tuning in\u2026</span>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <Music2 className="w-8 h-8 text-[#2A0060]" />
                  <span className="text-[#5B4F70] text-sm">No tracks found</span>
                </div>
              ) : (
                <div>
                  {filtered.map((track, i) => {
                    const isCurrent = currentTrack?.id.videoId === track.id.videoId;
                    const thumb = getMaxResThumbnail(track.id.videoId);
                    const title = formatTrackTitle(track.snippet.title, track.snippet.channelTitle);
                    const artist = formatArtistName(track.snippet.channelTitle);
                    const inCrate = isInCrate(track.id.videoId);
                    const isAddingThis = addingIds.has(track.id.videoId);

                    return (
                      <button
                        key={track.id.videoId}
                        data-current={isCurrent}
                        onClick={() => handleSelect(track)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150 group"
                        style={{
                          background: isCurrent ? 'rgba(157,0,255,0.1)' : undefined,
                          borderLeft: isCurrent ? '2px solid #9D00FF' : '2px solid transparent',
                        }}
                        onMouseEnter={e => {
                          if (!isCurrent) (e.currentTarget as HTMLElement).style.background = 'rgba(26,0,58,0.6)';
                        }}
                        onMouseLeave={e => {
                          if (!isCurrent) (e.currentTarget as HTMLElement).style.background = '';
                        }}
                      >
                        {/* Track number */}
                        <span
                          className="text-[10px] font-mono w-5 text-right flex-shrink-0"
                          style={{ color: isCurrent ? '#9D00FF' : '#3B2F50' }}
                        >
                          {isCurrent ? '\u25B6' : i + 1}
                        </span>

                        {/* Thumbnail */}
                        <div className="relative w-9 h-9 rounded overflow-hidden flex-shrink-0 bg-[#0d001e]">
                          {thumb ? (
                            <img src={thumb} alt="" className="w-full h-full object-contain p-0.5" style={{ background: '#0d001e' }} onError={(e) => handleThumbnailError(e, track.id.videoId)} />
                          ) : (
                            <div className="w-full h-full bg-[#1a003a] flex items-center justify-center">
                              <Music2 className="w-3.5 h-3.5 text-[#5B4F70]" />
                            </div>
                          )}
                          {/* Now-playing waveform overlay */}
                          {isCurrent && (
                            <div
                              className="absolute inset-0 flex items-end justify-center gap-px pb-1"
                              style={{ background: 'rgba(0,0,0,0.5)' }}
                            >
                              {[0, 1, 2, 3].map(b => (
                                <div
                                  key={b}
                                  className="w-0.5 rounded-full"
                                  style={{
                                    background: '#C084FC',
                                    height: `${40 + Math.random() * 40}%`,
                                    animation: `wavebar 0.6s ease-in-out ${b * 0.12}s infinite alternate`,
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Title + artist */}
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-xs font-semibold truncate leading-tight"
                            style={{ color: isCurrent ? '#C084FC' : 'white' }}
                          >
                            {title}
                          </p>
                          <p className="text-[10px] truncate mt-0.5" style={{ color: '#5B4F70' }}>
                            {artist}
                          </p>
                        </div>

                        {/* Vinyl / Crate save icon */}
                        <motion.div
                          className="flex-shrink-0 flex items-center justify-center"
                          style={{ width: 32, height: 32 }}
                          whileTap={{ scale: 0.75 }}
                          onClick={(e) => handleCrateTap(e, track)}
                        >
                          {isAddingThis ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[#C084FC]" />
                          ) : (
                            <Disc3
                              className="w-[18px] h-[18px]"
                              style={{
                                color: inCrate ? '#FFD700' : '#5B4F70',
                                filter: inCrate
                                  ? 'drop-shadow(0 0 3px rgba(255,215,0,0.5)) drop-shadow(0 0 6px rgba(255,215,0,0.25))'
                                  : 'none',
                                transition: 'color 0.3s ease, filter 0.3s ease',
                              }}
                            />
                          )}
                        </motion.div>

                        {/* Now playing badge */}
                        {isCurrent && (
                          <div className="flex-shrink-0 flex items-center gap-1.5 ml-1">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ background: '#9D00FF', boxShadow: '0 0 6px #9D00FF', animation: 'pulse 1.2s ease-in-out infinite' }}
                            />
                            <span
                              className="text-[9px] font-bold uppercase tracking-wider hidden sm:block"
                              style={{ color: '#9D00FF' }}
                            >
                              On Air
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <div
              className="flex-shrink-0 flex items-center justify-center py-2 gap-2"
              style={{ borderTop: '1px solid rgba(42,0,96,0.5)' }}
            >
              <span className="text-[9px] text-[#3B2F50] uppercase tracking-widest">
                {tracks.length} latest tracks &bull; Updated throughout the day
              </span>
            </div>
          </motion.div>

          {/* Waveform animation keyframes */}
          <style>{`
            @keyframes wavebar {
              from { transform: scaleY(0.4); }
              to   { transform: scaleY(1.0); }
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}
