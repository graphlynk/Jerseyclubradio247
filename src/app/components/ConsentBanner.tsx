import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Session-scoped keys — resets every new browser session
const TERMS_SEEN_KEY   = 'jcr-terms-seen';      // set by TermsPricingDrawer on accept
const BANNER_KEY       = 'jcr-consent-dismissed'; // set when user X's this banner

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already dismissed this session → stay hidden
    if (sessionStorage.getItem(BANNER_KEY)) return;

    // Poll until the TermsPricingDrawer has been accepted, then show the banner
    const interval = setInterval(() => {
      if (sessionStorage.getItem(TERMS_SEEN_KEY)) {
        clearInterval(interval);
        // Small extra delay so it feels like a natural follow-up
        setTimeout(() => setVisible(true), 600);
      }
    }, 400);

    return () => clearInterval(interval);
  }, []);

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(BANNER_KEY, 'true');
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed z-[9999] bottom-[170px] md:bottom-28 left-1/2 -translate-x-1/2 w-[92%] md:w-auto md:max-w-[700px]"
        >
          <div
            className="relative flex items-center gap-3 md:gap-4 px-5 md:px-6 py-3 md:py-3.5 rounded-full border border-white/[0.08]"
            style={{
              background: 'rgba(10, 0, 24, 0.92)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              boxShadow: '0 0 40px rgba(157,0,255,0.08), 0 4px 24px rgba(0,0,0,0.5)',
            }}
          >
            {/* Message */}
            <p className="text-[11px] md:text-xs text-[#A89BBE] leading-relaxed font-medium pr-7">
              This site uses cookies and device fingerprinting to save your crate &amp; game progress.
              By continuing you agree to our{' '}
              <Link
                to="/terms"
                className="text-[#C084FC] hover:text-[#E0AAFF] underline underline-offset-2 transition-colors font-semibold"
                style={{ textShadow: '0 0 6px rgba(192,132,252,0.4)' }}
              >
                Terms of Service
              </Link>
              ,{' '}
              <Link
                to="/privacy"
                className="text-[#C084FC] hover:text-[#E0AAFF] underline underline-offset-2 transition-colors font-semibold"
                style={{ textShadow: '0 0 6px rgba(192,132,252,0.4)' }}
              >
                Privacy Policy
              </Link>
              ,{' '}
              <Link
                to="/pricing"
                className="text-[#C084FC] hover:text-[#E0AAFF] underline underline-offset-2 transition-colors font-semibold"
                style={{ textShadow: '0 0 6px rgba(192,132,252,0.4)' }}
              >
                Pricing
              </Link>
              {' '}and{' '}
              <Link
                to="/refund-policy"
                className="text-[#C084FC] hover:text-[#E0AAFF] underline underline-offset-2 transition-colors font-semibold"
                style={{ textShadow: '0 0 6px rgba(192,132,252,0.4)' }}
              >
                Refund Policy
              </Link>
              .
            </p>

            {/* Dismiss × */}
            <button
              onClick={dismiss}
              className="absolute top-1/2 -translate-y-1/2 right-3 md:right-4 flex items-center justify-center w-6 h-6 rounded-full text-[#7B6F90] hover:text-white transition-all duration-200 hover:bg-white/[0.08] group"
              aria-label="Dismiss consent banner"
            >
              <X className="w-3.5 h-3.5 transition-all duration-200" style={{ color: '#fcf6ba', filter: 'drop-shadow(0 0 4px rgba(191,149,63,0.8))' }} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}