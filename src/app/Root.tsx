import { Outlet } from 'react-router';
import { Toaster } from 'sonner';
import { Layout } from './components/Layout';
import { PlayerProvider } from './context/PlayerContext';
import { CrateProvider } from './context/CrateContext';
import { CratePanel } from './components/CratePanel';
import { PaywallModal } from './components/PaywallModal';
import { SecretKeyModal } from './components/SecretKeyModal';
import { useGoogleAnalytics } from './hooks/useGoogleAnalytics';
import { useVisitorTracking } from './hooks/useVisitorTracking';

// Top-level wrapper that provides PlayerProvider above everything,
// including React Router's error boundaries.
export function PlayerWrapper() {
  useGoogleAnalytics();
  useVisitorTracking();
  return (
    <PlayerProvider>
      <CrateProvider>
        <Outlet />
        <CratePanel />
        <PaywallModal />
        <SecretKeyModal />
        <Toaster
          theme="dark"
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#1a1025',
              border: '1px solid rgba(192, 132, 252, 0.3)',
              color: '#E0AAFF',
            },
          }}
        />
      </CrateProvider>
    </PlayerProvider>
  );
}

import { Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation } from 'react-router';

// Simple neon-styled loader for route transitions
function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 rounded-full border-2 border-[#9D00FF]/20 border-t-[#C084FC] animate-spin" />
    </div>
  );
}

export default function Root() {
  const location = useLocation();

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex-1 flex flex-col min-h-full"
        >
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
