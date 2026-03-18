import { inngest } from '@/inngest/client';
import { db } from '@/db';
import { shipments, shipmentStepHistory } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notifyOrganizationMembers } from '@/services/notification.service';

export const shipmentShipsgoUpdated = inngest.createFunction(
  {
    id: 'shipment-shipsgo-updated',
    concurrency: { key: 'event.data.shipmentId', limit: 1 },
    retries: 3,
  },
  { event: 'shipment/shipsgo.updated' },
  async ({ event, step }) => {
    const { shipmentId, payload } = event.data;

    await step.run('update-tracking', async () => {
      const updateData: Record<string, unknown> = {
        shipsGoLastUpdate: new Date(),
        updatedAt: new Date(),
      };

      if (payload.eta) updateData.eta = new Date(payload.eta as string);
      if (payload.etd) updateData.etd = new Date(payload.etd as string);

      await db
        .update(shipments)
        .set(updateData)
        .where(eq(shipments.id, shipmentId));
    });

    const eventType = payload.eventType as string | undefined;
    if (eventType) {
      await step.run('log-event', async () => {
        const shipment = await db.query.shipments.findFirst({
          where: eq(shipments.id, shipmentId),
          columns: { currentStep: true },
        });

        if (shipment) {
          await db.insert(shipmentStepHistory).values({
            shipmentId,
            step: shipment.currentStep,
            status: 'PENDING',
            metadata: { shipsGoEvent: eventType, payload },
          });
        }
      });
    }

    const significantEvents = ['VESSEL_DEPARTED', 'VESSEL_ARRIVED', 'DELIVERED'];
    if (eventType && significantEvents.includes(eventType)) {
      await step.run('notify-tracking', async () => {
        const shipment = await db.query.shipments.findFirst({
          where: eq(shipments.id, shipmentId),
          columns: { sellerOrganizationId: true, clientOrganizationId: true, code: true },
        });

        if (!shipment) return;

        const messages: Record<string, string> = {
          VESSEL_DEPARTED: 'O navio partiu do porto de origem.',
          VESSEL_ARRIVED: 'O navio chegou ao porto de destino.',
          DELIVERED: 'A carga foi entregue.',
        };

        const msg = messages[eventType] ?? `Atualização de tracking: ${eventType}`;

        await notifyOrganizationMembers(
          shipment.sellerOrganizationId,
          'Atualização de rastreamento',
          `Pedido #${shipment.code}: ${msg}`,
          `/dashboard/shipments/${shipmentId}`,
          'INFO'
        );

        if (shipment.clientOrganizationId) {
          await notifyOrganizationMembers(
            shipment.clientOrganizationId,
            'Atualização do seu pedido',
            `Pedido #${shipment.code}: ${msg}`,
            `/dashboard/shipments/${shipmentId}`,
            'INFO'
          );
        }
      });
    }

    return { success: true };
  }
);
