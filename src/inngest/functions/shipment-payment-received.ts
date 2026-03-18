import { inngest } from '@/inngest/client';
import { db } from '@/db';
import { shipments, transactions } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { notifyOrganizationMembers } from '@/services/notification.service';
import { getTranslations } from 'next-intl/server';

export const shipmentPaymentReceived = inngest.createFunction(
  {
    id: 'shipment-payment-received',
    concurrency: { key: 'event.data.shipmentId', limit: 1 },
    retries: 3,
  },
  { event: 'shipment/payment.received' },
  async ({ event, step }) => {
    const { transactionId, shipmentId } = event.data;

    const txn = await step.run('mark-paid', async () => {
      const [updated] = await db
        .update(transactions)
        .set({ status: 'PAID', paidAt: new Date() })
        .where(and(eq(transactions.id, transactionId), eq(transactions.status, 'PENDING')))
        .returning();
      return updated;
    });

    if (!txn) {
      // Transaction not found or already paid — idempotent no-op
      return { success: true, transactionId, alreadyPaid: true };
    }

    await step.run('notify-admin', async () => {
      const shipment = await db.query.shipments.findFirst({
        where: eq(shipments.id, shipmentId),
        columns: { sellerOrganizationId: true, code: true },
      });

      if (shipment) {
        const t = await getTranslations('Shipments.Notifications');
        await notifyOrganizationMembers(
          shipment.sellerOrganizationId,
          t('titles.paymentConfirmed'),
          t('paymentConfirmed', { amount: txn.amountBrl ?? '0', code: shipment.code }),
          `/dashboard/shipments/${shipmentId}`,
          'SUCCESS'
        );
      }
    });

    await step.run('evaluate-step', async () => {
      await inngest.send({
        name: 'shipment/step.evaluate',
        data: { shipmentId },
      });
    });

    return { success: true, transactionId };
  }
);
