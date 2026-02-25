import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Download, Share2, Copy, Check, Loader2,
} from 'lucide-react';
import { Track } from '../context/PlayerContext';
import { formatArtistName } from '../utils/formatArtistName';
import { formatTrackTitle } from '../utils/formatTrackTitle';
import { generateShareCanvas, CARD_W, CARD_H } from '../utils/generateShareCanvas';
import { LiveShareCard } from './LiveShareCard';

// ── Re-exported for backward compat with Home.tsx mobile path ─────────────────
export { LiveShareCard };

// ── Types ─────────────────────────────────────────────────────────────────────
interface ShareModalProps {
  track: Track | null;
  onClose: () => void;
}

// ── Mobile detector ───────────────────────────────────────────────────────────
function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// ── Native share helper ───────────────────────────────────────────────────────
async function nativeShare(
  blob: Blob,
  titleText: string,
  artist: string,
): Promise<'shared' | 'cancelled' | 'unavailable'> {
  if (!navigator.share) return 'unavailable';
  const file = new File([blob], 'jersey-club-live.png', { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: 'Live on Jersey Club Radio',
        text: `🎶 ${titleText.toUpperCase()} by ${artist}\n🔥 24/7 Jersey Club Radio\n${window.location.href}`,
        files: [file],
      });
    } else {
      await navigator.share({
        title: 'Live on Jersey Club Radio',
        text: `🎶 ${titleText.toUpperCase()} by ${artist} — 24/7 Jersey Club Radio`,
        url: window.location.href,
      });
    }
    return 'shared';
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
    return 'unavailable';
  }
}

// ── Decorative app-icon row ───────────────────────────────────────────────────
const APP_ICONS: { label: string; bg: string; emoji: string }[] = [
  { label: 'Instagram', bg: 'linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045)', emoji: '📸' },
  { label: 'TikTok',    bg: '#010101',                                           emoji: '🎵' },
  { label: 'WhatsApp',  bg: '#25D366',                                           emoji: '💬' },
  { label: 'iMessage',  bg: 'linear-gradient(135deg,#34c759,#30b350)',           emoji: '✉️' },
  { label: 'Snapchat',  bg: '#FFFC00',                                           emoji: '👻' },
];

// ═════════════════════════════════════════════════════════════════════════════
export function ShareModal({ track, onClose }: ShareModalProps) {
  const [visible, setVisible]       = useState(false);
  const [capturing, setCapturing]   = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [shareBlob, setShareBlob]   = useState<Blob | null>(null);
  const [shared, setShared]         = useState(false);
  const [copied, setCopied]         = useState(false);
  const [autoTriggered, setAutoTriggered] = useState(false);

  const capturedOnce = useRef(false);
  const autoShareRef = useRef(false);

  const title  = track ? formatTrackTitle(track.snippet.title, track.snippet.channelTitle) : '';
  const artist = track ? (formatArtistName(track.snippet.channelTitle) || 'Jersey Club Radio') : '';

  const listenerCount = track
    ? 2000 + (track.id.videoId.charCodeAt(0) * 31 + track.id.videoId.charCodeAt(1) * 7) % 1500
    : 2847;

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Generate share card via Canvas 2D (bypasses all html-to-image mobile bugs)
  useEffect(() => {
    if (!track || capturedOnce.current) return;
    capturedOnce.current = true;

    const run = async () => {
      try {
        const blob = await generateShareCanvas(title, artist);
        const url  = URL.createObjectURL(blob);
        setShareBlob(blob);
        setPreviewUrl(url);
      } catch (err) {
        console.warn('[ShareModal] canvas generation failed:', err);
      } finally {
        setCapturing(false);
      }
    };

    run();
  }, [track]);

  // On mobile: auto-trigger native share as soon as the blob is ready
  useEffect(() => {
    if (!shareBlob || autoShareRef.current) return;
    if (!isMobileDevice() || !navigator.share) return;

    autoShareRef.current = true;
    setAutoTriggered(true);

    nativeShare(shareBlob, title, artist).then(result => {
      if (result === 'shared') {
        setShared(true);
        setTimeout(handleClose, 1200);
      } else if (result === 'unavailable') {
        setAutoTriggered(false);
      }
    });
  }, [shareBlob]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 280);
  }, [onClose]);

  const handleStoriesShare = async () => {
    if (!shareBlob) return;
    const result = await nativeShare(shareBlob, title, artist);
    if (result === 'shared') {
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    }
  };

  const handleDownload = () => {
    if (!shareBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(shareBlob);
    a.download = 'jersey-club-live.png';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* not available */ }
  };

  if (!track) return null;

  const previewW = 240;
  const previewH = Math.round(previewW * (CARD_H / CARD_W));

  return (
    <>
      {/* ── Overlay ────────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
        onClick={handleClose}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            background: 'rgba(0,0,0,0.82)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            opacity: visible ? 1 : 0,
          }}
        />

        {/* ── Bottom sheet ───────────────────────────────────────────────── */}
        <div
          className="relative w-full max-w-sm mx-auto sm:rounded-2xl rounded-t-[28px] overflow-hidden transition-all duration-300 ease-out"
          style={{
            background: 'linear-gradient(170deg, #110028 0%, #0a0018 60%, #060010 100%)',
            border: '1px solid rgba(157,0,255,0.2)',
            boxShadow: '0 -12px 80px rgba(157,0,255,0.2), 0 0 200px rgba(157,0,255,0.05)',
            transform: visible ? 'translateY(0) scale(1)' : 'translateY(100%) scale(0.96)',
            opacity: visible ? 1 : 0,
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Neon top strip */}
          <div
            className="h-[3px] w-full"
            style={{ background: 'linear-gradient(90deg,#9D00FF 0%,#FF0080 50%,#9D00FF 100%)' }}
          />

          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-2 pb-3">
            <p className="text-sm font-black text-white tracking-wide">Share to Stories</p>
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.07)' }}
            >
              <X className="w-3.5 h-3.5 text-white/60" />
            </button>
          </div>

          {/* ── Card preview ─────────────────────────────────────────────── */}
          <div className="flex justify-center px-5 pb-4">
            {capturing ? (
              <div
                className="rounded-2xl flex flex-col items-center justify-center gap-3"
                style={{
                  width: previewW, height: previewH,
                  background: 'rgba(157,0,255,0.06)',
                  border: '1px solid rgba(157,0,255,0.18)',
                }}
              >
                <Loader2 className="w-7 h-7 text-[#9D00FF] animate-spin" />
                <p className="text-[11px] text-white/40 font-medium">Generating story card…</p>
              </div>
            ) : previewUrl ? (
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  width: previewW, height: previewH,
                  border: '1.5px solid rgba(157,0,255,0.3)',
                  boxShadow: '0 0 30px rgba(157,0,255,0.18), 0 0 60px rgba(157,0,255,0.07)',
                }}
              >
                <img
                  src={previewUrl}
                  alt="Share card"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            ) : (
              <div
                className="rounded-2xl px-4 py-4 flex items-center gap-3"
                style={{
                  width: '100%', maxWidth: previewW * 1.5,
                  background: 'rgba(157,0,255,0.07)',
                  border: '1px solid rgba(157,0,255,0.2)',
                }}
              >
                <Share2 className="w-8 h-8 text-[#9D00FF]/50 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-black text-white uppercase truncate">{title}</p>
                  <p className="text-[11px] mt-0.5 font-semibold truncate" style={{ color: '#C084FC' }}>{artist}</p>
                </div>
              </div>
            )}
          </div>

          {/* ── App icon row ─────────────────────────────────────────────── */}
          <div className="px-5 pb-4">
            <p className="text-[10px] text-white/35 font-semibold uppercase tracking-widest mb-3 text-center">
              Share with…
            </p>
            <div className="flex items-center justify-center gap-4">
              {APP_ICONS.map(app => (
                <button
                  key={app.label}
                  onClick={handleStoriesShare}
                  disabled={capturing || !shareBlob}
                  className="flex flex-col items-center gap-1.5 transition-all active:scale-90 disabled:opacity-40"
                  title={`Share to ${app.label}`}
                >
                  <div
                    className="w-12 h-12 rounded-[14px] flex items-center justify-center shadow-lg"
                    style={{ background: app.bg, boxShadow: '0 2px 12px rgba(0,0,0,0.35)' }}
                  >
                    {((): React.ReactNode => {
                      switch (app.label) {
                        case 'Instagram':
                          return (
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="2" width="20" height="20" rx="5" />
                              <circle cx="12" cy="12" r="4.5" />
                              <circle cx="17.3" cy="6.7" r="1" fill="white" stroke="none" />
                            </svg>
                          );
                        case 'TikTok':
                          return (
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.77 1.52V6.74a4.85 4.85 0 01-1-.05z" />
                            </svg>
                          );
                        case 'WhatsApp':
                          return (
                            <svg viewBox="0 0 24 24" width="21" height="21" fill="white">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                          );
                        case 'iMessage':
                          return (
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
                              <path d="M12 2C6.477 2 2 6.253 2 11.5c0 2.86 1.3 5.424 3.375 7.187C5.14 20.01 4.5 21.84 3 22.5c2.196.136 4.277-.73 5.813-2.094A11.41 11.41 0 0012 21c5.523 0 10-4.253 10-9.5S17.523 2 12 2z" />
                            </svg>
                          );
                        case 'Snapchat':
                          return (
                            <svg viewBox="0 0 24 24" width="21" height="21" fill="#111111">
                              <path d="M12 2C8.687 2 6 4.687 6 8v2.5c-.552.3-1 .8-1 1.5 0 .848.631 1.498 1.447 1.499-.304.822-.84 1.538-1.86 2.178-.25.158-.317.48-.126.724.19.243.622.366 1.289.45.3.038.57.089.778.196.133.069.252.178.353.315.449.617 1.098.955 1.92.955.821 0 1.7-.24 2.471-.24.772 0 1.651.24 2.472.24.82 0 1.47-.338 1.919-.955.101-.137.22-.246.353-.315.208-.107.477-.158.778-.196.667-.084 1.099-.207 1.289-.45.191-.244.125-.566-.126-.724-1.02-.64-1.556-1.356-1.86-2.178C17.369 13.498 18 12.848 18 12c0-.7-.448-1.2-1-1.5V8c0-3.313-2.687-6-6-6z" />
                            </svg>
                          );
                        default:
                          return <span className="text-xl">{app.emoji}</span>;
                      }
                    })()}
                  </div>
                  <span className="text-[9px] text-white/50 font-medium">{app.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Stories CTA ──────────────────────────────────────────────── */}
          <div className="px-5 pb-2">
            <button
              onClick={handleStoriesShare}
              disabled={capturing || !shareBlob}
              className="w-full py-4 rounded-2xl font-black text-sm text-white tracking-wide transition-all active:scale-[0.97] disabled:opacity-40 relative overflow-hidden"
              style={{
                background: shared
                  ? 'linear-gradient(90deg,#00C853,#00E676)'
                  : 'linear-gradient(90deg,#FF0050 0%,#9D00FF 100%)',
                boxShadow: shared
                  ? '0 0 24px rgba(0,200,83,0.4)'
                  : '0 0 28px rgba(157,0,255,0.4), 0 0 48px rgba(255,0,80,0.15)',
              }}
            >
              {!shared && (
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)',
                }} />
              )}
              {autoTriggered && !capturing && !shared ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Opening share sheet…
                </span>
              ) : shared ? (
                <span className="flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> Shared!
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2 text-base">
                  🎬 Stories
                </span>
              )}
            </button>
          </div>

          {/* ── Secondary row: Download + Copy ───────────────────────────── */}
          <div className="px-5 pb-6 pt-2 flex gap-2">
            <button
              onClick={handleDownload}
              disabled={capturing || !shareBlob}
              className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-[0.97] disabled:opacity-30"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.65)',
              }}
            >
              <Download className="w-4 h-4" />
              Save Image
            </button>

            <button
              onClick={handleCopyLink}
              className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-[0.97]"
              style={{
                background: copied ? 'rgba(0,200,83,0.12)' : 'rgba(255,255,255,0.05)',
                border: copied ? '1px solid rgba(0,200,83,0.3)' : '1px solid rgba(255,255,255,0.1)',
                color: copied ? '#00E676' : 'rgba(255,255,255,0.65)',
              }}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}