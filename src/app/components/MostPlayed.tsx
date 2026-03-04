import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { Play, Loader2, Globe, Star } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { usePlayer, Track } from '../context/PlayerContext';
import { formatArtistName } from '../utils/formatArtistName';
import { WorldHeatMap, MapDot } from './WorldHeatMap';
import { GoldVinylRecord } from './GoldVinylRecord';
import { FireRankNumber } from './FireRankNumber';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-715f71b9`;
const HEADERS = { Authorization: `Bearer ${publicAnonKey}` };

// Supabase client for Realtime — triggers a refresh whenever KV store changes
const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);



// ─── Client-side city → coords lookup (mirrors the server CITY_COORDS table)
// Used as a fallback when the server doesn't return lat/lon for a listener.
const CITY_COORDS: Record<string, [number, number]> = {
  'Newark': [40.7357, -74.1724], 'New York': [40.7128, -74.0060],
  'Brooklyn': [40.6782, -73.9442], 'Bronx': [40.8448, -73.8648],
  'Queens': [40.7282, -73.7949], 'Staten Island': [40.5795, -74.1502],
  'Jersey City': [40.7178, -74.0431], 'Hoboken': [40.7440, -74.0324],
  'Paterson': [40.9168, -74.1718], 'Trenton': [40.2171, -74.7429],
  'Camden': [39.9259, -75.1196], 'Elizabeth': [40.6640, -74.2107],
  'Irvington': [40.7237, -74.2296], 'East Orange': [40.7676, -74.2049],
  'Philadelphia': [39.9526, -75.1652], 'Baltimore': [39.2904, -76.6122],
  'Washington': [38.9072, -77.0369], 'Boston': [42.3601, -71.0589],
  'Charlotte': [35.2271, -80.8431], 'Richmond': [37.5407, -77.4360],
  'Pittsburgh': [40.4406, -79.9959], 'Providence': [41.8240, -71.4128],
  'Albany': [42.6526, -73.7562], 'Buffalo': [42.8864, -78.8784],
  'Atlanta': [33.7490, -84.3880], 'Miami': [25.7617, -80.1918],
  'Orlando': [28.5383, -81.3792], 'Tampa': [27.9506, -82.4572],
  'Jacksonville': [30.3322, -81.6557], 'Raleigh': [35.7796, -78.6382],
  'Nashville': [36.1627, -86.7816], 'Memphis': [35.1495, -90.0490],
  'New Orleans': [29.9511, -90.0715], 'Birmingham': [33.5186, -86.8104],
  'Chicago': [41.8781, -87.6298], 'Detroit': [42.3314, -83.0458],
  'Cleveland': [41.4993, -81.6944], 'Columbus': [39.9612, -82.9988],
  'Indianapolis': [39.7684, -86.1581], 'St. Louis': [38.6270, -90.1994],
  'Kansas City': [39.0997, -94.5786], 'Milwaukee': [43.0389, -87.9065],
  'Minneapolis': [44.9778, -93.2650], 'Dallas': [32.7767, -96.7970],
  'Houston': [29.7604, -95.3698], 'San Antonio': [29.4241, -98.4936],
  'Austin': [30.2672, -97.7431], 'Phoenix': [33.4484, -112.0740],
  'Las Vegas': [36.1699, -115.1398], 'Denver': [39.7392, -104.9903],
  'Los Angeles': [34.0522, -118.2437], 'San Francisco': [37.7749, -122.4194],
  'San Diego': [32.7157, -117.1611], 'Seattle': [47.6062, -122.3321],
  'Portland': [45.5051, -122.6750], 'Toronto': [43.6532, -79.3832],
  'Montreal': [45.5017, -73.5673], 'Vancouver': [49.2827, -123.1207],
  'London': [51.5074, -0.1278], 'Manchester': [53.4808, -2.2426],
  'Birmingham UK': [52.4862, -1.8904], 'Leeds': [53.8008, -1.5491],
  'Liverpool': [53.4084, -2.9916], 'Glasgow': [55.8642, -4.2518],
  'Dublin': [53.3498, -6.2603], 'Paris': [48.8566, 2.3522],
  'Berlin': [52.5200, 13.4050], 'Amsterdam': [52.3676, 4.9041],
  'Madrid': [40.4168, -3.7038], 'Barcelona': [41.3851, 2.1734],
  'Kingston': [17.9714, -76.7936], 'Port of Spain': [10.6549, -61.5019],
  'Bridgetown': [13.1132, -59.5988], 'Nassau': [25.0480, -77.3558],
  'San Juan': [18.4655, -66.1057], 'Lagos': [6.5244, 3.3792],
  'Accra': [5.6037, -0.1870], 'Nairobi': [-1.2921, 36.8219],
  'Johannesburg': [-26.2041, 28.0473], 'Cape Town': [-33.9249, 18.4241],
  'Tokyo': [35.6762, 139.6503], 'Seoul': [37.5665, 126.9780],
  'Sydney': [-33.8688, 151.2093], 'Melbourne': [-37.8136, 144.9631],
  'Dubai': [25.2048, 55.2708], 'Singapore': [1.3521, 103.8198],
  'Mumbai': [19.0760, 72.8777], 'Delhi': [28.7041, 77.1025],
  'Piscataway': [40.5490, -74.4636], 'Clifton': [40.8584, -74.1638],
  'Woodbridge': [40.5576, -74.2846], 'Edison': [40.5187, -74.4121],
  'Hackensack': [40.8859, -74.0432], 'Plainfield': [40.6376, -74.4071],
  'Bayonne': [40.6688, -74.1135], 'Perth Amboy': [40.5068, -74.2654],
  'Mountain View': [37.3861, -122.0839], 'San Jose': [37.3382, -121.8863],
  'Sunnyvale': [37.3688, -122.0363], 'Palo Alto': [37.4419, -122.1430],
  'Longwood': [28.7028, -81.3470], 'Kissimmee': [28.2919, -81.4076],
  'Naperville': [41.7508, -88.1535], 'Aurora': [41.7606, -88.3201],
  'Monte Vista': [37.5794, -106.1494], 'Pueblo': [38.2544, -104.6091],
  'Burlington': [44.4759, -73.2121], 'Montpelier': [44.2601, -72.5754],
  'Hamilton': [43.2557, -79.8711], 'Mississauga': [43.5890, -79.6441],
  'Brampton': [43.7315, -79.7624], 'Scarborough': [43.7731, -79.2578],
  'Ottawa': [45.4215, -75.6972], 'Calgary': [51.0447, -114.0719],
  'Edmonton': [53.5461, -113.4938], 'Winnipeg': [49.8951, -97.1384],
  'New York City': [40.7128, -74.0060], 'Harlem': [40.8116, -73.9465],
  'Yonkers': [40.9312, -73.8988], 'Mount Vernon': [40.9126, -73.8371],
  'Warsaw': [52.2297, 21.0122], 'Krakow': [50.0647, 19.9450],
  'Gdansk': [54.3520, 18.6466], 'Wroclaw': [51.1079, 17.0385],
  'Santo Domingo': [18.4861, -69.9312], 'Santiago': [19.4517, -70.6970],
  'Riyadh': [24.6877, 46.7219], 'Jeddah': [21.4858, 39.1925],
  'Dammam': [26.3927, 49.9777], 'Mecca': [21.3891, 39.8579],
  'Kumasi': [6.6885, -1.6244],
  'Port-au-Prince': [18.5944, -72.3074],
  'Montego Bay': [18.4762, -77.8939],
  'Georgetown': [6.8013, -58.1551], 'Paramaribo': [5.8520, -55.2038],
  'Caracas': [10.4806, -66.9036], 'Bogota': [4.7110, -74.0721],
  'Lima': [-12.0464, -77.0428], 'Buenos Aires': [-34.6037, -58.3816],
  'Sao Paulo': [-23.5505, -46.6333], 'Rio de Janeiro': [-22.9068, -43.1729],
  'Mexico City': [19.4326, -99.1332], 'Guadalajara': [20.6597, -103.3496],
  'Havana': [23.1136, -82.3666], 'San Salvador': [13.6929, -89.2182],
  'Guatemala City': [14.6349, -90.5069], 'Panama City': [8.9936, -79.5197],
  'Cape Verde': [16.5388, -23.0418], 'Luanda': [-8.8368, 13.2343],
  'Kinshasa': [-4.4419, 15.2663], 'Abidjan': [5.3600, -4.0083],
  'Dakar': [14.7167, -17.4677], 'Addis Ababa': [9.0192, 38.7525],
  'Dar es Salaam': [-6.7924, 39.2083],
  'Bristol': [51.4545, -2.5879],
  'Frankfurt': [50.1109, 8.6821], 'Munich': [48.1351, 11.5820],
  'Hamburg': [53.5753, 10.0153], 'Cologne': [50.9333, 6.9500],
  'Rome': [41.9028, 12.4964], 'Milan': [45.4654, 9.1859],
  'Stockholm': [59.3293, 18.0686], 'Oslo': [59.9139, 10.7522],
  'Copenhagen': [55.6761, 12.5683], 'Helsinki': [60.1699, 24.9384],
  'Zurich': [47.3769, 8.5417], 'Vienna': [48.2082, 16.3738],
  'Brussels': [50.8503, 4.3517], 'Lisbon': [38.7169, -9.1395],
  'Athens': [37.9838, 23.7275], 'Istanbul': [41.0082, 28.9784],
  'Cairo': [30.0444, 31.2357], 'Casablanca': [33.5731, -7.5898],
  'Tunis': [36.8065, 10.1815], 'Algiers': [36.7372, 3.0865],
  'Kampala': [0.3476, 32.5825], 'Kigali': [-1.9441, 30.0619],
  'Lusaka': [-15.3875, 28.3228], 'Harare': [-17.8252, 31.0335],
  'Maputo': [-25.9692, 32.5732], 'Bangkok': [13.7563, 100.5018],
  'Kuala Lumpur': [3.1390, 101.6869], 'Jakarta': [-6.2088, 106.8456],
  'Manila': [14.5995, 120.9842], 'Taipei': [25.0330, 121.5654],
  'Shanghai': [31.2304, 121.4737], 'Beijing': [39.9042, 116.4074],
  'Guangzhou': [23.1291, 113.2644], 'Hong Kong': [22.3193, 114.1694],
  'Shenzhen': [22.5431, 114.0579], 'Auckland': [-36.8509, 174.7645],
  'Wellington': [-41.2866, 174.7756], 'Christchurch': [-43.5321, 172.6362],
};

// Country-level fallback — used when city is Unknown but country is known
const COUNTRY_COORDS: Record<string, [number, number]> = {
  'United States': [37.0902, -95.7129],
  'Canada': [56.1304, -106.3468],
  'United Kingdom': [55.3781, -3.4360],
  'Poland': [51.9194, 19.1451],
  'Dominican Republic': [18.7357, -70.1627],
  'Saudi Arabia': [23.8859, 45.0792],
  'Jamaica': [18.1096, -77.2975],
  'Trinidad and Tobago': [10.6918, -61.2225],
  'Barbados': [13.1939, -59.5432],
  'Bahamas': [25.0343, -77.3963],
  'Nigeria': [9.0820, 8.6753],
  'Ghana': [7.9465, -1.0232],
  'Kenya': [-0.0236, 37.9062],
  'South Africa': [-30.5595, 22.9375],
  'Brazil': [-14.2350, -51.9253],
  'Colombia': [4.5709, -74.2973],
  'Mexico': [23.6345, -102.5528],
  'Puerto Rico': [18.2208, -66.5901],
  'Haiti': [18.9712, -72.2852],
  'Cuba': [21.5218, -77.7812],
  'Australia': [-25.2744, 133.7751],
  'New Zealand': [-40.9006, 174.8860],
  'Japan': [36.2048, 138.2529],
  'South Korea': [35.9078, 127.7669],
  'China': [35.8617, 104.1954],
  'India': [20.5937, 78.9629],
  'Singapore': [1.3521, 103.8198],
  'Malaysia': [4.2105, 101.9758],
  'Indonesia': [-0.7893, 113.9213],
  'Philippines': [12.8797, 121.7740],
  'France': [46.2276, 2.2137],
  'Germany': [51.1657, 10.4515],
  'Netherlands': [52.1326, 5.2913],
  'Spain': [40.4637, -3.7492],
  'Italy': [41.8719, 12.5674],
  'Ireland': [53.1424, -7.6921],
  'Sweden': [60.1282, 18.6435],
  'Norway': [60.4720, 8.4689],
  'Denmark': [56.2639, 9.5018],
  'Finland': [61.9241, 25.7482],
  'Belgium': [50.5039, 4.4699],
  'Switzerland': [46.8182, 8.2275],
  'Austria': [47.5162, 14.5501],
  'Portugal': [39.3999, -8.2245],
  'Greece': [39.0742, 21.8243],
  'Turkey': [38.9637, 35.2433],
  'Russia': [61.5240, 105.3188],
  'Ukraine': [48.3794, 31.1656],
  'United Arab Emirates': [23.4241, 53.8478],
  'Kuwait': [29.3117, 47.4818],
  'Qatar': [25.3548, 51.1839],
  'Bahrain': [26.0275, 50.5500],
  'Egypt': [26.8206, 30.8025],
  'Morocco': [31.7917, -7.0926],
  'Ethiopia': [9.1450, 40.4897],
  'Tanzania': [-6.3690, 34.8888],
  'Uganda': [1.3733, 32.2903],
  'Ivory Coast': [7.5400, -5.5471],
  'Senegal': [14.4974, -14.4524],
  'Angola': [-11.2027, 17.8739],
};

function cityToCoords(city: string, country?: string): [number, number] | null {
  return CITY_COORDS[city] ?? (country ? (COUNTRY_COORDS[country] ?? null) : null);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TopSongPick {
  id: string;
  rank: number;
  title: string;
  artist: string;
  thumbnail: string;
  coverArtUrl?: string | null;
  source: 'youtube' | 'soundcloud';
  soundcloudUrl?: string;
  addedAt: string;
}

interface VisitorEntry {
  guestId: string;
  city: string;
  country: string;
  lat?: number | null;
  lon?: number | null;
  lastSeen: string;
}

interface ListenerData {
  totalActive: number;
  cities: { city: string; country: string; count: number }[];
  listeners: (VisitorEntry & { currentTrack: string })[];
  allVisitors?: VisitorEntry[];
}

// ─── Global Reach tab — just the animated world map ──────────────────────────
function GlobalReachTab({
  listenerData,
  visitorMap,
}: {
  listenerData: ListenerData | null;
  visitorMap: MapDot[];
}) {
  const activeDots = useMemo<MapDot[]>(() => {
    if (!listenerData) return [];
    return listenerData.listeners
      .filter(l => l.lat != null && l.lon != null)
      .map(l => ({ lat: l.lat!, lon: l.lon!, city: l.city, country: l.country }));
  }, [listenerData]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col h-full"
    >
      <WorldHeatMap visitors={visitorMap} active={activeDots} showMetrics={false} />
    </motion.div>
  );
}

// ─── Top Songs tab — editorial picks list ─────────────────────────────────────
function TopSongsTab({
  topSongs,
  onPlay,
}: {
  topSongs: TopSongPick[];
  onPlay: (pick: TopSongPick) => void;
}) {
  if (topSongs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-3">
        <Star className="w-8 h-8 text-[#2a1850]" />
        <p className="text-[#5B4F70] text-sm text-center">No picks yet. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {topSongs.map((pick, i) => (
        <motion.div
          key={pick.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.03 }}
          className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer group transition-all"
          style={{ border: '1px solid transparent' }}
          whileHover={{ backgroundColor: 'rgba(140,50,255,0.10)' }}
          onClick={() => onPlay(pick)}
        >
          {/* Rank badge */}
          <div className="flex-shrink-0 flex items-center justify-center">
            {i < 3 ? (
              <FireRankNumber rank={(i + 1) as 1 | 2 | 3} />
            ) : (
              <span style={{ width: 50, textAlign: 'center', fontSize: 11, fontWeight: 900, color: '#2d2848', fontFamily: 'system-ui, sans-serif' }}>
                #{pick.rank}
              </span>
            )}
          </div>

          {/* Thumbnail */}
          <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[#0d001e]">
            <img
              src="/jc-club-logo-gradient.png"
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* Title + artist */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate group-hover:text-[#FFD700] transition-colors leading-tight">
              {pick.title}
            </p>
            <p className="text-[11px] text-[#9d96b8] font-medium truncate mt-0.5">
              {formatArtistName(pick.artist)}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function MostPlayed() {
  const { playTrack, tracks } = usePlayer();
  const [topSongs, setTopSongs] = useState<TopSongPick[]>([]);
  const [listenerData, setListenerData] = useState<ListenerData | null>(null);
  const [visitorMap, setVisitorMap] = useState<MapDot[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'picks' | 'map'>('picks');

  const fetchData = useCallback(async () => {
    try {
      const [topSongsRes, listRes, visitorMapRes, visitsMapRes] = await Promise.all([
        fetch(`${BASE}/top-songs`, { headers: HEADERS }).catch(() => null),
        fetch(`${BASE}/plays/listeners`, { headers: HEADERS }).catch(() => null),
        fetch(`${BASE}/plays/visitor-map`, { headers: HEADERS }).catch(() => null),
        fetch(`${BASE}/visits/map`, { headers: HEADERS }).catch(() => null),
      ]);

      const [topSongsJson, listenerJson, visitorMapJson, visitsMapJson] = await Promise.all([
        topSongsRes?.ok ? topSongsRes.json().catch(() => null) : Promise.resolve(null),
        listRes?.ok ? listRes.json().catch(() => null) : Promise.resolve(null),
        visitorMapRes?.ok ? visitorMapRes.json().catch(() => null) : Promise.resolve(null),
        visitsMapRes?.ok ? visitsMapRes.json().catch(() => null) : Promise.resolve(null),
      ]);

      if (Array.isArray(topSongsJson)) setTopSongs(topSongsJson);

      let listenerDataLocal: ListenerData | null = null;
      if (listenerJson && typeof listenerJson === 'object') {
        listenerDataLocal = listenerJson;
        setListenerData(listenerJson);
      }

      // ── Build the dot map: merge every visitor from every source ──────────
      const dotMap = new Map<string, MapDot>();

      function addDot(lat: number, lon: number, city?: string, country?: string, visits?: number) {
        const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
        const existing = dotMap.get(key);
        if (existing) {
          existing.visits = (existing.visits || 1) + (visits || 1);
          return;
        }
        dotMap.set(key, { lat, lon, city, country, visits: visits || 1 });
      }

      // Source A: /visits/map — all-time site visitors with visit counts
      const visitsMapDots = Array.isArray(visitsMapJson) ? visitsMapJson : (visitsMapJson?.dots || []);
      visitsMapDots.forEach((d: any) => {
        if (d.lat != null && d.lon != null) addDot(d.lat, d.lon, d.city, d.country, d.visits);
      });

      // Source B: /plays/visitor-map — all-time play-based dots
      if (Array.isArray(visitorMapJson)) {
        visitorMapJson.forEach((d: any) => {
          if (d.lat != null && d.lon != null) addDot(d.lat, d.lon, d.city, d.country, d.visits);
        });
      }

      // Source C: /plays/listeners → allVisitors (all-time) or listeners (30-min fallback)
      if (listenerDataLocal) {
        const allTime = listenerDataLocal.allVisitors ?? listenerDataLocal.listeners;
        allTime.forEach(l => {
          if (l.lat != null && l.lon != null) {
            addDot(l.lat, l.lon, l.city, l.country);
          } else {
            const coords = cityToCoords(l.city, l.country);
            if (coords) addDot(coords[0], coords[1], l.city, l.country);
          }
        });
        listenerDataLocal.cities.forEach(c => {
          const coords = cityToCoords(c.city, c.country);
          if (coords) addDot(coords[0], coords[1], c.city, c.country, c.count);
        });
      }

      setVisitorMap([...dotMap.values()]);
    } catch (e) {
      console.log('MostPlayed fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const pollId = setInterval(fetchData, 120_000);

    // Realtime: refresh immediately when any KV store row changes
    const channel = supabase
      .channel('kv-store-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kv_store_715f71b9' }, () => fetchData())
      .subscribe();

    return () => {
      clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const handlePlayTopSong = useCallback((pick: TopSongPick) => {
    // First try to find exact match in loaded tracks
    let existing = tracks.find(t => t.id.videoId === pick.id);
    if (!existing) {
      // Fuzzy match on title + artist
      const hay = `${pick.title} ${pick.artist}`.toLowerCase();
      existing = tracks.find(t => {
        const tHay = `${t.snippet.title} ${t.snippet.channelTitle}`.toLowerCase();
        return (
          hay.split(/\s+/).filter(w => w.length > 3).every(w => tHay.includes(w)) ||
          tHay.split(/\s+/).filter(w => w.length > 3).every(w => hay.includes(w))
        );
      });
    }
    if (existing) {
      playTrack(existing, tracks);
    } else {
      // Construct a Track object from stored pick data
      const fakeTrack: Track = {
        id: { videoId: pick.id },
        snippet: {
          title: pick.title,
          channelTitle: pick.artist,
          description: '',
          publishedAt: pick.addedAt,
          thumbnails: {
            default: { url: pick.thumbnail },
            medium: { url: pick.thumbnail },
            high: { url: pick.thumbnail },
          },
        },
        source: pick.source,
        soundcloudUrl: pick.soundcloudUrl,
      };
      playTrack(fakeTrack);
    }
  }, [playTrack, tracks]);

  return (
    <div
      className="rounded-2xl overflow-hidden h-full flex flex-col"
      style={{ background: '#0A0716', border: '1px solid rgba(110,50,190,0.14)' }}
    >
      {/* Tab headers */}
      <div className="flex border-b border-[#1a0040]">
        <button
          onClick={() => setTab('picks')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold transition-all ${tab === 'picks' ? 'text-[#FFD700]' : 'text-[#4A3460] hover:text-white'
            }`}
          style={
            tab === 'picks'
              ? { background: 'linear-gradient(to bottom, rgba(255,215,0,0.08), transparent)', borderBottom: '2px solid #FFD700' }
              : { borderBottom: '2px solid transparent' }
          }
        >
          <GoldVinylRecord is24k={true} size={16} spinning={tab === 'picks'} />
          TOP SONGS
        </button>
        <button
          onClick={() => setTab('map')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold transition-all ${tab === 'map' ? 'text-[#00FF88]' : 'text-[#4A3460] hover:text-white'
            }`}
          style={
            tab === 'map'
              ? { background: 'linear-gradient(to bottom, rgba(0,255,136,0.08), transparent)', borderBottom: '2px solid #00FF88' }
              : { borderBottom: '2px solid transparent' }
          }
        >
          <Globe className="w-3.5 h-3.5" />
          GLOBAL REACH
          {listenerData && listenerData.totalActive > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-[#00FF88] text-black">
              {listenerData.totalActive}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-[#9D00FF] animate-spin" />
          </div>
        ) : tab === 'picks' ? (
          <TopSongsTab topSongs={topSongs} onPlay={handlePlayTopSong} />
        ) : (
          <GlobalReachTab listenerData={listenerData} visitorMap={visitorMap} />
        )}
      </div>
    </div>
  );
}
