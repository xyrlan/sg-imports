import { cache } from 'react';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { eq, and, count, desc } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
export type Notification = InferSelectModel<typeof notifications>;

export interface SendNotificationInput {
  profileId: string;
  organizationId?: string;
  title: string;
  message: string;
  type?: NotificationType;
  actionUrl?: string;
}

/**
 * Insert a new notification. Used by backend/server-side code.
 */
export async function sendNotification(data: SendNotificationInput): Promise<Notification | null> {
  const [inserted] = await db
    .insert(notifications)
    .values({
      profileId: data.profileId,
      organizationId: data.organizationId ?? null,
      title: data.title,
      message: data.message,
      type: data.type ?? 'INFO',
      actionUrl: data.actionUrl ?? null,
    })
    .returning();

  return inserted ?? null;
}

/**
 * Get unread notification count for a profile. Cached per request.
 */
export const getUnreadCount = cache(async (profileId: string): Promise<number> => {
  const [result] = await db
    .select({ count: count() })
    .from(notifications)
    .where(and(eq(notifications.profileId, profileId), eq(notifications.read, false)));

  return result?.count ?? 0;
});

/**
 * Get latest notifications for a profile. Cached per request.
 */
export const getLatest = cache(
  async (profileId: string, limit = 10): Promise<Notification[]> => {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.profileId, profileId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }
);

/**
 * Mark a single notification as read. Validates ownership.
 */
export async function markAsRead(
  notificationId: string,
  profileId: string
): Promise<boolean> {
  const [updated] = await db
    .update(notifications)
    .set({ read: true })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.profileId, profileId)
      )
    )
    .returning();

  return !!updated;
}

/**
 * Mark all notifications as read for a profile.
 */
export async function markAllAsRead(profileId: string): Promise<number> {
  const result = await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.profileId, profileId))
    .returning({ id: notifications.id });

  return result.length;
}
