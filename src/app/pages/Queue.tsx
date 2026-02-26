import { usePlayer } from '../context/PlayerContext';
import { TrackCard } from '../components/TrackCard';
import { ListMusic, Shuffle, Play, SkipForward } from 'lucide-react';
import { formatArtistName } from '../utils/formatArtistName';
import { getMaxResThumbnail, handleThumbnailError } from '../utils/getMaxResThumbnail';

export function Queue() {
  const { tracks, currentTrack, currentIndex, isPlaying, playTrack, nextTrack, togglePlay, isShuffle, toggleShuffle } = usePlayer();

  const upNext = currentIndex >= 0
    ? tracks.slice(currentIndex + 1).concat(tracks.slice(0, currentIndex))
    : tracks;

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
            <ListMusic className="w-7 h-7 text-[#9D00FF]" />
            Queue
          </h1>
          <p className="text-[#5B4F70] text-sm mt-1">{tracks.length} tracks in rotation</p>
        </div>
        <button
          onClick={toggleShuffle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isShuffle
              ? 'text-[#9D00FF] border-[#9D00FF]/60 bg-[#9D00FF]/10'
              : 'text-[#5B4F70] border-[#2A0060] hover:text-white'
            }`}
        >
          <Shuffle className="w-3.5 h-3.5" />
          Shuffle {isShuffle ? 'On' : 'Off'}
        </button>
      </div>

      {/* Now Playing */}
      {currentTrack && (
        <div className="mb-6">
          <p className="text-xs font-bold text-[#9D00FF] tracking-widest mb-3 uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#9D00FF] animate-pulse" />
            Now Playing
          </p>
          <div
            className="rounded-2xl p-4 border border-[#9D00FF]/30"
            style={{ background: 'linear-gradient(135deg, #1a003a, #0D001E)' }}
          >
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                <img
                  src={currentTrack.source === 'soundcloud'
                    ? (currentTrack.snippet.thumbnails.medium?.url || currentTrack.snippet.thumbnails.default?.url)
                    : getMaxResThumbnail(currentTrack.id.videoId)}
                  alt={currentTrack.snippet.title}
                  className="w-full h-full object-cover"
                  onError={(e) => handleThumbnailError(e, currentTrack.id.videoId)}
                />
                {isPlaying && (
                  <div className="absolute inset-0 bg-[#9D00FF]/20 flex items-center justify-center">
                    <span className="w-3 h-3 bg-[#9D00FF] rounded-full animate-ping" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{currentTrack.snippet.title}</p>
                <p className="text-sm text-[#9D00FF]">{formatArtistName(currentTrack.snippet.channelTitle)}</p>
                <p className="text-xs text-[#5B4F70] mt-0.5">
                  Track {currentIndex + 1} of {tracks.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                  style={{ background: 'linear-gradient(135deg, #9D00FF, #FF0080)' }}
                >
                  {isPlaying ? <span className="text-white text-xs">⏸</span> : <Play className="w-4 h-4 text-white" />}
                </button>
                <button
                  onClick={nextTrack}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-[#1a003a] hover:bg-[#250050] text-[#9D00FF] transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Up Next */}
      {upNext.length > 0 && (
        <div>
          <p className="text-xs font-bold text-[#5B4F70] tracking-widest mb-3 uppercase">
            Up Next ({upNext.length} tracks)
          </p>
          <div className="grid grid-cols-1 gap-2">
            {upNext.map((track, i) => (
              <TrackCard key={track.id.videoId} track={track} trackList={tracks} index={i} variant="list" />
            ))}
          </div>
        </div>
      )}

      {tracks.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-5xl">📋</span>
          <p className="text-white font-bold text-lg">Queue is empty</p>
          <p className="text-[#5B4F70] text-sm">Go to Radio and start playing tracks</p>
        </div>
      )}
    </div>
  );
}