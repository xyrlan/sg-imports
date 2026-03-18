import { inngest } from '@/inngest/client';
import { db } from '@/db';
import { shipments, transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notifyOrganizationMembers } from '@/services/notification.service';

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
        .where(eq(transactions.id, transactionId))
        .returning();
      return updated;
    });

    if (!txn) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    await step.run('notify-admin', async () => {
      const shipment = await db.query.shipments.findFirst({
        where: eq(shipments.id, shipmentId),
        columns: { sellerOrganizationId: true, code: true },
      });

      if (shipment) {
        await notifyOrganizationMembers(
          shipment.sellerOrganizationId,
          'Pagamento confirmado',
          `Pagamento de R$ ${txn.amountBrl} confirmado para o pedido #${shipment.code}.`,
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
