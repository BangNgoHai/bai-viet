import type { PublicPlayer, RoomPublic, XidachStatus } from '../../../shared/types';
import { PlayingCard } from './Card';

const AVATARS = [
  'from-emerald-400 to-teal-600',
  'from-amber-300 to-orange-500',
  'from-sky-400 to-indigo-500',
  'from-rose-400 to-pink-600',
  'from-lime-400 to-green-600',
  'from-fuchsia-400 to-purple-600',
];

const STATUS_LABEL: Record<XidachStatus, { text: string; className: string }> = {
  waiting: { text: 'Chờ', className: 'bg-white/10 text-white/60' },
  playing: { text: 'Đang chơi', className: 'bg-emerald-400/15 text-emerald-200' },
  stood: { text: 'Dừng', className: 'bg-slate-400/15 text-slate-200' },
  bust: { text: 'Quắc', className: 'bg-rose-500/20 text-rose-200' },
  xidach: { text: 'Xì dách', className: 'bg-amber-400/20 text-amber-200' },
  xibang: { text: 'Xì bàng', className: 'bg-amber-400/25 text-amber-100' },
  ngulinh: { text: 'Ngũ linh', className: 'bg-sky-400/20 text-sky-200' },
};

interface SeatProps {
  player: PublicPlayer;
  room: RoomPublic;
  isMe?: boolean;
}

export function Seat({ player, room, isMe = false }: SeatProps) {
  const isTurn = room.turnPlayerId === player.id;
  const status = player.status ? STATUS_LABEL[player.status] : null;

  return (
    <div
      className={`relative flex min-w-[124px] flex-col items-center gap-1.5 rounded-2xl border px-3 py-2.5 transition ${
        isTurn
          ? 'turn-pulse border-amber-300/60 bg-amber-300/5'
          : 'border-white/10 bg-black/25'
      }`}
    >
      {player.isDealer && (
        <span className="absolute -top-2 rounded-full bg-amber-300 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-950">
          Cái
        </span>
      )}
      <div className="relative">
        <div
          className={`grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br ${
            AVATARS[player.seat % AVATARS.length]
          } text-sm font-bold text-emerald-950 shadow-inner`}
        >
          {player.nickname.slice(0, 1).toUpperCase()}
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-black/40 ${
            player.connected ? 'bg-emerald-400' : 'bg-slate-500'
          }`}
        />
      </div>

      <div className="max-w-[120px] truncate text-sm font-semibold">{player.nickname}</div>

      <div className="flex flex-wrap justify-center gap-1 text-[9px] font-semibold uppercase tracking-wide">
        {player.isHost && (
          <span className="rounded-full bg-amber-300/15 px-1.5 py-0.5 text-amber-200">Chủ</span>
        )}
        {player.isBot && (
          <span className="rounded-full bg-sky-400/15 px-1.5 py-0.5 text-sky-200">Bot</span>
        )}
        {isMe && (
          <span className="rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-emerald-200">Bạn</span>
        )}
        {!player.connected && !player.isBot && (
          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-white/50">Offline</span>
        )}
      </div>

      {room.mode === 'xidach' ? (
        <div className="text-center text-[11px] leading-tight text-emerald-100/65">
          <div>{player.chips} chip</div>
          <div className="text-[10px] text-amber-200/70">Cược {player.bet}</div>
        </div>
      ) : (
        <div className="text-[11px] text-emerald-100/65">{player.handCount} lá</div>
      )}

      {room.mode === 'xidach' && status && room.phase !== 'lobby' && (
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>
          {status.text}
        </span>
      )}

      {room.reveal && player.hand && player.hand.length > 0 && (
        <div className="mt-1 flex -space-x-2">
          {player.hand.slice(0, 6).map((card) => (
            <PlayingCard key={card.id} card={card} size="xs" />
          ))}
        </div>
      )}
    </div>
  );
}
