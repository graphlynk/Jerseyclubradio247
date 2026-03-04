import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';
import { GripVertical, X, Search, Star, LogOut, Loader2, ChevronRight, Camera, RefreshCw, Globe, Users, Radio, MapPin } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { getMaxResThumbnail } from '../utils/getMaxResThumbnail';
import { formatArtistName } from '../utils/formatArtistName';
import { formatTrackTitle } from '../utils/formatTrackTitle';
import type { TopSongPick } from './MostPlayed';
import { WorldHeatMap, type MapDot } from './WorldHeatMap';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-715f71b9`;
const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

const DRAG_ADD = 'TRACK_ADD';
const DRAG_REORDER = 'PICK_REORDER';

// ─── Track type (subset of full Track) ───────────────────────────────────────
interface AdminTrack {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  coverArtUrl?: string | null;
  source: 'youtube' | 'soundcloud';
  soundcloudUrl?: string;
}

// ─── Draggable item from the left (playlist) column ──────────────────────────
function DraggableTrack({
  track,
  alreadyAdded,
  uploadingCoverArt,
  onUploadCoverArt,
}: {
  track: AdminTrack;
  alreadyAdded: boolean;
  uploadingCoverArt: boolean;
  onUploadCoverArt: (trackId: string, file: File) => Promise<void>;
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: DRAG_ADD,
    item: { track },
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUploadCoverArt(track.videoId, file);
    e.target.value = '';
  };

  const imgSrc = track.coverArtUrl
    || (track.source === 'youtube' ? getMaxResThumbnail(track.videoId) : track.thumbnail)
    || '/jc-club-logo-gradient.png';

  return (
    <div
      ref={drag as any}
      className="flex items-center gap-3 p-2.5 rounded-lg group transition-all"
      style={{
        opacity: isDragging ? 0.4 : alreadyAdded ? 0.35 : 1,
        cursor: alreadyAdded ? 'default' : 'grab',
        background: alreadyAdded ? 'transparent' : 'rgba(140,50,255,0.04)',
        border: '1px solid rgba(80,30,140,0.2)',
      }}
    >
      {/* Thumbnail with camera-upload overlay — label activates file input natively */}
      <label
        className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-[#0d001e] cursor-pointer block group/thumb"
        onClick={(e) => e.stopPropagation()}
        title="Click to upload cover art"
        style={{ pointerEvents: uploadingCoverArt ? 'none' : 'auto' }}
      >
        <img
          src={imgSrc}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/jc-club-logo-gradient.png';
          }}
        />
        {/* Hover/loading overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-opacity"
          style={{
            background: 'rgba(0,0,0,0.55)',
            opacity: uploadingCoverArt ? 1 : undefined,
          }}
          onMouseEnter={e => { if (!uploadingCoverArt) (e.currentTarget as HTMLElement).style.opacity = '1'; }}
          onMouseLeave={e => { if (!uploadingCoverArt) (e.currentTarget as HTMLElement).style.opacity = '0'; }}
        >
          {uploadingCoverArt
            ? <Loader2 className="w-4 h-4 text-white animate-spin" />
            : <Camera className="w-4 h-4 text-white" />}
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>
      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate leading-tight">{formatTrackTitle(track.title, track.channelTitle)}</p>
        <p className="text-[10px] text-[#5B4F70] truncate mt-0.5">{formatArtistName(track.channelTitle)}</p>
      </div>
      {/* Add indicator */}
      {!alreadyAdded && (
        <ChevronRight className="w-3.5 h-3.5 text-[#5B4F70] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      )}
      {alreadyAdded && (
        <Star className="w-3 h-3 text-[#FFD700] flex-shrink-0" />
      )}
    </div>
  );
}

// ─── Draggable + droppable row in the right (picks) column ───────────────────
function DraggablePick({
  pick,
  index,
  onRemove,
  onReorder,
  onAdd,
}: {
  pick: TopSongPick;
  index: number;
  onRemove: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAdd: (track: AdminTrack) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
    type: DRAG_REORDER,
    item: { index },
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  }));

  const [{ isOver, dropPosition }, drop] = useDrop<
    { index: number } | { track: AdminTrack },
    void,
    { isOver: boolean; dropPosition: 'above' | 'below' | null }
  >(() => ({
    accept: [DRAG_REORDER, DRAG_ADD],
    collect: monitor => {
      const isOver = monitor.isOver({ shallow: true });
      if (!isOver || !ref.current) return { isOver: false, dropPosition: null };
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return { isOver: false, dropPosition: null };
      const rect = ref.current.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      return { isOver: true, dropPosition: clientOffset.y < mid ? 'above' : 'below' };
    },
    drop: (item, monitor) => {
      // New track being added from the playlist
      if ('track' in item) {
        onAdd(item.track);
        return;
      }
      // Reordering an existing pick
      if (item.index === index) return;
      if (!ref.current) return;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const rect = ref.current.getBoundingClientRect();
      const pos = clientOffset.y < rect.top + rect.height / 2 ? 'above' : 'below';
      const targetIndex = item.index < index
        ? (pos === 'above' ? index - 1 : index)
        : (pos === 'above' ? index : index + 1);
      onReorder(item.index, targetIndex);
    },
  }), [index, onReorder, onAdd]);

  dragPreview(drop(ref));

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Drop indicator above */}
      {isOver && dropPosition === 'above' && (
        <div style={{ height: 2, background: '#FFD700', borderRadius: 1, margin: '2px 0' }} />
      )}

      <div
        className="flex items-center gap-3 p-2.5 rounded-lg transition-all"
        style={{
          opacity: isDragging ? 0.3 : 1,
          background: isOver ? 'rgba(255,215,0,0.06)' : 'rgba(140,50,255,0.06)',
          border: `1px solid ${isOver ? 'rgba(255,215,0,0.2)' : 'rgba(80,30,140,0.25)'}`,
        }}
      >
        {/* Drag handle */}
        <div ref={drag as any} style={{ cursor: 'grab', flexShrink: 0, touchAction: 'none' }}>
          <GripVertical className="w-3.5 h-3.5 text-[#3B2F50]" />
        </div>

        {/* Rank badge */}
        <div
          className="w-5 text-center flex-shrink-0"
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#5B4F70',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          #{pick.rank}
        </div>

        {/* Thumbnail */}
        <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-[#0d001e]">
          <img
            src="/jc-club-logo-gradient.png"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate leading-tight">{pick.title}</p>
          <p className="text-[10px] text-[#5B4F70] truncate mt-0.5">{formatArtistName(pick.artist)}</p>
        </div>

        {/* Remove */}
        <button
          onClick={() => onRemove(pick.id)}
          className="flex-shrink-0 p-1 rounded-full transition-colors hover:bg-[#FF227720]"
          style={{ color: '#3B2F50' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#FF2277')}
          onMouseLeave={e => (e.currentTarget.style.color = '#3B2F50')}
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Drop indicator below */}
      {isOver && dropPosition === 'below' && (
        <div style={{ height: 2, background: '#FFD700', borderRadius: 1, margin: '2px 0' }} />
      )}
    </div>
  );
}

// ─── Drop zone — accepts TRACK_ADD into picks list ────────────────────────────
function PicksDropZone({
  picks,
  onAdd,
  onRemove,
  onReorder,
}: {
  picks: TopSongPick[];
  onAdd: (track: AdminTrack) => void;
  onRemove: (id: string) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const [{ isOver }, drop] = useDrop<{ track: AdminTrack }, void, { isOver: boolean }>(() => ({
    accept: DRAG_ADD,
    collect: monitor => ({ isOver: monitor.isOver() }),
    drop: (item) => onAdd(item.track),
  }));

  return (
    <div
      ref={drop as any}
      className="flex flex-col gap-1.5 min-h-[120px] rounded-xl p-2 transition-all"
      style={{
        background: isOver ? 'rgba(255,215,0,0.04)' : 'rgba(8,0,24,0.5)',
        border: `2px dashed ${isOver ? 'rgba(255,215,0,0.35)' : picks.length === 0 ? 'rgba(80,30,140,0.25)' : 'transparent'}`,
      }}
    >
      {picks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-24 gap-2">
          <Star className="w-6 h-6 text-[#2a1850]" />
          <p className="text-[10px] text-[#3B2F50] text-center">
            Drag songs here from the playlist
          </p>
        </div>
      ) : (
        picks.map((pick, i) => (
          <DraggablePick
            key={pick.id}
            pick={pick}
            index={i}
            onRemove={onRemove}
            onReorder={onReorder}
            onAdd={onAdd}
          />
        ))
      )}
    </div>
  );
}

// ─── Login form ───────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError || !data.session) {
        setError(authError?.message || 'Login failed');
        return;
      }
      onLogin(data.session.access_token);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div
          className="rounded-2xl p-8"
          style={{ background: '#0A0716', border: '1px solid rgba(110,50,190,0.25)' }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Star className="w-5 h-5 text-[#FFD700]" />
            <h1 className="text-white font-black text-lg tracking-tight">TOP SONGS ADMIN</h1>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Admin email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-[#3B2F50] outline-none transition-all"
              style={{
                background: '#08001A',
                border: '1px solid rgba(110,50,190,0.3)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(140,50,255,0.6)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(110,50,190,0.3)')}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-[#3B2F50] outline-none transition-all"
              style={{
                background: '#08001A',
                border: '1px solid rgba(110,50,190,0.3)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'rgba(140,50,255,0.6)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(110,50,190,0.3)')}
            />

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[#FF2277] text-xs"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-bold text-black transition-all mt-1"
              style={{
                background: loading ? '#5B4F70' : 'linear-gradient(135deg, #FFD700, #FF8C00)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Sign In'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Analytics types ──────────────────────────────────────────────────────────
interface AnalyticsData {
  totalVisitors: number;
  activeNow: number;
  countriesReached: number;
  topCountries: { country: string; visits: number }[];
  topCities: { city: string; country: string; visits: number }[];
  visitorMap: MapDot[];
  activeDots: MapDot[];
}

// ─── Analytics panel ─────────────────────────────────────────────────────────
function AnalyticsPanel() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const HEADERS = { Authorization: `Bearer ${publicAnonKey}` };
        const [listenersRes, visitorMapRes, visitsMapRes] = await Promise.all([
          fetch(`${BASE}/plays/listeners`, { headers: HEADERS }).catch(() => null),
          fetch(`${BASE}/plays/visitor-map`, { headers: HEADERS }).catch(() => null),
          fetch(`${BASE}/visits/map`, { headers: HEADERS }).catch(() => null),
        ]);
        const [listenerJson, visitorMapJson, visitsMapJson] = await Promise.all([
          listenersRes?.ok ? listenersRes.json().catch(() => null) : null,
          visitorMapRes?.ok ? visitorMapRes.json().catch(() => null) : null,
          visitsMapRes?.ok ? visitsMapRes.json().catch(() => null) : null,
        ]);

        if (cancelled) return;

        // Build dot map from all sources
        const dotMap = new Map<string, MapDot>();
        const countryTotals = new Map<string, number>();
        const cityTotals = new Map<string, { city: string; country: string; visits: number }>();

        function addDot(lat: number, lon: number, city?: string, country?: string, visits?: number) {
          const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
          const existing = dotMap.get(key);
          if (existing) {
            existing.visits = (existing.visits || 1) + (visits || 1);
          } else {
            dotMap.set(key, { lat, lon, city, country, visits: visits || 1 });
          }
          if (country && country !== 'Unknown') {
            countryTotals.set(country, (countryTotals.get(country) ?? 0) + (visits || 1));
          }
          if (city && city !== 'Unknown') {
            const cityKey = `${city}|${country}`;
            const existing = cityTotals.get(cityKey);
            if (existing) {
              existing.visits += visits || 1;
            } else {
              cityTotals.set(cityKey, { city, country: country || '', visits: visits || 1 });
            }
          }
        }

        // Source 1: visits/map
        const visitsArr = Array.isArray(visitsMapJson) ? visitsMapJson : (visitsMapJson?.dots || []);
        for (const d of visitsArr) {
          if (d.lat != null && d.lon != null) addDot(d.lat, d.lon, d.city, d.country, d.visits);
        }

        // Source 2: plays/visitor-map
        if (Array.isArray(visitorMapJson)) {
          for (const d of visitorMapJson) {
            if (d.lat != null && d.lon != null) addDot(d.lat, d.lon, d.city, d.country, d.visits);
          }
        }

        // Source 3: listeners
        const allVisitors = listenerJson?.allVisitors ?? listenerJson?.listeners ?? [];
        for (const l of allVisitors) {
          if (l.lat != null && l.lon != null) addDot(l.lat, l.lon, l.city, l.country);
        }
        for (const c of (listenerJson?.cities ?? [])) {
          // city-level entries — add to totals only (no coords)
          if (c.country && c.country !== 'Unknown') {
            countryTotals.set(c.country, (countryTotals.get(c.country) ?? 0) + (c.count || 1));
          }
        }

        // Active dots (30-min listeners with coords)
        const activeDots: MapDot[] = (listenerJson?.listeners ?? [])
          .filter((l: any) => l.lat != null && l.lon != null)
          .map((l: any) => ({ lat: l.lat, lon: l.lon, city: l.city, country: l.country }));

        const allDots = [...dotMap.values()];
        const totalVisitors = allDots.reduce((s, d) => s + (d.visits ?? 1), 0);

        const topCountries = [...countryTotals.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([country, visits]) => ({ country, visits }));

        const topCities = [...cityTotals.values()]
          .sort((a, b) => b.visits - a.visits)
          .slice(0, 6);

        setData({
          totalVisitors,
          activeNow: listenerJson?.totalActive ?? activeDots.length,
          countriesReached: countryTotals.size,
          topCountries,
          topCities,
          visitorMap: allDots,
          activeDots,
        });
      } catch (e) {
        console.log('Analytics fetch error:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAnalytics();
    const id = setInterval(fetchAnalytics, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-[#9D00FF] animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#5B4F70] text-sm">No analytics data available.</p>
      </div>
    );
  }

  const statCards = [
    {
      icon: Users,
      label: 'Total Visitors',
      value: data.totalVisitors.toLocaleString(),
      color: '#9D00FF',
      glow: 'rgba(157,0,255,0.25)',
    },
    {
      icon: Radio,
      label: 'Active Now',
      value: data.activeNow.toString(),
      color: '#00FF88',
      glow: 'rgba(0,255,136,0.2)',
      pulse: true,
    },
    {
      icon: Globe,
      label: 'Countries Reached',
      value: data.countriesReached.toString(),
      color: '#D030FF',
      glow: 'rgba(208,48,255,0.2)',
    },
    {
      icon: MapPin,
      label: 'Unique Cities',
      value: data.topCities.length > 0 ? `${data.topCities.length}+` : '—',
      color: '#FF1888',
      glow: 'rgba(255,24,136,0.2)',
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* World Heatmap */}
      <div>
        <p className="text-[9px] font-black tracking-widest text-[#5B4F70] uppercase mb-2">
          Global Listener Intelligence
        </p>
        <WorldHeatMap
          visitors={data.visitorMap}
          active={data.activeDots}
          showMetrics={true}
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl p-3 flex flex-col gap-1.5"
            style={{
              background: '#0A0716',
              border: `1px solid ${s.color}22`,
              boxShadow: `0 0 16px ${s.glow}`,
            }}
          >
            <div className="flex items-center gap-2">
              {s.pulse ? (
                <motion.div
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                >
                  <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                </motion.div>
              ) : (
                <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
              )}
              <span className="text-[9px] font-bold text-[#5B4F70] uppercase tracking-widest">
                {s.label}
              </span>
            </div>
            <p className="text-2xl font-black" style={{ color: s.color, textShadow: `0 0 12px ${s.glow}` }}>
              {s.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Top countries + cities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top countries */}
        <div className="rounded-xl p-4" style={{ background: '#0A0716', border: '1px solid rgba(110,50,190,0.18)' }}>
          <p className="text-[9px] font-black tracking-widest text-[#9D7FFF] uppercase mb-3">
            Top Countries
          </p>
          <div className="flex flex-col gap-2">
            {data.topCountries.length === 0 && (
              <p className="text-[10px] text-[#3B2F50]">No data yet</p>
            )}
            {data.topCountries.map((c, i) => {
              const maxVisits = data.topCountries[0]?.visits ?? 1;
              const pct = Math.round((c.visits / maxVisits) * 100);
              return (
                <div key={c.country} className="flex items-center gap-2">
                  <span className="text-[9px] font-black w-4 text-right flex-shrink-0"
                    style={{ color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#3B2F50' }}>
                    {i + 1}
                  </span>
                  <span className="text-[10px] text-white truncate flex-1 min-w-0">{c.country}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div style={{ width: 40, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%', borderRadius: 2,
                        background: 'linear-gradient(to right, #5512C8, #9D00FF)',
                      }} />
                    </div>
                    <span className="text-[9px] text-[#5B4F70] w-10 text-right">
                      {c.visits.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top cities */}
        <div className="rounded-xl p-4" style={{ background: '#0A0716', border: '1px solid rgba(110,50,190,0.18)' }}>
          <p className="text-[9px] font-black tracking-widest text-[#9D7FFF] uppercase mb-3">
            Top Cities
          </p>
          <div className="flex flex-col gap-2">
            {data.topCities.length === 0 && (
              <p className="text-[10px] text-[#3B2F50]">No data yet</p>
            )}
            {data.topCities.map((c, i) => (
              <div key={`${c.city}-${c.country}`} className="flex items-center gap-2">
                <span className="text-[9px] font-black w-4 text-right flex-shrink-0 text-[#3B2F50]">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-white truncate leading-tight">{c.city}</p>
                  <p className="text-[8px] text-[#5B4F70] truncate">{c.country}</p>
                </div>
                <span className="text-[9px] text-[#5B4F70] flex-shrink-0">
                  {c.visits.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
function AdminDashboard({ adminToken, onLogout }: { adminToken: string; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'songs' | 'analytics'>('songs');
  const [playlist, setPlaylist] = useState<AdminTrack[]>([]);
  const [picks, setPicks] = useState<TopSongPick[]>([]);
  const [search, setSearch] = useState('');
  const [loadingTracks, setLoadingTracks] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch playlist and current picks on mount
  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/tracks`, { headers: { Authorization: `Bearer ${publicAnonKey}` } })
        .then(r => r.ok ? r.json() : { tracks: [] })
        .catch(() => ({ tracks: [] })),
      fetch(`${BASE}/top-songs`, { headers: { Authorization: `Bearer ${publicAnonKey}` } })
        .then(r => r.ok ? r.json() : [])
        .catch(() => []),
    ]).then(([tracksData, picksData]) => {
      // /tracks returns { tracks: [...] } with nested Track format — map to flat AdminTrack
      const raw: any[] = Array.isArray(tracksData) ? tracksData : (tracksData?.tracks ?? []);
      const mapped: AdminTrack[] = raw.map((t: any) => ({
        videoId: t.id?.videoId || t.videoId || '',
        title: t.snippet?.title || t.title || 'Unknown',
        channelTitle: t.snippet?.channelTitle || t.channelTitle || '',
        thumbnail: t.snippet?.thumbnails?.default?.url || t.thumbnail || '',
        coverArtUrl: t.coverArtUrl || null,
        source: t.source || 'youtube',
        soundcloudUrl: t.soundcloudUrl,
      })).filter((t: AdminTrack) => t.videoId);
      setPlaylist(mapped);
      if (Array.isArray(picksData)) setPicks(picksData);
      setLoadingTracks(false);
    });
  }, []);

  // Auto-save picks whenever they change (debounced)
  const savePicks = useCallback(async (newPicks: TopSongPick[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        // Always fetch the current (auto-refreshed) session token
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token ?? adminToken;
        if (!token) throw new Error('Not authenticated');
        const res = await fetch(`${BASE}/top-songs`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newPicks),
        });
        if (!res.ok) throw new Error(await res.text());
        setSaveStatus('saved');
        toast.success('Top Songs saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (e) {
        setSaveStatus('error');
        toast.error('Save failed — ' + String(e));
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    }, 400);
  }, [adminToken]);

  const uploadCoverArt = useCallback(async (trackId: string, file: File) => {
    setUploadingIds(prev => new Set(prev).add(trackId));
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? adminToken;
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${BASE}/admin/cover-art/${trackId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type },
        body: file,
      });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      // Update playlist track
      setPlaylist(prev => prev.map(t => t.videoId === trackId ? { ...t, coverArtUrl: url } : t));
      // Update any existing pick with the same id
      setPicks(prev => {
        const updated = prev.map(p => p.id === trackId ? { ...p, coverArtUrl: url } : p);
        savePicks(updated);
        return updated;
      });
      toast.success('Cover art updated');
    } catch (e) {
      toast.error('Cover art upload failed — ' + String(e));
    } finally {
      setUploadingIds(prev => { const s = new Set(prev); s.delete(trackId); return s; });
    }
  }, [adminToken, savePicks]);

  const addTrack = useCallback((track: AdminTrack) => {
    setPicks(prev => {
      if (prev.some(p => p.id === track.videoId)) return prev;
      const newPick: TopSongPick = {
        id: track.videoId,
        rank: prev.length + 1,
        title: formatTrackTitle(track.title, track.channelTitle),
        artist: track.channelTitle,
        thumbnail: '/jc-club-logo-gradient.png',
        coverArtUrl: track.coverArtUrl || null,
        source: track.source,
        soundcloudUrl: track.soundcloudUrl,
        addedAt: new Date().toISOString(),
      };
      const updated = [...prev, newPick];
      savePicks(updated);
      return updated;
    });
  }, [savePicks]);

  const removeTrack = useCallback((id: string) => {
    setPicks(prev => {
      const updated = prev.filter(p => p.id !== id).map((p, i) => ({ ...p, rank: i + 1 }));
      savePicks(updated);
      return updated;
    });
  }, [savePicks]);

  const reorderPicks = useCallback((fromIndex: number, toIndex: number) => {
    setPicks(prev => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      const updated = next.map((p, i) => ({ ...p, rank: i + 1 }));
      savePicks(updated);
      return updated;
    });
  }, [savePicks]);

  const refreshPlaylist = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetch(`${BASE}/tracks/refresh`, { method: 'POST' });
      const data = await fetch(`${BASE}/tracks`, { headers: { Authorization: `Bearer ${publicAnonKey}` } })
        .then(r => r.ok ? r.json() : { tracks: [] });
      const raw: any[] = Array.isArray(data) ? data : (data?.tracks ?? []);
      const mapped: AdminTrack[] = raw.map((t: any) => ({
        videoId: t.id?.videoId || t.videoId || '',
        title: t.snippet?.title || t.title || 'Unknown',
        channelTitle: t.snippet?.channelTitle || t.channelTitle || '',
        thumbnail: t.snippet?.thumbnails?.default?.url || t.thumbnail || '',
        coverArtUrl: t.coverArtUrl || null,
        source: t.source || 'youtube',
        soundcloudUrl: t.soundcloudUrl,
      })).filter((t: AdminTrack) => t.videoId);
      setPlaylist(mapped);
      toast.success(`Playlist refreshed — ${mapped.length} tracks loaded`);
    } catch (e) {
      toast.error('Refresh failed — ' + String(e));
    } finally {
      setRefreshing(false);
    }
  }, []);

  const addedIds = new Set(picks.map(p => p.id));

  const filteredPlaylist = search.trim()
    ? playlist.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.channelTitle.toLowerCase().includes(search.toLowerCase())
      )
    : playlist;

  return (
    <div className="min-h-screen p-6" style={{ background: '#04000F' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Star className="w-5 h-5 text-[#FFD700]" />
          <h1 className="text-white font-black text-lg tracking-tight">ADMIN</h1>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 ml-2 p-1 rounded-xl"
            style={{ background: '#0A0716', border: '1px solid rgba(80,30,140,0.3)' }}>
            <button
              onClick={() => setActiveTab('songs')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all"
              style={{
                background: activeTab === 'songs' ? 'rgba(255,215,0,0.12)' : 'transparent',
                color: activeTab === 'songs' ? '#FFD700' : '#5B4F70',
                boxShadow: activeTab === 'songs' ? '0 0 10px rgba(255,215,0,0.15)' : 'none',
              }}
            >
              <Star className="w-3 h-3" />
              Top Songs
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all"
              style={{
                background: activeTab === 'analytics' ? 'rgba(157,0,255,0.12)' : 'transparent',
                color: activeTab === 'analytics' ? '#C080FF' : '#5B4F70',
                boxShadow: activeTab === 'analytics' ? '0 0 10px rgba(157,0,255,0.15)' : 'none',
              }}
            >
              <Globe className="w-3 h-3" />
              Analytics
            </button>
          </div>

          {/* Save status (songs tab only) */}
          <AnimatePresence mode="wait">
            {activeTab === 'songs' && saveStatus !== 'idle' && (
              <motion.span
                key={saveStatus}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-[10px] font-bold px-2 py-1 rounded-full"
                style={{
                  background: saveStatus === 'saving' ? 'rgba(140,50,255,0.2)'
                    : saveStatus === 'saved' ? 'rgba(0,255,136,0.15)'
                    : 'rgba(255,34,119,0.15)',
                  color: saveStatus === 'saving' ? '#9D7FFF'
                    : saveStatus === 'saved' ? '#00FF88'
                    : '#FF2277',
                }}
              >
                {saveStatus === 'saving' ? 'Saving…'
                  : saveStatus === 'saved' ? 'Saved ✓'
                  : 'Error saving'}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 text-[#5B4F70] hover:text-white transition-colors text-xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          Logout
        </button>
      </div>

      {/* ── Analytics tab ──────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {activeTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AnalyticsPanel />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Songs tab ──────────────────────────────────────────────────── */}
      {activeTab === 'songs' && (loadingTracks ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 text-[#9D00FF] animate-spin" />
        </div>
      ) : (
        <motion.div
          key="songs"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
        <DndProvider backend={HTML5Backend}>
          <div className="grid grid-cols-2 gap-6">
            {/* ── Left column: Jersey Club Playlist ────────────────────── */}
            <div
              className="rounded-2xl p-4 flex flex-col gap-3"
              style={{ background: '#0A0716', border: '1px solid rgba(110,50,190,0.18)' }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-[#9D7FFF] tracking-widest uppercase">
                  Jersey Club Playlist
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-[#3B2F50]">{playlist.length} tracks</span>
                  <button
                    onClick={refreshPlaylist}
                    disabled={refreshing}
                    title="Refresh playlist from SoundCloud"
                    className="flex items-center gap-1 text-[9px] text-[#9D7FFF] hover:text-white transition-colors disabled:opacity-40"
                  >
                    <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[#3B2F50]" />
                <input
                  type="text"
                  placeholder="Filter tracks…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 rounded-lg text-xs text-white placeholder-[#3B2F50] outline-none"
                  style={{ background: '#08001A', border: '1px solid rgba(80,30,140,0.25)' }}
                />
              </div>

              {/* Track list */}
              <div className="flex flex-col gap-1.5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
                {filteredPlaylist.map(track => (
                  <DraggableTrack
                    key={track.videoId}
                    track={track}
                    alreadyAdded={addedIds.has(track.videoId)}
                    uploadingCoverArt={uploadingIds.has(track.videoId)}
                    onUploadCoverArt={uploadCoverArt}
                  />
                ))}
                {filteredPlaylist.length === 0 && (
                  <p className="text-[10px] text-[#3B2F50] text-center py-4">No tracks found</p>
                )}
              </div>
            </div>

            {/* ── Right column: Top Songs Picks ────────────────────────── */}
            <div
              className="rounded-2xl p-4 flex flex-col gap-3"
              style={{ background: '#0A0716', border: '1px solid rgba(255,215,0,0.12)' }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black text-[#FFD700] tracking-widest uppercase">
                  Top Songs Picks
                </h2>
                <span className="text-[9px] text-[#3B2F50]">{picks.length} picks</span>
              </div>

              <p className="text-[9px] text-[#3B2F50]">
                Drag from playlist to add · Drag rows to reorder · Click ✕ to remove
              </p>

              <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
                <PicksDropZone
                  picks={picks}
                  onAdd={addTrack}
                  onRemove={removeTrack}
                  onReorder={reorderPicks}
                />
              </div>
            </div>
          </div>
        </DndProvider>
        </motion.div>
      ))}
    </div>
  );
}

// ─── AdminPanel — root export ─────────────────────────────────────────────────
export function AdminPanel() {
  const [adminToken, setAdminToken] = useState<string | null>(null);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    setAdminToken(null);
  }, []);

  if (!adminToken) {
    return <AdminLogin onLogin={setAdminToken} />;
  }

  return <AdminDashboard adminToken={adminToken} onLogout={handleLogout} />;
}
