import React, { useEffect, useState } from 'react';
import { Play, Pause, Trash2, KeyRound, Copy, Check, Loader2, Sparkles, Disc3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCrateSafe, GUEST_CRATE_LIMIT } from '../context/CrateContext';
import { usePlayer } from '../context/PlayerContext';
import { GoldVinylRecord } from '../components/GoldVinylRecord';
import { formatTrackTitle } from '../utils/formatTrackTitle';
import { formatArtistName } from '../utils/formatArtistName';
import { getMaxResThumbnail, handleThumbnailError } from '../utils/getMaxResThumbnail';

export function Crate() {
  const crateCtx = useCrateSafe();
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const [copiedKey, setCopiedKey] = useState(false);

  if (!crateCtx) return null;
  const {
    is24k, crate, crateCount, isLoading, isUpgrading,
    secretKey, hasSecretKey, openPaywall, removeFromCrate, openSecretKeyModal,
    startPolling,
  } = crateCtx;

  // Re-check poll on page mount if ?upgraded=true still in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true' && !is24k) startPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlay = (videoId: string) => {
    const item = crate.find(c => c.videoId === videoId);
    if (!item) return;
    const track = {
      id: { videoId: item.videoId },
      snippet: {
        title: item.title,
        channelTitle: item.channelTitle,
        description: '',
        publishedAt: item.addedAt,
        thumbnails: { default: { url: item.thumbnail }, medium: { url: item.thumbnail }, high: { url: item.thumbnail } },
      },
      source: item.source as 'youtube' | 'soundcloud' | undefined,
      soundcloudUrl: item.soundcloudUrl,
    };
    const isActive = currentTrack?.id.videoId === videoId;
    if (isActive) { togglePlay(); return; }
    const trackList = crate.map(ci => ({
      id: { videoId: ci.videoId },
      snippet: { title: ci.title, channelTitle: ci.channelTitle, description: '', publishedAt: ci.addedAt, thumbnails: { default: { url: ci.thumbnail }, medium: { url: ci.thumbnail }, high: { url: ci.thumbnail } } },
      source: ci.source as 'youtube' | 'soundcloud' | undefined,
      soundcloudUrl: ci.soundcloudUrl,
    }));
    playTrack(track, trackList);
  };

  const handleCopyKey = async () => {
    if (!secretKey) return;
    try { await navigator.clipboard.writeText(secretKey); setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2500); } catch {}
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <GoldVinylRecord is24k={false} size={80} spinning />
        <p className="text-[#7B6F90] text-sm">Loading your crate…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 md:px-8 py-6" style={{ background: '#06000F' }}>
      {/* ── Upgrade pending banner ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isUpgrading && (
          <motion.div
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[50] px-5 py-3 rounded-2xl flex items-center gap-3 text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#bf953f,#fcf6ba)', color: '#2a1000', boxShadow: '0 0 30px rgba(191,149,63,0.5)' }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Activating your 24K Gold Crate…
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto">
        <div
          className="relative rounded-3xl overflow-hidden mb-8 p-6 md:p-8"
          style={{ background: 'linear-gradient(135deg, #0f0022 0%, #0a0018 100%)', border: `1px solid ${is24k ? 'rgba(191,149,63,0.35)' : 'rgba(157,0,255,0.25)'}` }}
        >
          {/* Top strip */}
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: is24k ? 'linear-gradient(90deg,#bf953f,#fcf6ba,#b38728)' : 'linear-gradient(90deg,#9D00FF,#FF0080,#9D00FF)' }}
          />

          {/* Ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${is24k ? 'rgba(191,149,63,0.12)' : 'rgba(157,0,255,0.12)'} 0%, transparent 100%)` }}
          />

          <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
            <GoldVinylRecord is24k={is24k} size={100} spinning={isPlaying && crate.some(c => c.videoId === currentTrack?.id.videoId)} />

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {is24k ? (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black"
                    style={{ background: 'linear-gradient(90deg,#bf953f,#fcf6ba)', color: '#2a1000' }}
                  >
                    <Sparkles className="w-3 h-3" /> 24K GOLD LEGEND
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/10 text-[#C084FC]">
                    <Disc3 className="w-3 h-3" /> BLACK VINYL GUEST
                  </span>
                )}
              </div>

              <h1
                className="text-3xl md:text-4xl font-black text-white mb-1"
                style={{ textShadow: is24k ? '0 0 20px rgba(191,149,63,0.4)' : '0 0 20px rgba(157,0,255,0.4)' }}
              >
                MY CRATE
              </h1>

              <p className={`text-sm font-semibold mb-4 ${is24k ? '' : 'text-[#C084FC]'}`} style={is24k ? { color: '#fcf6ba' } : {}}>
                {is24k ? `${crateCount} tracks saved · Unlimited capacity` : `${crateCount} / ${GUEST_CRATE_LIMIT} free saves used`}
              </p>

              {/* Progress bar for guests */}
              {!is24k && (
                <div className="mb-4 max-w-xs">
                  <div className="h-2 rounded-full overflow-hidden bg-white/5">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: crateCount >= GUEST_CRATE_LIMIT ? 'linear-gradient(90deg,#FF0080,#FF4444)' : 'linear-gradient(90deg,#9D00FF,#C084FC)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(crateCount / GUEST_CRATE_LIMIT) * 100}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {!is24k && (
                  <button
                    onClick={openPaywall}
                    className="px-5 py-2.5 rounded-xl font-black text-sm transition-all hover:scale-[1.03] active:scale-[0.97]"
                    style={{ background: 'linear-gradient(135deg,#bf953f,#fcf6ba)', color: '#2a1000', boxShadow: '0 0 16px rgba(191,149,63,0.4)' }}
                  >
                    ⭐ GO 24K — $7.99
                  </button>
                )}

                {/* Secret key section */}
                {is24k && hasSecretKey && secretKey && (
                  <div
                    className="rounded-xl px-4 py-2.5 flex items-center gap-3"
                    style={{ background: 'rgba(191,149,63,0.1)', border: '1px solid rgba(191,149,63,0.3)' }}
                  >
                    <KeyRound className="w-4 h-4 flex-shrink-0" style={{ color: '#fcf6ba' }} />
                    <span className="font-mono text-sm font-bold" style={{ color: '#fcf6ba' }}>{secretKey}</span>
                    <button onClick={handleCopyKey} className="hover:opacity-70 transition-opacity">
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" style={{ color: '#fcf6ba' }} />}
                    </button>
                  </div>
                )}
                {is24k && !secretKey && (
                  <button onClick={openSecretKeyModal} className="text-sm text-[#C084FC] hover:text-white transition-colors flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" /> View Secret Key
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Track grid ────────────────────────────────────────────────────── */}
        {crate.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
            <GoldVinylRecord is24k={is24k} size={120} />
            <div>
              <h3 className="text-xl font-black text-white mb-2">Your crate is empty</h3>
              <p className="text-[#6B5F90] max-w-xs">
                Hit the vinyl button <Disc3 className="inline w-4 h-4 text-[#C084FC]" /> on any track across the site to drop it into your crate.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {crate.map((item, i) => {
                const isActive = currentTrack?.id.videoId === item.videoId;
                return (
                  <motion.div
                    key={item.videoId}
                    className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 ${isActive ? 'ring-2 ring-[#C084FC]' : ''}`}
                    style={{
                      background: 'linear-gradient(135deg, #0F0022 0%, #160035 100%)',
                      boxShadow: isActive
                        ? `0 0 24px ${is24k ? 'rgba(191,149,63,0.5)' : 'rgba(157,0,255,0.5)'}`
                        : `0 0 0 1px rgba(${is24k ? '191,149,63' : '157,0,255'},0.15)`,
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handlePlay(item.videoId)}
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video">
                      <img
                        src={item.source === 'soundcloud' ? item.thumbnail : getMaxResThumbnail(item.videoId)}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        onError={(e) => handleThumbnailError(e, item.videoId)}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                      {/* Gold shimmer overlay */}
                      {is24k && (
                        <div
                          className="absolute inset-0 pointer-events-none opacity-20"
                          style={{ background: 'linear-gradient(135deg, transparent 40%, rgba(191,149,63,0.6) 50%, transparent 60%)' }}
                        />
                      )}

                      {/* Play button */}
                      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        <button
                          className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
                          style={{ background: is24k ? 'linear-gradient(135deg,#bf953f,#fcf6ba)' : '#9D00FF', boxShadow: `0 0 20px ${is24k ? 'rgba(191,149,63,0.6)' : 'rgba(157,0,255,0.6)'}` }}
                        >
                          {isActive && isPlaying
                            ? <Pause className="w-5 h-5" style={{ color: is24k ? '#2a1000' : 'white' }} />
                            : <Play className="w-5 h-5 ml-0.5" style={{ color: is24k ? '#2a1000' : 'white' }} />
                          }
                        </button>
                      </div>

                      {/* Vinyl disc */}
                      <div className="absolute top-2 left-2">
                        <GoldVinylRecord is24k={is24k} size={36} spinning={isActive && isPlaying} />
                      </div>

                      {/* Now playing badge */}
                      {isActive && (
                        <div
                          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: is24k ? 'linear-gradient(90deg,#bf953f,#fcf6ba)' : '#9D00FF', color: is24k ? '#2a1000' : 'white' }}
                        >
                          <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
                          PLAYING
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3 flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate uppercase ${isActive ? 'text-[#C084FC]' : 'text-white'}`} style={isActive && is24k ? { color: '#fcf6ba' } : {}}>
                          {formatTrackTitle(item.title, item.channelTitle)}
                        </p>
                        <p className="text-xs text-[#7B6F90] truncate">{formatArtistName(item.channelTitle)}</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); removeFromCrate(item.videoId); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-500/20 flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* ── Upgrade teaser at bottom ──────────────────────────────────────── */}
        {!is24k && (
          <motion.div
            className="mt-8 rounded-3xl p-6 text-center"
            style={{ background: 'linear-gradient(135deg,#0f0022,#1a0040)', border: '1px solid rgba(191,149,63,0.25)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <GoldVinylRecord is24k size={64} spinning className="mx-auto mb-4" />
            <h3 className="text-xl font-black text-white mb-2">Upgrade to 24K Gold</h3>
            <p className="text-[#7B6F90] text-sm mb-4 max-w-xs mx-auto">
              Unlimited saves, gold vinyl on every record, shimmer animations & your secret recovery key.
            </p>
            <button
              onClick={openPaywall}
              className="px-6 py-3 rounded-2xl font-black text-sm transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg,#bf953f,#fcf6ba)', color: '#2a1000', boxShadow: '0 0 20px rgba(191,149,63,0.4)' }}
            >
              ⭐ GO 24K GOLD — $7.99
            </button>
            <p className="text-[10px] text-[#4B3F60] mt-3">One-time · Lifetime · No login required</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}