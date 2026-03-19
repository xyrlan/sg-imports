import { inngest } from '@/inngest/client';
import { db } from '@/db';
import { shipments, shipmentStepHistory } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notifyShipmentParties } from '@/inngest/helpers/notify-parties';
import { getTranslations } from 'next-intl/server';

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

        const t = await getTranslations('Shipments.Notifications');

        const eventMessageKey: Record<string, 'vesselDeparted' | 'vesselArrived' | 'cargoDelivered'> = {
          VESSEL_DEPARTED: 'vesselDeparted',
          VESSEL_ARRIVED: 'vesselArrived',
          DELIVERED: 'cargoDelivered',
        };

        const msgKey = eventMessageKey[eventType];
        const msg = msgKey ? t(msgKey) : eventType;

        await notifyShipmentParties({
          sellerOrganizationId: shipment.sellerOrganizationId,
          clientOrganizationId: shipment.clientOrganizationId,
          seller: {
            title: t('titles.trackingUpdate'),
            message: t('trackingUpdate', { code: shipment.code, message: msg }),
            url: `/dashboard/shipments/${shipmentId}`,
          },
          client: {
            title: t('titles.trackingUpdateClient'),
            message: t('trackingUpdate', { code: shipment.code, message: msg }),
            url: `/dashboard/shipments/${shipmentId}`,
          },
        });
      });
    }

    return { success: true };
  }
);
