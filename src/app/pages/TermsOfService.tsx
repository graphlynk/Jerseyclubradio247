import { Link } from 'react-router';
import { ArrowLeft, Radio, Shield } from 'lucide-react';
import logoImg from "../../assets/68b646f3633b265a1c7a40fc0fe58afec9893e27.png";

export function TermsOfService() {
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

      {/* Content */}
      <main className="max-w-[800px] mx-auto px-6 py-10 md:py-16">
        {/* Title */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-5 h-5 text-[#9D00FF]" />
            <span className="text-[10px] font-bold text-[#9D00FF] tracking-[0.2em] uppercase">Legal</span>
          </div>
          <h1
            className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2"
            style={{ fontFamily: "'Archivo', sans-serif" }}
          >
            TERMS OF SERVICE
          </h1>
          <p className="text-sm text-[#7B6F90]">
            Last updated: February 22, 2026 &middot; The "Culture Code"
          </p>
        </div>

        {/* TL;DR Box */}
        <div
          className="rounded-2xl p-5 md:p-6 mb-10 border border-[#9D00FF]/15"
          style={{
            background: 'linear-gradient(135deg, rgba(157, 0, 255, 0.06) 0%, rgba(10, 0, 24, 0.8) 100%)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">⚡</span>
            <h3 className="text-sm font-bold text-[#E0AAFF] tracking-wide uppercase">TL;DR</h3>
          </div>
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2.5 text-sm text-[#C084FC]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9D00FF] mt-1.5 flex-shrink-0" />
              <span>We curate the culture — all music is streamed via third-party APIs. We don't own the audio.</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm text-[#C084FC]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9D00FF] mt-1.5 flex-shrink-0" />
              <span>Cheating in games (Spades, Blackjack, Chess) means a permanent IP block from the gaming arena.</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm text-[#C084FC]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9D00FF] mt-1.5 flex-shrink-0" />
              <span>All digital VIP purchases are final and tied to your device fingerprint.</span>
            </li>
          </ul>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          <Section title="1. Ownership & Content">
            <p>
              All music available on Jersey Club Radio 24/7 is streamed via third-party APIs, including YouTube
              and SoundCloud. We do not own, host, or claim any rights to the audio content. We curate the
              culture — aggregating and presenting Jersey Club music in a seamless 24/7 radio experience.
            </p>
            <p>
              All trademarks, logos, and brand elements associated with Jersey Club Radio 24/7 are the property
              of Jersey Club Radio and may not be reproduced or used without prior written consent.
            </p>
          </Section>

          <Section title="2. Gaming Conduct">
            <p>
              The Jersey Club Radio Game Hub — including Spades, Blackjack, Chess, Checkers, Crossword, and
              Beat Maker — is provided for entertainment purposes. We use IP-based tracking and browser
              fingerprinting to maintain fair play and ensure game integrity.
            </p>
            <p>
              Any form of cheating, exploitation of bugs, use of automated bots, or manipulation of game
              mechanics will result in a <strong className="text-white">permanent IP block</strong> from the
              entire gaming arena. This decision is final and non-negotiable.
            </p>
          </Section>

          <Section title="3. Merchandise & Digital Purchases">
            <p>
              All merchandise purchases — including physical items from "The Foundation Collection" and digital
              VIP upgrades such as Golden Names, Playlist Crates, and exclusive access tiers — are processed
              securely via Paddle (Merchant of Record).
            </p>
            <p>
              Digital VIP upgrades are <strong className="text-white">final sale</strong> and are permanently
              tied to your Secret Key or browser fingerprint. Physical merchandise is subject to our standard
              return and exchange policy as outlined at the time of purchase.
            </p>
          </Section>

          <Section title="4. User Conduct">
            <p>
              By using Jersey Club Radio, you agree to conduct yourself respectfully within all community
              features, including the Live Chat. Hate speech, harassment, spam, and any illegal activity are
              strictly prohibited and may result in an immediate and permanent ban.
            </p>
          </Section>

          <Section title="5. Limitation of Liability">
            <p>
              Jersey Club Radio 24/7 is provided "as is" without warranties of any kind. We are not liable for
              any interruptions in service, data loss, or third-party content availability. Use of this platform
              is at your own risk.
            </p>
          </Section>

          <Section title="6. Changes to Terms">
            <p>
              We reserve the right to update these Terms of Service at any time. Continued use of the platform
              after changes are posted constitutes acceptance of the revised terms. We encourage you to review
              this page periodically.
            </p>
          </Section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#3B2F50]">
            &copy; 2026 Jersey Club Radio 24/7. All rights reserved.
          </p>
          <Link
            to="/privacy"
            className="text-xs text-[#9D00FF] hover:text-[#C084FC] transition-colors font-semibold"
          >
            Read our Privacy Policy &rarr;
          </Link>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3
        className="text-base font-bold text-white mb-3 tracking-wide uppercase"
        style={{ fontFamily: "'Archivo', sans-serif" }}
      >
        {title}
      </h3>
      <div className="space-y-3 text-sm text-[#A89BBE] leading-relaxed">
        {children}
      </div>
    </section>
  );
}
