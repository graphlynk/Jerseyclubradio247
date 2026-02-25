import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router';
import {
  ArrowLeft, Shirt, CheckCircle, Eye, Info, Calendar,
  RotateCcw, ChevronDown, ChevronUp, Globe, MapPin, Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdInterstitial } from '../../components/games/AdInterstitial';
import { FlashSale } from '../../components/games/FlashSale';
import { Leaderboard } from '../../components/games/Leaderboard';
import { useGuestId } from '../../hooks/useGuestId';
import { useBPMPulse } from '../../hooks/useBPMPulse';
import { useSuperFan } from '../../hooks/useSuperFan';
import { usePlayer } from '../../context/PlayerContext';
import { WORD_BANK, THEMES } from '../../data/clubWordBank';
import { generateCrossword, buildCellGrid, type GeneratedPuzzle } from '../../utils/crosswordEngine';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-715f71b9`;
const HEADERS = { Authorization: `Bearer ${publicAnonKey}` };
const HISTORY_KEY = 'jc_xword_history_v3'; // { "themeId+seed": { solved, date } }

// ─── Persist puzzle history ───────────────────────────────────────────────────
function getHistory(): Record<string, { solved: boolean; date: string }> {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}'); } catch { return {}; }
}
function markSolved(key: string) {
  const h = getHistory();
  h[key] = { solved: true, date: new Date().toISOString().split('T')[0] };
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

// ─── Category pill colours ────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  place: '#00B4FF', dj: '#9D00FF', artist: '#FFD700',
  dance: '#FF69B4', music: '#00FF88', digital: '#FF6B00', culture: '#FF4444',
};

// ─── Component ───────────────────────────────────────────────────────────────
export function Crossword() {
  const { profile, updateProfile } = useGuestId();
  const { isPlaying } = usePlayer();
  const { pulse } = useBPMPulse(isPlaying);
  const { showFlashSale, dismissFlashSale } = useSuperFan();

  // ── Puzzle state
  const [puzzle, setPuzzle] = useState<GeneratedPuzzle | null>(null);
  const [themeIdx, setThemeIdx] = useState(0);
  const [puzzleSeed, setPuzzleSeed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [puzzleKey, setPuzzleKey] = useState('');

  // ── Interaction state
  const [inputs, setInputs] = useState<Map<string, string>>(new Map());
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [dir, setDir] = useState<'across' | 'down'>('across');
  const [checked, setChecked] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showBlurb, setShowBlurb] = useState(true);
  const [history, setHistory] = useState<Record<string, { solved: boolean; date: string }>>({});
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // ── Load daily puzzle config from server ─────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setHistory(getHistory());
      let tIdx = 0, seed = 0;
      try {
        const res = await fetch(`${BASE}/games/daily-puzzle`, { headers: HEADERS });
        const data = await res.json();
        tIdx = typeof data.themeIndex === 'number' ? data.themeIndex % THEMES.length : 0;
        seed = typeof data.seed === 'number' ? data.seed : Date.now();
      } catch {
        const epoch = new Date('2024-01-01').getTime();
        const d = Math.floor((Date.now() - epoch) / 86400000);
        tIdx = d % THEMES.length;
        seed = ((d * 999983) + 123457) >>> 0;
      }
      setThemeIdx(tIdx);
      setPuzzleSeed(seed);
      setLoading(false);
    };
    load();
  }, []);

  // ── Generate puzzle whenever theme/seed changes ───────────────────────────────
  useEffect(() => {
    if (loading) return;
    const theme = THEMES[themeIdx];
    const wordEntries = WORD_BANK.filter(w => theme.wordIds.includes(w.id));
    let gen = generateCrossword(wordEntries, puzzleSeed, theme.id);

    // If generator couldn't place enough words, try small seed offsets
    for (let attempt = 1; gen.placed.length < 5 && attempt <= 5; attempt++) {
      gen = generateCrossword(wordEntries, puzzleSeed + attempt * 31337, theme.id);
    }

    setPuzzle(gen);
    setInputs(new Map());
    setSelected(null);
    setChecked(false);
    setCompleted(false);
    const key = `${theme.id}_${puzzleSeed}`;
    setPuzzleKey(key);
    setCompleted(getHistory()[key]?.solved === true);
  }, [themeIdx, puzzleSeed, loading]);

  const theme = THEMES[themeIdx];
  const gridData = useMemo(() => puzzle ? buildCellGrid(puzzle) : [], [puzzle]);

  // ── Word lookup helpers ───────────────────────────────────────────────────────
  const getWordAt = useCallback((r: number, c: number, d: 'across' | 'down') => {
    return puzzle?.placed.find(wp => {
      if (wp.dir !== d) return false;
      if (d === 'across') return wp.row === r && c >= wp.col && c < wp.col + wp.word.length;
      return wp.col === c && r >= wp.row && r < wp.row + wp.word.length;
    });
  }, [puzzle]);

  const highlighted = useMemo(() => {
    if (!selected || !puzzle) return new Set<string>();
    const [r, c] = selected;
    const wp = getWordAt(r, c, dir);
    if (!wp) return new Set([`${r}-${c}`]);
    const cells = new Set<string>();
    for (let i = 0; i < wp.word.length; i++) {
      const wr = wp.dir === 'down' ? wp.row + i : wp.row;
      const wc = wp.dir === 'across' ? wp.col + i : wp.col;
      cells.add(`${wr}-${wc}`);
    }
    return cells;
  }, [selected, dir, getWordAt, puzzle]);

  // ── Completion check ──────────────────────────────────────────────────────────
  const checkComplete = useCallback((inp: Map<string, string>, puzz: GeneratedPuzzle) => {
    return puzz.placed.every(wp =>
      Array.from({ length: wp.word.length }).every((_, i) => {
        const r = wp.dir === 'down' ? wp.row + i : wp.row;
        const c = wp.dir === 'across' ? wp.col + i : wp.col;
        return inp.get(`${r},${c}`) === wp.word[i];
      })
    );
  }, []);

  const isCorrectCell = (r: number, c: number) => {
    const cell = gridData[r]?.[c];
    return cell?.letter !== null && inputs.get(`${r},${c}`) === cell?.letter;
  };

  // ── Cell selection ────────────────────────────────────────────────────────────
  const selectCell = (r: number, c: number) => {
    if (!puzzle || gridData[r]?.[c]?.letter === null) return;
    if (selected?.[0] === r && selected?.[1] === c) {
      const ha = !!getWordAt(r, c, 'across'), hd = !!getWordAt(r, c, 'down');
      if (ha && hd) setDir(d => d === 'across' ? 'down' : 'across');
    } else {
      setSelected([r, c]);
      const ha = !!getWordAt(r, c, 'across'), hd = !!getWordAt(r, c, 'down');
      if (!ha && hd) setDir('down'); else if (ha && !hd) setDir('across');
    }
    hiddenInputRef.current?.focus();
  };

  // ── Cursor advance ────────────────────────────────────────────────────────────
  const advance = useCallback((r: number, c: number, fwd: boolean) => {
    if (!puzzle) return;
    const wp = getWordAt(r, c, dir);
    if (!wp) return;
    const idx = dir === 'across' ? c - wp.col : r - wp.row;
    const next = fwd ? idx + 1 : idx - 1;
    if (next >= 0 && next < wp.word.length) {
      setSelected([
        dir === 'down' ? wp.row + next : r,
        dir === 'across' ? wp.col + next : c,
      ]);
    }
  }, [getWordAt, dir, puzzle]);

  // ── Keyboard handler ──────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selected || !puzzle) return;
      const [r, c] = selected;

      if (/^[A-Za-z]$/.test(e.key)) {
        const letter = e.key.toUpperCase();
        setInputs(prev => {
          const next = new Map(prev);
          next.set(`${r},${c}`, letter);
          if (checkComplete(next, puzzle) && !completed) {
            setCompleted(true);
            markSolved(puzzleKey);
            setHistory(getHistory());
            updateProfile({ crosswordsCompleted: (profile?.crosswordsCompleted || 0) + 1 });
            setTimeout(() => setShowAd(true), 1400);
          }
          return next;
        });
        advance(r, c, true);
        e.preventDefault();
      } else if (e.key === 'Backspace') {
        setInputs(prev => {
          const next = new Map(prev);
          if (next.get(`${r},${c}`)) { next.delete(`${r},${c}`); }
          else { advance(r, c, false); }
          return next;
        });
        e.preventDefault();
      } else if (e.key === 'ArrowRight' && gridData[r]?.[c + 1]?.letter) { setSelected([r, c + 1]); setDir('across'); }
      else if (e.key === 'ArrowLeft' && gridData[r]?.[c - 1]?.letter) { setSelected([r, c - 1]); setDir('across'); }
      else if (e.key === 'ArrowDown' && gridData[r + 1]?.[c]?.letter) { setSelected([r + 1, c]); setDir('down'); }
      else if (e.key === 'ArrowUp' && gridData[r - 1]?.[c]?.letter) { setSelected([r - 1, c]); setDir('down'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, dir, inputs, advance, checkComplete, completed, puzzle, profile, updateProfile, gridData, puzzleKey]);

  const revealAll = () => {
    if (!puzzle) return;
    const next = new Map<string, string>();
    for (const wp of puzzle.placed) {
      for (let i = 0; i < wp.word.length; i++) {
        const r = wp.dir === 'down' ? wp.row + i : wp.row;
        const c = wp.dir === 'across' ? wp.col + i : wp.col;
        next.set(`${r},${c}`, wp.word[i]);
      }
    }
    setInputs(next);
  };

  const resetGrid = () => {
    setInputs(new Map()); setChecked(false);
  };

  const switchTheme = (idx: number) => {
    const theme = THEMES[idx];
    const wordEntries = WORD_BANK.filter(w => theme.wordIds.includes(w.id));
    const epoch = new Date('2024-01-01').getTime();
    const d = Math.floor((Date.now() - epoch) / 86400000);
    // Theme-specific seed: daily seed XOR'd with theme position for variety
    const newSeed = ((d * 999983) + 123457 + idx * 77777) >>> 0;
    setThemeIdx(idx);
    setPuzzleSeed(newSeed);
  };

  const activeWord = selected ? getWordAt(selected[0], selected[1], dir) : null;
  const acrossClues = puzzle?.placed.filter(w => w.dir === 'across').sort((a, b) => a.num - b.num) ?? [];
  const downClues   = puzzle?.placed.filter(w => w.dir === 'down').sort((a, b) => a.num - b.num) ?? [];

  // Dynamic cell size based on grid width
  const CELL = puzzle ? Math.max(28, Math.min(40, Math.floor(560 / (puzzle.cols || 12)))) : 36;

  const solvedCount = Object.values(history).filter(h => h.solved).length;

  // ── Loading screen ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-96px)] flex items-center justify-center" style={{ background: '#06000F' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#9D00FF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#7B6F90] text-sm">Generating today's puzzle…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-96px)] p-3 md:p-5" style={{ background: '#06000F' }}>
      <AdInterstitial visible={showAd} onClose={() => setShowAd(false)} sponsorWord={theme?.name} />
      <FlashSale visible={showFlashSale} onDismiss={dismissFlashSale} />
      <input ref={hiddenInputRef} className="opacity-0 absolute w-0 h-0 pointer-events-none"
        readOnly inputMode="text" type="text" />

      {/* Completion banner */}
      <AnimatePresence>
        {completed && !showAd && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-4 rounded-2xl text-center w-80"
            style={{ background: '#1a003a', border: '2px solid #9D00FF', boxShadow: '0 0 60px #9D00FF60' }}>
            <p className="text-2xl font-black text-white mb-1">🧩 SOLVED!</p>
            <p className="text-[#C084FC] text-xs">{theme?.emoji} {theme?.name}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <Link to="/games" className="text-[#7B6F90] hover:text-white transition-colors flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-black text-white">🧩 CROSSWORD</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-[#9D00FF] border border-[#9D00FF]"
                style={{ background: '#1a003a' }}>DAILY</span>
              {theme && (
                <span className="text-xs font-bold" style={{ color: theme.accentColor }}>
                  {theme.emoji} {theme.name}
                </span>
              )}
            </div>
            <p className="text-[10px] text-[#3B2F50]">
              12 rotating regional themes · Seeded daily · Unique every visit
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setChecked(c => !c)} title="Check answers"
              className={`p-1.5 rounded-lg transition-colors ${checked ? 'text-[#9D00FF] bg-[#1a003a]' : 'text-[#5B4F70] hover:text-white'}`}>
              <CheckCircle className="w-4 h-4" />
            </button>
            <button onClick={revealAll} title="Reveal all"
              className="p-1.5 rounded-lg text-[#5B4F70] hover:text-white transition-colors">
              <Eye className="w-4 h-4" />
            </button>
            <button onClick={resetGrid} title="Reset"
              className="p-1.5 rounded-lg text-[#5B4F70] hover:text-white transition-colors">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={() => setShowInfo(i => !i)}
              className={`p-1.5 rounded-lg transition-colors ${showInfo ? 'text-[#9D00FF] bg-[#1a003a]' : 'text-[#5B4F70] hover:text-white'}`}>
              <Info className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Guest ID info panel ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {showInfo && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="mb-3 overflow-hidden">
              <div className="p-4 rounded-xl" style={{ background: '#0D001E', border: '1px solid #2a0060' }}>
                <p className="text-white font-bold text-sm mb-2">🔐 How User Tracking Works (No Login)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mb-3">
                  {[
                    { title: 'What we store', body: 'A random Guest_XXXX ID in your browser\'s localStorage. No server accounts, no email, no password.' },
                    { title: 'NOT IP-based', body: 'We do not track your IP address, device fingerprint, or any personal data. Ever.' },
                    { title: 'Persistence', body: 'Same device + same browser = same Guest ID. Clearing browser data resets it.' },
                  ].map(item => (
                    <div key={item.title} className="p-3 rounded-lg" style={{ background: '#0a0018' }}>
                      <p className="text-[#9D00FF] font-bold mb-1">{item.title}</p>
                      <p className="text-[#7B6F90]">{item.body}</p>
                    </div>
                  ))}
                </div>
                {profile && (
                  <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs" style={{ background: '#1a003a' }}>
                    <span className="text-[#5B4F70]">Your ID:</span>
                    <span className="text-[#C084FC] font-mono font-bold">{profile.id}</span>
                    <span className="text-[#5B4F70] ml-auto">Puzzles solved: {solvedCount}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Theme selector row ──────────────────────────────────────────────── */}
        <div className="mb-3 overflow-x-auto">
          <div className="flex gap-1.5 min-w-max pb-1">
            {THEMES.map((t, i) => {
              const isCur = i === themeIdx;
              const themeKeys = Object.keys(history).filter(k => k.startsWith(t.id + '_'));
              const done = themeKeys.some(k => history[k]?.solved);
              return (
                <button key={t.id} onClick={() => switchTheme(i)}
                  className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                    isCur ? 'text-white shadow-lg' : done ? 'text-[#00FF88]' : 'text-[#5B4F70] hover:text-white'
                  }`}
                  style={{
                    background: isCur ? t.accentColor + '30' : done ? '#1a3a00' : '#0D001E',
                    border: `1px solid ${isCur ? t.accentColor : done ? '#00FF88' : '#1a0040'}`,
                  }}>
                  <span>{t.emoji}</span>
                  <span>{t.name}</span>
                  {done && <span className="text-[#00FF88]">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">

          {/* ── Left: grid + region blurb ───────────────────────────────────── */}
          <div className="space-y-3">

            {/* Region banner */}
            {theme && (
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.accentColor}30` }}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                  style={{ background: theme.accentColor + '12' }}
                  onClick={() => setShowBlurb(b => !b)}>
                  <span className="text-2xl">{theme.emoji}</span>
                  <div className="flex-1">
                    <p className="font-black text-white text-sm">{theme.name}</p>
                    <p className="text-xs" style={{ color: theme.accentColor }}>{theme.subtitle} · {theme.region}</p>
                  </div>
                  <Globe className="w-4 h-4 flex-shrink-0" style={{ color: theme.accentColor }} />
                  {showBlurb ? <ChevronUp className="w-4 h-4 text-[#5B4F70]" /> : <ChevronDown className="w-4 h-4 text-[#5B4F70]" />}
                </button>
                <AnimatePresence>
                  {showBlurb && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                      className="overflow-hidden">
                      <p className="px-4 py-3 text-xs text-[#9B8FB0] leading-relaxed border-t"
                        style={{ borderColor: theme.accentColor + '20' }}>
                        {theme.blurb}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Crossword grid */}
            {puzzle && puzzle.placed.length > 0 ? (
              <div className="rounded-2xl p-3 overflow-x-auto" style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${puzzle.cols}, ${CELL}px)`,
                  gap: 2,
                  width: 'fit-content',
                }}>
                  {Array.from({ length: puzzle.rows }, (_, r) =>
                    Array.from({ length: puzzle.cols }, (_, c) => {
                      const cell = gridData[r]?.[c];
                      if (!cell || cell.letter === null) {
                        return <div key={`${r}-${c}`} style={{ width: CELL, height: CELL, background: '#04000A', borderRadius: 2 }} />;
                      }
                      const isSel = selected?.[0] === r && selected?.[1] === c;
                      const isHlit = highlighted.has(`${r}-${c}`);
                      const userL = inputs.get(`${r},${c}`) ?? '';
                      const correct = checked && !!userL && isCorrectCell(r, c);
                      const wrong   = checked && !!userL && !isCorrectCell(r, c);

                      // Highlight category colour for active word
                      const activeWp = isSel || isHlit ? getWordAt(r, c, dir) : null;
                      const catColor = activeWp ? (CAT_COLORS[activeWp.category] ?? '#9D00FF') : '#9D00FF';

                      return (
                        <div key={`${r}-${c}`} onClick={() => selectCell(r, c)}
                          style={{
                            width: CELL, height: CELL, position: 'relative', borderRadius: 3,
                            cursor: 'pointer',
                            background: isSel ? catColor + 'CC' : isHlit ? catColor + '25' : '#170530',
                            border: `1.5px solid ${isSel ? catColor : isHlit ? catColor + '50' : '#2a0060'}`,
                            boxShadow: isSel ? `0 0 14px ${catColor}90` : undefined,
                            transition: 'background 0.1s, border-color 0.1s',
                          }}>
                          {cell.num && (
                            <span style={{
                              position: 'absolute', top: 1, left: 2,
                              fontSize: Math.max(6, CELL * 0.18), fontWeight: 700, lineHeight: 1,
                              color: isSel ? '#fff' : '#4B3F60',
                            }}>
                              {cell.num}
                            </span>
                          )}
                          <span style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: Math.max(10, CELL * 0.35), fontWeight: 900,
                            color: wrong ? '#FF4444' : correct ? '#00FF88' : isSel ? '#fff' : '#D4C0FF',
                          }}>
                            {userL}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-8 text-center" style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
                <p className="text-[#5B4F70] text-sm">Generating puzzle…</p>
              </div>
            )}

            {/* Active clue bar */}
            {activeWord && (
              <motion.div key={activeWord.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="px-3 py-2.5 rounded-xl text-sm flex items-center gap-2"
                style={{ background: CAT_COLORS[activeWord.category] + '15', border: `1px solid ${CAT_COLORS[activeWord.category]}40` }}>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded"
                  style={{ background: CAT_COLORS[activeWord.category], color: '#000' }}>
                  {activeWord.num} {dir.toUpperCase()}
                </span>
                <span className="text-[#C084FC] text-xs flex-1">{activeWord.clue}</span>
                <span className="text-[10px] text-[#3B2F50] flex-shrink-0 capitalize">{activeWord.category}</span>
              </motion.div>
            )}

            {/* Word count stats */}
            {puzzle && (
              <div className="flex gap-2 flex-wrap">
                {(['place', 'dj', 'artist', 'dance', 'music', 'digital', 'culture'] as const).map(cat => {
                  const count = puzzle.placed.filter(p => p.category === cat).length;
                  if (!count) return null;
                  return (
                    <div key={cat} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px]"
                      style={{ background: CAT_COLORS[cat] + '15', border: `1px solid ${CAT_COLORS[cat]}30` }}>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: CAT_COLORS[cat] }} />
                      <span className="text-[#9B8FB0] capitalize">{cat}</span>
                      <span className="font-bold" style={{ color: CAT_COLORS[cat] }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Right: clues + leaderboard ──────────────────────────────────── */}
          <div className="space-y-3">

            {/* Category legend */}
            <div className="p-3 rounded-xl text-[10px]" style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
              <p className="text-[#5B4F70] font-bold tracking-widest mb-2 text-[9px]">WORD CATEGORIES</p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(CAT_COLORS).map(([cat, color]) => (
                  <div key={cat} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="capitalize text-[#7B6F90]">{cat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Clue panels */}
            {puzzle && (
              <>
                <CluePanel title="ACROSS" clues={acrossClues} inputs={inputs} dir="across"
                  activeWordId={activeWord?.id} currentDir={dir}
                  onClueClick={(wp) => { setSelected([wp.row, wp.col]); setDir('across'); hiddenInputRef.current?.focus(); }} />
                <CluePanel title="DOWN" clues={downClues} inputs={inputs} dir="down"
                  activeWordId={activeWord?.id} currentDir={dir}
                  onClueClick={(wp) => { setSelected([wp.row, wp.col]); setDir('down'); hiddenInputRef.current?.focus(); }} />
              </>
            )}

            <Leaderboard profile={profile} />

            <a href="https://jerseyclub247.com/shop" target="_blank" rel="noreferrer"
              className="flex items-center gap-2 justify-center w-full py-3 rounded-xl font-bold text-sm text-white hover:scale-[1.02] transition-transform"
              style={{ background: 'linear-gradient(135deg,#2a0060,#1a003a)', border: '1px solid #9D00FF40' }}>
              <Shirt className="w-4 h-4 text-[#9D00FF]" />Shop the Look
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Clue Panel ───────────────────────────────────────────────────────────────
function CluePanel({
  title, clues, inputs, dir, activeWordId, currentDir, onClueClick
}: {
  title: string;
  clues: import('../../utils/crosswordEngine').PlacedWord[];
  inputs: Map<string, string>;
  dir: 'across' | 'down';
  activeWordId?: string;
  currentDir: 'across' | 'down';
  onClueClick: (wp: import('../../utils/crosswordEngine').PlacedWord) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const isWordDone = (wp: import('../../utils/crosswordEngine').PlacedWord) =>
    Array.from({ length: wp.word.length }).every((_, i) => {
      const r = wp.dir === 'down' ? wp.row + i : wp.row;
      const c = wp.dir === 'across' ? wp.col + i : wp.col;
      return inputs.get(`${r},${c}`) === wp.word[i];
    });

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
      <button onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#0F0022] transition-colors">
        <span className="text-[10px] font-bold text-[#5B4F70] tracking-widest">{title} ({clues.length})</span>
        {collapsed ? <ChevronDown className="w-3 h-3 text-[#3B2F50]" /> : <ChevronUp className="w-3 h-3 text-[#3B2F50]" />}
      </button>
      <AnimatePresence>
        {!collapsed && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-2 pb-2 max-h-56 overflow-y-auto space-y-0.5">
              {clues.map(wp => {
                const done = isWordDone(wp);
                const active = activeWordId === wp.id && currentDir === dir;
                const catColor = CAT_COLORS[wp.category] ?? '#9D00FF';
                return (
                  <button key={wp.id} onClick={() => onClueClick(wp)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg transition-colors flex items-start gap-2 ${
                      active ? 'bg-[#2a0060]' : 'hover:bg-[#0F0022]'
                    }`}>
                    <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: catColor }} />
                      <span className={`text-[10px] font-bold ${done ? 'text-[#00FF88]' : ''}`}
                        style={done ? {} : { color: catColor }}>
                        {wp.num}.
                      </span>
                    </div>
                    <span className={`text-[11px] leading-tight ${done ? 'text-[#3B2F50] line-through' : 'text-[#9B8FB0]'}`}>
                      {wp.clue}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
