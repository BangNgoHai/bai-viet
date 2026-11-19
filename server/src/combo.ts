import type { Card, Combo, ComboType, Rank } from '../../shared/types';
import { compareCards, sortCards, SUIT_ORDER, cardLabel, RANK_LABEL, SUIT_SYMBOL } from '../../shared/cards';

function groupByRank(cards: Card[]): Map<Rank, Card[]> {
  const map = new Map<Rank, Card[]>();
  for (const card of cards) {
    const group = map.get(card.rank) ?? [];
    group.push(card);
    map.set(card.rank, group);
  }
  for (const group of map.values()) group.sort(compareCards);
  return map;
}

function isConsecutive(ranks: number[]): boolean {
  for (let i = 1; i < ranks.length; i += 1) {
    if (ranks[i] !== ranks[i - 1] + 1) return false;
  }
  return true;
}

export function detectCombo(rawCards: Card[]): Combo | null {
  if (rawCards.length === 0) return null;
  if (new Set(rawCards.map((c) => c.id)).size !== rawCards.length) return null;

  const cards = sortCards(rawCards);
  const groups = groupByRank(cards);
  const ranks = [...groups.keys()].sort((a, b) => a - b);
  const top = cards[cards.length - 1];
  const lengths = [...groups.values()].map((g) => g.length);

  const make = (type: ComboType, length: number): Combo => ({
    type,
    rank: top.rank,
    suit: top.suit,
    length,
    cards,
  });

  if (cards.length === 1) return make('single', 1);

  if (cards.length === 2 && ranks.length === 1) return make('pair', 1);

  if (cards.length === 3 && ranks.length === 1) return make('triple', 1);

  if (cards.length === 4 && ranks.length === 1) return make('quad', 1);

  if (
    cards.length >= 3 &&
    lengths.every((l) => l === 1) &&
    top.rank <= 14 &&
    isConsecutive(ranks)
  ) {
    return make('straight', cards.length);
  }

  if (
    cards.length >= 6 &&
    cards.length % 2 === 0 &&
    ranks.length >= 3 &&
    lengths.every((l) => l === 2) &&
    top.rank <= 14 &&
    isConsecutive(ranks)
  ) {
    return make('double_straight', ranks.length);
  }

  return null;
}

const COMBO_LABEL: Record<ComboType, string> = {
  single: 'bài lẻ',
  pair: 'đôi',
  triple: 'sám',
  quad: 'tứ quý',
  straight: 'sảnh',
  double_straight: 'đôi thông',
};

export function comboText(combo: Combo): string {
  const cards = sortCards(combo.cards)
    .map((c) => `${RANK_LABEL[c.rank]}${SUIT_SYMBOL[c.suit]}`)
    .join(' ');
  return `${COMBO_LABEL[combo.type]} [${cards}]`;
}

export function canBeat(next: Combo, prev: Combo | null): boolean {
  if (!prev) return true;

  if (prev.type === 'single' && prev.rank === 15) {
    if (next.type === 'quad') return true;
    if (next.type === 'double_straight' && next.length >= 3) return true;
    return false;
  }

  if (prev.type === 'pair' && prev.rank === 15) {
    return next.type === 'quad';
  }

  if (prev.type === 'quad') {
    return next.type === 'double_straight' && next.length >= 4;
  }

  if (next.type !== prev.type) return false;

  if (next.type === 'straight' || next.type === 'double_straight') {
    if (next.length !== prev.length) return false;
  }

  if (next.rank !== prev.rank) return next.rank > prev.rank;
  return SUIT_ORDER[next.suit] > SUIT_ORDER[prev.suit];
}
