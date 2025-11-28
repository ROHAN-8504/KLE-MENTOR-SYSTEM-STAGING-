import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { clerkClient } from '@clerk/clerk-sdk-node';
import User from '../models/User';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

// Global io instance for emitting events from controllers
let ioInstance: SocketServer | undefined;

export const getIO = (): SocketServer | undefined => ioInstance;

// Helper to emit notification to specific users
export const emitNotification = (userIds: string[], notification: any) => {
  if (!ioInstance) return;
  userIds.forEach((userId) => {
    ioInstance!.to(userId).emit('notification', notification);
  });
};

// Helper to emit chat message to room (excluding sender)
export const emitChatMessage = (chatId: string, message: any, excludeUserId?: string) => {
  if (!ioInstance) return;
  if (excludeUserId) {
    // Emit to all in room except sender
    ioInstance.to(chatId).except(excludeUserId).emit('message received', { data: message });
  } else {
    ioInstance.to(chatId).emit('message received', { data: message });
  }
};

export const initializeSocket = (server: HttpServer) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://kle-mentor-system-staging.vercel.app',
    process.env.CLIENT_URL,
  ].filter(Boolean);

  const io = new SocketServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isAllowed = allowedOrigins.some(allowed => 
          origin === allowed || origin.startsWith(allowed?.replace(/\/$/, '') || '')
        );
        callback(null, isAllowed || true); // Allow all for now
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // Store the io instance globally
  ioInstance = io;

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify token with Clerk
      const sessionClaims = await clerkClient.verifyToken(token);

      if (!sessionClaims) {
        return next(new Error('Invalid token'));
      }

      // Get user from database
      const user = await User.findOne({ clerkId: sessionClaims.sub });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user's personal room for direct messages
    if (socket.userId) {
      socket.join(socket.userId);
    }

    // Join chat room
    socket.on('join chat', (chatId: string) => {
      socket.join(chatId);
      console.log(`User ${socket.userId} joined chat: ${chatId}`);
    });

    // Leave chat room
    socket.on('leave chat', (chatId: string) => {
      socket.leave(chatId);
      console.log(`User ${socket.userId} left chat: ${chatId}`);
    });

    // Typing indicators
    socket.on('typing', (chatId: string) => {
      socket.to(chatId).emit('typing', {
        chatId,
        userId: socket.userId,
        user: {
          _id: socket.user?._id,
          name: `${socket.user?.profile?.firstName} ${socket.user?.profile?.lastName}`,
        },
      });
    });

    socket.on('stop typing', (chatId: string) => {
      socket.to(chatId).emit('stop typing', {
        chatId,
        userId: socket.userId,
      });
    });

    // New message (handled by API, emitted from controller)
    // This is just for real-time delivery confirmation
    socket.on('new message', (data: any) => {
      const { chatId, message } = data;
      socket.to(chatId).emit('message received', {
        data: {
          ...message,
          chatId,
        },
      });
    });

    // Mark messages as read
    socket.on('mark read', (data: { chatId: string }) => {
      socket.to(data.chatId).emit('messages read', {
        chatId: data.chatId,
        userId: socket.userId,
      });
    });

    // Online status
    socket.on('go online', () => {
      if (socket.userId) {
        socket.broadcast.emit('user online', socket.userId);
      }
    });

    socket.on('go offline', () => {
      if (socket.userId) {
        socket.broadcast.emit('user offline', socket.userId);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      if (socket.userId) {
        socket.broadcast.emit('user offline', socket.userId);
      }
    });
  });

  return io;
};
