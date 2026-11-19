import type { Card, Combo, ComboType, Rank } from '../../shared/types';
import { compareCards, sortCards } from '../../shared/cards';
import { canBeat, detectCombo } from './combo';

function groups(hand: Card[]): Map<Rank, Card[]> {
  const map = new Map<Rank, Card[]>();
  for (const card of hand) {
    const arr = map.get(card.rank) ?? [];
    arr.push(card);
    map.set(card.rank, arr);
  }
  for (const arr of map.values()) arr.sort(compareCards);
  return map;
}

function makeCombos(hand: Card[], type: ComboType, length: number): Combo[] {
  const map = groups(hand);
  const ranks = [...map.keys()].sort((a, b) => a - b);
  const result: Combo[] = [];

  const push = (cards: Card[]) => {
    const combo = detectCombo(cards);
    if (combo) result.push(combo);
  };

  if (type === 'single') {
    for (const card of sortCards(hand)) push([card]);
    return result;
  }

  if (type === 'pair' || type === 'triple' || type === 'quad') {
    const need = type === 'pair' ? 2 : type === 'triple' ? 3 : 4;
    for (const rank of ranks) {
      const arr = map.get(rank)!;
      if (arr.length >= need) push(arr.slice(0, need));
    }
    return result;
  }

  if (type === 'straight') {
    for (let start = 3; start + length - 1 <= 14; start += 1) {
      const cards: Card[] = [];
      let ok = true;
      for (let r = start; r < start + length; r += 1) {
        const arr = map.get(r as Rank);
        if (!arr || arr.length === 0) {
          ok = false;
          break;
        }
        cards.push(arr[0]);
      }
      if (ok) push(cards);
    }
    return result;
  }

  if (type === 'double_straight') {
    for (let start = 3; start + length - 1 <= 14; start += 1) {
      const cards: Card[] = [];
      let ok = true;
      for (let r = start; r < start + length; r += 1) {
        const arr = map.get(r as Rank);
        if (!arr || arr.length < 2) {
          ok = false;
          break;
        }
        cards.push(arr[0], arr[1]);
      }
      if (ok) push(cards);
    }
    return result;
  }

  return result;
}

function pickLowest(combos: Combo[]): Combo | null {
  if (combos.length === 0) return null;
  const sorted = [...combos].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    if (a.suit !== b.suit) return compareCards(a.cards[0], b.cards[0]);
    return a.cards.length - b.cards.length;
  });
  return sorted[0];
}

export function chooseTienlenMove(
  hand: Card[],
  currentCombo: Combo | null,
  mustStartWithThree: boolean,
): Card[] | null {
  if (hand.length === 0) return null;

  if (mustStartWithThree) {
    const three = hand.find((c) => c.rank === 3 && c.suit === 'S');
    if (three) return [three];
  }

  if (!currentCombo) {
    const sorted = sortCards(hand);
    const lead = sorted.find((c) => c.rank !== 15) ?? sorted[0];
    return [lead];
  }

  const options: Combo[] = [];
  const sameType = makeCombos(hand, currentCombo.type, currentCombo.length);
  options.push(...sameType);

  if (currentCombo.type === 'single' && currentCombo.rank === 15) {
    options.push(...makeCombos(hand, 'quad', 1));
    for (let len = 3; len <= 6; len += 1) options.push(...makeCombos(hand, 'double_straight', len));
  } else if (currentCombo.type === 'pair' && currentCombo.rank === 15) {
    options.push(...makeCombos(hand, 'quad', 1));
  } else if (currentCombo.type === 'quad') {
    for (let len = 4; len <= 6; len += 1) options.push(...makeCombos(hand, 'double_straight', len));
  }

  const valid = options.filter((combo) => canBeat(combo, currentCombo));
  const best = pickLowest(valid);
  return best ? best.cards : null;
}
