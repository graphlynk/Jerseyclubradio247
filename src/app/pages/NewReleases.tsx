import { usePlayer } from '../context/PlayerContext';
import { TrackCard } from '../components/TrackCard';
import { Zap, Loader2, RefreshCw, Play } from 'lucide-react';

function formatRelativeDate(iso: string) {
  try {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diff = now - then;
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  } catch {
    return '';
  }
}

export function NewReleases() {
  const { newReleases, isLoading, isRefreshing, refreshTracks, playTrack } = usePlayer();

  // Sort by date, newest first
  const sorted = [...newReleases].sort(
    (a, b) => new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime()
  );

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
            <span className="text-3xl animate-pulse" style={{ filter: 'drop-shadow(0 0 8px #00FF88)' }}>💃🏿</span>
            New Releases
          </h1>
          <p className="text-[#5B4F70] text-sm mt-1">Latest Jersey Club drops Powered by 24/7 Jersey Club Radio</p>
        </div>
        <button
          onClick={refreshTracks}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#00FF88] border border-[#00FF88]/30 hover:bg-[#00FF88]/10 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Hero Banner */}
      <div
        className="relative rounded-3xl overflow-hidden p-6 mb-8 border border-[#00FF88]/20"
        style={{ background: 'linear-gradient(135deg, #001a0f 0%, #0a1a00 50%, #00100a 100%)' }}
      >
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, #00FF88 0%, transparent 70%)' }}
        />
        <div className="relative z-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
            <span className="text-xs font-bold text-[#00FF88] tracking-widest">FRESHEST DROPS</span>
          </div>
          <h2 className="text-xl font-black text-white mb-1">New Jersey Club Hits</h2>
          <p className="text-[#3B5040] text-sm mb-4">Discover the latest releases from Jersey Club artists</p>
          {sorted[0] && (
            <button
              onClick={() => playTrack(sorted[0], sorted)}
              className="flex items-center gap-2 px-5 py-2 rounded-full font-bold text-sm mx-auto transition-all"
              style={{ background: '#00FF88', color: '#000' }}
            >
              <Play className="w-4 h-4" /> Play Latest
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Loader2 className="w-10 h-10 text-[#00FF88] animate-spin" />
          <p className="text-[#7B6F90] text-sm">Loading new releases...</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-3xl animate-pulse" style={{ filter: 'drop-shadow(0 0 8px #00FF88)' }}>💃🏿</span>
          <p className="text-white font-bold text-lg">No new releases yet</p>
          <p className="text-[#5B4F70] text-sm">Click Refresh to fetch the latest Jersey Club drops</p>
          <button
            onClick={refreshTracks}
            className="px-6 py-2.5 rounded-full font-bold text-sm"
            style={{ background: '#00FF88', color: '#000' }}
          >
            Load New Releases
          </button>
        </div>
      ) : (
        <>
          {/* Grid view */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {sorted.slice(0, 12).map(track => (
              <div key={track.id.videoId} className="relative">
                <TrackCard track={track} trackList={sorted} variant="grid" />
                <div className="absolute top-2 left-2 bg-black/70 text-[#00FF88] text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                  {formatRelativeDate(track.snippet.publishedAt)}
                </div>
              </div>
            ))}
          </div>

          {/* List view for the rest */}
          {sorted.length > 12 && (
            <>
              <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <span className="text-[#00FF88]">↓</span> More New Releases
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {sorted.slice(12).map((track, i) => (
                  <TrackCard key={track.id.videoId} track={track} trackList={sorted} index={i + 12} variant="list" />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}