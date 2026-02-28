import { Link } from 'react-router';
import { ArrowLeft, AlertTriangle, CheckCircle2, Key, CreditCard, HelpCircle } from 'lucide-react';
import logoImg from "figma:asset/68b646f3633b265a1c7a40fc0fe58afec9893e27.png";

const EFFECTIVE_DATE = 'February 24, 2026';

export function RefundPolicy() {
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
      <main className="max-w-[800px] mx-auto px-6 py-12 space-y-10">

        {/* Title */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="w-4 h-4" style={{ color: '#C084FC' }} />
            <span className="text-[10px] font-mono tracking-[0.25em] text-[#C084FC] uppercase">Refund Policy</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight mb-2">
            REFUND &amp;{' '}
            <span style={{ background: 'linear-gradient(90deg,#bf953f,#fcf6ba,#b38728)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              CANCELLATION
            </span>
            {' '}POLICY
          </h1>
          <p className="text-sm font-mono text-[#4B3F60]">Effective {EFFECTIVE_DATE}</p>
        </div>

        {/* TL;DR box */}
        <div
          className="rounded-2xl p-5 flex gap-4"
          style={{
            background: 'linear-gradient(135deg, #0f001e 0%, #180030 100%)',
            border: '1px solid rgba(157,0,255,0.25)',
            boxShadow: '0 0 30px rgba(157,0,255,0.05)',
          }}
        >
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-white mb-1 tracking-wide">IMPORTANT — READ BEFORE PURCHASING</p>
            <p className="text-[11px] font-mono text-[#7B6F90] leading-relaxed">
              The 24K Crate Digger upgrade is a <span className="text-white font-semibold">digital product that activates instantly</span> upon payment. Because access is granted immediately and cannot be "returned," <span className="text-amber-300 font-semibold">all sales are final and non-refundable</span> except as required by applicable law.
            </p>
          </div>
        </div>

        {/* Sections */}
        <section className="space-y-3">
          <SectionTitle icon={CheckCircle2} color="#C084FC">§1 — General Policy</SectionTitle>
          <div className="rounded-xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <PolicyRow label="No Refunds on Digital Goods">
              Jersey Club Radio sells a one-time digital license ($7.99 USD). Once purchased, the 24K Gold status and Secret Recovery Key are activated on your device fingerprint immediately. Due to this instant digital delivery, we do not offer refunds under normal circumstances.
            </PolicyRow>
            <PolicyRow label="No Subscriptions to Cancel">
              There are no recurring charges. Your $7.99 is a single one-time payment. There is nothing to "cancel."
            </PolicyRow>
            <PolicyRow label="Billing Errors">
              If you were charged an incorrect amount due to a technical error, contact us and we will investigate and correct the overcharge promptly.
            </PolicyRow>
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle icon={CheckCircle2} color="#C084FC">§2 — Exceptions We May Consider</SectionTitle>
          <div className="rounded-xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <PolicyRow label="Double Charge">
              If you were charged twice for the same purchase due to a payment processor error, we will refund the duplicate charge in full.
            </PolicyRow>
            <PolicyRow label="Non-Delivery">
              If you completed payment and your 24K Gold status and Secret Key were never activated (verifiable on our end), we will either activate your access or issue a full refund.
            </PolicyRow>
            <PolicyRow label="Statutory Rights">
              Nothing in this policy limits your statutory consumer rights under applicable law. If you are in the EU, UK, or another jurisdiction with mandatory cooling-off rights for digital purchases, we will honour those rights where legally required. Note: statutory digital cooling-off periods typically do not apply where digital content has already been accessed.
            </PolicyRow>
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle icon={AlertTriangle} color="#fb923c">§3 — Chargebacks &amp; Disputes</SectionTitle>
          <div
            className="rounded-xl p-5 space-y-3"
            style={{ background: 'rgba(251,146,60,0.05)', border: '1px solid rgba(251,146,60,0.18)' }}
          >
            <PolicyRow label="Fraudulent Chargebacks">
              Filing a chargeback without first contacting us is a breach of these terms. Verified fraudulent chargebacks will result in immediate and permanent revocation of your 24K Gold status and Secret Key, without refund.
            </PolicyRow>
            <PolicyRow label="Dispute Resolution">
              Before initiating any payment dispute, please contact us. We resolve billing issues quickly and prefer to fix problems directly rather than through card networks.
            </PolicyRow>
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle icon={Key} color="#C084FC">§4 — Secret Key &amp; Access Responsibility</SectionTitle>
          <div className="rounded-xl p-5 space-y-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <PolicyRow label="Lost Secret Key">
              We cannot recover a lost Secret Key and do not issue refunds for lost keys. Keep your key backed up in a password manager or other secure location.
            </PolicyRow>
            <PolicyRow label="Cleared Browser Data">
              If you clear your browser's LocalStorage/cookies, your device fingerprint resets. This does not constitute grounds for a refund — use your Secret Key to restore access on any device.
            </PolicyRow>
            <PolicyRow label="Device Change">
              Your purchase follows your Secret Key, not a specific device. Use your key to claim 24K status on any new device at no additional cost.
            </PolicyRow>
          </div>
        </section>

        <section className="space-y-3">
          <SectionTitle icon={HelpCircle} color="#C084FC">§5 — How to Contact Us</SectionTitle>
          <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[11px] font-mono text-[#5B4F70] leading-relaxed">
              For billing issues, refund requests, or any payment-related concerns, please use the in-app{' '}
              <Link to="/chat" className="text-[#C084FC] hover:text-[#E0AAFF] underline underline-offset-2 transition-colors">
                Chat
              </Link>{' '}
              or reach us via the contact information provided at the time of your Paddle purchase receipt. Please include your <span className="text-white font-semibold">Paddle transaction ID</span> in any refund request so we can locate your transaction quickly.
            </p>
            <p className="text-[11px] font-mono text-[#3B2F50] leading-relaxed mt-3">
              We aim to respond to all billing inquiries within <span className="text-white">2 business days</span>.
            </p>
          </div>
        </section>

        {/* Related links */}
        <div className="flex flex-wrap gap-3 pt-4 border-t border-white/[0.05]">
          <span className="text-[10px] font-mono text-[#3B2F50]">Related:</span>
          {[
            { to: '/pricing', label: 'Pricing' },
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

// ── Sub-components ──────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, color, children }: { icon: React.ElementType; color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
      <h2 className="text-[10px] font-black font-mono tracking-[0.2em] text-[#3B2F50] uppercase">{children}</h2>
    </div>
  );
}

function PolicyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pb-3 border-b border-white/[0.04] last:border-0 last:pb-0">
      <p className="text-[11px] font-black text-[#C084FC] mb-1 font-mono">{label}</p>
      <p className="text-[11px] font-mono text-[#5B4F70] leading-relaxed">{children}</p>
    </div>
  );
}
