import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '../../shared/types';
import { RoomManager } from './roomManager';
import { prisma } from './db';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true, rooms: 'running' });
});

app.get('/api/leaderboard', async (_req, res) => {
  try {
    const rows = await prisma.user.findMany({
      orderBy: [{ wins: 'desc' }, { games: 'desc' }],
      take: 15,
      select: { id: true, nickname: true, wins: true, losses: true, games: true },
    });
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Không đọc được bảng xếp hạng' });
  }
});

app.get('/api/matches', async (_req, res) => {
  try {
    const rows = await prisma.match.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        mode: true,
        winnerName: true,
        createdAt: true,
        players: { select: { nickname: true, isBot: true, delta: true } },
      },
    });
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Không đọc được lịch sử' });
  }
});

const clientDist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../client/dist',
);
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/socket.io') ||
      req.path === '/health'
    ) {
      next();
      return;
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const server = http.createServer(app);
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>(server, {
  cors: { origin: true, credentials: true },
  pingTimeout: 20_000,
  pingInterval: 10_000,
});

const manager = new RoomManager(io);
io.on('connection', (socket) => manager.handleConnection(socket));

const port = Number(process.env.PORT ?? 3001);
server.listen(port, () => {
  console.log(`[server] Bài Việt đang chạy tại http://localhost:${port}`);
});

async function shutdown(): Promise<void> {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
