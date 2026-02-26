import React, { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { X, Search, Music2, Radio, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatArtistName } from '../utils/formatArtistName';
import { formatTrackTitle } from '../utils/formatTrackTitle';
import { getMaxResThumbnail, handleThumbnailError } from '../utils/getMaxResThumbnail';

interface TrackBrowserProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TrackBrowser({ isOpen, onClose }: TrackBrowserProps) {
  const { tracks, currentTrack, playTrack, isLoading, isFetchingMore } = usePlayer();
  const [query, setQuery] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus search when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 250);
    } else {
      setQuery('');
    }
  }, [isOpen]);

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
                {isFetchingMore && (
                  <Loader2 className="w-3 h-3 text-[#9D00FF] animate-spin ml-1" />
                )}
                <span className="text-[10px] text-[#3B2F50] ml-1 font-mono">
                  {filtered.length} tracks
                </span>
              </div>

              {/* Search */}
              <div className="relative flex-1 max-w-sm mx-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5B4F70] pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search artist or title…"
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

            {/* ── Track list ───────────────────────────────────────────────── */}
            <div
              ref={scrollRef}
              className="overflow-y-auto flex-1"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A0060 transparent' }}
            >
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-6 h-6 text-[#9D00FF] animate-spin" />
                  <span className="text-[#5B4F70] text-xs uppercase tracking-wider">Tuning in…</span>
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
                          {isCurrent ? '▶' : i + 1}
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

            {/* ── Footer hint ──────────────────────────────────────────────── */}
            <div
              className="flex-shrink-0 flex items-center justify-center py-2 gap-2"
              style={{ borderTop: '1px solid rgba(42,0,96,0.5)' }}
            >
              <span className="text-[9px] text-[#2A0060] uppercase tracking-widest">
                Jersey Club Radio · 24/7 Live Stream
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