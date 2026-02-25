import { Outlet } from 'react-router';
import { Toaster } from 'sonner';
import { Layout } from './components/Layout';
import { PlayerProvider } from './context/PlayerContext';
import { CrateProvider } from './context/CrateContext';
import { CratePanel } from './components/CratePanel';
import { PaywallModal } from './components/PaywallModal';
import { SecretKeyModal } from './components/SecretKeyModal';
import { useGoogleAnalytics } from './hooks/useGoogleAnalytics';

// Top-level wrapper that provides PlayerProvider above everything,
// including React Router's error boundaries.
export function PlayerWrapper() {
  useGoogleAnalytics();
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

export default function Root() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}