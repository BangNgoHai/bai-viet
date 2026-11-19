import { useEffect, useState } from 'react';
import type { Card, PublicPlayer, RoomPublic } from '../../../shared/types';
import { MODE_META } from '../../../shared/types';
import { handValue, sortCards, SUIT_SYMBOL } from '../../../shared/cards';
import { useGame } from '../store';
import { ChatPanel } from './Chat';
import { PlayingCard } from './Card';
import { Seat } from './Seat';

const AVATARS = [
  'from-emerald-400 to-teal-600',
  'from-amber-300 to-orange-500',
  'from-sky-400 to-indigo-500',
  'from-rose-400 to-pink-600',
  'from-lime-400 to-green-600',
  'from-fuchsia-400 to-purple-600',
];

const COMBO_LABEL: Record<string, string> = {
  single: 'Bài lẻ',
  pair: 'Đôi',
  triple: 'Sám',
  quad: 'Tứ quý',
  straight: 'Sảnh',
  double_straight: 'Đôi thông',
};

export function RoomScreen() {
  const room = useGame((s) => s.room);
  const connected = useGame((s) => s.connected);
  const leaveRoom = useGame((s) => s.leaveRoom);
  const toast = useGame((s) => s.toast);
  const [chatOpen, setChatOpen] = useState(false);

  if (!room) return null;

  const copyInvite = async () => {
    const link = `${window.location.origin}/?room=${room.code}`;
    try {
      await navigator.clipboard.writeText(link);
      toast('success', 'Đã copy link mời');
    } catch {
      toast('error', 'Không copy được, hãy gửi mã phòng thủ công');
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        room={room}
        connected={connected}
        onCopy={() => void copyInvite()}
        onLeave={leaveRoom}
        onChat={() => setChatOpen(true)}
      />

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 gap-4 px-3 py-3 lg:px-5 lg:py-5">
        <main className="min-w-0 flex-1">
          {room.phase === 'lobby' ? (
            <Lobby room={room} onCopy={() => void copyInvite()} />
          ) : (
            <GameTable room={room} />
          )}
        </main>
        <aside className="hidden w-[320px] shrink-0 lg:block">
          <ChatPanel
            messages={room.chat}
            className="sticky top-[76px] h-[calc(100vh-100px)]"
          />
        </aside>
      </div>

      {chatOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Đóng chat"
            className="absolute inset-0 bg-black/70"
            onClick={() => setChatOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 top-16 px-3 pb-3">
            <ChatPanel messages={room.chat} className="h-full" onClose={() => setChatOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

interface TopBarProps {
  room: RoomPublic;
  connected: boolean;
  onCopy: () => void;
  onLeave: () => void;
  onChat: () => void;
}

function TopBar({ room, connected, onCopy, onLeave, onChat }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-[#06100d]/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-3 py-2.5 lg:px-5">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-lg text-amber-950">
            {SUIT_SYMBOL.S}
          </span>
          <div className="hidden sm:block">
            <div className="text-sm font-bold leading-tight">Bài Việt</div>
            <div className="text-[9px] uppercase tracking-[0.22em] text-emerald-300/50">
              {MODE_META[room.mode].label}
            </div>
          </div>
        </div>

        <span
          className={`ml-1 flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] ${
            connected
              ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
              : 'border-rose-400/20 bg-rose-400/10 text-rose-200'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              connected ? 'bg-emerald-400' : 'animate-pulse bg-rose-400'
            }`}
          />
          <span className="hidden sm:inline">{connected ? 'Online' : 'Offline'}</span>
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="group flex items-center gap-2 rounded-xl border border-amber-300/20 bg-amber-300/5 px-2.5 py-1.5 transition hover:bg-amber-300/10"
            title="Copy link mời"
          >
            <span className="hidden text-[9px] uppercase tracking-[0.18em] text-amber-200/50 sm:block">
              Mã phòng
            </span>
            <span className="font-mono text-sm font-bold tracking-[0.22em] text-amber-200 sm:text-base">
              {room.code}
            </span>
            <span className="hidden text-[10px] text-amber-200/60 group-hover:text-amber-200 sm:inline">
              Copy
            </span>
          </button>

          <button
            type="button"
            onClick={onChat}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-emerald-100/80 transition hover:bg-white/10 lg:hidden"
          >
            Chat
          </button>

          <button
            type="button"
            onClick={onLeave}
            className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20"
          >
            Rời
          </button>
        </div>
      </div>
    </header>
  );
}

function Lobby({ room, onCopy }: { room: RoomPublic; onCopy: () => void }) {
  const me = room.players.find((player) => player.id === room.meId);
  const isHost = Boolean(me?.isHost);
  const isFull = room.players.length >= room.maxPlayers;
  const hostName = room.players.find((player) => player.id === room.hostId)?.nickname ?? '';
  const startGame = useGame((s) => s.startGame);
  const playBots = useGame((s) => s.playBots);
  const addBot = useGame((s) => s.addBot);
  const removeBot = useGame((s) => s.removeBot);
  const kick = useGame((s) => s.kick);

  const tips =
    room.mode === 'xidach'
      ? [
          'Nhà cái rút đến ít nhất 16 điểm, sau đó so điểm với từng người.',
          'Xì bàng (2 lá A) > Xì dách (A + 10/J/Q/K) > Ngũ linh (5 lá ≤ 21).',
          'Mỗi ván bạn chọn mức cược. Nhà cái luân phiên theo vòng.',
        ]
      : [
          'Người có 3♠ đi trước. Ván đầu phải đánh bộ có 3♠.',
          'Tứ quý chặt được 2 và đôi 2; 4 đôi thông chặt được tứ quý.',
          'Ai hết bài trước thắng. Người còn 2 trên tay bị phạt thêm.',
        ];

  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/50">
              Phòng chờ
            </p>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
              {MODE_META[room.mode].label}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-emerald-100/55">
              {room.players.length < 2
                ? 'Cần ít nhất 2 người chơi. Mời bạn bè bằng mã phòng hoặc chơi với bot.'
                : 'Đã đủ người. Chủ phòng bấm bắt đầu khi mọi người sẵn sàng.'}
            </p>
          </div>

          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 px-5 py-3 text-center">
            <p className="text-[9px] uppercase tracking-[0.25em] text-amber-200/50">Mã phòng</p>
            <p className="font-mono text-2xl font-bold tracking-[0.3em] text-amber-200">
              {room.code}
            </p>
            <button
              type="button"
              onClick={onCopy}
              className="mt-1 text-[11px] font-semibold text-amber-200/80 underline decoration-amber-200/30 underline-offset-4 hover:text-amber-100"
            >
              Copy link mời
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {room.players.map((player) => {
            const labels = [
              player.isHost ? 'Chủ phòng' : 'Khách',
              player.isBot ? 'Bot' : null,
              player.id === room.meId ? 'Bạn' : null,
            ].filter(Boolean);
            const canRemove = isHost && player.isBot;
            const canKick = isHost && !player.isBot && player.id !== room.meId;

            return (
              <div
                key={player.id}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3"
              >
                <div
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br ${
                    AVATARS[player.seat % AVATARS.length]
                  } text-sm font-bold text-emerald-950`}
                >
                  {player.nickname.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{player.nickname}</div>
                  <div className="text-[11px] text-emerald-200/45">{labels.join(' · ')}</div>
                </div>
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => removeBot(player.id)}
                    className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-emerald-100/60 hover:bg-white/10"
                  >
                    Xóa
                  </button>
                )}
                {canKick && (
                  <button
                    type="button"
                    onClick={() => kick(player.id)}
                    className="rounded-lg border border-rose-400/20 px-2 py-1 text-[10px] text-rose-200/80 hover:bg-rose-500/10"
                  >
                    Mời ra
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {isHost ? (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/5 pt-5">
            <button
              type="button"
              onClick={startGame}
              disabled={room.players.length < 2}
              className="rounded-xl bg-gradient-to-r from-amber-300 to-amber-400 px-5 py-2.5 text-sm font-bold text-amber-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-200 hover:to-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Bắt đầu ván
            </button>
            <button
              type="button"
              onClick={playBots}
              className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-emerald-400"
            >
              Chơi với bot
            </button>
            <button
              type="button"
              onClick={addBot}
              disabled={isFull}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-emerald-100/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Thêm bot
            </button>
            {room.players.length < 2 && (
              <span className="text-[11px] text-amber-200/60">
                Hoặc bấm “Chơi với bot” để vào ván ngay.
              </span>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-emerald-100/65">
            Đang chờ <b className="text-emerald-100">{hostName}</b> bắt đầu ván...
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="glass rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200/60">
            Luật nhanh
          </h3>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-emerald-100/55">
            {tips.map((tip) => (
              <li key={tip} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-300/70" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
        <div className="glass rounded-2xl p-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200/60">
            Mẹo mời bạn
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-emerald-100/55">
            Gửi link hoặc mã <b className="font-mono text-amber-200">{room.code}</b> qua
            Zalo/Messenger. Bạn bè mở link là được điền sẵn mã phòng. Mất mạng giữa ván
            vẫn vào lại được đúng chỗ.
          </p>
          <button
            type="button"
            onClick={onCopy}
            className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-300/15"
          >
            Copy link mời
          </button>
        </div>
      </div>
    </div>
  );
}

function GameTable({ room }: { room: RoomPublic }) {
  const me = room.players.find((player) => player.id === room.meId);
  const opponents = room.players.filter((player) => player.id !== room.meId);
  const myTurn = room.turnPlayerId === room.meId;
  const [selected, setSelected] = useState<string[]>([]);
  const game = useGame((s) => s.game);

  useEffect(() => {
    setSelected([]);
  }, [room.round, room.turnPlayerId, room.phase]);

  if (!me) return null;

  const myCards = me.hand ? sortCards(me.hand) : [];
  const selectable = room.mode === 'tienlen' && room.phase === 'playing' && myTurn;
  const myValue = myCards.length > 0 ? handValue(myCards).best : null;

  const toggleCard = (card: Card) => {
    if (!selectable) return;
    setSelected((previous) =>
      previous.includes(card.id) ? previous.filter((id) => id !== card.id) : [...previous, card.id],
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-emerald-100/70">
            Ván {room.round}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-emerald-100/70">
            {room.players.length} người chơi
          </span>
          {room.mode === 'xidach' && (
            <span className="rounded-full border border-amber-300/15 bg-amber-300/5 px-3 py-1 text-amber-200/70">
              Cược của bạn: {me.bet}
            </span>
          )}
        </div>
        <TurnLabel room={room} />
      </div>

      <div className="felt relative overflow-hidden rounded-[30px] p-3 sm:p-5">
        <div className="relative z-[1]">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {opponents.map((player) => (
              <Seat key={player.id} player={player} room={room} />
            ))}
          </div>

          <div className="my-4 flex min-h-[110px] flex-col items-center justify-center gap-2 sm:my-6">
            {room.mode === 'xidach' ? <XidachCenter room={room} /> : <TienlenCenter room={room} />}
            {room.phase === 'round_end' && room.resultText && (
              <div className="mt-1 max-w-xl rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-center text-sm text-amber-100">
                {room.resultText}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div
                className={`grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br ${
                  AVATARS[me.seat % AVATARS.length]
                } text-sm font-bold text-emerald-950`}
              >
                {me.nickname.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold">
                  {me.nickname}{' '}
                  <span className="ml-1 rounded-full bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-200">
                    Bạn
                  </span>
                </div>
                <div className="text-[11px] text-emerald-100/55">
                  {room.mode === 'xidach'
                    ? `${me.chips} chip · cược ${me.bet}`
                    : `${me.handCount} lá`}
                </div>
              </div>

              {room.mode === 'xidach' && (
                <div className="ml-auto rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-right">
                  <div className="text-[9px] uppercase tracking-wide text-emerald-200/50">Điểm</div>
                  <div className="text-lg font-bold leading-tight text-amber-200">
                    {myValue ?? '—'}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 flex justify-center overflow-x-auto px-1 py-2 no-scrollbar">
              {myCards.length === 0 ? (
                <p className="py-6 text-sm text-emerald-100/40">
                  {room.phase === 'round_end' ? 'Hết ván' : 'Đang chờ chia bài...'}
                </p>
              ) : (
                <div className="flex -space-x-4 px-2 pt-3 sm:-space-x-2">
                  {myCards.map((card) => (
                    <PlayingCard
                      key={card.id}
                      card={card}
                      size="lg"
                      selected={selected.includes(card.id)}
                      onClick={selectable ? () => toggleCard(card) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>

            {room.mode === 'tienlen' && selected.length > 0 && (
              <p className="mt-1 text-center text-[11px] text-amber-200/80">
                Đã chọn {selected.length} lá
              </p>
            )}
          </div>
        </div>
      </div>

      <ActionBar room={room} me={me} myTurn={myTurn} selectedCount={selected.length} onPlay={() => {
        if (selected.length > 0) game('play', { cards: selected });
      }} />
    </div>
  );
}

function TurnLabel({ room }: { room: RoomPublic }) {
  if (room.phase === 'round_end') {
    return (
      <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-200">
        Ván kết thúc
      </span>
    );
  }
  const turn = room.players.find((player) => player.id === room.turnPlayerId);
  if (!turn) return null;
  const mine = turn.id === room.meId;
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        mine
          ? 'border-amber-300/40 bg-amber-300/15 text-amber-200'
          : 'border-white/10 bg-white/5 text-emerald-100/70'
      }`}
    >
      {mine ? 'Lượt của bạn' : `Lượt: ${turn.nickname}`}
    </span>
  );
}

function XidachCenter({ room }: { room: RoomPublic }) {
  const dealer = room.players.find((player) => player.id === room.dealerId);
  const showHand = Boolean(dealer?.hand && (room.reveal || dealer.id === room.meId));
  const value = showHand && dealer?.hand ? handValue(dealer.hand).best : null;
  const backCount = Math.max(2, Math.min(dealer?.handCount ?? 2, 5));

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-full bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-emerald-100/55">
        Nhà cái{dealer ? ` · ${dealer.nickname}` : ''}
      </div>
      <div className="flex -space-x-2">
        {showHand && dealer?.hand && dealer.hand.length > 0 ? (
          dealer.hand.map((card) => <PlayingCard key={card.id} card={card} size="md" />)
        ) : (
          Array.from({ length: backCount }).map((_, index) => (
            <PlayingCard key={index} faceDown size="md" />
          ))
        )}
      </div>
      {value !== null && (
        <span className="text-sm font-semibold text-amber-200">{value} điểm</span>
      )}
      {room.phase === 'playing' && !room.reveal && (
        <p className="text-[11px] text-emerald-100/35">Lá úp sẽ mở khi kết thúc ván</p>
      )}
    </div>
  );
}

function TienlenCenter({ room }: { room: RoomPublic }) {
  const turn = room.players.find((player) => player.id === room.turnPlayerId);
  const last = room.players.find((player) => player.id === room.lastPlayerId);

  if (!room.currentCombo) {
    return (
      <div className="text-center">
        <p className="text-[10px] uppercase tracking-[0.28em] text-emerald-200/40">Vòng mới</p>
        <p className="mt-1 text-sm text-emerald-100/70">
          {turn ? `${turn.nickname} đi trước` : 'Đang chờ chia bài'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-[11px] text-emerald-100/50">{last?.nickname ?? 'Ai đó'} đánh</p>
      <div className="flex -space-x-2">
        {room.currentCombo.cards.map((card) => (
          <PlayingCard key={card.id} card={card} size="md" />
        ))}
      </div>
      <p className="text-[10px] uppercase tracking-wide text-amber-200/60">
        {COMBO_LABEL[room.currentCombo.type] ?? room.currentCombo.type} ·{' '}
        {room.currentCombo.cards.length} lá
      </p>
    </div>
  );
}

interface ActionBarProps {
  room: RoomPublic;
  me: PublicPlayer;
  myTurn: boolean;
  selectedCount: number;
  onPlay: () => void;
}

function ActionBar({ room, me, myTurn, selectedCount, onPlay }: ActionBarProps) {
  const game = useGame((s) => s.game);
  const turn = room.players.find((player) => player.id === room.turnPlayerId);
  const isHost = me.isHost;
  const betLocked = room.phase === 'playing';
  const bets = [10, 50, 100, 200];

  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {room.mode === 'xidach' && (
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/20 p-1">
            <span className="px-2 text-[9px] uppercase tracking-[0.16em] text-emerald-200/50">
              Cược
            </span>
            {bets.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => game('bet', { bet: amount })}
                disabled={betLocked}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  me.bet === amount
                    ? 'bg-amber-300 text-amber-950'
                    : 'text-emerald-100/70 hover:bg-white/10 disabled:opacity-40'
                }`}
              >
                {amount}
              </button>
            ))}
          </div>
        )}

        <span className="text-[11px] text-emerald-100/45">
          {room.mode === 'xidach'
            ? `Chip: ${me.chips}`
            : room.currentCombo
              ? `Trên bàn: ${COMBO_LABEL[room.currentCombo.type] ?? ''}`
              : 'Bạn có thể mở vòng'}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {room.phase === 'round_end' ? (
          isHost ? (
            <button
              type="button"
              onClick={() => game('next')}
              className="rounded-xl bg-gradient-to-r from-amber-300 to-amber-400 px-5 py-2.5 text-sm font-bold text-amber-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-200 hover:to-amber-300"
            >
              Ván tiếp theo
            </button>
          ) : (
            <span className="text-xs text-emerald-100/50">Chờ chủ phòng mở ván mới...</span>
          )
        ) : room.mode === 'xidach' ? (
          myTurn ? (
            <>
              <button
                type="button"
                onClick={() => game('hit')}
                className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-emerald-400"
              >
                Rút bài
              </button>
              <button
                type="button"
                onClick={() => game('stand')}
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-emerald-100/80 transition hover:bg-white/10"
              >
                Dừng
              </button>
            </>
          ) : (
            <span className="text-xs text-emerald-100/50">
              {turn ? `Chờ ${turn.nickname}...` : 'Đang chia bài...'}
            </span>
          )
        ) : myTurn ? (
          <>
            <button
              type="button"
              onClick={onPlay}
              disabled={selectedCount === 0}
              className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Đánh{selectedCount > 0 ? ` ${selectedCount} lá` : ''}
            </button>
            <button
              type="button"
              onClick={() => game('pass')}
              disabled={!room.currentCombo}
              className="rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-emerald-100/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Bỏ lượt
            </button>
          </>
        ) : (
          <span className="text-xs text-emerald-100/50">
            {turn ? `Lượt của ${turn.nickname}` : 'Đang chia bài...'}
          </span>
        )}
      </div>
    </div>
  );
}
