import { useState, useCallback } from 'react';
import { usePlayer, Track } from '../context/PlayerContext';
import { TrackCard } from '../components/TrackCard';
import { Search as SearchIcon, Loader2, X } from 'lucide-react';

const POPULAR_SEARCHES = [
  'DJ Tameil', 'DJ Bavgate', 'DJ Technics',
  'jersey club mix', 'jersey club banger',
  'jersey club 2025', 'newark jersey club',
  'jersey club bounce',
];

export function Search() {
  const { searchTracks, tracks } = usePlayer();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setQuery(q);
    setIsSearching(true);
    setHasSearched(true);
    setError('');
    try {
      const res = await searchTracks(q);
      if (Array.isArray(res)) {
        setResults(res);
      } else {
        setResults([]);
        setError('Search failed. Check your YouTube API key.');
      }
    } catch (e) {
      console.log('Search error:', e);
      setError('Search failed. Please try again.');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchTracks]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(query);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setHasSearched(false);
    setError('');
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2 mb-1">
          <SearchIcon className="w-7 h-7 text-[#FF0080]" />
          Search
        </h1>
        <p className="text-[#5B4F70] text-sm">Find Jersey Club artists, DJs, and tracks</p>
      </div>

      {/* Search input */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5B4F70]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search for artists, DJs, tracks..."
            className="w-full bg-[#0F0022] border border-[#2A0060] rounded-2xl py-3 pl-11 pr-12 text-white placeholder-[#3B2F50] focus:outline-none focus:border-[#FF0080] transition-colors text-sm"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-12 top-1/2 -translate-y-1/2 text-[#5B4F70] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: 'linear-gradient(135deg, #FF0080, #9D00FF)' }}
          >
            {isSearching
              ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              : <SearchIcon className="w-3.5 h-3.5 text-white" />
            }
          </button>
        </div>
      </form>

      {/* Popular searches */}
      {!hasSearched && (
        <div className="mb-8">
          <p className="text-xs font-bold text-[#5B4F70] tracking-widest mb-3 uppercase">Popular Searches</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map(tag => (
              <button
                key={tag}
                onClick={() => doSearch(tag)}
                className="px-4 py-1.5 rounded-full text-sm font-semibold border border-[#2A0060] text-[#9B8FB0] hover:text-white hover:border-[#FF0080] hover:bg-[#1a003a] transition-all"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-xl border border-red-900/50 bg-red-900/10 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {isSearching ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Loader2 className="w-10 h-10 text-[#FF0080] animate-spin" />
          <p className="text-[#7B6F90] text-sm">Searching YouTube for "{query}"...</p>
        </div>
      ) : hasSearched && results.length === 0 && !error ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-5xl">🔍</span>
          <p className="text-white font-bold text-lg">No results found</p>
          <p className="text-[#5B4F70] text-sm">Try searching for a different term (searches YouTube for Jersey Club tracks)</p>
        </div>
      ) : results.length > 0 ? (
        <div>
          <p className="text-xs font-bold text-[#5B4F70] tracking-widest mb-3 uppercase">
            {results.length} Results for "{query}"
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map(track => (
              <TrackCard key={track.id.videoId} track={track} trackList={results} variant="grid" />
            ))}
          </div>
        </div>
      ) : (
        /* Show default tracks */
        <div>
          <p className="text-xs font-bold text-[#5B4F70] tracking-widest mb-3 uppercase">Trending Tracks</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {tracks.slice(0, 8).map(track => (
              <TrackCard key={track.id.videoId} track={track} trackList={tracks} variant="grid" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}