import React, { useState } from 'react';
import { X, Play, Trash2, Lock, Sparkles, Disc3, Receipt } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCrateSafe, GUEST_CRATE_LIMIT } from '../context/CrateContext';
import { usePlayer } from '../context/PlayerContext';
import { GoldVinylRecord } from './GoldVinylRecord';
import { formatTrackTitle } from '../utils/formatTrackTitle';
import { formatArtistName } from '../utils/formatArtistName';

export function CratePanel() {
  const crateCtx = useCrateSafe();
  const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
  const [portalLoading, setPortalLoading] = useState(false);

  if (!crateCtx) return null;
  const { isCrateOpen, closeCrate, is24k, crate, crateCount, removeFromCrate, openPaywall, openBillingPortal } = crateCtx;

  const handleBillingPortal = async () => {
    setPortalLoading(true);
    await openBillingPortal();
    setPortalLoading(false);
  };

  const handlePlay = (item: (typeof crate)[0]) => {
    const track = {
      id: { videoId: item.videoId },
      snippet: {
        title: item.title,
        channelTitle: item.channelTitle,
        description: '',
        publishedAt: item.addedAt,
        thumbnails: {
          default: { url: item.thumbnail },
          medium: { url: item.thumbnail },
          high: { url: item.thumbnail },
        },
      },
      source: (item.source as 'youtube' | 'soundcloud' | undefined),
      soundcloudUrl: item.soundcloudUrl,
    };
    const isActive = currentTrack?.id.videoId === item.videoId;
    if (isActive) {
      togglePlay();
    } else {
      // Build full track list from crate for playback
      const trackList = crate.map(ci => ({
        id: { videoId: ci.videoId },
        snippet: {
          title: ci.title,
          channelTitle: ci.channelTitle,
          description: '',
          publishedAt: ci.addedAt,
          thumbnails: { default: { url: ci.thumbnail }, medium: { url: ci.thumbnail }, high: { url: ci.thumbnail } },
        },
        source: (ci.source as 'youtube' | 'soundcloud' | undefined),
        soundcloudUrl: ci.soundcloudUrl,
      }));
      playTrack(track, trackList);
    }
  };

  return (
    <AnimatePresence>
      {isCrateOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCrate}
          />

          {/* Panel */}
          <motion.div
            className="fixed right-0 top-0 bottom-0 z-[81] w-full max-w-sm flex flex-col"
            style={{
              background: 'linear-gradient(180deg, #0d0020 0%, #07000f 100%)',
              borderLeft: '1px solid rgba(157,0,255,0.25)',
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Top accent */}
            <div className="h-1" style={{ background: is24k ? 'linear-gradient(90deg,#bf953f,#fcf6ba,#b38728)' : 'linear-gradient(90deg,#9D00FF,#FF0080,#9D00FF)' }} />

            {/* Header */}
            <div className="px-4 py-4 flex items-center gap-3 border-b border-white/5">
              <GoldVinylRecord is24k={is24k} size={44} spinning={isPlaying && crate.some(c => c.videoId === currentTrack?.id.videoId)} />
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-black text-white">MY CRATE</h2>
                {is24k ? (
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" style={{ color: '#fcf6ba' }} />
                    <span className="text-[10px] font-black tracking-widest" style={{ color: '#fcf6ba' }}>24K GOLD LEGEND</span>
                  </div>
                ) : (
                  <p className="text-[10px] text-[#7B6F90]">{crateCount}/{GUEST_CRATE_LIMIT} SAVES · <span className="text-[#C084FC] cursor-pointer" onClick={openPaywall}>GO GOLD →</span></p>
                )}
              </div>
              <button
                onClick={closeCrate}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Guest limit bar */}
            {!is24k && (
              <div className="px-4 py-2.5 border-b border-white/5">
                <div className="flex justify-between text-[10px] text-[#7B6F90] mb-1.5">
                  <span>FREE SLOTS</span>
                  <span>{crateCount}/{GUEST_CRATE_LIMIT}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-white/5">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: crateCount >= GUEST_CRATE_LIMIT ? '#FF0080' : 'linear-gradient(90deg,#9D00FF,#C084FC)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(crateCount / GUEST_CRATE_LIMIT) * 100}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                {crateCount >= GUEST_CRATE_LIMIT && (
                  <p className="text-[10px] text-[#FF0080] mt-1.5 font-semibold">Crate full! Go 24K Gold for unlimited saves.</p>
                )}
              </div>
            )}

            {/* Track list */}
            <div className="flex-1 overflow-y-auto py-2">
              {crate.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
                  <GoldVinylRecord is24k={is24k} size={64} />
                  <div>
                    <p className="text-white font-bold mb-1">Your crate is empty</p>
                    <p className="text-[#6B5F80] text-sm">Hit the vinyl icon on any track to save it here</p>
                  </div>
                </div>
              ) : (
                <AnimatePresence>
                  {crate.map((item, i) => {
                    const isActive = currentTrack?.id.videoId === item.videoId;
                    return (
                      <motion.div
                        key={item.videoId}
                        className={`flex items-center gap-3 px-4 py-2.5 group transition-colors cursor-pointer ${isActive ? 'bg-[#1a0040]/60' : 'hover:bg-white/[0.03]'}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => handlePlay(item)}
                      >
                        {/* Vinyl disc */}
                        <GoldVinylRecord
                          is24k={is24k}
                          size={42}
                          spinning={isActive && isPlaying}
                          thumbnail={item.thumbnail}
                        />

                        {/* Track info */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold truncate uppercase ${isActive ? 'text-[#C084FC]' : 'text-white'}`}>
                            {formatTrackTitle(item.title, item.channelTitle).length > 38
                              ? formatTrackTitle(item.title, item.channelTitle).slice(0, 38) + '…'
                              : formatTrackTitle(item.title, item.channelTitle)}
                          </p>
                          <p className="text-[10px] text-[#7B6F90] truncate">{formatArtistName(item.channelTitle)}</p>
                        </div>

                        {/* Play / Remove */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => { e.stopPropagation(); handlePlay(item); }}
                            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                          >
                            <Play className="w-3 h-3 text-white" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); removeFromCrate(item.videoId); }}
                            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-500/20 transition-colors"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </button>
                        </div>

                        {isActive && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#C084FC] animate-pulse flex-shrink-0" />
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Footer CTA — guest */}
            {!is24k && (
              <div
                className="px-4 py-4 border-t border-white/5"
                style={{ background: 'rgba(157,0,255,0.06)' }}
              >
                <button
                  onClick={openPaywall}
                  className="w-full py-3 rounded-2xl font-black text-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#bf953f 0%,#fcf6ba 30%,#b38728 60%,#fbf5b7 100%)', color: '#2a1000', boxShadow: '0 0 16px rgba(191,149,63,0.35)' }}
                >
                  <Disc3 className="w-4 h-4" />
                  GO 24K GOLD — $7.99
                </button>
                <p className="text-center text-[10px] text-[#4B3F60] mt-2">Lifetime · No account · Instant activation</p>
              </div>
            )}

            {/* Footer — 24K Gold member: manage billing */}
            {is24k && (
              <div
                className="px-4 py-3 border-t border-white/5"
                style={{ background: 'rgba(191,149,63,0.06)' }}
              >
                <button
                  onClick={handleBillingPortal}
                  disabled={portalLoading}
                  className="w-full py-2.5 rounded-xl font-bold text-xs transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{
                    background: 'rgba(191,149,63,0.12)',
                    border: '1px solid rgba(191,149,63,0.3)',
                    color: '#fcf6ba',
                  }}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  {portalLoading ? 'OPENING PORTAL…' : 'MANAGE BILLING & RECEIPTS'}
                </button>
                <p className="text-center text-[10px] text-[#7B6F90] mt-1.5">
                  View invoices · Download receipts · Secured by Paddle
                </p>
              </div>
            )}

            {/* Locked banner for full crate */}
            {!is24k && crateCount >= GUEST_CRATE_LIMIT && crate.length === 0 && (
              <div className="mx-4 mb-4 rounded-xl p-3 flex items-center gap-2" style={{ background: 'rgba(255,0,128,0.08)', border: '1px solid rgba(255,0,128,0.2)' }}>
                <Lock className="w-4 h-4 text-[#FF0080] flex-shrink-0" />
                <p className="text-xs text-[#FF8080]">Crate locked at {GUEST_CRATE_LIMIT} tracks. Upgrade to save more.</p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}