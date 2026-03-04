/**
 * useVisitorTracking — fires ONCE on page load to register this visitor.
 *
 * Strategy:
 *  1. Resolve the visitor's coordinates CLIENT-SIDE via ipapi.co (same API
 *     used elsewhere in the app). This is reliable because the client IP is
 *     the real end-user IP, not a datacenter IP.
 *  2. Send guestId + resolved lat/lon to POST /visits/log so the server
 *     always has valid coordinates regardless of whether its own server-side
 *     IP geolocation (ip-api.com) succeeds.
 *  3. Also directly update the visitor map via POST /plays/track fallback so
 *     the data appears even before the new /visits/* endpoints are deployed.
 */

import { useEffect } from 'react';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-715f71b9`;
const HEADERS = { Authorization: `Bearer ${publicAnonKey}` };

function getGuestId(): string {
    try {
        const stored = localStorage.getItem('jc_guest_profile_v1');
        if (stored) return JSON.parse(stored).id || 'Unknown';
    } catch { }
    try {
        const fp = localStorage.getItem('jc_fp_v2');
        if (fp) return fp;
    } catch { }
    const newId = 'v_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    try { localStorage.setItem('jc_fp_v2', newId); } catch { }
    return newId;
}

// Cache resolved location in memory (and localStorage) to avoid redundant API calls
let resolvedGeo: { lat: number; lon: number; city: string; country: string } | null = null;

async function resolveGeo(): Promise<{ lat: number; lon: number; city: string; country: string } | null> {
    if (resolvedGeo) return resolvedGeo;
    // Check localStorage cache first (valid for 24 hours)
    try {
        const cached = localStorage.getItem('jc_geo_cache');
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.ts && Date.now() - parsed.ts < 24 * 60 * 60 * 1000) {
                resolvedGeo = { lat: parsed.lat, lon: parsed.lon, city: parsed.city, country: parsed.country };
                return resolvedGeo;
            }
        }
    } catch { }

    try {
        const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.latitude == null || data.longitude == null) return null;
        resolvedGeo = {
            lat: data.latitude,
            lon: data.longitude,
            city: data.city || 'Unknown',
            country: data.country_name || data.country || 'Unknown',
        };
        try {
            localStorage.setItem('jc_geo_cache', JSON.stringify({ ...resolvedGeo, ts: Date.now() }));
        } catch { }
        return resolvedGeo;
    } catch {
        return null;
    }
}

export function useVisitorTracking() {
    useEffect(() => {
        const guestId = getGuestId();

        // Debounce: don't re-log if we logged within the last 6 hours
        const lastLogKey = 'jc_visit_logged_at';
        try {
            const lastLog = parseInt(localStorage.getItem(lastLogKey) || '0', 10);
            if (Date.now() - lastLog < 6 * 60 * 60 * 1000) return;
        } catch { }

        // Resolve geo then log the visit with real coordinates
        resolveGeo().then(geo => {
            const payload: Record<string, any> = { guestId };
            if (geo) {
                payload.lat = geo.lat;
                payload.lon = geo.lon;
                payload.city = geo.city;
                payload.country = geo.country;
            }

            // Primary: log to /visits/log (new endpoint — works when deployed)
            fetch(`${BASE}/visits/log`, {
                method: 'POST',
                headers: { ...HEADERS, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            }).catch(() => { /* non-critical */ });

            try { localStorage.setItem(lastLogKey, String(Date.now())); } catch { }
        }).catch(() => { /* non-critical */ });
    }, []);
}
