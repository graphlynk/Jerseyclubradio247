import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Shirt, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createDeck, shuffle, SUIT_SYMBOLS, SUIT_COLORS, type Card, type Suit } from '../../utils/cards';
import { AdInterstitial } from '../../components/games/AdInterstitial';
import { MerchPopup } from '../../components/games/MerchPopup';
import { FlashSale } from '../../components/games/FlashSale';
import { Leaderboard } from '../../components/games/Leaderboard';
import { MatchmakingLobby, type SpadesRoom } from '../../components/games/MatchmakingLobby';
import { useGuestId } from '../../hooks/useGuestId';
import { useBPMPulse } from '../../hooks/useBPMPulse';
import { useSuperFan } from '../../hooks/useSuperFan';
import { usePlayer } from '../../context/PlayerContext';
import { getHumanDelay } from '../../data/jerseyLegends';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-715f71b9`;
const HEADERS = { Authorization: `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' };

type Phase = 'idle' | 'matching' | 'bidding' | 'playing' | 'trick_over' | 'round_over' | 'game_over';

// ─── Game logic helpers ───────────────────────────────────────────────────────
function canPlay(card: Card, hand: Card[], leadSuit: Suit | null, broken: boolean): boolean {
  if (!leadSuit) {
    if (card.suit === 'spades' && !broken) return hand.every(c => c.suit === 'spades');
    return true;
  }
  const hasSuit = hand.some(c => c.suit === leadSuit);
  return hasSuit ? card.suit === leadSuit : true;
}

function trickWinner(trick: { player: number; card: Card }[], leadSuit: Suit): number {
  let best = trick[0];
  for (const t of trick.slice(1)) {
    const bestSpade = best.card.suit === 'spades';
    const curSpade = t.card.suit === 'spades';
    if (curSpade && !bestSpade) { best = t; continue; }
    if (!curSpade && bestSpade) continue;
    if (t.card.suit === best.card.suit && t.card.numericValue > best.card.numericValue) best = t;
  }
  return best.player;
}

function aiBid(hand: Card[]): number {
  let b = 0;
  for (const c of hand) {
    if (c.suit === 'spades') b++;
    else if (c.numericValue >= 13) b++;
    else if (c.numericValue === 12) b += 0.5;
  }
  return Math.max(1, Math.round(b));
}

function proBid(hand: Card[]): number {
  let b = 0;
  for (const c of hand) {
    if (c.suit === 'spades' && c.numericValue >= 12) b += 1;
    else if (c.suit === 'spades') b += 0.7;
    else if (c.numericValue === 14) b += 0.9;
    else if (c.numericValue === 13) b += 0.6;
  }
  return Math.max(1, Math.round(b));
}

function aiPlay(hand: Card[], trick: { player: number; card: Card }[], leadSuit: Suit | null, broken: boolean, teamMate: number): Card {
  const playable = hand.filter(c => canPlay(c, hand, leadSuit, broken));
  if (!leadSuit) {
    const nonSpades = playable.filter(c => c.suit !== 'spades');
    const pool = nonSpades.length > 0 ? nonSpades : playable;
    return pool.reduce((hi, c) => c.numericValue > hi.numericValue ? c : hi);
  }
  const suitCards = playable.filter(c => c.suit === leadSuit);
  if (suitCards.length > 0) {
    const partnerWinning = trick.some(t => t.player === teamMate) && trickWinner(trick, leadSuit) === teamMate;
    if (partnerWinning) return suitCards.reduce((lo, c) => c.numericValue < lo.numericValue ? c : lo);
    const winners = suitCards.filter(c => trick.every(t => t.card.suit !== leadSuit || c.numericValue > t.card.numericValue));
    if (winners.length > 0) return winners.reduce((lo, c) => c.numericValue < lo.numericValue ? c : lo);
    return suitCards.reduce((lo, c) => c.numericValue < lo.numericValue ? c : lo);
  }
  const partnerWinning = trick.some(t => t.player === teamMate) && trick.length > 0 && trickWinner(trick, leadSuit) === teamMate;
  const spades = playable.filter(c => c.suit === 'spades');
  if (partnerWinning || spades.length === 0) return playable.reduce((lo, c) => c.numericValue < lo.numericValue ? c : lo);
  return spades.reduce((lo, c) => c.numericValue < lo.numericValue ? c : lo);
}

function proPlay(hand: Card[], trick: { player: number; card: Card }[], leadSuit: Suit | null, broken: boolean, teamMate: number): Card {
  const playable = hand.filter(c => canPlay(c, hand, leadSuit, broken));
  if (!leadSuit) {
    const nonSpades = playable.filter(c => c.suit !== 'spades');
    const pool = nonSpades.length > 0 ? nonSpades : playable;
    return pool.reduce((hi, c) => c.numericValue > hi.numericValue ? c : hi);
  }
  const partnerWinning = trick.some(t => t.player === teamMate) && trick.length > 0 && trickWinner(trick, leadSuit) === teamMate;
  const suitCards = playable.filter(c => c.suit === leadSuit);
  if (suitCards.length > 0) {
    if (partnerWinning) return suitCards.reduce((lo, c) => c.numericValue < lo.numericValue ? c : lo);
    return suitCards.reduce((hi, c) => c.numericValue > hi.numericValue ? c : hi);
  }
  const spades = playable.filter(c => c.suit === 'spades');
  if (spades.length > 0 && !partnerWinning) return spades.reduce((lo, c) => c.numericValue < lo.numericValue ? c : lo);
  return playable.reduce((lo, c) => c.numericValue < lo.numericValue ? c : lo);
}

function roundScore(bid: number, won: number): number {
  if (won >= bid) return bid * 10 + (won - bid);
  return -bid * 10;
}

// ─── Card display components ──────────────────────────────────────────────────
function SmallCard({ card, small }: { card: Card; small?: boolean }) {
  const color = SUIT_COLORS[card.suit];
  const sz = small ? 'w-8 h-11 text-xs p-1' : 'w-11 h-16 text-sm p-1.5';
  return (
    <div className={`${sz} rounded flex flex-col justify-between flex-shrink-0`}
      style={{ background: '#F5EDFF', border: `1.5px solid ${color}60` }}>
      <span className="font-black leading-none" style={{ color }}>{card.value}{SUIT_SYMBOLS[card.suit]}</span>
      <span className="font-black leading-none text-right rotate-180" style={{ color }}>{card.value}{SUIT_SYMBOLS[card.suit]}</span>
    </div>
  );
}

function CardBack({ small }: { small?: boolean }) {
  const sz = small ? 'w-8 h-11' : 'w-11 h-16';
  return (
    <div className={`${sz} rounded flex items-center justify-center`}
      style={{ background: 'linear-gradient(135deg, #1a003a, #2a0060)', border: '1px solid #9D00FF40' }}>
      <span className="text-[#9D00FF] text-sm">♦</span>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export function Spades() {
  const { profile, updateProfile } = useGuestId();
  const { isPlaying } = usePlayer();
  const { pulseStyle } = useBPMPulse(isPlaying);
  const { showFlashSale, dismissFlashSale } = useSuperFan();

  // ── Matchmaking & boss state
  const [room, setRoom] = useState<SpadesRoom | null>(null);
  const [isBossMode, setIsBossMode] = useState(false);
  const [weeklyBoss, setWeeklyBoss] = useState<{ name: string; tagline: string } | null>(null);
  const [bossVictory, setBossVictory] = useState<{ discount: string; bossName: string } | null>(null);
  const [bossConsecWins, setBossConsecWins] = useState(0);
  const [hotSwapMsg, setHotSwapMsg] = useState('');

  // ── Game state
  const [phase, setPhase] = useState<Phase>('idle');
  const [hands, setHands] = useState<Card[][]>([[], [], [], []]);
  const [bids, setBids] = useState([0, 0, 0, 0]);
  const [bidding, setBidding] = useState(0);
  const [playerBid, setPlayerBid] = useState(3);
  const [trick, setTrick] = useState<{ player: number; card: Card }[]>([]);
  const [leadSuit, setLeadSuit] = useState<Suit | null>(null);
  const [broken, setBroken] = useState(false);
  const [tricksWon, setTricksWon] = useState([0, 0, 0, 0]);
  const [scores, setScores] = useState([0, 0]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [handsPlayed, setHandsPlayed] = useState(0);
  const [hotStreak, setHotStreak] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [showMerch, setShowMerch] = useState(false);
  const [round, setRound] = useState(0);
  const [lastWinner, setLastWinner] = useState(-1);
  const [roundMsg, setRoundMsg] = useState('');
  const [thinkingPlayer, setThinkingPlayer] = useState(-1);

  // All player names — visually identical CSS class for every name
  const playerNames = useMemo(() => {
    if (!room) return ['YOU', 'Player 2', 'Player 3', 'Player 4'];
    return room.players.sort((a, b) => a.seat - b.seat).map((p, i) => i === 0 ? 'YOU' : p.name);
  }, [room]);
  const otherNames = playerNames.slice(1);
  const accentColor = isBossMode ? '#FF4444' : '#9D00FF';

  // Track which players are system-filled (internal only — never exposed visually)
  const systemPlayers = useMemo(() => {
    if (!room) return new Set<number>();
    return new Set(room.players.filter(p => p.isBot).map(p => p.seat));
  }, [room]);

  // Fetch weekly boss
  useEffect(() => {
    fetch(`${BASE}/spades/boss`, { headers: HEADERS })
      .then(r => r.json()).then(setWeeklyBoss).catch(() => {});
  }, []);

  // Hot-swap polling during game
  useEffect(() => {
    if (!room?.id || phase === 'idle' || phase === 'matching' || phase === 'game_over') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BASE}/spades/room/${room.id}`, { headers: HEADERS });
        if (!res.ok) return;
        const updated: SpadesRoom = await res.json();
        const swapped = updated.players.find(p =>
          !p.isBot && p.seat !== 0 && !room.players.find(rp => rp.guestId === p.guestId)
        );
        if (swapped) {
          setHotSwapMsg(`${swapped.name} joined the table!`);
          setRoom(updated);
          setTimeout(() => setHotSwapMsg(''), 4000);
        }
      } catch {}
    }, 15_000);
    return () => clearInterval(interval);
  }, [room, phase]);

  const handleRoomReady = (r: SpadesRoom) => {
    setRoom(r);
    setIsBossMode(r.isBossGame);
    dealRound();
  };

  const dealRound = useCallback(() => {
    const d = shuffle(createDeck());
    setHands([d.slice(0, 13), d.slice(13, 26), d.slice(26, 39), d.slice(39, 52)]);
    setBids([0, 0, 0, 0]); setTricksWon([0, 0, 0, 0]);
    setTrick([]); setLeadSuit(null); setBroken(false);
    setBidding(0); setCurrentPlayer(0); setLastWinner(-1);
    setPhase('bidding'); setPlayerBid(3); setThinkingPlayer(-1);
  }, []);

  // System player bidding — with human-like delay (2000-5000ms)
  useEffect(() => {
    if (phase !== 'bidding' || bidding === 0) return;
    setThinkingPlayer(bidding);
    const delay = getHumanDelay();
    const t = setTimeout(() => {
      const b = (isBossMode && (bidding === 1 || bidding === 3)) ? proBid(hands[bidding]) : aiBid(hands[bidding]);
      setBids(prev => { const n = [...prev]; n[bidding] = b; return n; });
      setThinkingPlayer(-1);
      setBidding(prev => { if (prev === 3) { setPhase('playing'); setCurrentPlayer(0); return 0; } return prev + 1; });
    }, delay);
    return () => clearTimeout(t);
  }, [phase, bidding, hands, isBossMode]);

  const playCard = useCallback((card: Card, player: number) => {
    const newTrick = [...trick, { player, card }];
    const newHands = hands.map((h, i) => i === player ? h.filter(c => c.id !== card.id) : h);
    const newBroken = broken || card.suit === 'spades';
    const newLeadSuit = (trick.length === 0 ? card.suit : leadSuit) as Suit;
    setHands(newHands as Card[][]); setTrick(newTrick); setBroken(newBroken);
    if (trick.length === 0) setLeadSuit(card.suit as Suit);
    if (newTrick.length === 4) {
      const winner = trickWinner(newTrick, newLeadSuit);
      setLastWinner(winner);
      const nTW = [...tricksWon]; nTW[winner]++;
      setTricksWon(nTW); setPhase('trick_over');
      setTimeout(() => {
        setTrick([]); setLeadSuit(null);
        if (nTW.reduce((a, b) => a + b, 0) === 13) endRound(nTW, newHands as Card[][]);
        else { setCurrentPlayer(winner); setPhase('playing'); }
      }, 1200);
    } else { setCurrentPlayer((player + 1) % 4); }
  }, [trick, hands, broken, leadSuit, tricksWon]);

  const endRound = useCallback((tw: number[], _h: Card[][]) => {
    const t1 = roundScore(bids[0] + bids[2], tw[0] + tw[2]);
    const t2 = roundScore(bids[1] + bids[3], tw[1] + tw[3]);
    const ns = [scores[0] + t1, scores[1] + t2];
    setScores(ns);
    const newHP = handsPlayed + 1; setHandsPlayed(newHP);
    const won = t1 > t2;
    setRoundMsg(won ? `YOUR TEAM: +${t1} | Opponents: ${t2 > 0 ? '+' : ''}${t2}` : `OPPONENTS: +${t2} | Your team: ${t1 > 0 ? '+' : ''}${t1}`);
    setRound(r => r + 1);
    if (won) {
      const ns2 = hotStreak + 1; setHotStreak(ns2);
      updateProfile({ spadesWins: (profile?.spadesWins || 0) + 1 });
      if (ns2 >= 3) setShowMerch(true);
      if (isBossMode) {
        const nb = bossConsecWins + 1; setBossConsecWins(nb);
        if (nb >= 3) {
          fetch(`${BASE}/spades/boss/victory`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ guestId: profile?.id }) })
            .then(r => r.json()).then(d => { setBossVictory({ discount: d.discount, bossName: d.boss }); setShowMerch(true); }).catch(() => {});
        }
      }
      if (profile?.id) fetch(`${BASE}/ticker/event`, { method: 'POST', headers: HEADERS, body: JSON.stringify({ message: `🃏 ${profile.id} won a Spades hand!` }) }).catch(() => {});
    } else { setHotStreak(0); setBossConsecWins(0); updateProfile({ spadesLosses: (profile?.spadesLosses || 0) + 1 }); }
    if (ns[0] >= 500 || ns[1] >= 500 || ns[0] <= -200 || ns[1] <= -200) { setPhase('game_over'); return; }
    setPhase('round_over');
    if (newHP % 3 === 0) setTimeout(() => setShowAd(true), 800);
  }, [bids, scores, handsPlayed, hotStreak, profile, updateProfile, isBossMode, bossConsecWins]);

  // System player auto-play — with human-like delay (2000-5000ms)
  useEffect(() => {
    if (phase !== 'playing' || currentPlayer === 0) return;
    // Only auto-play for system-filled players
    if (!systemPlayers.has(currentPlayer)) return;
    setThinkingPlayer(currentPlayer);
    const delay = getHumanDelay();
    const t = setTimeout(() => {
      const hand = hands[currentPlayer];
      if (!hand?.length) return;
      const mate = [2, 3, 0, 1][currentPlayer];
      const card = (isBossMode && (currentPlayer === 1 || currentPlayer === 3))
        ? proPlay(hand, trick, leadSuit, broken, mate)
        : aiPlay(hand, trick, leadSuit, broken, mate);
      setThinkingPlayer(-1);
      playCard(card, currentPlayer);
    }, delay);
    return () => clearTimeout(t);
  }, [phase, currentPlayer, hands, trick, leadSuit, broken, playCard, isBossMode, systemPlayers]);

  const validCards = useMemo(() => {
    if (phase !== 'playing' || currentPlayer !== 0) return new Set<string>();
    return new Set(hands[0].filter(c => canPlay(c, hands[0], leadSuit, broken)).map(c => c.id));
  }, [phase, currentPlayer, hands, leadSuit, broken]);

  const trickCardFor = (p: number) => trick.find(t => t.player === p)?.card;

  const resetGame = () => {
    setPhase('idle'); setRoom(null); setScores([0, 0]); setRound(0);
    setHandsPlayed(0); setHotStreak(0); setBossConsecWins(0); setBossVictory(null);
    setThinkingPlayer(-1);
  };

  return (
    <div className="min-h-[calc(100vh-96px)] p-4 md:p-6" style={{ background: '#06000F' }}>
      <AdInterstitial visible={showAd} onClose={() => setShowAd(false)} />
      <MerchPopup visible={showMerch} onClose={() => setShowMerch(false)} streak={hotStreak} />
      <FlashSale visible={showFlashSale} onDismiss={dismissFlashSale} />

      {/* Hot-swap toast */}
      <AnimatePresence>
        {hotSwapMsg && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ background: '#1a3a00', border: '1px solid #00FF88', boxShadow: '0 0 20px #00FF8860' }}>
            {hotSwapMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Matchmaking lobby */}
      {phase === 'matching' && profile && (
        <MatchmakingLobby guestId={profile.id} guestName={profile.id}
          isBossMode={isBossMode} onRoomReady={handleRoomReady} onCancel={() => setPhase('idle')} />
      )}

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-5">
          <Link to="/games" className="text-[#7B6F90] hover:text-white transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h1 className="text-xl font-black text-white">♠️ SPADES</h1>
            <p className="text-[#5B4F70] text-xs">{isBossMode ? `Beat ${room?.bossName ?? 'the Boss'} 3 hands in a row → merch discount` : 'You + Partner vs Opponents · First to 500'}</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl" style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
              <span style={{ color: accentColor }}>YOU: </span><span className="text-white font-mono font-bold">{scores[0]}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl" style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
              <span className="text-[#FF4444]">OPP: </span><span className="text-white font-mono font-bold">{scores[1]}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">

            {/* ── IDLE ─────────────────────────────────────────────────────── */}
            {phase === 'idle' && (
              <div className="space-y-4">
                {/* Standard */}
                <div className="rounded-2xl p-6 text-center" style={{ background: '#0D001E', border: '2px solid #9D00FF40' }}>
                  <div className="text-4xl mb-2">♠️</div>
                  <h3 className="text-xl font-black text-white mb-1">STANDARD SPADES</h3>
                  <p className="text-[#C084FC] text-xs mb-4 font-semibold" style={{ textShadow: '0 0 10px #9D00FF80, 0 0 20px #9D00FF40' }}>Enter matchmaking. Real players fill in first — Jersey Legends fill remaining seats after 10 seconds.</p>
                  <div className="flex flex-col sm:flex-row justify-center gap-2 mb-5 text-[10px]">
                    {['0–10s: Search live players', '10s: Legends take open seats', 'Game starts immediately'].map((s, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[#5B4F70] justify-center">
                        <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0" style={{ background: '#9D00FF', color: '#fff' }}>{i + 1}</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { setIsBossMode(false); setPhase('matching'); }}
                    className="px-8 py-3 rounded-xl font-black text-white transition-all hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #9D00FF, #FF0080)', boxShadow: '0 0 20px #9D00FF60' }}>
                    FIND A TABLE →
                  </button>
                </div>

                {/* Boss Mode */}
                {weeklyBoss && (
                  <div className="rounded-2xl p-6 text-center relative overflow-hidden" style={{ background: '#1a0000', border: '2px solid #FF444440' }}>
                    <div className="relative">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Crown className="w-4 h-4 text-[#FFD700]" />
                        <span className="text-[10px] font-black tracking-widest text-[#FFD700]">WEEKLY BOSS EVENT</span>
                        <Crown className="w-4 h-4 text-[#FFD700]" />
                      </div>
                      <div className="text-4xl mb-2">👑</div>
                      <h3 className="text-xl font-black text-white mb-1">{weeklyBoss.name}</h3>
                      <p className="text-xs text-[#FF8888] mb-1 italic">"{weeklyBoss.tagline}"</p>
                      <p className="text-[#7B6F90] text-xs mb-1">Jersey vs. The Machine</p>
                      <p className="text-[#5B4F70] text-[10px] mb-4">Win 3 consecutive hands → unlock a unique merch discount code</p>
                      <button onClick={() => { setIsBossMode(true); setPhase('matching'); }}
                        className="px-8 py-3 rounded-xl font-black text-white transition-all hover:scale-[1.02]"
                        style={{ background: 'linear-gradient(135deg, #FF4444, #CC0000)', boxShadow: '0 0 20px #FF444460' }}>
                        CHALLENGE THE BOSS →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── GAME OVER ────────────────────────────────────────────────── */}
            {phase === 'game_over' && (
              <div className="rounded-2xl p-8 text-center" style={{ background: '#0D001E', border: '2px solid #9D00FF40' }}>
                {bossVictory ? (
                  <>
                    <div className="text-5xl mb-3">🏆</div>
                    <p className="text-3xl font-black mb-2 text-[#FFD700]">BOSS DEFEATED!</p>
                    <p className="text-[#FF8888] mb-3">{bossVictory.bossName} has fallen</p>
                    <div className="px-4 py-3 rounded-xl mb-4 inline-block" style={{ background: '#1a3a00', border: '1px solid #00FF88' }}>
                      <p className="text-xs text-[#4ADE80] mb-1">Your Merch Discount Code:</p>
                      <p className="text-2xl font-black text-[#00FF88] font-mono">{bossVictory.discount}</p>
                      <p className="text-[10px] text-[#3B2F50] mt-1">Valid at jerseyclub247.com/shop</p>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-4xl font-black mb-2" style={{ color: scores[0] >= 500 ? '#00FF88' : '#FF4444' }}>
                      {scores[0] >= 500 ? '🏆 YOUR TEAM WINS!' : '💀 GAME OVER'}
                    </p>
                    <p className="text-[#7B6F90] text-sm">Final: You {scores[0]} — Opponents {scores[1]}</p>
                  </>
                )}
                <p className="text-[#5B4F70] text-xs mb-5">{hotStreak > 0 ? `🔥 ${hotStreak}-win streak` : ''}</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button onClick={resetGame} className="px-6 py-2.5 rounded-xl font-black text-white"
                    style={{ background: 'linear-gradient(135deg, #9D00FF, #FF0080)' }}>PLAY AGAIN</button>
                  {isBossMode && !bossVictory && (
                    <button onClick={() => { resetGame(); setTimeout(() => { setIsBossMode(true); setPhase('matching'); }, 100); }}
                      className="px-6 py-2.5 rounded-xl font-black text-white"
                      style={{ background: 'linear-gradient(135deg, #FF4444, #CC0000)' }}>REMATCH BOSS</button>
                  )}
                </div>
              </div>
            )}

            {/* ── BIDDING ──────────────────────────────────────────────────── */}
            {phase === 'bidding' && (
              <div className="rounded-2xl p-6 text-center" style={{ background: '#0D001E', border: `2px solid ${accentColor}40` }}>
                <p className="text-xs font-bold tracking-widest mb-4" style={{ color: accentColor }}>BIDDING PHASE</p>
                <div className="flex justify-center gap-4 mb-6">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="text-center">
                      {/* All player names use identical CSS class */}
                      <p className="text-[10px] text-[#C084FC] font-bold mb-1">{playerNames[i]}</p>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2"
                        style={{
                          borderColor: bidding === i ? accentColor : bids[i] > 0 ? '#4ADE80' : '#2a0060',
                          color: bidding === i ? '#fff' : bids[i] > 0 ? '#4ADE80' : '#3B2F50',
                          animation: bidding === i ? 'pulse 1s infinite' : undefined,
                        }}>
                        {bids[i] > 0 ? bids[i] : bidding === i ? '…' : '?'}
                      </div>
                      {/* Thinking indicator — same for everyone */}
                      {thinkingPlayer === i && (
                        <p className="text-[8px] mt-0.5 text-[#9D00FF] animate-pulse">thinking...</p>
                      )}
                    </div>
                  ))}
                </div>
                {bidding === 0 && (
                  <>
                    <p className="text-white text-sm mb-3">Your hand — how many tricks will you take?</p>
                    <div className="flex items-center gap-4 justify-center mb-4">
                      <button onClick={() => setPlayerBid(b => Math.max(0, b - 1))}
                        className="w-10 h-10 rounded-full border hover:bg-[#1a003a] transition-colors text-xl font-bold"
                        style={{ color: accentColor, borderColor: accentColor }}>−</button>
                      <span className="text-4xl font-black text-white w-12 text-center">{playerBid}</span>
                      <button onClick={() => setPlayerBid(b => Math.min(13, b + 1))}
                        className="w-10 h-10 rounded-full border hover:bg-[#1a003a] transition-colors text-xl font-bold"
                        style={{ color: accentColor, borderColor: accentColor }}>+</button>
                    </div>
                    <button onClick={() => { setBids(prev => { const n = [...prev]; n[0] = playerBid; return n; }); setBidding(1); }}
                      className="px-6 py-2.5 rounded-xl font-black text-white"
                      style={{ background: `linear-gradient(135deg, ${accentColor}, #FF0080)` }}>
                      CONFIRM BID: {playerBid}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── PLAYING / TRICK OVER ─────────────────────────────────────── */}
            {(phase === 'playing' || phase === 'trick_over') && (
              <div className="rounded-2xl relative overflow-hidden"
                style={{
                  ...pulseStyle(isBossMode ? '#3a0000' : '#1a5c2a', isBossMode ? '#FF4444' : '#00FF88'),
                  background: isBossMode ? 'radial-gradient(ellipse at center,#2a0000,#100008)' : 'radial-gradient(ellipse at center,#0a2a12,#04140a)',
                  border: '2px solid', minHeight: 420,
                }}>

                {isBossMode && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[9px]"
                    style={{ background: '#3a0000', border: '1px solid #FF444430' }}>
                    <Crown className="w-3 h-3 text-[#FF4444]" />
                    <span className="text-[#FF4444] font-bold">WIN {3 - bossConsecWins} MORE HANDS TO WIN</span>
                  </div>
                )}

                {/* Partner (top) — identical styling */}
                <div className="flex flex-col items-center pt-4">
                  <p className="text-[10px] font-bold mb-1 text-[#C084FC]">
                    {otherNames[1]} (Partner) · Bid {bids[2]} · Won {tricksWon[2]}
                    {thinkingPlayer === 2 && <span className="ml-1 animate-pulse text-[#9D00FF]">💭</span>}
                  </p>
                  <div className="flex gap-1">{Array.from({ length: hands[2].length }).map((_, i) => <CardBack key={i} small />)}</div>
                  {trickCardFor(2) && <div className="mt-2"><SmallCard card={trickCardFor(2)!} /></div>}
                </div>

                {/* Middle row */}
                <div className="flex items-center justify-between px-6 py-2">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[10px] font-bold text-[#C084FC]">
                      {otherNames[0]} · {bids[1]}/{tricksWon[1]}
                      {thinkingPlayer === 1 && <span className="ml-1 animate-pulse text-[#9D00FF]">💭</span>}
                    </p>
                    <div className="flex flex-col gap-1">{Array.from({ length: Math.min(hands[1].length, 4) }).map((_, i) => <CardBack key={i} small />)}</div>
                    {trickCardFor(1) && <SmallCard card={trickCardFor(1)!} />}
                  </div>

                  <div className="flex flex-col items-center text-center px-4">
                    <AnimatePresence mode="wait">
                      {phase === 'trick_over' && lastWinner >= 0 ? (
                        <motion.div key="w" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <p className="font-black text-sm" style={{ color: lastWinner === 0 ? '#00FF88' : lastWinner === 2 ? '#4ADE80' : '#FF4444' }}>
                            {lastWinner === 0 ? 'YOU WIN TRICK!' : lastWinner === 2 ? 'PARTNER WINS!' : `${playerNames[lastWinner]} WINS`}
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div key="b">
                          <p className="text-[9px] tracking-widest" style={{ color: isBossMode ? '#3a0000' : '#1a4020' }}>POWERED BY</p>
                          <p className="text-xs font-black" style={{ color: isBossMode ? '#5a0000' : '#2a6030' }}>🎵 JERSEY 24/7</p>
                          <p className="text-[9px] mt-1" style={{ color: isBossMode ? '#3a0000' : '#1a3020' }}>Trick {tricksWon.reduce((a, b) => a + b, 0) + 1}/13</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[10px] font-bold text-[#C084FC]">
                      {otherNames[2]} · {bids[3]}/{tricksWon[3]}
                      {thinkingPlayer === 3 && <span className="ml-1 animate-pulse text-[#9D00FF]">💭</span>}
                    </p>
                    <div className="flex flex-col gap-1">{Array.from({ length: Math.min(hands[3].length, 4) }).map((_, i) => <CardBack key={i} small />)}</div>
                    {trickCardFor(3) && <SmallCard card={trickCardFor(3)!} />}
                  </div>
                </div>

                {trickCardFor(0) && <div className="flex justify-center mb-1"><SmallCard card={trickCardFor(0)!} /></div>}

                <div className="px-4 pb-4" style={{ borderTop: `1px solid ${isBossMode ? '#3a0010' : '#1a4020'}` }}>
                  <div className="flex items-center gap-2 py-2">
                    <span className="text-[10px] font-bold text-[#C084FC]">
                      YOU · Bid {bids[0]} · Won {tricksWon[0]}
                    </span>
                    {currentPlayer === 0 && phase === 'playing' && (
                      <span className="ml-auto text-[10px] animate-pulse font-bold" style={{ color: accentColor }}>YOUR TURN ♠</span>
                    )}
                  </div>
                  <div className="flex gap-1 flex-wrap justify-center">
                    {hands[0].map(card => {
                      const valid = validCards.has(card.id);
                      return (
                        <button key={card.id} onClick={() => valid && playCard(card, 0)} disabled={!valid}
                          className={`transition-all duration-150 ${valid ? 'hover:-translate-y-2 hover:scale-105 cursor-pointer' : 'opacity-30 cursor-not-allowed'}`}>
                          <SmallCard card={card} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── ROUND OVER ───────────────────────────────────────────────── */}
            {phase === 'round_over' && (
              <div className="rounded-2xl p-6 text-center" style={{ background: '#0D001E', border: '2px solid #4ADE80' }}>
                <p className="text-[#4ADE80] font-black text-lg mb-2">ROUND {round} COMPLETE</p>
                <p className="text-[#C084FC] text-sm mb-2">{roundMsg}</p>
                {isBossMode && bossConsecWins > 0 && (
                  <div className="mb-3 px-3 py-2 rounded-xl inline-block" style={{ background: '#1a3a00', border: '1px solid #00FF88' }}>
                    <p className="text-[#00FF88] text-sm font-bold">🔥 {bossConsecWins}/3 — {3 - bossConsecWins} more to win!</p>
                  </div>
                )}
                <p className="text-white font-bold mb-4">Score: You {scores[0]} — Opponents {scores[1]}</p>
                <button onClick={dealRound} className="px-6 py-2.5 rounded-xl font-black text-white"
                  style={{ background: `linear-gradient(135deg, ${accentColor}, #FF0080)` }}>NEXT ROUND</button>
              </div>
            )}
          </div>

          {/* ── Sidebar ──────────────────────────────────────────────────────── */}
          <div className="space-y-4">
            {/* Table Room — all players identical styling */}
            {room && (
              <div className="rounded-2xl p-3" style={{ background: '#0D001E', border: `1px solid ${accentColor}30` }}>
                <p className="text-[9px] font-bold tracking-widest mb-2" style={{ color: accentColor }}>TABLE ROOM</p>
                {room.players.sort((a, b) => a.seat - b.seat).map(p => (
                  <div key={p.seat} className="flex items-center gap-2 text-[10px] py-0.5">
                    <span>👤</span>
                    <span className="text-[#C084FC] font-bold">{p.seat === 0 ? 'YOU' : p.name}</span>
                    {thinkingPlayer === p.seat && (
                      <span className="ml-auto text-[#9D00FF] text-[8px] animate-pulse">thinking...</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl p-4" style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
              <p className="text-xs font-bold text-[#5B4F70] tracking-widest mb-3">STATS</p>
              {[
                { label: 'Team Score', value: scores[0], color: accentColor },
                { label: 'Opponent', value: scores[1], color: '#FF4444' },
                { label: 'Round', value: round },
                { label: 'Total Wins', value: profile?.spadesWins ?? 0 },
                { label: 'Hot Streak 🔥', value: hotStreak },
                ...(isBossMode ? [{ label: 'Boss Progress', value: `${bossConsecWins}/3`, color: '#FF4444' }] : []),
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between py-1.5 border-b border-[#0F0022] last:border-0">
                  <span className="text-xs text-[#7B6F90]">{label}</span>
                  <span className="text-xs font-bold font-mono" style={{ color: (color as string) || '#C084FC' }}>{value}</span>
                </div>
              ))}
            </div>

            {phase !== 'idle' && phase !== 'matching' && (
              <div className="rounded-2xl p-4" style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
                <p className="text-xs font-bold text-[#5B4F70] tracking-widest mb-3">BIDS THIS ROUND</p>
                {playerNames.map((name, i) => (
                  <div key={name} className="flex justify-between py-1.5 border-b border-[#0F0022] last:border-0">
                    {/* Same CSS class for all player names */}
                    <span className="text-xs text-[#C084FC] font-bold">{name}</span>
                    <span className="text-xs font-mono text-[#C084FC]">{bids[i]}/{tricksWon[i]}</span>
                  </div>
                ))}
              </div>
            )}

            <Leaderboard profile={profile} />
            <a href="https://jerseyclub247.com/shop" target="_blank" rel="noreferrer"
              className="flex items-center gap-2 justify-center w-full py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #2a0060, #1a003a)', border: '1px solid #9D00FF40' }}>
              <Shirt className="w-4 h-4 text-[#9D00FF]" />Shop the Look
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}