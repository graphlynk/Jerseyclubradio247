import { motion, AnimatePresence, useInView } from 'motion/react';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────── */
interface Article {
    title: string;
    source: string;
    author: string | null;
    published_date: string | null;
    url: string;
    summary: string;
    angle: string;
}

/* ─── Data ───────────────────────────────────────────────────────── */
const ARTICLES: Article[] = [
    { title: 'How Jersey Club Conquered the Internet', source: 'The Fader', author: null, published_date: null, url: '#', summary: 'Placeholder — replace with real article data. This slot is ready for your first URL.', angle: 'scene history' },
    { title: "The Sound of Newark: Inside Jersey Club's Rise", source: 'Pitchfork', author: null, published_date: null, url: '#', summary: 'Placeholder — replace with real article data. This slot is ready for your second URL.', angle: 'scene history' },
    { title: 'DJ Sliink Is Taking Jersey Club Global', source: 'Rolling Stone', author: null, published_date: null, url: '#', summary: 'Placeholder — replace with real article data. This slot is ready for your third URL.', angle: 'artist profile' },
    { title: 'Why TikTok Made Jersey Club the Hottest Dance Genre', source: 'Complex', author: null, published_date: null, url: '#', summary: 'Placeholder — replace with real article data. This slot is ready for your fourth URL.', angle: 'industry trend' },
    { title: "Jersey Club's Influence on Mainstream Pop in 2024", source: 'Billboard', author: null, published_date: null, url: '#', summary: 'Placeholder — replace with real article data. This slot is ready for your fifth URL.', angle: 'industry trend' },
    { title: 'The Culture Behind the Music: Jersey Club in Context', source: 'The Atlantic', author: null, published_date: null, url: '#', summary: 'Placeholder — replace with real article data. This slot is ready for your sixth URL.', angle: 'op-ed' },
];

/* ─── Palette ────────────────────────────────────────────────────── */
const PALETTE: Record<string, { text: string; border: string; glow: string }> = {
    'scene history': { text: '#C084FC', border: '#9D00FF', glow: 'rgba(157,0,255,0.5)' },
    'artist profile': { text: '#FF8AC0', border: '#FF0080', glow: 'rgba(255,0,128,0.5)' },
    'industry trend': { text: '#67E8F9', border: '#00B8D9', glow: 'rgba(0,184,217,0.4)' },
    'op-ed': { text: '#FCD34D', border: '#F59E0B', glow: 'rgba(245,158,11,0.4)' },
    'interview': { text: '#6EE7B7', border: '#10B981', glow: 'rgba(16,185,129,0.4)' },
    'news': { text: '#C084FC', border: '#9D00FF', glow: 'rgba(157,0,255,0.5)' },
};
const getPal = (angle: string) => PALETTE[angle.toLowerCase()] ?? PALETTE['scene history'];

function fmtDate(iso: string | null) {
    if (!iso) return null;
    try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return iso; }
}

/* ─── Component ──────────────────────────────────────────────────── */
export function JerseyClubArticles() {
    const [idx, setIdx] = useState(0);
    const [dir, setDir] = useState<1 | -1>(1);
    const [paused, setPaused] = useState(false);

    const sectionRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(sectionRef, { once: true, amount: 0.15 });

    const go = (d: 1 | -1) => { setDir(d); setIdx(i => (i + d + ARTICLES.length) % ARTICLES.length); };
    const jumpTo = (i: number) => { setDir(i > idx ? 1 : -1); setIdx(i); };

    useEffect(() => {
        if (paused) return;
        const t = setInterval(() => { setDir(1); setIdx(i => (i + 1) % ARTICLES.length); }, 7000);
        return () => clearInterval(t);
    }, [paused]);

    const art = ARTICLES[idx];
    const p = getPal(art.angle);
    const isReal = art.url !== '#';
    const num = String(idx + 1).padStart(2, '0');
    const words = art.title.split(' ');

    return (
        <div ref={sectionRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10 mb-6">
            <div className="lg:col-span-2 flex flex-col">

                {/* Section header */}
                <motion.div
                    className="flex items-center gap-3 mb-5"
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                    <motion.span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: '#9D00FF', boxShadow: '0 0 8px #9D00FF' }}
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                    <h2
                        className="font-black text-white tracking-tight text-base md:text-[17px] leading-none"
                        style={{ fontFamily: "'Archivo', sans-serif" }}
                    >
                        Jersey Club History
                    </h2>
                    <span
                        className="text-[10px] font-semibold tracking-widest uppercase hidden sm:block"
                        style={{
                            background: 'linear-gradient(90deg, #9D00FF, #FF00FF)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        · Culture · History · Profiles
                    </span>
                </motion.div>

                {/* ── MAIN CARD ── */}
                <motion.div
                    className="relative flex overflow-hidden rounded-2xl"
                    style={{ minHeight: '440px', background: '#07010E' }}
                    initial={{ clipPath: 'inset(0 0 100% 0 round 16px)' }}
                    animate={isInView ? { clipPath: 'inset(0 0 0% 0 round 16px)' } : {}}
                    transition={{ duration: 0.75, delay: 0.15, ease: [0.76, 0, 0.24, 1] }}
                    onMouseEnter={() => setPaused(true)}
                    onMouseLeave={() => setPaused(false)}
                >
                    {/* Subtle border */}
                    <div
                        className="absolute inset-0 rounded-2xl pointer-events-none"
                        style={{ border: '1px solid rgba(255,255,255,0.055)', zIndex: 10 }}
                    />

                    {/* Radial color wash */}
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: `radial-gradient(ellipse 65% 50% at 95% 5%, ${p.border}0E, transparent 60%)`,
                            transition: 'background 0.85s ease',
                        }}
                    />

                    {/* Left accent bar — draws down */}
                    <motion.div
                        className="flex-shrink-0"
                        style={{
                            width: '3px',
                            background: `linear-gradient(180deg, ${p.border} 0%, ${p.border}55 60%, transparent 100%)`,
                            boxShadow: `4px 0 24px ${p.border}35`,
                            transition: 'background 0.85s ease, box-shadow 0.85s ease',
                            originY: 0,
                        }}
                        initial={{ scaleY: 0 }}
                        animate={isInView ? { scaleY: 1 } : {}}
                        transition={{ duration: 0.5, delay: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
                    />

                    {/* Content — fades in after card reveals */}
                    <motion.div
                        className="relative flex flex-col flex-1 overflow-hidden"
                        style={{ zIndex: 2 }}
                        initial={{ opacity: 0 }}
                        animate={isInView ? { opacity: 1 } : {}}
                        transition={{ duration: 0.35, delay: 0.65 }}
                    >
                        {/* Ghost number */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`g${idx}`}
                                className="absolute font-black pointer-events-none select-none"
                                style={{
                                    right: '-0.05em',
                                    bottom: '-0.08em',
                                    fontSize: 'clamp(130px, 20vw, 240px)',
                                    lineHeight: 1,
                                    color: p.border,
                                    fontFamily: "'Archivo', sans-serif",
                                    letterSpacing: '-0.07em',
                                    transition: 'color 0.85s ease',
                                    zIndex: 0,
                                }}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 0.05, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.45 }}
                            >
                                {num}
                            </motion.div>
                        </AnimatePresence>

                        {/* ── TOP BAR ── */}
                        <div
                            className="flex items-center justify-between px-6 py-[14px] flex-shrink-0"
                            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                        >
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={`meta-${idx}`}
                                    className="flex items-center gap-2.5 min-w-0"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.28 }}
                                >
                                    <span
                                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                        style={{ background: p.border, boxShadow: `0 0 6px ${p.border}` }}
                                    />
                                    <span
                                        className="text-[10px] font-black tracking-[0.28em] uppercase truncate"
                                        style={{ color: p.text, transition: 'color 0.85s ease' }}
                                    >
                                        {art.source}
                                    </span>
                                    <span className="w-px h-3 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />
                                    <span
                                        className="text-[9px] font-bold tracking-[0.18em] uppercase truncate"
                                        style={{ color: p.border, opacity: 0.65, transition: 'color 0.85s ease' }}
                                    >
                                        {art.angle}
                                    </span>
                                </motion.div>
                            </AnimatePresence>

                            <div className="flex items-center gap-2.5 flex-shrink-0">
                                <span
                                    className="text-[11px] font-mono tabular-nums"
                                    style={{ color: 'rgba(255,255,255,0.2)' }}
                                >
                                    {num} / {String(ARTICLES.length).padStart(2, '0')}
                                </span>
                                <div className="flex gap-1">
                                    {([-1, 1] as const).map(d => (
                                        <motion.button
                                            key={d}
                                            onClick={() => go(d)}
                                            className="flex items-center justify-center w-7 h-7 rounded-full transition-colors duration-150"
                                            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}
                                            whileHover={{ scale: 1.12 }}
                                            whileTap={{ scale: 0.88 }}
                                        >
                                            {d === -1 ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ── BODY ── */}
                        <div className="flex-1 px-6 pt-7 pb-4 flex flex-col relative" style={{ zIndex: 1 }}>
                            <AnimatePresence mode="wait" custom={dir}>
                                <motion.div
                                    key={idx}
                                    custom={dir}
                                    variants={{
                                        enter: (d: number) => ({ opacity: 0, y: d * 18 }),
                                        center: { opacity: 1, y: 0 },
                                        exit: (d: number) => ({ opacity: 0, y: d * -18 }),
                                    }}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{ duration: 0.26, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    className="flex flex-col flex-1"
                                >
                                    {/* Title — luxury word-reveal */}
                                    <h3
                                        className="font-black text-white leading-[1.06] tracking-tight mb-5"
                                        style={{
                                            fontFamily: "'Archivo', sans-serif",
                                            fontSize: 'clamp(24px, 3.4vw, 46px)',
                                            textShadow: `0 0 50px ${p.border}1A`,
                                            transition: 'text-shadow 0.85s ease',
                                        }}
                                    >
                                        {words.map((word, wi) => (
                                            <span
                                                key={`wrap-${idx}-${wi}`}
                                                style={{
                                                    display: 'inline-block',
                                                    overflow: 'hidden',
                                                    marginRight: '0.22em',
                                                    verticalAlign: 'bottom',
                                                    lineHeight: 1.12,
                                                }}
                                            >
                                                <motion.span
                                                    key={`w-${idx}-${wi}`}
                                                    style={{ display: 'inline-block' }}
                                                    initial={{ y: '110%' }}
                                                    animate={{ y: '0%' }}
                                                    transition={{
                                                        delay: 0.06 + wi * 0.052,
                                                        duration: 0.52,
                                                        ease: [0.16, 1, 0.3, 1],
                                                    }}
                                                >
                                                    {word}
                                                </motion.span>
                                            </span>
                                        ))}
                                    </h3>

                                    {/* Rule */}
                                    <motion.div
                                        style={{
                                            height: '1px',
                                            transformOrigin: 'left center',
                                            background: `linear-gradient(90deg, ${p.border}44, transparent 50%)`,
                                            marginBottom: '1.1rem',
                                            flexShrink: 0,
                                            transition: 'background 0.85s ease',
                                        }}
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: 1 }}
                                        transition={{ delay: 0.22, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                                    />

                                    {/* Summary */}
                                    <motion.p
                                        className="text-sm leading-relaxed"
                                        style={{ color: '#66567E' }}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.28, duration: 0.38 }}
                                    >
                                        {art.summary}
                                    </motion.p>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* ── FOOTER ── */}
                        <div
                            className="px-6 py-3 flex items-center justify-between flex-wrap gap-2"
                            style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                        >
                            <span
                                className="text-[10px] font-semibold tracking-[0.18em] uppercase"
                                style={{ color: 'rgba(255,255,255,0.2)' }}
                            >
                                {art.author ?? 'Jersey Club Radio'}
                                {fmtDate(art.published_date) ? ` · ${fmtDate(art.published_date)}` : ''}
                            </span>

                            {isReal && (
                                <motion.a
                                    href={art.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-[0.16em] uppercase px-4 py-2 rounded-full"
                                    style={{
                                        color: '#fff',
                                        background: `linear-gradient(135deg, ${p.border}, ${p.border}CC)`,
                                        boxShadow: `0 0 20px ${p.glow}`,
                                        transition: 'background 0.85s ease',
                                    }}
                                    whileHover={{ scale: 1.05, boxShadow: `0 0 36px ${p.glow}` }}
                                    whileTap={{ scale: 0.94 }}
                                    transition={{ duration: 0.16 }}
                                >
                                    Read Article
                                    <ExternalLink className="w-3 h-3" />
                                </motion.a>
                            )}
                        </div>

                        {/* ── PROGRESS BAR ── */}
                        <div className="px-6 pb-5 flex-shrink-0">
                            <div className="flex items-center gap-1">
                                {ARTICLES.map((a, i) => {
                                    const cp = PALETTE[a.angle.toLowerCase()] ?? PALETTE['scene history'];
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => jumpTo(i)}
                                            className="relative rounded-full overflow-hidden flex-1 transition-opacity duration-200 hover:opacity-60"
                                            style={{ height: '2px', background: 'rgba(255,255,255,0.07)' }}
                                            title={a.title}
                                        >
                                            {i === idx && (
                                                <motion.span
                                                    className="absolute inset-y-0 left-0 rounded-full"
                                                    style={{ background: cp.border }}
                                                    initial={{ width: '0%' }}
                                                    animate={{ width: '100%' }}
                                                    transition={{ duration: 7, ease: 'linear' }}
                                                />
                                            )}
                                            {i < idx && (
                                                <span
                                                    className="absolute inset-0 rounded-full"
                                                    style={{ background: cp.border, opacity: 0.3 }}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Reserved right column */}
            <div className="lg:col-span-1" />
        </div>
    );
}
