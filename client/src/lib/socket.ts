import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

console.log('Socket URL:', SOCKET_URL); // Debug log

let socket: Socket | null = null;

export const initSocket = (token: string): Socket => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
    withCredentials: true,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

// Socket event helpers
export const joinChat = (chatId: string) => {
  socket?.emit('join chat', chatId);
};

export const leaveChat = (chatId: string) => {
  socket?.emit('leave chat', chatId);
};

export const sendTyping = (chatId: string) => {
  socket?.emit('typing', chatId);
};

export const stopTyping = (chatId: string) => {
  socket?.emit('stop typing', chatId);
};

export const markMessagesRead = (chatId: string) => {
  socket?.emit('mark read', { chatId });
};
