import { notifyOrganizationMembers, type NotificationType } from '@/services/notification.service';

/**
 * Notify both seller and (optionally) client organization members.
 * Standardizes the dual-notification pattern used across Inngest functions.
 */
export async function notifyShipmentParties(params: {
  sellerOrganizationId: string;
  clientOrganizationId: string | null;
  seller: { title: string; message: string; url: string; type?: NotificationType };
  client?: { title: string; message: string; url: string; type?: NotificationType };
}): Promise<void> {
  await notifyOrganizationMembers(
    params.sellerOrganizationId,
    params.seller.title,
    params.seller.message,
    params.seller.url,
    params.seller.type ?? 'INFO',
  );

  if (params.clientOrganizationId && params.client) {
    await notifyOrganizationMembers(
      params.clientOrganizationId,
      params.client.title,
      params.client.message,
      params.client.url,
      params.client.type ?? 'INFO',
    );
  }
}
