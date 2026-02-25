import React, { useState } from 'react';
import { Copy, Check, X, KeyRound, Shield, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCrateSafe } from '../context/CrateContext';
import { GoldVinylRecord } from './GoldVinylRecord';

export function SecretKeyModal() {
  const crate = useCrateSafe();
  const [copied, setCopied] = useState(false);

  if (!crate) return null;
  const { isSecretKeyModalOpen, closeSecretKeyModal, secretKey } = crate;

  const handleCopy = async () => {
    if (!secretKey) return;
    try {
      await navigator.clipboard.writeText(secretKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <AnimatePresence>
      {isSecretKeyModalOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-[95] bg-black/85 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="fixed inset-0 z-[96] flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          >
            <div
              className="relative w-full max-w-sm rounded-3xl overflow-hidden text-center"
              style={{ background: 'linear-gradient(160deg, #100020 0%, #06000f 100%)', border: '1px solid rgba(191,149,63,0.4)' }}
            >
              {/* Gold top strip */}
              <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #bf953f, #fcf6ba, #b38728, #fcf6ba, #bf953f)' }} />

              <button
                onClick={closeSecretKeyModal}
                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>

              <div className="px-6 py-6">
                {/* Celebration header */}
                <div className="flex justify-center mb-4">
                  <GoldVinylRecord is24k size={90} spinning />
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black mb-3"
                    style={{ background: 'linear-gradient(90deg, #bf953f, #fcf6ba)', color: '#2a1000' }}
                  >
                    <Star className="w-3 h-3" /> YOU'RE 24K GOLD
                  </div>
                  <h2 className="text-2xl font-black text-white mb-1">Welcome to the Vault</h2>
                  <p className="text-[#C084FC] text-sm mb-5">
                    Your crate is now unlimited. Save this key — it unlocks your Gold status on any device.
                  </p>
                </motion.div>

                {/* Secret key display */}
                <motion.div
                  className="rounded-2xl p-4 mb-4"
                  style={{ background: 'rgba(191,149,63,0.1)', border: '1.5px solid rgba(191,149,63,0.4)' }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.35 }}
                >
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <KeyRound className="w-4 h-4" style={{ color: '#fcf6ba' }} />
                    <span className="text-xs font-bold text-[#fcf6ba] tracking-widest">YOUR SECRET KEY</span>
                  </div>
                  <div
                    className="text-lg font-black tracking-widest mb-3 select-all"
                    style={{ color: '#fcf6ba', textShadow: '0 0 12px rgba(191,149,63,0.6)', fontFamily: 'monospace' }}
                  >
                    {secretKey || 'J-CLUB-????-????-????'}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: copied ? 'rgba(0,200,100,0.2)' : 'rgba(191,149,63,0.2)',
                      color: copied ? '#00c864' : '#fcf6ba',
                      border: `1px solid ${copied ? 'rgba(0,200,100,0.4)' : 'rgba(191,149,63,0.4)'}`,
                    }}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'COPIED!' : 'COPY KEY'}
                  </button>
                </motion.div>

                {/* Warning */}
                <div
                  className="rounded-xl p-3 mb-4 flex gap-2.5 text-left"
                  style={{ background: 'rgba(255,100,0,0.08)', border: '1px solid rgba(255,100,0,0.2)' }}
                >
                  <Shield className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-300/80 leading-relaxed">
                    <strong className="text-orange-300">Write this down or screenshot it.</strong> This key is your only way to restore 24K Gold on a new device. We can't recover it for you.
                  </p>
                </div>

                <button
                  onClick={closeSecretKeyModal}
                  className="w-full py-3 rounded-2xl font-black text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: 'linear-gradient(135deg, #bf953f, #fcf6ba)', color: '#2a1000' }}
                >
                  LET'S GO — OPEN MY CRATE 🎶
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}