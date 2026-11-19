import type { Room } from './types';
import { addLog, byId } from './types';
import {
  cardLabel,
  createDeck,
  handValue,
  shuffle,
  sortCards,
  specialPower,
  xidachSpecial,
} from '../../shared/cards';

const DEFAULT_BET = 50;

function clampBet(p: { chips: number; bet: number }): void {
  if (p.chips < 10) p.chips = 100;
  let bet = Number.isFinite(p.bet) ? p.bet : DEFAULT_BET;
  bet = Math.max(10, Math.min(bet, p.chips, 500));
  p.bet = Math.floor(bet);
}

export function startXidachRound(room: Room): void {
  if (room.players.length < 2) throw new Error('Cần ít nhất 2 người chơi');

  room.round += 1;
  room.log = [];
  room.reveal = false;
  room.resultText = null;
  room.note = null;
  room.winnerId = null;
  room.currentCombo = null;
  room.lastPlayerId = null;
  room.deck = shuffle(createDeck());

  const order = [...room.players].sort((a, b) => a.seat - b.seat);
  let dealerIdx = order.findIndex((p) => p.id === room.dealerId);
  dealerIdx = dealerIdx === -1 ? 0 : (dealerIdx + 1) % order.length;
  const dealer = order[dealerIdx];
  room.dealerId = dealer.id;
  if (dealer.chips < 500) dealer.chips = 1000;

  for (const p of order) {
    p.hand = [];
    p.status = 'waiting';
    p.delta = 0;
    p.isDealer = p.id === dealer.id;
    p.ready = false;
    if (!p.isDealer) clampBet(p);
  }

  for (let k = 0; k < 2; k += 1) {
    for (let i = 0; i < order.length; i += 1) {
      const p = order[(dealerIdx + i) % order.length];
      p.hand.push(room.deck.pop()!);
    }
  }

  for (const p of order) {
    p.hand = sortCards(p.hand);
    const special = xidachSpecial(p.hand);
    if (p.isDealer) {
      p.status = special ?? 'playing';
    } else {
      p.status = special ?? 'playing';
      if (special) {
        addLog(room, `${p.nickname} có ${special === 'xibang' ? 'Xì bàng' : 'Xì dách'}!`);
      }
    }
  }

  room.pending = order
    .filter((p) => !p.isDealer && p.status === 'playing')
    .map((p) => p.id);

  room.phase = 'playing';
  addLog(room, `Ván ${room.round} bắt đầu · Nhà cái: ${dealer.nickname}`);

  if (room.pending.length === 0) {
    room.turnId = null;
    resolveDealer(room);
  } else {
    room.turnId = room.pending[0];
    addLog(room, `${byId(room, room.turnId)?.nickname} bắt đầu lượt`);
  }
}

function finishTurn(room: Room, playerId: string): void {
  room.pending = room.pending.filter((id) => id !== playerId);
  if (room.pending.length === 0) {
    room.turnId = null;
    resolveDealer(room);
    return;
  }
  room.turnId = room.pending[0];
}

export function xidachHit(room: Room, playerId: string): void {
  if (room.phase !== 'playing') throw new Error('Ván chơi chưa bắt đầu');
  if (room.turnId !== playerId) throw new Error('Chưa đến lượt bạn');
  const p = byId(room, playerId);
  if (!p || p.status !== 'playing') throw new Error('Bạn không thể rút bài lúc này');

  if (room.deck.length === 0) room.deck = shuffle(createDeck());
  const card = room.deck.pop()!;
  p.hand.push(card);
  p.hand = sortCards(p.hand);
  addLog(room, `${p.nickname} rút ${cardLabel(card)}`);

  const { best, bust } = handValue(p.hand);
  if (bust) {
    p.status = 'bust';
    addLog(room, `${p.nickname} quắc (${best})`);
    finishTurn(room, p.id);
    return;
  }
  if (p.hand.length >= 5) {
    p.status = 'ngulinh';
    addLog(room, `${p.nickname} ngũ linh (${best})!`);
    finishTurn(room, p.id);
    return;
  }
  if (best === 21) {
    p.status = 'stood';
    addLog(room, `${p.nickname} đạt 21 điểm, tự động dừng`);
    finishTurn(room, p.id);
    return;
  }
  addLog(room, `${p.nickname} đang ${best} điểm`);
}

export function xidachStand(room: Room, playerId: string): void {
  if (room.phase !== 'playing') throw new Error('Ván chơi chưa bắt đầu');
  if (room.turnId !== playerId) throw new Error('Chưa đến lượt bạn');
  const p = byId(room, playerId);
  if (!p || p.status !== 'playing') throw new Error('Bạn không thể dừng lúc này');

  p.status = 'stood';
  addLog(room, `${p.nickname} dừng ở ${handValue(p.hand).best} điểm`);
  finishTurn(room, p.id);
}

type Outcome = 'win' | 'lose' | 'push';

export function resolveDealer(room: Room): void {
  const dealer = byId(room, room.dealerId);
  if (!dealer) return;

  const initialSpecial = xidachSpecial(dealer.hand);
  if (!initialSpecial) {
    while (handValue(dealer.hand).best < 16) {
      if (room.deck.length === 0) room.deck = shuffle(createDeck());
      dealer.hand.push(room.deck.pop()!);
    }
  }
  dealer.hand = sortCards(dealer.hand);

  const dealerValue = handValue(dealer.hand);
  const dealerSpecial = xidachSpecial(dealer.hand);
  if (dealerSpecial) {
    dealer.status = dealerSpecial;
  } else if (dealerValue.bust) {
    dealer.status = 'bust';
  } else if (dealer.hand.length >= 5 && dealerValue.best <= 21) {
    dealer.status = 'ngulinh';
  } else {
    dealer.status = 'stood';
  }

  const specialText: Record<string, string> = {
    xibang: 'Xì bàng',
    xidach: 'Xì dách',
    ngulinh: 'Ngũ linh',
    bust: 'Quắc',
    stood: 'Dừng',
    playing: 'Đang chơi',
    waiting: 'Chờ',
  };
  addLog(
    room,
    `Nhà cái ${dealer.nickname}: ${dealerValue.best} điểm (${specialText[dealer.status] ?? dealer.status})`,
  );

  let dealerDelta = 0;
  const summary: string[] = [];

  for (const p of room.players) {
    if (p.isDealer) continue;

    const bet = Math.max(1, p.bet);
    const playerValue = handValue(p.hand);
    const playerSpecial =
      p.status === 'xibang' || p.status === 'xidach' ? p.status : null;
    const dealerSpecialStatus =
      dealer.status === 'xibang' || dealer.status === 'xidach' ? dealer.status : null;

    let outcome: Outcome;
    if (playerSpecial || dealerSpecialStatus) {
      const pp = specialPower(playerSpecial);
      const dp = specialPower(dealerSpecialStatus);
      outcome = pp === dp ? 'push' : pp > dp ? 'win' : 'lose';
    } else if (p.status === 'bust') {
      outcome = 'lose';
    } else if (dealer.status === 'bust') {
      outcome = 'win';
    } else if (p.status === 'ngulinh' && dealer.status !== 'ngulinh') {
      outcome = 'win';
    } else if (dealer.status === 'ngulinh' && p.status !== 'ngulinh') {
      outcome = 'lose';
    } else if (playerValue.best > dealerValue.best) {
      outcome = 'win';
    } else if (playerValue.best < dealerValue.best) {
      outcome = 'lose';
    } else {
      outcome = 'push';
    }

    let multiplier = 1;
    if (outcome !== 'push') {
      const winningSpecial = outcome === 'win' ? playerSpecial : dealerSpecialStatus;
      if (winningSpecial === 'xibang') multiplier = 2;
      else if (winningSpecial === 'xidach') multiplier = 1.5;
    }

    const amount = Math.max(1, Math.round(bet * multiplier));

    if (outcome === 'win') {
      const gain = Math.min(amount, Math.max(0, dealer.chips));
      p.chips += gain;
      p.delta = gain;
      dealer.chips -= gain;
      dealerDelta -= gain;
      summary.push(`${p.nickname} +${gain}`);
    } else if (outcome === 'lose') {
      const loss = Math.min(amount, p.chips);
      p.chips -= loss;
      p.delta = -loss;
      dealer.chips += loss;
      dealerDelta += loss;
      summary.push(`${p.nickname} -${loss}`);
    } else {
      p.delta = 0;
      summary.push(`${p.nickname} hòa`);
    }
    p.score += p.delta;
  }

  dealer.delta = dealerDelta;
  dealer.score += dealerDelta;

  room.reveal = true;
  room.phase = 'round_end';
  room.turnId = null;
  room.pending = [];

  let bestPlayer = dealer;
  for (const p of room.players) {
    if (p.delta > bestPlayer.delta) bestPlayer = p;
  }
  room.winnerId = bestPlayer.delta > 0 ? bestPlayer.id : null;

  room.resultText = summary.length > 0 ? summary.join(' · ') : 'Không có người đặt cược';
  addLog(room, `Kết thúc ván · ${room.resultText}`);
}
