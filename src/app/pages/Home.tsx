import { useState, useRef, useLayoutEffect } from 'react';
import { motion } from 'motion/react';
import { usePlayer } from '../context/PlayerContext';
import { useCrateSafe } from '../context/CrateContext';
import { TrackCard } from '../components/TrackCard';
import { MostPlayed } from '../components/MostPlayed';
import { Visualizer } from '../components/Visualizer';
import { SocialWidgets } from '../components/SocialWidgets';
import { GoldVinylRecord } from '../components/GoldVinylRecord';
import { Play, Radio, Loader2, RefreshCw, Share, Disc3 } from 'lucide-react';
import { formatArtistName } from '../utils/formatArtistName';
import { formatTrackTitle } from '../utils/formatTrackTitle';
import { ShareModal } from '../components/ShareModal';
import { getMaxResThumbnail, handleThumbnailError } from '../utils/getMaxResThumbnail';
import YouTubeIcon from '../../imports/YouTube';
import TikTokIcon from '../../imports/TikTok';
import Instagram230 from '../../imports/Instagram-230-21';
import svgTt from '../../imports/svg-in07bbw6xm';

// ── NowPlaying ────────────────────────────────────────────────────────────────

/** Strip featuring credits from a title — for compact mobile display only */
function stripFeaturing(title: string): string {
  // Remove "feat. X", "ft. X", "featuring X" and everything after
  // Also handles "(feat. X)" and "[ft. X]" wrapped variants
  let t = title;
  t = t.replace(/\s*[\(\[]\s*(feat\.?|ft\.?|featuring)\s+[^\)\]]*[\)\]]/gi, '');
  t = t.replace(/\s*(feat\.?|ft\.?|featuring)\s+.*/gi, '');
  return t.replace(/[\s\-–—|,]+$/, '').trim();
}

function NowPlaying() {
  const { currentTrack, isPlaying, togglePlay, playerReady, listenerCount, totalVisitors } = usePlayer();
  const crateCtx = useCrateSafe();
  const addToCrate = crateCtx?.addToCrate;
  const removeFromCrate = crateCtx?.removeFromCrate;
  const isInCrate = crateCtx?.isInCrate ?? (() => false);
  const is24k = crateCtx?.is24k ?? false;
  const addingIds = crateCtx?.addingIds ?? new Set<string>();
  const openPaywall = crateCtx?.openPaywall ?? (() => { });
  const isGuestAtLimit = crateCtx?.isGuestAtLimit ?? false;
  const videoId = currentTrack?.id.videoId || '';
  const thumb = getMaxResThumbnail(videoId);
  const [showShare, setShowShare] = useState(false);

  const inCrate = currentTrack ? isInCrate(currentTrack.id.videoId) : false;
  const isAdding = currentTrack ? addingIds.has(currentTrack.id.videoId) : false;

  const textMeasureRef = useRef<HTMLDivElement>(null);
  const [textWidth, setTextWidth] = useState<number | 'auto'>('auto');

  useLayoutEffect(() => {
    if (!textMeasureRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setTextWidth(entry.contentRect.width);
      }
    });
    observer.observe(textMeasureRef.current);
    return () => observer.disconnect();
  }, [currentTrack]);

  const handleCrate = () => {
    if (!currentTrack) return;
    if (inCrate) { removeFromCrate?.(currentTrack.id.videoId); }
    else if (!is24k && isGuestAtLimit) { openPaywall?.(); }
    else { addToCrate?.(currentTrack); }
  };

  return (
    <div
      className="relative rounded-3xl overflow-hidden p-2 md:p-8 mb-2 md:mb-8 transition-all duration-700"
      style={{
        background: 'linear-gradient(160deg, #140B28, #100820, #180B2E)',
        border: `1px solid ${inCrate && is24k ? 'rgba(191,149,63,0.3)' : 'rgba(140,60,240,0.2)'}`,
        boxShadow: '0 8px 48px rgba(100,0,200,0.18)',
      }}
    >
      {/* Background glow — shifts gold when current track is in crate */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none transition-all duration-700"
        style={{
          background: inCrate && is24k
            ? 'radial-gradient(ellipse at 30% 50%, #bf953f 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, #fcf6ba 0%, transparent 60%)'
            : 'radial-gradient(ellipse at 30% 50%, #9D00FF 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, #FF0080 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-2 md:gap-6">
        {/* Thumbnail — vinyl overlay when in crate */}
        <div className="relative flex-shrink-0">
          <div
            className="w-[50vw] h-[50vw] max-w-[200px] max-h-[200px] md:w-48 md:h-48 md:max-w-none md:max-h-none rounded-2xl overflow-hidden transition-all duration-500 mx-auto"
            style={{
              boxShadow: inCrate && is24k
                ? '0 0 0 3px #fcf6ba, 0 0 40px rgba(191,149,63,0.55), 0 0 80px rgba(191,149,63,0.25)'
                : 'none',
              background: 'transparent',
            }}
          >
            {thumb ? (
              <img src={thumb} alt="Now Playing" className="w-full h-full object-contain" style={{ background: 'transparent' }} onError={(e) => handleThumbnailError(e, videoId)} />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: '#0F0022' }}>
                <span className="text-6xl">{'\u{1F3B5}'}</span>
              </div>
            )}
            {/* Gold shimmer overlay */}
            {inCrate && is24k && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, transparent 35%, rgba(252,246,186,0.22) 50%, transparent 65%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmerSlide 2.5s linear infinite',
                }}
              />
            )}
          </div>


          {/* Floating vinyl record badge — bottom-right of album art (gold only) */}
          {currentTrack && is24k && inCrate && (
            <motion.div
              className="absolute -bottom-3 -right-3"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            >
              <GoldVinylRecord
                is24k={true}
                size={52}
                spinning={false}
              />
            </motion.div>
          )}
        </div>

        {/* Info + Controls */}
        <div className="flex-1 text-center md:text-left flex flex-col justify-center overflow-hidden">

          {/* DESKTOP LAYOUT (Horizontal) */}
          <div className="hidden md:flex flex-row items-end gap-2 w-full mb-4 max-w-full">
            {/* Animated outer container for text */}
            <div
              className="flex-shrink-0 overflow-hidden"
              style={{
                width: textWidth === 'auto' ? 'auto' : `${textWidth}px`,
                transition: 'width 0.35s ease',
              }}
            >
              {/* Inner measuring container */}
              <div ref={textMeasureRef} className="inline-block whitespace-nowrap pr-2">
                <div className="flex items-center gap-2 justify-start mb-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: '#FF2222',
                      animation: isPlaying ? 'pulse 1.1s ease-in-out infinite' : 'none',
                    }}
                  />
                  <span className="text-xs font-extrabold tracking-widest" style={{ color: '#FF3333', letterSpacing: '1.2px' }}>LIVE NOW</span>
                  {is24k && (
                    <span
                      className="ml-1 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: 'linear-gradient(90deg,#bf953f,#fcf6ba)', color: '#2a1000', animation: 'goldPulse 2s ease-in-out infinite' }}
                    >
                      24K
                    </span>
                  )}
                </div>

                <h1 className="text-lg md:text-3xl font-black text-white mb-0.5 leading-tight pr-2">
                  {currentTrack ? formatTrackTitle(currentTrack.snippet.title) : 'Jersey Club Radio'}
                </h1>
                <p className="font-semibold md:text-lg transition-colors duration-500" style={{ color: inCrate && is24k ? '#fcf6ba' : '#9D00FF' }}>
                  {formatArtistName(currentTrack?.snippet.channelTitle) || 'Loading tracks...'}
                </p>
              </div>
            </div>

            {/* Fluid Waveform Container (Takes remaining space natively) */}
            <div className="flex-1 flex justify-start overflow-hidden pr-4">
              <Visualizer isPlaying={isPlaying} barCount={200} height={50} fade className="w-full flex-1" />
            </div>
          </div>

          {/* MOBILE LAYOUT (Vertical Stack) */}
          <div className="md:hidden flex flex-col items-center mb-4 w-full">
            <div className="flex items-center gap-2 justify-center mb-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: '#FF2222',
                  animation: isPlaying ? 'pulse 1.1s ease-in-out infinite' : 'none',
                }}
              />
              <span className="text-xs font-extrabold tracking-widest" style={{ color: '#FF3333', letterSpacing: '1.2px' }}>LIVE NOW</span>
              {is24k && (
                <span
                  className="ml-1 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg,#bf953f,#fcf6ba)', color: '#2a1000', animation: 'goldPulse 2s ease-in-out infinite' }}
                >
                  24K
                </span>
              )}
            </div>

            <h1
              className="text-lg font-black text-white mb-0.5 leading-tight text-center w-full"
              style={{
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                maxWidth: 'calc(100vw - 140px)',
                margin: '0 auto',
              }}
            >
              {currentTrack
                ? stripFeaturing(formatTrackTitle(currentTrack.snippet.title, currentTrack.snippet.channelTitle))
                : 'Jersey Club Radio'}
            </h1>
            <p
              className="font-semibold mb-2 transition-colors duration-500 text-center w-full"
              style={{
                color: inCrate && is24k ? '#fcf6ba' : '#9D00FF',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                maxWidth: 'calc(100vw - 140px)',
                margin: '0 auto',
              }}
            >
              {formatArtistName(currentTrack?.snippet.channelTitle) || 'Loading tracks...'}
            </p>
          </div>

          {/* Wrapper to tightly fit buttons width on mobile so waveform aligns perfectly */}
          <div className="flex justify-center md:justify-start w-full">
            <div className="inline-flex flex-col items-stretch w-auto">

              {/* Mobile waveform — aligned exactly to the edges of the buttons below it */}
              <div className="md:hidden w-full mb-3 flex px-1">
                <Visualizer isPlaying={isPlaying} barCount={40} height={26} fade className="w-full justify-between" />
              </div>

              <div className="flex items-center justify-between gap-3 md:justify-start flex-wrap">
                <button
                  onClick={togglePlay}
                  disabled={!playerReady}
                  className="flex items-center gap-2 px-5 py-1.5 md:px-6 md:py-2.5 rounded-full font-bold text-white text-sm transition-all disabled:opacity-50"
                  style={{
                    background: isPlaying
                      ? 'linear-gradient(135deg, #FF0080, #9D00FF)'
                      : 'linear-gradient(135deg, #9D00FF, #FF0080)'
                  }}
                >
                  {!playerReady
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                    : isPlaying
                      ? <><span>{'\u23F8'}</span> Pause</>
                      : <><Play className="w-4 h-4" /> Tune In</>
                  }
                </button>

                {/* Crate drop button — hero-sized */}
                <motion.button
                  onClick={handleCrate}
                  disabled={!currentTrack}
                  whileTap={{ scale: 0.88 }}
                  title={inCrate ? 'Remove from crate' : 'Drop to crate'}
                  className="flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-full font-bold text-sm transition-all disabled:opacity-40"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    color: inCrate ? '#fcf6ba' : 'rgba(191,149,63,0.75)',
                  }}
                >
                  {isAdding ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {/* Mobile: 24K Gold Vinyl — pointer-events-none so clicks reach the button */}
                      <div className="md:hidden flex-shrink-0 overflow-visible pointer-events-none">
                        <GoldVinylRecord
                          is24k={inCrate || is24k}
                          size={34}
                          spinning={false}
                        />
                      </div>

                      {/* Desktop: disc icon + text */}
                      <Disc3
                        className="w-4 h-4 hidden md:block flex-shrink-0"
                        style={{ filter: inCrate ? 'drop-shadow(0 0 5px rgba(252,246,186,0.9))' : 'none' }}
                      />
                      <span className="hidden md:inline">
                        {inCrate ? (is24k ? '24K SAVED' : 'IN CRATE') : 'SAVE TO CRATE'}
                      </span>
                    </>
                  )}
                </motion.button>

                {/* Share button */}
                <button
                  onClick={() => currentTrack && setShowShare(true)}
                  disabled={!currentTrack}
                  className="flex items-center justify-center w-9 h-9 rounded-full transition-all active:scale-90 disabled:opacity-40 hover:bg-[#9D00FF]/15"
                  style={{ color: '#C084FC' }}
                  title="Share to Stories"
                >
                  <Share className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showShare && (
        <ShareModal
          track={currentTrack}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

// ── Home page ─────────────────────────────────────────────────────────────────
export function Home() {
  const { tracks, isLoading, isRefreshing, refreshTracks, playTrack } = usePlayer();

  const handlePlayAll = () => {
    if (tracks[0]) playTrack(tracks[0], tracks);
  };

  return (
    <div className="p-3 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 md:mb-6">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-white flex items-center gap-2">
            <Radio className="w-6 h-6 md:w-7 md:h-7 text-[#9D00FF]" />
            Jersey Club Radio
          </h1>
          <p
            className="text-[#C084FC] mt-0.5 md:mt-1 font-semibold ml-8 md:ml-9 text-[11px] md:text-[12px] uppercase"
            style={{ textShadow: '0 0 8px #9D00FF, 0 0 20px #9D00FF80, 0 0 40px #9D00FF40' }}
          >
            24/7 non-stop Jersey Club music
          </p>
          {/* Social icons — directly under tagline on both desktop and mobile */}
          <SocialWidgets variant="strip" className="ml-8 md:ml-9 mt-0.5 md:mt-1" />
        </div>

        {/* Right side: desktop social icons + refresh */}
        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center">
            <style>{`
              .premium-dock {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 6px;
                border-radius: 100px;
                background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
                backdrop-filter: blur(16px);
                border: 1px solid rgba(255,255,255,0.05);
                box-shadow: 
                  0 8px 32px -8px rgba(0,0,0,0.5),
                  inset 0 1px 1px rgba(255,255,255,0.1),
                  inset 0 -1px 1px rgba(0,0,0,0.5);
                transition: border-color 0.4s ease;
              }
              
              .premium-dock:hover {
                border-color: rgba(157, 0, 255, 0.4);
                box-shadow: 
                  0 8px 32px -8px rgba(0,0,0,0.6),
                  0 0 20px -5px rgba(157, 0, 255, 0.2),
                  inset 0 1px 1px rgba(255,255,255,0.15),
                  inset 0 -1px 1px rgba(0,0,0,0.5);
              }

              .dock-item {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 38px;
                height: 38px;
                border-radius: 50%;
                color: white;
                background: transparent;
                position: relative;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                text-decoration: none;
              }

              .dock-item::before {
                content: '';
                position: absolute;
                inset: 0;
                border-radius: inherit;
                background: linear-gradient(135deg, #9D00FF, #FF0080);
                opacity: 0;
                transform: scale(0.8);
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                z-index: 1;
              }

              .dock-item svg, .dock-item > div {
                position: relative;
                z-index: 2;
                transition: transform 0.3s ease, filter 0.3s ease;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
              }

              .dock-item:hover {
                transform: translateY(-2px);
              }

              .dock-item:hover::before {
                opacity: 1;
                transform: scale(1);
                box-shadow: 0 4px 20px rgba(157, 0, 255, 0.4);
              }
              
              .dock-item:hover svg, .dock-item:hover > div {
                filter: brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.2));
              }

              .dock-item:active {
                transform: translateY(0) scale(0.95);
              }
              
              .dock-divider {
                width: 1px;
                height: 24px;
                background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.15), transparent);
                margin: 0 4px;
              }

              .refresh-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 0 16px 0 12px;
                height: 38px;
                border-radius: 100px;
                background: linear-gradient(135deg, rgba(157, 0, 255, 0.15), rgba(255, 0, 128, 0.1));
                border: 1px solid rgba(157, 0, 255, 0.3);
                color: white;
                font-weight: 700;
                font-size: 13px;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                box-shadow: 0 0 15px rgba(157, 0, 255, 0);
              }

              .refresh-btn:hover:not(:disabled) {
                background: linear-gradient(135deg, #9D00FF, #FF0080);
                border-color: transparent;
                box-shadow: 0 4px 20px rgba(157, 0, 255, 0.4);
                transform: translateY(-2px);
              }

              .refresh-btn:active:not(:disabled) {
                transform: scale(0.96) translateY(0);
              }
              
              .refresh-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
              }
            `}</style>

            <div className="premium-dock">
              {/* X (Twitter) */}
              <a href="https://x.com/jerseyclubradio" target="_blank" rel="noopener noreferrer" title="X" className="dock-item">
                <svg viewBox="0 0 24 24" fill="white" style={{ width: 16, height: 16 }}>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* YouTube */}
              <a href="https://www.youtube.com/@Jerseyclubradio" target="_blank" rel="noopener noreferrer" title="YouTube" className="dock-item">
                <svg viewBox="0 0 24 24" fill="white" style={{ width: 18, height: 18 }}>
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>

              {/* TikTok */}
              <a href="https://www.tiktok.com/@jerseyclubradio" target="_blank" rel="noopener noreferrer" title="TikTok" className="dock-item">
                <svg viewBox="60 56 90 90" fill="none" style={{ width: 18, height: 18, overflow: 'visible' }}>
                  <path clipRule="evenodd" d={svgTt.p36b6c100} fill="#EE1D52" fillRule="evenodd" transform="translate(0.8 0.8)" opacity="1" />
                  <path clipRule="evenodd" d={svgTt.p329ca380} fill="#69C9D0" fillRule="evenodd" transform="translate(-0.8 -0.8)" opacity="1" />
                  <path clipRule="evenodd" d={svgTt.p42dc440} fill="white" fillRule="evenodd" />
                </svg>
              </a>

              {/* Instagram */}
              <a href="https://www.instagram.com/jerseyclubradio/" target="_blank" rel="noopener noreferrer" title="Instagram" className="dock-item">
                <div style={{ width: 20, height: 20, ['--fill-0' as string]: 'white' }}>
                  <Instagram230 />
                </div>
              </a>

              <div className="dock-divider" />

              <button
                onClick={refreshTracks}
                disabled={isRefreshing}
                className="refresh-btn"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile social strip — right below header, before Now Playing */}
      {/* removed — now inline under tagline */}

      {/* Now Playing */}
      <NowPlaying />

      {/* Two-column layout — same height for playlist and sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ alignItems: 'start' }}>
        {/* Playlist */}
        <div className="lg:col-span-2 flex flex-col rounded-xl" style={{ height: 'calc(100vh - 300px)', background: '#0A0716', border: '1px solid rgba(110,50,190,0.14)', borderRadius: '12px' }}>
          <div className="flex flex-col px-3 md:px-4 pt-3 md:pt-4 pb-1 md:pb-0 mb-2 md:mb-4">
            {/* Row 1: Title left, Play All right */}
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2 min-w-0 flex-1">

                <span className="truncate">Jersey Club Playlist</span>
              </h2>
              {tracks.length > 0 && (
                <button
                  onClick={handlePlayAll}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-white transition-all whitespace-nowrap shrink-0"
                  style={{ background: 'linear-gradient(135deg, #9D00FF, #FF0080)' }}
                >
                  <Play className="w-3.5 h-3.5" /> Play All
                </button>
              )}
            </div>
            {/* Row 2: "newest first" aligned under the "J" in Jersey — offset = icon width (~16px) + gap-2 (8px) */}
            <span
              className="text-[10px] font-semibold text-[#E0AAFF] animate-pulse whitespace-nowrap leading-none mt-1 pl-[3px] pr-[0px] py-[0px]"
              style={{ textShadow: '0 0 8px #9D00FF, 0 0 20px #9D00FF80, 0 0 40px #9D00FF40, 0 0 60px #9D00FF20' }}
            >
              {tracks.length} tracks &bull; curated playlist order
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Loader2 className="w-10 h-10 text-[#9D00FF] animate-spin" />
              <p className="text-[#7B6F90] text-sm">Fetching Jersey Club tracks...</p>
            </div>
          ) : tracks.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <span className="text-5xl">{'\u{1F3B5}'}</span>
              <p className="text-white font-bold text-lg">No tracks yet</p>
              <p className="text-[#5B4F70] text-sm">Click Refresh to load Jersey Club tracks from YouTube</p>
              <button
                onClick={refreshTracks}
                className="px-6 py-2.5 rounded-full font-bold text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #9D00FF, #FF0080)' }}
              >
                Load Tracks
              </button>
            </div>
          ) : (
            <div
              className="overflow-y-auto rounded-b-xl flex-1"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(140,60,255,0.22) transparent',
              }}
            >
              <div className="grid grid-cols-1 gap-2 pr-1 pb-4">
                {tracks.map((track, i) => (
                  <TrackCard key={track.id.videoId} track={track} trackList={tracks} index={i} variant="list" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Most Played sidebar — match playlist height, no scroll */}
        <div className="lg:col-span-1" style={{ height: 'calc(100vh - 300px)' }}>
          <MostPlayed />
        </div>
      </div>
    </div>
  );
}