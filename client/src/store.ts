import { create } from 'zustand';
import type { AckOk, ChatMessage, GameMode, RoomPublic } from '../../shared/types';
import { socket } from './socket';

const PLAYER_KEY = 'baiviet:playerId';
const NICK_KEY = 'baiviet:nickname';
const SESSION_KEY = 'baiviet:session';

interface Session {
  code: string;
  playerId: string;
}

export interface ToastItem {
  id: number;
  type: 'error' | 'info' | 'success';
  message: string;
}

function makeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `u-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  }
}

export function getPlayerId(): string {
  let id = localStorage.getItem(PLAYER_KEY);
  if (!id) {
    id = makeId();
    localStorage.setItem(PLAYER_KEY, id);
  }
  return id;
}

function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (parsed && typeof parsed.code === 'string' && typeof parsed.playerId === 'string') {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

interface GameStore {
  connected: boolean;
  busy: boolean;
  nickname: string;
  room: RoomPublic | null;
  toasts: ToastItem[];
  setNickname: (value: string) => void;
  createRoom: (mode: GameMode) => Promise<boolean>;
  joinRoom: (code: string) => Promise<boolean>;
  leaveRoom: () => void;
  addChat: (message: ChatMessage) => void;
  toast: (type: ToastItem['type'], message: string) => void;
  dismissToast: (id: number) => void;
  game: (
    action: 'hit' | 'stand' | 'play' | 'pass' | 'bet' | 'next',
    options?: { cards?: string[]; bet?: number },
  ) => void;
  sendChat: (text: string) => void;
  addBot: () => void;
  removeBot: (playerId: string) => void;
  startGame: () => void;
  playBots: () => void;
  kick: (playerId: string) => void;
}

export const useGame = create<GameStore>((set, get) => ({
  connected: socket.connected,
  busy: false,
  nickname: localStorage.getItem(NICK_KEY) ?? '',
  room: null,
  toasts: [],

  setNickname: (value) => {
    set({ nickname: value });
    localStorage.setItem(NICK_KEY, value);
  },

  createRoom: async (mode) => {
    const nickname = get().nickname.trim() || 'Người chơi';
    if (!socket.connected) {
      get().toast('error', 'Chưa kết nối tới máy chủ, thử lại sau vài giây');
      return false;
    }
    set({ busy: true });
    const playerId = getPlayerId();
    const res = await new Promise<AckOk<{ code: string; playerId: string }>>((resolve) => {
      socket.emit('room:create', { nickname, mode, playerId }, resolve);
    });
    set({ busy: false });
    if (!res.ok) {
      get().toast('error', res.error);
      return false;
    }
    if (res.data) {
      saveSession({ code: res.data.code, playerId: res.data.playerId });
      set({ nickname });
      localStorage.setItem(NICK_KEY, nickname);
    }
    return true;
  },

  joinRoom: async (code) => {
    const nickname = get().nickname.trim() || 'Người chơi';
    const clean = code.trim().toUpperCase();
    if (!clean) {
      get().toast('error', 'Nhập mã phòng trước đã');
      return false;
    }
    if (!socket.connected) {
      get().toast('error', 'Chưa kết nối tới máy chủ, thử lại sau vài giây');
      return false;
    }
    set({ busy: true });
    const playerId = getPlayerId();
    const res = await new Promise<AckOk<{ code: string; playerId: string }>>((resolve) => {
      socket.emit('room:join', { nickname, code: clean, playerId }, resolve);
    });
    set({ busy: false });
    if (!res.ok) {
      get().toast('error', res.error);
      return false;
    }
    if (res.data) {
      saveSession({ code: res.data.code, playerId: res.data.playerId });
      set({ nickname });
      localStorage.setItem(NICK_KEY, nickname);
    }
    return true;
  },

  leaveRoom: () => {
    socket.emit('room:leave', {}, () => {});
    clearSession();
    set({ room: null });
  },

  addChat: (message) =>
    set((state) => {
      if (!state.room) return {};
      return { room: { ...state.room, chat: [...state.room.chat, message].slice(-60) } };
    }),

  toast: (type, message) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  game: (action, options) => {
    if (!socket.connected) {
      get().toast('error', 'Mất kết nối tới máy chủ');
      return;
    }
    socket.emit('game:action', { action, ...options }, (res) => {
      if (!res.ok) get().toast('error', res.error);
    });
  },

  sendChat: (text) => {
    const clean = text.trim();
    if (!clean) return;
    socket.emit('chat:send', { text: clean }, (res) => {
      if (!res.ok) get().toast('error', res.error);
    });
  },

  addBot: () => {
    socket.emit('room:add_bot', {}, (res) => {
      if (!res.ok) get().toast('error', res.error);
    });
  },

  removeBot: (playerId) => {
    socket.emit('room:remove_bot', { playerId }, (res) => {
      if (!res.ok) get().toast('error', res.error);
    });
  },

  startGame: () => {
    socket.emit('room:start', {}, (res) => {
      if (!res.ok) get().toast('error', res.error);
    });
  },

  playBots: () => {
    socket.emit('room:play_bots', {}, (res) => {
      if (!res.ok) get().toast('error', res.error);
    });
  },

  kick: (playerId) => {
    socket.emit('room:kick', { playerId }, (res) => {
      if (!res.ok) get().toast('error', res.error);
    });
  },
}));

let initialized = false;

export function initSocket(): void {
  if (initialized) return;
  initialized = true;

  socket.on('connect', () => {
    useGame.setState({ connected: true });
    const invite = new URLSearchParams(window.location.search)
      .get('room')
      ?.toUpperCase();
    const session = loadSession();
    if (!session) return;
    if (invite && session.code !== invite) {
      clearSession();
      return;
    }
    socket.emit('room:rejoin', session, (res) => {
      if (!res.ok) {
        clearSession();
        useGame.setState({ room: null });
      }
    });
  });

  socket.on('disconnect', () => {
    useGame.setState({ connected: false });
  });

  socket.on('room:state', (room) => {
    useGame.setState({ room });
  });

  socket.on('chat:message', (message) => {
    useGame.getState().addChat(message);
  });

  socket.on('toast', (payload) => {
    useGame.getState().toast(payload.type, payload.message);
  });

  socket.on('room:kicked', () => {
    clearSession();
    useGame.setState({ room: null });
    useGame.getState().toast('error', 'Bạn đã bị mời ra khỏi phòng');
  });
}
