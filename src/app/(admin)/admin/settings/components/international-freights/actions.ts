'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { internationalFreights } from '@/db/schema';
import {
  withAuditTransaction,
  createInternationalFreight,
  getInternationalFreightByCarrierAndContainer,
  getInternationalFreightByCarrier,
  getInternationalFreightById,
  updateInternationalFreight,
  deleteInternationalFreight,
  getCarrierById,
} from '@/services/admin';
import { toPlainObject } from '../../action-utils';

const SHIPPING_MODALITIES = ['AIR', 'SEA_LCL', 'SEA_FCL', 'EXPRESS'] as const;
const CONTAINER_TYPES = ['GP_20', 'GP_40', 'HC_40', 'RF_20', 'RF_40'] as const;
const CURRENCIES = ['BRL', 'USD', 'CNY', 'EUR'] as const;

const internationalFreightBaseSchema = z.object({
  shippingModality: z.enum(SHIPPING_MODALITIES),
  carrierId: z.string().uuid().nullable().optional(),
  containerType: z.enum(CONTAINER_TYPES).nullable().optional(),
  value: z.string().min(1).refine((v) => !Number.isNaN(parseFloat(v)), 'Valor inválido'),
  currency: z.enum(CURRENCIES).default('USD'),
  freeTimeDays: z.coerce.number().int().min(0).default(0),
  expectedProfit: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === '' || v == null ? null : v))
    .refine((v) => v === null || !Number.isNaN(parseFloat(v!)), 'Lucro inválido'),
  validTo: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v === '' || v == null ? null : v))
    .refine((v) => v === null || !Number.isNaN(Date.parse(v!)), 'Data inválida'),
  portOfLoadingIds: z.array(z.string().uuid()).min(1, 'Pelo menos um porto de origem'),
  portOfDischargeIds: z.array(z.string().uuid()).min(1, 'Pelo menos um porto de destino'),
});

const createInternationalFreightSchema = internationalFreightBaseSchema.superRefine((data, ctx) => {
  if (data.shippingModality === 'SEA_FCL' || data.shippingModality === 'AIR') {
    if (!data.carrierId || data.carrierId.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Armador é obrigatório para esta modalidade',
        path: ['carrierId'],
      });
    }
  }
  if (data.shippingModality === 'SEA_FCL') {
    if (!data.containerType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Tipo de container é obrigatório para FCL',
        path: ['containerType'],
      });
    }
  }
});

const updateInternationalFreightSchema = internationalFreightBaseSchema.partial();

function getDbErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const e = err as { code?: string; detail?: string; message?: string };
    if (e.code === '23503') {
      return 'Transportadora não encontrada. Verifique se a transportadora ainda existe.';
    }
    if (e.code === '23505') {
      return 'Já existe um frete com essas configurações.';
    }
    if (e.detail) return e.detail;
    if (e.message) return e.message;
  }
  return 'Erro ao criar frete internacional';
}

export async function createInternationalFreightAction(data: unknown) {
  try {
    const parsed = createInternationalFreightSchema.safeParse(data);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues.map((e) => e.message).join(', ') || 'Dados inválidos',
      };
    }
    const p = parsed.data;

    const carrierId = p.shippingModality === 'SEA_FCL' || p.shippingModality === 'AIR'
      ? (p.carrierId ?? '')
      : null;
    const containerType = p.shippingModality === 'SEA_FCL' ? (p.containerType ?? null) : null;

    if (carrierId) {
      const carrier = await getCarrierById(carrierId);
      if (!carrier) {
        return {
          ok: false,
          error: 'Transportadora não encontrada. Selecione uma transportadora válida.',
        };
      }
    }

    if (p.shippingModality === 'SEA_FCL' && carrierId && containerType) {
      const existing = await getInternationalFreightByCarrierAndContainer(
        carrierId,
        containerType,
      );
      if (existing) {
        return {
          ok: false,
          error: 'validationDuplicateCarrierContainer',
        };
      }
    }

    if (p.shippingModality === 'AIR' && carrierId) {
      const existing = await getInternationalFreightByCarrier(carrierId);
      if (existing) {
        return {
          ok: false,
          error: 'validationDuplicateCarrierContainer',
        };
      }
    }

    const freightData = {
      shippingModality: p.shippingModality,
      carrierId,
      containerType,
      value: p.value,
      currency: p.currency,
      freeTimeDays: p.freeTimeDays,
      expectedProfit: p.expectedProfit ?? null,
      validTo: p.validTo ? new Date(p.validTo) : null,
      portOfLoadingIds: p.portOfLoadingIds,
      portOfDischargeIds: p.portOfDischargeIds,
    };

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const created = await createInternationalFreight(freightData, tx);
      await recordAudit({
        tableName: 'international_freights',
        entityId: created.id,
        action: 'CREATE',
        newValues: toPlainObject(created),
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: getDbErrorMessage(err),
    };
  }
}

export async function updateInternationalFreightAction(id: string, data: unknown) {
  try {
    const parsed = updateInternationalFreightSchema.safeParse(data);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues.map((e) => e.message).join(', ') || 'Dados inválidos',
      };
    }
    const p = parsed.data;

    const oldRow = await getInternationalFreightById(id);
    if (!oldRow) {
      return {
        ok: false,
        error: 'Frete internacional não encontrado.',
      };
    }

    const finalModality = p.shippingModality ?? oldRow.shippingModality;
    const finalCarrierId = p.carrierId !== undefined ? p.carrierId : oldRow.carrierId;
    const finalContainerType = p.containerType !== undefined ? p.containerType : oldRow.containerType;

    if (finalModality === 'SEA_FCL' || finalModality === 'AIR') {
      if (finalCarrierId) {
        const carrier = await getCarrierById(finalCarrierId);
        if (!carrier) {
          return {
            ok: false,
            error: 'Transportadora não encontrada. Selecione uma transportadora válida.',
          };
        }
      }
    }

    const carrierOrContainerChanged =
      p.carrierId !== undefined || p.containerType !== undefined;

    if (finalModality === 'SEA_FCL' && carrierOrContainerChanged && finalCarrierId && finalContainerType) {
      const existing = await getInternationalFreightByCarrierAndContainer(
        finalCarrierId,
        finalContainerType,
        id,
      );
      if (existing) {
        return {
          ok: false,
          error: 'validationDuplicateCarrierContainer',
        };
      }
    }

    if (finalModality === 'AIR' && carrierOrContainerChanged && finalCarrierId) {
      const existing = await getInternationalFreightByCarrier(finalCarrierId, id);
      if (existing) {
        return {
          ok: false,
          error: 'validationDuplicateCarrierContainer',
        };
      }
    }

    const updateData: Record<string, unknown> = {
      ...(p.carrierId !== undefined && { carrierId: p.carrierId ?? null }),
      ...(p.containerType !== undefined && { containerType: p.containerType ?? null }),
      ...(p.value && { value: p.value }),
      ...(p.currency && { currency: p.currency }),
      ...(p.freeTimeDays !== undefined && { freeTimeDays: p.freeTimeDays }),
      ...(p.expectedProfit !== undefined && { expectedProfit: p.expectedProfit }),
      ...(p.validTo !== undefined && {
        validTo: p.validTo ? new Date(p.validTo) : null,
      }),
      ...(p.portOfLoadingIds && { portOfLoadingIds: p.portOfLoadingIds }),
      ...(p.portOfDischargeIds && { portOfDischargeIds: p.portOfDischargeIds }),
    };
    if (p.shippingModality !== undefined) {
      updateData.shippingModality = p.shippingModality;
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const [oldRow] = await tx
        .select()
        .from(internationalFreights)
        .where(eq(internationalFreights.id, id));
      if (!oldRow) throw new Error('Frete internacional não encontrado');

      const updated = await updateInternationalFreight(id, updateData, tx);
      await recordAudit({
        tableName: 'international_freights',
        entityId: id,
        action: 'UPDATE',
        oldValues: toPlainObject(oldRow),
        newValues: updated ? toPlainObject(updated) : { ...toPlainObject(oldRow), ...updateData },
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: getDbErrorMessage(err),
    };
  }
}

export async function deleteInternationalFreightAction(id: string) {
  try {
    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const [oldRow] = await tx
        .select()
        .from(internationalFreights)
        .where(eq(internationalFreights.id, id));
      if (!oldRow) throw new Error('Frete internacional não encontrado');

      await deleteInternationalFreight(id, tx);
      await recordAudit({
        tableName: 'international_freights',
        entityId: id,
        action: 'DELETE',
        oldValues: toPlainObject(oldRow),
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro ao excluir frete internacional',
    };
  }
}
