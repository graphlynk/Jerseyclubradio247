import React, { useState, useRef } from 'react';
import { usePlayer, usePlayerProgress } from '../context/PlayerContext';
import { useCrateSafe } from '../context/CrateContext';
import { GoldVinylRecord } from './GoldVinylRecord';
import { TrackBrowser } from './TrackBrowser';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat,
  Volume2, VolumeX, Volume1, Loader2, Disc3, ListMusic, Radio, Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Visualizer } from './Visualizer';
import { formatArtistName } from '../utils/formatArtistName';
import { formatTrackTitle } from '../utils/formatTrackTitle';
import { getMaxResThumbnail, handleThumbnailError } from '../utils/getMaxResThumbnail';

function formatTime(seconds: number) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + '\u2026' : str;
}

export function Player() {
  const {
    currentTrack, isPlaying, isShuffle, isRepeat,
    volume, playerReady, isFetchingMore,
    togglePlay, nextTrack, prevTrack,
    toggleShuffle, toggleRepeat,
    setVolume, seekTo, tracks, currentIndex,
    isRadioMode, backToLive, listenerCount, totalVisitors,
  } = usePlayer();

  const { progress, duration } = usePlayerProgress();
  const crateCtx = useCrateSafe();
  const addToCrate = crateCtx?.addToCrate;
  const removeFromCrate = crateCtx?.removeFromCrate;
  const isInCrate = crateCtx?.isInCrate ?? (() => false);
  const is24k = crateCtx?.is24k ?? false;
  const addingIds = crateCtx?.addingIds ?? new Set<string>();
  const openPaywall = crateCtx?.openPaywall ?? (() => { });
  const isGuestAtLimit = crateCtx?.isGuestAtLimit ?? false;

  const [dropParticles, setDropParticles] = useState<{ id: number; x: number }[]>([]);
  const particleId = useRef(0);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);

  const videoId = currentTrack?.id.videoId || '';
  const thumb = getMaxResThumbnail(videoId);
  const thumbHigh = thumb;
  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;
  const VolumeIcon = volume === 0 ? VolumeX : volume < 50 ? Volume1 : Volume2;

  const inCrate = currentTrack ? isInCrate(currentTrack.id.videoId) : false;
  const isAdding = currentTrack ? addingIds.has(currentTrack.id.videoId) : false;

  const crateColor = inCrate
    ? (is24k ? '#fcf6ba' : '#C084FC')
    : 'rgba(255,255,255,0.4)';

  const handleCrate = () => {
    if (!currentTrack) return;
    if (inCrate) {
      removeFromCrate?.(currentTrack.id.videoId);
    } else if (!is24k && isGuestAtLimit) {
      openPaywall();
    } else {
      // Fire drop particles
      const particles = Array.from({ length: 6 }, (_, i) => ({
        id: ++particleId.current,
        x: (i - 2.5) * 14,
      }));
      setDropParticles(prev => [...prev, ...particles]);
      setTimeout(() => setDropParticles(prev => prev.filter(p => !particles.find(q => q.id === p.id))), 800);
      addToCrate?.(currentTrack);
    }
  };

  return (
    <div
      className="fixed bottom-[44px] md:bottom-0 left-0 right-0 z-50 md:border-t md:border-[#2A0060] border-b-0 mb-0 pb-0"
      style={{ background: 'linear-gradient(to top, #06000F 0%, #0D001E 100%)' }}
    >
      {/* Progress bar */}
      <div
        className="relative h-1 w-full cursor-pointer group md:block hidden"
        style={{ background: '#1a003a' }}
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          seekTo(ratio * duration);
        }}
      >
        <div
          className="h-full relative"
          style={{
            width: `${progressPct}%`,
            background: inCrate && is24k
              ? 'linear-gradient(to right, #bf953f, #fcf6ba)'
              : 'linear-gradient(to right, #9D00FF, #FF0080)',
            transition: 'background 0.8s ease',
          }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 py-1.5 hidden md:block">
        {/* ── Desktop layout ───────────────────────────────────────────────── */}
        <div className="hidden md:flex items-center gap-3">
          {/* Track info */}
          <div className="flex items-center gap-3 w-[280px] flex-shrink-0">
            {thumb ? (
              <div
                className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 transition-all duration-500"
              >
                <img src={thumb} alt="cover" className="w-full h-full object-contain" style={{ background: 'transparent' }} onError={(e) => handleThumbnailError(e, videoId)} />



                {/* Gold shimmer overlay when saved + 24k */}
                {inCrate && is24k && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(135deg, transparent 40%, rgba(252,246,186,0.25) 50%, transparent 60%)', animation: 'shimmerSlide 2s linear infinite' }}
                  />
                )}
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-[#1a003a] flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">&#127925;</span>
              </div>
            )}
            <div className="min-w-0">
              {/* LIVE badge or MY PICK badge */}
              {isPlaying && isRadioMode && (
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: '#FF2D55', boxShadow: '0 0 5px #FF2D55', animation: 'pulse 1s ease-in-out infinite' }}
                  />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#FF2D55]">Live</span>
                </div>
              )}
              {isPlaying && !isRadioMode && (
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: '#C084FC', boxShadow: '0 0 5px #C084FC' }}
                  />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#C084FC]">My Pick</span>
                  <button
                    onClick={backToLive}
                    className="text-[9px] font-bold uppercase tracking-wider ml-1 transition-colors hover:text-[#FF2D55]"
                    style={{ color: '#5B4F70' }}
                  >
                    &#xb7; Back to LIVE
                  </button>
                </div>
              )}
              {!isPlaying && !currentTrack && (
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Radio className="w-3 h-3 text-[#5B4F70]" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#5B4F70]">Jersey Club Radio</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-sm font-bold text-white truncate leading-tight min-w-0 max-w-[calc(100vw-160px)] md:max-w-none">
                  {currentTrack
                    ? formatTrackTitle(currentTrack.snippet.title, currentTrack.snippet.channelTitle)
                    : playerReady ? 'Tuning in\u2026' : 'Loading\u2026'}
                </p>
                <motion.div
                  animate={inCrate ? { rotate: [0, -15, 15, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className="flex-shrink-0"
                >

                </motion.div>
              </div>
              <p className="text-xs text-[#C084FC] truncate" style={{ textShadow: '0 0 6px #C084FC, 0 0 12px #C084FC, 0 0 24px #E0AAFF' }}>
                {formatArtistName(currentTrack?.snippet.channelTitle) || 'Jersey Club Radio'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="flex items-center gap-4">
              <button onClick={toggleShuffle} className={`transition-colors ${isShuffle ? 'text-[#9D00FF]' : 'text-[#5B4F70] hover:text-white'}`} title="Shuffle">
                <Shuffle className="w-4 h-4" />
              </button>
              <button onClick={prevTrack} className="text-[#9B8FB0] hover:text-white transition-colors">
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={togglePlay}
                disabled={!playerReady}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${playerReady
                  ? 'bg-[#9D00FF] hover:bg-[#B030FF] shadow-[0_0_16px_rgba(157,0,255,0.5)] hover:shadow-[0_0_24px_rgba(157,0,255,0.7)] active:scale-95'
                  : 'bg-[#2a0060] cursor-not-allowed'
                  }`}
              >
                {!playerReady ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : isPlaying ? <Pause className="w-4 h-4 text-white" />
                    : <Play className="w-4 h-4 text-white ml-0.5" />}
              </button>
              <button onClick={nextTrack} className="text-[#9B8FB0] hover:text-white transition-colors">
                <SkipForward className="w-5 h-5" />
              </button>
              <button onClick={toggleRepeat} className={`transition-colors ${isRepeat ? 'text-[#9D00FF]' : 'text-[#5B4F70] hover:text-white'}`} title="Repeat">
                <Repeat className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[#5B4F70] font-mono">
              <span>{formatTime(progress)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
              {isFetchingMore && (
                <span className="flex items-center gap-1 text-[#9D00FF] ml-1">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  <span>loading more</span>
                </span>
              )}
            </div>
          </div>

          {/* Right: Crate + Browse + Visualizer + Volume */}
          <div className="flex items-center gap-3 w-[280px] justify-end flex-shrink-0">
            {/* Crate save button */}
            <div className="relative">
              <AnimatePresence>
                {dropParticles.map(p => (
                  <motion.div
                    key={p.id}
                    className="absolute pointer-events-none"
                    style={{ left: `calc(50% + ${p.x}px)`, bottom: 0, width: 5, height: 5, borderRadius: '50%', background: is24k ? '#fcf6ba' : '#C084FC' }}
                    initial={{ y: 0, opacity: 1, scale: 1 }}
                    animate={{ y: -28, opacity: 0, scale: 0.4 }}
                    transition={{ duration: 0.65, ease: 'easeOut' }}
                  />
                ))}
              </AnimatePresence>

            </div>

            {/* Browse Tracks button */}
            <button
              onClick={() => setIsBrowserOpen(true)}
              title="Browse tracks"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all hover:scale-105 active:scale-95"
              style={{
                background: isBrowserOpen ? 'rgba(157,0,255,0.25)' : 'rgba(26,0,58,0.8)',
                border: `1px solid ${isBrowserOpen ? 'rgba(157,0,255,0.7)' : 'rgba(42,0,96,0.8)'}`,
                color: isBrowserOpen ? '#C084FC' : '#5B4F70',
              }}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider hidden xl:block">Browse</span>
            </button>

            <Visualizer isPlaying={isPlaying} barCount={20} height={36} className="hidden md:flex" />

            <div className="flex items-center gap-2">
              <button onClick={() => setVolume(volume === 0 ? 80 : 0)} className="text-[#5B4F70] hover:text-white transition-colors">
                <VolumeIcon className="w-4 h-4" />
              </button>
              <input
                type="range" min={0} max={100} value={volume}
                onChange={e => setVolume(Number(e.target.value))}
                className="w-20 accent-[#9D00FF] cursor-pointer"
              />
            </div>
            <div className="hidden lg:block text-[10px] text-[#3B2F50] whitespace-nowrap">
              {currentIndex + 1} / {tracks.length}
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile layout ────────────────────────────────────────────────── */}
      <div className="md:hidden flex flex-col">
        {/* Entire mobile player container with glassmorphism */}
        <div
          className="flex flex-col"
          style={{
            maxHeight: 130,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            background: 'linear-gradient(to top, rgba(6,0,15,0.97) 0%, rgba(13,0,30,0.94) 100%)',
          }}
        >
          {/* Row 1: Track info — art | title+subtitle | heart + play/pause */}
          <div className="flex items-center gap-3" style={{ padding: '8px 12px 6px' }}>
            {/* Album art 48×48, rounded 8px */}
            {thumb ? (
              <div
                className="relative flex-shrink-0 overflow-hidden transition-all duration-500"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  backgroundColor: 'transparent',
                }}
              >
                <img
                  src={thumb}
                  alt="cover"
                  className="w-full h-full"
                  style={{
                    objectFit: 'contain',
                    objectPosition: 'center',
                    borderRadius: 8,
                    background: 'transparent',
                  }}
                  onError={(e) => handleThumbnailError(e, videoId)}
                />
                {inCrate && is24k && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(135deg, transparent 40%, rgba(252,246,186,0.25) 50%, transparent 60%)',
                      animation: 'shimmerSlide 2s linear infinite',
                    }}
                  />
                )}
              </div>
            ) : (
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{ width: 48, height: 48, borderRadius: 8, background: '#1a003a' }}
              >
                <span className="text-xl">&#127925;</span>
              </div>
            )}

            {/* Title + Subtitle stacked — flex:1 min-w-0 */}
            <div className="flex-1 min-w-0">
              <p
                className="font-bold text-white truncate"
                style={{ fontSize: 14, lineHeight: '19px' }}
              >
                {currentTrack
                  ? formatTrackTitle(currentTrack.snippet.title, currentTrack.snippet.channelTitle)
                  : playerReady ? 'Tuning in\u2026' : 'Loading\u2026'}
              </p>
              <p
                className="truncate"
                style={{
                  fontSize: 11,
                  lineHeight: '16px',
                  marginTop: 3,
                  color: '#8B7FA0',
                }}
              >
                {formatArtistName(currentTrack?.snippet.channelTitle) || 'Jersey Club Radio'}
              </p>
            </div>

            {/* Right actions — heart/like + play/pause */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Heart / Crate save */}
              <div className="relative">
                <AnimatePresence>
                  {dropParticles.map(p => (
                    <motion.div
                      key={p.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: `calc(50% + ${p.x}px)`, bottom: '100%',
                        width: 4, height: 4, borderRadius: '50%',
                        background: is24k ? '#fcf6ba' : '#C084FC',
                      }}
                      initial={{ y: 0, opacity: 1, scale: 1 }}
                      animate={{ y: -16, opacity: 0, scale: 0.3 }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  ))}
                </AnimatePresence>
                <motion.button
                  onClick={handleCrate}
                  whileTap={{ scale: 0.8 }}
                  className="flex items-center justify-center transition-colors"
                  style={{ width: 36, height: 36 }}
                >
                  {isAdding ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#C084FC]" />
                  ) : (
                    null
                  )}
                </motion.button>
              </div>

              {/* Play / Pause */}
              <motion.button
                onClick={togglePlay}
                disabled={!playerReady}
                whileTap={playerReady ? { scale: 0.88 } : undefined}
                className="flex items-center justify-center"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: playerReady
                    ? 'linear-gradient(145deg, #B030FF 0%, #9D00FF 50%, #7B00CC 100%)'
                    : '#2a0060',
                  boxShadow: playerReady ? '0 0 12px rgba(157,0,255,0.4)' : 'none',
                  cursor: playerReady ? 'pointer' : 'not-allowed',
                }}
              >
                {!playerReady
                  ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : isPlaying
                    ? <Pause className="w-4 h-4 text-white" />
                    : <Play className="w-4 h-4 text-white ml-0.5" />}
              </motion.button>
            </div>
          </div>

          {/* Row 2: Progress bar with timestamps */}
          <div className="px-3" style={{ paddingTop: 2, paddingBottom: 2 }}>
            <div
              className="relative w-full cursor-pointer group"
              style={{ height: 3, borderRadius: 2, background: 'rgba(157,0,255,0.1)' }}
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = (e.clientX - rect.left) / rect.width;
                seekTo(ratio * duration);
              }}
            >
              <div
                className="h-full relative"
                style={{
                  width: `${progressPct}%`,
                  borderRadius: 2,
                  background: inCrate && is24k
                    ? 'linear-gradient(to right, #bf953f, #fcf6ba)'
                    : 'linear-gradient(to right, #9D00FF, #FF0080)',
                  transition: 'background 0.8s ease',
                }}
              >
                <div
                  className="absolute right-0 top-1/2 rounded-full opacity-0 group-active:opacity-100 transition-opacity"
                  style={{
                    width: 10,
                    height: 10,
                    background: '#fff',
                    boxShadow: '0 0 6px rgba(157,0,255,0.6)',
                    transform: 'translate(50%, -50%)',
                  }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between" style={{ marginTop: 2 }}>
              <span className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{formatTime(progress)}</span>
              <span className="font-mono" style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Row 3: Controls — shuffle, prev, next, repeat (no play here) */}
          <div className="flex items-center justify-evenly" style={{ padding: '2px 24px 8px' }}>
            <motion.button
              onClick={toggleShuffle}
              whileTap={{ scale: 0.85 }}
              className="p-1.5 transition-colors"
              style={{ color: isShuffle ? '#FF0080' : '#5B4F70' }}
            >
              <Shuffle style={{ width: 18, height: 18 }} />
            </motion.button>
            <motion.button
              onClick={prevTrack}
              whileTap={{ scale: 0.85 }}
              className="p-1.5 transition-colors active:text-white"
              style={{ color: '#5B4F70' }}
            >
              <SkipBack style={{ width: 20, height: 20 }} />
            </motion.button>
            <motion.button
              onClick={nextTrack}
              whileTap={{ scale: 0.85 }}
              className="p-1.5 transition-colors active:text-white"
              style={{ color: '#5B4F70' }}
            >
              <SkipForward style={{ width: 20, height: 20 }} />
            </motion.button>
            <motion.button
              onClick={toggleRepeat}
              whileTap={{ scale: 0.85 }}
              className="p-1.5 transition-colors"
              style={{ color: isRepeat ? '#FF0080' : '#5B4F70' }}
            >
              <Repeat style={{ width: 18, height: 18 }} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Track Browser panel */}
      <TrackBrowser isOpen={isBrowserOpen} onClose={() => setIsBrowserOpen(false)} />
    </div>
  );
}