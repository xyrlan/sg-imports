'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { requireAuthOrRedirect } from '@/services/auth.service';
import { getOrganizationById } from '@/services/organization.service';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { quoteItems } from '@/db/schema';
import {
  createSimulation,
  updateSimulation,
  deleteSimulation,
} from '@/services/simulation.service';
import {
  calculateAndPersistLandedCost,
} from '@/domain/simulation/services/simulation-domain.service';
import { getSimulationById } from '@/services/simulation.service';
import { getFreightValueForSimulation } from '@/services/admin/international-freights.service';
import { calculateOptimalFreightProfile } from '@/lib/logistics';
import { getDolarPTAX } from '@/lib/fetch-dolar';
import type { ShippingMetadata } from '@/db/types';

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
  firstPaymentFobPercent: z.number().min(0).max(100).optional(),
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

// ============================================
// Service Fee Config
// ============================================

export interface UpdateServiceFeeConfigState {
  success?: boolean;
  error?: string;
}

const updateServiceFeeConfigSchema = z.object({
  simulationId: z.string().uuid(),
  organizationId: z.string().uuid(),
  percentage: z.string(),
  minimumValueMultiplier: z.coerce.number().int().min(2).max(4),
  applyToChinaProducts: z.enum(['true', 'false']).transform((v) => v === 'true'),
});

export async function updateServiceFeeConfigAction(
  _prevState: UpdateServiceFeeConfigState | null,
  formData: FormData,
): Promise<UpdateServiceFeeConfigState> {
  const t = await getTranslations('Simulations.errors');
  try {
    const user = await requireAuthOrRedirect();

    const validated = updateServiceFeeConfigSchema.safeParse({
      simulationId: formData.get('simulationId'),
      organizationId: formData.get('organizationId'),
      percentage: formData.get('percentage'),
      minimumValueMultiplier: formData.get('minimumValueMultiplier'),
      applyToChinaProducts: formData.get('applyToChinaProducts'),
    });

    if (!validated.success) {
      return { error: validated.error.issues[0]?.message ?? t('invalidData') };
    }

    const access = await getOrganizationById(validated.data.organizationId, user.id);
    if (!access) {
      return { error: t('forbidden') };
    }

    // NumberField with formatOptions percent uses 0-1 range (0.025 = 2.5%)
    const rawPercentage = parseFloat(validated.data.percentage);
    const parsedPercentage = rawPercentage <= 1 ? rawPercentage * 100 : rawPercentage;
    if (isNaN(parsedPercentage) || parsedPercentage < 0 || parsedPercentage > 100) {
      return { error: t('invalidPercentage') };
    }

    const { getOrCreateServiceFeeConfig, updateServiceFeeConfig } = await import('@/services/config.service');

    // Ensure config exists
    await getOrCreateServiceFeeConfig(validated.data.simulationId);

    await updateServiceFeeConfig(validated.data.simulationId, {
      percentage: parsedPercentage.toFixed(2),
      minimumValueMultiplier: validated.data.minimumValueMultiplier,
      applyToChinaProducts: validated.data.applyToChinaProducts,
    });

    // Recalculate landed cost (includes service fee) if items exist
    const [itemCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(quoteItems)
      .where(eq(quoteItems.quoteId, validated.data.simulationId));

    if ((itemCount?.count ?? 0) > 0) {
      await calculateAndPersistLandedCost(
        validated.data.simulationId,
        validated.data.organizationId,
        user.id,
      );
    }

    revalidatePath(`/dashboard/simulations/${validated.data.simulationId}`);
    return { success: true };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return { error: err instanceof Error ? err.message : t('feeUpdateFailed') };
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
