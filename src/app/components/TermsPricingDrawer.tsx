import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, ChevronRight, Shield, Key, Infinity, CreditCard,
  Fingerprint, AlertTriangle, Star, CheckCircle2, Radio
} from 'lucide-react';

interface TermsPricingDrawerProps {
  open: boolean;
  onClose: () => void;
}

const EFFECTIVE_DATE = 'February 24, 2026';

export function TermsPricingDrawer({ open, onClose }: TermsPricingDrawerProps) {
  const [section, setSection] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  // Reset checkbox each time drawer opens fresh from auto-trigger
  useEffect(() => {
    if (open) setAgreed(false);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Panel — slides in from right on desktop, full-screen on mobile */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 z-[201] w-full md:max-w-[520px] flex flex-col overflow-hidden"
            style={{
              background: 'linear-gradient(170deg, #080015 0%, #0c001f 40%, #07000f 100%)',
              borderLeft: '1px solid rgba(157,0,255,0.2)',
              boxShadow: '-12px 0 80px rgba(0,0,0,0.9), -2px 0 30px rgba(157,0,255,0.08)',
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={e => e.stopPropagation()}
          >
            {/* Gold top strip */}
            <div className="h-[3px] flex-shrink-0" style={{ background: 'linear-gradient(90deg, transparent 0%, #bf953f 20%, #fcf6ba 50%, #b38728 80%, transparent 100%)' }} />

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="px-6 pt-6 pb-10 space-y-5">

                {/* ── HEADER ─────────────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Radio className="w-4 h-4" style={{ color: '#C084FC' }} />
                      <span className="text-[10px] font-mono tracking-[0.25em] text-[#C084FC] uppercase" style={{ textShadow: '0 0 8px #C084FC60' }}>
                        JERSEY CLUB RADIO
                      </span>
                    </div>
                    <h1 className="text-xl font-black text-white leading-tight tracking-tight">
                      TERMS, PRIVACY<br />
                      <span style={{ background: 'linear-gradient(90deg, #bf953f, #fcf6ba, #b38728)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        &amp; PRICING
                      </span>
                    </h1>
                    <p className="text-[11px] font-mono text-[#4B3F60] mt-1">
                      Effective {EFFECTIVE_DATE} · Please review before entering
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="mt-1 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:bg-white/10"
                    style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                    aria-label="Close"
                  >
                    <X className="w-4 h-4 text-[#5B4F70]" />
                  </button>
                </div>

                {/* ── QUICK-GLANCE SUMMARY CARDS ────────────────────────── */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Pricing card */}
                  <div
                    className="col-span-2 rounded-2xl p-4 relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #100020 0%, #180035 100%)',
                      border: '1px solid rgba(191,149,63,0.35)',
                      boxShadow: '0 0 24px rgba(191,149,63,0.06)',
                    }}
                  >
                    {/* shimmer sweep */}
                    <div
                      className="absolute inset-0 pointer-events-none rounded-2xl"
                      style={{
                        background: 'linear-gradient(105deg, transparent 40%, rgba(252,246,186,0.06) 50%, transparent 60%)',
                        animation: 'shimmerSlide 5s linear infinite',
                      }}
                    />
                    <div className="relative flex items-center justify-between gap-4">
                      <div>
                        <span
                          className="text-[9px] font-black font-mono tracking-[0.2em] px-2 py-0.5 rounded-full"
                          style={{ background: 'linear-gradient(90deg,#bf953f,#fcf6ba)', color: '#2a1000' }}
                        >
                          24K CRATE DIGGER
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-2">
                          <span
                            className="text-3xl font-black"
                            style={{ background: 'linear-gradient(135deg,#bf953f,#fcf6ba)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                          >
                            $7.99
                          </span>
                          <span className="text-xs font-mono text-[#7B6F90]">one-time</span>
                        </div>
                        <p className="text-[10px] font-mono text-[#4B3F60] mt-0.5">Lifetime access · No subscription</p>
                      </div>
                      <Star className="w-10 h-10 flex-shrink-0 opacity-30" style={{ color: '#fcf6ba' }} />
                    </div>
                  </div>

                  {/* What you get */}
                  {[
                    { icon: Infinity, label: 'Unlimited\nCrate Saves', color: '#C084FC' },
                    { icon: Key, label: 'Secret\nRecovery Key', color: '#C084FC' },
                    { icon: Star, label: '24K Gold\nVinyl Status', color: '#fcf6ba' },
                    { icon: Shield, label: 'No Login\nRequired', color: '#C084FC' },
                  ].map(({ icon: Icon, label, color }) => (
                    <div
                      key={label}
                      className="rounded-xl p-3 flex flex-col items-center text-center gap-1.5"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <Icon className="w-4 h-4" style={{ color }} />
                      <span className="text-[10px] font-mono text-[#7B6F90] leading-tight whitespace-pre-line">{label}</span>
                    </div>
                  ))}
                </div>

                {/* ── KEY NOTICES ───────────────────────────────────────── */}
                <div className="space-y-2.5">
                  <p className="text-[10px] font-mono text-[#3B2F50] uppercase tracking-widest">Key Notices</p>

                  <Notice icon={Fingerprint} color="rgba(192,132,252,0.15)" border="rgba(192,132,252,0.25)" iconColor="#C084FC">
                    <span className="text-white font-semibold">No-Login Identity:</span>{' '}
                    <span className="text-[#7B6F90]">We identify you using a <strong className="text-[#C084FC]">device fingerprint</strong> — not your email or name. We never store personal data.</span>
                  </Notice>

                  <Notice icon={AlertTriangle} color="rgba(251,146,60,0.08)" border="rgba(251,146,60,0.2)" iconColor="#fb923c">
                    <span className="text-white font-semibold">Secret Key Warning:</span>{' '}
                    <span className="text-[#7B6F90]">Your <strong className="text-amber-300">J-CLUB-XXXX</strong> key is the <em>only</em> way to restore 24K access on a new device. There is no email reset. Save it somewhere safe.</span>
                  </Notice>

                  <Notice icon={CreditCard} color="rgba(157,0,255,0.08)" border="rgba(157,0,255,0.2)" iconColor="#9D00FF">
                    <span className="text-white font-semibold">Payment:</span>{' '}
                    <span className="text-[#7B6F90]">All transactions processed by <strong className="text-white">Paddle</strong> (Merchant of Record, global tax handled). We never see your card. All digital sales are <strong className="text-white">final</strong>.</span>
                  </Notice>

                  <Notice icon={CheckCircle2} color="rgba(0,255,136,0.06)" border="rgba(0,255,136,0.15)" iconColor="#00FF88">
                    <span className="text-white font-semibold">Cookies &amp; Storage:</span>{' '}
                    <span className="text-[#7B6F90]">We use LocalStorage to save your crate, game progress, and playback history. No cross-site tracking. No ads.</span>
                  </Notice>
                </div>

                {/* ── FULL LEGAL ACCORDION ──────────────────────────────── */}
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-[#3B2F50] uppercase tracking-widest">Full Legal Docs</p>

                  <Section id="what" icon={Infinity} title="§1 — WHAT YOU'RE BUYING" active={section} setActive={setSection}>
                    <p className="mb-3">By completing a 24K Crate Digger purchase, you receive a <span className="text-white font-semibold">single, non-transferable, lifetime license</span> to:</p>
                    <ul className="space-y-2">
                      {[
                        ['Unlimited Crate Storage', 'The default 7-track save limit is permanently removed for your device fingerprint.'],
                        ['Gold Vinyl Status', 'Your saved records display animated 24K Gold Vinyl art throughout the platform.'],
                        ['Gold Identity in Game Hub', 'Your username appears in gold in Spades, Chess, Checkers, and all multiplayer games.'],
                        ['Secret Recovery Key', 'A unique key (J-CLUB-XXXX-XXXX-XXXX) is generated and tied to your device fingerprint. Use it to restore 24K status on any new device.'],
                        ['Priority Crate Playback', 'Your saved crate is prioritised in the radio queue rotation.'],
                      ].map(([t, d]) => (
                        <li key={t} className="flex gap-2.5 list-none">
                          <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#C084FC]" />
                          <span><span className="text-white font-semibold">{t}:</span> <span className="text-[#6B5F80]">{d}</span></span>
                        </li>
                      ))}
                    </ul>
                  </Section>

                  <Section id="billing" icon={CreditCard} title="§2 — BILLING TERMS" active={section} setActive={setSection}>
                    <ul className="space-y-3">
                      <LegalItem label="Payment Processor">All transactions processed securely by <span className="text-white">Paddle</span> (Merchant of Record). Jersey Club Radio never stores your card details.</LegalItem>
                      <LegalItem label="Pricing">$7.99 USD, one-time. This rate is locked for the life of your access. Not a subscription.</LegalItem>
                      <LegalItem label="Refund Policy">Due to instant digital activation, all sales are final and non-refundable unless required by applicable law.</LegalItem>
                      <LegalItem label="Chargebacks">Fraudulent chargebacks will result in immediate revocation of 24K Gold status and Secret Key invalidation.</LegalItem>
                    </ul>
                  </Section>

                  <Section id="key" icon={Key} title="§3 — SECRET KEY RESPONSIBILITY" active={section} setActive={setSection}>
                    <div className="flex gap-2.5 p-3 rounded-xl mb-3" style={{ background: 'rgba(255,160,0,0.07)', border: '1px solid rgba(255,160,0,0.2)' }}>
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-amber-300/80 text-xs">Your Secret Key is the <em>only</em> recovery method. There is no email reset.</p>
                    </div>
                    <ul className="space-y-3">
                      <LegalItem label="Your Duty">You are solely responsible for securely saving your Secret Key. We recommend a password manager.</LegalItem>
                      <LegalItem label="Key Loss">Jersey Club Radio cannot recover a lost Secret Key. Your current device fingerprint retains access until browser storage is cleared.</LegalItem>
                      <LegalItem label="Browser Data Clearing">Clearing LocalStorage/cookies resets your fingerprint. Use your Secret Key to re-claim 24K status.</LegalItem>
                      <LegalItem label="Key Transfers">Secret Keys are non-transferable. Sharing your key is a breach of these terms and may result in revocation.</LegalItem>
                    </ul>
                  </Section>

                  <Section id="privacy" icon={Fingerprint} title="§4 — PRIVACY &amp; FINGERPRINTING" active={section} setActive={setSection}>
                    <p className="mb-3">Jersey Club Radio operates a <span className="text-white font-semibold">No-Login, No-Email architecture</span>. We do not collect names, phone numbers, or email addresses.</p>
                    <ul className="space-y-3">
                      <LegalItem label="Device Fingerprinting">We use FingerprintJS to generate a unique anonymous hash of your hardware/software config. This hash is your identity on the platform.</LegalItem>
                      <LegalItem label="What We Store">Your Crate track list, 24K Gold status, and a hashed Secret Key reference. No PII retained.</LegalItem>
                      <LegalItem label="LocalStorage">Your Visitor ID and crate state persist in your browser's LocalStorage. This data is only transmitted to authenticate your vault record on our servers.</LegalItem>
                      <LegalItem label="Payment Data">Paddle handles all payments as Merchant of Record. We receive only a payment confirmation event and a Paddle customer reference ID.</LegalItem>
                      <LegalItem label="Analytics">Aggregate, anonymised listening statistics may be collected for operational purposes. This data cannot be linked to any individual.</LegalItem>
                      <LegalItem label="Your Rights">You may request vault deletion at any time by providing your Secret Key or Visitor ID as proof of ownership.</LegalItem>
                    </ul>
                  </Section>

                  <Section id="security" icon={Shield} title="§5 — PLATFORM SECURITY" active={section} setActive={setSection}>
                    <ul className="space-y-3">
                      <LegalItem label="Encryption">All communication encrypted in transit via TLS 1.2+.</LegalItem>
                      <LegalItem label="Vault Storage">Vault records stored in a serverless KV store isolated per project. Paddle Secret Keys never exposed to the client.</LegalItem>
                      <LegalItem label="Age Requirement">You must be at least 13 years of age (or the minimum digital consent age in your jurisdiction) to make a purchase.</LegalItem>
                    </ul>
                  </Section>
                </div>

                {/* ── GOVERNING LAW NOTE ────────────────────────────────── */}
                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="text-[9px] font-mono text-[#3B2F50] leading-relaxed">
                    These terms constitute the entire agreement between you and Jersey Club Radio. Jersey Club Radio reserves the right to modify these terms with 14 days' notice. Continued use after the notice period constitutes acceptance. Governed by the laws of the State of New Jersey, USA. Effective: {EFFECTIVE_DATE} · v2.0.0
                  </p>
                </div>

                {/* ── AGREE + ENTER CTA ─────────────────────────────────── */}
                <div
                  className="rounded-2xl p-4 space-y-4 sticky bottom-0"
                  style={{
                    background: 'linear-gradient(170deg, #0c001f 0%, #080015 100%)',
                    border: '1px solid rgba(157,0,255,0.25)',
                    boxShadow: '0 -8px 30px rgba(0,0,0,0.6)',
                  }}
                >
                  {/* Checkbox */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div
                      onClick={() => setAgreed(v => !v)}
                      className="mt-0.5 w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all"
                      style={{
                        background: agreed ? 'linear-gradient(135deg,#bf953f,#fcf6ba)' : 'transparent',
                        border: `2px solid ${agreed ? '#bf953f' : 'rgba(157,0,255,0.4)'}`,
                        boxShadow: agreed ? '0 0 10px rgba(191,149,63,0.4)' : 'none',
                      }}
                    >
                      {agreed && <CheckCircle2 className="w-3.5 h-3.5 text-[#2a1000]" />}
                    </div>
                    <span className="text-[11px] font-mono text-[#7B6F90] leading-relaxed group-hover:text-[#9B8FB0] transition-colors">
                      I have read and agree to the{' '}
                      <span className="text-[#C084FC]">Terms &amp; Pricing</span>
                      {' '}and{' '}
                      <span className="text-[#C084FC]">Privacy Policy</span>
                      {' '}above. I understand my Secret Key is my sole recovery method.
                    </span>
                  </label>

                  {/* Enter button */}
                  <motion.button
                    onClick={() => { if (agreed) onClose(); }}
                    disabled={!agreed}
                    className="w-full py-4 rounded-2xl font-black text-sm tracking-widest transition-all relative overflow-hidden"
                    style={{
                      background: agreed
                        ? 'linear-gradient(135deg, #1a0040 0%, #3a0080 50%, #9D00FF 100%)'
                        : 'rgba(255,255,255,0.04)',
                      color: agreed ? '#E0AAFF' : '#3B2F50',
                      border: `1px solid ${agreed ? 'rgba(157,0,255,0.6)' : 'rgba(255,255,255,0.05)'}`,
                      boxShadow: agreed ? '0 0 30px rgba(157,0,255,0.35), 0 0 60px rgba(157,0,255,0.1)' : 'none',
                      textShadow: agreed ? '0 0 12px rgba(224,170,255,0.8)' : 'none',
                      cursor: agreed ? 'pointer' : 'not-allowed',
                    }}
                    whileHover={agreed ? { scale: 1.02 } : {}}
                    whileTap={agreed ? { scale: 0.98 } : {}}
                  >
                    {agreed ? '⚡ I UNDERSTAND — ENTER THE CLUB' : 'CHECK THE BOX TO CONTINUE'}
                  </motion.button>

                  <p className="text-center text-[9px] font-mono text-[#2B2040]">
                    Secured by Paddle · No login required · New Jersey, USA
                  </p>
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface NoticeProps {
  icon: React.ElementType;
  color: string;
  border: string;
  iconColor: string;
  children: React.ReactNode;
}

function Notice({ icon: Icon, color, border, iconColor, children }: NoticeProps) {
  return (
    <div
      className="flex gap-3 p-3 rounded-xl"
      style={{ background: color, border: `1px solid ${border}` }}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: iconColor }} />
      <p className="text-[11px] font-mono leading-relaxed">{children}</p>
    </div>
  );
}

interface SectionProps {
  id: string;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  active: string | null;
  setActive: (id: string | null) => void;
}

function Section({ id, icon: Icon, title, children, active, setActive }: SectionProps) {
  const isOpen = active === id;
  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${isOpen ? 'rgba(157,0,255,0.3)' : 'rgba(255,255,255,0.05)'}`,
      }}
    >
      <button
        onClick={() => setActive(isOpen ? null : id)}
        className="w-full flex items-center gap-3 px-3.5 py-3 text-left transition-all hover:bg-white/[0.03]"
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: isOpen ? 'rgba(157,0,255,0.2)' : 'rgba(255,255,255,0.04)' }}
        >
          <Icon className="w-3 h-3" style={{ color: isOpen ? '#C084FC' : '#4B3F60' }} />
        </div>
        <span
          className="flex-1 text-[9px] font-black font-mono tracking-widest uppercase"
          style={{ color: isOpen ? '#C084FC' : '#4B3F60' }}
          dangerouslySetInnerHTML={{ __html: title }}
        />
        <ChevronRight
          className="w-3.5 h-3.5 flex-shrink-0 transition-transform"
          style={{ color: '#3B2F50', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-3.5 pb-4 pt-1 text-[10px] font-mono text-[#6B5F80] leading-relaxed border-t border-white/[0.04]">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface LegalItemProps {
  label: string;
  children: React.ReactNode;
}

function LegalItem({ label, children }: LegalItemProps) {
  return (
    <li className="flex gap-2 list-none">
      <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0 text-[#5D3FD3]" />
      <span>
        <span className="text-[#C084FC] font-semibold">{label}: </span>
        <span className="text-[#5B4F70]">{children}</span>
      </span>
    </li>
  );
}