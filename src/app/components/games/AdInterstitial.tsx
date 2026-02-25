import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';

interface Props {
  visible: boolean;
  onClose: () => void;
  sponsorWord?: string; // for crossword "Daily Power Word"
}

const BRANDS = [
  { name: 'JERSEY 24/7 FM', tag: 'Stream the culture, 24 hours a day', emoji: '🎵' },
  { name: 'JERSEY FRESH HOODIES', tag: 'Rep your city. Shop the official merch.', emoji: '👕' },
  { name: 'FOOTWORK ENERGY', tag: 'Move like the music. Drink the drop.', emoji: '⚡' },
];

export function AdInterstitial({ visible, onClose, sponsorWord }: Props) {
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const brand = BRANDS[Math.floor(Math.random() * BRANDS.length)];

  useEffect(() => {
    if (!visible) { setCountdown(5); setCanSkip(false); return; }
    const iv = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(iv); setCanSkip(true); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(6,0,15,0.96)' }}
        >
          {/* Neon scanlines */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(157,0,255,0.04) 2px, rgba(157,0,255,0.04) 4px)' }} />

          <motion.div
            initial={{ scale: 0.8, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 40 }}
            className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
            style={{ border: '2px solid #9D00FF', boxShadow: '0 0 60px #9D00FF80' }}
          >
            {/* Top bar */}
            <div className="px-4 py-2 flex items-center justify-between text-xs"
              style={{ background: '#1a003a' }}>
              <span className="text-[#9D00FF] font-bold tracking-widest">◉ DROP BREAK</span>
              <span className="text-[#5B4F70]">Ad · {countdown > 0 ? `Skip in ${countdown}s` : 'You can skip'}</span>
            </div>

            {/* Ad content */}
            <div className="px-8 py-10 text-center"
              style={{ background: 'linear-gradient(135deg, #0D001E 0%, #1a003a 50%, #0D001E 100%)' }}>
              {sponsorWord ? (
                <>
                  <p className="text-[#9D00FF] text-xs font-bold tracking-widest mb-3">🧩 DAILY POWER WORD</p>
                  <p className="text-5xl font-black text-white mb-3 tracking-wider" style={{ textShadow: '0 0 30px #9D00FF' }}>
                    {sponsorWord}
                  </p>
                  <p className="text-[#C084FC] text-sm mb-6">Check out tonight's Jersey Club event at Club Excess, Newark NJ</p>
                  <div className="inline-block px-4 py-2 rounded-xl text-xs font-bold text-white border border-[#9D00FF]/40"
                    style={{ background: '#2a0060' }}>
                    🎫 RSVP: jerseyclub247.com/events
                  </div>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-4">{brand.emoji}</div>
                  <p className="text-[#9D00FF] text-xs font-bold tracking-[0.3em] mb-2">SPONSORED BY</p>
                  <p className="text-3xl font-black text-white mb-3" style={{ textShadow: '0 0 20px #9D00FF' }}>
                    {brand.name}
                  </p>
                  <p className="text-[#C084FC] text-sm mb-6">{brand.tag}</p>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map(i => (
                      <motion.div key={i}
                        animate={{ scaleY: [0.3, 1, 0.3] }}
                        transition={{ duration: 0.5, delay: i * 0.1, repeat: Infinity }}
                        className="w-1.5 rounded-full"
                        style={{ height: 32, background: `hsl(${270 + i * 15}, 100%, 60%)` }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Skip button */}
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ background: '#0D001E', borderTop: '1px solid #2a0060' }}>
              <span className="text-xs text-[#3B2F50]">Keeping Jersey Club alive</span>
              <button
                onClick={canSkip ? onClose : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  canSkip
                    ? 'text-white bg-[#9D00FF] hover:bg-[#B030FF] cursor-pointer'
                    : 'text-[#3B2F50] bg-[#1a003a] cursor-not-allowed'
                }`}
              >
                <X className="w-3 h-3" />
                {canSkip ? 'Skip Ad' : `${countdown}s`}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
