import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShoppingBag, Clock, ChevronRight, Tag, Zap, Flame } from 'lucide-react';
import { useLocation } from 'react-router';
import hoodieOrange from '../../../assets/8a5be03ab85c31365342b3e50b41bf5f678b22cb.png';
import hoodieWhite from '../../../assets/88fe763395081a4cd4dd4a6c922fb53652e0c717.png';
import hoodieGray from '../../../assets/900ca47e064e11fa35cb10891a0fd719e6f974bd.png';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

// ─── Color variants ───────────────────────────────────────────────────────────
const COLORWAYS = [
  { label: 'Safety Orange', hex: '#E8650A', img: hoodieOrange },
  { label: 'White', hex: '#F5F5F5', img: hoodieWhite },
  { label: 'Sport Grey', hex: '#9E9E9E', img: hoodieGray },
];

// ─── EXACT store prices from jerseyclubradio.creator-spring.com ───────────────
// "retail" is the inflated anchor (visual trick only — never a real price).
// "price" is the EXACT price live on the store right now.
const HOODIE = { retail: 69.99, price: 49.95 };   // hoodie
const TSHIRT = { retail: 49.99, price: 34.95 };   // t-shirt
const TOTE = { retail: 42.99, price: 29.95 };   // tote bag
const MUG = { retail: 22.99, price: 15.99 };   // mug

// Savings helpers
const pctOff = (r: number, p: number) => Math.round((1 - p / r) * 100);
const HOODIE_SAVE = (HOODIE.retail - HOODIE.price).toFixed(2);
const HOODIE_PCT = pctOff(HOODIE.retail, HOODIE.price);               // 29%

const OTHER_PRODUCTS = [
  { label: 'T-Shirt', emoji: '👕', retail: TSHIRT.retail, price: TSHIRT.price, pct: pctOff(TSHIRT.retail, TSHIRT.price) },
  { label: 'Tote Bag', emoji: '🛍️', retail: TOTE.retail, price: TOTE.price, pct: pctOff(TOTE.retail, TOTE.price) },
  { label: 'Mug', emoji: '☕', retail: MUG.retail, price: MUG.price, pct: pctOff(MUG.retail, MUG.price) },
];

// ─── Context-aware messaging by route ────────────────────────────────────────
const CONTEXT_COPY: Record<string, { badge: string; headline: string; sub: string }> = {
  '/': {
    badge: '🎧 Vibing right now?',
    headline: 'Rep the culture you live in.',
    sub: 'Made for real ones — official Jersey Club Music merch.',
  },
  '/new-releases': {
    badge: '🔥 First to hear it.',
    headline: 'Now be first to wear it.',
    sub: 'Fresh drops deserve fresh drip. Official Jersey Club merch.',
  },
  '/dance-videos': {
    badge: '💃 You know the moves.',
    headline: 'Now wear the culture.',
    sub: 'Official merch for the dance floor and beyond.',
  },
  '/games': {
    badge: '🎮 You\'ve got that Jersey edge.',
    headline: 'Make the drip official.',
    sub: 'Game hard, dress harder. Jersey Club Music.',
  },
  '/chat': {
    badge: '💬 Part of the fam.',
    headline: 'Look like you belong.',
    sub: 'Rep the community. Official Jersey Club hoodie.',
  },
  '/search': {
    badge: '🔍 Deep in the music.',
    headline: 'Go deeper with the gear.',
    sub: 'For listeners who actually know. Jersey Club Music.',
  },
  '/queue': {
    badge: '🎵 Your playlist, your identity.',
    headline: 'Wear what you listen to.',
    sub: 'Official Jersey Club Music apparel. Ships worldwide.',
  },
};

const DEFAULT_COPY = {
  badge: '🧡 Official Jersey Club Merch',
  headline: 'Wear the culture.',
  sub: 'Limited merch — Jersey Club Music. Direct from the studio.',
};

const STORE_URL = 'https://jerseyclubradio.creator-spring.com/';

export function FlashSale({ visible, onDismiss }: Props) {
  const { pathname } = useLocation();
  const [colorIdx, setColorIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(12 * 60);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [pricePulse, setPricePulse] = useState(false);

  // Countdown
  useEffect(() => {
    if (!visible) { setTimeLeft(12 * 60); return; }
    const iv = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(iv); onDismiss(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [visible, onDismiss]);

  // Subtle price-block pulse every 8s to re-draw the eye
  useEffect(() => {
    if (!visible) return;
    const iv = setInterval(() => {
      setPricePulse(true);
      setTimeout(() => setPricePulse(false), 500);
    }, 8000);
    return () => clearInterval(iv);
  }, [visible]);

  useEffect(() => setImgLoaded(false), [colorIdx]);

  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');

  const baseRoute = '/' + pathname.split('/')[1];
  const copy = CONTEXT_COPY[baseRoute] ?? DEFAULT_COPY;
  const current = COLORWAYS[colorIdx];
  const urgent = timeLeft < 3 * 60;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* ── Backdrop overlay (all devices) ──────────────────────────────── */}
          <motion.div
            key="flash-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onDismiss}
            className="fixed inset-0 z-[119]"
            style={{ background: 'rgba(0,0,0,0.7)' }}
          />

          {/* ── Popup — bottom sheet on mobile, side card on desktop ────────── */}
          <motion.div
            key="flash-sale"
            initial={{ x: 0, y: 80, opacity: 0 }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={{ x: 0, y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="
              fixed z-[120]
              md:w-72 md:bottom-28 md:right-4 md:top-auto md:left-auto md:max-h-none
              inset-x-0 bottom-0 w-full max-h-[85vh]
            "
          >
            <div
              className="rounded-t-2xl md:rounded-2xl overflow-hidden flex flex-col max-h-[85vh] md:max-h-none"
              style={{
                background: '#0D001E',
                border: `1.5px solid ${urgent ? '#FF4444' : '#C084FC'}50`,
                boxShadow: `0 0 36px ${urgent ? '#FF444422' : '#C084FC12'}, 0 -8px 48px rgba(0,0,0,0.92) , 0 20px 48px rgba(0,0,0,0.92)`,
              }}
            >

              {/* ── Mobile drag handle ────────────────────────────────────────── */}
              <div className="md:hidden flex justify-center pt-2 pb-0.5">
                <div className="w-10 h-1 rounded-full" style={{ background: '#2B2040' }} />
              </div>

              {/* ── Header ──────────────────────────────────────────────────────── */}
              <div
                className="flex items-center justify-between px-3 py-2"
                style={{
                  background: urgent
                    ? 'linear-gradient(135deg, #2a0000, #150010)'
                    : 'linear-gradient(135deg, #160035, #0D001E)',
                  borderBottom: `1px solid ${urgent ? '#FF444425' : '#C084FC18'}`,
                }}
              >
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5" style={{ color: urgent ? '#FF8888' : '#C084FC' }} />
                  <span className="text-[10px] font-black tracking-[0.15em] uppercase"
                    style={{ color: urgent ? '#FF8888' : '#C084FC' }}>
                    Official Store
                  </span>
                </div>
                <button onClick={onDismiss}
                  className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{ background: '#1a0040', color: '#7B6F90' }}
                  aria-label="Dismiss">
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* ── Hoodie image ─────────────────────────────────────────────────── */}
              <div
                className="relative flex items-center justify-center overflow-hidden"
                style={{
                  height: 144,
                  background: urgent
                    ? 'linear-gradient(180deg, #1a0000 0%, #0D001E 100%)'
                    : 'linear-gradient(180deg, #160035 0%, #0D001E 100%)',
                }}
              >
                {/* % OFF badge — top left */}
                <div
                  className="absolute top-2 left-2 z-20 flex flex-col items-center justify-center rounded-full font-black text-white leading-none"
                  style={{
                    width: 48, height: 48,
                    background: 'linear-gradient(135deg, #FF2D55, #FF6B00)',
                    boxShadow: '0 0 14px #FF2D5565',
                  }}
                >
                  <span style={{ fontSize: 15, lineHeight: 1 }}>{HOODIE_PCT}%</span>
                  <span style={{ fontSize: 8, letterSpacing: '0.05em' }}>OFF</span>
                </div>

                {/* Listener tag — top right */}
                <div
                  className="absolute top-2 right-2 z-20 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full"
                  style={{ background: '#0a0018', border: '1px solid #C084FC35' }}
                >
                  <Zap className="w-2.5 h-2.5" style={{ color: '#C084FC' }} />
                  <span className="text-[8px] font-black text-[#C084FC] tracking-wider">LISTENER PRICE</span>
                </div>

                {/* Color glow */}
                <div
                  className="absolute w-28 h-28 rounded-full blur-2xl opacity-30 pointer-events-none"
                  style={{ background: current.hex }}
                />

                <motion.img
                  key={colorIdx}
                  src={current.img}
                  alt={`Jersey Club Radio Hoodie – ${current.label}`}
                  onLoad={() => setImgLoaded(true)}
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: imgLoaded ? 1 : 0, scale: 1 }}
                  transition={{ duration: 0.22 }}
                  className="relative h-32 w-auto object-contain scale-[1.15]"
                  style={{ filter: 'drop-shadow(0 4px 18px rgba(0,0,0,0.65))' }}
                />

                {/* Color swatches */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                  {COLORWAYS.map((cw, i) => (
                    <button
                      key={cw.label}
                      onClick={() => setColorIdx(i)}
                      title={cw.label}
                      className="rounded-full transition-all hover:scale-110"
                      style={{
                        width: i === colorIdx ? 18 : 13,
                        height: i === colorIdx ? 18 : 13,
                        background: cw.hex,
                        border: `2px solid ${i === colorIdx ? '#E0AAFF' : 'rgba(255,255,255,0.18)'}`,
                        boxShadow: i === colorIdx ? `0 0 10px ${cw.hex}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* ── Body ─────────────────────────────────────────────────────────── */}
              <div className="px-3.5 pt-2.5 pb-3.5 overflow-y-auto">

                {/* Context badge */}
                <div
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full mb-1.5 text-[10px] font-bold"
                  style={{ background: '#1a0040', color: '#C084FC', border: '1px solid #C084FC25' }}
                >
                  {copy.badge}
                </div>

                <p className="text-white font-black text-sm mb-0.5 leading-snug"
                  style={{ textShadow: '0 0 12px #C084FC30' }}>
                  {copy.headline}
                </p>
                <p className="text-[#7B6F90] text-[11px] mb-2.5 leading-relaxed">{copy.sub}</p>

                {/* ── PRICE BLOCK ────────────────────────────────────────────────── */}
                <motion.div
                  animate={pricePulse ? { scale: [1, 1.022, 1] } : { scale: 1 }}
                  transition={{ duration: 0.38 }}
                  className="rounded-xl px-3 py-2.5 mb-2.5"
                  style={{
                    background: 'linear-gradient(135deg, #090017, #100022)',
                    border: '1px solid #C084FC20',
                  }}
                >
                  {/* Exclusive listener label */}
                  <div className="flex items-center gap-1 mb-2">
                    <Flame className="w-3 h-3" style={{ color: '#FF6B00' }} />
                    <span className="text-[9px] font-black uppercase tracking-[0.12em]"
                      style={{ color: '#FF9D44' }}>
                      Listener-Only Pricing
                    </span>
                  </div>

                  {/* Row 1 — fake retail price (anchor) */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: '#4A3F60' }}>
                      Retail
                    </span>
                    <span
                      className="text-base font-bold"
                      style={{
                        color: '#4A3F60',
                        textDecoration: 'line-through',
                        textDecorationColor: '#FF555590',
                        textDecorationThickness: '2px',
                      }}
                    >
                      ${HOODIE.retail.toFixed(2)}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="h-px mb-1.5" style={{ background: '#1a0040' }} />

                  {/* Row 2 — exact store price */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" style={{ color: '#00DD88' }} />
                      <span className="text-[10px] font-black uppercase tracking-wide"
                        style={{ color: '#00DD88' }}>
                        Your Price
                      </span>
                    </div>
                    <span
                      className="font-black text-[26px] leading-none tabular-nums"
                      style={{ color: '#00FF99', textShadow: '0 0 18px #00FF9970' }}
                    >
                      ${HOODIE.price.toFixed(2)}
                    </span>
                  </div>

                  {/* You save row */}
                  <div className="flex items-center justify-end gap-1.5 mt-2">
                    <div
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                      style={{ background: 'linear-gradient(135deg, #002515, #003520)', border: '1px solid #00FF8822' }}
                    >
                      <span className="text-[9px] font-black" style={{ color: '#00FF88' }}>
                        ✓ YOU SAVE ${HOODIE_SAVE} ({HOODIE_PCT}% OFF)
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* ── Other products mini-row ────────────────────────────────────── */}
                <div className="flex items-center gap-1.5 mb-2.5">
                  {OTHER_PRODUCTS.map(p => (
                    <div
                      key={p.label}
                      className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg relative overflow-hidden"
                      style={{ background: '#0a0018', border: '1px solid #1a0040' }}
                    >
                      {/* Mini % badge */}
                      <div
                        className="absolute top-0 right-0 px-1 py-px rounded-bl-md"
                        style={{ background: '#FF2D55', fontSize: 7 }}
                      >
                        <span className="font-black text-white">{p.pct}%</span>
                      </div>
                      <span className="text-base leading-none">{p.emoji}</span>
                      <span className="text-[8px] font-semibold" style={{ color: '#7B6F90' }}>{p.label}</span>
                      <span className="text-[8px]" style={{
                        color: '#3D3055',
                        textDecoration: 'line-through',
                        textDecorationColor: '#FF555570',
                      }}>
                        ${p.retail.toFixed(2)}
                      </span>
                      <span className="text-[10px] font-black" style={{ color: '#C084FC' }}>
                        ${p.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* ── Countdown ─────────────────────────────────────────────────── */}
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl mb-3"
                  style={{
                    background: urgent ? '#1c0000' : '#070010',
                    border: `1px solid ${urgent ? '#FF444430' : '#140028'}`,
                  }}
                >
                  <Clock className="w-3 h-3 flex-shrink-0"
                    style={{ color: urgent ? '#FF8888' : '#9D00FF' }} />
                  <span className="text-[10px] flex-1"
                    style={{ color: urgent ? '#FF8888' : '#5B4F70' }}>
                    {urgent ? '⚠️ Offer ending soon!' : 'Listener price expires in'}
                  </span>
                  <span className="font-mono font-black text-sm tabular-nums"
                    style={{ color: urgent ? '#FF4444' : '#E0AAFF' }}>
                    {mins}:{secs}
                  </span>
                </div>

                {/* ── CTA ───────────────────────────────────────────────────────── */}
                <a
                  href={STORE_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={onDismiss}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-black text-white text-sm transition-all hover:scale-[1.02] hover:brightness-110"
                  style={{
                    background: urgent
                      ? 'linear-gradient(135deg, #FF2D55, #CC0033)'
                      : 'linear-gradient(135deg, #9D00FF, #C084FC)',
                    boxShadow: urgent ? '0 0 22px #FF2D5540' : '0 0 22px #9D00FF50',
                  }}
                >
                  Claim {HOODIE_PCT}% Off — ${HOODIE.price.toFixed(2)}
                  <ChevronRight className="w-4 h-4" />
                </a>

                <p className="text-center text-[9px] mt-1.5" style={{ color: '#2B2040' }}>
                  Ships worldwide · Unisex Classic Pullover Hoodie
                </p>
                <button
                  onClick={onDismiss}
                  className="block w-full text-center text-[10px] mt-0.5 pb-2 md:pb-0 transition-colors hover:text-[#5B4F70]"
                  style={{ color: '#2B2040' }}
                >
                  Not right now
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}