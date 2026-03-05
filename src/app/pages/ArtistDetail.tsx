import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'motion/react';
import { useParams, useNavigate } from 'react-router';
import { Loader2, Crown, Zap, Sparkles, ArrowLeft, Play, Pause, Music } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { formatTrackTitle } from '../utils/formatTrackTitle';
import { usePlayer, Track } from '../context/PlayerContext';
import { useCrateSafe } from '../context/CrateContext';
import { GoldVinylRecord } from '../components/GoldVinylRecord';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-715f71b9`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface ArtistTrack {
    videoId: string;
    title: string;
    channelTitle: string;
    thumbnail: string;
    source: 'youtube' | 'soundcloud';
    soundcloudUrl?: string;
    coverArtUrl?: string | null;
}

interface ArtistDetailData {
    slug: string;
    name: string;
    role: string;
    bio: string;
    photoUrl: string | null;
    badge: 'pioneer' | 'legend' | 'rising' | null;
    socials: Record<string, string>;
    tracks: ArtistTrack[];
}

const BADGE_CONFIG: Record<string, { label: string; icon: any; color: string; glow: string; bg: string }> = {
    pioneer: { label: 'PIONEER', icon: Crown, color: '#FFD700', glow: 'rgba(255,215,0,0.35)', bg: 'rgba(255,215,0,0.12)' },
    legend: { label: 'LEGEND', icon: Zap, color: '#9D00FF', glow: 'rgba(157,0,255,0.35)', bg: 'rgba(157,0,255,0.12)' },
    rising: { label: 'RISING', icon: Sparkles, color: '#00FF88', glow: 'rgba(0,255,136,0.35)', bg: 'rgba(0,255,136,0.12)' },
};

// ─── Social Icons (inline SVGs) ───────────────────────────────────────────────
function InstagramIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
    );
}

function TwitterIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

function SoundCloudIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 18V11l.5-1 .5 1v7zm3 0V8.5l.5-1 .5 1V18zm3 0V6l.5-1.5L8 6v12zm3 0V4l.5-2 .5 2v14zm3.5 0c2.5 0 4.5-2 4.5-4.5S16 9 13.5 9H13V18z" />
        </svg>
    );
}

function SpotifyIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
    );
}

function YouTubeIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
    );
}

function TikTokIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.28 8.28 0 0 0 4.83 1.55V6.87a4.85 4.85 0 0 1-1.07-.18z" />
        </svg>
    );
}

function PatreonIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.957 7.21c-.004-3.064-2.391-5.576-5.191-6.482-3.478-1.125-8.064-.962-11.384.604C2.357 3.13 1.08 7.255 1.042 11.458c-.046 5.061 1.488 11.536 7.216 12.38 5.767.85 8.163-4.707 9.872-9.13 1.107-2.868 4.84-5.064 4.827-7.498zM5.568 21.057c-2.454.01-4.524-1.89-4.524-4.526V4.492c.005-2.58 1.996-4.492 4.407-4.492h.117c2.51-.01 4.5 1.94 4.5 4.542v12.012c0 2.457-1.921 4.482-4.417 4.5l-.083.003z" />
        </svg>
    );
}

const SOCIAL_ICONS: Record<string, React.FC> = {
    instagram: InstagramIcon,
    twitter: TwitterIcon,
    soundcloud: SoundCloudIcon,
    spotify: SpotifyIcon,
    youtube: YouTubeIcon,
    tiktok: TikTokIcon,
    patreon: PatreonIcon,
};

const SOCIAL_URLS: Record<string, (handle: string) => string> = {
    instagram: (h) => `https://instagram.com/${h.replace('@', '')}`,
    twitter: (h) => `https://x.com/${h.replace('@', '')}`,
    soundcloud: (h) => h.startsWith('http') ? h : `https://soundcloud.com/${h}`,
    spotify: (h) => h.startsWith('http') ? h : `https://open.spotify.com/artist/${h}`,
    youtube: (h) => h.startsWith('http') ? h : `https://youtube.com/${h}`,
    tiktok: (h) => `https://tiktok.com/${h.startsWith('@') ? h : '@' + h}`,
    patreon: (h) => h.startsWith('http') ? h : `https://patreon.com/${h}`,
};

const SOCIAL_LABELS: Record<string, string> = {
    instagram: 'Instagram',
    twitter: 'X / Twitter',
    soundcloud: 'SoundCloud',
    spotify: 'Spotify',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    patreon: 'Patreon',
};

// ─── Artist Detail Page ───────────────────────────────────────────────────────
export function ArtistDetail() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [artist, setArtist] = useState<ArtistDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    // Player & Crate Contexts
    const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
    const crateCtx = useCrateSafe();
    const addToCrate = crateCtx?.addToCrate;
    const removeFromCrate = crateCtx?.removeFromCrate;
    const isInCrate = crateCtx?.isInCrate ?? (() => false);
    const addingIds = crateCtx?.addingIds ?? new Set<string>();
    const is24k = crateCtx?.is24k ?? false;
    const openPaywall = crateCtx?.openPaywall ?? (() => { });
    const isGuestAtLimit = crateCtx?.isGuestAtLimit ?? false;

    useEffect(() => {
        if (!slug) return;
        fetch(`${BASE}/artists/${slug}`, { headers: { Authorization: `Bearer ${publicAnonKey}` } })
            .then(r => {
                if (!r.ok) { setNotFound(true); setLoading(false); return null; }
                return r.json();
            })
            .then(data => {
                if (data) setArtist(data);
                setLoading(false);
            })
            .catch(() => { setNotFound(true); setLoading(false); });
    }, [slug]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-6 h-6 text-[#9D00FF] animate-spin" />
            </div>
        );
    }

    if (notFound || !artist) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4 px-4">
                <Music className="w-12 h-12 text-[#1E1438]" />
                <p className="text-[#5B4F70] text-sm">Artist not found</p>
                <button
                    onClick={() => navigate('/artists')}
                    className="text-[#9D7FFF] text-xs hover:text-white transition-colors flex items-center gap-1"
                >
                    <ArrowLeft className="w-3 h-3" /> Back to roster
                </button>
            </div>
        );
    }

    const badge = artist.badge ? BADGE_CONFIG[artist.badge] : null;
    const socials = Object.entries(artist.socials || {}).filter(([, v]) => v);

    return (
        <div className="flex flex-col gap-6 px-4 py-6 pb-32 max-w-3xl mx-auto">
            {/* Back button */}
            <motion.button
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => navigate('/artists')}
                className="flex items-center gap-1.5 text-[#5B4F70] hover:text-white transition-colors text-xs self-start"
            >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="font-bold tracking-wider uppercase">Back to Roster</span>
            </motion.button>

            {/* Hero section */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative rounded-2xl overflow-hidden"
                style={{
                    background: 'rgba(10, 7, 22, 0.85)',
                    border: `1px solid ${badge ? `${badge.color}40` : 'rgba(110,50,190,0.15)'}`,
                    boxShadow: badge ? `0 0 40px ${badge.glow}` : '0 4px 40px rgba(0,0,0,0.4)',
                }}
            >
                <div className="flex flex-col md:flex-row">
                    {/* Photo */}
                    <div className="relative w-full md:w-[280px] aspect-square md:aspect-auto flex-shrink-0">
                        {artist.photoUrl ? (
                            <img
                                src={artist.photoUrl}
                                alt={artist.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center min-h-[280px]"
                                style={{ background: 'linear-gradient(135deg, #0A0716, #1A0A30)' }}
                            >
                                <span className="text-7xl font-black text-[#1E1438] select-none">
                                    {artist.name.charAt(0)}
                                </span>
                            </div>
                        )}

                        {/* Photo gradient overlay */}
                        <div
                            className="absolute inset-0 pointer-events-none md:hidden"
                            style={{
                                background: 'linear-gradient(to top, rgba(10,7,22,1) 0%, transparent 50%)',
                            }}
                        />
                        <div
                            className="absolute inset-0 pointer-events-none hidden md:block"
                            style={{
                                background: 'linear-gradient(to right, transparent 50%, rgba(10,7,22,1) 100%)',
                            }}
                        />
                    </div>

                    {/* Info */}
                    <div className="relative flex-1 p-6 flex flex-col gap-4 -mt-12 md:mt-0">
                        {/* Badge */}
                        {badge && (
                            <motion.div
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full self-start"
                                style={{
                                    background: badge.bg,
                                    border: `1px solid ${badge.color}40`,
                                    boxShadow: `0 0 16px ${badge.glow}`,
                                }}
                                animate={{ boxShadow: [`0 0 16px ${badge.glow}`, `0 0 28px ${badge.glow}`, `0 0 16px ${badge.glow}`] }}
                                transition={{ repeat: Infinity, duration: 2.5 }}
                            >
                                <badge.icon className="w-3.5 h-3.5" style={{ color: badge.color }} />
                                <span className="text-[9px] font-black tracking-[0.2em]" style={{ color: badge.color }}>
                                    {badge.label}
                                </span>
                            </motion.div>
                        )}

                        {/* Name & role */}
                        <div>
                            <h1 className="text-white font-black text-2xl md:text-3xl tracking-tight">
                                {artist.name}
                            </h1>
                            <p className="text-[11px] text-[#5B4F70] font-bold tracking-widest uppercase mt-1">
                                {artist.role}
                            </p>
                        </div>

                        {/* Bio */}
                        {artist.bio && (
                            <p className="text-[#8B7FA0] text-sm leading-relaxed">
                                {artist.bio}
                            </p>
                        )}

                        {/* Social links */}
                        {socials.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {socials.map(([platform, handle]) => {
                                    const Icon = SOCIAL_ICONS[platform];
                                    const getUrl = SOCIAL_URLS[platform];
                                    const label = SOCIAL_LABELS[platform] || platform;
                                    if (!Icon || !getUrl || !handle) return null;
                                    return (
                                        <a
                                            key={platform}
                                            href={getUrl(handle)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-300 hover:scale-[1.03]"
                                            style={{
                                                background: 'rgba(255,255,255,0.04)',
                                                border: '1px solid rgba(110,50,190,0.15)',
                                                color: '#5B4F70',
                                            }}
                                            onMouseEnter={e => {
                                                (e.currentTarget as HTMLElement).style.color = '#9D7FFF';
                                                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(157,0,255,0.4)';
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget as HTMLElement).style.color = '#5B4F70';
                                                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(110,50,190,0.15)';
                                            }}
                                        >
                                            <Icon />
                                            {label}
                                        </a>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Tracks by this artist */}
            {artist.tracks && artist.tracks.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                >
                    <h2 className="text-xs font-black text-[#9D7FFF] tracking-widest uppercase mb-4 flex items-center gap-2">
                        <Music className="w-3.5 h-3.5" />
                        Tracks on the Station ({artist.tracks.length})
                    </h2>

                    <div className="flex flex-col gap-2">
                        {artist.tracks.map((track, i) => {
                            const trackAsPlayable: Track = {
                                id: { videoId: track.videoId },
                                snippet: { title: track.title, channelTitle: track.channelTitle, publishedAt: '', description: '', thumbnails: { default: { url: track.thumbnail }, medium: { url: track.thumbnail }, high: { url: track.thumbnail } } },
                                source: track.source,
                                soundcloudUrl: track.soundcloudUrl,
                                coverArtUrl: track.coverArtUrl || track.thumbnail,
                            };

                            const isActive = currentTrack?.id.videoId === track.videoId;
                            const inCrate = isInCrate(track.videoId);
                            const isAdding = addingIds.has(track.videoId);

                            const handlePlay = (e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (isActive) {
                                    togglePlay();
                                } else {
                                    const playableList = artist.tracks.map(t => ({
                                        id: { videoId: t.videoId },
                                        snippet: { title: t.title, channelTitle: t.channelTitle, publishedAt: '', description: '', thumbnails: { default: { url: t.thumbnail }, medium: { url: t.thumbnail }, high: { url: t.thumbnail } } },
                                        source: t.source,
                                        soundcloudUrl: t.soundcloudUrl,
                                        coverArtUrl: t.coverArtUrl || t.thumbnail,
                                    }));
                                    playTrack(trackAsPlayable, playableList);
                                }
                            };

                            const handleCrate = (e: React.MouseEvent) => {
                                e.stopPropagation();
                                if (inCrate) {
                                    removeFromCrate?.(track.videoId);
                                } else if (!is24k && isGuestAtLimit) {
                                    openPaywall();
                                } else {
                                    addToCrate?.(trackAsPlayable);
                                }
                            };

                            return (
                                <motion.div
                                    key={track.videoId}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.04 }}
                                    onClick={handlePlay}
                                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-all duration-300 group cursor-pointer ${isActive ? 'bg-[#1a003a] border-[#9D00FF]/60' : ''}`}
                                    style={{
                                        background: isActive ? '#1a003a' : 'rgba(10, 7, 22, 0.6)',
                                        border: `1px solid ${isActive ? 'rgba(157,0,255,0.6)' : 'rgba(110,50,190,0.08)'}`,
                                    }}
                                    onMouseEnter={e => {
                                        if (!isActive) {
                                            (e.currentTarget as HTMLElement).style.background = 'rgba(10, 7, 22, 0.9)';
                                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(157,0,255,0.2)';
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (!isActive) {
                                            (e.currentTarget as HTMLElement).style.background = 'rgba(10, 7, 22, 0.6)';
                                            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(110,50,190,0.08)';
                                        }
                                    }}
                                >
                                    {/* Track art */}
                                    <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                                        <img
                                            src="/jc-club-logo-white.png"
                                            alt=""
                                            className="w-full h-full object-contain p-1.5"
                                            loading="lazy"
                                        />
                                        <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            {isActive && isPlaying ? (
                                                <Pause className="w-4 h-4 text-white" fill="white" />
                                            ) : (
                                                <Play className="w-4 h-4 text-white" fill="white" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Track info */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-bold truncate ${isActive ? 'text-[#9D00FF]' : 'text-white'}`}>
                                            {formatTrackTitle(track.title, track.channelTitle)}
                                        </p>
                                    </div>

                                    {/* Crate button */}
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
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
