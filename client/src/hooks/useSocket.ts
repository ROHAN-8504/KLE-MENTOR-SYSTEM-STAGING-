import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useRecoilState, useSetRecoilState } from 'recoil';
import { chatsState, notificationsState, typingUsersState } from '../store/atoms';
import { initSocket, disconnectSocket, getSocket } from '../lib/socket';
import type { Message, Notification } from '../types';

export function useSocket() {
  const { getToken, isSignedIn } = useAuth();
  const setChats = useSetRecoilState(chatsState);
  const setNotifications = useSetRecoilState(notificationsState);
  const [typingUsers, setTypingUsers] = useRecoilState(typingUsersState);
  const socketInitialized = useRef(false);

  const setupSocketListeners = useCallback(() => {
    const socket = getSocket();
    if (!socket) return;

    // Message received
    socket.on('message received', (data: { data: Message }) => {
      setChats((prev) =>
        prev.map((chat) =>
          chat._id === data.data.chatId
            ? { ...chat, latestMessage: data.data }
            : chat
        )
      );
    });

    // Typing indicators
    socket.on('typing', (data: { chatId: string; userId: string }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [data.chatId]: [...(prev[data.chatId] || []), data.userId].filter(
          (v, i, a) => a.indexOf(v) === i
        ),
      }));
    });

    socket.on('stop typing', (data: { chatId: string; userId: string }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [data.chatId]: (prev[data.chatId] || []).filter((id) => id !== data.userId),
      }));
    });

    // Notifications
    socket.on('notification', (data: Notification) => {
      setNotifications((prev) => [data, ...prev]);
    });

    // User status
    socket.on('user online', (userId: string) => {
      console.log('User online:', userId);
    });

    socket.on('user offline', (userId: string) => {
      console.log('User offline:', userId);
    });
  }, [setChats, setNotifications, setTypingUsers]);

  const initializeSocket = useCallback(async () => {
    if (!isSignedIn || socketInitialized.current) return;

    try {
      const token = await getToken();
      if (token) {
        initSocket(token);
        setupSocketListeners();
        socketInitialized.current = true;
      }
    } catch (error) {
      console.error('Failed to initialize socket:', error);
    }
  }, [isSignedIn, getToken, setupSocketListeners]);

  useEffect(() => {
    initializeSocket();

    return () => {
      if (socketInitialized.current) {
        disconnectSocket();
        socketInitialized.current = false;
      }
    };
  }, [initializeSocket]);

  return {
    socket: getSocket(),
    typingUsers,
    isConnected: !!getSocket()?.connected,
  };
}
