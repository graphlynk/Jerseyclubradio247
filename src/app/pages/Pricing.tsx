import { Link } from 'react-router';
import { ArrowLeft, Star, Infinity, Key, Shield, CreditCard, CheckCircle2, Zap } from 'lucide-react';
import logoImg from "../../assets/68b646f3633b265a1c7a40fc0fe58afec9893e27.png";

const EFFECTIVE_DATE = 'February 24, 2026';

export function Pricing() {
  return (
    <div className="min-h-screen" style={{ background: '#06000F' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b border-white/[0.06]"
        style={{
          background: 'rgba(6, 0, 15, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="max-w-[800px] mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
              <img src={logoImg} alt="JCR" className="w-full h-full object-contain" />
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

      {/* Gold top accent */}
      <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, transparent 0%, #bf953f 20%, #fcf6ba 50%, #b38728 80%, transparent 100%)' }} />

      {/* Body */}
      <main className="max-w-[800px] mx-auto px-6 py-12 space-y-12">

        {/* Title */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4" style={{ color: '#C084FC' }} />
            <span className="text-[10px] font-mono tracking-[0.25em] text-[#C084FC] uppercase">Pricing</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight mb-2">
            SIMPLE,{' '}
            <span style={{ background: 'linear-gradient(90deg,#bf953f,#fcf6ba,#b38728)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ONE-TIME
            </span>
            {' '}PRICING
          </h1>
          <p className="text-sm font-mono text-[#4B3F60]">Effective {EFFECTIVE_DATE} · No subscription, ever.</p>
        </div>

        {/* Free vs Paid cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Free tier */}
          <div
            className="rounded-2xl p-6 space-y-4"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div>
              <span className="text-[9px] font-black font-mono tracking-[0.2em] px-2 py-0.5 rounded-full bg-white/10 text-[#7B6F90] uppercase">
                Free
              </span>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-4xl font-black text-white">$0</span>
                <span className="text-xs font-mono text-[#4B3F60]">always free</span>
              </div>
              <p className="text-xs font-mono text-[#4B3F60] mt-1">No login required</p>
            </div>
            <ul className="space-y-2.5">
              {[
                'Full 24/7 Jersey Club radio stream',
                'Save up to 7 tracks in your Crate',
                'Full Game Hub access',
                'Real-time chat',
                'Dance video gallery',
                'Merch store',
              ].map(f => (
                <li key={f} className="flex items-start gap-2.5 text-xs font-mono text-[#6B5F80]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3B2F50] flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* 24K Paid tier */}
          <div
            className="rounded-2xl p-6 space-y-4 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #100020 0%, #1c003a 100%)',
              border: '1px solid rgba(191,149,63,0.4)',
              boxShadow: '0 0 40px rgba(191,149,63,0.06)',
            }}
          >
            {/* shimmer */}
            <div
              className="absolute inset-0 pointer-events-none rounded-2xl"
              style={{
                background: 'linear-gradient(105deg, transparent 40%, rgba(252,246,186,0.05) 50%, transparent 60%)',
                animation: 'shimmerSlide 6s linear infinite',
              }}
            />
            <div className="relative">
              <span
                className="text-[9px] font-black font-mono tracking-[0.2em] px-2 py-0.5 rounded-full"
                style={{ background: 'linear-gradient(90deg,#bf953f,#fcf6ba)', color: '#2a1000' }}
              >
                24K CRATE DIGGER
              </span>
              <div className="flex items-baseline gap-2 mt-3">
                <span
                  className="text-4xl font-black"
                  style={{ background: 'linear-gradient(135deg,#bf953f,#fcf6ba)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                >
                  $7.99
                </span>
                <span className="text-xs font-mono text-[#7B6F90]">one-time · lifetime</span>
              </div>
              <p className="text-xs font-mono text-[#4B3F60] mt-1">No subscription · No login required</p>
            </div>
            <ul className="relative space-y-2.5">
              {[
                ['Everything in Free', true],
                ['Unlimited Crate storage', true],
                ['24K Gold Vinyl record art', true],
                ['Gold username in Game Hub', true],
                ['Secret Recovery Key (J-CLUB-XXXX)', true],
                ['Priority queue rotation', true],
                ['Lifetime rate lock at $7.99', true],
              ].map(([f]) => (
                <li key={f as string} className="flex items-start gap-2.5 text-xs font-mono text-[#A89BBE]">
                  <Star className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: '#fcf6ba' }} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Feature breakdown */}
        <section className="space-y-4">
          <h2 className="text-xs font-black font-mono tracking-[0.2em] text-[#3B2F50] uppercase">What You're Paying For</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              {
                icon: Infinity,
                title: 'Unlimited Crate Saves',
                desc: 'The default 7-track limit is permanently removed for your device fingerprint. Save every banger you find.',
                color: '#C084FC',
              },
              {
                icon: Key,
                title: 'Secret Recovery Key',
                desc: 'A unique J-CLUB-XXXX-XXXX-XXXX key is generated on purchase. Use it to restore 24K status on any device.',
                color: '#C084FC',
              },
              {
                icon: Star,
                title: '24K Gold Vinyl Status',
                desc: 'Your saved records display an animated 24K Gold Vinyl shimmer across the entire platform.',
                color: '#fcf6ba',
              },
              {
                icon: Shield,
                title: 'No Login Ever Required',
                desc: 'Your identity is a device fingerprint — no email, no password, no account creation.',
                color: '#C084FC',
              },
              {
                icon: Zap,
                title: 'Gold Game Hub Identity',
                desc: 'Your username appears in gold in Spades, Chess, Checkers, Blackjack, and all multiplayer leaderboards.',
                color: '#fcf6ba',
              },
              {
                icon: CreditCard,
                title: 'Lifetime Rate Lock',
                desc: 'You pay $7.99 once. Your access never expires and your rate is locked regardless of future price changes.',
                color: '#C084FC',
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="rounded-xl p-4 space-y-2"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color }} />
                  <span className="text-xs font-bold text-white">{title}</span>
                </div>
                <p className="text-[11px] font-mono text-[#5B4F70] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Payment details */}
        <section className="space-y-4">
          <h2 className="text-xs font-black font-mono tracking-[0.2em] text-[#3B2F50] uppercase">Payment Details</h2>
          <div className="rounded-2xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              ['Processor', 'All transactions are handled by Paddle (Merchant of Record, PCI-DSS compliant). Jersey Club Radio never stores your card details.'],
              ['Currency', 'USD. $7.99 is charged once at the time of purchase.'],
              ['Activation', 'Your 24K status and Secret Key activate instantly after payment confirmation — no waiting.'],
              ['Tax', 'Paddle calculates and remits applicable sales tax and VAT globally as Merchant of Record. The displayed price may adjust at checkout based on your region.'],
              ['Receipt', 'A receipt is emailed to you by Paddle if you provide an email at checkout. No other marketing emails will be sent.'],
            ].map(([label, text]) => (
              <div key={label as string} className="flex gap-3 pb-3 border-b border-white/[0.04] last:border-0 last:pb-0">
                <span className="text-[11px] font-black font-mono text-[#C084FC] w-20 flex-shrink-0">{label}</span>
                <span className="text-[11px] font-mono text-[#5B4F70] leading-relaxed">{text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Related links */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-white/[0.05]">
          <span className="text-[10px] font-mono text-[#3B2F50]">Related:</span>
          {[
            { to: '/refund-policy', label: 'Refund Policy' },
            { to: '/terms', label: 'Terms of Service' },
            { to: '/privacy', label: 'Privacy Policy' },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="text-[10px] font-mono text-[#C084FC] hover:text-[#E0AAFF] underline underline-offset-2 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        <p className="text-[9px] font-mono text-[#2B2040]">
          Effective {EFFECTIVE_DATE} · Jersey Club Radio · Governed by the laws of the State of New Jersey, USA
        </p>
      </main>
    </div>
  );
}