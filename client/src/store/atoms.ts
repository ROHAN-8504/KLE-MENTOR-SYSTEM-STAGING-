import { atom, selector } from 'recoil';
import type { User, Notification, Chat } from '../types';

// User state
export const userState = atom<User | null>({
  key: 'userState',
  default: null,
});

export const isAuthenticatedState = selector({
  key: 'isAuthenticatedState',
  get: ({ get }) => {
    const user = get(userState);
    return !!user;
  },
});

export const userRoleState = selector({
  key: 'userRoleState',
  get: ({ get }) => {
    const user = get(userState);
    return user?.role || null;
  },
});

// Loading states
export const loadingState = atom<boolean>({
  key: 'loadingState',
  default: false,
});

export const pageLoadingState = atom<boolean>({
  key: 'pageLoadingState',
  default: true,
});

// Notifications
export const notificationsState = atom<Notification[]>({
  key: 'notificationsState',
  default: [],
});

export const unreadNotificationCountState = selector({
  key: 'unreadNotificationCountState',
  get: ({ get }) => {
    const notifications = get(notificationsState);
    return notifications.filter((n) => !n.isRead).length;
  },
});

// Chat state
export const chatsState = atom<Chat[]>({
  key: 'chatsState',
  default: [],
});

export const activeChatState = atom<Chat | null>({
  key: 'activeChatState',
  default: null,
});

export const typingUsersState = atom<Record<string, string[]>>({
  key: 'typingUsersState',
  default: {},
});

// Theme
export const themeState = atom<'light' | 'dark'>({
  key: 'themeState',
  default: 'light',
  effects: [
    ({ setSelf, onSet }) => {
      // Load from localStorage
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      if (savedTheme) {
        setSelf(savedTheme);
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setSelf('dark');
      }

      // Save to localStorage on change
      onSet((newValue) => {
        localStorage.setItem('theme', newValue);
        if (newValue === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      });
    },
  ],
});

// Sidebar state
export const sidebarOpenState = atom<boolean>({
  key: 'sidebarOpenState',
  default: true,
});

export const mobileSidebarOpenState = atom<boolean>({
  key: 'mobileSidebarOpenState',
  default: false,
});
