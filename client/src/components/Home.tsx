import { useEffect, useState } from 'react';
import type { GameMode, LeaderboardRow } from '../../../shared/types';
import { MODE_META } from '../../../shared/types';
import { SUIT_SYMBOL } from '../../../shared/cards';
import { useGame } from '../store';

const MODES: {
  id: GameMode;
  title: string;
  tagline: string;
  description: string;
  art: string;
  accent: string;
}[] = [
  {
    id: 'xidach',
    title: 'Xì dách',
    tagline: 'Nhà cái vs người chơi',
    description: 'Rút bài gần 21 điểm. Xì bàng, xì dách và ngũ linh ăn lớn.',
    art: `A${SUIT_SYMBOL.S}`,
    accent: 'text-rose-500',
  },
  {
    id: 'tienlen',
    title: 'Tiến lên',
    tagline: 'Miền Nam · 13 lá',
    description: 'Đánh hết bài trước. Tứ quý chặt 2, đôi thông phá vòng.',
    art: `3${SUIT_SYMBOL.S}`,
    accent: 'text-slate-900',
  },
];

export function HomeScreen() {
  const connected = useGame((s) => s.connected);
  const busy = useGame((s) => s.busy);
  const nickname = useGame((s) => s.nickname);
  const setNickname = useGame((s) => s.setNickname);
  const createRoom = useGame((s) => s.createRoom);
  const joinRoom = useGame((s) => s.joinRoom);

  const [mode, setMode] = useState<GameMode>('xidach');
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [code, setCode] = useState('');
  const [leaders, setLeaders] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    const roomParam = new URLSearchParams(window.location.search).get('room');
    if (roomParam) {
      setCode(roomParam.toUpperCase().slice(0, 6));
      setTab('join');
    }
    fetch('/api/leaderboard')
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => setLeaders(rows as LeaderboardRow[]))
      .catch(() => setLeaders([]));
  }, []);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:py-10">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-2xl text-amber-950 shadow-lg shadow-amber-500/20">
            {SUIT_SYMBOL.S}
          </div>
          <div>
            <p className="text-lg font-extrabold tracking-tight">Bài Việt</p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/50">
              Card room
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-emerald-100/70">
          <span
            className={`h-2 w-2 rounded-full ${
              connected ? 'bg-emerald-400' : 'animate-pulse bg-rose-400'
            }`}
          />
          {connected ? 'Trực tuyến' : 'Đang kết nối'}
        </div>
      </header>

      <div className="mt-8 grid flex-1 items-start gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <section className="space-y-6">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-amber-200/70">
              <span className="h-px w-8 bg-amber-300/40" />
              Phòng bài của bạn
            </div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Chơi bài cùng <span className="text-amber-300">bạn bè</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-emerald-100/60 sm:text-base">
              Tạo phòng, gửi mã 6 ký tự hoặc link mời. Hai game kinh điển Việt Nam,
              chơi được ngay trên điện thoại và máy tính.
            </p>
          </div>

          <div className="glass space-y-5 rounded-3xl p-5 sm:p-6">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/50">
                Tên hiển thị
              </span>
              <input
                value={nickname}
                onChange={(event) => setNickname(event.target.value.slice(0, 16))}
                maxLength={16}
                placeholder="Ví dụ: Minh"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm outline-none transition placeholder:text-emerald-100/25 focus:border-emerald-400/60"
              />
            </label>

            <div>
              <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/50">
                Chọn game
              </span>
              <div className="grid gap-3 sm:grid-cols-2">
                {MODES.map((item) => {
                  const active = mode === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMode(item.id)}
                      className={`relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                        active
                          ? 'border-emerald-400/60 bg-emerald-400/10 shadow-glow'
                          : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-base font-bold">{item.title}</p>
                          <p className="text-[11px] text-emerald-200/50">{item.tagline}</p>
                        </div>
                        <span
                          className={`grid h-10 w-8 place-items-center rounded-md bg-white text-lg font-bold shadow ${item.accent}`}
                        >
                          {item.art}
                        </span>
                      </div>
                      <p className="mt-3 text-xs leading-relaxed text-emerald-100/55">
                        {item.description}
                      </p>
                      <span className="mt-2 inline-block rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-emerald-100/50">
                        {MODE_META[item.id].min}–{MODE_META[item.id].max} người
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl bg-black/30 p-1">
              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setTab('create')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    tab === 'create'
                      ? 'bg-emerald-500 text-emerald-950'
                      : 'text-emerald-100/60 hover:bg-white/5'
                  }`}
                >
                  Tạo phòng
                </button>
                <button
                  type="button"
                  onClick={() => setTab('join')}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    tab === 'join'
                      ? 'bg-emerald-500 text-emerald-950'
                      : 'text-emerald-100/60 hover:bg-white/5'
                  }`}
                >
                  Vào bằng mã
                </button>
              </div>
            </div>

            {tab === 'create' ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => void createRoom(mode)}
                  disabled={busy || !connected}
                  className="w-full rounded-xl bg-gradient-to-r from-amber-300 to-amber-400 px-4 py-3 text-sm font-bold text-amber-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-200 hover:to-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? 'Đang tạo phòng...' : `Tạo phòng ${MODE_META[mode].label}`}
                </button>
                <p className="text-center text-[11px] text-emerald-100/40">
                  Bạn sẽ nhận mã phòng để gửi cho bạn bè.
                </p>
              </div>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void joinRoom(code);
                }}
                className="space-y-2"
              >
                <div className="flex gap-2">
                  <input
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
                    }
                    maxLength={6}
                    placeholder="MÃ PHÒNG"
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-base tracking-[0.35em] outline-none transition placeholder:tracking-[0.25em] placeholder:text-emerald-100/25 focus:border-amber-300/60"
                  />
                  <button
                    type="submit"
                    disabled={busy || !connected || code.length < 4}
                    className="rounded-xl bg-emerald-500 px-6 py-3 text-sm font-bold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Vào
                  </button>
                </div>
                <p className="text-center text-[11px] text-emerald-100/40">
                  Nhập mã 6 ký tự chủ phòng gửi cho bạn.
                </p>
              </form>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="glass rounded-3xl p-5">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-sm font-bold">Bảng xếp hạng</h2>
                <p className="text-[11px] text-emerald-200/45">Thắng nhiều nhất</p>
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-amber-200/50">
                Top 15
              </span>
            </div>
            <div className="mt-3 space-y-1.5">
              {leaders.length === 0 && (
                <p className="rounded-xl bg-white/5 px-3 py-6 text-center text-xs text-emerald-100/40">
                  Chưa có trận nào. Chơi ván đầu tiên nhé!
                </p>
              )}
              {leaders.map((row, index) => (
                <div
                  key={row.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition hover:bg-white/5"
                >
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-lg text-[11px] font-bold ${
                      index === 0
                        ? 'bg-amber-300 text-amber-950'
                        : index === 1
                          ? 'bg-slate-300 text-slate-900'
                          : index === 2
                            ? 'bg-orange-400/80 text-orange-950'
                            : 'bg-white/5 text-emerald-100/50'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{row.nickname}</span>
                  <span className="text-xs font-semibold text-emerald-300">{row.wins} thắng</span>
                  <span className="text-[10px] text-emerald-100/35">{row.games} ván</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-3xl p-5">
            <h2 className="text-sm font-bold">Cách chơi cùng bạn bè</h2>
            <ol className="mt-3 space-y-2.5 text-xs leading-relaxed text-emerald-100/60">
              <li className="flex gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-[10px] font-bold text-emerald-300">
                  1
                </span>
                Tạo phòng và gửi mã / link mời cho bạn bè.
              </li>
              <li className="flex gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-[10px] font-bold text-emerald-300">
                  2
                </span>
                Phòng đủ 2 người là chơi được. Chơi một mình thì bấm “Chơi với bot”.
              </li>
              <li className="flex gap-2">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-[10px] font-bold text-emerald-300">
                  3
                </span>
                Trò chuyện ngay trong phòng, mất mạng vẫn vào lại được.
              </li>
            </ol>
          </div>
        </aside>
      </div>

      <footer className="mt-8 border-t border-white/5 pt-4 text-center text-[11px] text-emerald-100/30">
        Bài Việt · Xì dách & Tiến lên Miền Nam · Chơi vui, đừng cá cược bằng tiền thật.
      </footer>
    </div>
  );
}
