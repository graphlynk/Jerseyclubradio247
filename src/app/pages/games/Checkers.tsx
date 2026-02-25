import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, RotateCcw, Brain, Users, Bot, Copy, Check, Wifi } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-715f71b9`;
const HEADERS: Record<string, string> = { Authorization: `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' };

// ─── Types ───────────────────────────────────────────────────────────────────
type Owner = 'red' | 'black';
interface CheckerPiece { owner: Owner; king: boolean }
type CBoard = (CheckerPiece | null)[][];
type CPos = [number, number];

interface MoveInfo {
  from: CPos;
  to: CPos;
  captured: CPos[];
  jump: boolean;
}

interface GameState {
  board: CBoard;
  turn: Owner;
  selected: CPos | null;
  legalMoves: MoveInfo[];
  jumpingFrom: CPos | null;
  status: 'playing' | 'red_wins' | 'black_wins' | 'draw';
  history: string[];
  lastFrom: CPos | null;
  lastTo: CPos | null;
}

type GameMode = 'menu' | 'ai' | 'create' | 'join' | 'waiting' | 'online';

// ─── Board helpers ────────────────────────────────────────────────────────────
const inB = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
const isDark = (r: number, c: number) => (r + c) % 2 === 1;

function cloneBoard(b: CBoard): CBoard {
  return b.map(row => row.map(sq => sq ? { ...sq } : null));
}

function initBoard(): CBoard {
  const b: CBoard = Array(8).fill(null).map(() => Array(8).fill(null));
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (!isDark(r, c)) continue;
      if (r <= 2) b[r][c] = { owner: 'black', king: false };
      else if (r >= 5) b[r][c] = { owner: 'red', king: false };
    }
  }
  return b;
}

// ─── Move generation ─────────────────────────────────────────────────────────
function getJumps(board: CBoard, r: number, c: number): MoveInfo[] {
  const p = board[r][c];
  if (!p) return [];
  const dirs: [number, number][] = [];
  if (p.owner === 'red' || p.king) dirs.push([-1, -1], [-1, 1]);
  if (p.owner === 'black' || p.king) dirs.push([1, -1], [1, 1]);

  const jumps: MoveInfo[] = [];
  for (const [dr, dc] of dirs) {
    const mr = r + dr, mc = c + dc;
    const tr = r + 2 * dr, tc = c + 2 * dc;
    if (inB(tr, tc) && board[mr][mc]?.owner && board[mr][mc]!.owner !== p.owner && !board[tr][tc]) {
      jumps.push({ from: [r, c], to: [tr, tc], captured: [[mr, mc]], jump: true });
    }
  }
  return jumps;
}

function getRegularMoves(board: CBoard, r: number, c: number): MoveInfo[] {
  const p = board[r][c];
  if (!p) return [];
  const dirs: [number, number][] = [];
  if (p.owner === 'red' || p.king) dirs.push([-1, -1], [-1, 1]);
  if (p.owner === 'black' || p.king) dirs.push([1, -1], [1, 1]);

  const moves: MoveInfo[] = [];
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (inB(nr, nc) && !board[nr][nc]) {
      moves.push({ from: [r, c], to: [nr, nc], captured: [], jump: false });
    }
  }
  return moves;
}

function hasAnyJumps(board: CBoard, owner: Owner): boolean {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.owner === owner && getJumps(board, r, c).length > 0) return true;
  return false;
}

function pieceMoves(board: CBoard, r: number, c: number, forceJump: boolean): MoveInfo[] {
  const jumps = getJumps(board, r, c);
  if (forceJump) return jumps;
  return jumps.length > 0 ? jumps : getRegularMoves(board, r, c);
}

function allMovesFor(board: CBoard, owner: Owner, jumpingFrom: CPos | null = null): MoveInfo[] {
  const anyJump = hasAnyJumps(board, owner);
  const result: MoveInfo[] = [];
  const positions: CPos[] = jumpingFrom ? [jumpingFrom] : (() => {
    const ps: CPos[] = [];
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (board[r][c]?.owner === owner) ps.push([r, c]);
    return ps;
  })();
  for (const [r, c] of positions) {
    const moves = pieceMoves(board, r, c, anyJump);
    result.push(...moves);
  }
  return result;
}

function applyMove(board: CBoard, move: MoveInfo): CBoard {
  const nb = cloneBoard(board);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = nb[fr][fc]!;
  nb[tr][tc] = { ...piece };
  nb[fr][fc] = null;
  for (const [cr, cc] of move.captured) nb[cr][cc] = null;
  if (piece.owner === 'red' && tr === 0) nb[tr][tc]!.king = true;
  if (piece.owner === 'black' && tr === 7) nb[tr][tc]!.king = true;
  return nb;
}

function countPieces(board: CBoard, owner: Owner): number {
  let n = 0;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.owner === owner) n++;
  return n;
}

// ─── AI (minimax with alpha-beta) ─────────────────────────────────────────────
function evalBoard(board: CBoard): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val = p.king ? 3 : 1;
      const advBonus = p.owner === 'black' ? r * 0.05 : (7 - r) * 0.05;
      score += p.owner === 'black' ? val + advBonus : -(val + advBonus);
    }
  }
  return score;
}

function minimaxCheckers(
  board: CBoard, turn: Owner, jumpingFrom: CPos | null,
  depth: number, alpha: number, beta: number
): number {
  const moves = allMovesFor(board, turn, jumpingFrom);
  if (depth === 0 || moves.length === 0) return evalBoard(board);

  if (turn === 'black') {
    let best = -Infinity;
    for (const m of moves) {
      const nb = applyMove(board, m);
      let nextTurn: Owner = 'red';
      let nextJumping: CPos | null = null;
      if (m.jump) {
        const furtherJumps = getJumps(nb, m.to[0], m.to[1]);
        if (furtherJumps.length > 0) { nextTurn = 'black'; nextJumping = m.to; }
      }
      const val = minimaxCheckers(nb, nextTurn, nextJumping, depth - 1, alpha, beta);
      best = Math.max(best, val);
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const nb = applyMove(board, m);
      let nextTurn: Owner = 'black';
      let nextJumping: CPos | null = null;
      if (m.jump) {
        const furtherJumps = getJumps(nb, m.to[0], m.to[1]);
        if (furtherJumps.length > 0) { nextTurn = 'red'; nextJumping = m.to; }
      }
      const val = minimaxCheckers(nb, nextTurn, nextJumping, depth - 1, alpha, beta);
      best = Math.min(best, val);
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function findBestCheckerMove(board: CBoard, jumpingFrom: CPos | null): MoveInfo | null {
  const moves = allMovesFor(board, 'black', jumpingFrom);
  if (moves.length === 0) return null;
  moves.sort(() => Math.random() - 0.5);
  let bestVal = -Infinity;
  let best = moves[0];
  for (const m of moves) {
    const nb = applyMove(board, m);
    let nextTurn: Owner = 'red';
    let nextJumping: CPos | null = null;
    if (m.jump) {
      const fj = getJumps(nb, m.to[0], m.to[1]);
      if (fj.length > 0) { nextTurn = 'black'; nextJumping = m.to; }
    }
    const val = minimaxCheckers(nb, nextTurn, nextJumping, 4, -Infinity, Infinity);
    if (val > bestVal) { bestVal = val; best = m; }
  }
  return best;
}

// ─── Guest ID helper ──────────────────────────────────────────────────────────
function getPlayerId(): string {
  try {
    const stored = localStorage.getItem('jc_guest_profile_v1');
    if (stored) return JSON.parse(stored).id || 'anon';
  } catch {}
  try {
    const fp = localStorage.getItem('jc_fp_v2');
    if (fp) return fp;
  } catch {}
  let id = localStorage.getItem('jc_checkers_id');
  if (!id) { id = 'ck_' + Math.random().toString(36).slice(2, 10); localStorage.setItem('jc_checkers_id', id); }
  return id;
}

function getPlayerName(): string {
  try {
    const stored = localStorage.getItem('jc_guest_profile_v1');
    if (stored) return JSON.parse(stored).name || 'Player';
  } catch {}
  return 'Player';
}

// ─── Initial state ────────────────────────────────────────────────────────────
function makeInit(): GameState {
  return {
    board: initBoard(),
    turn: 'red',
    selected: null,
    legalMoves: [],
    jumpingFrom: null,
    status: 'playing',
    history: [],
    lastFrom: null,
    lastTo: null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  REALISTIC CHECKER PIECE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
function CheckerPieceRender({ owner, king, isSelected }: {
  owner: Owner; king: boolean; isSelected: boolean;
}) {
  const isRed = owner === 'red';
  // Classic checker colors
  const mainColor = isRed ? '#C41E3A' : '#1A1A1A';
  const lightColor = isRed ? '#E8304A' : '#333333';
  const darkColor = isRed ? '#8B0000' : '#0A0A0A';
  const rimColor = isRed ? '#FF6B6B' : '#555555';
  const innerRim = isRed ? '#A01830' : '#111111';

  return (
    <div
      className="relative flex items-center justify-center rounded-full z-20"
      style={{
        width: '72%',
        aspectRatio: '1',
        // 3D depth: bottom shadow to simulate piece thickness
        boxShadow: isSelected
          ? `0 6px 2px ${darkColor}, 0 7px 10px rgba(0,0,0,0.8), 0 0 20px ${isRed ? '#FF444480' : '#FFFFFF30'}`
          : `0 4px 1px ${darkColor}, 0 5px 8px rgba(0,0,0,0.6)`,
        transform: isSelected ? 'translateY(-2px)' : 'none',
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
    >
      {/* Outermost ring (rim) */}
      <div className="absolute inset-0 rounded-full" style={{
        background: `linear-gradient(145deg, ${rimColor}, ${darkColor})`,
      }} />
      {/* Middle body */}
      <div className="absolute rounded-full" style={{
        inset: '8%',
        background: `radial-gradient(ellipse at 40% 35%, ${lightColor} 0%, ${mainColor} 40%, ${darkColor} 100%)`,
      }} />
      {/* Inner groove ring (the recessed circle on real checkers) */}
      <div className="absolute rounded-full" style={{
        inset: '22%',
        background: 'transparent',
        boxShadow: `inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -1px 2px rgba(0,0,0,0.4)`,
        border: `1.5px solid ${innerRim}`,
      }} />
      {/* Specular highlight (top-left glossy reflection) */}
      <div className="absolute rounded-full pointer-events-none" style={{
        top: '10%', left: '18%',
        width: '35%', height: '28%',
        background: 'radial-gradient(ellipse, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
        transform: 'rotate(-20deg)',
      }} />
      {/* King crown */}
      {king && (
        <div className="absolute flex items-center justify-center" style={{ inset: '25%' }}>
          <span style={{
            fontSize: '72%',
            color: '#FFD700',
            textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(255,215,0,0.5)',
            lineHeight: 1,
            zIndex: 2,
          }}>
            ♛
          </span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BOARD COMPONENT — realistic wood & felt
// ═══════════════════════════════════════════════════════════════════════════════
function CheckerBoard({ state, onSquareClick, myColor, canInteract }: {
  state: GameState;
  onSquareClick: (r: number, c: number) => void;
  myColor: Owner;
  canInteract: boolean;
}) {
  const { board, selected, legalMoves, lastFrom, lastTo, turn } = state;

  // If playing as black in multiplayer, flip the board so black is at bottom
  const flipBoard = myColor === 'black';
  const rows = flipBoard ? [...Array(8)].map((_, i) => 7 - i) : [...Array(8)].map((_, i) => i);
  const cols = flipBoard ? [...Array(8)].map((_, i) => 7 - i) : [...Array(8)].map((_, i) => i);

  return (
    <div className="relative pl-6 pb-6">
      {/* Rank labels */}
      <div className="absolute left-0 top-0 flex flex-col h-full" style={{ width: 22 }}>
        {rows.map(rank => (
          <div key={rank} className="flex-1 flex items-center justify-center"
            style={{ fontSize: 11, fontWeight: 700, color: '#8B7355', fontFamily: 'monospace' }}>
            {8 - rank}
          </div>
        ))}
      </div>

      {/* Wood border frame */}
      <div style={{
        padding: 6,
        borderRadius: 4,
        background: 'linear-gradient(145deg, #8B6914, #654321, #4A3520)',
        boxShadow: '0 0 0 2px #3B2810, 0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 #A0863C',
      }}>
        <div
          className="w-full"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            border: '2px solid #3B2810',
          }}
        >
          {rows.map(r =>
            cols.map(c => {
              const dark = isDark(r, c);
              const piece = board[r][c];
              const isSel = selected?.[0] === r && selected?.[1] === c;
              const isLeg = legalMoves.some(m => m.to[0] === r && m.to[1] === c);
              const isLF = lastFrom?.[0] === r && lastFrom?.[1] === c;
              const isLT = lastTo?.[0] === r && lastTo?.[1] === c;

              // Classic checkerboard colors: cream and forest green
              let squareBg: string;
              if (!dark) {
                squareBg = '#FAEBD7'; // antique white / cream
              } else {
                if (isSel) squareBg = '#2E8B57'; // sea green highlight
                else if (isLF || isLT) squareBg = '#3A7D4A'; // muted highlight for last move
                else squareBg = '#1B5E20'; // deep forest green
              }

              const isClickable = dark && canInteract && turn === myColor && state.status === 'playing';

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => isClickable && onSquareClick(r, c)}
                  className="relative flex items-center justify-center select-none"
                  style={{
                    aspectRatio: '1',
                    background: squareBg,
                    cursor: isClickable ? 'pointer' : 'default',
                  }}
                >
                  {/* Legal move indicator */}
                  {isLeg && dark && !piece && (
                    <div className="absolute rounded-full z-10"
                      style={{
                        width: '36%', height: '36%',
                        background: 'rgba(255,215,0,0.45)',
                        boxShadow: '0 0 8px rgba(255,215,0,0.3)',
                      }} />
                  )}
                  {isLeg && dark && piece && (
                    <div className="absolute inset-0 z-10 pointer-events-none"
                      style={{ boxShadow: 'inset 0 0 0 3px rgba(255,215,0,0.6)' }} />
                  )}

                  {/* Checker piece */}
                  {piece && dark && (
                    <CheckerPieceRender
                      owner={piece.owner}
                      king={piece.king}
                      isSelected={isSel}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* File labels */}
      <div className="absolute bottom-0 left-6 right-0 flex">
        {cols.map(ci => (
          <div key={ci} className="flex-1 flex items-center justify-center"
            style={{ height: 22, fontSize: 11, fontWeight: 700, color: '#8B7355', fontFamily: 'monospace' }}>
            {String.fromCharCode(97 + ci)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export function Checkers() {
  const [state, setState] = useState<GameState>(makeInit);
  const [thinking, setThinking] = useState(false);
  const [mode, setMode] = useState<GameMode>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [myColor, setMyColor] = useState<Owner>('red');
  const [opponentName, setOpponentName] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const stateRef = useRef(state);
  stateRef.current = state;
  const aiTimerRef = useRef<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const playerId = useRef(getPlayerId());
  const playerName = useRef(getPlayerName());

  // ─── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ─── MULTIPLAYER: Create room ────────────────────────────────────────────
  const createRoom = useCallback(async () => {
    setError('');
    try {
      const res = await fetch(`${BASE}/games/create`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ game: 'checkers', playerId: playerId.current, playerName: playerName.current }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setRoomCode(data.roomCode);
      setMyColor('red');
      setMode('waiting');
      startPolling(data.roomCode);
    } catch (e) {
      setError('Failed to create room');
      console.log('[Checkers] createRoom error:', e);
    }
  }, []);

  // ─── MULTIPLAYER: Join room ──────────────────────────────────────────────
  const joinRoom = useCallback(async () => {
    if (!joinCode.trim()) { setError('Enter a room code'); return; }
    setError('');
    try {
      const res = await fetch(`${BASE}/games/join`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          game: 'checkers',
          roomCode: joinCode.trim().toUpperCase(),
          playerId: playerId.current,
          playerName: playerName.current,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setRoomCode(joinCode.trim().toUpperCase());
      setMyColor('black');
      setOpponentName(data.room.players.red?.name || 'Opponent');
      setState(makeInit());
      setMode('online');
      startPolling(joinCode.trim().toUpperCase());
    } catch (e) {
      setError('Failed to join room');
      console.log('[Checkers] joinRoom error:', e);
    }
  }, [joinCode]);

  // ─── MULTIPLAYER: Poll for game state ────────────────────────────────────
  const startPolling = useCallback((code: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${BASE}/games/checkers/${code}`, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
        const data = await res.json();
        if (!data.room) return;
        const room = data.room;

        // If waiting and opponent joined, start the game
        if (modeRef.current === 'waiting' && room.status === 'playing') {
          setOpponentName(room.players.black?.name || 'Opponent');
          setMode('online');
        }

        // If we're in online mode and the board was updated by the opponent
        if (modeRef.current === 'online' && room.board) {
          const currentState = stateRef.current;
          // Only update if it's a move by the OTHER player (turn changed to our turn)
          const isMyTurn = room.turn === (playerId.current === room.players.red?.id ? 'red' : 'black');
          if (isMyTurn || room.status === 'finished') {
            setState(prev => ({
              ...prev,
              board: room.board,
              turn: room.turn,
              jumpingFrom: room.jumpingFrom || null,
              status: room.status === 'finished' ? (room.winner === 'red' ? 'red_wins' : 'black_wins') : 'playing',
              history: room.moveHistory || prev.history,
              selected: null,
              legalMoves: [],
              lastFrom: null,
              lastTo: null,
            }));
          }
        }
      } catch (e) {
        console.log('[Checkers] poll error:', e);
      }
    }, 1500);
  }, []);

  // ─── Submit move to server (multiplayer) ─────────────────────────────────
  const submitMove = useCallback(async (newBoard: CBoard, nextTurn: Owner, notation: string, jumpingFrom: CPos | null, gameStatus?: string, winner?: Owner) => {
    try {
      await fetch(`${BASE}/games/checkers/${roomCode}/move`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          playerId: playerId.current,
          board: newBoard,
          turn: nextTurn,
          moveNotation: notation,
          jumpingFrom,
          status: gameStatus === 'playing' ? 'playing' : 'finished',
          winner: winner || null,
        }),
      });
    } catch (e) {
      console.log('[Checkers] submitMove error:', e);
    }
  }, [roomCode]);

  // ─── Handle square click ─────────────────────────────────────────────────
  const handleClick = useCallback((r: number, c: number) => {
    setState(prev => {
      const isAI = modeRef.current === 'ai';
      const isOnline = modeRef.current === 'online';
      const localPlayer: Owner = isAI ? 'red' : myColor;

      if (prev.turn !== localPlayer || prev.status !== 'playing') return prev;
      const { board, selected, jumpingFrom } = prev;

      const destMove = prev.legalMoves.find(m => m.to[0] === r && m.to[1] === c);
      if (destMove) {
        const nb = applyMove(board, destMove);
        const notation = `${String.fromCharCode(97 + destMove.from[1])}${8 - destMove.from[0]}→${String.fromCharCode(97 + r)}${8 - r}`;

        if (destMove.jump) {
          const further = getJumps(nb, r, c);
          if (further.length > 0) {
            if (isOnline) {
              submitMove(nb, localPlayer, notation, [r, c]);
            }
            return {
              ...prev, board: nb, selected: [r, c], jumpingFrom: [r, c],
              legalMoves: further, lastFrom: destMove.from, lastTo: [r, c],
            };
          }
        }

        const opponent: Owner = localPlayer === 'red' ? 'black' : 'red';
        const opponentMoves = allMovesFor(nb, opponent);
        let status: GameState['status'] = 'playing';
        let winner: Owner | undefined;
        if (countPieces(nb, opponent) === 0 || opponentMoves.length === 0) {
          status = localPlayer === 'red' ? 'red_wins' : 'black_wins';
          winner = localPlayer;
        }

        if (isOnline) {
          submitMove(nb, status === 'playing' ? opponent : prev.turn, notation, null, status, winner);
        }

        return {
          ...prev, board: nb,
          turn: status === 'playing' ? opponent : prev.turn,
          selected: null, jumpingFrom: null, legalMoves: [],
          status, history: [...prev.history, notation],
          lastFrom: destMove.from, lastTo: [r, c],
        };
      }

      if (jumpingFrom) return prev;

      if (board[r][c]?.owner === localPlayer) {
        const anyJump = hasAnyJumps(board, localPlayer);
        const moves = pieceMoves(board, r, c, anyJump);
        if (anyJump && moves.length === 0) return { ...prev, selected: [r, c], legalMoves: [] };
        return { ...prev, selected: [r, c], legalMoves: moves };
      }

      return { ...prev, selected: null, legalMoves: [] };
    });
  }, [myColor, submitMove]);

  // ─── AI turn effect (only in AI mode) ────────────────────────────────────
  useEffect(() => {
    if (mode !== 'ai') return;
    if (state.turn !== 'black' || state.status !== 'playing') return;
    setThinking(true);
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    aiTimerRef.current = window.setTimeout(() => {
      const { board, jumpingFrom } = stateRef.current;
      const aiJumping = stateRef.current.turn === 'black' ? jumpingFrom : null;
      const move = findBestCheckerMove(board, aiJumping);
      if (!move) { setThinking(false); return; }
      setState(prev => {
        const nb = applyMove(prev.board, move);
        if (move.jump) {
          const further = getJumps(nb, move.to[0], move.to[1]);
          if (further.length > 0) {
            return { ...prev, board: nb, turn: 'black', jumpingFrom: move.to, legalMoves: [], lastFrom: move.from, lastTo: move.to };
          }
        }
        const redMoves = allMovesFor(nb, 'red');
        let status: GameState['status'] = 'playing';
        if (countPieces(nb, 'red') === 0 || redMoves.length === 0) status = 'black_wins';
        return {
          ...prev, board: nb, turn: status === 'playing' ? 'red' : prev.turn,
          selected: null, jumpingFrom: null, legalMoves: [], status,
          history: [...prev.history, `${String.fromCharCode(97 + move.from[1])}${8 - move.from[0]}→${String.fromCharCode(97 + move.to[1])}${8 - move.to[0]}`],
          lastFrom: move.from, lastTo: move.to,
        };
      });
      setThinking(false);
    }, 120);
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, [state.turn, state.status, state.jumpingFrom, mode]);

  const reset = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    setThinking(false);
    setState(makeInit());
    setMode('menu');
    setRoomCode('');
    setJoinCode('');
    setError('');
    setOpponentName('');
  }, []);

  const startAI = useCallback(() => {
    setState(makeInit());
    setMyColor('red');
    setMode('ai');
  }, []);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomCode]);

  const { board, selected, legalMoves, status, turn, history, lastFrom, lastTo, jumpingFrom } = state;
  const redPieces = countPieces(board, 'red');
  const blackPieces = countPieces(board, 'black');
  const isOnline = mode === 'online';
  const isAI = mode === 'ai';
  const canInteract = (isAI || isOnline) && status === 'playing';

  // ═══════════════════════════════════════════════════════════════════════════
  //  MODE SELECTION MENU
  // ═══════════════════════════════════════════════════════════════════════════
  if (mode === 'menu' || mode === 'create' || mode === 'join') {
    return (
      <div className="min-h-[calc(100vh-96px)] p-4 md:p-6" style={{ background: '#06000F' }}>
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Link to="/games"
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
              style={{ background: '#1a003a', border: '1px solid #9D00FF40' }}>
              <ArrowLeft className="w-4 h-4 text-[#C084FC]" />
            </Link>
            <h1 className="text-2xl font-black text-white uppercase"
              style={{ textShadow: '0 0 20px #C084FC80, 0 0 40px #9D00FF40' }}>
              CHECKERS
            </h1>
          </div>

          {/* Mode buttons */}
          {mode === 'menu' && (
            <div className="space-y-4">
              <button onClick={startAI}
                className="w-full p-6 rounded-2xl text-left transition-all hover:scale-[1.02] group"
                style={{ background: 'linear-gradient(135deg, #1a003a, #0D001E)', border: '1px solid #9D00FF40' }}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ background: '#9D00FF20' }}>
                    <Bot className="w-7 h-7 text-[#C084FC]" />
                  </div>
                  <div>
                    <p className="text-white font-black text-lg">VS COMPUTER</p>
                    <p className="text-[#7B6F90] text-sm">Play against the AI opponent</p>
                  </div>
                </div>
              </button>

              <button onClick={() => setMode('create')}
                className="w-full p-6 rounded-2xl text-left transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #002a1a, #001a10)', border: '1px solid #00FF8840' }}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ background: '#00FF8820' }}>
                    <Users className="w-7 h-7 text-[#00FF88]" />
                  </div>
                  <div>
                    <p className="text-white font-black text-lg">CREATE GAME</p>
                    <p className="text-[#5A8070] text-sm">Get a room code and invite a friend</p>
                  </div>
                </div>
              </button>

              <button onClick={() => setMode('join')}
                className="w-full p-6 rounded-2xl text-left transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #2a1a00, #1a1000)', border: '1px solid #FFB34740' }}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ background: '#FFB34720' }}>
                    <Wifi className="w-7 h-7 text-[#FFB347]" />
                  </div>
                  <div>
                    <p className="text-white font-black text-lg">JOIN GAME</p>
                    <p className="text-[#8B7355] text-sm">Enter a room code to play someone</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Create room */}
          {mode === 'create' && (
            <div className="space-y-4">
              <button onClick={() => setMode('menu')} className="text-[#7B6F90] text-sm hover:text-white flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              <div className="rounded-2xl p-6 text-center" style={{ background: '#0D001E', border: '1px solid #00FF8840' }}>
                <Users className="w-10 h-10 text-[#00FF88] mx-auto mb-3" />
                <p className="text-white font-black text-lg mb-2">CREATE A ROOM</p>
                <p className="text-[#7B6F90] text-sm mb-4">You'll play as <span className="text-[#FF4444] font-bold">Red</span> (moves first)</p>
                <button onClick={createRoom}
                  className="px-8 py-3 rounded-xl font-black text-sm transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #00AA55, #008844)', color: '#fff' }}>
                  CREATE ROOM
                </button>
                {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
              </div>
            </div>
          )}

          {/* Join room */}
          {mode === 'join' && (
            <div className="space-y-4">
              <button onClick={() => setMode('menu')} className="text-[#7B6F90] text-sm hover:text-white flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              <div className="rounded-2xl p-6" style={{ background: '#0D001E', border: '1px solid #FFB34740' }}>
                <Wifi className="w-10 h-10 text-[#FFB347] mx-auto mb-3" />
                <p className="text-white font-black text-lg mb-2 text-center">JOIN A ROOM</p>
                <p className="text-[#7B6F90] text-sm mb-4 text-center">You'll play as <span className="font-bold" style={{ color: '#333' }}>Black</span></p>
                <input
                  type="text"
                  placeholder="Enter room code"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={5}
                  className="w-full px-4 py-3 rounded-xl text-center text-xl font-black tracking-[0.3em] uppercase"
                  style={{ background: '#0a0018', border: '1px solid #FFB34740', color: '#FFB347', outline: 'none' }}
                />
                <button onClick={joinRoom}
                  className="w-full mt-3 px-8 py-3 rounded-xl font-black text-sm transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #CC8800, #AA7700)', color: '#fff' }}>
                  JOIN GAME
                </button>
                {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  WAITING FOR OPPONENT
  // ═══════════════════════════════════════════════════════════════════════════
  if (mode === 'waiting') {
    return (
      <div className="min-h-[calc(100vh-96px)] p-4 md:p-6" style={{ background: '#06000F' }}>
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <button onClick={reset}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
              style={{ background: '#1a003a', border: '1px solid #9D00FF40' }}>
              <ArrowLeft className="w-4 h-4 text-[#C084FC]" />
            </button>
            <h1 className="text-2xl font-black text-white uppercase"
              style={{ textShadow: '0 0 20px #C084FC80' }}>
              WAITING FOR OPPONENT
            </h1>
          </div>

          <div className="rounded-2xl p-8 text-center" style={{ background: '#0D001E', border: '1px solid #00FF8840' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 mx-auto mb-4 rounded-full"
              style={{ border: '3px solid #0D001E', borderTopColor: '#00FF88' }}
            />
            <p className="text-[#7B6F90] text-sm mb-6">Share this code with your opponent:</p>
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="px-6 py-3 rounded-xl text-3xl font-black tracking-[0.4em]"
                style={{ background: '#0a0018', border: '2px solid #00FF8860', color: '#00FF88' }}>
                {roomCode}
              </div>
              <button onClick={copyCode}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110"
                style={{ background: '#00FF8820', border: '1px solid #00FF8840' }}>
                {copied ? <Check className="w-4 h-4 text-[#00FF88]" /> : <Copy className="w-4 h-4 text-[#00FF88]" />}
              </button>
            </div>
            <p className="text-[#3B2F50] text-xs">You'll play as <span className="text-[#FF4444] font-bold">Red</span> · Game starts when they join</p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  GAME BOARD (AI or Online)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-[calc(100vh-96px)] p-4 md:p-6" style={{ background: '#06000F' }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={reset}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{ background: '#1a003a', border: '1px solid #9D00FF40' }}>
            <ArrowLeft className="w-4 h-4 text-[#C084FC]" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white uppercase"
              style={{ textShadow: '0 0 20px #C084FC80, 0 0 40px #9D00FF40' }}>
              CHECKERS
            </h1>
            <p className="text-xs text-[#7B6F90]">
              {isAI
                ? 'You play Red (bottom) · AI plays Black (top)'
                : `You play ${myColor === 'red' ? 'Red' : 'Black'} · vs ${opponentName}`
              }
            </p>
          </div>
          {isOnline && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: '#00FF8815', border: '1px solid #00FF8830', color: '#00FF88' }}>
              <div className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
              LIVE · {roomCode}
            </div>
          )}
          <button onClick={reset}
            className={`${isOnline ? '' : 'ml-auto'} flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105`}
            style={{ background: '#1a003a', border: '1px solid #9D00FF40', color: '#C084FC' }}>
            <RotateCcw className="w-3.5 h-3.5" /> {isOnline ? 'Leave' : 'New Game'}
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">

          {/* Board column */}
          <div className="flex-shrink-0 w-full" style={{ maxWidth: 496 }}>

            {/* Piece counts */}
            <div className="flex gap-3 mb-3">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                style={{ background: '#0D001E', border: `1px solid ${turn === 'red' ? '#FF444460' : '#1a0040'}` }}>
                <div className="w-5 h-5 rounded-full flex-shrink-0"
                  style={{
                    background: 'radial-gradient(circle at 35% 35%, #E8304A, #C41E3A 50%, #8B0000)',
                    boxShadow: '0 2px 3px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(0,0,0,0.3)',
                  }} />
                <span className="text-[#FF8888] font-bold">{isAI ? 'You' : (myColor === 'red' ? 'You' : opponentName)}</span>
                <span className="ml-auto text-[#FF4444] font-black text-sm">{redPieces}</span>
              </div>
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                style={{ background: '#0D001E', border: `1px solid ${turn === 'black' ? '#88888860' : '#1a0040'}` }}>
                <div className="w-5 h-5 rounded-full flex-shrink-0"
                  style={{
                    background: 'radial-gradient(circle at 35% 35%, #444, #1A1A1A 50%, #0A0A0A)',
                    boxShadow: '0 2px 3px rgba(0,0,0,0.5), inset 0 -1px 2px rgba(0,0,0,0.3)',
                  }} />
                <span className="text-[#999] font-bold">{isAI ? 'AI' : (myColor === 'black' ? 'You' : opponentName)}</span>
                <span className="ml-auto text-[#666] font-black text-sm">{blackPieces}</span>
              </div>
            </div>

            {/* Status banners */}
            <AnimatePresence>
              {status !== 'playing' && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 p-3 rounded-xl text-center text-sm font-black"
                  style={{
                    background: status === 'red_wins'
                      ? (myColor === 'red' || isAI ? 'linear-gradient(135deg,#003322,#004433)' : 'linear-gradient(135deg,#330000,#550000)')
                      : (myColor === 'black' ? 'linear-gradient(135deg,#003322,#004433)' : 'linear-gradient(135deg,#330000,#550000)'),
                    border: `1px solid ${(status === 'red_wins' && (myColor === 'red' || isAI)) || (status === 'black_wins' && myColor === 'black') ? '#00FF8860' : '#FF444460'}`,
                    color: (status === 'red_wins' && (myColor === 'red' || isAI)) || (status === 'black_wins' && myColor === 'black') ? '#00FF88' : '#FF6666',
                    textShadow: '0 0 12px currentColor',
                  }}>
                  {status === 'red_wins' && (isAI || myColor === 'red') && '🎉 YOU WIN!'}
                  {status === 'red_wins' && !isAI && myColor === 'black' && `${opponentName} WINS!`}
                  {status === 'black_wins' && isAI && '🤖 AI WINS! Better luck next time!'}
                  {status === 'black_wins' && !isAI && myColor === 'black' && '🎉 YOU WIN!'}
                  {status === 'black_wins' && !isAI && myColor === 'red' && `${opponentName} WINS!`}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Multi-jump notice */}
            {jumpingFrom && turn === myColor && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-3 px-3 py-2 rounded-xl text-xs font-bold text-center"
                style={{ background: '#1a003a', border: '1px solid #FF4444', color: '#FF8888' }}>
                ⚡ Multi-jump! Keep jumping with the same piece!
              </motion.div>
            )}

            {thinking && isAI && (
              <div className="mb-3 px-3 py-2 rounded-xl flex items-center gap-2 text-xs text-[#C084FC]"
                style={{ background: '#0D001E', border: '1px solid #9D00FF30' }}>
                <Brain className="w-3.5 h-3.5 animate-pulse" />
                AI is thinking...
              </div>
            )}

            {isOnline && turn !== myColor && status === 'playing' && (
              <div className="mb-3 px-3 py-2 rounded-xl flex items-center gap-2 text-xs text-[#FFB347]"
                style={{ background: '#0D001E', border: '1px solid #FFB34730' }}>
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>⏳</motion.div>
                Waiting for {opponentName}'s move...
              </div>
            )}

            {/* THE BOARD */}
            <div className="w-full">
              <CheckerBoard
                state={state}
                onSquareClick={handleClick}
                myColor={myColor}
                canInteract={canInteract}
              />
            </div>

            {/* Turn indicator */}
            <div className="flex gap-2 mt-1">
              <div className="flex-1 p-2 rounded-xl text-center text-xs font-bold transition-all"
                style={{
                  background: turn === 'red' ? '#2a0010' : '#0a0018',
                  border: `1px solid ${turn === 'red' ? '#FF444450' : '#1a0040'}`,
                  color: turn === 'red' ? '#FF8888' : '#3B2F50',
                }}>
                🔴 {isAI ? 'You' : (myColor === 'red' ? 'You' : opponentName)} {turn === 'red' ? '(playing)' : ''}
              </div>
              <div className="flex-1 p-2 rounded-xl text-center text-xs font-bold transition-all"
                style={{
                  background: turn === 'black' ? '#1a1a1a' : '#0a0018',
                  border: `1px solid ${turn === 'black' ? '#88888850' : '#1a0040'}`,
                  color: turn === 'black' ? '#bbb' : '#3B2F50',
                }}>
                ⚫ {isAI ? 'AI' : (myColor === 'black' ? 'You' : opponentName)} {turn === 'black' ? (isAI && thinking ? '(thinking…)' : '(playing)') : ''}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex-1 min-w-0 w-full lg:w-auto space-y-4">
            <div className="rounded-2xl p-4" style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
              <p className="text-white font-black text-sm mb-3 uppercase tracking-wide">Move Log</p>
              {history.length === 0 ? (
                <p className="text-[#3B2F50] text-xs italic">No moves yet. Click a piece to begin.</p>
              ) : (
                <div className="overflow-y-auto" style={{ maxHeight: 220, scrollbarWidth: 'thin', scrollbarColor: '#3B2F50 transparent' }}>
                  <div className="grid grid-cols-[28px_1fr_1fr] gap-x-2 gap-y-0.5 text-xs font-mono">
                    {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => (
                      <React.Fragment key={i}>
                        <span className="text-[#3B2F50] flex items-center">{i + 1}.</span>
                        <span className="text-[#FF8888] px-2 py-1 rounded" style={{ background: '#0a0018' }}>
                          {history[i * 2] ?? ''}
                        </span>
                        <span className="text-[#999] px-2 py-1 rounded" style={{ background: '#0a0018' }}>
                          {history[i * 2 + 1] ?? ''}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl p-4" style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
              <p className="text-white font-black text-sm mb-3 uppercase tracking-wide">How to Play</p>
              <ul className="text-[#7B6F90] text-xs space-y-2">
                <li className="flex gap-2"><span className="text-[#FF6666]">•</span> Click a piece to select it</li>
                <li className="flex gap-2"><span className="text-[#FF6666]">•</span> Gold dots show valid moves — click to move</li>
                <li className="flex gap-2"><span className="text-[#FF6666]">•</span> <strong className="text-[#FFAAAA]">Jumping is mandatory</strong> — if you can jump, you must</li>
                <li className="flex gap-2"><span className="text-[#FF6666]">•</span> Multi-jumps are forced — keep jumping until no more available</li>
                <li className="flex gap-2"><span className="text-[#FF6666]">•</span> Reach the far end to become a <strong className="text-[#FFD700]">King ♛</strong> — moves in all 4 directions</li>
                <li className="flex gap-2"><span className="text-[#FF6666]">•</span> Win by capturing all opponent pieces or blocking all their moves</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}