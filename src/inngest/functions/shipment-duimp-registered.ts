import { inngest } from '@/inngest/client';
import { db } from '@/db';
import { shipments, shipmentExpenses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { fetchDuimpData } from '@/lib/siscomex/client';
import { notifyOrganizationMembers } from '@/services/notification.service';

export const shipmentDuimpRegistered = inngest.createFunction(
  {
    id: 'shipment-duimp-registered',
    concurrency: { key: 'event.data.shipmentId', limit: 1 },
    retries: 3,
  },
  { event: 'shipment/duimp.registered' },
  async ({ event, step }) => {
    const { shipmentId, duimpNumber } = event.data;

    const siscomexResult = await step.run('fetch-siscomex', async () => {
      return fetchDuimpData(duimpNumber);
    });

    if (!siscomexResult.success) {
      await step.run('save-duimp-number', async () => {
        await db
          .update(shipments)
          .set({ duimpNumber, updatedAt: new Date() })
          .where(eq(shipments.id, shipmentId));
      });
      throw new Error(`Siscomex API failed: ${siscomexResult.error}`);
    }

    await step.run('persist-duimp-data', async () => {
      const { data, channel } = siscomexResult;

      await db.transaction(async (tx) => {
        await tx
          .update(shipments)
          .set({
            duimpNumber,
            duimpChannel: channel,
            duimpData: data, // Full Siscomex API snapshot
            updatedAt: new Date(),
          })
          .where(eq(shipments.id, shipmentId));

        const taxEntries = [
          { category: 'TAX_II' as const, value: data.impostos.ii },
          { category: 'TAX_IPI' as const, value: data.impostos.ipi },
          { category: 'TAX_PIS' as const, value: data.impostos.pis },
          { category: 'TAX_COFINS' as const, value: data.impostos.cofins },
          { category: 'TAX_SISCOMEX' as const, value: data.impostos.taxaSiscomex },
        ]
          .filter((e) => e.value > 0)
          .map((e) => ({
            shipmentId,
            category: e.category,
            description: `Imposto ${e.category} - DUIMP ${duimpNumber}`,
            value: String(e.value),
            currency: 'BRL' as const,
            status: 'PENDING' as const,
          }));

        if (taxEntries.length > 0) {
          await tx.insert(shipmentExpenses).values(taxEntries);
        }
      });
    });

    await step.run('notify-duimp', async () => {
      const shipment = await db.query.shipments.findFirst({
        where: eq(shipments.id, shipmentId),
        columns: { sellerOrganizationId: true, clientOrganizationId: true, code: true },
      });

      if (!shipment) return;

      const { channel } = siscomexResult;
      const channelLabel = { GREEN: 'Verde', YELLOW: 'Amarelo', RED: 'Vermelho', GREY: 'Cinza' }[channel];
      const isUrgent = channel === 'RED' || channel === 'GREY';

      await notifyOrganizationMembers(
        shipment.sellerOrganizationId,
        isUrgent ? 'DUIMP — Canal de Atenção' : 'DUIMP registrada',
        `DUIMP ${duimpNumber} registrada. Canal: ${channelLabel}.`,
        `/dashboard/shipments/${shipmentId}`,
        isUrgent ? 'WARNING' : 'SUCCESS'
      );

      if (shipment.clientOrganizationId) {
        await notifyOrganizationMembers(
          shipment.clientOrganizationId,
          'DUIMP registrada',
          `A DUIMP do seu pedido #${shipment.code} foi registrada.`,
          `/dashboard/shipments/${shipmentId}`,
          'INFO'
        );
      }
    });

    await step.run('evaluate-step', async () => {
      await inngest.send({
        name: 'shipment/step.evaluate',
        data: { shipmentId },
      });
    });

    return { success: true, channel: siscomexResult.channel };
  }
);
