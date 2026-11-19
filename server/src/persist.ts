import { prisma } from './db';
import type { Room } from './types';

export async function upsertUser(id: string, nickname: string): Promise<void> {
  try {
    await prisma.user.upsert({
      where: { id },
      create: { id, nickname },
      update: { nickname },
    });
  } catch (error) {
    console.error('upsertUser failed', error);
  }
}

export async function recordMatch(room: Room): Promise<void> {
  if (room.round <= 0 || room.persistedRound === room.round) return;
  room.persistedRound = room.round;

  const winner = room.players.find((p) => p.id === room.winnerId);
  const players = room.players.map((p) => ({
    userId: p.isBot ? null : p.id,
    nickname: p.nickname,
    isBot: p.isBot,
    score: p.score,
    delta: p.delta,
    isWinner: winner ? p.id === winner.id : false,
  }));

  try {
    await prisma.match.create({
      data: {
        mode: room.mode,
        roomCode: room.code,
        winnerName: winner?.nickname ?? null,
        players: { create: players },
      },
    });
  } catch (error) {
    console.error('recordMatch failed', error);
  }

  for (const p of room.players) {
    if (p.isBot) continue;
    const won = winner ? p.id === winner.id : false;
    try {
      await prisma.user.upsert({
        where: { id: p.id },
        create: {
          id: p.id,
          nickname: p.nickname,
          games: 1,
          wins: won ? 1 : 0,
          losses: won ? 0 : 1,
        },
        update: {
          nickname: p.nickname,
          games: { increment: 1 },
          wins: won ? { increment: 1 } : undefined,
          losses: won ? undefined : { increment: 1 },
        },
      });
    } catch (error) {
      console.error('user stat update failed', error);
    }
  }
}
