import React, { useState, useRef } from 'react';
import { usePlayer, usePlayerProgress } from '../context/PlayerContext';
import { useCrateSafe } from '../context/CrateContext';
import { GoldVinylRecord } from './GoldVinylRecord';
import { TrackBrowser } from './TrackBrowser';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat,
  Volume2, VolumeX, Volume1, Loader2, Disc3, ListMusic, Radio
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
  const openPaywall = crateCtx?.openPaywall ?? (() => {});
  const isGuestAtLimit = crateCtx?.isGuestAtLimit ?? false;

  const [dropParticles, setDropParticles] = useState<{ id: number; x: number }[]>([]);
  const particleId = useRef(0);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);

  const videoId = currentTrack?.id.videoId || '';
  const thumb = videoId ? getMaxResThumbnail(videoId) : currentTrack?.snippet.thumbnails.medium?.url || currentTrack?.snippet.thumbnails.default?.url;
  const thumbHigh = videoId ? getMaxResThumbnail(videoId) : currentTrack?.snippet.thumbnails.high?.url || thumb;
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
      removeFromCrate(currentTrack.id.videoId);
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
      addToCrate(currentTrack);
    }
  };

  return (
    <div
      className="fixed bottom-[44px] md:bottom-0 left-0 right-0 z-50 border-t border-[#2A0060] border-b-0 mb-0 pb-0"
      style={{ background: 'linear-gradient(to top, #06000F 0%, #0D001E 100%)' }}
    >
      {/* Progress bar */}
      <div
        className="relative h-1 w-full cursor-pointer group"
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

      <div className="max-w-screen-2xl mx-auto px-4 py-1.5">
        {/* ── Desktop layout ───────────────────────────────────────────────── */}
        <div className="hidden md:flex items-center gap-3">
          {/* Track info */}
          <div className="flex items-center gap-3 w-[280px] flex-shrink-0">
            {thumb ? (
              <div
                className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 transition-all duration-500"
                style={{
                  ring: 'none',
                  boxShadow: inCrate
                    ? `0 0 0 2px ${is24k ? '#fcf6ba' : '#C084FC'}, 0 0 14px ${is24k ? 'rgba(191,149,63,0.6)' : 'rgba(192,132,252,0.5)'}`
                    : '0 0 0 1px rgba(157,0,255,0.5)',
                }}
              >
                <img src={thumb} alt="cover" className="w-full h-full object-cover" onError={(e) => handleThumbnailError(e, videoId)} />
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
                  <span className="text-[9px] text-[#3B2F50] uppercase tracking-wider hidden lg:block">&#xb7; Jersey Club Radio</span>
                  {listenerCount > 0 && (
                    <span className="text-[9px] text-[#5B4F70] hidden lg:block">&#xb7; {listenerCount} listening</span>
                  )}
                  {totalVisitors > 0 && (
                    null
                  )}
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
                <p className="text-sm font-bold text-white truncate leading-tight uppercase min-w-0">
                  {currentTrack
                    ? truncate(formatTrackTitle(currentTrack.snippet.title, currentTrack.snippet.channelTitle), 35)
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
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  playerReady
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

        {/* ── Mobile layout ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5 md:hidden relative overflow-hidden">
          {thumbHigh && (
            <div className="absolute inset-0 -mx-4 -my-1.5">
              <img src={thumbHigh} alt="" className="w-full h-full object-cover" onError={(e) => handleThumbnailError(e, videoId)} style={{ filter: 'blur(2px) brightness(0.35) saturate(1.4)' }} />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(6,0,15,0.5) 0%, rgba(6,0,15,0.7) 100%)' }} />
              <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse at center, #9D00FF 0%, transparent 70%)' }} />
              {/* Gold tint when saved + 24k */}
              {inCrate && is24k && (
                <div className="absolute inset-0 opacity-15" style={{ background: 'radial-gradient(ellipse at center, #fcf6ba 0%, transparent 70%)' }} />
              )}
            </div>
          )}

          {/* Row 1: Track info with thumbnail */}
          <div className="flex items-center gap-2.5 relative z-10">
            {thumb ? (
              <div
                className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 shadow-lg transition-all duration-500"
                style={{
                  boxShadow: inCrate
                    ? `0 0 0 1.5px ${is24k ? '#fcf6ba' : '#C084FC'}, 0 0 10px ${is24k ? 'rgba(191,149,63,0.5)' : 'rgba(192,132,252,0.4)'}`
                    : '0 0 0 1px rgba(255,255,255,0.2)',
                }}
              >
                <img src={thumb} alt="cover" className="w-full h-full object-cover" onError={(e) => handleThumbnailError(e, videoId)} />
                {/* Gold shimmer overlay when saved + 24k */}
                {inCrate && is24k && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(135deg, transparent 40%, rgba(252,246,186,0.25) 50%, transparent 60%)', animation: 'shimmerSlide 2s linear infinite' }}
                  />
                )}
              </div>
            ) : (
              <div className="w-9 h-9 rounded-lg bg-[#1a003a] flex items-center justify-center flex-shrink-0">
                <span className="text-base">&#127925;</span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              {/* Mobile LIVE badge or MY PICK badge */}
              {isPlaying && isRadioMode && (
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#FF2D55', animation: 'pulse 1s ease-in-out infinite' }} />
                  <span className="text-[8px] font-bold uppercase tracking-widest text-[#FF2D55]">Live</span>
                  {listenerCount > 0 && (
                    <span className="text-[8px] text-[#5B4F70]">&#xb7; {listenerCount}</span>
                  )}
                  {totalVisitors > 0 && (
                    <span className="text-[8px] text-[#3B2F50]">&#xb7; {totalVisitors.toLocaleString()}</span>
                  )}
                </div>
              )}
              {isPlaying && !isRadioMode && (
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: '#C084FC' }} />
                  <span className="text-[8px] font-bold uppercase tracking-widest text-[#C084FC]">My Pick</span>
                  <button
                    onClick={backToLive}
                    className="text-[8px] font-bold uppercase tracking-wider ml-1 transition-colors active:text-[#FF2D55]"
                    style={{ color: '#5B4F70' }}
                  >
                    &#xb7; LIVE
                  </button>
                </div>
              )}
              <p className="text-xs font-bold text-white truncate leading-tight uppercase drop-shadow-lg">
                {currentTrack
                  ? truncate(formatTrackTitle(currentTrack.snippet.title, currentTrack.snippet.channelTitle), 40)
                  : playerReady ? 'Tuning in\u2026' : 'Loading\u2026'}
              </p>
              <p className="text-[10px] text-[#C084FC] truncate drop-shadow-lg" style={{ textShadow: '0 0 6px #C084FC, 0 0 12px #C084FC, 0 0 24px #E0AAFF' }}>
                {formatArtistName(currentTrack?.snippet.channelTitle) || 'Jersey Club Radio'}
              </p>
            </div>
          </div>

          {/* Row 2: Controls */}
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleShuffle}
                className={`p-1 transition-colors ${isShuffle ? 'text-[#9D00FF]' : 'text-white/25'}`}
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
              <button onClick={prevTrack} className="text-white/50 active:text-white transition-colors p-1">
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={togglePlay}
                disabled={!playerReady}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  playerReady
                    ? 'bg-[#9D00FF] hover:bg-[#B030FF] shadow-[0_0_16px_rgba(157,0,255,0.5)] active:scale-95'
                    : 'bg-[#2a0060] cursor-not-allowed'
                }`}
              >
                {!playerReady ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : isPlaying ? <Pause className="w-4 h-4 text-white" />
                  : <Play className="w-4 h-4 text-white ml-0.5" />}
              </button>
              <button onClick={nextTrack} className="text-white/50 active:text-white transition-colors p-1">
                <SkipForward className="w-4 h-4" />
              </button>
              <button
                onClick={toggleRepeat}
                className={`p-1 transition-colors ${isRepeat ? 'text-[#9D00FF]' : 'text-white/25'}`}
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Crate save */}
              <div className="relative">
                <AnimatePresence>
                  {dropParticles.map(p => (
                    <motion.div
                      key={p.id}
                      className="absolute pointer-events-none"
                      style={{
                        left: `calc(50% + ${p.x}px)`, bottom: '100%',
                        width: 5, height: 5, borderRadius: '50%',
                        background: is24k ? '#fcf6ba' : '#C084FC',
                      }}
                      initial={{ y: 0, opacity: 1, scale: 1 }}
                      animate={{ y: -22, opacity: 0, scale: 0.3 }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  ))}
                </AnimatePresence>
                <motion.button
                  onClick={handleCrate}
                  title={inCrate ? 'Remove from crate' : 'Save to crate'}
                  whileTap={{ scale: 0.85 }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    background: inCrate ? 'transparent' : 'rgba(0,0,0,0.3)',
                    border: inCrate ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {isAdding
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C084FC]" />
                    : inCrate
                      ? (
                        <div className="pointer-events-none">
                          <GoldVinylRecord
                            is24k={inCrate || is24k}
                            size={26}
                            spinning={false}
                          />
                        </div>
                      )
                      : <Disc3 className="w-3.5 h-3.5" style={{ color: crateColor }} />
                  }
                </motion.button>
              </div>

              {/* Browse */}
              <button
                onClick={() => setIsBrowserOpen(true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: isBrowserOpen ? '#C084FC' : 'rgba(255,255,255,0.4)',
                }}
              >
                <ListMusic className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Row 3: Time + Volume */}
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] text-white/40 font-mono drop-shadow">
              {formatTime(progress)} / {formatTime(duration)}
            </span>
            <button
              onClick={() => setVolume(volume === 0 ? 80 : 0)}
              className="flex items-center justify-center w-7 h-7 rounded-full transition-all active:scale-95"
              style={{
                background: volume === 0 ? 'rgba(255,0,128,0.18)' : 'rgba(157,0,255,0.18)',
                boxShadow: volume === 0 ? '0 0 10px rgba(255,0,128,0.35)' : '0 0 10px rgba(157,0,255,0.35)',
              }}
            >
              <VolumeIcon className="w-3.5 h-3.5" style={{ color: volume === 0 ? '#FF0080' : '#C084FC' }} />
            </button>
          </div>
        </div>
      </div>

      {/* Track Browser panel */}
      <TrackBrowser isOpen={isBrowserOpen} onClose={() => setIsBrowserOpen(false)} />
    </div>
  );
}
