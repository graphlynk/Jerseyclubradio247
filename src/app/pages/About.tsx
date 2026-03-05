import { Link } from 'react-router';
import {
    ArrowLeft, Radio, Music, Globe, Headphones,
    Users, Disc3, ChevronDown, MessageCircle, Gamepad2, Mic2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

export function About() {
    return (
        <div className="min-h-screen overflow-x-hidden" style={{ background: '#06000F', fontFamily: "'Archivo', sans-serif" }}>
            <PageHeader />
            <Hero />
            <StatsStrip />
            <main className="max-w-[880px] mx-auto px-5 md:px-8">
                <OriginSection />
                <PlatformCards />
                <FeaturesGrid />
                <SocialSection />
                <FAQSection />
                <CTABlock />
            </main>
            <PageFooter />
        </div>
    );
}

/* ─── HEADER ─────────────────────────────────────────────────────── */

function PageHeader() {
    return (
        <header
            className="sticky top-0 z-50 border-b border-white/[0.06]"
            style={{ background: 'rgba(6, 0, 15, 0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        >
            <div className="max-w-[880px] mx-auto flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
                        <img src="/jc-club-logo-purple.png" alt="JCR" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <p className="font-black text-white text-sm tracking-wide leading-none">JERSEY CLUB</p>
                        <p
                            className="text-[9px] text-[#C084FC] font-semibold tracking-widest"
                            style={{ textShadow: '0 0 4px #C084FC, 0 0 10px #9D00FF' }}
                        >
                            24/7 RADIO
                        </p>
                    </div>
                </div>
                <Link
                    to="/"
                    className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-[#C084FC] border border-[#9D00FF]/20 hover:bg-[#9D00FF]/10 transition-all"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    BACK TO RADIO
                </Link>
            </div>
        </header>
    );
}

/* ─── HERO ───────────────────────────────────────────────────────── */

function Hero() {
    return (
        <section className="relative flex flex-col items-center justify-center text-center px-5 pt-20 pb-16 md:pt-28 md:pb-24 overflow-hidden">
            {/* Pulsing rings */}
            {[1, 2, 3, 4].map(i => (
                <motion.div
                    key={i}
                    className="absolute rounded-full border pointer-events-none"
                    style={{
                        width: `${i * 200}px`,
                        height: `${i * 200}px`,
                        borderColor: `rgba(157, 0, 255, ${0.18 / i})`,
                    }}
                    animate={{ scale: [1, 1.06, 1], opacity: [0.9, 0.4, 0.9] }}
                    transition={{ duration: 3 + i * 0.8, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
                />
            ))}

            {/* Grain texture */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    opacity: 0.025,
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                    backgroundSize: '200px 200px',
                }}
            />

            {/* LIVE badge */}
            <motion.div
                className="flex items-center gap-2 mb-8 px-4 py-2 rounded-full border"
                style={{ borderColor: 'rgba(157, 0, 255, 0.3)', background: 'rgba(157, 0, 255, 0.08)' }}
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
            >
                <span
                    className="w-2 h-2 rounded-full bg-[#00FF88] flex-shrink-0"
                    style={{ boxShadow: '0 0 6px #00FF88', animation: 'pulse 1.5s infinite' }}
                />
                <span className="text-xs font-bold text-[#C084FC] tracking-[0.18em]">LIVE 24/7 · FREE · NO SIGN-UP</span>
            </motion.div>

            {/* Giant headline */}
            <div className="relative z-10">
                {/* JERSEY + logo */}
                <motion.div
                    className="flex items-center justify-center gap-4 leading-[0.88]"
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0 }}
                >
                    <h1
                        className="font-black tracking-[-0.02em]"
                        style={{ fontSize: 'clamp(56px, 11vw, 108px)', color: '#fff' }}
                    >
                        JERSEY
                    </h1>
                    <img
                        src="/jc-club-logo-gradient.png"
                        alt="JCR"
                        style={{
                            width: 'clamp(48px, 8vw, 90px)',
                            height: 'clamp(48px, 8vw, 90px)',
                            objectFit: 'contain',
                            flexShrink: 0,
                        }}
                    />
                </motion.div>

                {/* RADIO */}
                <motion.h1
                    className="font-black leading-[0.88] tracking-[-0.02em] block"
                    style={{ fontSize: 'clamp(56px, 11vw, 108px)', color: '#fff' }}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.16 }}
                >
                    RADIO
                </motion.h1>
            </div>

            <motion.p
                className="mt-6 text-sm md:text-[15px] text-[#7B6F90] max-w-[460px] leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.35 }}
            >
                The world's first 24/7 station dedicated exclusively to Jersey Club music —
                bringing Newark's sound to the globe since 2009.
            </motion.p>

        </section>
    );
}

/* ─── STATS STRIP ─────────────────────────────────────────────────── */

const STATS = [
    { label: 'ON AIR', value: '24/7', glow: '#9D00FF' },
    { label: 'TEMPO', value: '130+ BPM', glow: '#9D00FF' },
    { label: 'COST', value: 'FREE', glow: '#FF0080' },
    { label: 'ESTABLISHED', value: '2026', glow: '#9D00FF' },
];

function StatsStrip() {
    return (
        <div className="border-y border-white/[0.06]" style={{ background: 'rgba(157, 0, 255, 0.03)' }}>
            <div className="max-w-[880px] mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-white/[0.05]">
                {STATS.map((s, i) => (
                    <motion.div
                        key={s.label}
                        className="flex flex-col items-center justify-center py-8 px-4"
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1, duration: 0.45 }}
                    >
                        <p
                            className="font-black text-white tracking-tight"
                            style={{
                                fontSize: 'clamp(24px, 4vw, 36px)',
                                textShadow: `0 0 24px ${s.glow}88`,
                            }}
                        >
                            {s.value}
                        </p>
                        <p className="text-[9px] text-[#5A4F6A] tracking-[0.22em] font-bold mt-1.5">{s.label}</p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}

/* ─── ORIGIN SECTION ─────────────────────────────────────────────── */

const TRAITS = [
    { label: 'Fast-paced rhythms', desc: '130–140 BPM that demand movement' },
    { label: 'Chopped vocal samples', desc: 'Call-and-response chops from hip-hop & R&B' },
    { label: 'Heavy kick patterns', desc: 'Punchy, rapid-fire kicks defining the heartbeat' },
    { label: 'Creative remixes', desc: 'Popular songs reimagined through a Jersey Club lens' },
];

function OriginSection() {
    return (
        <section className="py-16 md:py-20">
            {/* Two-column intro */}
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-start mb-10">
                <motion.div
                    initial={{ opacity: 0, x: -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.55 }}
                >
                    <div className="flex items-center gap-2 mb-4">
                        <Music className="w-4 h-4 text-[#9D00FF]" />
                        <span className="text-[10px] font-bold text-[#9D00FF] tracking-[0.22em]">THE GENRE</span>
                    </div>
                    <h2
                        className="font-black text-white leading-[0.9] mb-1"
                        style={{ fontSize: 'clamp(34px, 5vw, 54px)' }}
                    >
                        BORN IN
                    </h2>
                    <h2
                        className="font-black leading-[0.9] mb-6"
                        style={{
                            fontSize: 'clamp(34px, 5vw, 54px)',
                            background: 'linear-gradient(90deg, #FF0080, #9D00FF)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        NEWARK, NJ
                    </h2>
                    <p className="text-sm text-[#A89BBE] leading-relaxed">
                        Jersey Club is a high-energy, bass-heavy dance music genre that originated in Newark,
                        New Jersey in the early 2000s. It blends elements of Baltimore Club, house music, and
                        hip-hop into a uniquely infectious sound.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.55, delay: 0.1 }}
                >
                    <p className="text-sm text-[#A89BBE] leading-relaxed mb-4">
                        Pioneered by DJs and producers like DJ Tameil, DJ Sliink, Nadus, Brick Bandits, and Tim Dolla,
                        the genre exploded on platforms like Vine and TikTok — becoming the soundtrack of
                        viral dance challenges worldwide.
                    </p>
                    <p className="text-sm text-[#A89BBE] leading-relaxed">
                        Today, Jersey Club influences mainstream pop, hip-hop, and electronic music globally.
                        Jersey Club Radio is your 24/7 home for all of it.
                    </p>
                </motion.div>
            </div>

            {/* Trait cards 2×2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {TRAITS.map((t, i) => (
                    <motion.div
                        key={t.label}
                        className="rounded-xl p-4 border transition-all"
                        style={{
                            background: 'rgba(157, 0, 255, 0.04)',
                            borderColor: 'rgba(157, 0, 255, 0.13)',
                        }}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.08, duration: 0.4 }}
                        whileHover={{
                            borderColor: 'rgba(157, 0, 255, 0.38)',
                            background: 'rgba(157, 0, 255, 0.08)',
                            y: -2,
                        }}
                    >
                        <div className="flex items-start gap-3">
                            <span
                                className="w-1.5 h-1.5 rounded-full bg-[#9D00FF] mt-2 flex-shrink-0"
                                style={{ boxShadow: '0 0 6px #9D00FF' }}
                            />
                            <div>
                                <p className="text-sm font-bold text-white mb-0.5">{t.label}</p>
                                <p className="text-xs text-[#7B6F90]">{t.desc}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
}

/* ─── PLATFORM CARDS ─────────────────────────────────────────────── */

function PlatformCards() {
    return (
        <div className="grid md:grid-cols-2 gap-4 pb-4">
            <motion.div
                className="rounded-2xl p-6 border"
                style={{
                    background: 'linear-gradient(135deg, rgba(157,0,255,0.09) 0%, rgba(10,0,24,0.8) 100%)',
                    borderColor: 'rgba(157, 0, 255, 0.18)',
                }}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45 }}
            >
                <div className="flex items-center gap-2 mb-3">
                    <Headphones className="w-4 h-4 text-[#9D00FF]" />
                    <span className="text-[10px] font-bold text-[#9D00FF] tracking-[0.22em]">WHAT WE PLAY</span>
                </div>
                <p className="text-sm text-[#A89BBE] leading-relaxed mb-3">
                    Classic anthems, the latest releases, DJ bootlegs, remixes, and exclusives —
                    curated and streamed around the clock.
                </p>
                <p className="text-sm font-bold text-[#C084FC]">
                    The only station 100% dedicated to Jersey Club.
                </p>
            </motion.div>

            <motion.div
                className="rounded-2xl p-6 border"
                style={{
                    background: 'linear-gradient(135deg, rgba(255,0,128,0.07) 0%, rgba(10,0,24,0.8) 100%)',
                    borderColor: 'rgba(255, 0, 128, 0.18)',
                }}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.1 }}
            >
                <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-4 h-4 text-[#FF0080]" />
                    <span className="text-[10px] font-bold text-[#FF0080] tracking-[0.22em]">LISTEN ANYWHERE</span>
                </div>
                <p className="text-sm text-[#A89BBE] leading-relaxed mb-3">
                    Any device, no download, no account. Visit{' '}
                    <a href="https://jerseyclubradio.com" className="text-[#C084FC] hover:text-[#E0AAFF] underline transition-colors">
                        jerseyclubradio.com
                    </a>{' '}
                    and hit play — it's that simple.
                </p>
                <p className="text-sm font-bold text-[#FF8AC0]">
                    365 days a year. Always free.
                </p>
            </motion.div>
        </div>
    );
}

/* ─── FEATURES GRID ──────────────────────────────────────────────── */

const FEATURES = [
    { icon: MessageCircle, label: 'Live Chat', desc: 'Connect with listeners in real time', accent: '#9D00FF' },
    { icon: Users, label: 'Dance Videos', desc: 'Latest Jersey Club dance content', accent: '#FF0080' },
    { icon: Gamepad2, label: 'Game Hub', desc: 'Spades, Blackjack, Chess & more', accent: '#9D00FF' },
    { icon: Mic2, label: 'Beat Maker', desc: 'Create Jersey Club beats in-browser', accent: '#FF0080' },
    { icon: Disc3, label: 'New Releases', desc: 'Freshest drops in the genre', accent: '#9D00FF' },
];

function FeaturesGrid() {
    return (
        <section className="py-12 md:py-16">
            <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-[#9D00FF]" />
                <span className="text-[10px] font-bold text-[#9D00FF] tracking-[0.22em]">THE PLATFORM</span>
            </div>
            <h2 className="font-black text-white tracking-tight mb-8" style={{ fontSize: 'clamp(22px, 4vw, 34px)' }}>
                MORE THAN MUSIC
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {FEATURES.map((f, i) => {
                    const Icon = f.icon;
                    const rgb = f.accent === '#9D00FF' ? '157,0,255' : '255,0,128';
                    return (
                        <motion.div
                            key={f.label}
                            className="rounded-xl p-5 border group"
                            style={{
                                background: `rgba(${rgb}, 0.04)`,
                                borderColor: `rgba(${rgb}, 0.12)`,
                            }}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.07, duration: 0.4 }}
                            whileHover={{
                                borderColor: `rgba(${rgb}, 0.38)`,
                                background: `rgba(${rgb}, 0.08)`,
                                y: -3,
                            }}
                        >
                            <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                                style={{ background: `rgba(${rgb}, 0.14)` }}
                            >
                                <Icon className="w-4 h-4" style={{ color: f.accent }} />
                            </div>
                            <p className="font-bold text-white text-sm mb-1">{f.label}</p>
                            <p className="text-xs text-[#7B6F90] leading-relaxed">{f.desc}</p>
                        </motion.div>
                    );
                })}
            </div>
        </section>
    );
}

/* ─── SOCIAL SECTION ─────────────────────────────────────────────── */

const SOCIALS = [
    { label: 'Instagram', sub: '@jerseyclubradio', href: 'https://www.instagram.com/jerseyclubradio/', color: '#E1306C' },
    { label: 'X (Twitter)', sub: '@jerseyclubradio', href: 'https://x.com/jerseyclubradio', color: '#D4D4D4' },
    { label: 'YouTube', sub: '@Jerseyclubradio', href: 'https://www.youtube.com/@Jerseyclubradio', color: '#FF0000' },
    { label: 'TikTok', sub: '@jerseyclubradio', href: 'https://www.tiktok.com/@jerseyclubradio', color: '#69C9D0' },
];

function SocialSection() {
    return (
        <section className="py-12 md:py-16">
            <div className="flex items-center gap-2 mb-2">
                <Disc3 className="w-4 h-4 text-[#9D00FF]" />
                <span className="text-[10px] font-bold text-[#9D00FF] tracking-[0.22em]">STAY CONNECTED</span>
            </div>
            <h2 className="font-black text-white tracking-tight mb-2" style={{ fontSize: 'clamp(22px, 4vw, 34px)' }}>
                FOLLOW US
            </h2>
            <p className="text-sm text-[#5A4F6A] mb-8">Never miss a beat — follow on every platform.</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {SOCIALS.map((s, i) => (
                    <motion.a
                        key={s.label}
                        href={s.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center py-7 px-4 rounded-xl border text-center"
                        style={{
                            background: 'rgba(255,255,255,0.02)',
                            borderColor: 'rgba(255,255,255,0.06)',
                        }}
                        initial={{ opacity: 0, scale: 0.92 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.09, duration: 0.38 }}
                        whileHover={{
                            borderColor: s.color + '55',
                            background: s.color + '0D',
                            y: -4,
                        }}
                    >
                        <p className="text-sm font-bold text-white">{s.label}</p>
                        <p
                            className="text-[10px] font-semibold mt-1"
                            style={{
                                background: 'linear-gradient(90deg, #FF0080, #9D00FF)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                backgroundClip: 'text',
                            }}
                        >
                            {s.sub}
                        </p>
                    </motion.a>
                ))}
            </div>
        </section>
    );
}

/* ─── FAQ ─────────────────────────────────────────────────────────── */

const FAQS = [
    {
        q: 'What is Jersey Club Radio?',
        a: 'Jersey Club Radio is a free 24/7 online radio station dedicated exclusively to Jersey Club music — the fast-paced, bass-heavy dance genre from New Jersey. Stream live at JerseyClubRadio.com.',
    },
    {
        q: 'How can I listen?',
        a: 'Visit JerseyClubRadio.com on any device — desktop, mobile, or tablet — and hit play. No sign-up required, works everywhere, always free.',
    },
    {
        q: 'What music does it play?',
        a: 'Jersey Club music at 130–140 BPM — chopped vocal samples, heavy kick patterns, and remixes of hip-hop and R&B tracks from the best New Jersey DJs and producers.',
    },
    {
        q: 'Is it really free?',
        a: 'Yes. No subscription, no account, no ads interrupted playback — just visit JerseyClubRadio.com and start listening instantly.',
    },
];

function FAQSection() {
    const [open, setOpen] = useState<number | null>(null);

    return (
        <section className="py-12 md:py-16">
            <div className="flex items-center gap-2 mb-2">
                <Radio className="w-4 h-4 text-[#9D00FF]" />
                <span className="text-[10px] font-bold text-[#9D00FF] tracking-[0.22em]">FAQ</span>
            </div>
            <h2 className="font-black text-white tracking-tight mb-8" style={{ fontSize: 'clamp(22px, 4vw, 34px)' }}>
                GOT QUESTIONS?
            </h2>

            <div className="space-y-2">
                {FAQS.map((f, i) => {
                    const isOpen = open === i;
                    return (
                        <motion.div
                            key={i}
                            className="rounded-xl overflow-hidden border transition-colors"
                            style={{ borderColor: isOpen ? 'rgba(157,0,255,0.32)' : 'rgba(255,255,255,0.06)' }}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.08, duration: 0.38 }}
                        >
                            <button
                                className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
                                style={{ background: isOpen ? 'rgba(157,0,255,0.08)' : 'rgba(255,255,255,0.02)' }}
                                onClick={() => setOpen(isOpen ? null : i)}
                            >
                                <span className="text-sm font-bold text-white pr-4">{f.q}</span>
                                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                    <ChevronDown className="w-4 h-4 text-[#9D00FF] flex-shrink-0" />
                                </motion.div>
                            </button>
                            <AnimatePresence initial={false}>
                                {isOpen && (
                                    <motion.div
                                        key="answer"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.22 }}
                                        style={{ overflow: 'hidden' }}
                                    >
                                        <p className="px-5 pb-5 pt-1 text-sm text-[#A89BBE] leading-relaxed">{f.a}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>
        </section>
    );
}

/* ─── CTA BLOCK ──────────────────────────────────────────────────── */

function CTABlock() {
    return (
        <motion.div
            className="relative text-center py-16 md:py-20 rounded-3xl border overflow-hidden mb-8"
            style={{
                background: 'linear-gradient(135deg, rgba(157,0,255,0.1) 0%, rgba(255,0,128,0.06) 100%)',
                borderColor: 'rgba(157,0,255,0.2)',
            }}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
        >
            {/* Soft glow blob */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(157,0,255,0.12), transparent)',
                }}
            />
            <h2
                className="font-black text-white tracking-tight mb-3 relative z-10"
                style={{ fontSize: 'clamp(26px, 5vw, 46px)' }}
            >
                READY TO TUNE IN?
            </h2>
            <p className="text-sm text-[#7B6F90] mb-9 relative z-10">
                No signup. No cost. Just Jersey Club, 24/7.
            </p>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="relative z-10 inline-block">
                <Link
                    to="/"
                    className="inline-flex items-center gap-2.5 px-9 py-4 rounded-full font-black text-sm text-white"
                    style={{
                        background: 'linear-gradient(135deg, #9D00FF 0%, #FF0080 100%)',
                        boxShadow: '0 0 36px rgba(157,0,255,0.45), 0 0 72px rgba(157,0,255,0.18)',
                        letterSpacing: '0.06em',
                    }}
                >
                    <Radio className="w-4 h-4" />
                    START LISTENING NOW
                </Link>
            </motion.div>
        </motion.div>
    );
}

/* ─── FOOTER ─────────────────────────────────────────────────────── */

function PageFooter() {
    return (
        <footer className="border-t border-white/[0.06]">
            <div className="max-w-[880px] mx-auto px-5 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-xs text-[#3B2F50]">© 2026 Jersey Club Radio 24/7. All rights reserved.</p>
                <div className="flex gap-4">
                    <Link to="/terms" className="text-xs text-[#9D00FF] hover:text-[#C084FC] transition-colors font-semibold">
                        Terms of Service
                    </Link>
                    <Link to="/privacy" className="text-xs text-[#9D00FF] hover:text-[#C084FC] transition-colors font-semibold">
                        Privacy Policy
                    </Link>
                </div>
            </div>
        </footer>
    );
}
