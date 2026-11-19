export type Suit = 'S' | 'C' | 'D' | 'H';

export type Rank = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

export interface Card {
  id: string;
  rank: Rank;
  suit: Suit;
}

export type GameMode = 'xidach' | 'tienlen';

export type RoomPhase = 'lobby' | 'playing' | 'round_end';

export type XidachStatus =
  | 'waiting'
  | 'playing'
  | 'stood'
  | 'bust'
  | 'xidach'
  | 'xibang'
  | 'ngulinh';

export type ComboType = 'single' | 'pair' | 'triple' | 'quad' | 'straight' | 'double_straight';

export interface Combo {
  type: ComboType;
  rank: Rank;
  suit: Suit;
  length: number;
  cards: Card[];
}

export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  text: string;
  at: number;
  system?: boolean;
}

export interface PublicPlayer {
  id: string;
  nickname: string;
  isBot: boolean;
  connected: boolean;
  isHost: boolean;
  ready: boolean;
  seat: number;
  chips: number;
  bet: number;
  handCount: number;
  hand: Card[] | null;
  status: XidachStatus | null;
  isDealer: boolean;
  delta: number;
  score: number;
}

export interface RoomPublic {
  code: string;
  mode: GameMode;
  phase: RoomPhase;
  hostId: string;
  meId: string;
  players: PublicPlayer[];
  maxPlayers: number;
  turnPlayerId: string | null;
  currentCombo: Combo | null;
  lastPlayerId: string | null;
  dealerId: string | null;
  round: number;
  log: string[];
  chat: ChatMessage[];
  reveal: boolean;
  resultText: string | null;
  note: string | null;
}

export interface LeaderboardRow {
  id: string;
  nickname: string;
  wins: number;
  losses: number;
  games: number;
}

export interface RoomCreatePayload {
  nickname: string;
  mode: GameMode;
  playerId: string;
}

export interface RoomJoinPayload {
  nickname: string;
  code: string;
  playerId: string;
}

export interface RejoinPayload {
  code: string;
  playerId: string;
}

export interface GameActionPayload {
  action: 'hit' | 'stand' | 'play' | 'pass' | 'bet' | 'next';
  cards?: string[];
  bet?: number;
}

export type AckOk<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };
export type AckFn<T = unknown> = (res: AckOk<T>) => void;

export interface ServerToClientEvents {
  'room:state': (room: RoomPublic) => void;
  'room:kicked': () => void;
  'chat:message': (message: ChatMessage) => void;
  'toast': (payload: { type: 'error' | 'info' | 'success'; message: string }) => void;
}

export interface SocketData {
  code?: string;
  playerId?: string;
}

export interface ClientToServerEvents {
  'room:create': (payload: RoomCreatePayload, ack: AckFn<{ code: string; playerId: string }>) => void;
  'room:join': (payload: RoomJoinPayload, ack: AckFn<{ code: string; playerId: string }>) => void;
  'room:rejoin': (payload: RejoinPayload, ack: AckFn) => void;
  'room:ready': (payload: { ready: boolean }, ack: AckFn) => void;
  'room:add_bot': (_: Record<string, never>, ack: AckFn) => void;
  'room:remove_bot': (payload: { playerId: string }, ack: AckFn) => void;
  'room:start': (_: Record<string, never>, ack: AckFn) => void;
  'room:play_bots': (_: Record<string, never>, ack: AckFn) => void;
  'room:leave': (_: Record<string, never>, ack: AckFn) => void;
  'room:kick': (payload: { playerId: string }, ack: AckFn) => void;
  'chat:send': (payload: { text: string }, ack: AckFn) => void;
  'game:action': (payload: GameActionPayload, ack: AckFn) => void;
}

export const MODE_META: Record<GameMode, { label: string; min: number; max: number }> = {
  xidach: { label: 'Xì dách', min: 2, max: 6 },
  tienlen: { label: 'Tiến lên', min: 2, max: 4 },
};
