import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/types';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const url = import.meta.env.VITE_SERVER_URL as string | undefined;

export const socket: AppSocket = io(url || undefined, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});
