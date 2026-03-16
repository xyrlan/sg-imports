'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSuperAdmin } from '@/services/auth.service';
import {
  withAuditTransaction,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  resolveEffectivePricing,
  getCarrierById,
  getPortById,
} from '@/services/admin';
import { toPlainObject } from '../../action-utils';

const PRICING_CONTAINER_TYPES = ['GP_20', 'GP_40', 'HC_40', 'RF_20', 'RF_40'] as const;
const PRICING_SCOPES = ['CARRIER', 'PORT', 'SPECIFIC'] as const;
const PORT_DIRECTIONS = ['ORIGIN', 'DESTINATION', 'BOTH'] as const;
const PRICING_CURRENCIES = ['BRL', 'USD', 'CNY'] as const;
const PRICING_BASIS = ['PER_BL', 'PER_CONTAINER'] as const;

const pricingItemSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  amount: z.union([z.number().positive(), z.string().refine((v) => !Number.isNaN(parseFloat(v)) && parseFloat(v) > 0, 'Valor deve ser positivo')]).transform((v) => (typeof v === 'string' ? parseFloat(v) : v)),
  currency: z.enum(PRICING_CURRENCIES),
  basis: z.enum(PRICING_BASIS),
});

const createPricingRuleSchema = z
  .object({
    scope: z.enum(PRICING_SCOPES),
    carrierId: z.string().uuid('Transportadora é obrigatória'),
    portId: z.string().uuid().optional().nullable().transform((v) => (v === '' ? undefined : v)),
    containerType: z
      .string()
      .optional()
      .nullable()
      .transform((v) => (v === '' || v == null ? undefined : v as (typeof PRICING_CONTAINER_TYPES)[number])),
    portDirection: z.enum(PORT_DIRECTIONS).optional().default('BOTH'),
    validFrom: z.string().min(1, 'Data inicial é obrigatória').transform((v) => new Date(v)),
    validTo: z.string().optional().nullable().transform((v) => (v && v !== '' ? new Date(v) : null)),
    items: z.array(pricingItemSchema).min(1, 'Pelo menos um item é obrigatório'),
  })
  .refine(
    (data) => {
      if (data.scope === 'CARRIER') return !data.portId && !data.containerType;
      if (data.scope === 'PORT') return !!data.portId && !data.containerType;
      if (data.scope === 'SPECIFIC') return !!data.portId && !!data.containerType;
      return false;
    },
    { message: 'Configuração de escopo inválida. CARRIER: sem porto/container. PORT: porto obrigatório. SPECIFIC: porto e container obrigatórios.', path: ['scope'] }
  );

const updatePricingRuleSchema = z.object({
  portDirection: z.enum(PORT_DIRECTIONS).optional(),
  validFrom: z.string().transform((v) => new Date(v)).optional(),
  validTo: z.string().optional().nullable().transform((v) => (v && v !== '' ? new Date(v) : null)),
  items: z.array(pricingItemSchema).min(1, 'Pelo menos um item é obrigatório').optional(),
});

export async function createPricingRuleAction(data: unknown) {
  try {
    const parsed = createPricingRuleSchema.safeParse(data);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues.map((e) => e.message).join(', ') || 'Dados inválidos',
      };
    }
    const p = parsed.data;

    const carrier = await getCarrierById(p.carrierId);
    if (!carrier) {
      return { ok: false, error: 'Transportadora não encontrada. Selecione uma transportadora válida.' };
    }

    if (p.portId) {
      const port = await getPortById(p.portId);
      if (!port) {
        return { ok: false, error: 'Porto não encontrado.' };
      }
    }

    const ruleData = {
      scope: p.scope,
      carrierId: p.carrierId,
      portId: p.portId ?? null,
      containerType: p.containerType ?? null,
      portDirection: (p.scope === 'PORT' || p.scope === 'SPECIFIC') ? (p.portDirection ?? 'BOTH') : 'BOTH',
      validFrom: p.validFrom,
      validTo: p.validTo ?? null,
      items: p.items.map((item) => ({
        name: item.name,
        amount: item.amount,
        currency: item.currency,
        basis: item.basis,
      })),
    };

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const created = await createPricingRule(ruleData, tx);
      await recordAudit({
        tableName: 'pricing_rules',
        entityId: created.id,
        action: 'CREATE',
        newValues: toPlainObject(created),
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch (err) {
    const e = err as { code?: string; message?: string; detail?: string };
    if (e.code === '23514') {
      return { ok: false, error: 'Configuração de escopo inválida. Verifique porto e container.' };
    }
    return {
      ok: false,
      error: e.message ?? 'Erro ao criar regra de preço',
    };
  }
}

export async function updatePricingRuleAction(id: string, data: unknown) {
  try {
    const parsed = updatePricingRuleSchema.safeParse(data);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues.map((e) => e.message).join(', ') || 'Dados inválidos',
      };
    }
    const p = parsed.data;

    const updateData = {
      ...(p.portDirection !== undefined && { portDirection: p.portDirection }),
      ...(p.validFrom !== undefined && { validFrom: p.validFrom }),
      ...(p.validTo !== undefined && { validTo: p.validTo }),
      ...(p.items !== undefined && {
        items: p.items.map((item) => ({
          name: item.name,
          amount: item.amount,
          currency: item.currency,
          basis: item.basis,
        })),
      }),
    };

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.pricingRules.findFirst({
        where: (r, { eq }) => eq(r.id, id),
      });
      if (!oldData) throw new Error('Regra de preço não encontrada.');

      const updated = await updatePricingRule(id, updateData, tx);
      await recordAudit({
        tableName: 'pricing_rules',
        entityId: id,
        action: 'UPDATE',
        oldValues: toPlainObject(oldData),
        newValues: updated ? toPlainObject(updated) : { ...toPlainObject(oldData), ...updateData },
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro ao atualizar regra de preço',
    };
  }
}

export async function deletePricingRuleAction(id: string) {
  try {
    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.pricingRules.findFirst({
        where: (r, { eq }) => eq(r.id, id),
      });
      if (!oldData) throw new Error('Regra de preço não encontrada.');

      const deleted = await deletePricingRule(id, tx);
      if (!deleted) throw new Error('Regra de preço não encontrada.');

      await recordAudit({
        tableName: 'pricing_rules',
        entityId: id,
        action: 'DELETE',
        oldValues: toPlainObject(oldData),
      });
    });
    revalidatePath('/admin/settings', 'layout');
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro ao excluir regra de preço',
    };
  }
}

export async function resolveEffectivePricingAction(
  carrierId: string,
  portId: string,
  containerType: 'GP_20' | 'GP_40' | 'HC_40' | 'RF_20' | 'RF_40',
  direction: 'ORIGIN' | 'DESTINATION' | 'BOTH'
) {
  try {
    await requireSuperAdmin();
    const result = await resolveEffectivePricing(carrierId, portId, containerType, direction);
    return { ok: true, ...result };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro ao resolver taxas efetivas',
      effectiveFees: [],
      carrierRule: null,
      portRule: null,
      specificRule: null,
    };
  }
}
