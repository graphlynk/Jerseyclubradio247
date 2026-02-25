import { useState, useEffect, useCallback } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { getOrCreateFingerprint } from './useFingerprint';

export interface GuestProfile {
  id: string;
  spadesWins: number;
  spadesLosses: number;
  blackjackHighScore: number;
  blackjackWins: number;
  crosswordsCompleted: number;
  totalScore: number;
  createdAt: string;
}

const STORAGE_KEY = 'jc_guest_profile_v1';
const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-715f71b9`;
const HEADERS = { Authorization: `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' };

function makeGuestId(): string {
  // Fallback if fingerprint fails — keep same Guest_XXXX pattern
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `Guest_${n}`;
}

function defaultProfile(): GuestProfile {
  return {
    id: makeGuestId(),
    spadesWins: 0, spadesLosses: 0,
    blackjackHighScore: 0, blackjackWins: 0,
    crosswordsCompleted: 0,
    totalScore: 0,
    createdAt: new Date().toISOString(),
  };
}

export function useGuestId() {
  const [profile, setProfileState] = useState<GuestProfile | null>(null);

  useEffect(() => {
    const init = async () => {
      // Try to load existing profile from localStorage first (fast path)
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed: GuestProfile = JSON.parse(stored);
          // Upgrade existing profiles to fingerprint ID if they still have a numeric Guest_XXXX
          if (/^Guest_\d{4}$/.test(parsed.id)) {
            const fp = await getOrCreateFingerprint().catch(() => parsed.id);
            if (fp !== parsed.id) {
              const upgraded = { ...parsed, id: fp };
              localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
              setProfileState(upgraded);
              return;
            }
          }
          setProfileState(parsed);
          return;
        } catch {}
      }
      // No profile yet — generate fingerprint-based ID
      const id = await getOrCreateFingerprint().catch(makeGuestId);
      const p: GuestProfile = {
        id,
        spadesWins: 0, spadesLosses: 0,
        blackjackHighScore: 0, blackjackWins: 0,
        crosswordsCompleted: 0,
        totalScore: 0,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
      setProfileState(p);
    };
    init();
  }, []);

  const updateProfile = useCallback((updates: Partial<GuestProfile>) => {
    setProfileState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      // Recompute total score
      updated.totalScore =
        updated.spadesWins * 150 +
        updated.blackjackWins * 100 +
        updated.crosswordsCompleted * 200 +
        Math.min(updated.blackjackHighScore, 9999);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      // Fire-and-forget sync to global leaderboard
      fetch(`${BASE}/leaderboard/sync`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify(updated),
      }).catch(e => console.log('Leaderboard sync error:', e));

      return updated;
    });
  }, []);

  return { profile, updateProfile };
}