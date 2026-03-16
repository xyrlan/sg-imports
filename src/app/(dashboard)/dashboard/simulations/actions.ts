'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { requireAuthOrRedirect } from '@/services/auth.service';
import { getOrganizationById } from '@/services/organization.service';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { quoteItems, productVariants } from '@/db/schema';
import {
  createSimulation,
  updateSimulation,
  deleteSimulation,
} from '@/services/simulation.service';
import {
  sendQuoteToClient,
  pullQuoteBackToDraft,
  rejectQuote,
  initiateContractSigning,
  getOrganizationsForQuoteTarget,
} from '@/services/quote-workflow.service';
import {
  calculateAndPersistLandedCost,
  addSimulationItemAndRecalculate,
  updateSimulationItemAndRecalculate,
  removeSimulationItemAndRecalculate,
} from '@/domain/simulation/services/simulation-domain.service';
import { getSimulationById } from '@/services/simulation.service';
import { getFreightValueForSimulation } from '@/services/admin/international-freights.service';
import { calculateOptimalFreightProfile } from '@/lib/logistics';
import { getDolarPTAX } from '@/lib/fetch-dolar';
import type { ProductSnapshot, ShippingMetadata } from '@/db/types';

export interface GetFreightForSimulationResult {
  value: number;
  usedFallback?: boolean;
  error?: string;
}

export async function getFreightForSimulationAction(
  simulationId: string,
  organizationId: string,
  shippingModality: 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'EXPRESS',
  containerType?: '20GP' | '40NOR' | '40HC',
  containerQuantity?: number,
): Promise<GetFreightForSimulationResult> {
  try {
    const user = await requireAuthOrRedirect();
    const data = await getSimulationById(simulationId, organizationId, user.id);
    if (!data) {
      return { value: 0, error: 'Simulation not found' };
    }

    const totalCbm = Number(data.simulation.totalCbm ?? 0);
    const totalWeightKg = Number(data.simulation.totalWeight ?? 0);

    const result = await getFreightValueForSimulation({
      shippingModality,
      containerType,
      containerQuantity,
      totalCbm,
      totalWeightKg,
    });

    return result;
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    return {
      value: 0,
      error: err instanceof Error ? err.message : 'Failed to get freight',
    };
  }
}

const shippingModalitySchema = z.enum(['AIR', 'SEA_LCL', 'SEA_FCL', 'SEA_FCL_PARTIAL', 'EXPRESS']);

const createSimulationModalitySchema = z.enum(['SEA_LCL', 'AIR', 'EXPRESS']);

const createSimulationSchema = z.object({
  organizationId: z.string().uuid('Invalid organization'),
  name: z.string().min(1, 'Name is required').max(200),
  destinationState: z
    .string()
    .min(1, 'Selecione o estado de destino')
    .max(2, 'UF inválido'),
  shippingModality: createSimulationModalitySchema.default('SEA_LCL'),
});

const addCatalogItemSchema = z.object({
  simulationId: z.string().uuid(),
  organizationId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.coerce.number().int().min(1),
  priceUsd: z.string().min(1, 'Price is required'),
});

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

export interface CreateSimulationState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function createSimulationAction(
  _prevState: CreateSimulationState | null,
  formData: FormData
): Promise<CreateSimulationState> {
  try {
    const user = await requireAuthOrRedirect();

    const rawData = {
      organizationId: formData.get('organizationId') as string,
      name: (formData.get('name') as string)?.trim(),
      destinationState: (formData.get('destinationState') as string)?.trim() || undefined,
      shippingModality: (formData.get('shippingModality') as string)?.trim() || 'SEA_LCL',
    };

    const validated = createSimulationSchema.safeParse(rawData);
    if (!validated.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validated.error.issues) {
        const path = issue.path.map(String).join('.');
        if (path && !fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      return { fieldErrors, error: validated.error.issues[0]?.message };
    }

    const targetDolar = String(await getDolarPTAX());
    const metadata: ShippingMetadata = { destinationState: validated.data.destinationState };

    const created = await createSimulation({
      organizationId: validated.data.organizationId,
      userId: user.id,
      name: validated.data.name,
      targetDolar,
      shippingModality: validated.data.shippingModality,
      metadata,
    });

    if (!created) {
      return { error: 'Failed to create simulation' };
    }

    redirect(`/dashboard/simulations/${created.id}`);
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    return {
      error: err instanceof Error ? err.message : 'Failed to create simulation',
    };
  }
}

const shippingMetadataSchema = z.object({
  equipmentType: z.enum(['20GP', '40NOR', '40HC']).optional(),
  equipmentQuantity: z.number().int().min(1).optional(),
  totalChargeableWeight: z.number().optional(),
  isOverride: z.boolean().optional(),
  totalFreightUsd: z.number().min(0).optional(),
  totalInsuranceUsd: z.number().min(0).optional(),
  capataziaUsd: z.number().min(0).optional(),
  destinationState: z.string().max(2).optional(),
  additionalFreightUsd: z.number().min(0).optional(),
  commissionPercent: z.number().min(0).max(100).optional(),
});

const incotermSchema = z.enum(['EXW', 'FOB', 'CIF', 'DDP']);

const updateSimulationSchema = z
  .object({
    simulationId: z.string().uuid(),
    organizationId: z.string().uuid(),
    name: z.string().min(1).max(200).optional(),
    targetDolar: z.string().nullable().optional(),
    shippingModality: shippingModalitySchema.nullable().optional(),
    incoterm: incotermSchema.optional(),
    metadata: z
      .string()
      .optional()
      .transform((s): ShippingMetadata | undefined => {
        if (!s) return undefined;
        try {
          const parsed = JSON.parse(s) as unknown;
          const result = shippingMetadataSchema.safeParse(parsed);
          return result.success ? (result.data as ShippingMetadata) : undefined;
        } catch {
          return undefined;
        }
      }),
  })
  .superRefine((data, ctx) => {
    if (data.metadata && typeof data.metadata === 'object') {
      const m = data.metadata as ShippingMetadata;
      if (!m.destinationState || m.destinationState.length !== 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selecione o estado de destino',
          path: ['destinationState'],
        });
      }
    }
  });

export interface UpdateSimulationState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function updateSimulationAction(
  _prevState: UpdateSimulationState | null,
  formData: FormData
): Promise<UpdateSimulationState> {
  try {
    const user = await requireAuthOrRedirect();

    const rawData: Record<string, unknown> = {
      simulationId: formData.get('simulationId') as string,
      organizationId: formData.get('organizationId') as string,
      name: (formData.get('name') as string)?.trim(),
      targetDolar: (formData.get('targetDolar') as string)?.trim() || null,
    };
    if (formData.has('shippingModality')) {
      const v = (formData.get('shippingModality') as string)?.trim();
      rawData.shippingModality = v && v !== '__none__' ? v : null;
    }
    if (formData.has('incoterm')) {
      const v = (formData.get('incoterm') as string)?.trim();
      rawData.incoterm = v && v !== '__none__' ? v : undefined;
    }
    if (formData.has('metadata')) {
      rawData.metadata = formData.get('metadata') as string;
    }

    const validated = updateSimulationSchema.safeParse(rawData);
    if (!validated.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validated.error.issues) {
        const path = issue.path.map(String).join('.');
        if (path && !fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      return { fieldErrors, error: validated.error.issues[0]?.message };
    }

    const access = await getOrganizationById(validated.data.organizationId, user.id);
    if (!access) {
      return { error: 'Forbidden' };
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

    let modalityToSave = validated.data.shippingModality;
    let metadataToSave = validated.data.metadata;

    // When user selects Marítimo (SEA_LCL), compute optimal profile from current totals
    if (modalityToSave === 'SEA_LCL') {
      if (simData) {
        let totalCbm: number;
        let totalWeightKg: number;

        if (simData.items.length > 0) {
          totalCbm = simData.items.reduce(
            (s, i) => s + Number(i.cbmSnapshot ?? 0),
            0,
          );
          totalWeightKg = simData.items.reduce(
            (s, i) => s + Number(i.weightSnapshot ?? 0),
            0,
          );
        } else {
          totalCbm = Number(simData.simulation.totalCbm ?? 0);
          totalWeightKg = Number(simData.simulation.totalWeight ?? 0);
        }

        const profile = calculateOptimalFreightProfile(totalCbm, totalWeightKg);
        modalityToSave = profile.suggestedModality;
        metadataToSave = {
          ...(metadataToSave ?? (simData.simulation.metadata as ShippingMetadata) ?? {}),
          ...(profile.suggestedModality === 'SEA_FCL' && profile.equipment
            ? {
                equipmentType: profile.equipment.type,
                equipmentQuantity: profile.equipment.quantity,
              }
            : {}),
        };
        if (profile.suggestedModality !== 'SEA_FCL') {
          const m = metadataToSave as Record<string, unknown>;
          delete m.equipmentType;
          delete m.equipmentQuantity;
        }
      }
    }

    if (
      metadataToSave !== undefined &&
      modalityToSave &&
      ['AIR', 'SEA_LCL', 'SEA_FCL', 'EXPRESS'].includes(modalityToSave)
    ) {
      const simData = await getSimulationById(
        validated.data.simulationId,
        validated.data.organizationId,
        user.id,
      );
      if (simData) {
        const totalCbm = Number(simData.simulation.totalCbm ?? 0);
        const totalWeightKg = Number(simData.simulation.totalWeight ?? 0);
        const freightResult = await getFreightValueForSimulation({
          shippingModality: modalityToSave as 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'EXPRESS',
          containerType: metadataToSave.equipmentType,
          containerQuantity: metadataToSave.equipmentQuantity,
          totalCbm,
          totalWeightKg,
        });

        metadataToSave = {
          ...metadataToSave,
          totalFreightUsd: freightResult.value,
          totalInsuranceUsd: undefined,
          capataziaUsd: undefined,
        };
      }
    }

    const updated = await updateSimulation(
      validated.data.simulationId,
      validated.data.organizationId,
      user.id,
      {
        ...(validated.data.name !== undefined && { name: validated.data.name }),
        ...(validated.data.targetDolar !== undefined && {
          targetDolar: validated.data.targetDolar?.trim() || '0',
        }),
        ...(modalityToSave !== undefined && {
          shippingModality: modalityToSave,
        }),
        ...(validated.data.incoterm !== undefined && { incoterm: validated.data.incoterm }),
        ...(metadataToSave !== undefined && { metadata: metadataToSave }),
      }
    );

    if (!updated) {
      return { error: 'Simulation not found or could not be updated' };
    }

    if (validated.data.metadata !== undefined) {
      // Ensure targetDolar is set before landed cost calc (fetch PTAX if missing/invalid)
      const currentTarget = Number(updated.targetDolar ?? 0);
      if (currentTarget <= 0) {
        try {
          const ptaxStr = (await getDolarPTAX()).toFixed(4);
          await updateSimulation(
            validated.data.simulationId,
            validated.data.organizationId,
            user.id,
            { targetDolar: ptaxStr },
          );
        } catch {
          return { error: 'Não foi possível obter a taxa de câmbio. Tente novamente.' };
        }
      }

      // Recalculate taxes only when there are items; settings can be saved without items
      const [itemCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(quoteItems)
        .where(eq(quoteItems.quoteId, validated.data.simulationId));
      const hasItems = (itemCount?.count ?? 0) > 0;

      if (hasItems) {
        const taxResult = await calculateAndPersistLandedCost(
          validated.data.simulationId,
          validated.data.organizationId,
          user.id,
        );
        if (!taxResult.success) {
          return {
            error: taxResult.errors?.[0] ?? 'Falha ao calcular impostos',
            fieldErrors: taxResult.errors ? { _tax: taxResult.errors.join('; ') } : undefined,
          };
        }
      }
    }

    revalidatePath(`/dashboard/simulations/${validated.data.simulationId}`);
    return {};
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    return {
      error: err instanceof Error ? err.message : 'Failed to update simulation',
    };
  }
}

export interface DeleteSimulationResult {
  success?: boolean;
  error?: string;
}

export async function deleteSimulationAction(
  simulationId: string,
  organizationId: string
): Promise<DeleteSimulationResult> {
  try {
    const user = await requireAuthOrRedirect();

    const access = await getOrganizationById(organizationId, user.id);
    if (!access) {
      return { error: 'Forbidden' };
    }

    const ok = await deleteSimulation(simulationId, organizationId, user.id);
    return ok ? { success: true } : { error: 'Simulation not found or could not be deleted' };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    return {
      error: err instanceof Error ? err.message : 'Failed to delete simulation',
    };
  }
}

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

// ==========================================
// Quote Workflow Actions (Etapas B, C, D)
// ==========================================

export async function getOrganizationsForQuoteTargetAction(
  sellerOrganizationId: string
): Promise<{ id: string; name: string }[]> {
  const user = await requireAuthOrRedirect();
  const access = await getOrganizationById(sellerOrganizationId, user.id);
  if (!access) return [];
  return getOrganizationsForQuoteTarget(sellerOrganizationId);
}


const sendQuoteToClientSchema = z
  .object({
    quoteId: z.string().uuid(),
    organizationId: z.string().uuid(),
    clientOrganizationId: z
      .string()
      .uuid()
      .optional()
      .nullable()
      .transform((s) => (s && s.trim() ? s : null)),
    clientEmail: z
      .string()
      .optional()
      .nullable()
      .transform((s) => (s && s.trim() ? s : null)),
    clientPhone: z
      .string()
      .optional()
      .nullable()
      .transform((s) => (s && s.trim() ? s : null)),
  })
  .refine((d) => d.clientOrganizationId || d.clientEmail, {
    message: 'Informe a organização ou o e-mail do cliente',
  })
  .refine((d) => !d.clientEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.clientEmail), {
    message: 'E-mail inválido',
    path: ['clientEmail'],
  })
  .refine((d) => !d.clientPhone || /^\+?\d[\d\s()-]{7,}$/.test(d.clientPhone), {
    message: 'Telefone inválido',
    path: ['clientPhone'],
  });

export interface SendQuoteToClientResult {
  success?: boolean;
  error?: string;
}

export async function sendQuoteToClientAction(
  _prevState: SendQuoteToClientResult | null,
  formData: FormData
): Promise<SendQuoteToClientResult> {
  try {
    const user = await requireAuthOrRedirect();
    const raw = {
      quoteId: formData.get('quoteId') as string,
      organizationId: formData.get('organizationId') as string,
      clientOrganizationId: (formData.get('clientOrganizationId') as string) || null,
      clientEmail: (formData.get('clientEmail') as string)?.trim() || null,
      clientPhone: (formData.get('clientPhone') as string)?.trim() || null,
    };
    const validated = sendQuoteToClientSchema.safeParse(raw);
    if (!validated.success) return { error: validated.error.issues[0]?.message ?? 'Invalid input' };

    const access = await getOrganizationById(validated.data.organizationId, user.id);
    if (!access) return { error: 'Acesso negado' };

    const result = await sendQuoteToClient({
      quoteId: validated.data.quoteId,
      organizationId: validated.data.organizationId,
      userId: user.id,
      clientOrganizationId: validated.data.clientOrganizationId ?? undefined,
      clientEmail: validated.data.clientEmail ?? undefined,
      clientPhone: validated.data.clientPhone ?? undefined,
    });

    if (!result.success) return { error: result.error };
    revalidatePath(`/dashboard/simulations/${validated.data.quoteId}`);
    return { success: true };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return { error: err instanceof Error ? err.message : 'Falha ao enviar' };
  }
}

export interface PullQuoteBackResult {
  success?: boolean;
  error?: string;
}

export async function pullQuoteBackToDraftAction(
  quoteId: string,
  organizationId: string
): Promise<PullQuoteBackResult> {
  try {
    const user = await requireAuthOrRedirect();
    const access = await getOrganizationById(organizationId, user.id);
    if (!access) return { error: 'Acesso negado' };

    const result = await pullQuoteBackToDraft(quoteId, organizationId, user.id);
    if (!result.success) return { error: result.error };
    revalidatePath(`/dashboard/simulations/${quoteId}`);
    return { success: true };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return { error: err instanceof Error ? err.message : 'Falha ao puxar de volta' };
  }
}

export interface RejectQuoteActionResult {
  success?: boolean;
  error?: string;
}

export async function rejectQuoteAction(
  quoteId: string,
  organizationId: string,
  reason: string
): Promise<RejectQuoteActionResult> {
  try {
    const user = await requireAuthOrRedirect();
    const access = await getOrganizationById(organizationId, user.id);
    if (!access) return { error: 'Acesso negado' };

    const result = await rejectQuote(quoteId, organizationId, user.id, reason);
    if (!result.success) return { error: result.error };
    revalidatePath(`/dashboard/simulations/${quoteId}`);
    return { success: true };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return { error: err instanceof Error ? err.message : 'Falha ao rejeitar' };
  }
}

export interface InitiateContractSigningActionResult {
  success?: boolean;
  signUrl?: string;
  error?: string;
}

export async function initiateContractSigningAction(
  quoteId: string,
  organizationId: string
): Promise<InitiateContractSigningActionResult> {
  try {
    const user = await requireAuthOrRedirect();
    const access = await getOrganizationById(organizationId, user.id);
    if (!access) return { error: 'Acesso negado' };

    const result = await initiateContractSigning(quoteId, organizationId, user.id);
    if (!result.success) return { error: result.error };
    revalidatePath(`/dashboard/simulations/${quoteId}`);
    return { success: true, signUrl: result.signUrl };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return { error: err instanceof Error ? err.message : 'Falha ao iniciar assinatura' };
  }
}
