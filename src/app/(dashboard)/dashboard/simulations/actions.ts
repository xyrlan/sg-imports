'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAuthOrRedirect } from '@/services/auth.service';
import { getOrganizationById } from '@/services/organization.service';
import {
  createSimulation,
  updateSimulation,
  deleteSimulation,
  addSimulationItem,
  removeSimulationItem,
  updateSimulationItem,
} from '@/services/simulation.service';
import type { ProductSnapshot, ShippingMetadata } from '@/db/types';

const shippingModalitySchema = z.enum(['AIR', 'SEA_LCL', 'SEA_FCL', 'SEA_FCL_PARTIAL', 'EXPRESS']);

const createSimulationSchema = z.object({
  organizationId: z.string().uuid('Invalid organization'),
  name: z.string().min(1, 'Name is required').max(200),
  shippingModality: shippingModalitySchema.optional(),
  exchangeRateIof: z.string().optional(),
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
      shippingModality: formData.get('shippingModality') as string | undefined,
      exchangeRateIof: (formData.get('exchangeRateIof') as string)?.trim(),
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

    const created = await createSimulation({
      organizationId: validated.data.organizationId,
      userId: user.id,
      name: validated.data.name,
      shippingModality: validated.data.shippingModality ?? null,
      exchangeRateIof: validated.data.exchangeRateIof?.trim() || null,
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
});

const updateSimulationSchema = z.object({
  simulationId: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  shippingModality: shippingModalitySchema.nullable().optional(),
  exchangeRateIof: z.string().nullable().optional(),
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
      exchangeRateIof: (formData.get('exchangeRateIof') as string)?.trim() || null,
    };
    if (formData.has('shippingModality')) {
      const v = (formData.get('shippingModality') as string)?.trim();
      rawData.shippingModality = v && v !== '__none__' ? v : null;
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

    const updated = await updateSimulation(
      validated.data.simulationId,
      validated.data.organizationId,
      user.id,
      {
        ...(validated.data.name !== undefined && { name: validated.data.name }),
        ...(validated.data.shippingModality !== undefined && {
          shippingModality: validated.data.shippingModality,
        }),
        ...(validated.data.exchangeRateIof !== undefined && {
          exchangeRateIof: validated.data.exchangeRateIof,
        }),
        ...(validated.data.metadata !== undefined && { metadata: validated.data.metadata }),
      }
    );

    if (!updated) {
      return { error: 'Simulation not found or could not be updated' };
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

    const added = await addSimulationItem(
      validated.data.simulationId,
      validated.data.organizationId,
      user.id,
      {
        variantId: validated.data.variantId,
        quantity: validated.data.quantity,
        priceUsd: validated.data.priceUsd,
      }
    );

    return added ? { success: true } : { error: 'Failed to add item' };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    return {
      error: err instanceof Error ? err.message : 'Failed to add item',
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

    const added = await addSimulationItem(
      validated.data.simulationId,
      validated.data.organizationId,
      user.id,
      {
        simulatedProductSnapshot: validated.data.simulatedProductSnapshot,
        quantity: validated.data.quantity,
        priceUsd: validated.data.priceUsd,
      }
    );

    return added ? { success: true } : { error: 'Failed to add item' };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    return {
      error: err instanceof Error ? err.message : 'Failed to add item',
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

    const ok = await removeSimulationItem(
      validated.data.itemId,
      validated.data.organizationId,
      user.id
    );

    return ok ? { success: true } : { error: 'Failed to remove item' };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    return {
      error: err instanceof Error ? err.message : 'Failed to remove item',
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

    const updated = await updateSimulationItem(
      validated.data.itemId,
      validated.data.organizationId,
      user.id,
      updatePayload
    );

    if (updated) {
      revalidatePath(`/dashboard/simulations/${updated.quoteId}`);
      return { success: true };
    }
    return { error: 'Failed to update item' };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    return {
      error: err instanceof Error ? err.message : 'Failed to update item',
    };
  }
}
