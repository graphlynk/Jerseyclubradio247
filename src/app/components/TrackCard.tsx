import React from 'react';
import { Play, Pause } from 'lucide-react';
import { Track, usePlayer } from '../context/PlayerContext';
import { useCrateSafe } from '../context/CrateContext';
import { formatArtistName } from '../utils/formatArtistName';
import { formatTrackTitle } from '../utils/formatTrackTitle';
import { GoldVinylRecord } from './GoldVinylRecord';
import { getMaxResThumbnail, handleThumbnailError } from '../utils/getMaxResThumbnail';

interface TrackCardProps {
  track: Track;
  trackList: Track[];
  index?: number;
  variant?: 'grid' | 'list';
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export function TrackCard({ track, trackList, index, variant = 'grid' }: TrackCardProps) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const crateCtx = useCrateSafe();
  const addToCrate = crateCtx?.addToCrate;
  const removeFromCrate = crateCtx?.removeFromCrate;
  const isInCrate = crateCtx?.isInCrate ?? (() => false);
  const addingIds = crateCtx?.addingIds ?? new Set<string>();
  const is24k = crateCtx?.is24k ?? false;
  const openPaywall = crateCtx?.openPaywall ?? (() => {});
  const isGuestAtLimit = crateCtx?.isGuestAtLimit ?? false;
  const isActive = currentTrack?.id.videoId === track.id.videoId;
  const inCrate = isInCrate(track.id.videoId);
  const isAdding = addingIds.has(track.id.videoId);
  const thumb = track.source === 'soundcloud'
    ? (track.snippet.thumbnails.high?.url || track.snippet.thumbnails.medium?.url || track.snippet.thumbnails.default?.url)
    : getMaxResThumbnail(track.id.videoId);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActive) {
      togglePlay();
    } else {
      playTrack(track, trackList);
    }
  };

  const handleCrate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inCrate) {
      removeFromCrate(track.id.videoId);
    } else if (!is24k && isGuestAtLimit) {
      openPaywall();
    } else {
      addToCrate(track);
    }
  };

  // Gold or purple vinyl button color
  const crateColor = inCrate
    ? (is24k ? '#fcf6ba' : '#C084FC')
    : 'rgba(255,255,255,0.35)';
  const crateShadow = inCrate
    ? (is24k ? '0 0 8px rgba(191,149,63,0.8)' : '0 0 8px rgba(157,0,255,0.6)')
    : 'none';

  if (variant === 'list') {
    return (
      <div
        onClick={handlePlay}
        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer group transition-all duration-200 ${
          isActive
            ? 'bg-[#1a003a] border border-[#9D00FF]/60'
            : 'bg-[#0F0022] border border-[#2A0060]/50 hover:border-[#9D00FF]/40 hover:bg-[#150030]'
        }`}
      >
        {index !== undefined && (
          <span className={`text-sm w-5 text-center font-mono ${isActive ? 'text-[#9D00FF]' : 'text-[#6B5F80]'}`}>
            {isActive && isPlaying ? '▶' : index + 1}
          </span>
        )}
        <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0" style={{ background: '#0F0022' }}>
          <img src={thumb} alt={track.snippet.title} className="w-full h-full object-cover scale-[1.15]" onError={(e) => handleThumbnailError(e, track.id.videoId)} />
          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            {isActive && isPlaying
              ? <Pause className="w-4 h-4 text-white" />
              : <Play className="w-4 h-4 text-white" />
            }
          </div>
          {isActive && (
            <div className="absolute inset-0 border-2 border-[#9D00FF] rounded-lg pointer-events-none" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate uppercase ${isActive ? 'text-[#9D00FF]' : 'text-white'}`}>
            {truncate(formatTrackTitle(track.snippet.title, track.snippet.channelTitle), 60)}
          </p>
          <p className="text-xs text-[#7B6F90] truncate">{formatArtistName(track.snippet.channelTitle)}</p>
        </div>
        <span className="text-xs text-[#6B5F80] hidden sm:block flex-shrink-0">
          {formatDate(track.snippet.publishedAt)}
        </span>
        {/* Crate button (list) */}
        <button
          onClick={handleCrate}
          title={inCrate ? 'Remove from crate' : 'Save to crate'}
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ background: inCrate ? (is24k ? 'rgba(191,149,63,0.15)' : 'rgba(157,0,255,0.15)') : 'transparent' }}
        >
          <GoldVinylRecord
            is24k={inCrate || is24k}
            size={26}
            spinning={isAdding}
          />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 ${
        isActive
          ? 'ring-2 ring-[#9D00FF] shadow-[0_0_20px_rgba(157,0,255,0.4)]'
          : 'hover:shadow-[0_0_20px_rgba(157,0,255,0.2)]'
      }`}
      onClick={handlePlay}
      style={{ background: 'linear-gradient(135deg, #0F0022 0%, #160035 100%)' }}
    >
      <div className="relative aspect-video">
        <img src={thumb} alt={track.snippet.title} className="w-full h-full object-cover scale-[1.15]" onError={(e) => handleThumbnailError(e, track.id.videoId)} />
        <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent`} />
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button className="w-12 h-12 rounded-full bg-[#9D00FF] flex items-center justify-center shadow-[0_0_20px_rgba(157,0,255,0.6)] hover:scale-110 transition-transform">
            {isActive && isPlaying
              ? <Pause className="w-5 h-5 text-white" />
              : <Play className="w-5 h-5 text-white ml-0.5" />
            }
          </button>
        </div>
        {isActive && (
          <div className="absolute top-2 right-2 bg-[#9D00FF] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            PLAYING
          </div>
        )}

        {/* Crate button (grid) — top-left */}
        <button
          onClick={handleCrate}
          title={inCrate ? 'Remove from crate' : 'Save to crate'}
          className="absolute top-2 left-2 w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100"
          style={{
            background: inCrate ? (is24k ? 'rgba(191,149,63,0.25)' : 'rgba(157,0,255,0.25)') : 'rgba(0,0,0,0.5)',
            border: `1px solid ${inCrate ? (is24k ? 'rgba(191,149,63,0.5)' : 'rgba(157,0,255,0.5)') : 'rgba(255,255,255,0.1)'}`,
            opacity: inCrate ? 1 : undefined,
          }}
        >
          <GoldVinylRecord
            is24k={inCrate || is24k}
            size={26}
            spinning={isAdding}
          />
        </button>
      </div>
      <div className="p-3">
        <p className={`text-sm font-bold leading-tight mb-1 uppercase ${isActive ? 'text-[#9D00FF]' : 'text-white'}`}>
          {truncate(formatTrackTitle(track.snippet.title, track.snippet.channelTitle), 55)}
        </p>
        <p className="text-xs text-[#7B6F90]">{formatArtistName(track.snippet.channelTitle)}</p>
      </div>
    </div>
  );
}