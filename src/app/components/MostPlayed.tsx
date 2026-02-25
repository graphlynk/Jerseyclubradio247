import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, MapPin, Users, Play, Loader2, RefreshCw, Globe, Headphones } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { usePlayer, Track } from '../context/PlayerContext';
import { formatArtistName } from '../utils/formatArtistName';
import { getMaxResThumbnail, handleThumbnailError } from '../utils/getMaxResThumbnail';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-715f71b9`;
const HEADERS = { Authorization: `Bearer ${publicAnonKey}` };

interface TopTrack {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  count: number;
  lastPlayed: string;
}

interface ListenerCity {
  city: string;
  country: string;
  count: number;
  listeners: string[];
}

interface ListenerData {
  totalActive: number;
  cities: ListenerCity[];
  listeners: { guestId: string; city: string; country: string; currentTrack: string; lastSeen: string }[];
}

// City color mapping
const CITY_EMOJI: Record<string, string> = {
  'Newark': '🏙️', 'New York': '🗽', 'Brooklyn': '🌉', 'Baltimore': '🦀',
  'Philadelphia': '🔔', 'London': '🇬🇧', 'Chicago': '🌃', 'Los Angeles': '🌴',
  'Atlanta': '🍑', 'Tokyo': '🗼', 'Toronto': '🍁', 'Miami': '🌊',
  'Washington': '🏛️', 'Detroit': '🚗',
};

function getEmoji(city: string) {
  return CITY_EMOJI[city] || '📍';
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

export function MostPlayed() {
  const { playTrack, tracks } = usePlayer();
  const [topTracks, setTopTracks] = useState<TopTrack[]>([]);
  const [listenerData, setListenerData] = useState<ListenerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'top' | 'listeners'>('top');

  const fetchData = useCallback(async () => {
    try {
      const [topRes, listRes] = await Promise.all([
        fetch(`${BASE}/plays/top`, { headers: HEADERS }),
        fetch(`${BASE}/plays/listeners`, { headers: HEADERS }),
      ]);
      const top = await topRes.json();
      const listeners = await listRes.json();
      if (Array.isArray(top)) setTopTracks(top);
      if (listeners && typeof listeners === 'object') setListenerData(listeners);
    } catch (e) {
      console.log('MostPlayed fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 60 seconds
    const id = setInterval(fetchData, 60000);
    return () => clearInterval(id);
  }, [fetchData]);

  const handlePlayTrack = (top: TopTrack) => {
    // Try to find the track in our existing loaded tracks
    const existing = tracks.find(t => t.id.videoId === top.videoId);
    if (existing) {
      playTrack(existing, tracks);
    } else {
      // Create a minimal Track object
      const fakeTrack: Track = {
        id: { videoId: top.videoId },
        snippet: {
          title: top.title,
          channelTitle: top.channelTitle,
          description: '',
          publishedAt: top.lastPlayed,
          thumbnails: {
            default: { url: top.thumbnail },
            medium: { url: top.thumbnail },
            high: { url: top.thumbnail },
          },
        },
      };
      playTrack(fakeTrack);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
      {/* Tab headers */}
      <div className="flex border-b border-[#1a0040]">
        <button onClick={() => setTab('top')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold transition-all ${
            tab === 'top' ? 'text-[#FF0080]' : 'text-[#5B4F70] hover:text-white'
          }`}
          style={tab === 'top' ? { background: 'linear-gradient(to bottom, #FF008015, transparent)', borderBottom: '2px solid #FF0080' } : {}}>
          <TrendingUp className="w-3.5 h-3.5" />
          MOST PLAYED
        </button>
        <button onClick={() => setTab('listeners')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold transition-all ${
            tab === 'listeners' ? 'text-[#00FF88]' : 'text-[#5B4F70] hover:text-white'
          }`}
          style={tab === 'listeners' ? { background: 'linear-gradient(to bottom, #00FF8815, transparent)', borderBottom: '2px solid #00FF88' } : {}}>
          <Globe className="w-3.5 h-3.5" />
          LIVE LISTENERS
          {listenerData && listenerData.totalActive > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-[#00FF88] text-black">
              {listenerData.totalActive}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-[#9D00FF] animate-spin" />
          </div>
        ) : tab === 'top' ? (
          // Most Played
          <div className="space-y-2">
            {topTracks.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-3xl mb-2 block">🎵</span>
                <p className="text-[#5B4F70] text-sm">No play data yet. Start listening to populate!</p>
              </div>
            ) : (
              topTracks.slice(0, 10).map((track, i) => (
                <motion.div key={track.videoId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => handlePlayTrack(track)}
                  className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer group transition-all hover:bg-[#150030]"
                  style={{ border: '1px solid transparent' }}>
                  {/* Rank */}
                  <span className={`w-5 text-center font-mono text-sm font-black ${
                    i === 0 ? 'text-[#FFD700]' : i === 1 ? 'text-[#C0C0C0]' : i === 2 ? 'text-[#CD7F32]' : 'text-[#3B2F50]'
                  }`}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: '#0F0022' }}>
                    {track.thumbnail ? (
                      <img
                        src={getMaxResThumbnail(track.videoId)}
                        alt=""
                        className="w-full h-full object-cover scale-[1.15]"
                        onError={(e) => handleThumbnailError(e, track.videoId)}
                      />
                    ) : (
                      <div className="w-full h-full bg-[#1a003a] flex items-center justify-center">
                        <span className="text-base">🎵</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white line-clamp-2 leading-tight uppercase group-hover:text-[#FF0080] transition-colors">
                      {track.title}
                    </p>
                    <p className="text-[10px] text-[#5B4F70] truncate mt-0.5">{formatArtistName(track.channelTitle)}</p>
                  </div>

                  {/* Play count */}
                  <div className="flex-shrink-0 text-right">
                    <span className="text-xs font-mono font-bold text-[#FF0080]">{track.count}</span>
                    <p className="text-[8px] text-[#3B2F50]">plays</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        ) : (
          // Live Listeners
          <div>
            {!listenerData || listenerData.totalActive === 0 ? (
              <div className="text-center py-8">
                <span className="text-3xl mb-2 block">🌍</span>
                <p className="text-[#5B4F70] text-sm">No active listeners right now. Be the first!</p>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="flex items-center gap-3 mb-4 p-3 rounded-xl"
                  style={{ background: '#0a0018', border: '1px solid #00FF8820' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: '#00FF8820' }}>
                    <Headphones className="w-4 h-4 text-[#00FF88]" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">
                      {listenerData.totalActive} {listenerData.totalActive === 1 ? 'listener' : 'listeners'} online
                    </p>
                    <p className="text-[10px] text-[#5B4F70]">
                      Across {listenerData.cities.length} {listenerData.cities.length === 1 ? 'city' : 'cities'} worldwide
                    </p>
                  </div>
                  <div className="ml-auto flex -space-x-1">
                    {listenerData.cities.slice(0, 4).map((c, i) => (
                      <span key={i} className="text-base" title={`${c.city}, ${c.country}`}>
                        {getEmoji(c.city)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* City breakdown */}
                <div className="space-y-2 mb-4">
                  {listenerData.cities.slice(0, 8).map((city, i) => (
                    <motion.div key={`${city.city}_${city.country}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-2 p-2 rounded-lg"
                      style={{ background: '#0a0018', border: '1px solid #1a003020' }}>
                      <span className="text-base">{getEmoji(city.city)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white truncate">{city.city}</p>
                        <p className="text-[9px] text-[#5B4F70]">{city.country}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#00FF88]" />
                        <span className="text-[11px] font-mono font-bold text-[#00FF88]">{city.count}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Individual listeners */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-[#5B4F70] tracking-widest">RECENT ACTIVITY</span>
                </div>
                <div className="space-y-1">
                  {listenerData.listeners.slice(0, 8).map((l, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px] text-[#5B4F70]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-pulse flex-shrink-0" />
                      <span className="text-[#7B6F90] font-mono">{l.guestId?.slice(0, 12)}</span>
                      <span className="text-[#3B2F50]">·</span>
                      <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                      <span>{l.city}, {l.country}</span>
                      <span className="text-[#3B2F50]">·</span>
                      <span className="truncate flex-1" title={l.currentTrack}>🎵 {l.currentTrack}</span>
                      <span className="flex-shrink-0 text-[#2a1850]">{timeAgo(l.lastSeen)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}