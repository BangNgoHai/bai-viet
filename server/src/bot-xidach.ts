import type { Card } from '../../shared/types';
import { handValue } from '../../shared/cards';

export function chooseXidachAction(cards: Card[]): 'hit' | 'stand' {
  const { best, bust } = handValue(cards);
  if (bust) return 'stand';
  if (best < 16) return 'hit';
  if (best < 18) return cards.length <= 2 ? 'hit' : 'stand';
  return 'stand';
}
