import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

const GA_ID = 'G-2YQ6PWVDT7';

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/**
 * Synchronous guard – runs the moment this module is first imported.
 * Ensures the gtag script exists in <head> even if both index.html
 * and the Vite plugin were somehow bypassed.
 */
(function injectGtagIfMissing() {
  if (typeof document === 'undefined') return;
  // Check if a gtag script already exists
  const existing = document.querySelector(
    `script[src*="googletagmanager.com/gtag/js?id=${GA_ID}"]`
  );
  if (existing) return;

  // Inject the async loader
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);

  // Inject the config snippet
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID);
})();

/**
 * Hook that tracks SPA page views on every React Router navigation.
 *
 * The gtag.js script is loaded via:
 *   1. index.html (static, in <head>)
 *   2. Vite transformIndexHtml plugin (build-time injection)
 *   3. The IIFE above (runtime fallback)
 *
 * This hook only handles subsequent client-side route-change tracking.
 */
export function useGoogleAnalytics() {
  const location = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip first render – the initial gtag('config') already fires page_view
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_title: document.title,
      });
    }
  }, [location.pathname, location.search]);
}
