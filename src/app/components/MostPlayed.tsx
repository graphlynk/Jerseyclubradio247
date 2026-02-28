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
  'Newark': '\u{1F3D9}\uFE0F', 'New York': '\u{1F5FD}', 'Brooklyn': '\u{1F309}', 'Baltimore': '\u{1F980}',
  'Philadelphia': '\u{1F514}', 'London': '\u{1F1EC}\u{1F1E7}', 'Chicago': '\u{1F303}', 'Los Angeles': '\u{1F334}',
  'Atlanta': '\u{1F351}', 'Tokyo': '\u{1F5FC}', 'Toronto': '\u{1F341}', 'Miami': '\u{1F30A}',
  'Washington': '\u{1F3DB}\uFE0F', 'Detroit': '\u{1F697}',
};

function getEmoji(city: string) {
  return CITY_EMOJI[city] || '\u{1F4CD}';
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

  // Apply admin-pinned tracks: pins are injected at their position, pushing others down
  function applyPinnedOrder(list: TopTrack[], pins: TopTrack[]): TopTrack[] {
    if (!pins || pins.length === 0) return list;
    // Sort pins by position
    const sorted = [...pins].sort((a, b) => (a as any).position - (b as any).position);
    // Remove any existing tracks that match a pin by videoId
    const pinIds = new Set(sorted.map(p => p.videoId));
    const filtered = list.filter(t => !pinIds.has(t.videoId));
    // Insert pins at their positions
    const result = [...filtered];
    for (let i = 0; i < sorted.length; i++) {
      const pin = sorted[i];
      const pos = Math.min((pin as any).position ?? i, result.length);
      result.splice(pos, 0, {
        videoId: pin.videoId,
        title: pin.title,
        channelTitle: pin.channelTitle,
        thumbnail: pin.thumbnail || '',
        count: 99999 - i,
        lastPlayed: new Date().toISOString(),
      });
    }
    return result;
  }

  const fetchData = useCallback(async () => {
    try {
      const [topRes, listRes, pinsRes] = await Promise.all([
        fetch(`${BASE}/plays/top`, { headers: HEADERS }),
        fetch(`${BASE}/plays/listeners`, { headers: HEADERS }),
        fetch(`${BASE}/admin/most-played-pins`, { headers: HEADERS }),
      ]);
      const top = await topRes.json();
      const listeners = await listRes.json();
      const pins = await pinsRes.json();
      if (Array.isArray(top)) setTopTracks(applyPinnedOrder(top, Array.isArray(pins) ? pins : []));
      if (listeners && typeof listeners === 'object') setListenerData(listeners);
    } catch (e) {
      console.log('MostPlayed fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 120 seconds
    const id = setInterval(fetchData, 120_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const handlePlayTrack = (top: TopTrack) => {
    // Try to find the track in our existing loaded tracks by videoId first
    let existing = tracks.find(t => t.id.videoId === top.videoId);
    // Fallback: fuzzy match by title + artist (for pinned tracks with placeholder IDs)
    if (!existing) {
      const hay = `${top.title} ${top.channelTitle}`.toLowerCase();
      existing = tracks.find(t => {
        const tHay = `${t.snippet.title} ${t.snippet.channelTitle}`.toLowerCase();
        // Check if key words overlap significantly
        return hay.split(/\s+/).filter(w => w.length > 3).every(w => tHay.includes(w))
          || tHay.split(/\s+/).filter(w => w.length > 3).every(w => hay.includes(w));
      });
    }
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
    <div className="rounded-2xl overflow-hidden h-full flex flex-col" style={{ background: '#0A0716', border: '1px solid rgba(110,50,190,0.14)' }}>
      {/* Tab headers */}
      <div className="flex border-b border-[#1a0040]">
        <button onClick={() => setTab('top')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold transition-all ${tab === 'top' ? 'text-[#FF2277]' : 'text-[#4A3460] hover:text-white'
            }`}
          style={tab === 'top' ? { background: 'linear-gradient(to bottom, rgba(255,34,119,0.08), transparent)', borderBottom: '2px solid #FF2277' } : { borderBottom: '2px solid transparent' }}>
          <TrendingUp className="w-3.5 h-3.5" />
          MOST PLAYED
        </button>
        <button onClick={() => setTab('listeners')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold transition-all ${tab === 'listeners' ? 'text-[#00FF88]' : 'text-[#4A3460] hover:text-white'
            }`}
          style={tab === 'listeners' ? { background: 'linear-gradient(to bottom, rgba(0,255,136,0.08), transparent)', borderBottom: '2px solid #00FF88' } : { borderBottom: '2px solid transparent' }}>
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
      <div className="p-4 flex-1 flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-[#9D00FF] animate-spin" />
          </div>
        ) : tab === 'top' ? (
          // Most Played
          <div className="flex flex-col justify-between flex-1">
            {topTracks.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-3xl mb-2 block">{'\u{1F3B5}'}</span>
                <p className="text-[#5B4F70] text-sm">No play data yet. Start listening to populate!</p>
              </div>
            ) : (
              topTracks.slice(0, 10).map((track, i) => (
                <motion.div key={track.videoId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => handlePlayTrack(track)}
                  className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer group transition-all"
                  style={{ border: '1px solid transparent' }}
                  whileHover={{ backgroundColor: 'rgba(140,50,255,0.10)' }}>
                  {/* Rank */}
                  <span className={`w-5 text-center font-mono text-sm font-black ${i === 0 ? 'text-[#FFD700]' : i === 1 ? 'text-[#C0C0C0]' : i === 2 ? 'text-[#CD7F32]' : 'text-[#3B2F50]'
                    }`}>
                    {i === 0 ? '\u{1F947}' : i === 1 ? '\u{1F948}' : i === 2 ? '\u{1F949}' : i + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[#0d001e]">
                    {track.thumbnail ? (
                      <img
                        src={getMaxResThumbnail(track.videoId)}
                        alt=""
                        className="w-full h-full object-contain p-0.5"
                        style={{ background: '#0d001e' }}
                        onError={(e) => handleThumbnailError(e, track.videoId)}
                      />
                    ) : (
                      <div className="w-full h-full bg-[#0d001e] flex items-center justify-center">
                        <span className="text-base">{'\u{1F3B5}'}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate md:line-clamp-2 md:whitespace-normal leading-tight group-hover:text-[#FF0080] transition-colors">
                      {track.title}
                    </p>
                    <p className="text-[10px] text-[#5B4F70] truncate mt-0.5">{formatArtistName(track.channelTitle)}</p>
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
                <span className="text-3xl mb-2 block">{'\u{1F30D}'}</span>
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
                      <span className="text-[#3B2F50]">&middot;</span>
                      <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                      <span>{l.city}, {l.country}</span>
                      <span className="text-[#3B2F50]">&middot;</span>
                      <span className="truncate flex-1" title={l.currentTrack}>{'\u{1F3B5}'} {l.currentTrack}</span>
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