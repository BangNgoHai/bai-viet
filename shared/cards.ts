import type { Card, Rank, Suit } from './types';

export const SUITS: Suit[] = ['S', 'C', 'D', 'H'];
export const RANKS: Rank[] = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export const SUIT_ORDER: Record<Suit, number> = { S: 0, C: 1, D: 2, H: 3 };

export const SUIT_SYMBOL: Record<Suit, string> = {
  S: '\u2660',
  C: '\u2663',
  D: '\u2666',
  H: '\u2665',
};

export const RANK_LABEL: Record<Rank, string> = {
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
  15: '2',
};

export function cardLabel(card: Card): string {
  return `${RANK_LABEL[card.rank]}${SUIT_SYMBOL[card.suit]}`;
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${rank}-${suit}`, rank, suit });
    }
  }
  return deck;
}

export function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function compareCards(a: Card, b: Card): number {
  if (a.rank !== b.rank) return a.rank - b.rank;
  return SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
}

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort(compareCards);
}

export function isRed(card: Card): boolean {
  return card.suit === 'D' || card.suit === 'H';
}

export function isThreeSpade(card: Card): boolean {
  return card.rank === 3 && card.suit === 'S';
}

export function aceValueOptions(card: Card): number[] {
  if (card.rank === 14) return [1, 10, 11];
  if (card.rank >= 11 && card.rank <= 13) return [10];
  if (card.rank === 15) return [2];
  return [card.rank];
}

export interface HandValue {
  best: number;
  bust: boolean;
  soft: boolean;
}

export function handValue(cards: Card[]): HandValue {
  let totals = new Set<number>([0]);
  for (const card of cards) {
    const values = aceValueOptions(card);
    const next = new Set<number>();
    for (const total of totals) {
      for (const value of values) {
        next.add(total + value);
      }
    }
    totals = next;
  }
  let best = 0;
  for (const total of totals) {
    if (total <= 21 && total > best) best = total;
  }
  if (best === 0) {
    return { best: Math.min(...totals), bust: true, soft: false };
  }
  const soft = cards.some((c) => c.rank === 14) && best > 11 && totals.has(best - 10);
  return { best, bust: false, soft };
}

export function xidachSpecial(cards: Card[]): 'xibang' | 'xidach' | null {
  if (cards.length !== 2) return null;
  const aceCount = cards.filter((c) => c.rank === 14).length;
  if (aceCount === 2) return 'xibang';
  if (aceCount === 1) {
    const other = cards.find((c) => c.rank !== 14)!;
    if (other.rank >= 10 && other.rank <= 13) return 'xidach';
  }
  return null;
}

export function specialPower(status: 'xibang' | 'xidach' | null): number {
  if (status === 'xibang') return 2;
  if (status === 'xidach') return 1;
  return 0;
}
