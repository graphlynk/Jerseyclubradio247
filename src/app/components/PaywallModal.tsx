import React, { useState, useEffect } from 'react';
import { X, Infinity, Star, ShieldCheck, KeyRound, Zap, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCrateSafe, GUEST_CRATE_LIMIT } from '../context/CrateContext';
import { GoldVinylRecord } from './GoldVinylRecord';
import { TermsPricingDrawer } from './TermsPricingDrawer';

export function PaywallModal() {
  const crate = useCrateSafe();
  const [tab, setTab] = useState<'upgrade' | 'recover'>('upgrade');
  const [secretInput, setSecretInput] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [termsOpen, setTermsOpen] = useState(false);

  // Listen for Paddle checkout.error events surfaced via CrateContext eventCallback
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as string;
      setCheckoutError(detail || 'Paddle checkout error — see browser console for details.');
      setCheckoutLoading(false);
    };
    window.addEventListener('paddle-checkout-error', handler);
    return () => window.removeEventListener('paddle-checkout-error', handler);
  }, []);

  if (!crate) return null;

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setCheckoutError('');
    const err = await crate.startCheckout();
    setCheckoutLoading(false);
    if (err) {
      setCheckoutError(err);
    }
  };

  const handleClaim = async () => {
    if (!secretInput.trim()) return;
    setClaimLoading(true);
    setClaimError('');
    const result = await crate.claimDevice(secretInput.trim());
    setClaimLoading(false);
    if (result.success) {
      crate.closePaywall();
    } else {
      setClaimError(result.error || 'Invalid key. Try again.');
    }
  };

  if (crate.is24k) return null;

  return (
    <>
      <AnimatePresence>
        {crate.isPaywallOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={crate.closePaywall}
            />

            {/* Modal */}
            <motion.div
              className="fixed inset-0 z-[91] flex items-center justify-center p-4"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <div
                className="relative w-full max-w-md rounded-3xl overflow-hidden"
                style={{ background: 'linear-gradient(160deg, #0f0022 0%, #07000f 100%)', border: '1px solid rgba(157,0,255,0.3)' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Top gold accent strip */}
                <div className="h-1" style={{ background: 'linear-gradient(90deg, #bf953f, #fcf6ba, #b38728, #fbf5b7, #bf953f)' }} />

                {/* Close */}
                <button
                  onClick={crate.closePaywall}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors z-10"
                >
                  <X className="w-4 h-4 text-white" />
                </button>

                <div className="p-6 pt-5">
                  {/* Hero */}
                  <div className="flex items-center gap-4 mb-5">
                    <GoldVinylRecord is24k size={72} spinning />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs font-black px-2 py-0.5 rounded-full"
                          style={{ background: 'linear-gradient(90deg, #bf953f, #fcf6ba)', color: '#2a1000' }}
                        >
                          24K GOLD
                        </span>
                      </div>
                      <h2 className="text-xl font-black text-white leading-tight">Unlock Your<br />Gold Crate</h2>
                      <p className="text-[#C084FC] text-sm font-semibold mt-0.5">
                        {crate.crateCount}/{GUEST_CRATE_LIMIT} free saves used
                      </p>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex rounded-xl mb-5 p-1" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {(['upgrade', 'recover'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => { setTab(t); setClaimError(''); }}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${tab === t ? 'text-white' : 'text-[#6B5F80]'}`}
                        style={tab === t ? { background: 'linear-gradient(135deg, #1a0040, #250055)', boxShadow: '0 0 8px rgba(157,0,255,0.3)' } : {}}
                      >
                        {t === 'upgrade' ? '⭐ GO 24K — $7.99' : '🔑 I HAVE A KEY'}
                      </button>
                    ))}
                  </div>

                  {tab === 'upgrade' ? (
                    <>
                      {/* Feature list */}
                      <div className="space-y-2 mb-5">
                        {[
                          { icon: Infinity, label: 'Unlimited track saves', gold: true },
                          { icon: Star, label: '24K Gold Vinyl on every record', gold: true },
                          { icon: Zap, label: 'Priority playback from your crate', gold: false },
                          { icon: KeyRound, label: 'Secret recovery key for new devices', gold: false },
                          { icon: ShieldCheck, label: 'Lifetime access — one-time payment', gold: false },
                        ].map(({ icon: Icon, label, gold }) => (
                          <div key={label} className="flex items-center gap-3">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: gold ? 'linear-gradient(135deg, #bf953f, #7d5a00)' : 'rgba(157,0,255,0.2)' }}
                            >
                              <Icon className="w-3.5 h-3.5" style={{ color: gold ? '#fcf6ba' : '#C084FC' }} />
                            </div>
                            <span className="text-sm text-white/80">{label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Price + CTA */}
                      <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(191,149,63,0.3)' }}>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-3xl font-black text-white">$7.99</span>
                          <span className="text-[#7B6F90] text-sm">one-time · lifetime access</span>
                        </div>
                        <p className="text-[10px] text-[#6B5F80]">No subscription. No account. No email required.</p>
                      </div>

                      <button
                        onClick={handleCheckout}
                        disabled={checkoutLoading}
                        className="w-full py-3.5 rounded-2xl font-black text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg, #bf953f 0%, #fcf6ba 30%, #b38728 60%, #fbf5b7 100%)', color: '#2a1000', boxShadow: '0 0 20px rgba(191,149,63,0.5)' }}
                      >
                        {checkoutLoading ? 'OPENING CHECKOUT...' : '⭐ GO 24K GOLD — $7.99'}
                      </button>

                      {/* Visible checkout error */}
                      {checkoutError && (
                        <div className="mt-3 rounded-xl px-4 py-3 text-xs leading-relaxed" style={{ background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,80,80,0.3)', color: '#FF9090' }}>
                          <span className="font-bold">Checkout error: </span>{checkoutError}
                        </div>
                      )}

                      <p className="text-center text-[10px] text-[#4B3F60] mt-3">
                        Secured by Paddle · By upgrading you agree to our{' '}
                        <button
                          type="button"
                          onClick={() => setTermsOpen(true)}
                          className="text-[#C084FC] hover:text-[#E0AAFF] underline underline-offset-2 transition-colors font-mono"
                        >
                          Terms &amp; Pricing
                        </button>
                        {' '}· Your Secret Key is your only recovery option.
                      </p>
                    </>
                  ) : (
                    <>
                      {/* Device recovery */}
                      <div className="mb-4">
                        <p className="text-sm text-[#C084FC] mb-3">
                          Already went 24K Gold? Enter your secret key to unlock this device.
                        </p>
                        <div className="flex items-center gap-2 mb-1">
                          <Lock className="w-3.5 h-3.5 text-[#C084FC]" />
                          <span className="text-xs text-[#7B6F90] font-mono">Format: J-CLUB-XXXX-XXXX-XXXX</span>
                        </div>
                        <input
                          value={secretInput}
                          onChange={e => { setSecretInput(e.target.value.toUpperCase()); setClaimError(''); }}
                          placeholder="J-CLUB-????-????-????"
                          className="w-full px-4 py-3 rounded-xl text-sm font-mono text-white placeholder-[#4B3F60] outline-none transition-all"
                          style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${claimError ? 'rgba(255,80,80,0.5)' : 'rgba(157,0,255,0.3)'}` }}
                        />
                        {claimError && <p className="text-red-400 text-xs mt-1.5">{claimError}</p>}
                      </div>

                      <button
                        onClick={handleClaim}
                        disabled={claimLoading || !secretInput.trim()}
                        className="w-full py-3.5 rounded-2xl font-black text-sm transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, #1a0040, #9D00FF)', color: 'white', boxShadow: '0 0 16px rgba(157,0,255,0.4)' }}
                      >
                        {claimLoading ? 'VERIFYING...' : '🔑 CLAIM THIS DEVICE'}
                      </button>

                      <p className="text-center text-[10px] text-[#4B3F60] mt-3">
                        Your key was generated when you first upgraded. Check your notes.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Terms & Pricing drawer — layered above the paywall modal */}
      <TermsPricingDrawer open={termsOpen} onClose={() => setTermsOpen(false)} />
    </>
  );
}