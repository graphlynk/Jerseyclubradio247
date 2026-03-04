// ─── Jersey Club Legends Database ──────────────────────────────────────────────
// Deduplicated roster of Jersey Club pioneers, heavy hitters, new wave, and culture shapers.
// Used to fill Spades game seats when real players don't connect within the timeout.

export interface JerseyLegend {
  name: string;
  role: string;
  category: 'Pioneer / Founder' | 'Heavy Hitter' | 'New Wave' | 'New Wave / Global' | 'Culture Shaper';
}

export const JERSEY_LEGENDS: JerseyLegend[] = [
  { name: 'Wiztv', role: 'Director / Pioneer', category: 'Pioneer / Founder' },
  { name: 'Ms. Porsh', role: 'Vocalist / First Lady', category: 'Pioneer / Founder' },
  { name: 'DJ Tameil', role: 'Producer / DJ', category: 'Pioneer / Founder' },
  { name: 'DJ Tim Dolla', role: 'Producer / DJ', category: 'Pioneer / Founder' },
  { name: 'Mike V', role: 'Producer / DJ', category: 'Pioneer / Founder' },
  { name: 'DJ Lilman', role: 'DJ / The Voice', category: 'Heavy Hitter' },
  { name: 'DJ Wallah', role: 'DJ / Radio Personality', category: 'Heavy Hitter' },
  { name: 'DJ Sliink', role: 'DJ / Producer', category: 'Heavy Hitter' },
  { name: 'Uniiqu3', role: 'DJ / Producer / Queen', category: 'Heavy Hitter' },
  { name: 'DJ Jayhood', role: 'DJ / Producer', category: 'Heavy Hitter' },
  { name: 'DJ Frosty', role: 'DJ / Producer', category: 'Pioneer / Founder' },
  { name: 'Empress Tokyo', role: 'Vocalist', category: 'Pioneer / Founder' },
  { name: 'DJ Black Mic', role: 'Producer', category: 'Pioneer / Founder' },
  { name: 'Nadus', role: 'Producer', category: 'Heavy Hitter' },
  { name: 'R3LL', role: 'DJ / Producer', category: 'Heavy Hitter' },
  { name: 'DJ Taj', role: 'DJ / Producer', category: 'Heavy Hitter' },
  { name: 'DJ Smallz 732', role: 'DJ / Producer', category: 'Heavy Hitter' },
  { name: 'DJ K-Shiz', role: 'Producer', category: 'Heavy Hitter' },
  { name: 'DJ Tray', role: 'DJ / Producer', category: 'Heavy Hitter' },
  { name: 'Cookiee Kawaii', role: 'Vocalist / Artist', category: 'New Wave / Global' },
  { name: 'Kayy Drizz', role: 'DJ / Producer', category: 'Heavy Hitter' },
  { name: 'Niamoni', role: 'Vocalist', category: 'New Wave' },
  { name: 'McVertt', role: 'Producer', category: 'New Wave' },
  { name: 'Bandmanrill', role: 'Rapper / Artist', category: 'New Wave' },
  { name: 'Killa Kherk Cobain', role: 'Rapper / Producer', category: 'Heavy Hitter' },
  { name: 'DJ MikeQ', role: 'DJ / Ballroom Icon', category: 'Heavy Hitter' },
  { name: 'DJ Technics', role: 'DJ / Pioneer', category: 'Pioneer / Founder' },
  { name: 'Mista Quietman', role: 'DJ / Pioneer', category: 'Pioneer / Founder' },
  { name: 'DJ Fade', role: 'DJ / Producer', category: 'Heavy Hitter' },
  { name: 'DJ Flex', role: 'DJ / Producer', category: 'Heavy Hitter' },
  { name: 'DJ Saucy P', role: 'Vocalist', category: 'Heavy Hitter' },
  { name: 'TT The Artist', role: 'Vocalist / Artist', category: 'Heavy Hitter' },
  { name: 'So Dellirious', role: 'DJ / Producer', category: 'Heavy Hitter' },
  { name: 'Nix In The Mix', role: 'DJ / Pioneer', category: 'Pioneer / Founder' },
  { name: 'DJ Mustafah', role: 'DJ / Pioneer', category: 'Pioneer / Founder' },
  { name: 'RichGotti', role: 'Dancer / Influencer', category: 'Culture Shaper' },
  { name: 'Solo (Anthony Harris)', role: 'Dancer / Historian', category: 'Culture Shaper' },
  { name: 'Kiyanté Grant', role: 'Promotion / Pioneer', category: 'Culture Shaper' },
];

// ─── Wiztv Frequency Logic ────────────────────────────────────────────────────
// Wiztv must appear in at least 1 out of every 10 system-filled games
// to honor his pioneer status. We track a rolling counter in localStorage.

const WIZTV_COUNTER_KEY = 'jc_wiztv_game_counter';
const WIZTV_LAST_APPEARANCE_KEY = 'jc_wiztv_last_appearance';
const WIZTV_GUARANTEE_INTERVAL = 10;

function getWiztvCounter(): { gamesPlayed: number; lastAppearance: number } {
  try {
    const played = parseInt(localStorage.getItem(WIZTV_COUNTER_KEY) || '0', 10);
    const last = parseInt(localStorage.getItem(WIZTV_LAST_APPEARANCE_KEY) || '0', 10);
    return { gamesPlayed: played, lastAppearance: last };
  } catch {
    return { gamesPlayed: 0, lastAppearance: 0 };
  }
}

function incrementWiztvCounter(wiztvAppeared: boolean): void {
  try {
    const { gamesPlayed } = getWiztvCounter();
    const next = gamesPlayed + 1;
    localStorage.setItem(WIZTV_COUNTER_KEY, String(next));
    if (wiztvAppeared) {
      localStorage.setItem(WIZTV_LAST_APPEARANCE_KEY, String(next));
    }
  } catch {}
}

/**
 * Pick `count` unique Jersey Legend names for system-filled seats.
 * Guarantees Wiztv appears at least 1 in every 10 system-filled games.
 * All returned names look identical to real player names — no markers.
 */
export function pickLegendNames(count: number, excludeNames: string[] = []): string[] {
  if (count <= 0) return [];

  const { gamesPlayed, lastAppearance } = getWiztvCounter();
  const gamesSinceWiztv = gamesPlayed - lastAppearance;
  
  // Force Wiztv if we've gone 9+ games without him
  const forceWiztv = gamesSinceWiztv >= (WIZTV_GUARANTEE_INTERVAL - 1);
  
  // Available legends (excluding already-seated names)
  const excludeSet = new Set(excludeNames.map(n => n.toLowerCase()));
  const available = JERSEY_LEGENDS.filter(l => !excludeSet.has(l.name.toLowerCase()));

  const picked: string[] = [];
  const usedIndices = new Set<number>();

  // Step 1: Handle Wiztv
  if (forceWiztv || Math.random() < 0.15) {
    const wizIdx = available.findIndex(l => l.name === 'Wiztv');
    if (wizIdx >= 0 && count > 0) {
      picked.push(available[wizIdx].name);
      usedIndices.add(wizIdx);
    }
  }

  // Step 2: Fill remaining slots randomly
  while (picked.length < count && usedIndices.size < available.length) {
    const idx = Math.floor(Math.random() * available.length);
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx);
      picked.push(available[idx].name);
    }
  }

  // Track the counter
  const wiztvAppeared = picked.includes('Wiztv');
  incrementWiztvCounter(wiztvAppeared);

  return picked;
}

/**
 * Generate a random human-like delay between turns (2000ms - 5000ms)
 * to simulate natural thinking time for system-filled players.
 */
export function getHumanDelay(): number {
  return 2000 + Math.random() * 3000;
}
