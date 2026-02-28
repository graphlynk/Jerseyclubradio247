import { Link } from 'react-router';
import { ArrowLeft, Lock } from 'lucide-react';
import logoImg from "figma:asset/68b646f3633b265a1c7a40fc0fe58afec9893e27.png";

export function PrivacyPolicy() {
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
            <Lock className="w-5 h-5 text-[#9D00FF]" />
            <span className="text-[10px] font-bold text-[#9D00FF] tracking-[0.2em] uppercase">Legal</span>
          </div>
          <h1
            className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2"
            style={{ fontFamily: "'Archivo', sans-serif" }}
          >
            PRIVACY POLICY
          </h1>
          <p className="text-sm text-[#7B6F90]">
            Last updated: February 22, 2026 &middot; The "Privacy-First" Promise
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
            <span className="text-lg">🔒</span>
            <h3 className="text-sm font-bold text-[#E0AAFF] tracking-wide uppercase">TL;DR</h3>
          </div>
          <ul className="space-y-2.5">
            <li className="flex items-start gap-2.5 text-sm text-[#C084FC]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9D00FF] mt-1.5 flex-shrink-0" />
              <span>No logins required — we use your browser fingerprint only to save game progress and playlists.</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm text-[#C084FC]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9D00FF] mt-1.5 flex-shrink-0" />
              <span>All payments are handled securely by Paddle — we never see or store your card details.</span>
            </li>
            <li className="flex items-start gap-2.5 text-sm text-[#C084FC]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9D00FF] mt-1.5 flex-shrink-0" />
              <span>We do not sell your data. Period. It's only used to improve your listening experience.</span>
            </li>
          </ul>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          <Section title="1. No Logins Required">
            <p>
              We don't want your password. Jersey Club Radio operates on a privacy-first model that requires
              zero account creation. We only use your browser's "fingerprint" — a combination of device and
              browser attributes — to ensure your Spades wins, game progress, and Playlist Crates are there
              when you return.
            </p>
            <p>
              This fingerprint is a non-reversible identifier. It cannot be used to determine your name,
              address, email, or any personally identifiable information.
            </p>
          </Section>

          <Section title="2. Data Collection">
            <p>
              We collect minimal data to operate the platform effectively:
            </p>
            <ul className="list-none space-y-2 mt-2">
              <li className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[#7B6F90] mt-2 flex-shrink-0" />
                <span><strong className="text-white">Browser Fingerprint:</strong> Used to maintain game state, playlist preferences, and VIP purchase verification.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[#7B6F90] mt-2 flex-shrink-0" />
                <span><strong className="text-white">IP Address:</strong> Used for fair play enforcement in the Game Hub and regional analytics.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[#7B6F90] mt-2 flex-shrink-0" />
                <span><strong className="text-white">Usage Analytics:</strong> We use Google Analytics to understand listening patterns and improve the 24/7 experience.</span>
              </li>
            </ul>
          </Section>

          <Section title="3. Payment Security">
            <p>
              All payments for merchandise, flyers, and digital VIP upgrades are handled securely via{' '}
              <strong className="text-white">Paddle</strong>, a global Merchant of Record and PCI-DSS compliant payment processor.
              We never see, process, or store your credit card information. All transaction data remains
              encrypted and within Paddle's secure infrastructure.
            </p>
          </Section>

          <Section title="4. Data Usage">
            <p>
              We do not sell your data. We do not share your data with third-party advertisers. The data
              we collect is used exclusively to:
            </p>
            <ul className="list-none space-y-2 mt-2">
              <li className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[#7B6F90] mt-2 flex-shrink-0" />
                <span>Maintain your game progress and playlist preferences across sessions.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[#7B6F90] mt-2 flex-shrink-0" />
                <span>Enforce fair play and anti-cheating measures in the Game Hub.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[#7B6F90] mt-2 flex-shrink-0" />
                <span>Improve the overall 24/7 listening experience through anonymized analytics.</span>
              </li>
            </ul>
          </Section>

          <Section title="5. Cookies & Local Storage">
            <p>
              We use browser cookies and localStorage to save your preferences, including:
            </p>
            <ul className="list-none space-y-2 mt-2">
              <li className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[#7B6F90] mt-2 flex-shrink-0" />
                <span>Spades game progress and win/loss records.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[#7B6F90] mt-2 flex-shrink-0" />
                <span>Playlist queue order and playback preferences.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[#7B6F90] mt-2 flex-shrink-0" />
                <span>Consent banner dismissal status.</span>
              </li>
            </ul>
            <p>
              You may clear these at any time through your browser settings, though doing so will reset your
              game progress and preferences.
            </p>
          </Section>

          <Section title="6. Third-Party Services">
            <p>
              Jersey Club Radio integrates with the following third-party services, each governed by their own
              privacy policies:
            </p>
            <ul className="list-none space-y-2 mt-2">
              <li className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[#7B6F90] mt-2 flex-shrink-0" />
                <span><strong className="text-white">YouTube API Services</strong> — Subject to the <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer" className="text-[#C084FC] hover:text-[#E0AAFF] underline underline-offset-2 transition-colors">YouTube Terms of Service</a> and <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#C084FC] hover:text-[#E0AAFF] underline underline-offset-2 transition-colors">Google Privacy Policy</a>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[#7B6F90] mt-2 flex-shrink-0" />
                <span><strong className="text-white">SoundCloud</strong> — Subject to SoundCloud's Terms of Use and Privacy Policy.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[#7B6F90] mt-2 flex-shrink-0" />
                <span><strong className="text-white">Paddle</strong> — Subject to the <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-[#C084FC] hover:text-[#E0AAFF] underline underline-offset-2 transition-colors">Paddle Privacy Policy</a>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1 h-1 rounded-full bg-[#7B6F90] mt-2 flex-shrink-0" />
                <span><strong className="text-white">Google Analytics</strong> — Subject to the <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-[#C084FC] hover:text-[#E0AAFF] underline underline-offset-2 transition-colors">Google Privacy Policy</a>.</span>
              </li>
            </ul>
          </Section>

          <Section title="7. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. Any changes will be reflected on this page
              with an updated "Last updated" date. Continued use of Jersey Club Radio after changes are posted
              constitutes acceptance of the revised policy.
            </p>
          </Section>

          <Section title="8. Contact">
            <p>
              If you have any questions about this Privacy Policy or how your data is handled, reach out to us
              through our Live Chat or via the community channels listed on the platform.
            </p>
          </Section>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[#3B2F50]">
            &copy; 2026 Jersey Club Radio 24/7. All rights reserved.
          </p>
          <Link
            to="/terms"
            className="text-xs text-[#9D00FF] hover:text-[#C084FC] transition-colors font-semibold"
          >
            Read our Terms of Service &rarr;
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
