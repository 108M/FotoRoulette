import { io, Socket } from 'socket.io-client';

// URL real en internet del servidor mágico alojado en Render
export const SERVER_URL = 'https://fotoroulette.onrender.com';

export const socket: Socket = io(SERVER_URL, {
  autoConnect: true,
});