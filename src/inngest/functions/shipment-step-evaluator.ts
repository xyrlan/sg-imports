import { inngest } from '@/inngest/client';
import { advanceStep } from '@/services/shipment-workflow.service';
import { getTotalMerchandisePaidUsd, is90InvoicePaid } from '@/services/shipment.service';
import { notifyOrganizationMembers } from '@/services/notification.service';
import { db } from '@/db';
import { shipments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';

export const shipmentStepEvaluator = inngest.createFunction(
  {
    id: 'shipment-step-evaluator',
    concurrency: { key: 'event.data.shipmentId', limit: 1 },
    retries: 3,
  },
  { event: 'shipment/step.evaluate' },
  async ({ event, step }) => {
    const { shipmentId } = event.data;

    const shipment = await step.run('fetch-shipment', async () => {
      return db.query.shipments.findFirst({
        where: eq(shipments.id, shipmentId),
        columns: {
          id: true, currentStep: true, status: true,
          totalProductsUsd: true, duimpNumber: true,
          sellerOrganizationId: true, clientOrganizationId: true,
        },
      });
    });

    if (!shipment || shipment.status === 'CANCELED') {
      return { evaluated: false, reason: 'Shipment not found or canceled' };
    }

    if (shipment.currentStep === 'MERCHANDISE_PAYMENT') {
      const shouldAdvance = await step.run('check-fob-paid', async () => {
        const totalPaid = await getTotalMerchandisePaidUsd(shipmentId);
        const totalRequired = parseFloat(shipment.totalProductsUsd ?? '0');
        return totalPaid >= totalRequired && totalRequired > 0;
      });

      if (shouldAdvance) {
        const result = await step.run('advance-to-shipping-prep', async () => {
          return advanceStep(shipmentId, 'MERCHANDISE_PAYMENT');
        });

        if (result.advanced) {
          await step.run('notify-fob-complete', async () => {
            const t = await getTranslations('Shipments.Notifications');
            await notifyOrganizationMembers(
              shipment.sellerOrganizationId,
              t('titles.fobComplete'),
              t('fobComplete'),
              `/dashboard/shipments/${shipmentId}`,
              'SUCCESS'
            );
            if (shipment.clientOrganizationId) {
              await notifyOrganizationMembers(
                shipment.clientOrganizationId,
                t('titles.fobComplete'),
                t('fobCompleteClient'),
                `/dashboard/shipments/${shipmentId}`,
                'SUCCESS'
              );
            }
          });
        }
        return { evaluated: true, advanced: result.advanced, newStep: result.currentStep };
      }
    }

    if (shipment.currentStep === 'CUSTOMS_CLEARANCE') {
      const shouldAdvance = await step.run('check-customs-conditions', async () => {
        const hasDuimp = !!shipment.duimpNumber;
        const invoicePaid = await is90InvoicePaid(shipmentId);
        return hasDuimp && invoicePaid;
      });

      if (shouldAdvance) {
        const result = await step.run('advance-to-completion', async () => {
          return advanceStep(shipmentId, 'CUSTOMS_CLEARANCE');
        });

        if (result.advanced) {
          await step.run('notify-customs-cleared', async () => {
            const t = await getTranslations('Shipments.Notifications');
            await notifyOrganizationMembers(
              shipment.sellerOrganizationId,
              t('titles.customsCleared'),
              t('customsCleared'),
              `/dashboard/shipments/${shipmentId}`,
              'SUCCESS'
            );
          });
        }
        return { evaluated: true, advanced: result.advanced, newStep: result.currentStep };
      }
    }

    return { evaluated: true, advanced: false, currentStep: shipment.currentStep };
  }
);
