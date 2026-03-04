import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, Clock, Ticket, Plus, ChevronDown, ChevronUp,
  Music, Calendar, Search, Filter, X, Check, Send,
  Star, Globe, AlertCircle, ExternalLink,
} from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { usePlayer } from '../context/PlayerContext';
import { useBPMPulse } from '../hooks/useBPMPulse';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-715f71b9`;
const HEADERS = { Authorization: `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' };

// ─── Types ────────────────────────────────────────────────────────────────────
interface Flyer {
  id: string;
  title: string;
  venue: string;
  city: string;
  state: string;
  country: string;
  date: string;       // "YYYY-MM-DD"
  time: string;
  djs: string[];
  genres: string[];
  price: string;
  ticketUrl: string;
  description: string;
  submittedBy: string;
  approved: boolean;
  featured: boolean;
  createdAt: string;
}

// ─── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(dateStr: string) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const tick = () => {
      // Compare against midnight of that date in local time
      const eventDate = new Date(dateStr + 'T00:00:00');
      const now = new Date();
      const diff = eventDate.getTime() - now.getTime();
      if (diff <= 0) { setLabel('TODAY'); return; }
      const days = Math.floor(diff / 86_400_000);
      const hours = Math.floor((diff % 86_400_000) / 3_600_000);
      if (days >= 1) setLabel(`${days}d ${hours}h`);
      else setLabel(`${hours}h`);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [dateStr]);
  return label;
}

// ─── City accent colours ──────────────────────────────────────────────────────
const CITY_COLORS: Record<string, string> = {
  Newark: '#9D00FF', Baltimore: '#FF6B00', Philadelphia: '#00B4FF',
  'New York': '#00FF88', Brooklyn: '#00FF88', London: '#FF4444',
  Toronto: '#FFD700', Chicago: '#FF69B4', 'Asbury Park': '#00D4FF',
  'Atlantic City': '#FF0080', Washington: '#4ADE80', Philadelphia2: '#00B4FF',
};
function cityColor(city: string) { return CITY_COLORS[city] ?? '#9D00FF'; }

// ─── Flyer Card ───────────────────────────────────────────────────────────────
function FlyerCard({ flyer, featured }: { flyer: Flyer; featured?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const countdown = useCountdown(flyer.date);
  const color = cityColor(flyer.city);

  // Format date prettily: "FRI · MAR 6, 2026"
  const datePretty = (() => {
    const d = new Date(flyer.date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
  })();

  const isToday = countdown === 'TODAY';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="relative rounded-2xl overflow-hidden cursor-pointer"
      style={{
        background: featured ? `linear-gradient(135deg, ${color}15, #0D001E)` : '#0D001E',
        border: `1.5px solid ${featured ? color : color + '30'}`,
        boxShadow: featured ? `0 0 28px ${color}25` : undefined,
      }}
      onClick={() => setExpanded(e => !e)}
    >
      {/* Featured badge */}
      {featured && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black"
          style={{ background: color, color: '#000' }}>
          <Star className="w-2.5 h-2.5" />FEATURED
        </div>
      )}

      {/* Today badge */}
      {isToday && (
        <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black animate-pulse"
          style={{ background: '#00FF88', color: '#000' }}>
          🔥 TONIGHT
        </div>
      )}

      <div className="p-4">
        {/* Date strip */}
        <div className="flex items-center gap-2 mb-3">
          <div className="px-2 py-1 rounded-lg text-[10px] font-black"
            style={{ background: color + '20', color }}>
            {datePretty}
          </div>
          <div className="text-[10px] text-[#5B4F70] flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {flyer.time}
          </div>
          <div className="ml-auto text-[10px] font-black" style={{ color: isToday ? '#00FF88' : color }}>
            ⏱ {countdown}
          </div>
        </div>

        {/* Title + venue */}
        <h3 className="text-base font-black text-white leading-tight mb-1">{flyer.title}</h3>
        <div className="flex items-center gap-1 text-xs text-[#7B6F90] mb-3">
          <MapPin className="w-3 h-3 flex-shrink-0" style={{ color }} />
          <span>{flyer.venue}</span>
          <span className="text-[#3B2F50]">·</span>
          <span style={{ color }}>{flyer.city}{flyer.state ? `, ${flyer.state}` : ''}</span>
          {flyer.country !== 'US' && <span className="text-[#5B4F70]">· {flyer.country}</span>}
        </div>

        {/* DJ lineup */}
        <div className="flex flex-wrap gap-1 mb-3">
          {flyer.djs.map(dj => (
            <span key={dj} className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
              style={{ background: '#1a0040', border: `1px solid ${color}40` }}>
              🎧 {dj}
            </span>
          ))}
        </div>

        {/* Genre tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {flyer.genres.map(g => (
            <span key={g} className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
              style={{ background: color + '15', color: color + 'CC' }}>
              {g}
            </span>
          ))}
        </div>

        {/* Price + tickets */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-white">{flyer.price}</span>
          {flyer.ticketUrl && (
            <a href={flyer.ticketUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white ml-auto transition-all hover:scale-105"
              style={{ background: color, color: '#fff' }}
              onClick={e => e.stopPropagation()}>
              <Ticket className="w-3 h-3" />Get Tickets
            </a>
          )}
          <button className="ml-auto text-[#5B4F70] hover:text-white transition-colors"
            onClick={e => { e.stopPropagation(); setExpanded(ex => !ex); }}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded description */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden">
            <div className="px-4 pb-4 pt-0">
              <div className="h-px mb-3" style={{ background: color + '20' }} />
              <p className="text-xs text-[#9B8FB0] leading-relaxed">{flyer.description}</p>
              {flyer.ticketUrl && (
                <a href={flyer.ticketUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 mt-3 text-xs font-bold hover:underline"
                  style={{ color }}
                  onClick={e => e.stopPropagation()}>
                  Full event details <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Past Flyer Card (greyed out) ─────────────────────────────────────────────
function PastFlyerCard({ flyer }: { flyer: Flyer }) {
  const datePretty = new Date(flyer.date + 'T00:00:00')
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase();
  return (
    <div className="rounded-xl p-3 opacity-50 flex items-center gap-3"
      style={{ background: '#0A0018', border: '1px solid #1a0030' }}>
      <div className="text-[10px] font-bold text-[#3B2F50] w-24 flex-shrink-0">{datePretty}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-[#5B4F70] truncate">{flyer.title}</p>
        <p className="text-[10px] text-[#3B2F50]">{flyer.venue} · {flyer.city}</p>
      </div>
      <div className="text-[10px] text-[#2a0040] flex-shrink-0">PAST</div>
    </div>
  );
}

// ─── Submit Flyer Modal ───────────────────────────────────────────────────────
function SubmitModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    title: '', venue: '', city: '', state: '', country: 'US',
    date: '', time: '10:00 PM', djs: '', genres: 'Jersey Club',
    price: '', ticketUrl: '', description: '', submittedBy: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.title || !form.venue || !form.city || !form.date) {
      setError('Title, venue, city, and date are required.'); return;
    }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${BASE}/events`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({
          ...form,
          djs: form.djs.split(',').map(d => d.trim()).filter(Boolean),
          genres: form.genres.split(',').map(g => g.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setDone(true);
      setTimeout(() => { onSuccess(); onClose(); }, 2500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#9D00FF]';
  const inputStyle = { background: '#0A0018', border: '1px solid #1a0040' };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(6,0,15,0.92)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="w-full max-w-lg rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{ background: '#0D001E', border: '1.5px solid #9D00FF40' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1a0040]">
          <div>
            <h3 className="text-white font-black text-lg">Submit an Event Flyer</h3>
            <p className="text-[10px] text-[#5B4F70]">Events are reviewed before going live · Usually approved within 24h</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-[#5B4F70] hover:text-white hover:bg-[#1a0040] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-white font-black text-lg mb-1">Flyer Submitted!</p>
            <p className="text-[#7B6F90] text-sm">Your event will appear after review. Thanks for supporting the scene.</p>
          </div>
        ) : (
          <div className="p-5 space-y-3">
            {/* Required */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#5B4F70] font-bold block mb-1">EVENT TITLE *</label>
                <input value={form.title} onChange={update('title')} placeholder="Jersey Club Fridays" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-[10px] text-[#5B4F70] font-bold block mb-1">VENUE *</label>
                <input value={form.venue} onChange={update('venue')} placeholder="Club Excess" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-[10px] text-[#5B4F70] font-bold block mb-1">CITY *</label>
                <input value={form.city} onChange={update('city')} placeholder="Newark" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-[10px] text-[#5B4F70] font-bold block mb-1">STATE / REGION</label>
                <input value={form.state} onChange={update('state')} placeholder="NJ" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-[10px] text-[#5B4F70] font-bold block mb-1">DATE *</label>
                <input type="date" value={form.date} onChange={update('date')} min={new Date().toISOString().split('T')[0]}
                  className={inputCls} style={{ ...inputStyle, colorScheme: 'dark' }} />
              </div>
              <div>
                <label className="text-[10px] text-[#5B4F70] font-bold block mb-1">DOORS / START TIME</label>
                <input value={form.time} onChange={update('time')} placeholder="10:00 PM" className={inputCls} style={inputStyle} />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[#5B4F70] font-bold block mb-1">DJ LINEUP (comma-separated)</label>
              <input value={form.djs} onChange={update('djs')} placeholder="DJ Tameil, DJ Bavgate, DJ Rondell" className={inputCls} style={inputStyle} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#5B4F70] font-bold block mb-1">GENRES (comma-separated)</label>
                <input value={form.genres} onChange={update('genres')} placeholder="Jersey Club, B-More" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-[10px] text-[#5B4F70] font-bold block mb-1">PRICE</label>
                <input value={form.price} onChange={update('price')} placeholder="$15 adv · $20 door" className={inputCls} style={inputStyle} />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-[#5B4F70] font-bold block mb-1">TICKET LINK</label>
              <input value={form.ticketUrl} onChange={update('ticketUrl')} placeholder="https://..." className={inputCls} style={inputStyle} />
            </div>

            <div>
              <label className="text-[10px] text-[#5B4F70] font-bold block mb-1">EVENT DESCRIPTION</label>
              <textarea value={form.description} onChange={update('description')} rows={3}
                placeholder="Describe the vibe, who's performing, what to expect…"
                className={inputCls + ' resize-none'} style={inputStyle} />
            </div>

            <div>
              <label className="text-[10px] text-[#5B4F70] font-bold block mb-1">YOUR NAME / PROMOTER</label>
              <input value={form.submittedBy} onChange={update('submittedBy')} placeholder="Jersey Events Crew" className={inputCls} style={inputStyle} />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: '#3a0000', border: '1px solid #FF444430' }}>
                <AlertCircle className="w-3.5 h-3.5 text-[#FF4444] flex-shrink-0" />
                <span className="text-[#FF8888]">{error}</span>
              </div>
            )}

            <button onClick={submit} disabled={submitting}
              className="w-full py-3 rounded-xl font-black text-white text-sm transition-all hover:scale-[1.01] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #9D00FF, #FF0080)', boxShadow: '0 0 20px #9D00FF50' }}>
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting…</>
              ) : (
                <><Send className="w-4 h-4" />Submit Flyer</>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function Events() {
  const { isPlaying } = usePlayer();
  const { pulse } = useBPMPulse(isPlaying);

  const [upcoming, setUpcoming] = useState<Flyer[]>([]);
  const [past, setPast] = useState<Flyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPast, setShowPast] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Filter state
  const [searchQ, setSearchQ] = useState('');
  const [filterCity, setFilterCity] = useState('All');
  const [filterWindow, setFilterWindow] = useState<'all' | 'week' | 'month'>('all');

  // ── Fetch events ─────────────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/events`, { headers: HEADERS });
      const data = await res.json();
      setUpcoming(data.upcoming ?? []);
      setPast(data.past ?? []);
    } catch (e) {
      console.error('Events fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ── Senior Dev Logic: Only show flyers where date >= today ──────────────────
  // (Server already enforces this, but we apply the same logic client-side
  //  as a guard and to support the time-window filters.)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredUpcoming = useMemo(() => {
    let list = upcoming;

    // Guard: date >= today (mirrors server logic, defends against clock drift)
    list = list.filter(f => new Date(f.date + 'T00:00:00') >= today);

    // Search filter
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      list = list.filter(f =>
        f.title.toLowerCase().includes(q) ||
        f.city.toLowerCase().includes(q) ||
        f.venue.toLowerCase().includes(q) ||
        f.djs.some(dj => dj.toLowerCase().includes(q)) ||
        f.genres.some(g => g.toLowerCase().includes(q))
      );
    }

    // City filter
    if (filterCity !== 'All') list = list.filter(f => f.city === filterCity);

    // Time window filter
    if (filterWindow === 'week') {
      const weekOut = new Date(today); weekOut.setDate(weekOut.getDate() + 7);
      list = list.filter(f => new Date(f.date + 'T00:00:00') <= weekOut);
    } else if (filterWindow === 'month') {
      const monthOut = new Date(today); monthOut.setDate(monthOut.getDate() + 30);
      list = list.filter(f => new Date(f.date + 'T00:00:00') <= monthOut);
    }

    return list;
  }, [upcoming, searchQ, filterCity, filterWindow]);

  const featuredFlyers = filteredUpcoming.filter(f => f.featured);
  const regularFlyers  = filteredUpcoming.filter(f => !f.featured);

  // Unique cities for filter dropdown
  const allCities = useMemo(() => {
    const set = new Set(upcoming.map(f => f.city));
    return ['All', ...Array.from(set).sort()];
  }, [upcoming]);

  const TIME_WINDOWS = [
    { key: 'all', label: 'All Dates' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
  ] as const;

  return (
    <div className="min-h-[calc(100vh-96px)]" style={{ background: '#06000F' }}>
      {/* Submit modal */}
      <AnimatePresence>
        {showSubmit && (
          <SubmitModal onClose={() => setShowSubmit(false)} onSuccess={() => setSubmitSuccess(true)} />
        )}
      </AnimatePresence>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden px-4 pt-6 pb-4" style={{ borderBottom: '1px solid #1a0040' }}>
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #9D00FF12, transparent)' }} />

        <div className="max-w-4xl mx-auto relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#9D00FF] animate-pulse" />
                <p className="text-[10px] font-bold text-[#9D00FF] tracking-widest">JERSEY CLUB EVENTS</p>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-1">FLYERS &amp; EVENTS</h1>
              <p className="text-[#7B6F90] text-sm">
                {loading ? 'Loading…' : `${upcoming.length} upcoming events across ${allCities.length - 1} cities`}
              </p>
            </div>
            <button onClick={() => setShowSubmit(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #9D00FF, #FF0080)', boxShadow: '0 0 16px #9D00FF50' }}>
              <Plus className="w-4 h-4" />Submit Flyer
            </button>
          </div>

          {/* Success notice */}
          <AnimatePresence>
            {submitSuccess && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                style={{ background: '#1a3a00', border: '1px solid #00FF8840' }}>
                <Check className="w-3.5 h-3.5 text-[#00FF88]" />
                <span className="text-[#4ADE80]">Flyer submitted! It'll appear after review — usually within 24 hours.</span>
                <button onClick={() => setSubmitSuccess(false)} className="ml-auto text-[#3B2F50] hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">

        {/* ── Filters ──────────────────────────────────────────────────────── */}
        <div className="mb-5 space-y-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B4F70]" />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="Search events, DJs, venues, cities…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-[#3B2F50] focus:outline-none focus:ring-1 focus:ring-[#9D00FF]"
              style={{ background: '#0D001E', border: '1px solid #1a0040' }} />
            {searchQ && (
              <button onClick={() => setSearchQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B4F70] hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* City + window filters */}
          <div className="flex flex-wrap gap-2">
            {/* Time window pills */}
            <div className="flex gap-1 rounded-xl p-0.5" style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
              {TIME_WINDOWS.map(w => (
                <button key={w.key} onClick={() => setFilterWindow(w.key)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                  style={{
                    background: filterWindow === w.key ? '#9D00FF' : 'transparent',
                    color: filterWindow === w.key ? '#fff' : '#5B4F70',
                  }}>
                  {w.label}
                </button>
              ))}
            </div>

            {/* City dropdown */}
            <div className="relative">
              <select value={filterCity} onChange={e => setFilterCity(e.target.value)}
                className="appearance-none px-3 py-1.5 pr-8 rounded-xl text-[11px] font-bold text-[#9B8FB0] focus:outline-none cursor-pointer"
                style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
                {allCities.map(c => <option key={c} value={c}>{c === 'All' ? '🌍 All Cities' : c}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#5B4F70] pointer-events-none" />
            </div>

            {/* Clear filters */}
            {(searchQ || filterCity !== 'All' || filterWindow !== 'all') && (
              <button onClick={() => { setSearchQ(''); setFilterCity('All'); setFilterWindow('all'); }}
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-[#5B4F70] hover:text-white transition-colors flex items-center gap-1"
                style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
                <X className="w-3 h-3" />Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Loading ───────────────────────────────────────────────────────── */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl h-48 animate-pulse" style={{ background: '#0D001E', border: '1px solid #1a0040' }} />
            ))}
          </div>
        )}

        {/* ── Featured flyers ───────────────────────────────────────────────── */}
        {!loading && featuredFlyers.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-3.5 h-3.5 text-[#FFD700]" />
              <p className="text-[10px] font-bold text-[#FFD700] tracking-widest">FEATURED EVENTS</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {featuredFlyers.map(f => <FlyerCard key={f.id} flyer={f} featured />)}
            </div>
          </div>
        )}

        {/* ── Upcoming flyers ───────────────────────────────────────────────── */}
        {!loading && (
          <>
            {regularFlyers.length > 0 && (
              <div className="mb-6">
                {featuredFlyers.length > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="w-3.5 h-3.5 text-[#9D00FF]" />
                    <p className="text-[10px] font-bold text-[#9D00FF] tracking-widest">ALL UPCOMING</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {regularFlyers.map(f => <FlyerCard key={f.id} flyer={f} />)}
                </div>
              </div>
            )}

            {/* No results */}
            {filteredUpcoming.length === 0 && (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">🎵</div>
                <p className="text-white font-black text-lg mb-1">No events found</p>
                <p className="text-[#5B4F70] text-sm mb-4">
                  {searchQ || filterCity !== 'All' ? 'Try adjusting your filters' : 'No upcoming events right now'}
                </p>
                <button onClick={() => setShowSubmit(true)}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #9D00FF, #FF0080)' }}>
                  Submit the First Flyer →
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Past events toggle ────────────────────────────────────────────── */}
        {!loading && past.length > 0 && (
          <div className="mt-4">
            <button onClick={() => setShowPast(p => !p)}
              className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-sm text-[#5B4F70] hover:text-white transition-colors mb-2"
              style={{ background: '#0A0018', border: '1px solid #1a0030' }}>
              <Clock className="w-4 h-4" />
              <span className="font-bold">{showPast ? 'Hide' : 'Show'} Past Events ({past.length})</span>
              {showPast ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
            </button>

            <AnimatePresence>
              {showPast && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2">
                  {past.map(f => <PastFlyerCard key={f.id} flyer={f} />)}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── Promoter CTA ──────────────────────────────────────────────────── */}
        {!loading && (
          <div className="mt-8 p-5 rounded-2xl text-center" style={{ background: '#0D001E', border: '1px solid #1a0040' }}>
            <Globe className="w-8 h-8 text-[#9D00FF] mx-auto mb-3" />
            <p className="text-white font-black text-lg mb-1">Promote Your Event</p>
            <p className="text-[#7B6F90] text-xs mb-4 max-w-sm mx-auto">
              Running a Jersey Club night? Submit your flyer — it's free, reaches thousands of fans globally, and shows up in the Live Ticker too.
            </p>
            <button onClick={() => setShowSubmit(true)}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #9D00FF, #FF0080)', boxShadow: '0 0 16px #9D00FF40' }}>
              Submit a Flyer — It's Free
            </button>
            <p className="text-[#3B2F50] text-[10px] mt-2">Free · No login required · Appears after review</p>
          </div>
        )}
      </div>
    </div>
  );
}
