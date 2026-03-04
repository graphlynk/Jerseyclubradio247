import { useState } from 'react';
import Instagram230 from '../../imports/Instagram-230-21';

// ── Brand SVG Icons ───────────────────────────────────────────────────────────

function YouTubeIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function TikTokIcon({ className = '' }: { className?: string }) {
  const path =
    'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z';
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" style={{ overflow: 'visible' }}>
      {/* Authentic TikTok chromatic offset layers */}
      <path d={path} fill="#FF0050" transform="translate(0.8, 0.8)" opacity="0.85" />
      <path d={path} fill="#00F2EA" transform="translate(-0.8, -0.8)" opacity="0.85" />
      <path d={path} fill="white" />
    </svg>
  );
}

function InstagramIcon({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  const fillColor = (style as React.CSSProperties & Record<string, string>)?.color ?? 'white';
  return (
    <div
      className={className}
      style={{ position: 'relative', ['--fill-0' as string]: fillColor }}
    >
      <Instagram230 />
    </div>
  );
}

function XIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

// ── Platform data ─────────────────────────────────────────────────────────────

const PLATFORMS = [
  {
    id: 'x',
    name: 'X',
    handle: '@jerseyclubradio',
    url: 'https://x.com/jerseyclubradio',
    cta: 'Follow',
    color: '#E7E9EA',
    glow: 'rgba(231,233,234,0.55)',
    dimGlow: 'rgba(231,233,234,0.18)',
    bg: 'rgba(231,233,234,0.06)',
    border: 'rgba(231,233,234,0.20)',
    hoverBorder: 'rgba(231,233,234,0.50)',
    gradientBg: 'linear-gradient(135deg, rgba(231,233,234,0.08) 0%, rgba(180,180,180,0.04) 100%)',
    Icon: XIcon,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    handle: '@Jerseyclubradio',
    url: 'https://www.youtube.com/@Jerseyclubradio',
    cta: 'Subscribe',
    color: '#FF3333',
    glow: 'rgba(255,51,51,0.55)',
    dimGlow: 'rgba(255,51,51,0.18)',
    bg: 'rgba(255,51,51,0.07)',
    border: 'rgba(255,51,51,0.28)',
    hoverBorder: 'rgba(255,51,51,0.65)',
    // Instagram-style gradient not needed — clean red
    gradientBg: 'linear-gradient(135deg, rgba(255,51,51,0.12) 0%, rgba(255,0,0,0.04) 100%)',
    Icon: YouTubeIcon,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    handle: '@jerseyclubradio',
    url: 'https://www.tiktok.com/@jerseyclubradio',
    cta: 'Follow',
    color: '#00F2EA',
    glow: 'rgba(0,242,234,0.55)',
    dimGlow: 'rgba(0,242,234,0.18)',
    bg: 'rgba(0,242,234,0.06)',
    border: 'rgba(0,242,234,0.25)',
    hoverBorder: 'rgba(0,242,234,0.65)',
    gradientBg: 'linear-gradient(135deg, rgba(0,242,234,0.10) 0%, rgba(255,0,80,0.06) 100%)',
    Icon: TikTokIcon,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    handle: '@jerseyclubradio',
    url: 'https://www.instagram.com/jerseyclubradio/',
    cta: 'Follow',
    color: '#E1306C',
    glow: 'rgba(225,48,108,0.55)',
    dimGlow: 'rgba(225,48,108,0.18)',
    bg: 'rgba(225,48,108,0.07)',
    border: 'rgba(225,48,108,0.28)',
    hoverBorder: 'rgba(225,48,108,0.65)',
    gradientBg: 'linear-gradient(135deg, rgba(131,58,180,0.14) 0%, rgba(225,48,108,0.12) 50%, rgba(247,119,55,0.08) 100%)',
    Icon: InstagramIcon,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface SocialWidgetsProps {
  variant?: 'sidebar' | 'strip';
  className?: string;
}

export function SocialWidgets({ variant = 'sidebar', className = '' }: SocialWidgetsProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [clicked, setClicked] = useState<string | null>(null);

  const handleClick = (id: string, url: string) => {
    if (clicked === id) return;
    setClicked(id);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => setClicked(null), 2500);
  };

  // ── Sidebar variant (desktop) ───────────────────────────────────────────────
  if (variant === 'sidebar') {
    return (
      null
    );
  }

  // ── Strip variant (mobile) ──────────────────────────────────────────────────
  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 mb-3">
        
        
        
      </div>

      <div
        className="flex md:hidden flex-row items-center gap-1.5"
        style={{ marginTop: '-6px', marginBottom: '-1px' }}
      >
        {PLATFORMS.map(({ id, name, handle, url, cta, color, glow, dimGlow, border, hoverBorder, gradientBg, Icon }) => {
          const isClicked = clicked === id;

          return (
            <button
              key={id}
              onClick={() => handleClick(id, url)}
              className="flex items-center justify-center transition-all duration-200 active:scale-90"
              style={{
                width: 22,
                height: 22,
                background: 'none',
                border: 'none',
                boxShadow: isClicked ? `0 0 8px ${glow}` : 'none',
              }}
            >
              <Icon
                className="w-3.5 h-3.5"
                style={{ color: id === 'tiktok' ? undefined : color }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}