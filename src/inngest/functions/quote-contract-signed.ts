import { inngest } from '@/inngest/client';
import { convertQuoteToShipmentSystem } from '@/services/quote-workflow.service';
import { notifyOrganizationMembers } from '@/services/notification.service';
import { db } from '@/db';
import { quotes } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

      const shipmentUrl = quote.generatedShipmentId
        ? `/dashboard?shipment=${quote.generatedShipmentId}`
        : null;

      await notifyOrganizationMembers(
        quote.sellerOrganizationId,
        'Contrato assinado',
        `O cliente assinou o contrato da proposta "${quote.name}". O pedido foi criado automaticamente.`,
        shipmentUrl ?? `/dashboard/simulations/${quoteId}`,
        'SUCCESS'
      );

      if (quote.clientOrganizationId) {
        await notifyOrganizationMembers(
          quote.clientOrganizationId,
          'Pedido criado',
          `Seu pedido referente à proposta "${quote.name}" foi criado com sucesso.`,
          shipmentUrl ?? `/dashboard/proposals/${quoteId}`,
          'SUCCESS'
        );
      }
    });

    return { success: true, shipmentId: result.shipmentId };
  }
);
