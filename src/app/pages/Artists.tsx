import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Crown, Zap, Sparkles, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-715f71b9`;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ArtistProfile {
    slug: string;
    name: string;
    role: string;
    bio: string;
    photoUrl: string | null;
    badge: 'pioneer' | 'legend' | 'rising' | null;
    socials: {
        instagram?: string;
        twitter?: string;
        soundcloud?: string;
        spotify?: string;
        youtube?: string;
        tiktok?: string;
    };
    trackMatches: string[];
    order: number;
    visible: boolean;
}

// ─── Badge Config ─────────────────────────────────────────────────────────────
const BADGE_CONFIG = {
    pioneer: {
        label: 'PIONEER',
        icon: Crown,
        color: '#FFD700',
        glow: 'rgba(255,215,0,0.35)',
        bg: 'rgba(255,215,0,0.12)',
        borderColor: 'rgba(255,215,0,0.4)',
    },
    legend: {
        label: 'LEGEND',
        icon: Zap,
        color: '#9D00FF',
        glow: 'rgba(157,0,255,0.35)',
        bg: 'rgba(157,0,255,0.12)',
        borderColor: 'rgba(157,0,255,0.4)',
    },
    rising: {
        label: 'RISING',
        icon: Sparkles,
        color: '#00FF88',
        glow: 'rgba(0,255,136,0.35)',
        bg: 'rgba(0,255,136,0.12)',
        borderColor: 'rgba(0,255,136,0.4)',
    },
};

// ─── Social Icons ─────────────────────────────────────────────────────────────
function InstagramIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
    );
}

function TwitterIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

function SoundCloudIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M1 18V11l.5-1 .5 1v7zm3 0V8.5l.5-1 .5 1V18zm3 0V6l.5-1.5L8 6v12zm3 0V4l.5-2 .5 2v14zm3.5 0c2.5 0 4.5-2 4.5-4.5S16 9 13.5 9H13V18z" />
        </svg>
    );
}

function SpotifyIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
    );
}

function YouTubeIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
    );
}

function TikTokIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.28 8.28 0 0 0 4.83 1.55V6.87a4.85 4.85 0 0 1-1.07-.18z" />
        </svg>
    );
}

function PatreonIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
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

// ─── Artist Card ──────────────────────────────────────────────────────────────
function ArtistCard({ artist, index }: { artist: ArtistProfile; index: number }) {
    const navigate = useNavigate();
    const badge = artist.badge ? BADGE_CONFIG[artist.badge] : null;
    const socials = Object.entries(artist.socials || {}).filter(([, v]) => v);

    return (
        <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => navigate(`/artists/${artist.slug}`)}
            className="group relative cursor-pointer"
            style={{ perspective: '800px' }}
        >
            <div
                className="relative rounded-2xl overflow-hidden transition-all duration-500 group-hover:-translate-y-1"
                style={{
                    background: 'rgba(10, 7, 22, 0.85)',
                    border: `1px solid ${badge ? badge.borderColor : 'rgba(110, 50, 190, 0.15)'}`,
                    boxShadow: badge
                        ? `0 0 24px ${badge.glow}, inset 0 1px 0 rgba(255,255,255,0.03)`
                        : '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
                }}
            >
                {/* Photo */}
                <div className="relative aspect-[3/4] overflow-hidden">
                    {artist.photoUrl ? (
                        <img
                            src={artist.photoUrl}
                            alt={artist.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center"
                            style={{ background: 'linear-gradient(135deg, #0A0716, #1A0A30)' }}
                        >
                            <span className="text-4xl font-black text-[#1E1438] select-none">
                                {artist.name.charAt(0)}
                            </span>
                        </div>
                    )}

                    {/* Gradient overlay */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: 'linear-gradient(to top, rgba(4,0,15,0.95) 0%, rgba(4,0,15,0.4) 40%, transparent 70%)',
                        }}
                    />

                    {/* Badge */}
                    {badge && (
                        <motion.div
                            className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-1 rounded-full"
                            style={{
                                background: badge.bg,
                                border: `1px solid ${badge.borderColor}`,
                                boxShadow: `0 0 12px ${badge.glow}`,
                            }}
                            animate={{ boxShadow: [`0 0 12px ${badge.glow}`, `0 0 24px ${badge.glow}`, `0 0 12px ${badge.glow}`] }}
                            transition={{ repeat: Infinity, duration: 2.5 }}
                        >
                            <badge.icon className="w-2.5 h-2.5" style={{ color: badge.color }} />
                            <span className="text-[7px] font-black tracking-[0.2em]" style={{ color: badge.color }}>
                                {badge.label}
                            </span>
                        </motion.div>
                    )}
                </div>

                {/* Info */}
                <div className="relative p-2.5 -mt-6 z-10">
                    <h3 className="text-white font-black text-[10px] tracking-wider uppercase mb-0.5 truncate">
                        {artist.name}
                    </h3>
                    <p className="text-[10px] text-[#5B4F70] font-bold tracking-widest uppercase mb-3">
                        {artist.role}
                    </p>

                    {/* Social icons row */}
                    {socials.length > 0 && (
                        <div className="flex items-center gap-1">
                            {socials.map(([platform, handle]) => {
                                const Icon = SOCIAL_ICONS[platform];
                                const getUrl = SOCIAL_URLS[platform];
                                if (!Icon || !getUrl || !handle) return null;
                                return (
                                    <a
                                        key={platform}
                                        href={getUrl(handle)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-[#3B2F50] hover:text-[#9D7FFF] transition-colors duration-300"
                                        title={platform}
                                    >
                                        <Icon />
                                    </a>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Hover glow edge */}
                <div
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                        boxShadow: badge
                            ? `inset 0 0 40px ${badge.glow}`
                            : 'inset 0 0 40px rgba(157,0,255,0.08)',
                    }}
                />
            </div>
        </motion.div>
    );
}

// ─── Artists Roster Page ──────────────────────────────────────────────────────
export function Artists() {
    const [artists, setArtists] = useState<ArtistProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pioneer' | 'legend' | 'rising'>('all');

    useEffect(() => {
        fetch(`${BASE}/artists`, { headers: { Authorization: `Bearer ${publicAnonKey}` } })
            .then(r => r.ok ? r.json() : [])
            .then(data => {
                setArtists(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const filtered = filter === 'all' ? artists : artists.filter(a => a.badge === filter);

    const filterButtons: { key: typeof filter; label: string; color: string }[] = [
        { key: 'all', label: 'All Talent', color: '#9D7FFF' },
        { key: 'pioneer', label: 'Pioneers', color: '#FFD700' },
        { key: 'legend', label: 'Legends', color: '#9D00FF' },
        { key: 'rising', label: 'Rising', color: '#00FF88' },
    ];

    return (
        <div className="flex flex-col gap-6 px-4 py-6 pb-32">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4"
            >
                <div>
                    <h1 className="text-white font-black text-2xl tracking-tight">
                        THE ROSTER
                    </h1>
                    <p className="text-[11px] text-[#5B4F70] font-bold tracking-widest uppercase mt-1">
                        Jersey Club's finest — pioneers, legends & rising talent
                    </p>
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-1 p-1 rounded-xl w-fit"
                    style={{ background: '#0A0716', border: '1px solid rgba(80,30,140,0.2)' }}
                >
                    {filterButtons.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className="px-3 py-1.5 rounded-lg text-[9px] font-black tracking-widest uppercase transition-all"
                            style={{
                                background: filter === f.key ? `${f.color}15` : 'transparent',
                                color: filter === f.key ? f.color : '#3B2F50',
                                boxShadow: filter === f.key ? `0 0 10px ${f.color}20` : 'none',
                            }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-6 h-6 text-[#9D00FF] animate-spin" />
                </div>
            )}

            {/* Empty state */}
            {!loading && filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 gap-2">
                    <Sparkles className="w-8 h-8 text-[#1E1438]" />
                    <p className="text-[#3B2F50] text-sm">No artists to show yet</p>
                </div>
            )}

            {/* Artist grid */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={filter}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3"
                >
                    {filtered.map((artist, i) => (
                        <ArtistCard key={artist.slug} artist={artist} index={i} />
                    ))}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
