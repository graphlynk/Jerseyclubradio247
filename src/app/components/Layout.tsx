import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { Radio, Zap, Search, ListMusic, RefreshCw, Gamepad2, MessageCircle, Film, ShoppingBag, Disc3, FileText, DollarSign, RotateCcw, Lock as LockIcon } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useCrateSafe } from '../context/CrateContext';
import { Player } from './Player';
import { SocialTicker } from './SocialTicker';
import { SocialWidgets } from './SocialWidgets';
import { FlashSale } from './games/FlashSale';
import { useSuperFan } from '../hooks/useSuperFan';
import { useTrackSEO } from '../hooks/useTrackSEO';
import { ConsentBanner } from './ConsentBanner';
import { TermsPricingDrawer } from './TermsPricingDrawer';

const NAV = [
  { path: '/', icon: Radio, label: 'Radio' },
  { path: '/new-releases', icon: Zap, label: 'New Releases' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/queue', icon: ListMusic, label: 'Queue' },
  { path: '/crate', icon: Disc3, label: 'My Crate' },
  { path: '/chat', icon: MessageCircle, label: 'Chat' },
  { path: '/dance-videos', icon: Film, label: 'Dance Videos' },
  { path: '/merch', icon: ShoppingBag, label: 'Merch' },
  { path: '/games', icon: Gamepad2, label: 'Game Hub' },
];

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();
  const { refreshTracks, isRefreshing, tracks, isPlaying, isFetchingMore, currentTrack } = usePlayer();
  useTrackSEO(currentTrack);
  const { showFlashSale, dismissFlashSale } = useSuperFan();
  const crateCtx = useCrateSafe();
  const is24k = crateCtx?.is24k ?? false;
  const crateCount = crateCtx?.crateCount ?? 0;
  const [termsOpen, setTermsOpen] = useState(false);

  // Auto-open Terms & Pricing on every new browser session
  useEffect(() => {
    const seen = sessionStorage.getItem('jcr-terms-seen');
    if (!seen) {
      const timer = setTimeout(() => setTermsOpen(true), 900);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleTermsClose = () => {
    setTermsOpen(false);
    sessionStorage.setItem('jcr-terms-seen', 'true');
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#06000F' }}>

      {/* ── Animated Background Mesh ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(circle at 15% 50%, rgba(157, 0, 255, 0.15), transparent 25%), radial-gradient(circle at 85% 30%, rgba(65, 0, 153, 0.15), transparent 25%)',
          animation: 'pulse 15s ease-in-out infinite alternate'
        }}
      />

      <div className="flex flex-1 pb-[200px] md:pb-24 relative z-10">
        {/* Sidebar */}
        <aside
          className="hidden md:flex flex-col w-60 border-r border-[#1a0040] flex-shrink-0 sticky top-0 overflow-y-auto"
          style={{ background: 'linear-gradient(180deg, rgba(10,0,24,0.95) 0%, rgba(6,0,15,0.95) 100%)', backdropFilter: 'blur(10px)', height: 'calc(100vh - 72px)' }}
        >
          {/* Logo */}
          <div className="p-5 border-b border-[#1a0040]">
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0" style={{ width: 42, height: 42 }}>
                <img
                  src="/jc-club-logo-purple.png"
                  alt="Jersey Club Radio 24/7"
                  className="w-full h-full object-contain"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(157,0,255,0.5)) drop-shadow(0 0 14px rgba(157,0,255,0.25))' }}
                />
                {isPlaying && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00FF88] rounded-full animate-pulse border border-[#06000F]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-sm tracking-wide">JERSEY CLUB</p>
                <p className="text-[10px] text-[#C084FC] font-semibold tracking-widest" style={{ textShadow: '0 0 4px #C084FC, 0 0 10px #9D00FF, 0 0 20px #9D00FF, 0 0 40px #7B00CC' }}>24/7 RADIO</p>
              </div>
            </div>
          </div>

          {/* Live indicator */}
          <div className="mx-4 mt-4 mb-2 rounded-xl px-3 py-2 flex items-center gap-2" style={{ background: '#0F0022' }}>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <span className="text-xs font-bold text-white tracking-widest">LIVE 24/7</span>
            <span className="ml-auto text-[10px] text-[#7B6F90]">{tracks.length} tracks</span>
          </div>
          {isFetchingMore && (
            <div className="mx-4 mb-2 rounded-xl px-3 py-1.5 flex items-center gap-2 border border-[#9D00FF]/20" style={{ background: '#0a0018' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#9D00FF] animate-ping flex-shrink-0" />
              <span className="text-[10px] text-[#9D00FF]">Fetching new tracks…</span>
            </div>
          )}

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1">
            {NAV.map(({ path, icon: Icon, label }) => {
              const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
              const isCrateItem = path === '/crate';
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-black tracking-[0.15em] uppercase transition-all duration-200 ${active
                    ? 'text-white shadow-[0_0_12px_rgba(157,0,255,0.3)]'
                    : 'text-[#8B7AA8] hover:text-white hover:bg-[#0F0022]'
                    }`}
                  style={active ? { background: 'linear-gradient(135deg, #1a0040, #250050)', borderLeft: '3px solid #9D00FF' } : {}}
                >
                  <Icon className={`w-5 h-5 ${active ? (isCrateItem && is24k ? '' : 'text-[#9D00FF]') : ''}`}
                    style={isCrateItem && is24k ? { color: '#fcf6ba', filter: 'drop-shadow(0 0 4px rgba(191,149,63,0.8))' } : {}}
                  />
                  <span style={isCrateItem && is24k ? { color: '#fcf6ba' } : {}}>{label}</span>
                  {isCrateItem && crateCount > 0 && (
                    <span
                      className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                      style={is24k
                        ? { background: 'linear-gradient(135deg,#bf953f,#fcf6ba)', color: '#2a1000' }
                        : { background: 'rgba(157,0,255,0.3)', color: '#C084FC' }
                      }
                    >
                      {crateCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Social media widgets */}
          <SocialWidgets variant="sidebar" />

          {/* Refresh */}
          <div className="p-4 border-t border-[#1a0040]">
            <button
              onClick={refreshTracks}
              disabled={isRefreshing}
              className="w-full flex items-center gap-2 justify-center px-3 py-2 rounded-xl text-xs font-semibold text-[#7B6F90] hover:text-white hover:bg-[#0F0022] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#9D00FF]' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh Tracks'}
            </button>

            {/* removed "Powered by" line — moved to footer */}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {children}

          {/* Legal footer — visible on every page for Paddle domain review */}
          <footer
            className="mt-16 px-6 pt-10 pb-6"
            style={{ background: '#08000F', borderTop: '1px solid rgba(157,0,255,0.15)' }}
          >
            <div className="max-w-5xl mx-auto">

              {/* ── Row 1: Logo · Headline · Social Icons ── */}
              <div className="flex items-center justify-between gap-4 mb-6">
                {/* Logo */}
                <div className="flex-shrink-0 w-[60px] h-[60px] overflow-hidden" style={{ filter: 'drop-shadow(0 0 8px rgba(157,0,255,0.4))' }}>
                  <img src="/jc-club-logo-purple.png" alt="JCR" className="w-full h-full object-contain" />
                </div>

                {/* Big centred headline */}
                <h2
                  className="flex-1 text-center font-black text-white tracking-tight leading-none select-none"
                  style={{
                    fontSize: 'clamp(1.1rem, 3.5vw, 2rem)',
                    textShadow: '0 0 18px rgba(157,0,255,0.5), 0 0 40px rgba(157,0,255,0.2)',
                  }}
                >
                  24/7 JERSEY CLUB RADIO
                </h2>

                {/* Social icon row */}
                <div className="flex-shrink-0 flex items-center gap-3">
                  {/* Instagram */}
                  <a href="https://instagram.com/jerseyclubradio" target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(157,0,255,0.25)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(157,0,255,0.5)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C084FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                  </a>
                  {/* TikTok */}
                  <a href="https://tiktok.com/@jerseyclubradio" target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(157,0,255,0.25)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(157,0,255,0.5)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#C084FC">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
                    </svg>
                  </a>
                  {/* YouTube */}
                  <a href="https://youtube.com/@jerseyclubradio" target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(157,0,255,0.25)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(157,0,255,0.5)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#C084FC">
                      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.54C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
                    </svg>
                  </a>
                  {/* X / Twitter */}
                  <a href="https://twitter.com/jerseyclubradio" target="_blank" rel="noopener noreferrer"
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(157,0,255,0.25)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(157,0,255,0.5)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#C084FC">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.26 5.632L18.245 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* ── Row 2: Nav links ── */}
              <nav className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 mb-6">
                {NAV.map(({ path, label }) => (
                  <Link
                    key={path}
                    to={path}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}
                    className="text-[11px] font-black tracking-[0.15em] text-[#8B7AA8] hover:text-white transition-colors duration-200 uppercase"
                  >
                    {label}
                  </Link>
                ))}
              </nav>

              {/* ── Tagline ── */}
              <p className="text-[13px] text-[#C084FC] text-center mb-6" style={{ opacity: 0.6 }}>
                The culture. Non-stop.
              </p>

              {/* ── Divider ── */}
              <div
                className="h-px mb-5"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(157,0,255,0.3), rgba(192,132,252,0.2), transparent)' }}
              />

              {/* ── Row 3: Legal links ── */}
              <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-1.5 mb-4">
                {[
                  { to: '/terms', label: 'Terms of Service' },
                  { to: '/privacy', label: 'Privacy Policy' },
                  { to: '/pricing', label: 'Pricing' },
                  { to: '/refund-policy', label: 'Refund Policy' },
                ].map(({ to, label }, i, arr) => (
                  <span key={to} className="contents">
                    <Link
                      to={to}
                      className="text-[10px] text-[#4B3F60] hover:text-[#C084FC] transition-colors duration-200 font-medium tracking-wide"
                    >
                      {label}
                    </Link>
                    {i < arr.length - 1 && (
                      <span className="text-[#2B2040] text-[10px] select-none">&middot;</span>
                    )}
                  </span>
                ))}
              </div>

              {/* ── Row 4: Copyright ── */}
              <p className="text-[10px] font-mono text-[#2B2040] text-center">
                Copyright 2026 Jersey Club Radio 24/7 &nbsp;&middot;&nbsp; Payments secured by{' '}
                <a href="https://paddle.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#C084FC] transition-colors">
                  Paddle
                </a>
              </p>
              <p className="text-[10px] text-[#3B2F50] text-center mt-[5px] mb-[0px]">&copy; Built by a Jersey Club DJ</p>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile bottom nav — sits at the very bottom above home indicator */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[51] h-[44px] mt-0 border-t border-[#2A0060]" style={{ background: 'linear-gradient(to bottom, #06000F 0%, #0D001E 100%)' }}>
        <div className="flex h-full">
          {NAV.map(({ path, icon: Icon, label }) => {
            const active = path === '/' ? pathname === '/' : pathname.startsWith(path);
            const isCrateItem = path === '/crate';
            return (
              <Link
                key={path}
                to={path}
                className={`flex-1 flex flex-col items-center gap-0.5 py-1 text-[11px] font-semibold transition-colors opacity-100 ${active ? 'text-[#9D00FF]' : 'text-[#4B3F60]'
                  }`}
                style={isCrateItem && is24k && active ? { color: '#fcf6ba' } : {}}
              >
                <div className="relative">
                  <Icon className="w-[19px] h-[19px]" style={isCrateItem && is24k ? { color: active ? '#fcf6ba' : '#bf953f' } : {}} />
                  {isCrateItem && crateCount > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center"
                      style={is24k ? { background: '#bf953f', color: '#2a1000' } : { background: '#9D00FF', color: 'white' }}
                    >
                      {crateCount}
                    </span>
                  )}
                </div>
                <span className="hidden xs:block">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Social Proof Ticker — sits just above the player bar */}
      <SocialTicker />

      {/* Persistent player */}
      <Player />

      {/* Site-wide merch popup — triggered by psychological timing */}
      <FlashSale visible={showFlashSale} onDismiss={dismissFlashSale} />

      {/* Legal consent banner */}
      <ConsentBanner />

      {/* Terms & Pricing drawer */}
      <TermsPricingDrawer open={termsOpen} onClose={handleTermsClose} />
    </div>
  );
}