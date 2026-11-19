import { randomUUID } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import type {
  ChatMessage,
  ClientToServerEvents,
  GameMode,
  RoomPublic,
  ServerToClientEvents,
  SocketData,
} from '../../shared/types';
import { MODE_META } from '../../shared/types';
import { sortCards } from '../../shared/cards';
import type { Room, ServerPlayer } from './types';
import { byId } from './types';
import { startXidachRound, xidachHit, xidachStand } from './xidach';
import { startTienlenRound, tienlenPass, tienlenPlay } from './tienlen';
import { chooseXidachAction } from './bot-xidach';
import { chooseTienlenMove } from './bot-tienlen';
import { recordMatch, upsertUser } from './persist';

export type IOServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;
export type IOSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

const BOT_NAMES = ['Máy Bích', 'Máy Nhép', 'Máy Rô', 'Máy Cơ', 'Máy Tép', 'Máy Bồi'];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_CHAT = 80;
const MAX_LOG = 40;

function sanitizeNickname(raw: string): string {
  const cleaned = (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 16);
  return cleaned || 'Người chơi';
}

function makeRoom(code: string, mode: GameMode): Room {
  const now = Date.now();
  return {
    code,
    mode,
    phase: 'lobby',
    hostId: '',
    players: [],
    chat: [],
    round: 0,
    log: [],
    dealerId: null,
    turnId: null,
    reveal: false,
    resultText: null,
    note: null,
    deck: [],
    pending: [],
    currentCombo: null,
    lastPlayerId: null,
    passCount: 0,
    mustStartWithThree: false,
    botTimer: null,
    createdAt: now,
    lastActive: now,
    winnerId: null,
    persistedRound: 0,
  };
}

export class RoomManager {
  private rooms = new Map<string, Room>();

  constructor(private io: IOServer) {
    this.io = io;
    setInterval(() => this.cleanup(), 30_000);
  }

  handleConnection(socket: IOSocket): void {
    socket.on('room:create', (payload, ack) =>
      this.safe(ack, () => this.createRoom(socket, payload)),
    );
    socket.on('room:join', (payload, ack) =>
      this.safe(ack, () => this.joinRoom(socket, payload)),
    );
    socket.on('room:rejoin', (payload, ack) =>
      this.safe(ack, () => this.rejoinRoom(socket, payload)),
    );
    socket.on('room:ready', (payload, ack) =>
      this.safe(ack, () => {
        const { room, player } = this.lookup(socket);
        if (!room || !player) throw new Error('Bạn chưa ở trong phòng');
        if (room.phase !== 'lobby') throw new Error('Ván đang chơi');
        player.ready = Boolean(payload.ready);
        this.broadcast(room);
      }),
    );
    socket.on('room:add_bot', (_payload, ack) =>
      this.safe(ack, () => {
        const { room, player } = this.lookup(socket);
        if (!room || !player) throw new Error('Bạn chưa ở trong phòng');
        this.requireHost(room, player);
        if (room.phase !== 'lobby') throw new Error('Ván đang chơi');
        if (room.players.length >= MODE_META[room.mode].max) throw new Error('Phòng đã đầy');
        this.addBot(room);
        this.broadcast(room);
      }),
    );
    socket.on('room:remove_bot', (payload, ack) =>
      this.safe(ack, () => {
        const { room, player } = this.lookup(socket);
        if (!room || !player) throw new Error('Bạn chưa ở trong phòng');
        this.requireHost(room, player);
        if (room.phase !== 'lobby') throw new Error('Ván đang chơi');
        const bot = room.players.find((p) => p.id === payload.playerId && p.isBot);
        if (!bot) throw new Error('Không tìm thấy bot');
        this.removePlayer(room, bot.id);
        this.broadcast(room);
      }),
    );
    socket.on('room:start', (_payload, ack) =>
      this.safe(ack, () => {
        const { room, player } = this.lookup(socket);
        if (!room || !player) throw new Error('Bạn chưa ở trong phòng');
        this.requireHost(room, player);
        if (room.phase !== 'lobby') throw new Error('Ván đang chơi');
        if (room.players.length < 2) {
          throw new Error('Cần ít nhất 2 người chơi, hoặc chọn "Chơi với bot"');
        }
        if (room.mode === 'tienlen') {
          while (room.players.length < 4) this.addBot(room);
        }
        this.startGame(room);
      }),
    );
    socket.on('room:play_bots', (_payload, ack) =>
      this.safe(ack, () => {
        const { room, player } = this.lookup(socket);
        if (!room || !player) throw new Error('Bạn chưa ở trong phòng');
        this.requireHost(room, player);
        if (room.phase !== 'lobby') throw new Error('Ván đang chơi');
        const target = room.mode === 'tienlen' ? 4 : 4;
        while (room.players.length < target) this.addBot(room);
        this.startGame(room);
      }),
    );
    socket.on('room:kick', (payload, ack) =>
      this.safe(ack, () => {
        const { room, player } = this.lookup(socket);
        if (!room || !player) throw new Error('Bạn chưa ở trong phòng');
        this.requireHost(room, player);
        if (room.phase !== 'lobby') throw new Error('Ván đang chơi');
        const target = byId(room, payload.playerId);
        if (!target) throw new Error('Không tìm thấy người chơi');
        if (target.id === player.id) throw new Error('Bạn là chủ phòng');
        if (!target.isBot && target.socketId) {
          this.io.to(target.socketId).emit('room:kicked');
        }
        this.removePlayer(room, target.id);
        this.broadcast(room);
      }),
    );
    socket.on('room:leave', (_payload, ack) =>
      this.safe(ack, () => this.leaveRoom(socket)),
    );
    socket.on('chat:send', (payload, ack) =>
      this.safe(ack, () => {
        const { room, player } = this.lookup(socket);
        if (!room || !player) throw new Error('Bạn chưa ở trong phòng');
        const text = (payload.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 200);
        if (!text) return;
        const message: ChatMessage = {
          id: randomUUID(),
          playerId: player.id,
          nickname: player.nickname,
          text,
          at: Date.now(),
        };
        room.chat.push(message);
        if (room.chat.length > MAX_CHAT) room.chat.shift();
        this.io.to(room.code).emit('chat:message', message);
      }),
    );
    socket.on('game:action', (payload, ack) =>
      this.safe(ack, () => this.gameAction(socket, payload)),
    );
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  private safe<T>(ack: unknown, fn: () => T | void): void {
    const respond = (typeof ack === 'function' ? ack : () => {}) as (
      res: { ok: true; data?: T } | { ok: false; error: string },
    ) => void;
    try {
      const data = fn();
      respond({ ok: true, data: data as T });
    } catch (error) {
      respond({
        ok: false,
        error: error instanceof Error ? error.message : 'Có lỗi xảy ra',
      });
    }
  }

  private lookup(socket: IOSocket): { room?: Room; player?: ServerPlayer } {
    const code = socket.data.code;
    const playerId = socket.data.playerId;
    if (!code || !playerId) return {};
    const room = this.rooms.get(code);
    if (!room) return {};
    const player = byId(room, playerId);
    return { room, player };
  }

  private requireHost(room: Room, player: ServerPlayer): void {
    if (room.hostId !== player.id) throw new Error('Chỉ chủ phòng được làm việc này');
  }

  private generateCode(): string {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      let code = '';
      for (let i = 0; i < 6; i += 1) {
        code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
    return randomUUID().slice(0, 6).toUpperCase();
  }

  private freeSeat(room: Room): number {
    const used = new Set(room.players.map((p) => p.seat));
    for (let i = 0; i < MODE_META[room.mode].max; i += 1) {
      if (!used.has(i)) return i;
    }
    return room.players.length;
  }

  private attach(socket: IOSocket, room: Room, player: ServerPlayer): void {
    socket.join(room.code);
    socket.data.code = room.code;
    socket.data.playerId = player.id;
    player.socketId = socket.id;
    player.connected = true;
    player.lastSeen = Date.now();
  }

  private createRoom(
    socket: IOSocket,
    payload: { nickname: string; mode: GameMode; playerId: string },
  ): { code: string; playerId: string } {
    const previous = this.lookup(socket);
    if (previous.room && previous.player) this.leaveRoom(socket);

    const mode: GameMode = payload.mode === 'tienlen' ? 'tienlen' : 'xidach';
    const code = this.generateCode();
    const room = makeRoom(code, mode);
    const player: ServerPlayer = {
      id: payload.playerId || randomUUID(),
      nickname: sanitizeNickname(payload.nickname),
      isBot: false,
      socketId: null,
      connected: true,
      isHost: true,
      ready: false,
      seat: 0,
      chips: 1000,
      bet: 50,
      hand: [],
      status: null,
      isDealer: false,
      delta: 0,
      score: 0,
      lastSeen: Date.now(),
    };
    room.hostId = player.id;
    room.players.push(player);
    this.rooms.set(code, room);
    this.attach(socket, room, player);
    void upsertUser(player.id, player.nickname);
    this.pushSystemChat(room, `${player.nickname} đã tạo phòng`);
    this.broadcast(room);
    return { code, playerId: player.id };
  }

  private joinRoom(
    socket: IOSocket,
    payload: { nickname: string; code: string; playerId: string },
  ): { code: string; playerId: string } {
    const code = (payload.code ?? '').toUpperCase().trim();
    const room = this.rooms.get(code);
    if (!room) throw new Error('Không tìm thấy phòng với mã này');

    const existing = payload.playerId
      ? room.players.find((p) => p.id === payload.playerId)
      : undefined;
    if (existing) {
      this.attach(socket, room, existing);
      this.broadcast(room);
      this.scheduleBot(room);
      return { code, playerId: existing.id };
    }

    if (room.phase !== 'lobby') throw new Error('Phòng đang chơi, không thể vào lúc này');
    if (room.players.length >= MODE_META[room.mode].max) throw new Error('Phòng đã đầy');

    const player: ServerPlayer = {
      id: payload.playerId || randomUUID(),
      nickname: sanitizeNickname(payload.nickname),
      isBot: false,
      socketId: null,
      connected: true,
      isHost: false,
      ready: false,
      seat: this.freeSeat(room),
      chips: 1000,
      bet: 50,
      hand: [],
      status: null,
      isDealer: false,
      delta: 0,
      score: 0,
      lastSeen: Date.now(),
    };
    room.players.push(player);
    room.lastActive = Date.now();
    this.attach(socket, room, player);
    void upsertUser(player.id, player.nickname);
    this.pushSystemChat(room, `${player.nickname} đã vào phòng`);
    this.broadcast(room);
    return { code, playerId: player.id };
  }

  private rejoinRoom(
    socket: IOSocket,
    payload: { code: string; playerId: string },
  ): void {
    const code = (payload.code ?? '').toUpperCase().trim();
    const room = this.rooms.get(code);
    if (!room) throw new Error('Phòng không còn tồn tại');
    const player = byId(room, payload.playerId);
    if (!player) throw new Error('Bạn không còn trong phòng này');
    this.attach(socket, room, player);
    this.broadcast(room);
    this.scheduleBot(room);
  }

  private leaveRoom(socket: IOSocket): void {
    const { room, player } = this.lookup(socket);
    if (!room || !player) {
      socket.data.code = undefined;
      socket.data.playerId = undefined;
      return;
    }

    if (room.phase === 'lobby') {
      this.pushSystemChat(room, `${player.nickname} đã rời phòng`);
      this.removePlayer(room, player.id);
    } else {
      player.connected = false;
      player.socketId = null;
      player.lastSeen = Date.now();
      this.pushSystemChat(room, `${player.nickname} đã mất kết nối`);
      if (room.hostId === player.id) this.transferHost(room);
    }

    socket.leave(room.code);
    socket.data.code = undefined;
    socket.data.playerId = undefined;
    this.broadcast(room);
    this.scheduleBot(room);
  }

  private handleDisconnect(socket: IOSocket): void {
    const { room, player } = this.lookup(socket);
    if (!room || !player) return;
    player.connected = false;
    player.socketId = null;
    player.lastSeen = Date.now();
    socket.data.code = undefined;
    socket.data.playerId = undefined;

    if (room.hostId === player.id) this.transferHost(room);
    if (room.phase === 'lobby') {
      this.pushSystemChat(room, `${player.nickname} đã mất kết nối`);
    } else {
      this.pushSystemChat(room, `${player.nickname} mất kết nối, bot sẽ chơi thay`);
    }
    this.broadcast(room);
    this.scheduleBot(room);
  }

  private transferHost(room: Room): void {
    const next = room.players.find((p) => !p.isBot && p.connected);
    if (!next) {
      for (const p of room.players) p.isHost = p.id === room.hostId;
      return;
    }
    room.hostId = next.id;
    for (const p of room.players) p.isHost = p.id === room.hostId;
  }

  private removePlayer(room: Room, playerId: string): void {
    const idx = room.players.findIndex((p) => p.id === playerId);
    if (idx === -1) return;
    const [removed] = room.players.splice(idx, 1);
    if (removed.socketId) {
      const socket = this.io.sockets.sockets.get(removed.socketId);
      if (socket) {
        socket.leave(room.code);
        socket.data.code = undefined;
        socket.data.playerId = undefined;
      }
    }
    if (room.hostId === playerId) this.transferHost(room);
    const humans = room.players.filter((p) => !p.isBot);
    if (room.phase === 'lobby' && humans.length === 0) {
      this.deleteRoom(room);
      return;
    }
    room.lastActive = Date.now();
  }

  private deleteRoom(room: Room): void {
    if (room.botTimer) {
      clearTimeout(room.botTimer);
      room.botTimer = null;
    }
    this.rooms.delete(room.code);
  }

  private addBot(room: Room): ServerPlayer {
    const seat = this.freeSeat(room);
    const botCount = room.players.filter((p) => p.isBot).length;
    const baseName = BOT_NAMES[botCount % BOT_NAMES.length];
    let nickname = baseName;
    let suffix = 2;
    while (room.players.some((p) => p.nickname === nickname)) {
      nickname = `${baseName} ${suffix}`;
      suffix += 1;
    }
    const bot: ServerPlayer = {
      id: `bot-${randomUUID()}`,
      nickname,
      isBot: true,
      socketId: null,
      connected: true,
      isHost: false,
      ready: true,
      seat,
      chips: 1000,
      bet: 50,
      hand: [],
      status: null,
      isDealer: false,
      delta: 0,
      score: 0,
      lastSeen: Date.now(),
    };
    room.players.push(bot);
    return bot;
  }

  private startGame(room: Room): void {
    if (room.mode === 'tienlen') {
      startTienlenRound(room);
    } else {
      startXidachRound(room);
    }
    this.afterAction(room);
  }

  private gameAction(
    socket: IOSocket,
    payload: { action: string; cards?: string[]; bet?: number },
  ): void {
    const { room, player } = this.lookup(socket);
    if (!room || !player) throw new Error('Bạn chưa ở trong phòng');

    if (payload.action === 'bet') {
      if (room.phase !== 'lobby' && room.phase !== 'round_end') {
        throw new Error('Không thể đổi mức cược lúc này');
      }
      if (room.mode !== 'xidach') throw new Error('Chế độ này không có cược');
      const bet = Math.floor(Number(payload.bet));
      if (!Number.isFinite(bet)) throw new Error('Mức cược không hợp lệ');
      player.bet = Math.max(10, Math.min(bet, player.chips, 500));
      this.broadcast(room);
      return;
    }

    if (payload.action === 'next') {
      this.requireHost(room, player);
      if (room.phase !== 'round_end') throw new Error('Ván chưa kết thúc');
      this.startGame(room);
      return;
    }

    if (room.mode === 'xidach') {
      if (payload.action === 'hit') xidachHit(room, player.id);
      else if (payload.action === 'stand') xidachStand(room, player.id);
      else throw new Error('Hành động không hợp lệ');
    } else {
      if (payload.action === 'play') {
        tienlenPlay(room, player.id, payload.cards ?? []);
      } else if (payload.action === 'pass') {
        tienlenPass(room, player.id);
      } else {
        throw new Error('Hành động không hợp lệ');
      }
    }

    this.afterAction(room);
  }

  private afterAction(room: Room): void {
    room.lastActive = Date.now();
    if (room.phase === 'round_end') void recordMatch(room);
    this.broadcast(room);
    this.scheduleBot(room);
  }

  private scheduleBot(room: Room): void {
    if (room.botTimer) {
      clearTimeout(room.botTimer);
      room.botTimer = null;
    }
    if (room.phase !== 'playing' || !room.turnId) return;
    const player = byId(room, room.turnId);
    if (!player) return;
    const autoPlay = player.isBot || !player.connected;
    if (!autoPlay) return;

    room.botTimer = setTimeout(() => {
      room.botTimer = null;
      try {
        if (room.phase !== 'playing' || room.turnId !== player.id) return;
        if (!player.isBot && player.connected) return;

        if (room.mode === 'xidach') {
          if (player.status !== 'playing') return;
          const action = chooseXidachAction(player.hand);
          if (action === 'hit') xidachHit(room, player.id);
          else xidachStand(room, player.id);
        } else {
          const move = chooseTienlenMove(
            player.hand,
            room.currentCombo,
            room.mustStartWithThree,
          );
          if (move && move.length > 0) {
            tienlenPlay(room, player.id, move.map((c) => c.id));
          } else {
            tienlenPass(room, player.id);
          }
        }
        this.afterAction(room);
      } catch (error) {
        console.error('bot action failed', error);
        try {
          if (room.mode === 'xidach') xidachStand(room, player.id);
          else tienlenPass(room, player.id);
          this.afterAction(room);
        } catch {
          this.broadcast(room);
        }
      }
    }, 900);
  }

  private pushSystemChat(room: Room, text: string): void {
    const message: ChatMessage = {
      id: randomUUID(),
      playerId: 'system',
      nickname: 'Hệ thống',
      text,
      at: Date.now(),
      system: true,
    };
    room.chat.push(message);
    if (room.chat.length > MAX_CHAT) room.chat.shift();
    this.io.to(room.code).emit('chat:message', message);
  }

  private broadcast(room: Room): void {
    for (const player of room.players) {
      if (!player.socketId) continue;
      const socket = this.io.sockets.sockets.get(player.socketId);
      if (!socket) continue;
      socket.emit('room:state', this.publicRoom(room, player.id));
    }
  }

  private publicRoom(room: Room, meId: string): RoomPublic {
    const players = [...room.players]
      .sort((a, b) => a.seat - b.seat)
      .map((p) => {
        const self = p.id === meId;
        const hand = self || room.reveal ? sortCards(p.hand) : null;
        return {
          id: p.id,
          nickname: p.nickname,
          isBot: p.isBot,
          connected: p.isBot ? true : p.connected,
          isHost: p.id === room.hostId,
          ready: p.ready,
          seat: p.seat,
          chips: p.chips,
          bet: p.bet,
          handCount: p.hand.length,
          hand,
          status: p.status ?? null,
          isDealer: p.id === room.dealerId,
          delta: p.delta,
          score: p.score,
        };
      });

    return {
      code: room.code,
      mode: room.mode,
      phase: room.phase,
      hostId: room.hostId,
      meId,
      players,
      maxPlayers: MODE_META[room.mode].max,
      turnPlayerId: room.turnId,
      currentCombo: room.currentCombo,
      lastPlayerId: room.lastPlayerId,
      dealerId: room.dealerId,
      round: room.round,
      log: room.log.slice(-MAX_LOG),
      chat: room.chat.slice(-60),
      reveal: room.reveal,
      resultText: room.resultText,
      note: room.note,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const room of [...this.rooms.values()]) {
      if (room.phase === 'lobby') {
        for (const player of [...room.players]) {
          if (!player.isBot && !player.connected && now - player.lastSeen > 60_000) {
            this.removePlayer(room, player.id);
          }
        }
        const humans = room.players.filter((p) => !p.isBot && p.connected).length;
        if (humans === 0) {
          this.deleteRoom(room);
          continue;
        }
      } else {
        const anyConnected = room.players.some((p) => !p.isBot && p.connected);
        if (!anyConnected && now - room.lastActive > 10 * 60_000) {
          this.deleteRoom(room);
          continue;
        }
      }
      if (now - room.lastActive > 2 * 60 * 60_000) this.deleteRoom(room);
    }
  }
}
