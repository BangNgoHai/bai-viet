import type { Card } from '../../../shared/types';
import { RANK_LABEL, SUIT_SYMBOL, isRed } from '../../../shared/cards';

export type CardSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_CLASS: Record<CardSize, { box: string; corner: string; center: string }> = {
  xs: { box: 'h-10 w-7 rounded-[4px]', corner: 'text-[8px]', center: 'hidden' },
  sm: { box: 'h-12 w-9 rounded-md', corner: 'text-[10px]', center: 'text-lg' },
  md: { box: 'h-16 w-11 rounded-lg', corner: 'text-xs', center: 'text-2xl' },
  lg: {
    box: 'h-20 w-14 rounded-xl max-sm:h-16 max-sm:w-10',
    corner: 'text-sm max-sm:text-[10px]',
    center: 'text-3xl max-sm:text-xl',
  },
};

interface PlayingCardProps {
  card?: Card;
  size?: CardSize;
  faceDown?: boolean;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function PlayingCard({
  card,
  size = 'md',
  faceDown = false,
  selected = false,
  onClick,
  className = '',
}: PlayingCardProps) {
  const sized = SIZE_CLASS[size];
  const base = `relative shrink-0 select-none ${sized.box} ${
    faceDown ? 'card-back' : 'card-face'
  } ${selected ? 'z-10 -translate-y-3 ring-2 ring-amber-300' : ''} ${
    onClick ? 'cursor-pointer transition-transform hover:-translate-y-1' : ''
  } transition-all duration-150 ${className}`;

  if (faceDown || !card) {
    const back = (
      <>
        <div className="absolute inset-1 rounded-[inherit] border border-white/20" />
        <div className="absolute inset-0 grid place-items-center text-white/25">
          <span className={size === 'xs' ? 'text-[10px]' : 'text-lg'}>&#9824;</span>
        </div>
      </>
    );
    if (onClick) {
      return (
        <button type="button" onClick={onClick} className={base} aria-label="Lá bài úp">
          {back}
        </button>
      );
    }
    return (
      <div className={base} aria-hidden>
        {back}
      </div>
    );
  }

  const color = isRed(card) ? 'text-rose-600' : 'text-slate-900';
  const label = RANK_LABEL[card.rank];
  const symbol = SUIT_SYMBOL[card.suit];

  const content = (
    <>
      <span
        className={`absolute left-1 top-0.5 flex flex-col items-center font-bold leading-none ${sized.corner} ${color}`}
      >
        <span>{label}</span>
        <span>{symbol}</span>
      </span>
      <span
        className={`absolute inset-0 grid place-items-center font-semibold ${sized.center} ${color}`}
      >
        {symbol}
      </span>
      <span
        className={`absolute bottom-0.5 right-1 flex rotate-180 flex-col items-center font-bold leading-none ${sized.corner} ${color}`}
      >
        <span>{label}</span>
        <span>{symbol}</span>
      </span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={base}>
        {content}
      </button>
    );
  }

  return <div className={base}>{content}</div>;
}
