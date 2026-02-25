import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Wifi, Crown, Zap } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { pickLegendNames } from '../../data/jerseyLegends';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-715f71b9`;
const HEADERS = { Authorization: `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' };

export interface RoomPlayer {
  seat: number;
  guestId: string;
  name: string;
  isBot: boolean;
  botDifficulty: 'normal' | 'pro';
  isYou?: boolean;
  hotSwapPending?: boolean;
}

export interface SpadesRoom {
  id: string;
  status: 'waiting' | 'starting' | 'playing' | 'finished';
  players: RoomPlayer[];
  isBossGame: boolean;
  bossName?: string;
}

interface Props {
  guestId: string;
  guestName: string;
  onRoomReady: (room: SpadesRoom) => void;
  onCancel: () => void;
  isBossMode?: boolean;
}

// Seat arrangement: bottom=0(you), left=1, top=2, right=3
const SEAT_LABELS = ['You', 'West', 'North', 'East'];
const SEAT_POSITIONS = [
  'absolute bottom-2 left-1/2 -translate-x-1/2',
  'absolute left-2 top-1/2 -translate-y-1/2',
  'absolute top-2 left-1/2 -translate-x-1/2',
  'absolute right-2 top-1/2 -translate-y-1/2',
];

// Countdown in seconds before system fills remaining seats
const FILL_TIMEOUT = 10;

export function MatchmakingLobby({ guestId, guestName, onRoomReady, onCancel, isBossMode }: Props) {
  const [room, setRoom] = useState<SpadesRoom | null>(null);
  const [countdown, setCountdown] = useState(FILL_TIMEOUT);
  const [phase, setPhase] = useState<'searching' | 'found_room' | 'filling' | 'starting'>('searching');
  const [hotSwapOffer, setHotSwapOffer] = useState<{ roomId: string; opponentCount: number } | null>(null);
  const [statusMsg, setStatusMsg] = useState('Searching for players\u2026');
  const pollRef = useRef<NodeJS.Timeout>();
  const countdownRef = useRef<NodeJS.Timeout>();
  const startedRef = useRef(false);

  useEffect(() => {
    startMatchmaking();
    return () => {
      clearInterval(pollRef.current);
      clearInterval(countdownRef.current);
    };
  }, []);

  async function startMatchmaking() {
    setStatusMsg('Searching for live players\u2026');

    // Step 1: Check for hot-swap opportunities
    try {
      const res = await fetch(`${BASE}/spades/rooms/open`, { headers: HEADERS });
      if (res.ok) {
        const openRooms: { id: string; botSeats: number }[] = await res.json();
        if (openRooms.length > 0) {
          const best = openRooms[0];
          setHotSwapOffer({ roomId: best.id, opponentCount: best.botSeats });
        }
      }
    } catch {}

    // Step 2: Find or create a waiting room
    try {
      const res = await fetch(`${BASE}/spades/room`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ guestId, guestName, isBossGame: isBossMode ?? false }),
      });
      if (!res.ok) throw new Error('Room creation failed');
      const data = await res.json();
      const initialRoom: SpadesRoom = {
        id: data.roomId,
        status: 'waiting',
        players: data.players,
        isBossGame: isBossMode ?? false,
        bossName: data.bossName,
      };
      setRoom(initialRoom);
      setPhase('found_room');
      setStatusMsg(data.isNew ? 'Room created! Waiting for players\u2026' : 'Joined existing room!');

      // Start polling for room updates
      pollRef.current = setInterval(() => pollRoom(data.roomId), 2000);
    } catch (e) {
      console.log('Matchmaking error:', e);
      createLocalRoom();
    }

    // Countdown timer — 10 seconds
    let t = FILL_TIMEOUT;
    setCountdown(t);
    countdownRef.current = setInterval(() => {
      t--;
      setCountdown(t);
      if (t <= 5 && t > 0) setStatusMsg('Filling remaining seats shortly\u2026');
      if (t <= 0) {
        clearInterval(countdownRef.current);
        clearInterval(pollRef.current);
        fillAndStart();
      }
    }, 1000);
  }

  async function pollRoom(roomId: string) {
    try {
      const res = await fetch(`${BASE}/spades/room/${roomId}`, { headers: HEADERS });
      if (!res.ok) return;
      const data: SpadesRoom = await res.json();
      setRoom(data);

      const humanCount = data.players.filter(p => !p.isBot).length;
      if (humanCount >= 4 && !startedRef.current) {
        startedRef.current = true;
        clearInterval(pollRef.current);
        clearInterval(countdownRef.current);
        setPhase('starting');
        setStatusMsg('All seats filled! Game starting\u2026');
        setTimeout(() => onRoomReady(data), 1500);
      }
    } catch {}
  }

  async function fillAndStart() {
    if (startedRef.current) return;
    startedRef.current = true;
    setPhase('filling');
    setStatusMsg('Filling seats\u2026');

    let finalRoom = room;

    if (room?.id) {
      try {
        const res = await fetch(`${BASE}/spades/room/${room.id}/bot-fill`, {
          method: 'POST', headers: HEADERS,
          body: JSON.stringify({ isBossGame: isBossMode }),
        });
        if (res.ok) finalRoom = await res.json();
      } catch {}
    }

    if (!finalRoom) finalRoom = createLocalRoomData();

    // Determine which seats need filling
    const filledSeats = new Set(finalRoom.players.map(p => p.seat));
    const emptySeats: number[] = [];
    for (let s = 0; s < 4; s++) {
      if (!filledSeats.has(s)) emptySeats.push(s);
    }

    // Pick legend names for empty seats
    const existingNames = finalRoom.players.map(p => p.name);
    const legendNames = pickLegendNames(emptySeats.length, existingNames);

    // Animate each seat filling with a short stagger
    for (let i = 0; i < emptySeats.length; i++) {
      const seat = emptySeats[i];
      const name = legendNames[i] || `Player_${seat}`;
      await new Promise(r => setTimeout(r, 500));
      setRoom(prev => {
        if (!prev) return finalRoom;
        const existing = prev.players.find(p => p.seat === seat);
        if (existing) return prev;
        return {
          ...prev,
          players: [...prev.players, {
            seat,
            guestId: `legend_${seat}_${Date.now()}`,
            name,
            isBot: true,
            botDifficulty: isBossMode ? 'pro' : 'normal',
          }],
        };
      });
    }

    await new Promise(r => setTimeout(r, 800));
    setPhase('starting');
    setStatusMsg('Game starting now!');
    setTimeout(() => {
      const ready = finalRoom!;
      // Ensure all 4 seats are filled
      const currentNames = ready.players.map(p => p.name);
      for (let s = 0; s < 4; s++) {
        if (!ready.players.find(p => p.seat === s)) {
          const extraNames = pickLegendNames(1, currentNames);
          const name = extraNames[0] || `Player_${s}`;
          ready.players.push({
            seat: s,
            guestId: `legend_${s}_${Date.now()}`,
            name,
            isBot: true,
            botDifficulty: isBossMode ? 'pro' : 'normal',
          });
          currentNames.push(name);
        }
      }
      onRoomReady(ready);
    }, 1000);
  }

  function createLocalRoom() {
    const localRoom = createLocalRoomData();
    setRoom(localRoom);
    setPhase('found_room');
  }

  function createLocalRoomData(): SpadesRoom {
    return {
      id: 'local_' + Math.random().toString(36).slice(2, 8),
      status: 'waiting',
      isBossGame: isBossMode ?? false,
      players: [{
        seat: 0, guestId, name: guestName,
        isBot: false, botDifficulty: 'normal', isYou: true,
      }],
    };
  }

  async function acceptHotSwap() {
    if (!hotSwapOffer) return;
    clearInterval(pollRef.current);
    clearInterval(countdownRef.current);
    try {
      const res = await fetch(`${BASE}/spades/room/${hotSwapOffer.roomId}/hot-join`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ guestId, guestName }),
      });
      if (res.ok) {
        const data: SpadesRoom = await res.json();
        setPhase('starting');
        setStatusMsg('Joining active game \u2014 replacing a seat next hand!');
        setTimeout(() => onRoomReady(data), 1500);
        return;
      }
    } catch {}
    setHotSwapOffer(null);
  }

  const allPlayers = Array.from({ length: 4 }, (_, s) =>
    room?.players.find(p => p.seat === s) ?? null
  );

  const progress = ((FILL_TIMEOUT - countdown) / FILL_TIMEOUT) * 100;
  const themeColor = room?.isBossGame ? '#FF4444' : '#9D00FF';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(6,0,15,0.95)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6">
          {room?.isBossGame ? (
            <>
              <div className="text-4xl mb-2">🤖</div>
              <h2 className="text-2xl font-black text-white mb-1">BOSS MODE</h2>
              <p className="text-sm font-bold" style={{ color: '#FF4444' }}>
                {room.bossName ?? 'The Newark Machine'}
              </p>
              <p className="text-xs text-[#7B6F90] mt-1">Defeat the Boss 3 hands in a row for a merch discount</p>
            </>
          ) : (
            <>
              <div className="text-4xl mb-2">♠️</div>
              <h2 className="text-2xl font-black text-white mb-1">FINDING YOUR TABLE</h2>
              <p className="text-xs text-[#C084FC] uppercase font-semibold" style={{ textShadow: '0 0 10px #9D00FF80, 0 0 20px #9D00FF40' }}>Jersey vs. The World · 2v2 Spades</p>
            </>
          )}
        </div>

        {/* Hot-swap offer */}
        <AnimatePresence>
          {hotSwapOffer && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 p-3 rounded-xl flex items-center gap-3"
              style={{ background: '#1a3a00', border: '1px solid #00FF88' }}>
              <Zap className="w-5 h-5 text-[#00FF88] flex-shrink-0" />
              <div className="flex-1 text-xs">
                <p className="text-white font-bold">Live game available!</p>
                <p className="text-[#4ADE80]">A game in progress has an open seat — join and take over next hand!</p>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={acceptHotSwap}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                  style={{ background: '#00FF88', color: '#000' }}>
                  JOIN
                </button>
                <button onClick={() => setHotSwapOffer(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-[#5B4F70] hover:text-white">
                  Skip
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table visualization */}
        <div className="relative mb-4" style={{ height: 200 }}>
          <div className="absolute inset-6 rounded-full"
            style={{
              background: 'linear-gradient(135deg, #0a001a, #150030)',
              border: `2px solid ${themeColor}40`,
              boxShadow: `0 0 40px ${themeColor}20`,
            }} />
          {/* SPADES label on table */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl opacity-20">♠</span>
          </div>

          {/* Team indicator lines */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-px" style={{ background: `${themeColor}20` }} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-full w-px" style={{ background: `${themeColor}20` }} />
          </div>

          {/* Player seats — ALL VISUALLY IDENTICAL */}
          {allPlayers.map((player, seat) => (
            <div key={seat} className={SEAT_POSITIONS[seat]}>
              <AnimatePresence>
                {player ? (
                  <motion.div key="filled" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{
                        background: '#9D00FF',
                        border: '2px solid #C084FC',
                        boxShadow: '0 0 12px #9D00FF80',
                      }}>
                      👤
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-black leading-tight text-[#C084FC]">
                        {player.isYou ? 'YOU' : player.name.toUpperCase()}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="empty" animate={{ opacity: [0.3, 0.8, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center"
                      style={{ borderColor: `${themeColor}40` }}>
                      <Users className="w-4 h-4" style={{ color: `${themeColor}60` }} />
                    </div>
                    <p className="text-[9px]" style={{ color: `${themeColor}50` }}>
                      {SEAT_LABELS[seat]}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {/* Team labels */}
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 text-[8px] font-bold text-[#9D00FF]">TEAM A</div>
          <div className="absolute top-14 left-1/2 -translate-x-1/2 text-[8px] font-bold text-[#5B4F70]">TEAM B</div>
        </div>

        {/* Status + countdown */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 text-xs">
            <span className="text-[#9B8FB0] flex items-center gap-1.5">
              <Wifi className="w-3 h-3 animate-pulse" style={{ color: themeColor }} />
              {statusMsg}
            </span>
            {phase !== 'starting' && (
              <span className="font-mono font-black" style={{ color: countdown <= 3 ? '#FF4444' : themeColor }}>
                {countdown}s
              </span>
            )}
          </div>
          {/* Progress bar */}
          {phase !== 'starting' && (
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#0D001E' }}>
              <motion.div className="h-full rounded-full" animate={{ width: `${progress}%` }}
                style={{ background: `linear-gradient(90deg, ${themeColor}, ${themeColor}80)` }} />
            </div>
          )}
          {phase === 'starting' && (
            <div className="flex items-center justify-center gap-2 py-2">
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: themeColor }} />
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: themeColor, animationDelay: '0.15s' }} />
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: themeColor, animationDelay: '0.3s' }} />
            </div>
          )}
        </div>

        <button onClick={onCancel}
          className="w-full py-2.5 rounded-xl text-sm text-[#5B4F70] hover:text-white hover:bg-[#0F0022] transition-colors">
          Cancel
        </button>
      </div>
    </motion.div>
  );
}