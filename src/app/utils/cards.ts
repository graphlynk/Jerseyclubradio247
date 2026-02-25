export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type FaceValue = 'J' | 'Q' | 'K' | 'A';
export type CardValue = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | FaceValue;

export interface Card {
  id: string;
  suit: Suit;
  value: CardValue;
  numericValue: number;
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣',
};
export const SUIT_COLORS: Record<Suit, string> = {
  spades: '#C084FC', hearts: '#F87171', diamonds: '#FB923C', clubs: '#4ADE80',
};

const VALUES: CardValue[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
const NUMERIC: Record<string, number> = {
  2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10,
  J: 11, Q: 12, K: 13, A: 14,
};

export function createDeck(): Card[] {
  const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const value of VALUES) {
      deck.push({ id: `${suit}_${value}`, suit, value, numericValue: NUMERIC[String(value)] });
    }
  }
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Blackjack hand value (handles aces) */
export function bjHandValue(hand: Card[]): number {
  let val = 0;
  let aces = 0;
  for (const c of hand) {
    if (c.value === 'A') { val += 11; aces++; }
    else if (typeof c.value === 'string') val += 10; // J Q K
    else val += c.value;
  }
  while (val > 21 && aces > 0) { val -= 10; aces--; }
  return val;
}
