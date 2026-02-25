import React from 'react';
import { Link } from 'react-router';
import { motion } from 'motion/react';
import { Spade, Hash, PuzzleIcon, Trophy, Users, User, Zap, Shirt, Music, Film } from 'lucide-react';
import { Leaderboard } from '../components/games/Leaderboard';
import { useGuestId } from '../hooks/useGuestId';
import { useBPMPulse } from '../hooks/useBPMPulse';
import { usePlayer } from '../context/PlayerContext';

const GAMES = [
  {
    path: '/games/spades',
    emoji: '♠️',
    title: 'SPADES',
    subtitle: 'Multiplayer vs AI',
    desc: 'Classic trick-taking card game. Jersey Legends fill open seats after 10 seconds. First team to 500 wins.',
    color: '#9D00FF',
    glow: '#9D00FF',
    tags: ['2 Teams', 'Bidding', 'First to 500'],
    statKey: 'spadesWins' as const,
    statLabel: 'Wins',
  },
  {
    path: '/games/blackjack',
    emoji: '🃏',
    title: 'BLACKJACK',
    subtitle: 'Single Player',
    desc: 'Beat the dealer. Hit, stand, or double down. Start with 1,000 chips.',
    color: '#FF0080',
    glow: '#FF0080',
    tags: ['1 Player', 'Chips', 'Beat the Dealer'],
    statKey: 'blackjackHighScore' as const,
    statLabel: 'Best Chips',
  },
  {
    path: '/games/crossword',
    emoji: '🧩',
    title: 'CROSSWORD',
    subtitle: 'Jersey Club Themed',
    desc: 'DJs, cities, and dance moves. Complete the Daily Power Word for a sponsored reward.',
    color: '#00FFAA',
    glow: '#00FFAA',
    tags: ['DJs & Cities', 'Daily Puzzle', 'Power Word'],
    statKey: 'crosswordsCompleted' as const,
    statLabel: 'Solved',
  },
  {
    path: '/games/chess',
    emoji: '♟️',
    title: 'CHESS',
    subtitle: '1 Player vs AI',
    desc: 'Classic chess on a real wood board. Full rules: castling, en passant, pawn promotion. Beat the AI!',
    color: '#C084FC',
    glow: '#C084FC',
    tags: ['vs AI', 'Full Rules', 'Classic Board'],
    statKey: 'spadesWins' as const, // reuse as placeholder
    statLabel: 'Wins',
  },
  {
    path: '/games/checkers',
    emoji: '⬟',
    title: 'CHECKERS',
    subtitle: '1 Player vs AI',
    desc: 'Classic checkers on a red/dark board. Mandatory jumps, multi-jumps, and kings. Can you outsmart the AI?',
    color: '#FF6B6B',
    glow: '#FF6B6B',
    tags: ['vs AI', 'Jumps', 'Kings'],
    statKey: 'blackjackHighScore' as const, // reuse as placeholder
    statLabel: 'Wins',
  },
];

const MONETIZATION = [
  { icon: '🎯', title: 'Table Billboard', desc: 'Center of every game table is premium ad real estate — perfect for energy drinks, event promos, and merch.' },
  { icon: '⚡', title: 'Drop Breaks', desc: 'Every 3 Spades hands or 1 completed crossword triggers a 5-second branded interstitial ad.' },
  { icon: '🔥', title: 'Hot Streak Offers', desc: 'Win 3 Spades rounds in a row? Unlock an exclusive discount code for Jersey 24/7 merch.' },
  { icon: '⏱️', title: 'Super Fan Sales', desc: 'Stay 20+ minutes and get a "Flash Sale" for limited hoodies — monetize your most loyal listeners.' },
  { icon: '🧩', title: 'Sponsor Words', desc: "Daily Crossword Power Word = your client's brand. Completing it triggers a custom event flyer." },
  { icon: '🏆', title: 'No-Login Leaderboard', desc: 'Everyone gets a Guest ID. Scores sync to the global board — compete without an account.' },
];

export function Games() {
  const { profile } = useGuestId();
  const { isPlaying } = usePlayer();
  const { pulse, pulseStyle } = useBPMPulse(isPlaying);

  return (
    <div className="min-h-[calc(100vh-96px)] p-4 md:p-6" style={{ background: '#06000F' }}>
      <div className="max-w-5xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ scale: pulse ? 1.05 : 1 }}
            transition={{ duration: 0.08 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-xs font-bold tracking-widest"
            style={{ background: '#1a003a', border: `1px solid ${pulse ? '#FF00FF' : '#9D00FF'}`, color: '#C084FC', boxShadow: pulse ? '0 0 16px #FF00FF60' : 'none', transition: 'box-shadow 0.1s' }}>
            <span className="w-2 h-2 rounded-full bg-[#9D00FF] animate-pulse" />
            JERSEY CLUB GAME HUB
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-3" style={{ textShadow: '0 0 40px #9D00FF60' }}>
            Play. Win. Rep the Culture.
          </h1>
          <p className="text-[#7B6F90] text-sm max-w-lg mx-auto">
            Five games, one Guest ID, one global leaderboard. No login needed — just play.
          </p>
          {profile && (
            <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-xl text-xs"
              style={{ background: '#0D001E', border: '1px solid #2a0060' }}>
              <User className="w-3 h-3 text-[#9D00FF]" />
              <span className="text-[#C084FC] font-bold">{profile.id}</span>
              <span className="text-[#3B2F50]">·</span>
              <span className="text-[#7B6F90]">{profile.totalScore.toLocaleString()} pts</span>
            </div>
          )}
        </div>

        {/* Game Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-stretch">
          {GAMES.map((g, i) => (
            <motion.div
              key={g.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="h-full"
            >
              <Link to={g.path} className="block group h-full">
                <div className="rounded-2xl p-5 transition-all duration-200 group-hover:scale-[1.02] flex flex-col h-full"
                  style={{
                    background: 'linear-gradient(135deg, #0D001E, #1a003a)',
                    border: `1.5px solid ${g.color}40`,
                    boxShadow: `0 0 24px ${g.glow}20`,
                  }}>
                  <div className="text-4xl mb-3">{g.emoji}</div>
                  <p className="text-white font-black text-lg mb-0.5">{g.title}</p>
                  <p className="text-xs font-bold mb-2" style={{ color: g.color }}>{g.subtitle}</p>
                  <p className="text-[#7B6F90] text-xs mb-3 leading-relaxed">{g.desc}</p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {g.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: `${g.color}15`, color: g.color, border: `1px solid ${g.color}30` }}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="flex-grow" />
                  {profile && (
                    <div className="flex items-center justify-between pt-2 mb-3" style={{ borderTop: `1px solid ${g.color}20` }}>
                      <span className="text-[10px] text-[#3B2F50]">{g.statLabel}</span>
                      <span className="text-xs font-mono font-bold" style={{ color: g.color }}>
                        {(profile[g.statKey] || 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="w-full text-center py-2 rounded-xl text-xs font-black text-white transition-all group-hover:opacity-90"
                    style={{ background: `linear-gradient(135deg, ${g.color}90, ${g.color}60)` }}>
                    PLAY NOW →
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Beat Maker — Featured Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-8"
        >
          <Link to="/games/beat-maker" className="block group">
            <div className="rounded-2xl p-5 transition-all duration-200 group-hover:scale-[1.01]"
              style={{
                background: 'linear-gradient(135deg, #0D001E, #2a0040, #1a003a)',
                border: '1.5px solid #FF008040',
                boxShadow: '0 0 32px #FF008020',
              }}>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">🎹</span>
                  <div>
                    <p className="text-white font-black text-lg mb-0.5 flex items-center gap-2">
                      BEAT MAKER
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#FF0080] text-white">NEW</span>
                    </p>
                    <p className="text-xs font-bold text-[#FF0080]">Jersey Club Studio</p>
                  </div>
                </div>
                <p className="text-[#7B6F90] text-sm leading-relaxed">
                  Create your own Jersey Club beats with 16 drum pads, step sequencer, and BPM control. Features authentic sounds and works on any device.
                </p>
                <div className="flex flex-wrap gap-2">
                  {['16 Pads', 'Step Sequencer', '140 BPM', 'Presets', 'Keyboard Shortcuts'].map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                      style={{ background: '#FF008015', color: '#FF0080', border: '1px solid #FF008030' }}>
                      {t}
                    </span>
                  ))}
                </div>
                <div className="hidden md:block text-center py-2 px-6 rounded-xl text-xs font-black text-white transition-all group-hover:opacity-90 flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #FF008090, #9D00FF60)' }}>
                  OPEN STUDIO →
                </div>
                <div className="md:hidden w-full text-center py-3 px-6 rounded-xl text-xs font-black text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #FF008090, #9D00FF60)' }}>
                  OPEN STUDIO →
                </div>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Dance Videos — Featured Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-8"
        >
          <Link to="/dance-videos" className="block group">
            
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {/* Leaderboard */}
          <div className="lg:col-span-2">
            <Leaderboard profile={profile} />
          </div>

          {/* Merch */}
          <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #1a0030, #0D001E)', border: '1px solid #9D00FF40' }}>
            <Shirt className="w-6 h-6 text-[#9D00FF] mb-3" />
            <p className="text-white font-black text-base mb-1">Official Jersey Merch</p>
            <p className="text-[#7B6F90] text-xs mb-4">Win hot streaks in Spades to unlock exclusive discount codes. Up to 38% off right now!</p>
            <Link to="/merch"
              className="block w-full text-center py-2.5 rounded-xl font-bold text-white text-sm"
              style={{ background: 'linear-gradient(135deg, #9D00FF, #FF0080)' }}>
              Shop the Look →
            </Link>
          </div>
        </div>

        {/* Monetization grid */}
        <div className="rounded-2xl p-5 mb-6" style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-[#9D00FF]" />
            <p className="text-white font-black text-sm">How We Monetize Without Logins</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {MONETIZATION.map(m => (
              <div key={m.title} className="p-3 rounded-xl" style={{ background: '#0a0018', border: '1px solid #1a0040' }}>
                <p className="text-base mb-1">{m.icon}</p>
                <p className="text-white text-xs font-bold mb-1">{m.title}</p>
                <p className="text-[#5B4F70] text-[11px] leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}