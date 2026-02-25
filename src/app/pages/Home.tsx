import { useMemo, useState } from 'react';
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
import { ShareModal } from '../components/ShareModal';
import { getMaxResThumbnail, handleThumbnailError } from '../utils/getMaxResThumbnail';
import YouTubeIcon from '../../imports/YouTube';
import TikTokIcon from '../../imports/TikTok';
import Instagram230 from '../../imports/Instagram-230-21';
import svgTt from '../../imports/svg-in07bbw6xm';

// ── NowPlaying ────────────────────────────────────────────────────────────────
function NowPlaying() {
  const { currentTrack, isPlaying, togglePlay, playerReady, listenerCount, totalVisitors } = usePlayer();
  const crateCtx = useCrateSafe();
  const addToCrate = crateCtx?.addToCrate;
  const removeFromCrate = crateCtx?.removeFromCrate;
  const isInCrate = crateCtx?.isInCrate ?? (() => false);
  const is24k = crateCtx?.is24k ?? false;
  const addingIds = crateCtx?.addingIds ?? new Set<string>();
  const openPaywall = crateCtx?.openPaywall ?? (() => {});
  const isGuestAtLimit = crateCtx?.isGuestAtLimit ?? false;
  const videoId = currentTrack?.id.videoId || '';
  const thumb = videoId ? getMaxResThumbnail(videoId) : currentTrack?.snippet.thumbnails.high?.url;
  const [showShare, setShowShare] = useState(false);

  const inCrate = currentTrack ? isInCrate(currentTrack.id.videoId) : false;
  const isAdding = currentTrack ? addingIds.has(currentTrack.id.videoId) : false;

  const handleCrate = () => {
    if (!currentTrack) return;
    if (inCrate) { removeFromCrate(currentTrack.id.videoId); }
    else if (!is24k && isGuestAtLimit) { openPaywall(); }
    else { addToCrate(currentTrack); }
  };

  return (
    <div
      className="relative rounded-3xl overflow-hidden p-2 md:p-8 mb-2 md:mb-8 transition-all duration-700"
      style={{
        background: 'linear-gradient(135deg, #1a003a 0%, #0D001E 50%, #160035 100%)',
        border: `1px solid ${inCrate && is24k ? 'rgba(191,149,63,0.3)' : 'rgba(157,0,255,0.15)'}`,
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
                : isPlaying
                ? '0 0 40px rgba(157,0,255,0.5), 0 0 80px rgba(157,0,255,0.2)'
                : '0 0 20px rgba(0,0,0,0.5)',
              background: '#0F0022',
            }}
          >
            {thumb ? (
              <img src={thumb} alt="Now Playing" className="w-full h-full object-cover scale-[1.15]" onError={(e) => handleThumbnailError(e, videoId)} />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: '#0F0022' }}>
                <span className="text-6xl">🎵</span>
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

          {/* Pulsing border ring */}
          {isPlaying && (
            <div
              className="absolute -inset-1 rounded-2xl opacity-50 pointer-events-none animate-pulse"
              style={{
                border: `2px solid ${inCrate && is24k ? '#fcf6ba' : '#9D00FF'}`,
                boxShadow: `0 0 20px ${inCrate && is24k ? '#bf953f' : '#9D00FF'}`,
              }}
            />
          )}

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
        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center gap-2 justify-center md:justify-start mb-1 md:mb-3">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-400 tracking-widest">LIVE NOW</span>
            {listenerCount > 0 && (
              <span className="text-[10px] font-semibold text-[#5B4F70]">• {listenerCount} listening</span>
            )}
            {totalVisitors > 0 && (
              <span className="text-[10px] font-semibold text-[#3B2F50]">• {totalVisitors.toLocaleString()} visited</span>
            )}
            <span
              className="text-xs text-[#C084FC]"
              style={{ textShadow: '0 0 6px #C084FC, 0 0 12px #C084FC, 0 0 24px #E0AAFF' }}
            >
              • 24/7 Jersey Club Radio
            </span>
            {/* 24k badge inline */}
            {is24k && (
              <span
                className="ml-1 text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: 'linear-gradient(90deg,#bf953f,#fcf6ba)', color: '#2a1000', animation: 'goldPulse 2s ease-in-out infinite' }}
              >
                24K
              </span>
            )}
          </div>

          <h1 className="text-lg md:text-2xl font-black text-white mb-0.5 md:mb-1 leading-tight uppercase">
            {currentTrack ? currentTrack.snippet.title : 'Jersey Club Radio'}
          </h1>
          <p className="font-semibold mb-1 md:mb-4 transition-colors duration-500" style={{ color: inCrate && is24k ? '#fcf6ba' : '#9D00FF' }}>
            {formatArtistName(currentTrack?.snippet.channelTitle) || 'Loading tracks...'}
          </p>

          <Visualizer isPlaying={isPlaying} barCount={40} height={50} className="mb-1 md:mb-4 justify-center md:justify-start hidden md:flex" />
          <Visualizer isPlaying={isPlaying} barCount={30} height={28} className="mb-1 justify-center md:hidden" />

          <div className="flex items-center gap-3 justify-center md:justify-start flex-wrap">
            <button
              onClick={togglePlay}
              disabled={!playerReady}
              className="flex items-center gap-2 px-5 py-1.5 md:px-6 md:py-2.5 rounded-full font-bold text-white text-sm transition-all disabled:opacity-50"
              style={{
                background: isPlaying
                  ? 'linear-gradient(135deg, #FF0080, #9D00FF)'
                  : 'linear-gradient(135deg, #9D00FF, #FF0080)',
                boxShadow: '0 0 20px rgba(157,0,255,0.4)',
              }}
            >
              {!playerReady
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading...</>
                : isPlaying
                ? <><span>⏸</span> Pause</>
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

  const sortedTracks = useMemo(() => {
    return [...tracks].sort(
      (a, b) => new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime(),
    );
  }, [tracks]);

  const handlePlayAll = () => {
    if (sortedTracks[0]) playTrack(sortedTracks[0], sortedTracks);
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
          {/* Desktop compact social icons — hidden on mobile (mobile gets the strip below) */}
          <div className="hidden md:flex items-center gap-2">

            <style>{`
              .gs-link {
                display: flex;
                border-radius: 15px;
                text-decoration: none;
                cursor: pointer;
                transition: transform 0.22s cubic-bezier(.34,1.56,.64,1), filter 0.22s ease;
              }
              .gs-link:hover  { transform: scale(1.11) translateY(-3px); filter: brightness(1.15); }
              .gs-link:active { transform: scale(0.91); transition-duration: 0.08s; }

              .gs-tile {
                width: 44px;
                height: 44px;
                border-radius: 13px;
                position: relative;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(14, 7, 26, 0.90);
                border: 1px solid rgba(255,255,255,0.07);
                box-shadow:
                  inset 0 1px 0 rgba(255,255,255,0.09),
                  inset 0 -1px 0 rgba(0,0,0,0.35),
                  0 6px 20px rgba(0,0,0,0.55);
                transition: box-shadow 0.22s ease;
              }

              .gs-tile::after {
                content: '';
                position: absolute;
                top: 0; left: 0; right: 0;
                height: 42%;
                background: linear-gradient(160deg,
                  rgba(255,255,255,0.10) 0%,
                  rgba(255,255,255,0.03) 60%,
                  transparent 100%);
                border-radius: 13px 13px 0 0;
                pointer-events: none;
                z-index: 3;
              }

              .gs-glow {
                position: absolute;
                bottom: -8px;
                left: 50%;
                transform: translateX(-50%);
                width: 85%;
                height: 65%;
                border-radius: 50%;
                filter: blur(9px);
                z-index: 1;
                opacity: 0.82;
                transition: opacity 0.22s ease, filter 0.22s ease;
              }
              .gs-link:hover .gs-glow { opacity: 1; filter: blur(11px); }

              .gs-glow-yt { background: radial-gradient(ellipse, rgba(255,30,0,0.22) 0%, rgba(200,0,0,0.18) 50%, transparent 80%); }
              .gs-glow-tt { background: radial-gradient(ellipse, rgba(105,0,220,0.22) 0%, rgba(60,0,160,0.18) 50%, transparent 80%); }
              .gs-glow-ig { background: radial-gradient(ellipse, rgba(240,100,40,0.22) 10%, rgba(200,40,130,0.18) 55%, transparent 80%); }
              .gs-glow-x  { background: radial-gradient(ellipse, rgba(255,255,255,0.18) 0%, rgba(180,180,180,0.10) 55%, transparent 80%); }
            `}</style>

            {/* X (Twitter) */}
            <a href="https://x.com/jerseyclubradio" target="_blank" rel="noopener noreferrer" title="X" className="gs-link">
              <div className="gs-tile gs-tile-x" style={{ padding: 0, background: 'transparent', border: 'none', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="gs-glow gs-glow-x" />
                <svg viewBox="0 0 24 24" fill="white" style={{ position: 'relative', zIndex: 2, width: 22, height: 22 }}>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
            </a>

            {/* YouTube */}
            <a href="https://www.youtube.com/@Jerseyclubradio" target="_blank" rel="noopener noreferrer" title="YouTube" className="gs-link">
              <div className="gs-tile gs-tile-yt" style={{ padding: 0, background: 'transparent', border: 'none', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="gs-glow gs-glow-yt" />
                <svg viewBox="0 0 24 24" fill="white" style={{ position: 'relative', zIndex: 2, width: 26, height: 26 }}>
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </div>
            </a>

            {/* TikTok */}
            <a href="https://www.tiktok.com/@jerseyclubradio" target="_blank" rel="noopener noreferrer" title="TikTok" className="gs-link">
              <div className="gs-tile gs-tile-tt" style={{ padding: 0, background: 'transparent', border: 'none', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="gs-glow gs-glow-tt" />
                <svg viewBox="60 56 90 90" fill="none" style={{ position: 'relative', zIndex: 2, width: 26, height: 26, overflow: 'visible' }}>
                  <path clipRule="evenodd" d={svgTt.p36b6c100} fill="#EE1D52" fillRule="evenodd" transform="translate(0.8 0.8)" opacity="0.9" />
                  <path clipRule="evenodd" d={svgTt.p329ca380} fill="#69C9D0" fillRule="evenodd" transform="translate(-0.8 -0.8)" opacity="0.9" />
                  <path clipRule="evenodd" d={svgTt.p42dc440}  fill="white"   fillRule="evenodd" />
                </svg>
              </div>
            </a>

            {/* Instagram */}
            <a href="https://www.instagram.com/jerseyclubradio/" target="_blank" rel="noopener noreferrer" title="Instagram" className="gs-link">
              <div className="gs-tile gs-tile-ig" style={{ padding: 0, background: 'transparent', border: 'none', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="gs-glow gs-glow-ig" />
                <div style={{ position: 'relative', zIndex: 2, width: 26, height: 26, ['--fill-0' as string]: 'white' }}>
                  <Instagram230 />
                </div>
              </div>
            </a>

          </div>

          <button
            onClick={refreshTracks}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#9D00FF] border border-[#9D00FF]/30 hover:bg-[#9D00FF]/10 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Mobile social strip — right below header, before Now Playing */}
      {/* removed — now inline under tagline */}

      {/* Now Playing */}
      <NowPlaying />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Playlist */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <h2 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
              🎵 Playlist
              <span
                className="text-[10px] font-semibold text-[#E0AAFF] animate-pulse"
                style={{ textShadow: '0 0 8px #9D00FF, 0 0 20px #9D00FF80, 0 0 40px #9D00FF40, 0 0 60px #9D00FF20' }}
              >
                newest first
              </span>
            </h2>
            {sortedTracks.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #9D00FF, #FF0080)' }}
              >
                <Play className="w-3.5 h-3.5" /> Play All
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <Loader2 className="w-10 h-10 text-[#9D00FF] animate-spin" />
              <p className="text-[#7B6F90] text-sm">Fetching Jersey Club tracks...</p>
            </div>
          ) : sortedTracks.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <span className="text-5xl">🎵</span>
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
            <div className="grid grid-cols-1 gap-2">
              {sortedTracks.map((track, i) => (
                <TrackCard key={track.id.videoId} track={track} trackList={sortedTracks} index={i} variant="list" />
              ))}
            </div>
          )}
        </div>

        {/* Most Played sidebar */}
        <div className="lg:col-span-1">
          <MostPlayed />
        </div>
      </div>
    </div>
  );
}