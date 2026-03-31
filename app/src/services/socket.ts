import { io, Socket } from 'socket.io-client';

// Usamos tu IP local para que el móvil encuentre el servidor en tu ordenador
export const SERVER_URL = 'http://192.168.1.11:3000';

export const socket: Socket = io(SERVER_URL, {
  autoConnect: true,
});