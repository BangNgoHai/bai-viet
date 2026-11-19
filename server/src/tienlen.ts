import type { Card } from '../../shared/types';
import { createDeck, isThreeSpade, shuffle, sortCards } from '../../shared/cards';
import type { Room, ServerPlayer } from './types';
import { addLog, byId } from './types';
import { canBeat, comboText, detectCombo } from './combo';

export function startTienlenRound(room: Room): void {
  if (room.players.length !== 4) throw new Error('Tiến lên cần đúng 4 người chơi');

  room.round += 1;
  room.phase = 'playing';
  room.log = [];
  room.reveal = false;
  room.resultText = null;
  room.note = null;
  room.winnerId = null;
  room.currentCombo = null;
  room.lastPlayerId = null;
  room.passCount = 0;
  room.dealerId = null;
  room.deck = shuffle(createDeck());

  for (const p of [...room.players].sort((a, b) => a.seat - b.seat)) {
    p.hand = sortCards(room.deck.splice(0, 13));
    p.status = null;
    p.delta = 0;
    p.isDealer = false;
    p.ready = false;
  }

  const starter = room.players.find((p) => p.hand.some(isThreeSpade));
  room.turnId = starter?.id ?? room.players[0].id;
  room.mustStartWithThree = true;
  addLog(
    room,
    `Ván ${room.round} bắt đầu · ${byId(room, room.turnId)?.nickname} có 3♠ đi trước`,
  );
}

function advance(room: Room): void {
  const order = [...room.players].sort((a, b) => a.seat - b.seat);
  const idx = order.findIndex((p) => p.id === room.turnId);
  for (let step = 1; step <= order.length; step += 1) {
    const next = order[(idx + step) % order.length];
    if (next.hand.length > 0) {
      room.turnId = next.id;
      return;
    }
  }
}

function endRound(room: Room, winner: ServerPlayer): void {
  room.phase = 'round_end';
  room.reveal = true;
  room.currentCombo = null;
  room.lastPlayerId = winner.id;
  room.winnerId = winner.id;
  room.turnId = null;

  let total = 0;
  const penalties: string[] = [];
  for (const p of room.players) {
    if (p.id === winner.id) continue;
    const remaining = p.hand.length;
    const twos = p.hand.filter((c) => c.rank === 15).length;
    const penalty = remaining + twos;
    p.delta = -penalty;
    p.score += p.delta;
    total += penalty;
    penalties.push(`${p.nickname} -${penalty}`);
  }
  winner.delta = total;
  winner.score += total;

  room.resultText = `🏆 ${winner.nickname} về nhất! ${penalties.join(' · ')}`;
  addLog(room, room.resultText);
}

export function tienlenPlay(room: Room, playerId: string, cardIds: string[]): void {
  if (room.phase !== 'playing') throw new Error('Ván chơi chưa bắt đầu');
  if (room.turnId !== playerId) throw new Error('Chưa đến lượt bạn');

  const p = byId(room, playerId);
  if (!p) throw new Error('Không tìm thấy người chơi');

  const unique = [...new Set(cardIds)];
  const cards = unique
    .map((id) => p.hand.find((c) => c.id === id))
    .filter((c): c is Card => Boolean(c));

  if (cards.length === 0 || cards.length !== unique.length) {
    throw new Error('Bài không hợp lệ');
  }

  const combo = detectCombo(cards);
  if (!combo) throw new Error('Bộ bài không hợp lệ');

  if (room.mustStartWithThree && !cards.some(isThreeSpade)) {
    throw new Error('Nước đầu tiên phải có 3♠');
  }

  if (room.currentCombo && !canBeat(combo, room.currentCombo)) {
    throw new Error('Bộ bài không lớn hơn bài trên bàn');
  }

  const ids = new Set(cards.map((c) => c.id));
  p.hand = p.hand.filter((c) => !ids.has(c.id));

  room.currentCombo = combo;
  room.lastPlayerId = p.id;
  room.passCount = 0;
  room.mustStartWithThree = false;
  addLog(room, `${p.nickname} đánh ${comboText(combo)}`);

  if (p.hand.length === 0) {
    endRound(room, p);
    return;
  }

  advance(room);
}

export function tienlenPass(room: Room, playerId: string): void {
  if (room.phase !== 'playing') throw new Error('Ván chơi chưa bắt đầu');
  if (room.turnId !== playerId) throw new Error('Chưa đến lượt bạn');
  if (!room.currentCombo) throw new Error('Bạn đang dẫn vòng, không thể bỏ lượt');

  const p = byId(room, playerId);
  if (!p) throw new Error('Không tìm thấy người chơi');

  addLog(room, `${p.nickname} bỏ lượt`);
  room.passCount += 1;

  const activeCount = room.players.filter((x) => x.hand.length > 0).length;
  if (room.passCount >= activeCount - 1) {
    room.currentCombo = null;
    room.passCount = 0;
    room.turnId = room.lastPlayerId;
    addLog(room, `Vòng mới · ${byId(room, room.turnId)?.nickname} đi trước`);
    return;
  }

  advance(room);
}
