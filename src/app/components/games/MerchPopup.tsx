import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Check, Flame, ShoppingBag } from 'lucide-react';
import hoodieOrange from '../../../assets/8a5be03ab85c31365342b3e50b41bf5f678b22cb.png';

interface Props {
  visible: boolean;
  onClose: () => void;
  streak: number;
  discountCode?: string;  // Override code (e.g. boss victory)
  bossName?: string;      // Shows boss defeat header
}

const CODES = ['JC247HOT', 'STREAKLIFE', 'JERSEY15', 'CLUBDRIP'];
const STORE_URL = 'https://jerseyclubradio.creator-spring.com/';

export function MerchPopup({ visible, onClose, streak, discountCode, bossName }: Props) {
  const [copied, setCopied] = useState(false);
  const code = discountCode ?? CODES[Math.max(0, streak - 1) % CODES.length];
  const isBossReward = !!bossName;

  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] flex items-center justify-center p-4"
          style={{ background: 'rgba(6,0,15,0.85)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.7, rotate: -4 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.7, rotate: 4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ border: `2px solid ${isBossReward ? '#FFD700' : '#FF0080'}`, boxShadow: `0 0 60px ${isBossReward ? '#FFD70060' : '#FF008060'}, 0 0 120px #9D00FF30` }}
          >
            <button onClick={onClose}
              className="absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center text-[#7B6F90] hover:text-white transition-colors"
              style={{ background: '#1a003a' }}>
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="px-6 pt-6 pb-4 text-center"
              style={{ background: isBossReward ? 'linear-gradient(135deg, #2a1a00, #1a0040)' : 'linear-gradient(135deg, #2a0020, #1a0040)' }}>
              {isBossReward ? (
                <>
                  <div className="text-4xl mb-2">🏆</div>
                  <p className="text-[#FFD700] text-xs font-bold tracking-[0.3em] mb-1">AI BOSS DEFEATED!</p>
                  <p className="text-white text-xl font-black">{bossName} Falls!</p>
                  <p className="text-[#C084FC] text-xs mt-1">Jersey vs. The Machine — and Jersey won 🎉</p>
                </>
              ) : (
                <>
                  <div className="flex justify-center mb-3">
                    {Array.from({ length: streak }).map((_, i) => (
                      <Flame key={i} className="w-5 h-5 text-orange-400" style={{ filter: 'drop-shadow(0 0 6px orange)' }} />
                    ))}
                  </div>
                  <p className="text-[#FF0080] text-xs font-bold tracking-[0.3em] mb-1">🔥 HOT STREAK UNLOCKED</p>
                  <p className="text-white text-xl font-black">{streak} Wins in a Row!</p>
                  <p className="text-[#C084FC] text-xs mt-1">You're a Jersey Club legend 💜</p>
                </>
              )}
            </div>

            {/* Merch offer */}
            <div className="px-6 py-5 text-center" style={{ background: '#0D001E' }}>
              <div className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                style={{ background: isBossReward ? 'linear-gradient(135deg, #FFD700, #FF8800)' : 'linear-gradient(135deg, #9D00FF, #FF0080)' }}>
                <img src={hoodieOrange} alt="Limited Jersey 24/7 Hoodie" className="w-8 h-8" />
              </div>
              <p className="text-white font-black text-lg mb-1">Limited Jersey 24/7 Hoodie</p>
              <p className="font-black text-2xl" style={{ color: isBossReward ? '#FFD700' : '#9D00FF' }}>
                {isBossReward ? '20% OFF' : '15% OFF'}
              </p>
              <p className="text-[#5B4F70] text-xs mb-4">Official Jersey Club merch · Limited stock</p>

              {/* Discount code */}
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4"
                style={{ background: '#1a003a', border: '1px dashed #9D00FF60' }}>
                <span className="flex-1 text-white font-mono font-bold tracking-widest text-sm">{code}</span>
                <button onClick={copy}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: copied ? '#00AA44' : '#9D00FF' }}>
                  {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-white" />}
                </button>
              </div>

              <a href={STORE_URL} target="_blank" rel="noreferrer"
                className="block w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02]"
                style={{ background: isBossReward ? 'linear-gradient(135deg, #FFD700, #FF8800)' : 'linear-gradient(135deg, #9D00FF, #FF0080)', boxShadow: '0 0 20px #9D00FF60' }}>
                Shop the Look →
              </a>
              <p className="text-[#3B2F50] text-[10px] mt-2">Code expires in 48 hours</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}