import { db } from '@/db';
import { shipments, quoteItems } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import { roundMoney } from '@/lib/currency';

interface ItemEditPayload {
  shipmentId: string;
  adminProfileId: string;
  changes: Array<{
    type: 'ADD' | 'REMOVE' | 'UPDATE';
    quoteItemId?: string;
    variantId?: string;
    quantity?: number;
    priceUsd?: number;
  }>;
}

export async function initiateItemEdit(payload: ItemEditPayload) {
  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.id, payload.shipmentId),
    columns: { currentStep: true, status: true },
  });

  if (!shipment) throw new Error('Shipment not found');
  if (shipment.currentStep !== 'MERCHANDISE_PAYMENT') {
    throw new Error('Items can only be edited during MERCHANDISE_PAYMENT step');
  }
  if (shipment.status === 'CANCELED') {
    throw new Error('Cannot edit items of a canceled shipment');
  }

  await inngest.send({
    name: 'shipment/items.changed',
    data: {
      shipmentId: payload.shipmentId,
      adminProfileId: payload.adminProfileId,
      changes: payload.changes.map((c) => ({
        type: c.type,
        itemId: c.quoteItemId,
        data: {
          variantId: c.variantId,
          quantity: c.quantity,
          priceUsd: c.priceUsd,
        },
      })),
    },
  });

  return { success: true, message: 'Item changes submitted for processing' };
}

export async function applyItemChanges(
  shipmentId: string,
  changes: Array<{ type: string; itemId?: string; data: Record<string, unknown> }>
) {
  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.id, shipmentId),
    with: { quote: { with: { items: true } } },
    columns: { id: true, quoteId: true },
  });

  if (!shipment?.quote) throw new Error('Shipment has no linked quote');

  await db.transaction(async (tx) => {
    for (const change of changes) {
      if (change.type === 'REMOVE' && change.itemId) {
        await tx.delete(quoteItems).where(eq(quoteItems.id, change.itemId));
      }
      if (change.type === 'UPDATE' && change.itemId) {
        const updates: Record<string, unknown> = {};
        if (change.data.quantity !== undefined) updates.quantity = change.data.quantity;
        if (change.data.priceUsd !== undefined) updates.priceUsd = String(change.data.priceUsd);
        if (Object.keys(updates).length > 0) {
          await tx.update(quoteItems).set(updates).where(eq(quoteItems.id, change.itemId));
        }
      }
      if (change.type === 'ADD' && change.data.variantId) {
        await tx.insert(quoteItems).values({
          quoteId: shipment.quote!.id,
          variantId: change.data.variantId as string,
          quantity: (change.data.quantity as number) ?? 1,
          priceUsd: String(change.data.priceUsd ?? '0'),
        });
      }
    }

    // Recalculate totalProductsUsd
    const updatedItems = await tx.query.quoteItems.findMany({
      where: eq(quoteItems.quoteId, shipment.quote!.id),
      columns: { quantity: true, priceUsd: true },
    });

    const newTotalUsd = roundMoney(
      updatedItems.reduce(
        (sum, item) => sum + (item.quantity ?? 0) * parseFloat(item.priceUsd ?? '0'),
        0,
      ),
    );

    await tx.update(shipments).set({
      totalProductsUsd: String(newTotalUsd),
      updatedAt: new Date(),
    }).where(eq(shipments.id, shipmentId));
  });

  return { success: true };
}
