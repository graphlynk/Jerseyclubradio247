import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, RotateCcw, Brain, Users, Bot, Copy, Check, Wifi } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-715f71b9`;
const HEADERS: Record<string, string> = { Authorization: `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' };

// ─── Types ───────────────────────────────────────────────────────────────────
type PType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
type Col = 'w' | 'b';
interface Piece { t: PType; c: Col }
type Sq = Piece | null;
type Board = Sq[][];
type Pos = [number, number];

interface CastlingRights { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean }

type GameMode = 'menu' | 'ai' | 'create' | 'join' | 'waiting' | 'online';

interface GameState {
  board: Board;
  turn: Col;
  castling: CastlingRights;
  enPassant: Pos | null;
  status: 'playing' | 'check' | 'checkmate' | 'stalemate';
  winner: Col | null;
  selected: Pos | null;
  legalMoves: Pos[];
  history: string[];
  lastMove: { from: Pos; to: Pos } | null;
}

// ─── Piece symbols ───────────────────────────────────────────────────────────
const WP: Record<PType, string> = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙' };
const BP: Record<PType, string> = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };
const PV: Record<PType, number> = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

// Piece-square tables (row 0 = home back rank, row 7 = opponent's back rank)
const PST: Record<PType, number[][]> = {
  P: [
    [0,0,0,0,0,0,0,0],
    [5,10,10,-20,-20,10,10,5],
    [5,-5,-10,0,0,-10,-5,5],
    [0,0,0,20,20,0,0,0],
    [5,5,10,25,25,10,5,5],
    [10,10,20,30,30,20,10,10],
    [50,50,50,50,50,50,50,50],
    [0,0,0,0,0,0,0,0],
  ],
  N: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,0,5,5,0,-20,-40],
    [-30,5,10,15,15,10,5,-30],
    [-30,0,15,20,20,15,0,-30],
    [-30,5,15,20,20,15,5,-30],
    [-30,0,10,15,15,10,0,-30],
    [-40,-20,0,0,0,0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50],
  ],
  B: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,5,0,0,0,0,5,-10],
    [-10,10,10,10,10,10,10,-10],
    [-10,0,10,10,10,10,0,-10],
    [-10,5,5,10,10,5,5,-10],
    [-10,0,5,10,10,5,0,-10],
    [-10,5,0,0,0,0,5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20],
  ],
  R: [
    [0,0,0,5,5,0,0,0],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [-5,0,0,0,0,0,0,-5],
    [5,10,10,10,10,10,10,5],
    [0,0,0,0,0,0,0,0],
  ],
  Q: [
    [-20,-10,-10,-5,-5,-10,-10,-20],
    [-10,0,5,0,0,0,0,-10],
    [-10,5,5,5,5,5,0,-10],
    [0,0,5,5,5,5,0,-5],
    [-5,0,5,5,5,5,0,-5],
    [-10,0,5,5,5,5,0,-10],
    [-10,0,0,0,0,0,0,-10],
    [-20,-10,-10,-5,-5,-10,-10,-20],
  ],
  K: [
    [20,30,10,0,0,10,30,20],
    [20,20,0,0,0,0,20,20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
  ],
};

// ─── Board helpers ────────────────────────────────────────────────────────────
const inB = (r: number, c: number) => r >= 0 && r < 8 && c >= 0 && c < 8;
const opp = (c: Col): Col => c === 'w' ? 'b' : 'w';
const cloneB = (b: Board): Board => b.map(r => r.map(sq => sq ? { ...sq } : null));

function initBoard(): Board {
  const b: Board = Array(8).fill(null).map(() => Array(8).fill(null));
  const back: PType[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let c = 0; c < 8; c++) {
    b[0][c] = { t: back[c], c: 'b' };
    b[1][c] = { t: 'P', c: 'b' };
    b[6][c] = { t: 'P', c: 'w' };
    b[7][c] = { t: back[c], c: 'w' };
  }
  return b;
}

// ─── Move generation ─────────────────────────────────────────────────────────
function pseudoMoves(board: Board, r: number, c: number, castling: CastlingRights, ep: Pos | null): Pos[] {
  const p = board[r][c];
  if (!p) return [];
  const { t, c: color } = p;
  const enemy = opp(color);
  const moves: Pos[] = [];

  const slide = (dirs: [number, number][]) => {
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (inB(nr, nc)) {
        if (board[nr][nc]) { if (board[nr][nc]!.c === enemy) moves.push([nr, nc]); break; }
        moves.push([nr, nc]);
        nr += dr; nc += dc;
      }
    }
  };

  if (t === 'P') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    if (inB(r + dir, c) && !board[r + dir][c]) {
      moves.push([r + dir, c]);
      if (r === startRow && !board[r + 2 * dir][c]) moves.push([r + 2 * dir, c]);
    }
    for (const dc of [-1, 1]) {
      const nr = r + dir, nc = c + dc;
      if (inB(nr, nc)) {
        if (board[nr][nc]?.c === enemy) moves.push([nr, nc]);
        if (ep && ep[0] === nr && ep[1] === nc) moves.push([nr, nc]);
      }
    }
  } else if (t === 'N') {
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]] as [number,number][]) {
      const nr = r + dr, nc = c + dc;
      if (inB(nr, nc) && board[nr][nc]?.c !== color) moves.push([nr, nc]);
    }
  } else if (t === 'B') {
    slide([[-1,-1],[-1,1],[1,-1],[1,1]]);
  } else if (t === 'R') {
    slide([[-1,0],[1,0],[0,-1],[0,1]]);
  } else if (t === 'Q') {
    slide([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
  } else if (t === 'K') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (inB(nr, nc) && board[nr][nc]?.c !== color) moves.push([nr, nc]);
      }
    }
    const homeR = color === 'w' ? 7 : 0;
    if (r === homeR && c === 4) {
      if ((color === 'w' ? castling.wK : castling.bK) && !board[homeR][5] && !board[homeR][6])
        moves.push([homeR, 6]);
      if ((color === 'w' ? castling.wQ : castling.bQ) && !board[homeR][3] && !board[homeR][2] && !board[homeR][1])
        moves.push([homeR, 2]);
    }
  }
  return moves;
}

function isAttacked(board: Board, r: number, c: number, byColor: Col): boolean {
  for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]] as [number,number][]) {
    const nr = r + dr, nc = c + dc;
    if (inB(nr, nc) && board[nr][nc]?.c === byColor && board[nr][nc]?.t === 'N') return true;
  }
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]] as [number,number][]) {
    let nr = r + dr, nc = c + dc;
    while (inB(nr, nc)) {
      const sq = board[nr][nc];
      if (sq) { if (sq.c === byColor && (sq.t === 'R' || sq.t === 'Q')) return true; break; }
      nr += dr; nc += dc;
    }
  }
  for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]] as [number,number][]) {
    let nr = r + dr, nc = c + dc;
    while (inB(nr, nc)) {
      const sq = board[nr][nc];
      if (sq) { if (sq.c === byColor && (sq.t === 'B' || sq.t === 'Q')) return true; break; }
      nr += dr; nc += dc;
    }
  }
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (inB(nr, nc) && board[nr][nc]?.c === byColor && board[nr][nc]?.t === 'K') return true;
    }
  }
  const pawnRow = byColor === 'w' ? r + 1 : r - 1;
  for (const dc of [-1, 1]) {
    const nc = c + dc;
    if (inB(pawnRow, nc) && board[pawnRow][nc]?.c === byColor && board[pawnRow][nc]?.t === 'P') return true;
  }
  return false;
}

function findKing(board: Board, color: Col): Pos {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.t === 'K' && board[r][c]?.c === color) return [r, c];
  return [-1, -1];
}

function isInCheck(board: Board, color: Col): boolean {
  const [kr, kc] = findKing(board, color);
  return kr !== -1 && isAttacked(board, kr, kc, opp(color));
}

function applyMove(board: Board, from: Pos, to: Pos, castling: CastlingRights, ep: Pos | null): { board: Board; castling: CastlingRights; enPassant: Pos | null } {
  const nb = cloneB(board);
  const [fr, fc] = from;
  const [tr, tc] = to;
  const piece = nb[fr][fc]!;
  let newEP: Pos | null = null;
  const newC = { ...castling };

  if (piece.t === 'P' && ep && tr === ep[0] && tc === ep[1]) {
    nb[piece.c === 'w' ? tr + 1 : tr - 1][tc] = null;
  }
  if (piece.t === 'P' && Math.abs(tr - fr) === 2) {
    newEP = [(fr + tr) / 2, fc] as Pos;
  }
  if (piece.t === 'K' && Math.abs(tc - fc) === 2) {
    if (tc === 6) { nb[fr][5] = nb[fr][7]; nb[fr][7] = null; }
    else { nb[fr][3] = nb[fr][0]; nb[fr][0] = null; }
  }
  if (piece.t === 'K') {
    if (piece.c === 'w') { newC.wK = false; newC.wQ = false; }
    else { newC.bK = false; newC.bQ = false; }
  }
  if (piece.t === 'R') {
    if (fr === 7 && fc === 0) newC.wQ = false;
    if (fr === 7 && fc === 7) newC.wK = false;
    if (fr === 0 && fc === 0) newC.bQ = false;
    if (fr === 0 && fc === 7) newC.bK = false;
  }
  nb[tr][tc] = piece;
  nb[fr][fc] = null;
  if (piece.t === 'P' && (tr === 0 || tr === 7)) nb[tr][tc] = { t: 'Q', c: piece.c };
  return { board: nb, castling: newC, enPassant: newEP };
}

function getLegalMoves(board: Board, r: number, c: number, castling: CastlingRights, ep: Pos | null): Pos[] {
  const p = board[r][c];
  if (!p) return [];
  const color = p.c;
  const pseudo = pseudoMoves(board, r, c, castling, ep);
  const legal: Pos[] = [];
  for (const to of pseudo) {
    if (p.t === 'K' && Math.abs(to[1] - c) === 2) {
      if (isInCheck(board, color)) continue;
      const passCol = to[1] === 6 ? 5 : 3;
      const tmp = cloneB(board);
      tmp[r][passCol] = p; tmp[r][c] = null;
      if (isAttacked(tmp, r, passCol, opp(color))) continue;
    }
    const { board: nb } = applyMove(board, [r, c], to, castling, ep);
    if (!isInCheck(nb, color)) legal.push(to);
  }
  return legal;
}

function getAllLegalMoves(board: Board, color: Col, castling: CastlingRights, ep: Pos | null): { from: Pos; to: Pos }[] {
  const moves: { from: Pos; to: Pos }[] = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.c === color)
        for (const to of getLegalMoves(board, r, c, castling, ep))
          moves.push({ from: [r, c], to });
  return moves;
}

// ─── Evaluation ──────────────────────────────────────────────────────────────
function evaluate(board: Board): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const pstRow = p.c === 'b' ? r : 7 - r;
      const val = PV[p.t] + PST[p.t][pstRow][c];
      score += p.c === 'b' ? val : -val;
    }
  }
  return score;
}

function minimax(board: Board, castling: CastlingRights, ep: Pos | null, depth: number, alpha: number, beta: number, isMax: boolean): number {
  if (depth === 0) return evaluate(board);
  const color: Col = isMax ? 'b' : 'w';
  const moves = getAllLegalMoves(board, color, castling, ep);
  if (moves.length === 0) {
    if (isInCheck(board, color)) return isMax ? -90000 + depth : 90000 - depth;
    return 0;
  }
  if (isMax) {
    let best = -Infinity;
    for (const { from, to } of moves) {
      const { board: nb, castling: nc, enPassant: nep } = applyMove(board, from, to, castling, ep);
      best = Math.max(best, minimax(nb, nc, nep, depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const { from, to } of moves) {
      const { board: nb, castling: nc, enPassant: nep } = applyMove(board, from, to, castling, ep);
      best = Math.min(best, minimax(nb, nc, nep, depth - 1, alpha, beta, true));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

function findBestMove(board: Board, castling: CastlingRights, ep: Pos | null): { from: Pos; to: Pos } | null {
  const moves = getAllLegalMoves(board, 'b', castling, ep);
  if (moves.length === 0) return null;
  moves.sort(() => Math.random() - 0.5);
  let bestVal = -Infinity;
  let best = moves[0];
  for (const m of moves) {
    const { board: nb, castling: nc, enPassant: nep } = applyMove(board, m.from, m.to, castling, ep);
    const val = minimax(nb, nc, nep, 1, -Infinity, Infinity, false);
    if (val > bestVal) { bestVal = val; best = m; }
  }
  return best;
}

// ─── Notation helpers ─────────────────────────────────────────────────────────
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const toAN = ([r, c]: Pos) => FILES[c] + (8 - r);
function moveNote(board: Board, from: Pos, to: Pos): string {
  const p = board[from[0]][from[1]];
  if (!p) return '';
  const cap = board[to[0]][to[1]] ? 'x' : '';
  if (p.t === 'P') return `${cap ? FILES[from[1]] + 'x' : ''}${toAN(to)}`;
  if (p.t === 'K' && Math.abs(to[1] - from[1]) === 2) return to[1] === 6 ? 'O-O' : 'O-O-O';
  return `${p.t}${cap}${toAN(to)}`;
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
  let id = localStorage.getItem('jc_chess_id');
  if (!id) { id = 'ch_' + Math.random().toString(36).slice(2, 10); localStorage.setItem('jc_chess_id', id); }
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
function makeInitState(): GameState {
  return {
    board: initBoard(),
    turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    status: 'playing',
    winner: null,
    selected: null,
    legalMoves: [],
    history: [],
    lastMove: null,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CHESS BOARD COMPONENT — realistic wood frame
// ═══════════════════════════════════════════════════════════════════════════════
function ChessBoard({ state, onSquareClick, myColor, canInteract }: {
  state: GameState;
  onSquareClick: (r: number, c: number) => void;
  myColor: Col;
  canInteract: boolean;
}) {
  const { board, selected, legalMoves, lastMove, turn } = state;

  // Flip board for black player
  const flipBoard = myColor === 'b';
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
              const light = (r + c) % 2 === 0;
              const piece = board[r][c];
              const isSel = selected?.[0] === r && selected?.[1] === c;
              const isLeg = legalMoves.some(([lr, lc]) => lr === r && lc === c);
              const isLF = lastMove?.from[0] === r && lastMove?.from[1] === c;
              const isLT = lastMove?.to[0] === r && lastMove?.to[1] === c;
              const isCapture = isLeg && !!piece;

              // Classic chess.com style colors
              let bg = light ? '#F0D9B5' : '#B58863';
              if (isSel) bg = light ? '#F6F669' : '#BBCA2B';
              else if (isLF || isLT) bg = light ? '#CDD26A' : '#AAAA23';

              const isClickable = canInteract && turn === myColor && (state.status === 'playing' || state.status === 'check');

              return (
                <div
                  key={`${r}-${c}`}
                  onClick={() => isClickable && onSquareClick(r, c)}
                  className="relative flex items-center justify-center select-none"
                  style={{
                    aspectRatio: '1',
                    background: bg,
                    cursor: isClickable ? 'pointer' : 'default',
                  }}
                >
                  {/* Legal move dot */}
                  {isLeg && !isCapture && (
                    <div className="absolute rounded-full pointer-events-none z-10"
                      style={{ width: '32%', height: '32%', background: 'rgba(0,0,0,0.22)' }} />
                  )}
                  {/* Capture ring */}
                  {isCapture && (
                    <div className="absolute inset-0 pointer-events-none z-10"
                      style={{ boxShadow: 'inset 0 0 0 4px rgba(0,0,0,0.25)' }} />
                  )}

                  {/* Piece */}
                  {piece && (
                    <span
                      className="select-none relative z-20 leading-none"
                      style={{
                        fontSize: 'clamp(20px, 5.5vw, 46px)',
                        color: piece.c === 'w' ? '#FFFFF0' : '#1a1a1a',
                        textShadow: piece.c === 'w'
                          ? '0 1px 4px rgba(0,0,0,0.95), 0 0 2px rgba(0,0,0,1), 0 2px 6px rgba(0,0,0,0.5)'
                          : '0 1px 3px rgba(255,255,255,0.2), 0 0 1px rgba(0,0,0,0.8)',
                        filter: piece.c === 'w'
                          ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.9))'
                          : 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))',
                        transition: 'transform 0.1s',
                        transform: isSel ? 'scale(1.12)' : 'none',
                      }}>
                      {piece.c === 'w' ? WP[piece.t] : BP[piece.t]}
                    </span>
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
            {FILES[ci]}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export function Chess() {
  const [state, setState] = useState<GameState>(makeInitState);
  const [thinking, setThinking] = useState(false);
  const [mode, setMode] = useState<GameMode>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [myColor, setMyColor] = useState<Col>('w');
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

  // ─── Cleanup ─────────────────────────────────────────────────────────────
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
        body: JSON.stringify({ game: 'chess', playerId: playerId.current, playerName: playerName.current }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setRoomCode(data.roomCode);
      setMyColor('w');
      setMode('waiting');
      startPolling(data.roomCode);
    } catch (e) {
      setError('Failed to create room');
      console.log('[Chess] createRoom error:', e);
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
          game: 'chess',
          roomCode: joinCode.trim().toUpperCase(),
          playerId: playerId.current,
          playerName: playerName.current,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setRoomCode(joinCode.trim().toUpperCase());
      setMyColor('b');
      setOpponentName(data.room.players.red?.name || 'Opponent');
      setState(makeInitState());
      setMode('online');
      startPolling(joinCode.trim().toUpperCase());
    } catch (e) {
      setError('Failed to join room');
      console.log('[Chess] joinRoom error:', e);
    }
  }, [joinCode]);

  // ─── MULTIPLAYER: Poll for game state ────────────────────────────────────
  const startPolling = useCallback((code: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${BASE}/games/chess/${code}`, { headers: { Authorization: `Bearer ${publicAnonKey}` } });
        const data = await res.json();
        if (!data.room) return;
        const room = data.room;

        if (modeRef.current === 'waiting' && room.status === 'playing') {
          setOpponentName(room.players.black?.name || 'Opponent');
          setMode('online');
        }

        if (modeRef.current === 'online' && room.board) {
          const myCol = playerId.current === room.players.red?.id ? 'w' : 'b';
          const isMyTurn = room.turn === myCol;
          if (isMyTurn || room.status === 'finished') {
            setState(prev => ({
              ...prev,
              board: room.board,
              turn: room.turn,
              castling: room.castling || prev.castling,
              enPassant: room.enPassant || null,
              status: room.status === 'finished'
                ? (room.winner ? 'checkmate' : 'stalemate')
                : (room.checkStatus || 'playing'),
              winner: room.winner || null,
              history: room.moveHistory || prev.history,
              selected: null,
              legalMoves: [],
              lastMove: room.lastMove || null,
            }));
          }
        }
      } catch (e) {
        console.log('[Chess] poll error:', e);
      }
    }, 1500);
  }, []);

  // ─── Submit move to server (multiplayer) ─────────────────────────────────
  const submitMove = useCallback(async (
    newBoard: Board, nextTurn: Col, notation: string, castling: CastlingRights,
    enPassant: Pos | null, gameStatus: string, winner: Col | null, lastMoveData: { from: Pos; to: Pos },
    checkStatus: string
  ) => {
    try {
      await fetch(`${BASE}/games/chess/${roomCode}/move`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({
          playerId: playerId.current,
          board: newBoard,
          turn: nextTurn,
          moveNotation: notation,
          castling,
          enPassant,
          status: gameStatus,
          winner,
          lastMove: lastMoveData,
          checkStatus,
        }),
      });
    } catch (e) {
      console.log('[Chess] submitMove error:', e);
    }
  }, [roomCode]);

  // ─── Handle square click ─────────────────────────────────────────────────
  const handleClick = useCallback((r: number, c: number) => {
    setState(prev => {
      const isAI = modeRef.current === 'ai';
      const isOnline = modeRef.current === 'online';
      const localColor: Col = isAI ? 'w' : myColor;

      if (prev.turn !== localColor || (prev.status === 'checkmate' || prev.status === 'stalemate')) return prev;
      const { board, selected, legalMoves, castling, enPassant } = prev;

      // Execute move
      if (selected) {
        const isLegal = legalMoves.some(([lr, lc]) => lr === r && lc === c);
        if (isLegal) {
          const note = moveNote(board, selected, [r, c]);
          const { board: nb, castling: nc, enPassant: nep } = applyMove(board, selected, [r, c], castling, enPassant);
          const enemy = opp(localColor);
          const enemyMoves = getAllLegalMoves(nb, enemy, nc, nep);
          const enemyCheck = isInCheck(nb, enemy);
          let status: GameState['status'] = 'playing';
          let winner: Col | null = null;
          if (enemyMoves.length === 0) {
            if (enemyCheck) { status = 'checkmate'; winner = localColor; }
            else status = 'stalemate';
          } else if (enemyCheck) status = 'check';
          const suffix = status === 'checkmate' ? '#' : enemyCheck ? '+' : '';
          const lastMoveData = { from: selected, to: [r, c] as Pos };

          if (isOnline) {
            submitMove(
              nb, status === 'checkmate' || status === 'stalemate' ? prev.turn : enemy,
              note + suffix, nc, nep,
              status === 'checkmate' || status === 'stalemate' ? 'finished' : 'playing',
              winner, lastMoveData, status
            );
          }

          return {
            ...prev, board: nb, turn: enemy, castling: nc, enPassant: nep,
            status, winner, selected: null, legalMoves: [],
            history: [...prev.history, note + suffix], lastMove: lastMoveData,
          };
        }
        // Re-select own piece
        if (board[r][c]?.c === localColor) {
          return { ...prev, selected: [r, c], legalMoves: getLegalMoves(board, r, c, castling, enPassant) };
        }
        return { ...prev, selected: null, legalMoves: [] };
      }

      // Select piece
      if (board[r][c]?.c === localColor) {
        return { ...prev, selected: [r, c], legalMoves: getLegalMoves(board, r, c, castling, enPassant) };
      }
      return prev;
    });
  }, [myColor, submitMove]);

  // ─── AI move effect (only in AI mode) ────────────────────────────────────
  useEffect(() => {
    if (mode !== 'ai') return;
    if (state.turn !== 'b' || state.status === 'checkmate' || state.status === 'stalemate') return;
    setThinking(true);
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    aiTimerRef.current = window.setTimeout(() => {
      const { board, castling, enPassant } = stateRef.current;
      const move = findBestMove(board, castling, enPassant);
      if (!move) { setThinking(false); return; }
      setState(prev => {
        const note = moveNote(prev.board, move.from, move.to);
        const { board: nb, castling: nc, enPassant: nep } = applyMove(prev.board, move.from, move.to, prev.castling, prev.enPassant);
        const wMoves = getAllLegalMoves(nb, 'w', nc, nep);
        const wCheck = isInCheck(nb, 'w');
        let status: GameState['status'] = 'playing';
        let winner: Col | null = null;
        if (wMoves.length === 0) {
          if (wCheck) { status = 'checkmate'; winner = 'b'; }
          else status = 'stalemate';
        } else if (wCheck) status = 'check';
        const suffix = status === 'checkmate' ? '#' : wCheck ? '+' : '';
        return { ...prev, board: nb, turn: 'w', castling: nc, enPassant: nep, status, winner, history: [...prev.history, note + suffix], lastMove: { from: move.from, to: move.to } };
      });
      setThinking(false);
    }, 80);
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, [state.turn, state.status, mode]);

  const reset = useCallback(() => {
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    if (pollRef.current) clearInterval(pollRef.current);
    setThinking(false);
    setState(makeInitState());
    setMode('menu');
    setRoomCode('');
    setJoinCode('');
    setError('');
    setOpponentName('');
  }, []);

  const startAI = useCallback(() => {
    setState(makeInitState());
    setMyColor('w');
    setMode('ai');
  }, []);

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [roomCode]);

  const { board, selected, legalMoves, lastMove, status, winner, turn, history } = state;
  const isOnline = mode === 'online';
  const isAI = mode === 'ai';
  const canInteract = (isAI || isOnline) && (status === 'playing' || status === 'check');

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
              ♟ CHESS
            </h1>
          </div>

          {mode === 'menu' && (
            <div className="space-y-4">
              <button onClick={startAI}
                className="w-full p-6 rounded-2xl text-left transition-all hover:scale-[1.02]"
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

          {mode === 'create' && (
            <div className="space-y-4">
              <button onClick={() => setMode('menu')} className="text-[#7B6F90] text-sm hover:text-white flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              <div className="rounded-2xl p-6 text-center" style={{ background: '#0D001E', border: '1px solid #00FF8840' }}>
                <Users className="w-10 h-10 text-[#00FF88] mx-auto mb-3" />
                <p className="text-white font-black text-lg mb-2">CREATE A ROOM</p>
                <p className="text-[#7B6F90] text-sm mb-4">You'll play as <span className="text-[#FFFFF0] font-bold">White</span> (moves first)</p>
                <button onClick={createRoom}
                  className="px-8 py-3 rounded-xl font-black text-sm transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #00AA55, #008844)', color: '#fff' }}>
                  CREATE ROOM
                </button>
                {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
              </div>
            </div>
          )}

          {mode === 'join' && (
            <div className="space-y-4">
              <button onClick={() => setMode('menu')} className="text-[#7B6F90] text-sm hover:text-white flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
              <div className="rounded-2xl p-6" style={{ background: '#0D001E', border: '1px solid #FFB34740' }}>
                <Wifi className="w-10 h-10 text-[#FFB347] mx-auto mb-3" />
                <p className="text-white font-black text-lg mb-2 text-center">JOIN A ROOM</p>
                <p className="text-[#7B6F90] text-sm mb-4 text-center">You'll play as <span className="font-bold text-[#333]">Black</span></p>
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
            <p className="text-[#3B2F50] text-xs">You'll play as <span className="text-[#FFFFF0] font-bold">White</span> · Game starts when they join</p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  GAME BOARD (AI or Online)
  // ═══════════════════════════════════════════════════════════════════════════
  const myLabel = myColor === 'w' ? '♔ White' : '♚ Black';
  const oppLabel = myColor === 'w' ? '♚ Black' : '♔ White';

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
              ♟ CHESS
            </h1>
            <p className="text-xs text-[#7B6F90]">
              {isAI
                ? 'You play White · AI plays Black'
                : `You play ${myColor === 'w' ? 'White' : 'Black'} · vs ${opponentName}`
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

          {/* Board + status */}
          <div className="flex-shrink-0 w-full" style={{ maxWidth: 496 }}>

            {/* Status banner */}
            <AnimatePresence>
              {(status === 'checkmate' || status === 'stalemate' || status === 'check') && (
                <motion.div
                  key={status + String(winner)}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 p-3 rounded-xl text-center text-sm font-black"
                  style={{
                    background: status === 'checkmate'
                      ? (winner === myColor || (isAI && winner === 'w')
                        ? 'linear-gradient(135deg,#003322,#004433)'
                        : 'linear-gradient(135deg,#330000,#550000)')
                      : status === 'stalemate'
                        ? '#1a003a'
                        : '#2a1a00',
                    border: `1px solid ${
                      status === 'checkmate'
                        ? (winner === myColor || (isAI && winner === 'w') ? '#00FF8860' : '#FF444460')
                        : status === 'stalemate' ? '#C084FC60' : '#FFB34760'
                    }`,
                    color: status === 'checkmate'
                      ? (winner === myColor || (isAI && winner === 'w') ? '#00FF88' : '#FF6666')
                      : status === 'stalemate' ? '#E0AAFF' : '#FFB347',
                    textShadow: '0 0 12px currentColor',
                  }}>
                  {status === 'checkmate' && (winner === myColor || (isAI && winner === 'w'))
                    && '♔ YOU WIN! Checkmate!'}
                  {status === 'checkmate' && !(winner === myColor || (isAI && winner === 'w'))
                    && (isAI ? '♚ AI WINS! Checkmate!' : `♚ ${opponentName} WINS! Checkmate!`)}
                  {status === 'stalemate' && '🤝 Stalemate — Draw!'}
                  {status === 'check' && turn === myColor && '⚠️ Your king is in check!'}
                  {status === 'check' && turn !== myColor && (isAI ? "⚠️ AI's king is in check!" : `⚠️ ${opponentName}'s king is in check!`)}
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI thinking */}
            {thinking && isAI && (
              <div className="mb-3 px-3 py-2 rounded-xl flex items-center gap-2 text-xs text-[#C084FC]"
                style={{ background: '#0D001E', border: '1px solid #9D00FF30' }}>
                <Brain className="w-3.5 h-3.5 animate-pulse" />
                AI is thinking...
              </div>
            )}

            {isOnline && turn !== myColor && status !== 'checkmate' && status !== 'stalemate' && (
              <div className="mb-3 px-3 py-2 rounded-xl flex items-center gap-2 text-xs text-[#FFB347]"
                style={{ background: '#0D001E', border: '1px solid #FFB34730' }}>
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>⏳</motion.div>
                Waiting for {opponentName}'s move...
              </div>
            )}

            {/* THE BOARD */}
            <div className="w-full">
              <ChessBoard
                state={state}
                onSquareClick={handleClick}
                myColor={myColor}
                canInteract={canInteract}
              />
            </div>

            {/* Turn indicators */}
            <div className="flex gap-2 mt-1">
              <div className="flex-1 p-2 rounded-xl text-center text-xs font-bold transition-all"
                style={{
                  background: turn === myColor ? '#1a003a' : '#0a0018',
                  border: `1px solid ${turn === myColor ? '#C084FC50' : '#1a0040'}`,
                  color: turn === myColor ? '#E0AAFF' : '#3B2F50',
                }}>
                {myLabel} — {isAI ? 'You' : 'You'} {turn === myColor ? '(your turn)' : ''}
              </div>
              <div className="flex-1 p-2 rounded-xl text-center text-xs font-bold transition-all"
                style={{
                  background: turn !== myColor ? '#1a003a' : '#0a0018',
                  border: `1px solid ${turn !== myColor ? '#C084FC50' : '#1a0040'}`,
                  color: turn !== myColor ? '#E0AAFF' : '#3B2F50',
                }}>
                {oppLabel} — {isAI ? 'AI' : opponentName} {turn !== myColor ? (isAI && thinking ? '(thinking…)' : '(playing)') : ''}
              </div>
            </div>
          </div>

          {/* Sidebar: move history + tips */}
          <div className="flex-1 min-w-0 w-full lg:w-auto space-y-4">
            <div className="rounded-2xl p-4" style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
              <p className="text-white font-black text-sm mb-3 uppercase tracking-wide">Move History</p>
              {history.length === 0 ? (
                <p className="text-[#3B2F50] text-xs italic">No moves yet. Click a piece to begin.</p>
              ) : (
                <div
                  className="overflow-y-auto"
                  style={{ maxHeight: 280, scrollbarWidth: 'thin', scrollbarColor: '#3B2F50 transparent' }}>
                  <div className="grid grid-cols-[28px_1fr_1fr] gap-x-2 gap-y-0.5 text-xs font-mono">
                    {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => (
                      <React.Fragment key={i}>
                        <span className="text-[#3B2F50] flex items-center">{i + 1}.</span>
                        <span className="text-[#E0AAFF] px-2 py-1 rounded" style={{ background: '#0a0018' }}>
                          {history[i * 2] ?? ''}
                        </span>
                        <span className="text-[#9D00FF] px-2 py-1 rounded" style={{ background: '#0a0018' }}>
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
                <li className="flex gap-2"><span className="text-[#C084FC]">•</span> Click any of your pieces to see legal moves (dots appear)</li>
                <li className="flex gap-2"><span className="text-[#C084FC]">•</span> Click a highlighted square to move there</li>
                <li className="flex gap-2"><span className="text-[#C084FC]">•</span> Pawns automatically promote to Queen at the back rank</li>
                <li className="flex gap-2"><span className="text-[#C084FC]">•</span> Castling supported — king moves 2 squares toward rook</li>
                <li className="flex gap-2"><span className="text-[#C084FC]">•</span> En passant is fully supported</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
