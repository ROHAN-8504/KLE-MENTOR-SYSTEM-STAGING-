import { useEffect, useCallback } from 'react';
import { useRecoilState } from 'recoil';
import { notificationsState } from '../store/atoms';
import { notificationAPI } from '../lib/api';
import type { Notification, PaginatedResponse } from '../types';

export function useNotifications() {
  const [notifications, setNotifications] = useRecoilState(notificationsState);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await notificationAPI.getNotifications({ limit: 50 });
      const data = response.data.data as PaginatedResponse<Notification>;
      setNotifications(data.items);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [setNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await notificationAPI.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const clearAll = async () => {
    try {
      await notificationAPI.clearAll();
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}
