import type { Card, ChatMessage, Combo, GameMode, RoomPhase, XidachStatus } from '../../shared/types';

export interface ServerPlayer {
  id: string;
  nickname: string;
  isBot: boolean;
  socketId: string | null;
  connected: boolean;
  isHost: boolean;
  ready: boolean;
  seat: number;
  chips: number;
  bet: number;
  hand: Card[];
  status: XidachStatus | null;
  isDealer: boolean;
  delta: number;
  score: number;
  lastSeen: number;
}

export interface Room {
  code: string;
  mode: GameMode;
  phase: RoomPhase;
  hostId: string;
  players: ServerPlayer[];
  chat: ChatMessage[];
  round: number;
  log: string[];
  dealerId: string | null;
  turnId: string | null;
  reveal: boolean;
  resultText: string | null;
  note: string | null;
  deck: Card[];
  pending: string[];
  currentCombo: Combo | null;
  lastPlayerId: string | null;
  passCount: number;
  mustStartWithThree: boolean;
  botTimer: NodeJS.Timeout | null;
  createdAt: number;
  lastActive: number;
  winnerId: string | null;
  persistedRound: number;
}

export function byId(room: Room, id: string | null): ServerPlayer | undefined {
  if (!id) return undefined;
  return room.players.find((p) => p.id === id);
}

export function addLog(room: Room, text: string): void {
  room.log.push(text);
  if (room.log.length > 40) room.log.shift();
}
