import React, { useEffect, useState } from 'react';
import { Trophy, Crown, RefreshCw } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import type { GuestProfile } from '../../hooks/useGuestId';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-715f71b9`;
const HEADERS = { Authorization: `Bearer ${publicAnonKey}` };

interface Entry {
  guestId: string;
  totalScore: number;
  spadesWins: number;
  blackjackHighScore: number;
  crosswordsCompleted: number;
}

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

interface Props {
  profile: GuestProfile | null;
}

export function Leaderboard({ profile }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/leaderboard`, { headers: HEADERS });
      const data: Entry[] = await res.json();
      if (Array.isArray(data)) {
        setEntries(data);
        if (profile) {
          const idx = data.findIndex(e => e.guestId === profile.id);
          setMyRank(idx >= 0 ? idx + 1 : null);
        }
      }
    } catch (e) {
      console.log('Leaderboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [profile?.id]);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#0D001E', border: '1px solid #2a0060' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #1a0040' }}>
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="text-white font-bold text-sm">Global Leaderboard</span>
        </div>
        <button onClick={load} disabled={loading}
          className="text-[#5B4F70] hover:text-[#9D00FF] transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {profile && (
        <div className="px-4 py-2.5 flex items-center justify-between"
          style={{ background: '#1a003a', borderBottom: '1px solid #2a0060' }}>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: '#9D00FF' }}>{myRank ?? '?'}</span>
            <span className="text-[#C084FC] text-xs font-bold">{profile.id} (You)</span>
          </div>
          <span className="text-white text-xs font-mono font-bold">{profile.totalScore.toLocaleString()}</span>
        </div>
      )}

      <div className="max-h-64 overflow-y-auto">
        {loading && entries.length === 0 && (
          <div className="py-6 text-center text-[#5B4F70] text-xs">Loading…</div>
        )}
        {!loading && entries.length === 0 && (
          <div className="py-6 text-center text-[#5B4F70] text-xs">No scores yet — be the first!</div>
        )}
        {entries.map((e, i) => (
          <div key={e.guestId}
            className={`px-4 py-2.5 flex items-center gap-3 border-b border-[#1a0040] last:border-0 transition-colors ${e.guestId === profile?.id ? 'bg-[#1a003a]/50' : 'hover:bg-[#0a0018]'}`}>
            <div className="w-6 text-center">
              {i < 3
                ? <Crown className="w-4 h-4 mx-auto" style={{ color: RANK_COLORS[i] }} />
                : <span className="text-[#5B4F70] text-xs font-mono">#{i + 1}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate" style={{ color: e.guestId === profile?.id ? '#C084FC' : '#9B8FB0' }}>
                {e.guestId}
              </p>
              <p className="text-[10px] text-[#3B2F50]">
                ♠ {e.spadesWins}W · 🃏 {e.blackjackHighScore} · 🧩 {e.crosswordsCompleted}
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-white">{(e.totalScore || 0).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
