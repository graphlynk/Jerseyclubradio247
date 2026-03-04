import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router';

// ─── Storage keys ─────────────────────────────────────────────────────────────
const LAST_SHOWN_KEY = 'jc_merch_last_shown';
const SESSION_SHOWN_KEY = 'jc_merch_session_shown';
const SITE_OPEN_KEY = 'jc_site_open_ts';
const PAGE_VISIT_LOG_KEY = 'jc_page_visit_log';

// ─── Config ───────────────────────────────────────────────────────────────────
const MIN_WAIT_MS = 2 * 60 * 1000;        // Must be on site ≥ 2 min before any trigger
const PAGE_TRIGGER_COUNT = 4;              // Trigger after this many unique page visits
const TIME_TRIGGER_MS = 5 * 60 * 1000;    // Trigger at 5 minutes regardless of pages
const SUPERFAN_TRIGGER_MS = 20 * 60 * 1000; // Second trigger opportunity at 20 min
const COOLDOWN_MS = 8 * 60 * 60 * 1000;   // 8-hour cooldown between popup shows

export function useSuperFan() {
  const { pathname } = useLocation();
  const [showFlashSale, setShowFlashSale] = useState(false);
  const [uniquePages, setUniquePages] = useState(0);
  const shownThisRender = useRef(false);

  // Initialize session open timestamp
  useEffect(() => {
    if (!sessionStorage.getItem(SITE_OPEN_KEY)) {
      sessionStorage.setItem(SITE_OPEN_KEY, Date.now().toString());
    }
  }, []);

  // Track unique pages visited this session
  useEffect(() => {
    const raw = sessionStorage.getItem(PAGE_VISIT_LOG_KEY) || '[]';
    let pages: string[] = [];
    try { pages = JSON.parse(raw); } catch { pages = []; }
    const baseRoute = '/' + pathname.split('/')[1]; // normalize sub-routes
    if (!pages.includes(baseRoute)) {
      pages.push(baseRoute);
      sessionStorage.setItem(PAGE_VISIT_LOG_KEY, JSON.stringify(pages));
    }
    setUniquePages(pages.length);
  }, [pathname]);

  // Gate: can we show the popup right now?
  const canShow = useCallback((): boolean => {
    if (shownThisRender.current) return false;
    if (sessionStorage.getItem(SESSION_SHOWN_KEY)) return false;
    const lastShown = parseInt(localStorage.getItem(LAST_SHOWN_KEY) || '0');
    if (Date.now() - lastShown < COOLDOWN_MS) return false;
    const openTs = parseInt(sessionStorage.getItem(SITE_OPEN_KEY) || '0');
    if (Date.now() - openTs < MIN_WAIT_MS) return false;
    return true;
  }, []);

  // Trigger the popup
  const triggerShow = useCallback((delayMs = 0) => {
    if (!canShow()) return;
    shownThisRender.current = true;
    sessionStorage.setItem(SESSION_SHOWN_KEY, '1');
    localStorage.setItem(LAST_SHOWN_KEY, Date.now().toString());
    const t = setTimeout(() => setShowFlashSale(true), delayMs);
    return () => clearTimeout(t);
  }, [canShow]);

  // External trigger: call this from game wins, video watches, etc.
  const manualTrigger = useCallback(() => triggerShow(1500), [triggerShow]);

  // Page-visit trigger: fires after PAGE_TRIGGER_COUNT unique pages
  useEffect(() => {
    if (uniquePages < PAGE_TRIGGER_COUNT) return;
    const cleanup = triggerShow(3500); // slight delay so they settle on the page
    return cleanup;
  }, [uniquePages, triggerShow]);

  // Time-based triggers: check every 30s
  useEffect(() => {
    const iv = setInterval(() => {
      const openTs = parseInt(sessionStorage.getItem(SITE_OPEN_KEY) || '0');
      const elapsed = Date.now() - openTs;
      if (elapsed >= TIME_TRIGGER_MS || elapsed >= SUPERFAN_TRIGGER_MS) {
        triggerShow(0);
      }
    }, 30_000);
    return () => clearInterval(iv);
  }, [triggerShow]);

  const dismissFlashSale = useCallback(() => setShowFlashSale(false), []);

  return { showFlashSale, dismissFlashSale, manualTrigger, uniquePages };
}
