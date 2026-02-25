import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { initializePaddle, type Paddle } from '@paddle/paddle-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { getOrCreateFingerprint } from '../hooks/useFingerprint';
import type { Track } from './PlayerContext';
import { getMaxResThumbnail } from '../utils/getMaxResThumbnail';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-715f71b9`;
export const GUEST_CRATE_LIMIT = 7;

export interface CrateItem {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  source?: string;
  soundcloudUrl?: string;
  addedAt: string;
}

interface CrateContextType {
  visitorId: string | null;
  is24k: boolean;
  crate: CrateItem[];
  crateCount: number;
  isGuestAtLimit: boolean;
  secretKey: string | null;
  hasSecretKey: boolean;
  isLoading: boolean;
  isCrateOpen: boolean;
  isPaywallOpen: boolean;
  isSecretKeyModalOpen: boolean;
  isUpgrading: boolean;
  addingIds: Set<string>;
  openCrate: () => void;
  closeCrate: () => void;
  openPaywall: () => void;
  closePaywall: () => void;
  openSecretKeyModal: () => void;
  closeSecretKeyModal: () => void;
  addToCrate: (track: Track) => Promise<void>;
  removeFromCrate: (videoId: string) => Promise<void>;
  isInCrate: (videoId: string) => boolean;
  claimDevice: (sk: string) => Promise<{ success: boolean; error?: string }>;
  startCheckout: () => Promise<string | undefined>;
  openBillingPortal: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

const CrateContext = createContext<CrateContextType | null>(null);

export function useCrate(): CrateContextType {
  const ctx = useContext(CrateContext);
  if (!ctx) {
    console.warn('[Crate] useCrate called outside CrateProvider — returning fallback. Use useCrateSafe() instead.');
    // Return a no-op fallback so the app doesn't crash during HMR or stale renders
    return {
      visitorId: null,
      is24k: false,
      crate: [],
      crateCount: 0,
      isGuestAtLimit: false,
      secretKey: null,
      hasSecretKey: false,
      isLoading: true,
      isCrateOpen: false,
      isPaywallOpen: false,
      isSecretKeyModalOpen: false,
      isUpgrading: false,
      addingIds: new Set(),
      openCrate: () => {},
      closeCrate: () => {},
      openPaywall: () => {},
      closePaywall: () => {},
      openSecretKeyModal: () => {},
      closeSecretKeyModal: () => {},
      addToCrate: async () => {},
      removeFromCrate: async () => {},
      isInCrate: () => false,
      claimDevice: async () => ({ success: false, error: 'Not initialized' }),
      startCheckout: async () => 'Not initialized',
      openBillingPortal: async () => {},
      startPolling: () => {},
      stopPolling: () => {},
    };
  }
  return ctx;
}

/** Safe version — returns null when outside CrateProvider (e.g. during HMR). */
export function useCrateSafe(): CrateContextType | null {
  return useContext(CrateContext);
}

const hdrs = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${publicAnonKey}`,
});

export function CrateProvider({ children }: { children: React.ReactNode }) {
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [is24k, setIs24k] = useState(false);
  const [crate, setCrate] = useState<CrateItem[]>([]);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [hasSecretKey, setHasSecretKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCrateOpen, setIsCrateOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isSecretKeyModalOpen, setIsSecretKeyModalOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const vidRef = useRef<string | null>(null);
  const paddleRef = useRef<Paddle | null>(null);
  const paddlePriceIdRef = useRef<string>('');

  // ── Initialize: fingerprint → identify with server ──────────────────────
  useEffect(() => {
    (async () => {
      try {
        const fp = await getOrCreateFingerprint();
        vidRef.current = fp;
        setVisitorId(fp);
        const res = await fetch(`${BASE}/vault/identify`, {
          method: 'POST',
          headers: hdrs(),
          body: JSON.stringify({ visitorId: fp }),
        });
        if (res.ok) {
          const d = await res.json();
          setIs24k(d.is24k);
          setCrate(d.crate || []);
          setSecretKey(d.secretKey || null);
          setHasSecretKey(d.hasSecretKey);
        }
      } catch (e) {
        console.log('[Crate] Init error:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Detect return from Paddle checkout ──────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgraded') === 'true') {
      setIsUpgrading(true);
      startPolling();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      const vid = vidRef.current;
      if (!vid) return;
      try {
        const res = await fetch(`${BASE}/vault/status/${vid}`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
        if (res.ok) {
          const d = await res.json();
          if (d.is24k) {
            setIs24k(true);
            setCrate(d.crate || []);
            setSecretKey(d.secretKey || null);
            setHasSecretKey(d.hasSecretKey);
            setIsUpgrading(false);
            stopPolling();
            if (d.secretKey) {
              setIsSecretKeyModalOpen(true);
              setIsPaywallOpen(false);
            }
          }
        }
      } catch (e) {
        console.log('[Crate] Poll error:', e);
      }
    }, 3000);
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Add track to crate ───────────────────────────────────────────────────
  const addToCrate = useCallback(async (track: Track) => {
    const vid = vidRef.current;
    if (!vid) return;
    const videoId = track.id.videoId;
    if (!is24k && crate.length >= GUEST_CRATE_LIMIT) {
      setIsPaywallOpen(true);
      return;
    }
    setAddingIds(prev => new Set(prev).add(videoId));
    try {
      const item: CrateItem = {
        videoId,
        title: track.snippet.title,
        channelTitle: track.snippet.channelTitle,
        thumbnail: track.source === 'soundcloud'
          ? (track.snippet.thumbnails.high?.url || track.snippet.thumbnails.medium?.url || '')
          : getMaxResThumbnail(track.id.videoId),
        source: track.source,
        soundcloudUrl: track.soundcloudUrl,
        addedAt: new Date().toISOString(),
      };
      const res = await fetch(`${BASE}/vault/crate/sync`, {
        method: 'POST',
        headers: hdrs(),
        body: JSON.stringify({ visitorId: vid, action: 'add', item }),
      });
      const d = await res.json();
      if (res.status === 403 && d.error === 'PAYWALL') {
        setIsPaywallOpen(true);
        return;
      }
      if (res.ok) setCrate(d.crate);
    } catch (e) {
      console.log('[Crate] Add error:', e);
    } finally {
      setAddingIds(prev => { const s = new Set(prev); s.delete(videoId); return s; });
    }
  }, [is24k, crate.length]);

  // ── Remove track from crate ──────────────────────────────────────────────
  const removeFromCrate = useCallback(async (videoId: string) => {
    const vid = vidRef.current;
    if (!vid) return;
    try {
      const res = await fetch(`${BASE}/vault/crate/sync`, {
        method: 'POST',
        headers: hdrs(),
        body: JSON.stringify({ visitorId: vid, action: 'remove', videoId }),
      });
      if (res.ok) {
        const d = await res.json();
        setCrate(d.crate);
      }
    } catch (e) {
      console.log('[Crate] Remove error:', e);
    }
  }, []);

  const isInCrate = useCallback((videoId: string) => crate.some(x => x.videoId === videoId), [crate]);

  // ── Claim new device ─────────────────────────────────────────────────────
  const claimDevice = useCallback(async (sk: string): Promise<{ success: boolean; error?: string }> => {
    const vid = vidRef.current;
    if (!vid) return { success: false, error: 'No device fingerprint yet' };
    try {
      const res = await fetch(`${BASE}/vault/claim`, {
        method: 'POST',
        headers: hdrs(),
        body: JSON.stringify({ secretKey: sk, newVisitorId: vid }),
      });
      const d = await res.json();
      if (res.ok) {
        setIs24k(true);
        setCrate(d.crate || []);
        setSecretKey(d.secretKey || null);
        setHasSecretKey(true);
        return { success: true };
      }
      return { success: false, error: d.error || 'Unknown error' };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }, []);

  // ── Paddle checkout ──────────────────────────────────────────────────────
  // Paddle entity hierarchy:
  //   pro_  →  Product  (name, image, tax rules — dashboard only)
  //   pri_  →  Price    ($7.99 one-time — this is what Checkout.open() needs)
  const startCheckout = useCallback(async (): Promise<string | undefined> => {
    const vid = vidRef.current;
    if (!vid) return 'Device fingerprint not ready — please wait a moment and try again.';
    try {
      // Lazily initialise Paddle on first checkout attempt
      if (!paddleRef.current) {
        let config: any;
        try {
          const configRes = await fetch(`${BASE}/paddle/config`, {
            headers: { Authorization: `Bearer ${publicAnonKey}` },
          });
          config = await configRes.json();
        } catch (fetchErr) {
          console.log('[Crate] Paddle config fetch failed:', fetchErr);
          return 'Could not reach payment server. Check your connection and try again.';
        }

        if (config.error) {
          console.log('[Crate] Paddle config error:', config.error);
          return config.error;
        }
        if (!config.clientToken) {
          console.log('[Crate] PADDLE_CLIENT_TOKEN not set');
          return 'Payment not yet configured (missing PADDLE_CLIENT_TOKEN). Please check your Paddle dashboard settings.';
        }
        if (!config.priceId) {
          console.log('[Crate] PADDLE_PRICE_ID not set');
          return 'Payment not yet configured (missing PADDLE_PRICE_ID). Please set a pri_… Price ID in your Paddle dashboard.';
        }
        // Extra client-side guard: priceId must be a pri_ entity, not a pro_ product
        if (!config.priceId.startsWith('pri_')) {
          console.log('[Crate] PADDLE_PRICE_ID must start with pri_ (Price entity), got:', config.priceId);
          return `PADDLE_PRICE_ID must start with "pri_" (Price entity). Got: ${config.priceId}`;
        }

        paddlePriceIdRef.current = config.priceId;

        let paddle: Paddle | undefined;
        try {
          paddle = await initializePaddle({
            environment: config.environment === 'sandbox' ? 'sandbox' : 'production',
            token: config.clientToken,
            eventCallback(event: any) {
              // Log every event so we can diagnose Paddle issues in the console
              console.log('[Crate] Paddle raw event:', JSON.stringify(event, null, 2));
              if (event?.name === 'checkout.error') {
                // Paddle's error shape varies — exhaustively search common paths
                const msg: string =
                  event?.data?.error?.detail
                  || event?.data?.error?.message
                  || event?.data?.detail
                  || event?.data?.message
                  || event?.error?.detail
                  || event?.error?.message
                  || event?.detail
                  || event?.message
                  || (event?.data !== undefined ? JSON.stringify(event.data) : null)
                  || JSON.stringify(event)
                  || 'Unknown Paddle checkout error';
                console.error('[Crate] Paddle checkout.error full detail:', msg);
                window.dispatchEvent(new CustomEvent('paddle-checkout-error', { detail: msg }));
              }
              if (event?.name === 'checkout.warning') {
                console.warn('[Crate] Paddle checkout.warning:', JSON.stringify(event));
              }
            },
          });
        } catch (initErr) {
          console.log('[Crate] Paddle initializePaddle threw:', initErr);
          return `Paddle failed to initialise: ${String(initErr)}`;
        }

        if (!paddle) {
          console.log('[Crate] Paddle init returned null/undefined');
          return 'Paddle failed to initialise — check that your PADDLE_CLIENT_TOKEN is correct (live_… for production, test_… for sandbox).';
        }
        paddleRef.current = paddle;
      }

      const origin = window.location.origin;
      try {
        paddleRef.current!.Checkout.open({
          // Do NOT pass `quantity` — Paddle throws "validation.no_validation_set"
          // if the Price entity has no quantity-validation rules in the dashboard.
          // One-time prices default to quantity 1 automatically.
          items: [{ priceId: paddlePriceIdRef.current }],
          customData: { visitorId: vid },
          settings: {
            displayMode: 'overlay',
            // Required when no customer email is pre-filled — otherwise Paddle
            // preflight returns 400 Bad Request before the overlay even renders.
            allowLoggedOutCheckout: true,
            successUrl: `${origin}/crate?upgraded=true`,
          },
        });
      } catch (openErr) {
        console.log('[Crate] Checkout.open threw:', openErr);
        return `Checkout could not open: ${String(openErr)}`;
      }

      return undefined; // success
    } catch (e) {
      console.log('[Crate] Paddle checkout error:', e);
      return `Unexpected error: ${String(e)}`;
    }
  }, []);

  // ── Paddle Customer Portal ────────────────────────────────────────────────
  // Creates a short-lived Paddle portal session on the server (which uses the
  // PADDLE_API_SECRET), then opens the returned URL in a new tab so the user
  // can view receipts, download invoices, and update their payment method.
  const openBillingPortal = useCallback(async () => {
    const vid = vidRef.current;
    if (!vid) return;
    try {
      const res = await fetch(`${BASE}/paddle/portal/${encodeURIComponent(vid)}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        console.log('[Crate] Portal error:', err.error);
        return;
      }
      const { url } = await res.json();
      if (url) window.open(url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.log('[Crate] Portal request failed:', e);
    }
  }, []);

  const value: CrateContextType = {
    visitorId,
    is24k,
    crate,
    crateCount: crate.length,
    isGuestAtLimit: !is24k && crate.length >= GUEST_CRATE_LIMIT,
    secretKey,
    hasSecretKey,
    isLoading,
    isCrateOpen,
    isPaywallOpen,
    isSecretKeyModalOpen,
    isUpgrading,
    addingIds,
    openCrate: () => setIsCrateOpen(true),
    closeCrate: () => setIsCrateOpen(false),
    openPaywall: () => setIsPaywallOpen(true),
    closePaywall: () => setIsPaywallOpen(false),
    openSecretKeyModal: () => setIsSecretKeyModalOpen(true),
    closeSecretKeyModal: () => setIsSecretKeyModalOpen(false),
    addToCrate,
    removeFromCrate,
    isInCrate,
    claimDevice,
    startCheckout,
    openBillingPortal,
    startPolling,
    stopPolling,
  };

  return <CrateContext.Provider value={value}>{children}</CrateContext.Provider>;
}