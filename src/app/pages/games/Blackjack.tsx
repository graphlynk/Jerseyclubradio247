import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Shirt, ChevronUp, ChevronDown, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createDeck, shuffle, bjHandValue, SUIT_SYMBOLS, SUIT_COLORS, type Card } from '../../utils/cards';
import { AdInterstitial } from '../../components/games/AdInterstitial';
import { MerchPopup } from '../../components/games/MerchPopup';
import { FlashSale } from '../../components/games/FlashSale';
import { Leaderboard } from '../../components/games/Leaderboard';
import { useGuestId } from '../../hooks/useGuestId';
import { useBPMPulse } from '../../hooks/useBPMPulse';
import { useSuperFan } from '../../hooks/useSuperFan';
import { usePlayer } from '../../context/PlayerContext';

type Phase = 'idle' | 'player' | 'dealer' | 'result';
type Result = 'win' | 'lose' | 'push' | 'blackjack' | null;

function CardView({ card, hidden = false, small = false }: { card: Card; hidden?: boolean; small?: boolean }) {
  const size = small ? 'w-10 h-14' : 'w-14 h-20';
  const textSize = small ? 'text-sm' : 'text-base';
  if (hidden) {
    return (
      <div className={`${size} rounded-lg flex items-center justify-center flex-shrink-0`}
        style={{ background: 'linear-gradient(135deg, #1a003a, #2a0060)', border: '1px solid #9D00FF40' }}>
        <span className="text-[#9D00FF] text-xl">♦</span>
      </div>
    );
  }
  const color = SUIT_COLORS[card.suit];
  const symbol = SUIT_SYMBOLS[card.suit];
  return (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      className={`${size} rounded-lg flex flex-col justify-between p-1.5 flex-shrink-0`}
      style={{ background: '#F8F0FF', border: `1.5px solid ${color}40` }}
    >
      <div className={`${textSize} font-black leading-none`} style={{ color }}>
        {card.value}<br /><span>{symbol}</span>
      </div>
      <div className={`${textSize} font-black leading-none text-right rotate-180`} style={{ color }}>
        {card.value}<br /><span>{symbol}</span>
      </div>
    </motion.div>
  );
}

function HandValue({ hand, hidden = false }: { hand: Card[]; hidden?: boolean }) {
  if (hidden) return null;
  const val = bjHandValue(hand);
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${val > 21 ? 'text-red-400 bg-red-900/30' : val === 21 ? 'text-yellow-300 bg-yellow-900/30' : 'text-[#C084FC] bg-[#1a003a]'}`}>
      {val > 21 ? `BUST (${val})` : val}
    </span>
  );
}

export function Blackjack() {
  const { profile, updateProfile } = useGuestId();
  const { isPlaying } = usePlayer();
  const { pulseStyle } = useBPMPulse(isPlaying);
  const { showFlashSale, dismissFlashSale } = useSuperFan();

  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<Result>(null);
  const [chips, setChips] = useState(1000);
  const [bet, setBet] = useState(50);
  const [handsPlayed, setHandsPlayed] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [showMerch, setShowMerch] = useState(false);
  const [winStreak, setWinStreak] = useState(0);
  const [resultMsg, setResultMsg] = useState('');

  const deal = useCallback(() => {
    if (chips < bet) return;
    const d = shuffle(createDeck());
    const p = [d[0], d[2]];
    const dl = [d[1], d[3]];
    setDeck(d.slice(4));
    setPlayerHand(p);
    setDealerHand(dl);
    setPhase('player');
    setResult(null);
    setResultMsg('');

    // Instant blackjack?
    if (bjHandValue(p) === 21) {
      setTimeout(() => resolveGame(p, dl, d.slice(4), true), 400);
    }
  }, [chips, bet]);

  const resolveGame = useCallback((ph: Card[], dh: Card[], dk: Card[], isBJ = false) => {
    let dHand = [...dh];
    let dk2 = [...dk];
    while (bjHandValue(dHand) < 17) {
      dHand = [...dHand, dk2[0]];
      dk2 = dk2.slice(1);
    }
    setDealerHand(dHand);
    setDeck(dk2);
    setPhase('result');

    const pv = bjHandValue(ph);
    const dv = bjHandValue(dHand);
    let res: Result;
    let msg = '';

    if (isBJ) { res = 'blackjack'; msg = '🎰 BLACKJACK! +' + Math.floor(bet * 1.5); }
    else if (pv > 21) { res = 'lose'; msg = '💥 BUST! -' + bet; }
    else if (dv > 21 || pv > dv) { res = 'win'; msg = '🏆 WIN! +' + bet; }
    else if (pv === dv) { res = 'push'; msg = '🤝 PUSH - bet returned'; }
    else { res = 'lose'; msg = '😤 DEALER WINS -' + bet; }

    setResult(res);
    setResultMsg(msg);

    const gain = res === 'blackjack' ? Math.floor(bet * 1.5) : res === 'win' ? bet : res === 'push' ? 0 : -bet;
    const newChips = chips + gain;
    setChips(newChips);

    const newHands = handsPlayed + 1;
    setHandsPlayed(newHands);

    if (res === 'win' || res === 'blackjack') {
      const newStreak = winStreak + 1;
      setWinStreak(newStreak);
      const newWins = (profile?.blackjackWins || 0) + 1;
      updateProfile({ blackjackWins: newWins, blackjackHighScore: Math.max(newChips, profile?.blackjackHighScore || 0) });
      if (newStreak >= 3) { setShowMerch(true); }
    } else if (res === 'lose') {
      setWinStreak(0);
      updateProfile({ blackjackHighScore: Math.max(newChips, profile?.blackjackHighScore || 0) });
    }

    // Ad every 3 hands
    if (newHands % 3 === 0) {
      setTimeout(() => setShowAd(true), 1200);
    }
  }, [chips, bet, handsPlayed, winStreak, profile, updateProfile]);

  const hit = useCallback(() => {
    if (phase !== 'player') return;
    const card = deck[0];
    const newHand = [...playerHand, card];
    const newDeck = deck.slice(1);
    setPlayerHand(newHand);
    setDeck(newDeck);
    if (bjHandValue(newHand) >= 21) {
      setTimeout(() => resolveGame(newHand, dealerHand, newDeck), 300);
    }
  }, [phase, deck, playerHand, dealerHand, resolveGame]);

  const stand = useCallback(() => {
    if (phase !== 'player') return;
    setPhase('dealer');
    setTimeout(() => resolveGame(playerHand, dealerHand, deck), 500);
  }, [phase, playerHand, dealerHand, deck, resolveGame]);

  const doubleDown = useCallback(() => {
    if (phase !== 'player' || playerHand.length !== 2 || chips < bet * 2) return;
    setBet(b => b * 2);
    const card = deck[0];
    const newHand = [...playerHand, card];
    const newDeck = deck.slice(1);
    setPlayerHand(newHand);
    setDeck(newDeck);
    setPhase('dealer');
    setTimeout(() => resolveGame(newHand, dealerHand, newDeck), 500);
  }, [phase, playerHand, dealerHand, deck, chips, bet, resolveGame]);

  const resultColor = { win: '#00FF88', blackjack: '#FFD700', push: '#9D00FF', lose: '#FF4444', null: 'transparent' }[result ?? 'null'];

  return (
    <div className="min-h-[calc(100vh-96px)] p-4 md:p-6" style={{ background: '#06000F' }}>
      <AdInterstitial visible={showAd} onClose={() => setShowAd(false)} />
      <MerchPopup visible={showMerch} onClose={() => setShowMerch(false)} streak={winStreak} />
      <FlashSale visible={showFlashSale} onDismiss={dismissFlashSale} />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/games" className="text-[#7B6F90] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-white">🃏 BLACKJACK</h1>
            <p className="text-[#5B4F70] text-xs">Single Player · Beat the dealer</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: '#1a003a' }}>
              <span className="text-[#9D00FF]">💰 </span>
              <span className="text-white font-mono">{chips.toLocaleString()}</span>
            </div>
            {winStreak >= 2 && (
              <div className="px-2 py-1 rounded-lg text-xs font-bold text-orange-400 animate-pulse"
                style={{ background: '#2a1000' }}>🔥 {winStreak}</div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Game Table */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl p-5 relative min-h-[480px] flex flex-col"
              style={{ ...pulseStyle('#1a5c2a', '#00FF88'), background: 'radial-gradient(ellipse at center, #0a2a12 0%, #04140a 100%)', border: '2px solid' }}>

              {/* Dealer */}
              <div className="flex-1 pb-4" style={{ borderBottom: '1px solid #1a4020' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-[#4ADE80] font-bold">DEALER</span>
                  {phase !== 'idle' && <HandValue hand={dealerHand} hidden={phase === 'player'} />}
                </div>
                <div className="flex gap-2 flex-wrap min-h-[80px]">
                  {dealerHand.map((c, i) => (
                    <CardView key={c.id} card={c} hidden={phase === 'player' && i === 1} />
                  ))}
                </div>
              </div>

              {/* CENTER BILLBOARD */}
              <div className="py-4 text-center">
                <AnimatePresence mode="wait">
                  {result ? (
                    <motion.div key="result"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      className="text-2xl font-black"
                      style={{ color: resultColor, textShadow: `0 0 30px ${resultColor}` }}>
                      {resultMsg}
                    </motion.div>
                  ) : (
                    <motion.div key="billboard" className="text-center">
                      <p className="text-[10px] font-bold tracking-[0.4em]" style={{ color: '#1a4020' }}>TABLE POWERED BY</p>
                      <p className="text-sm font-black" style={{ color: '#2a6030' }}>🎵 JERSEY 24/7 FM</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Player */}
              <div className="flex-1 pt-4" style={{ borderTop: '1px solid #1a4020' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-[#4ADE80] font-bold">YOU ({profile?.id ?? '…'})</span>
                  {phase !== 'idle' && <HandValue hand={playerHand} />}
                </div>
                <div className="flex gap-2 flex-wrap min-h-[80px]">
                  {playerHand.map(c => <CardView key={c.id} card={c} />)}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(phase === 'idle' || phase === 'result') && (
                <>
                  {/* Bet adjuster */}
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: '#0D001E', border: '1px solid #2a0060' }}>
                    <span className="text-xs text-[#7B6F90] flex-1">Bet</span>
                    <button onClick={() => setBet(b => Math.max(10, b - 10))}
                      className="w-6 h-6 rounded text-[#9D00FF] hover:bg-[#1a003a] flex items-center justify-center transition-colors">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-white font-mono font-bold w-14 text-center">{bet}</span>
                    <button onClick={() => setBet(b => Math.min(chips, b + 10))}
                      className="w-6 h-6 rounded text-[#9D00FF] hover:bg-[#1a003a] flex items-center justify-center transition-colors">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button onClick={deal} disabled={chips < bet}
                    className="py-2 rounded-xl font-black text-white text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #9D00FF, #FF0080)', boxShadow: '0 0 16px #9D00FF60' }}>
                    {chips === 0 ? 'OUT OF CHIPS' : phase === 'result' ? 'NEW HAND' : 'DEAL'}
                  </button>
                </>
              )}
              {phase === 'player' && (
                <>
                  <button onClick={hit}
                    className="py-3 rounded-xl font-black text-white text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #1a5c2a, #00AA44)' }}>HIT</button>
                  <button onClick={stand}
                    className="py-3 rounded-xl font-black text-white text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: 'linear-gradient(135deg, #5c1a00, #CC4400)' }}>STAND</button>
                  <button onClick={doubleDown} disabled={playerHand.length !== 2 || chips < bet * 2}
                    className="col-span-2 py-2 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] disabled:opacity-40"
                    style={{ background: '#1a003a', color: '#9D00FF', border: '1px solid #9D00FF40' }}>
                    DOUBLE DOWN (bet ×2)
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Stats */}
            <div className="rounded-2xl p-4" style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
              <p className="text-xs font-bold text-[#5B4F70] tracking-widest mb-3">YOUR STATS</p>
              {[
                { label: 'Chips', value: chips.toLocaleString(), color: '#FFD700' },
                { label: 'Wins', value: profile?.blackjackWins ?? 0 },
                { label: 'Best', value: (profile?.blackjackHighScore ?? 0).toLocaleString() },
                { label: 'Streak 🔥', value: winStreak },
                { label: 'Hands', value: handsPlayed },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-[#0F0022] last:border-0">
                  <span className="text-xs text-[#7B6F90]">{label}</span>
                  <span className="text-xs font-bold font-mono" style={{ color: color || '#C084FC' }}>{value}</span>
                </div>
              ))}
            </div>

            <Leaderboard profile={profile} />

            {/* Merch button */}
            <a href="https://jerseyclub247.com/shop" target="_blank" rel="noreferrer"
              className="flex items-center gap-2 justify-center w-full py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #2a0060, #1a003a)', border: '1px solid #9D00FF40' }}>
              <Shirt className="w-4 h-4 text-[#9D00FF]" />
              Shop the Look
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
