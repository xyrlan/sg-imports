'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@heroui/react';
import type { Notification } from '@/services/notification.service';
import {
  getUnreadCountAction,
  getLatestNotificationsAction,
  markAsReadAction,
  markAllAsReadAction,
} from '@/app/(dashboard)/notification-actions';

const NOTIFICATION_LIMIT = 10;

function showNotificationToast(
  title: string,
  message: string,
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'
) {
  switch (type) {
    case 'SUCCESS':
      toast.success(title, { description: message });
      break;
    case 'WARNING':
      toast.warning(title, { description: message });
      break;
    case 'ERROR':
      toast.danger(title, { description: message });
      break;
    case 'INFO':
    default:
      toast.info(title, { description: message });
      break;
  }
}

export interface UseNotificationsReturn {
  unreadCount: number;
  notifications: Notification[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
}

/**
 * Hook for real-time notifications. Subscribes to Supabase postgres_changes
 * filtered by profile_id, shows toast on INSERT, and maintains local state.
 */
export function useNotifications(profileId: string | undefined): UseNotificationsReturn {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!profileId) return;

    try {
      const [count, latest] = await Promise.all([
        getUnreadCountAction(),
        getLatestNotificationsAction(NOTIFICATION_LIMIT),
      ]);
      setUnreadCount(count);
      setNotifications(latest);
    } catch (error) {
      console.error('useNotifications refresh:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  const handleMarkAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    const result = await markAsReadAction(notificationId);
    if (result.ok) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      return true;
    }
    return false;
  }, []);

  const handleMarkAllAsRead = useCallback(async (): Promise<boolean> => {
    const result = await markAllAsReadAction();
    if (result.ok) {
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (!profileId) {
      setIsLoading(false);
      return;
    }

    refresh();
  }, [profileId, refresh]);

  useEffect(() => {
    if (!profileId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`notifications:${profileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `profile_id=eq.${profileId}`,
        },
        (payload) => {
          const newRecord = payload.new as Record<string, unknown>;
          const notification: Notification = {
            id: newRecord.id as string,
            profileId: newRecord.profile_id as string,
            organizationId: (newRecord.organization_id as string) ?? null,
            title: newRecord.title as string,
            message: newRecord.message as string,
            type: (newRecord.type as Notification['type']) ?? 'INFO',
            read: (newRecord.read as boolean) ?? false,
            actionUrl: (newRecord.action_url as string) ?? null,
            createdAt: new Date(newRecord.created_at as string),
          };

          showNotificationToast(
            notification.title,
            notification.message,
            notification.type ?? 'INFO'
          );

          setUnreadCount((prev) => prev + 1);
          setNotifications((prev) => [notification, ...prev].slice(0, NOTIFICATION_LIMIT));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  return {
    unreadCount,
    notifications,
    isLoading,
    refresh,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
  };
}
