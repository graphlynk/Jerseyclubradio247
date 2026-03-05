import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';
import Cropper from 'react-easy-crop';
import {
    Plus, Trash2, Camera, Loader2, Save, Eye, EyeOff, Crown, Zap, Sparkles,
    ChevronDown, ChevronUp, GripVertical, Check, X, Users, Image as ImageIcon,
    Link2, Music
} from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-715f71b9`;
const supabase = createClient(`https://${projectId}.supabase.co`, publicAnonKey);

// ─── Design Direction Summary ──────────────────────────────────────────────
// Aesthetic: "Glass Dossier"
// DFII Score: 12
// Rationale: A premium, high-craft admin interface. Moving away from generic "AI UI" 
// bordered boxes, this uses deep translucency, structural typography, and 
// subtle neon blooming. It feels like a high-end control deck rather than a basic CMS.
// ─────────────────────────────────────────────────────────────────────────────

export interface ArtistProfile {
    id?: string; // Stable client-side ID to prevent re-mounts on edit
    slug: string;
    name: string;
    role: string;
    bio: string;
    photoUrl: string | null;
    badge: 'pioneer' | 'legend' | 'rising' | null;
    socials: Record<string, string>;
    trackMatches: string[];
    order: number;
    visible: boolean;
    createdAt: string;
    updatedAt: string;
}

function slugify(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const BADGE_OPTIONS: { value: ArtistProfile['badge']; label: string; icon: any; color: string }[] = [
    { value: null, label: 'Standard', icon: null, color: '#4B3F60' },
    { value: 'rising', label: 'Rising Star', icon: Sparkles, color: '#00FF88' },
    { value: 'legend', label: 'Club Legend', icon: Zap, color: '#9D00FF' },
    { value: 'pioneer', label: 'Pioneer', icon: Crown, color: '#FFD700' },
];

const SOCIAL_FIELDS = [
    { key: 'instagram', label: 'IG', placeholder: '@username' },
    { key: 'twitter', label: 'X', placeholder: '@username' },
    { key: 'tiktok', label: 'TT', placeholder: '@username' },
    { key: 'soundcloud', label: 'SC', placeholder: 'soundcloud.com/...' },
    { key: 'spotify', label: 'Spot', placeholder: 'Artist URL' },
    { key: 'youtube', label: 'YT', placeholder: 'Channel URL' },
    { key: 'patreon', label: 'Patreon', placeholder: 'patreon.com/...' },
];

// ─── Image Crop Utility ──────────────────────────────────────────────────────
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<File | null> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = 800;
    canvas.height = 800;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        800,
        800
    );

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
            else resolve(null);
        }, 'image/jpeg', 0.9);
    });
}

// ─── Premium Premium Input Component ────────
function PremiumInput({ value, onChange, placeholder, label, type = "text", multiline = false, maxLength }: any) {
    const [focused, setFocused] = useState(false);
    return (
        <div className="relative group">
            <label className="absolute -top-2 left-3 px-1 text-[8px] font-black tracking-widest uppercase text-[#8B7AA8] bg-[#0A0716] z-10 transition-colors" style={{ color: focused ? '#9D7FFF' : '#8B7AA8' }}>
                {label}
            </label>
            {multiline ? (
                <textarea
                    value={value}
                    onChange={onChange}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    className="w-full bg-[#04010A] text-xs text-white rounded-lg px-3 py-3 outline-none resize-none transition-all duration-300"
                    style={{
                        minHeight: 80,
                        border: `1px solid ${focused ? 'rgba(157,0,255,0.4)' : 'rgba(80,30,140,0.15)'}`,
                        boxShadow: focused ? 'inset 0 0 12px rgba(157,0,255,0.05), Math.max(0, 0) 0px 4px 12px rgba(0,0,0,0.5)' : 'inset 0 2px 8px rgba(0,0,0,0.4)',
                    }}
                />
            ) : (
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={placeholder}
                    className="w-full bg-[#04010A] text-xs text-white rounded-lg px-3 py-2.5 outline-none transition-all duration-300 h-10"
                    style={{
                        border: `1px solid ${focused ? 'rgba(157,0,255,0.4)' : 'rgba(80,30,140,0.15)'}`,
                        boxShadow: focused ? 'inset 0 0 12px rgba(157,0,255,0.05)' : 'inset 0 2px 8px rgba(0,0,0,0.4)',
                    }}
                />
            )}
        </div>
    );
}

// ─── Single Artist Editor Card ────────────────────────────────────────────────
function ArtistEditorCard({
    artist,
    index,
    onUpdate,
    onDelete,
    onMoveUp,
    onMoveDown,
    onInitiateCrop,
    uploadingPhoto,
    isFirst,
    isLast,
}: {
    artist: ArtistProfile;
    index: number;
    onUpdate: (index: number, updates: Partial<ArtistProfile>) => void;
    onDelete: (index: number) => void;
    onMoveUp: (index: number) => void;
    onMoveDown: (index: number) => void;
    onInitiateCrop: (slug: string, file: File) => void;
    uploadingPhoto: boolean;
    isFirst: boolean;
    isLast: boolean;
}) {
    const [expanded, setExpanded] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const badgeObj = BADGE_OPTIONS.find(b => b.value === artist.badge);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        onInitiateCrop(artist.slug, file);
        if (fileRef.current) fileRef.current.value = '';
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
            className="relative rounded-2xl overflow-hidden mb-3 transition-all duration-500 will-change-transform"
            style={{
                background: expanded ? 'rgba(10, 7, 22, 0.95)' : 'rgba(10, 7, 22, 0.6)',
                backdropFilter: 'blur(16px)',
                border: `1px solid ${expanded ? 'rgba(157,0,255,0.3)' : 'rgba(80,30,140,0.15)'}`,
                boxShadow: expanded ? '0 12px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)' : '0 4px 12px rgba(0,0,0,0.2)',
            }}
        >
            {/* ── Collapsed / Header Strip ── */}
            <div
                className="flex items-center gap-4 p-3 pr-4 cursor-pointer group"
                onClick={() => setExpanded(!expanded)}
            >
                {/* Reorder Anchors */}
                <div className="flex flex-col gap-1 flex-shrink-0 px-2">
                    <button onClick={e => { e.stopPropagation(); onMoveUp(index); }} disabled={isFirst} className="text-[#3B2F50] hover:text-white transition-colors disabled:opacity-20"><ChevronUp className="w-4 h-4" /></button>
                    <button onClick={e => { e.stopPropagation(); onMoveDown(index); }} disabled={isLast} className="text-[#3B2F50] hover:text-white transition-colors disabled:opacity-20"><ChevronDown className="w-4 h-4" /></button>
                </div>

                {/* Avatar */}
                <div className="relative w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}>
                    {artist.photoUrl ? (
                        <img src={artist.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-[#04010A] flex items-center justify-center text-[#2A1850]"><ImageIcon className="w-5 h-5" /></div>
                    )}
                    {!artist.visible && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                            <EyeOff className="w-4 h-4 text-[#FF2277]" />
                        </div>
                    )}
                </div>

                {/* Info & Identity */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-white font-black text-sm tracking-wider uppercase truncate">
                            {artist.name || 'Unnamed Artist'}
                        </h3>
                        {badgeObj && badgeObj.value && (
                            <span className="flex items-center gap-1 text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-sm" style={{ color: badgeObj.color, border: `1px solid ${badgeObj.color}40`, background: `${badgeObj.color}10` }}>
                                <badgeObj.icon className="w-2.5 h-2.5" />
                                {badgeObj.label}
                            </span>
                        )}
                    </div>
                    <p className="text-[#5B4F70] text-[10px] font-semibold tracking-widest uppercase truncate">{artist.role || 'No role specified'}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={e => { e.stopPropagation(); onUpdate(index, { visible: !artist.visible }); }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${artist.visible ? 'bg-[#150D26] text-[#9D7FFF] hover:bg-[#9D00FF] hover:text-white' : 'bg-[#FF2277]/10 text-[#FF2277] hover:bg-[#FF2277] hover:text-white'}`}
                        title={artist.visible ? 'Hide Profile' : 'Show Profile'}
                    >
                        {artist.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-300 ${expanded ? 'bg-[#9D00FF] border-[#9D00FF] text-white rotate-180' : 'border-[#3B2F50] text-[#5B4F70] group-hover:border-[#9D7FFF] group-hover:text-[#9D7FFF] bg-transparent'}`}>
                        <ChevronDown className="w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* ── Expanded Editor ── */}
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="p-5 pt-2 border-t border-[rgba(157,0,255,0.1)] flex flex-col gap-6">

                            {/* Top Row: Photo + Basics */}
                            <div className="flex flex-col md:flex-row gap-6">
                                {/* Photo Uploader */}
                                <div className="flex flex-col gap-2 w-full md:w-32 flex-shrink-0">
                                    <div
                                        className="relative w-full aspect-square rounded-xl overflow-hidden cursor-pointer group"
                                        style={{ background: '#04010A', border: '1px solid rgba(80,30,140,0.3)', boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5)' }}
                                        onClick={() => fileRef.current?.click()}
                                    >
                                        {artist.photoUrl ? (
                                            <img src={artist.photoUrl} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 group-hover:opacity-40" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-[#3B2F50] group-hover:text-[#9D7FFF] transition-colors">
                                                <Camera className="w-8 h-8 mb-2" />
                                            </div>
                                        )}

                                        <div className={`absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${uploadingPhoto ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                            {uploadingPhoto ? (
                                                <>
                                                    <Loader2 className="w-6 h-6 text-[#00FF88] animate-spin mb-2" />
                                                    <span className="text-[10px] text-[#00FF88] font-black tracking-widest uppercase">Uploading</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Camera className="w-6 h-6 text-white mb-2" />
                                                    <span className="text-[10px] text-white font-black tracking-widest uppercase">Change</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                                </div>

                                {/* Core Info */}
                                <div className="flex-1 flex flex-col gap-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <PremiumInput
                                            label="Stage Name" placeholder="e.g. DJ Sliink"
                                            value={artist.name}
                                            onChange={(e: any) => onUpdate(index, { name: e.target.value })}
                                        />
                                        <PremiumInput
                                            label="Role / Title" placeholder="e.g. Pioneer / Producer"
                                            value={artist.role}
                                            onChange={(e: any) => onUpdate(index, { role: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <PremiumInput
                                            label="URL Slug (Auto or Manual)" placeholder="dj-sliink"
                                            value={artist.slug}
                                            onChange={(e: any) => onUpdate(index, { slug: slugify(e.target.value) })}
                                        />

                                        {/* Badge Selection */}
                                        <div className="relative group">
                                            <label className="absolute -top-2 left-3 px-1 text-[8px] font-black tracking-widest uppercase text-[#8B7AA8] bg-[#0A0716] z-10">Status Badge</label>
                                            <div className="w-full bg-[#04010A] rounded-lg p-1 outline-none h-10 border border-[rgba(80,30,140,0.15)] flex items-center justify-between shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
                                                {BADGE_OPTIONS.map(opt => (
                                                    <button
                                                        key={opt.value ?? 'none'}
                                                        onClick={() => onUpdate(index, { badge: opt.value })}
                                                        className="flex-1 flex items-center justify-center h-full rounded-md text-[9px] font-black tracking-widest uppercase transition-all duration-300"
                                                        style={{
                                                            background: artist.badge === opt.value ? `${opt.color}15` : 'transparent',
                                                            color: artist.badge === opt.value ? opt.color : '#4B3F60',
                                                            border: `1px solid ${artist.badge === opt.value ? `${opt.color}40` : 'transparent'}`,
                                                        }}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bio */}
                            <PremiumInput
                                label="Biography (Max 500 chars)" placeholder="Tell the story of their impact on the culture..."
                                value={artist.bio}
                                onChange={(e: any) => onUpdate(index, { bio: e.target.value })}
                                multiline
                                maxLength={500}
                            />

                            {/* Socials & Tracks grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Socials */}
                                <div>
                                    <h4 className="text-[10px] font-black text-[#5B4F70] tracking-[0.2em] uppercase mb-3 flex items-center gap-2"><Link2 className="w-3.5 h-3.5" /> Connect Links</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {SOCIAL_FIELDS.map(f => (
                                            <PremiumInput
                                                key={f.key}
                                                label={f.label}
                                                placeholder={f.placeholder}
                                                value={(artist.socials as any)?.[f.key] || ''}
                                                onChange={(e: any) => onUpdate(index, { socials: { ...artist.socials, [f.key]: e.target.value } })}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Track Matching */}
                                <div>
                                    <h4 className="text-[10px] font-black text-[#5B4F70] tracking-[0.2em] uppercase mb-3 flex items-center gap-2"><Music className="w-3.5 h-3.5" /> Track Matching</h4>
                                    <p className="text-[10px] text-[#4B3F60] mb-3 leading-relaxed">
                                        Link this profile to tracks on the radio. Type exact YouTube/SoundCloud <strong>channel names</strong> and press Enter.
                                    </p>

                                    <div className="bg-[#04010A] border border-[rgba(80,30,140,0.15)] rounded-lg p-2 min-h-[104px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)]">
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {(artist.trackMatches || []).map((match, mi) => (
                                                <span key={mi} className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#130A24] border border-[#2A1850] text-[10px] text-[#9D7FFF] font-bold">
                                                    {match}
                                                    <button onClick={() => {
                                                        const updated = [...artist.trackMatches];
                                                        updated.splice(mi, 1);
                                                        onUpdate(index, { trackMatches: updated });
                                                    }} className="text-[#FF2277] hover:text-[#FFF] transition-colors"><X className="w-3 h-3" /></button>
                                                </span>
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Add channel name & press Enter..."
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    const val = (e.target as HTMLInputElement).value.trim();
                                                    if (val && !(artist.trackMatches || []).includes(val)) {
                                                        onUpdate(index, { trackMatches: [...(artist.trackMatches || []), val] });
                                                        (e.target as HTMLInputElement).value = '';
                                                    }
                                                }
                                            }}
                                            className="w-full bg-transparent text-[11px] text-white outline-none px-1 placeholder-[#3B2F50]"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="flex justify-end pt-4 border-t border-[rgba(255,34,119,0.1)]">
                                <button
                                    onClick={() => {
                                        if (confirm(`Are you sure you want to delete ${artist.name || 'this artist'}?`)) onDelete(index);
                                    }}
                                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#FF2277] bg-[#FF2277]/10 hover:bg-[#FF2277] hover:text-white px-4 py-2 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Obliterate Profile
                                </button>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ─── Admin Artists Panel ──────────────────────────────────────────────────────
export function AdminArtistsPanel({ adminToken }: { adminToken: string }) {
    const [artists, setArtists] = useState<ArtistProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingSlugs, setUploadingSlugs] = useState<Set<string>>(new Set());
    const [hasChanges, setHasChanges] = useState(false);
    const [cropModal, setCropModal] = useState<{ slug: string, url: string } | null>(null);

    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const { data: sessionData } = await supabase.auth.getSession();
                const token = sessionData.session?.access_token ?? adminToken;
                const res = await fetch(`${BASE}/artists`, { headers: { Authorization: `Bearer ${token}` } });
                const data = await res.json();

                // Add a stable client-side ID to prevent list re-mounting bugs
                const loaded = Array.isArray(data) ? data : [];
                setArtists(loaded.map(a => ({ ...a, id: a.id || crypto.randomUUID() })));
            } catch {
                toast.error('Failed to load artists');
            }
            setLoading(false);
        })();
    }, [adminToken]);

    const updateArtist = useCallback((index: number, updates: Partial<ArtistProfile>) => {
        setArtists(prev => prev.map((a, i) => i === index ? { ...a, ...updates } : a));
        setHasChanges(true);
    }, []);

    const addArtist = useCallback(() => {
        const now = new Date().toISOString();
        const newArtist: ArtistProfile = {
            id: crypto.randomUUID(), // Guarantee stable key
            slug: `artist-${Date.now()}`, // Temporary slug, user edits this later
            name: '',
            role: '',
            bio: '',
            photoUrl: null,
            badge: null,
            socials: {},
            trackMatches: [],
            order: artists.length,
            visible: true,
            createdAt: now,
            updatedAt: now,
        };
        // Prepend to top so it's instantly visible
        setArtists(prev => [newArtist, ...prev]);
        setHasChanges(true);
    }, [artists.length]);

    const deleteArtist = useCallback((index: number) => {
        setArtists(prev => prev.filter((_, i) => i !== index));
        setHasChanges(true);
    }, []);

    const moveUp = useCallback((index: number) => {
        if (index <= 0) return;
        setArtists(prev => {
            const next = [...prev];
            [next[index - 1], next[index]] = [next[index], next[index - 1]];
            return next;
        });
        setHasChanges(true);
    }, []);

    const moveDown = useCallback((index: number) => {
        setArtists(prev => {
            if (index >= prev.length - 1) return prev;
            const next = [...prev];
            [next[index], next[index + 1]] = [next[index + 1], next[index]];
            return next;
        });
        setHasChanges(true);
    }, []);

    const saveArtists = useCallback(async () => {
        setSaving(true);
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token ?? adminToken;
            if (!token) throw new Error('Not authenticated');
            // Re-assign strict order index before saving
            const ordered = artists.map((a, i) => ({ ...a, order: i }));
            const res = await fetch(`${BASE}/artists`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(ordered),
            });
            if (!res.ok) throw new Error(await res.text());
            toast.success(`${artists.length} artists deployed to public roster`);
            setHasChanges(false);
        } catch (e) {
            toast.error('Deployment failed — ' + String(e));
        }
        setSaving(false);
    }, [artists, adminToken]);

    const onInitiateCrop = useCallback((slug: string, file: File) => {
        setCropModal({ slug, url: URL.createObjectURL(file) });
        // Reset crop states just in case
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
    }, []);

    const handleCropComplete = useCallback(async () => {
        if (!cropModal || !croppedAreaPixels) return;
        const { slug, url } = cropModal;
        setCropModal(null);

        // Process crop
        const croppedFile = await getCroppedImg(url, croppedAreaPixels);
        if (!croppedFile) {
            toast.error("Failed to crop image.");
            return;
        }

        setUploadingSlugs(prev => new Set(prev).add(slug));
        try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token ?? adminToken;
            const res = await fetch(`${BASE}/admin/artist-photo/${slug}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': croppedFile.type },
                body: croppedFile,
            });
            if (!res.ok) throw new Error(await res.text());
            const { url: newUrl } = await res.json();
            setArtists(prev => prev.map(a => a.slug === slug ? { ...a, photoUrl: newUrl } : a));
            toast.success('Dossier image secured');
            setHasChanges(true); // Ensure they save the new URL
        } catch (e: any) {
            console.error(e);
            if (e.message?.includes('Failed to fetch')) {
                toast.error('Deploy Required: Edge function for uploading images is not deployed yet!');
            } else {
                toast.error('Upload failed — ' + String(e));
            }
        } finally {
            setUploadingSlugs(prev => { const s = new Set(prev); s.delete(slug); return s; });
            URL.revokeObjectURL(url);
        }
    }, [cropModal, croppedAreaPixels, adminToken]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <div className="relative">
                    <div className="absolute inset-0 blur-xl bg-[#9D00FF] opacity-30 rounded-full animate-pulse" />
                    <Loader2 className="w-8 h-8 text-[#9D00FF] animate-spin relative z-10" />
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col gap-6 max-w-4xl mx-auto"
        >
            {/* ── Control Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 p-6 rounded-2xl border border-[rgba(157,0,255,0.15)] bg-gradient-to-br from-[#0A0716] to-[#04010A] relative overflow-hidden">
                {/* Glow backdrop */}
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#9D00FF] opacity-5 blur-[100px] pointer-events-none" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-[#9D00FF]/10 rounded-lg border border-[#9D00FF]/20">
                            <Users className="w-5 h-5 text-[#9D7FFF]" />
                        </div>
                        <h2 className="text-xl font-black text-white tracking-tight uppercase">Talent <span className="text-[#9D00FF]">Roster</span></h2>
                    </div>
                    <p className="text-xs text-[#5B4F70] max-w-md leading-relaxed">
                        Manage the VIP dossier. Edit profiles, assign rank badges, and map tracks to ensure artist presence across the radio network.
                    </p>
                </div>

                <div className="flex items-center gap-3 relative z-10">
                    <button
                        onClick={addArtist}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all group overflow-hidden relative"
                        style={{ border: '1px solid rgba(0,255,136,0.3)', background: 'rgba(0,200,100,0.05)' }}
                    >
                        <div className="absolute inset-0 bg-[#00FF88] opacity-0 group-hover:opacity-10 transition-opacity" />
                        <Plus className="w-4 h-4 text-[#00FF88] group-hover:scale-110 transition-transform" />
                        <span className="text-[#00FF88]">Add Talent</span>
                    </button>

                    <button
                        onClick={saveArtists}
                        disabled={saving || !hasChanges}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(157,0,255,0)] disabled:shadow-none disabled:opacity-40 hover:shadow-[0_0_20px_rgba(157,0,255,0.4)]"
                        style={{
                            background: hasChanges ? '#9D00FF' : '#1A0A30',
                            color: hasChanges ? '#FFFFFF' : '#4B3F60',
                            border: `1px solid ${hasChanges ? '#B233FF' : '#2A1850'}`,
                        }}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : hasChanges ? <Save className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        {saving ? 'Deploying...' : hasChanges ? 'Deploy Updates' : 'System Sync'}
                    </button>
                </div>
            </div>

            {/* ── Editor List ── */}
            <div className="flex flex-col">
                <AnimatePresence mode="popLayout">
                    {artists.map((artist, i) => (
                        <ArtistEditorCard
                            key={artist.id || artist.slug} // Stable key fixes the loss-of-focus bug!
                            artist={artist}
                            index={i}
                            onUpdate={updateArtist}
                            onDelete={deleteArtist}
                            onMoveUp={moveUp}
                            onMoveDown={moveDown}
                            onInitiateCrop={onInitiateCrop}
                            uploadingPhoto={uploadingSlugs.has(artist.slug)}
                            isFirst={i === 0}
                            isLast={i === artists.length - 1}
                        />
                    ))}
                </AnimatePresence>

                {artists.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex flex-col items-center justify-center py-20 gap-4 border border-dashed border-[#2A1850] rounded-2xl bg-[#04010A]"
                    >
                        <div className="p-4 bg-[#0A0716] rounded-full border border-[#1A0A30]">
                            <Users className="w-8 h-8 text-[#3B2F50]" />
                        </div>
                        <div className="text-center">
                            <p className="text-white font-bold mb-1">Archive is Empty</p>
                            <p className="text-xs text-[#5B4F70]">Click "Add Talent" to initialize the roster.</p>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* ── Crop Modal Overlay ── */}
            <AnimatePresence>
                {cropModal && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
                            className="bg-[#0A0716] border border-[#9D00FF]/30 rounded-2xl w-full max-w-lg flex flex-col overflow-hidden shadow-[0_0_60px_rgba(157,0,255,0.15)]"
                        >
                            <div className="p-4 border-b border-white/5 flex items-center justify-between">
                                <h3 className="text-white font-black tracking-widest uppercase text-xs flex items-center gap-2">
                                    <Camera className="w-4 h-4 text-[#9D00FF]" /> Adjust Identity Frame
                                </h3>
                                <button onClick={() => setCropModal(null)} className="text-[#5B4F70] hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="relative w-full h-[400px] bg-[#04010A]">
                                <Cropper
                                    image={cropModal.url}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    onCropChange={setCrop}
                                    onCropComplete={(_, croppedAreaPx) => setCroppedAreaPixels(croppedAreaPx as any)}
                                    onZoomChange={setZoom}
                                    cropShape="rect"
                                    showGrid={false}
                                />
                            </div>

                            <div className="p-5 flex flex-col gap-5 bg-gradient-to-b from-[#0A0716] to-[#04010A]">
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] text-[#5B4F70] font-black uppercase tracking-widest">Zoom</span>
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        onChange={(e) => setZoom(Number(e.target.value))}
                                        className="flex-1 accent-[#9D00FF] h-1.5 bg-[#1E1438] rounded-full appearance-none outline-none"
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button onClick={() => setCropModal(null)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-[#8B7AA8] hover:text-white hover:bg-white/5 transition-all">
                                        Discard
                                    </button>
                                    <button onClick={handleCropComplete} className="px-6 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase bg-[#9D00FF] text-white shadow-[0_0_20px_rgba(157,0,255,0.3)] hover:shadow-[0_0_30px_rgba(157,0,255,0.5)] hover:bg-[#B233FF] transition-all">
                                        Confirm Crop
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
