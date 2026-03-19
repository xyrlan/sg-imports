import { inngest } from '@/inngest/client';
import { convertQuoteToShipmentSystem } from '@/services/quote-workflow.service';
import { notifyShipmentParties } from '@/inngest/helpers/notify-parties';
import { db } from '@/db';
import { quotes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';

export const quoteContractSigned = inngest.createFunction(
  {
    id: 'quote-contract-signed',
    concurrency: { key: 'event.data.quoteId', limit: 1 },
    retries: 3,
  },
  { event: 'quote/contract.signed' },
  async ({ event, step }) => {
    const { quoteId } = event.data;

    const result = await step.run('convert-to-shipment', async () => {
      return convertQuoteToShipmentSystem(quoteId);
    });

    if (!result.success) {
      throw new Error(result.error ?? 'Failed to convert quote to shipment');
    }

    await step.run('notify-parties', async () => {
      const quote = await db.query.quotes.findFirst({
        where: eq(quotes.id, quoteId),
        columns: {
          name: true,
          sellerOrganizationId: true,
          clientOrganizationId: true,
          generatedShipmentId: true,
        },
      });

      if (!quote) return;

      const t = await getTranslations('Shipments.Notifications');
      const shipmentUrl = quote.generatedShipmentId
        ? `/dashboard?shipment=${quote.generatedShipmentId}`
        : null;

      await notifyShipmentParties({
        sellerOrganizationId: quote.sellerOrganizationId,
        clientOrganizationId: quote.clientOrganizationId,
        seller: {
          title: t('titles.contractSigned'),
          message: t('contractSigned', { name: quote.name }),
          url: shipmentUrl ?? `/dashboard/simulations/${quoteId}`,
          type: 'SUCCESS',
        },
        client: {
          title: t('titles.orderCreated'),
          message: t('orderCreated', { name: quote.name }),
          url: shipmentUrl ?? `/dashboard/proposals/${quoteId}`,
          type: 'SUCCESS',
        },
      });
    });

    return { success: true, shipmentId: result.shipmentId };
  }
);
