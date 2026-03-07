'use server';

import { revalidatePath } from 'next/cache';
import { requireAuthOrRedirect } from '@/services/auth.service';
import {
  getUnreadCount,
  getLatest,
  markAsRead,
  markAllAsRead,
} from '@/services/notification.service';

/**
 * Get unread notification count for the current user.
 */
export async function getUnreadCountAction(): Promise<number> {
  const user = await requireAuthOrRedirect();
  return getUnreadCount(user.id);
}

/**
 * Get latest notifications for the current user.
 */
export async function getLatestNotificationsAction(
  limit = 10
): Promise<Awaited<ReturnType<typeof getLatest>>> {
  const user = await requireAuthOrRedirect();
  return getLatest(user.id, limit);
}

export type MarkAsReadActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Mark a single notification as read. Validates ownership.
 */
export async function markAsReadAction(
  notificationId: string
): Promise<MarkAsReadActionResult> {
  try {
    const user = await requireAuthOrRedirect();
    const updated = await markAsRead(notificationId, user.id);

    if (!updated) {
      return { ok: false, error: 'Notificação não encontrada' };
    }

    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (error) {
    console.error('markAsReadAction:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Erro ao marcar como lida',
    };
  }
}

export type MarkAllAsReadActionResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

/**
 * Mark all notifications as read for the current user.
 */
export async function markAllAsReadAction(): Promise<MarkAllAsReadActionResult> {
  try {
    const user = await requireAuthOrRedirect();
    const count = await markAllAsRead(user.id);

    revalidatePath('/', 'layout');
    return { ok: true, count };
  } catch (error) {
    console.error('markAllAsReadAction:', error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : 'Erro ao marcar todas como lidas',
    };
  }
}
