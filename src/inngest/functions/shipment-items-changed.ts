import { inngest } from '@/inngest/client';
import { db } from '@/db';
import { shipments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { applyItemChanges } from '@/services/shipment-items.service';
import { addDocumentAttachment } from '@/services/zapsign.service';
import { generateAmendmentPdfBase64 } from '@/lib/pdf/amendment-pdf';
import { notifyShipmentParties } from '@/inngest/helpers/notify-parties';
import { getTranslations } from 'next-intl/server';

export const shipmentItemsChanged = inngest.createFunction(
  {
    id: 'shipment-items-changed',
    concurrency: { key: 'event.data.shipmentId', limit: 1 },
    retries: 3,
  },
  { event: 'shipment/items.changed' },
  async ({ event, step }) => {
    const { shipmentId, changes } = event.data;

    const shipment = await step.run('fetch-shipment', async () => {
      return db.query.shipments.findFirst({
        where: eq(shipments.id, shipmentId),
        with: {
          quote: { with: { items: { with: { variant: { with: { product: true } } } } } },
          clientOrganization: { columns: { id: true, name: true } },
          sellerOrganization: { columns: { id: true } },
        },
        columns: {
          id: true, code: true, totalProductsUsd: true, zapSignId: true,
          sellerOrganizationId: true, clientOrganizationId: true,
        },
      });
    });

    if (!shipment) throw new Error(`Shipment ${shipmentId} not found`);
    const oldTotalFob = parseFloat(shipment.totalProductsUsd ?? '0');

    await step.run('apply-changes', async () => {
      return applyItemChanges(shipmentId, changes);
    });

    const newShipment = await step.run('fetch-new-total', async () => {
      return db.query.shipments.findFirst({
        where: eq(shipments.id, shipmentId),
        columns: { totalProductsUsd: true },
      });
    });
    const newTotalFob = parseFloat(newShipment?.totalProductsUsd ?? '0');

    const pdfBase64 = await step.run('generate-pdf', async () => {
      const amendmentChanges = changes.map((c) => {
        const existingItem = shipment.quote?.items?.find((i) => i.id === c.itemId);
        return {
          type: c.type as 'ADD' | 'REMOVE' | 'UPDATE',
          productName: existingItem?.variant?.product?.name ?? 'Novo produto',
          oldQuantity: existingItem?.quantity ?? undefined,
          newQuantity: c.data.quantity as number | undefined,
          oldPriceUsd: existingItem?.priceUsd ? parseFloat(existingItem.priceUsd) : undefined,
          newPriceUsd: c.data.priceUsd as number | undefined,
        };
      });

      return generateAmendmentPdfBase64({
        shipmentCode: shipment.code ?? 0,
        clientName: shipment.clientOrganization?.name ?? '',
        date: new Date().toLocaleDateString('pt-BR'),
        changes: amendmentChanges,
        oldTotalFobUsd: oldTotalFob,
        newTotalFobUsd: newTotalFob,
      });
    });

    if (shipment.zapSignId) {
      await step.run('attach-to-zapsign', async () => {
        const result = await addDocumentAttachment(
          shipment.zapSignId!,
          `Aditivo-Pedido-${shipment.code}`,
          pdfBase64
        );
        if (!result.success) throw new Error(`ZapSign attachment failed: ${result.error}`);
      });
    }

    await step.run('notify-parties', async () => {
      const t = await getTranslations('Shipments.Notifications');
      await notifyShipmentParties({
        sellerOrganizationId: shipment.sellerOrganizationId,
        clientOrganizationId: shipment.clientOrganizationId,
        seller: {
          title: t('titles.amendmentGenerated' as any),
          message: t('amendmentGenerated'),
          url: `/admin/shipments/${shipmentId}`,
          type: 'INFO',
        },
        client: {
          title: t('titles.amendmentGenerated' as any),
          message: t('amendmentGenerated'),
          url: `/dashboard`,
          type: 'WARNING',
        },
      });
    });

    return { success: true, oldTotalFob, newTotalFob };
  }
);
