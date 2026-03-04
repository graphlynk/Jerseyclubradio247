import React, { useEffect, useRef, useState } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-715f71b9`;
const HEADERS = { Authorization: `Bearer ${publicAnonKey}` };

// ─── Ambient messages shown when real events are sparse ───────────────────────
const CITIES = ['Newark', 'Brooklyn', 'Baltimore', 'London', 'Toronto', 'Chicago', 'Philly', 'Atlanta', 'Tokyo', 'Berlin', 'Johannesburg', 'Lagos', 'Amsterdam', 'Kingston', 'São Paulo'];
const BOSSES = ['The Newark Machine', 'Ghost of Tameil', 'B-More Executioner', 'The Garden State Ghost', 'DJ Tech-AI', 'Brick Bandit Bot', 'The Shore Shark'];
const XWORD_THEMES = ['Newark Origins', 'B-More Connection', 'DJ Roll Call', 'Global Stage', 'Dance Culture', 'NYC Takeover'];

function fakeGuest() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'Guest_';
  for (let i = 0; i < 7; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function ambientMessage() {
  const city = CITIES[Math.floor(Math.random() * CITIES.length)];
  const guest = fakeGuest();
  const streak = Math.floor(Math.random() * 9) + 2;
  const boss = BOSSES[Math.floor(Math.random() * BOSSES.length)];
  const theme = XWORD_THEMES[Math.floor(Math.random() * XWORD_THEMES.length)];
  const msgs = [
    `🎵 ${guest} is vibing to Jersey Club in ${city} right now`,
    `🃏 ${guest} just won a Spades match against AI — ${streak}-game streak!`,
    `🏆 ${guest} defeated "${boss}" at Spades and claimed a discount!`,
    `🧩 ${guest} solved the "${theme}" crossword`,
    `🌍 Someone in ${city} just discovered Jersey Club for the first time`,
    `💿 ${guest} crushed a 5-game Spades win streak`,
    `🔥 The dance floor in ${city} is rocking to Jersey Club right now`,
    `🤖 ${guest} beat the AI Boss 3 hands straight — legendary!`,
    `📱 Jersey Club just went viral again on TikTok — ${city} is LIT`,
    `🎤 ${guest} is on a Spades hot streak — can't be stopped`,
    `🎯 ${guest} bid NIL and made it — respect!`,
    `🎰 ${guest} won a Blackjack hand with a natural 21`,
    `🌐 Jersey Club 24/7 is live in ${Math.floor(Math.random() * 40) + 10} countries right now`,
    `💪 ${guest} just joined from ${city} — welcome to the scene`,
    `🔊 ${guest} has been listening for ${Math.floor(Math.random() * 5) + 1} hours straight`,
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

// ─── Component ────────────────────────────────────────────────────────────────
export function SocialTicker() {
  const [messages, setMessages] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>();
  const posRef = useRef(0);
  const speedRef = useRef(0.6); // px per frame

  // Build initial message list (ambient + real events from server)
  useEffect(() => {
    const build = async () => {
      // Start with ambient messages
      const ambient = Array.from({ length: 20 }, ambientMessage);

      try {
        const res = await fetch(`${BASE}/ticker/events`, { headers: HEADERS });
        if (res.ok) {
          const real: { message: string }[] = await res.json();
          // Interleave real events among ambient ones
          const combined = [...ambient];
          real.slice(0, 15).forEach((e, i) => combined.splice(i * 2, 0, e.message));
          setMessages(combined);
          return;
        }
      } catch { /* fallback to ambient only */ }

      setMessages(ambient);
    };

    build();

    // Refresh every 30 seconds to pull in new real events
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BASE}/ticker/events`, { headers: HEADERS });
        if (res.ok) {
          const real: { message: string }[] = await res.json();
          // Prepend new real events
          setMessages(prev => {
            const newMsgs = real.slice(0, 5).map(e => e.message);
            return [...newMsgs, ...prev].slice(0, 40);
          });
        }
      } catch {}
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  // Smooth continuous scroll animation
  useEffect(() => {
    const track = trackRef.current;
    if (!track || messages.length === 0) return;

    const animate = () => {
      if (!paused) {
        posRef.current -= speedRef.current;
        // Reset to beginning when first copy has fully scrolled out
        const halfWidth = track.scrollWidth / 2;
        if (Math.abs(posRef.current) >= halfWidth) posRef.current = 0;
        track.style.transform = `translateX(${posRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [messages, paused]);

  if (messages.length === 0) return null;

  // Duplicate messages for seamless infinite loop
  const doubled = [...messages, ...messages];

  return (
    null
  );
}