'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAuthOrRedirect } from '@/services/auth.service';
import { getOrganizationById } from '@/services/organization.service';
import {
  createSimulation,
  deleteSimulation,
  addSimulationItem,
  removeSimulationItem,
  updateSimulationItem,
} from '@/services/simulation.service';
import type { ProductSnapshot } from '@/db/types';

const createSimulationSchema = z.object({
  organizationId: z.string().uuid('Invalid organization'),
  name: z.string().min(1, 'Name is required').max(200),
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
  boxQuantity: z.coerce.number().min(0.001),
  boxWeight: z.coerce.number().min(0),
  netWeight: z.coerce.number().optional(),
  unitWeight: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  width: z.coerce.number().optional(),
  length: z.coerce.number().optional(),
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
  updates: { quantity?: number; priceUsd?: string }
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

    const updated = await updateSimulationItem(
      validated.data.itemId,
      validated.data.organizationId,
      user.id,
      {
        quantity: validated.data.quantity,
        priceUsd: validated.data.priceUsd,
      }
    );

    return updated ? { success: true } : { error: 'Failed to update item' };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    return {
      error: err instanceof Error ? err.message : 'Failed to update item',
    };
  }
}
