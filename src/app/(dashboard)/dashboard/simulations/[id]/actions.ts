'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { quoteItems, productVariants } from '@/db/schema';
import { requireAuthOrRedirect } from '@/services/auth.service';
import {
  addSimulationItemAndRecalculate,
  updateSimulationItemAndRecalculate,
  removeSimulationItemAndRecalculate,
} from '@/domain/simulation/services/simulation-domain.service';
import { getSimulationById } from '@/services/simulation.service';
import type { ProductSnapshot } from '@/db/types';

const productSnapshotSchema = z.object({
  styleCode: z.string().optional(),
  sku: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  nameEnglish: z.string().optional(),
  description: z.string().optional(),
  photos: z.array(z.string()).optional(),
  priceUsd: z.string().min(1, 'Price is required'),
  unitsPerCarton: z.coerce.number().int().min(1).default(1),
  netWeight: z.coerce.number().optional(),
  unitWeight: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  width: z.coerce.number().optional(),
  length: z.coerce.number().optional(),
  cartonHeight: z.coerce.number().optional(),
  cartonWidth: z.coerce.number().optional(),
  cartonLength: z.coerce.number().optional(),
  cartonWeight: z.coerce.number().optional(),
  totalCbm: z.coerce.number().optional(),
  totalWeight: z.coerce.number().optional(),
  packagingType: z.enum(['BOX', 'PALLET', 'BAG']).optional(),
  attributes: z.record(z.string(), z.string()).optional(),
  tieredPriceInfo: z.array(z.object({ beginAmount: z.number(), price: z.string() })).optional(),
  hsCode: z.string().min(1, 'HS Code is required'),
  taxSnapshot: z
    .object({
      ii: z.number(),
      ipi: z.number(),
      pis: z.number(),
      cofins: z.number(),
    })
    .optional(),
  supplierName: z.string().optional(),
});

const addCatalogItemSchema = z.object({
  simulationId: z.string().uuid(),
  organizationId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1),
  priceUsd: z.string().min(1, 'Price is required'),
});

const addSimulatedItemSchema = z.object({
  simulationId: z.string().uuid(),
  organizationId: z.string().uuid(),
  simulatedProductSnapshot: productSnapshotSchema,
  quantity: z.coerce.number().int().min(1),
  priceUsd: z.string().min(1, 'Price is required'),
});

const removeItemSchema = z.object({
  itemId: z.string().uuid(),
  organizationId: z.string().uuid(),
});

const updateItemSchema = z.object({
  itemId: z.string().uuid(),
  organizationId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1).optional(),
  priceUsd: z.string().min(1).optional(),
  simulatedProductSnapshot: productSnapshotSchema.optional(),
});

export interface AddSimulationItemResult {
  success?: boolean;
  error?: string;
}

export async function addSimulationItemFromCatalogAction(
  simulationId: string,
  organizationId: string,
  variantId: string,
  quantity: number,
  priceUsd: string
): Promise<AddSimulationItemResult> {
  try {
    const user = await requireAuthOrRedirect();

    const validated = addCatalogItemSchema.safeParse({
      simulationId,
      organizationId,
      variantId,
      quantity,
      priceUsd,
    });

    if (!validated.success) {
      return { error: validated.error.issues[0]?.message ?? 'Invalid input' };
    }

    const simData = await getSimulationById(
      validated.data.simulationId,
      validated.data.organizationId,
      user.id,
    );
    if (!simData || simData.simulation.status !== 'DRAFT') {
      const t = await getTranslations('Simulations.errors');
      return { error: t('quoteLockedEdit') };
    }

    const variant = await db.query.productVariants.findFirst({
      where: eq(productVariants.id, validated.data.variantId),
    });
    if (!variant) {
      const t = await getTranslations('Simulations.errors');
      return { error: t('variantNotFound') };
    }

    const unitsPerCarton = variant.unitsPerCarton ?? 1;
    if (validated.data.quantity % unitsPerCarton !== 0) {
      const t = await getTranslations('Simulations.AddProduct');
      return { error: t('quantityMustBeMultipleOf', { unitsPerCarton }) };
    }

    const result = await addSimulationItemAndRecalculate(
      validated.data.simulationId,
      validated.data.organizationId,
      user.id,
      {
        variantId: validated.data.variantId,
        quantity: validated.data.quantity,
        priceUsd: validated.data.priceUsd,
      },
    );

    const tErrors = await getTranslations('Simulations.errors');
    if (!result.success) return { error: result.errors?.[0] ?? tErrors('addItemFailed') };
    revalidatePath(`/dashboard/simulations/${validated.data.simulationId}`);
    return { success: true };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    const tErrors = await getTranslations('Simulations.errors');
    return {
      error: err instanceof Error ? err.message : tErrors('addItemFailed'),
    };
  }
}

export async function addSimulatedProductAction(
  simulationId: string,
  organizationId: string,
  simulatedProductSnapshot: ProductSnapshot,
  quantity: number,
  priceUsd: string
): Promise<AddSimulationItemResult> {
  try {
    const user = await requireAuthOrRedirect();

    const validated = addSimulatedItemSchema.safeParse({
      simulationId,
      organizationId,
      simulatedProductSnapshot,
      quantity,
      priceUsd,
    });

    if (!validated.success) {
      return { error: validated.error.issues[0]?.message ?? 'Invalid input' };
    }

    const simData = await getSimulationById(
      validated.data.simulationId,
      validated.data.organizationId,
      user.id,
    );
    if (!simData || simData.simulation.status !== 'DRAFT') {
      const t = await getTranslations('Simulations.errors');
      return { error: t('quoteLockedEdit') };
    }

    const snap = validated.data.simulatedProductSnapshot;
    const hasDirectCbmWeight =
      (snap.totalCbm != null && snap.totalCbm > 0) ||
      (snap.totalWeight != null && snap.totalWeight > 0);
    if (!hasDirectCbmWeight) {
      const unitsPerCarton = snap.unitsPerCarton ?? 1;
      if (validated.data.quantity % unitsPerCarton !== 0) {
        const t = await getTranslations('Simulations.QuickForm');
        return { error: t('quantityMustBeMultipleOf', { unitsPerCarton }) };
      }
    }

    const result = await addSimulationItemAndRecalculate(
      validated.data.simulationId,
      validated.data.organizationId,
      user.id,
      {
        simulatedProductSnapshot: validated.data.simulatedProductSnapshot,
        quantity: validated.data.quantity,
        priceUsd: validated.data.priceUsd,
      },
    );

    const tErrors = await getTranslations('Simulations.errors');
    if (!result.success) return { error: result.errors?.[0] ?? tErrors('addItemFailed') };
    revalidatePath(`/dashboard/simulations/${validated.data.simulationId}`);
    return { success: true };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    const tErrors = await getTranslations('Simulations.errors');
    return {
      error: err instanceof Error ? err.message : tErrors('addItemFailed'),
    };
  }
}

export interface RemoveSimulationItemResult {
  success?: boolean;
  error?: string;
}

export async function removeSimulationItemAction(
  itemId: string,
  organizationId: string
): Promise<RemoveSimulationItemResult> {
  try {
    const user = await requireAuthOrRedirect();

    const validated = removeItemSchema.safeParse({ itemId, organizationId });
    if (!validated.success) {
      return { error: 'Invalid input' };
    }

    const [item] = await db
      .select({ quoteId: quoteItems.quoteId })
      .from(quoteItems)
      .where(eq(quoteItems.id, validated.data.itemId));

    if (item?.quoteId) {
      const simData = await getSimulationById(item.quoteId, validated.data.organizationId, user.id);
      if (!simData || simData.simulation.status !== 'DRAFT') {
        const t = await getTranslations('Simulations.errors');
        return { error: t('quoteLockedEdit') };
      }
    }

    const result = await removeSimulationItemAndRecalculate(
      validated.data.itemId,
      validated.data.organizationId,
      user.id,
    );

    const tErrors = await getTranslations('Simulations.errors');
    if (!result.success) return { error: result.errors?.[0] ?? tErrors('removeItemFailed') };

    if (item?.quoteId) {
      revalidatePath(`/dashboard/simulations/${item.quoteId}`);
    }
    return { success: true };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    const tErrors = await getTranslations('Simulations.errors');
    return {
      error: err instanceof Error ? err.message : tErrors('removeItemFailed'),
    };
  }
}

export interface UpdateSimulationItemResult {
  success?: boolean;
  error?: string;
}

export async function updateSimulationItemAction(
  itemId: string,
  organizationId: string,
  updates: { quantity?: number; priceUsd?: string; simulatedProductSnapshot?: ProductSnapshot }
): Promise<UpdateSimulationItemResult> {
  try {
    const user = await requireAuthOrRedirect();

    const validated = updateItemSchema.safeParse({
      itemId,
      organizationId,
      ...updates,
    });

    if (!validated.success) {
      return { error: validated.error.issues[0]?.message ?? 'Invalid input' };
    }

    const itemForCheck = await db.query.quoteItems.findFirst({
      where: eq(quoteItems.id, validated.data.itemId),
      with: { quote: true },
    });
    const hasAccess =
      itemForCheck?.quote &&
      (itemForCheck.quote.sellerOrganizationId === validated.data.organizationId ||
        itemForCheck.quote.clientOrganizationId === validated.data.organizationId);
    if (!hasAccess) {
      const t = await getTranslations('Simulations.errors');
      return { error: t('itemNotFound') };
    }
    if (itemForCheck.quote.status !== 'DRAFT') {
      const t = await getTranslations('Simulations.errors');
      return { error: t('quoteLockedEdit') };
    }

    if (validated.data.quantity !== undefined) {
      const snap = (validated.data.simulatedProductSnapshot ?? itemForCheck.simulatedProductSnapshot) as ProductSnapshot | null;
      const hasDirectCbmWeight = snap
        ? (snap.totalCbm != null && snap.totalCbm > 0) || (snap.totalWeight != null && snap.totalWeight > 0)
        : false;
      const isCartonMode = !!itemForCheck.variantId || (!!snap && !hasDirectCbmWeight);
      if (isCartonMode) {
        let unitsPerCarton = 1;
        if (itemForCheck.variantId) {
          const variant = await db.query.productVariants.findFirst({
            where: eq(productVariants.id, itemForCheck.variantId),
          });
          unitsPerCarton = variant?.unitsPerCarton ?? 1;
        } else if (snap) {
          unitsPerCarton = snap.unitsPerCarton ?? 1;
        }
        if (validated.data.quantity % unitsPerCarton !== 0) {
          const t = await getTranslations(
            itemForCheck.variantId ? 'Simulations.AddProduct' : 'Simulations.QuickForm'
          );
          return { error: t('quantityMustBeMultipleOf', { unitsPerCarton }) };
        }
      }
    }

    const updatePayload: {
      quantity?: number;
      priceUsd?: string;
      simulatedProductSnapshot?: ProductSnapshot;
    } = {};
    if (validated.data.quantity !== undefined) updatePayload.quantity = validated.data.quantity;
    if (validated.data.priceUsd !== undefined) updatePayload.priceUsd = validated.data.priceUsd;
    if (validated.data.simulatedProductSnapshot !== undefined) {
      updatePayload.simulatedProductSnapshot = validated.data.simulatedProductSnapshot;
    }

    const result = await updateSimulationItemAndRecalculate(
      validated.data.itemId,
      validated.data.organizationId,
      user.id,
      updatePayload,
    );

    const tErrors = await getTranslations('Simulations.errors');
    if (!result.success) return { error: result.errors?.[0] ?? tErrors('updateItemFailed') };

    if (itemForCheck?.quoteId) {
      revalidatePath(`/dashboard/simulations/${itemForCheck.quoteId}`);
    }
    return { success: true };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    const tErrors = await getTranslations('Simulations.errors');
    return {
      error: err instanceof Error ? err.message : tErrors('updateItemFailed'),
    };
  }
}
