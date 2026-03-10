'use server';

import { revalidatePath } from 'next/cache';
import { requireSuperAdmin } from '@/services/auth.service';
import {
  withAuditTransaction,
  getAuditLogsPaginated,
  upsertGlobalServiceFeeConfig,
  getGlobalServiceFeeConfig,
  upsertStateIcmsRates,
  getStateIcmsRates,
  getSiscomexFeeConfig,
  upsertSiscomexFeeConfig,
  getGlobalPlatformRates,
  upsertGlobalPlatformRate,
  createTerminal,
  updateTerminal,
  deleteTerminal,
  createPort,
  updatePort,
  deletePort,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  createSubSupplier,
  updateSubSupplier,
  deleteSubSupplier,
  syncCarriersFromShipsGo,
  getCarriersPaginated,
  getCarrierById,
  createCurrencyExchangeBroker,
  updateCurrencyExchangeBroker,
  deleteCurrencyExchangeBroker,
  createInternationalFreight,
  getInternationalFreightByCarrierAndContainer,
  getInternationalFreightByCarrier,
  getInternationalFreightById,
  updateInternationalFreight,
  deleteInternationalFreight,
  createPricingRule,
  updatePricingRule,
  deletePricingRule,
  resolveEffectivePricing,
  getPortById,
} from '@/services/admin';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { internationalFreights } from '@/db/schema';
import { RATE_TYPES } from './constants';

function toPlainObject<T>(obj: T): Record<string, unknown> {
  return JSON.parse(JSON.stringify(obj ?? {})) as Record<string, unknown>;
}

const honorariosSchema = z.object({
  minimumWageBrl: z.string().min(1),
  defaultMultiplier: z.coerce.number().min(2).max(4),
  defaultPercentage: z.string().min(1),
  defaultApplyToChina: z.coerce.boolean(),
});

export async function updateHonorariosAction(prev: unknown, formData: FormData) {
  try {
    const rawPct = formData.get('defaultPercentage');
    const pctNum = rawPct != null ? parseFloat(String(rawPct).replace(',', '.')) : NaN;
    const defaultPercentage = !Number.isNaN(pctNum) && pctNum <= 1
      ? String(pctNum * 100)
      : rawPct != null ? String(rawPct) : undefined;

    const parsed = honorariosSchema.safeParse({
      minimumWageBrl: (formData.get('minimumWageBrl') ?? '').toString().replace(',', '.'),
      defaultMultiplier: formData.get('defaultMultiplier'),
      defaultPercentage: defaultPercentage ?? '2.5',
      defaultApplyToChina: formData.get('defaultApplyToChina') === 'true',
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldConfig = await getGlobalServiceFeeConfig(tx);
      const result = await upsertGlobalServiceFeeConfig(parsed.data, tx);
      await recordAudit({
        tableName: 'global_service_fee_config',
        entityId: result.id,
        action: oldConfig ? 'UPDATE' : 'CREATE',
        oldValues: oldConfig ? toPlainObject(oldConfig) : undefined,
        newValues: toPlainObject(result),
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao salvar', ok: false };
  }
}

const stateIcmsSchema = z.object({
  state: z.string().length(2),
  difal: z.enum(['INSIDE', 'OUTSIDE']),
  icmsRate: z.string().min(1),
});

export async function updateStateIcmsAction(prev: unknown, formData: FormData) {
  try {
    const rates: { state: string; difal: 'INSIDE' | 'OUTSIDE'; icmsRate: string }[] = [];
    const keys = formData.keys();
    for (const key of keys) {
      if (key.startsWith('icms_')) {
        const [state, difal] = key.replace('icms_', '').split('_');
        const val = formData.get(key);
        if (state && difal && val !== null && val !== '') {
          const num = parseFloat(String(val));
          const icmsRate = !Number.isNaN(num) && num > 0 && num <= 1
            ? (num * 100).toFixed(2)
            : String(val);
          rates.push({ state, difal: difal as 'INSIDE' | 'OUTSIDE', icmsRate });
        }
      }
    }
    if (rates.length > 0) {
      await withAuditTransaction(async ({ tx, recordAudit }) => {
        const oldRates = await getStateIcmsRates(tx);
        await upsertStateIcmsRates(rates, tx);
        await recordAudit({
          tableName: 'state_icms_rates',
          entityId: 'batch',
          action: 'UPDATE',
          oldValues: { rates: oldRates.map(toPlainObject) },
          newValues: { rates },
        });
      });
    }
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao salvar', ok: false };
  }
}

const siscomexSchema = z.object({
  registrationValue: z.string().min(1),
  additions11To20: z.string().optional(),
  additions21To50: z.string().optional(),
  additions51AndAbove: z.string().optional(),
});

function parseAdditions(arr: string[]): string[] {
  return arr
    .map((x) => x.trim().replace(',', '.'))
    .filter((x) => x !== '' && !Number.isNaN(parseFloat(x)));
}

export async function updateSiscomexFeeAction(prev: unknown, formData: FormData) {
  try {
    const parsed = siscomexSchema.safeParse({
      registrationValue: formData.get('registrationValue'),
      additions11To20: formData.get('additions11To20'),
      additions21To50: formData.get('additions21To50'),
      additions51AndAbove: formData.get('additions51AndAbove'),
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }
    const additionsRaw = formData.getAll('additions') as string[];
    const parseDecimal = (s: string | undefined) =>
      s ? s.trim().replace(',', '.') : undefined;
    const payload = {
      registrationValue: parsed.data.registrationValue.replace(',', '.'),
      additions: parseAdditions(additionsRaw),
      additions11To20: parseDecimal(parsed.data.additions11To20),
      additions21To50: parseDecimal(parsed.data.additions21To50),
      additions51AndAbove: parseDecimal(parsed.data.additions51AndAbove),
    };

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldConfig = await getSiscomexFeeConfig(tx);
      const result = await upsertSiscomexFeeConfig(payload, tx);
      await recordAudit({
        tableName: 'siscomex_fee_config',
        entityId: result.id,
        action: oldConfig ? 'UPDATE' : 'CREATE',
        oldValues: oldConfig ? toPlainObject(oldConfig) : undefined,
        newValues: toPlainObject(result),
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao salvar', ok: false };
  }
}

function parsePlatformRateValue(
  rawValue: FormDataEntryValue | null,
  unit: string,
): string | undefined {
  if (rawValue == null || rawValue === '') return undefined;
  const num = parseFloat(String(rawValue).replace(',', '.'));
  if (Number.isNaN(num)) return undefined;
  return unit === 'PERCENT' ? String(num * 100) : String(num);
}

export async function updateAllPlatformRatesAction(prev: unknown, formData: FormData) {
  try {
    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldRates = await getGlobalPlatformRates(tx);
      const ratesDiff: { rateType: string; oldValue: string; newValue: string; unit: string }[] = [];

      for (const rateType of RATE_TYPES) {
        const rawValue = formData.get(`rate_${rateType}_value`);
        const unit = (formData.get(`rate_${rateType}_unit`) ?? 'PERCENT') as string;
        const value = parsePlatformRateValue(rawValue, unit) ?? '0';

        const oldRate = oldRates.find((r) => r.rateType === rateType);
        const oldVal = oldRate?.value?.toString() ?? '0';

        await upsertGlobalPlatformRate(
          { rateType, value, unit: unit || undefined },
          tx,
        );
        ratesDiff.push({
          rateType,
          oldValue: oldVal,
          newValue: value,
          unit,
        });
      }

      await recordAudit({
        tableName: 'global_platform_rates',
        entityId: 'batch_update',
        action: 'UPDATE',
        newValues: { rates: ratesDiff },
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao salvar', ok: false };
  }
}

const terminalSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
});

export async function createTerminalAction(prev: unknown, formData: FormData) {
  try {
    const parsed = terminalSchema.safeParse({
      name: formData.get('name'),
      code: formData.get('code') || undefined,
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const created = await createTerminal(parsed.data, tx);
      await recordAudit({
        tableName: 'terminals',
        entityId: created.id,
        action: 'CREATE',
        newValues: toPlainObject(created),
      });
    });
    revalidatePath('/admin/settings');
    revalidatePath('/admin/settings/terminals');
    return { ok: true };
  } catch {
    return { error: 'Erro ao criar', ok: false };
  }
}

export async function updateTerminalAction(
  id: string,
  prev: unknown,
  formData: FormData,
) {
  try {
    const parsed = terminalSchema.safeParse({
      name: formData.get('name'),
      code: formData.get('code') || undefined,
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.terminals.findFirst({
        where: (t, { eq }) => eq(t.id, id),
      });
      if (!oldData) throw new Error('Terminal não encontrado');

      await updateTerminal(id, parsed.data, tx);
      await recordAudit({
        tableName: 'terminals',
        entityId: id,
        action: 'UPDATE',
        oldValues: toPlainObject(oldData),
        newValues: parsed.data,
      });
    });
    revalidatePath('/admin/settings');
    revalidatePath('/admin/settings/terminals');
    revalidatePath(`/admin/settings/terminals/${id}`);
    return { ok: true };
  } catch {
    return { error: 'Erro ao atualizar', ok: false };
  }
}

export async function deleteTerminalAction(id: string) {
  try {
    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.terminals.findFirst({
        where: (t, { eq }) => eq(t.id, id),
      });
      if (!oldData) throw new Error('Terminal não encontrado');

      await deleteTerminal(id, tx);
      await recordAudit({
        tableName: 'terminals',
        entityId: id,
        action: 'DELETE',
        oldValues: toPlainObject(oldData),
      });
    });
    revalidatePath('/admin/settings');
    revalidatePath('/admin/settings/terminals');
    return { ok: true };
  } catch {
    return { error: 'Erro ao excluir', ok: false };
  }
}

// ============================================
// Ports
// ============================================

const portSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  country: z.string().min(1),
  type: z.enum(['PORT', 'AIRPORT']).default('PORT'),
});

export async function createPortAction(prev: unknown, formData: FormData) {
  try {
    const parsed = portSchema.safeParse({
      name: formData.get('name'),
      code: formData.get('code'),
      country: formData.get('country'),
      type: formData.get('type') || 'PORT',
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const created = await createPort(parsed.data, tx);
      await recordAudit({
        tableName: 'ports',
        entityId: created.id,
        action: 'CREATE',
        newValues: toPlainObject(created),
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao criar', ok: false };
  }
}

export async function updatePortAction(
  id: string,
  prev: unknown,
  formData: FormData,
) {
  try {
    const parsed = portSchema.safeParse({
      name: formData.get('name'),
      code: formData.get('code'),
      country: formData.get('country'),
      type: formData.get('type') || 'PORT',
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.ports.findFirst({
        where: (p, { eq }) => eq(p.id, id),
      });
      if (!oldData) throw new Error('Porto não encontrado');

      await updatePort(id, parsed.data, tx);
      await recordAudit({
        tableName: 'ports',
        entityId: id,
        action: 'UPDATE',
        oldValues: toPlainObject(oldData),
        newValues: parsed.data,
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao atualizar', ok: false };
  }
}

export async function deletePortAction(id: string) {
  try {
    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.ports.findFirst({
        where: (p, { eq }) => eq(p.id, id),
      });
      if (!oldData) throw new Error('Porto não encontrado');

      await deletePort(id, tx);
      await recordAudit({
        tableName: 'ports',
        entityId: id,
        action: 'DELETE',
        oldValues: toPlainObject(oldData),
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao excluir', ok: false };
  }
}

// ============================================
// Suppliers
// ============================================

const supplierSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  taxId: z.string().optional(),
  countryCode: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  siscomexId: z.string().optional(),
});

export async function createSupplierAction(prev: unknown, formData: FormData) {
  try {
    const parsed = supplierSchema.safeParse({
      organizationId: formData.get('organizationId'),
      name: formData.get('name'),
      taxId: formData.get('taxId') || undefined,
      countryCode: formData.get('countryCode') || undefined,
      email: formData.get('email') || undefined,
      address: formData.get('address') || undefined,
      siscomexId: formData.get('siscomexId') || undefined,
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const created = await createSupplier(
        {
          ...parsed.data,
          taxId: parsed.data.taxId || null,
          countryCode: parsed.data.countryCode || null,
          email: parsed.data.email || null,
          address: parsed.data.address || null,
          siscomexId: parsed.data.siscomexId || null,
        },
        tx,
      );
      await recordAudit({
        tableName: 'suppliers',
        entityId: created.id,
        action: 'CREATE',
        newValues: toPlainObject(created),
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao criar', ok: false };
  }
}

export async function updateSupplierAction(
  id: string,
  prev: unknown,
  formData: FormData,
) {
  try {
    const parsed = z
      .object({
        name: z.string().min(1),
        taxId: z.string().optional(),
        countryCode: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        siscomexId: z.string().optional(),
      })
      .safeParse({
        name: formData.get('name'),
        taxId: formData.get('taxId') || undefined,
        countryCode: formData.get('countryCode') || undefined,
        email: formData.get('email') || undefined,
        address: formData.get('address') || undefined,
        siscomexId: formData.get('siscomexId') || undefined,
      });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.suppliers.findFirst({
        where: (s, { eq }) => eq(s.id, id),
      });
      if (!oldData) throw new Error('Fornecedor não encontrado');

      await updateSupplier(
        id,
        {
          ...parsed.data,
          taxId: parsed.data.taxId ?? null,
          countryCode: parsed.data.countryCode ?? null,
          email: parsed.data.email ?? null,
          address: parsed.data.address ?? null,
          siscomexId: parsed.data.siscomexId ?? null,
        },
        tx,
      );
      await recordAudit({
        tableName: 'suppliers',
        entityId: id,
        action: 'UPDATE',
        oldValues: toPlainObject(oldData),
        newValues: parsed.data,
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao atualizar', ok: false };
  }
}

export async function deleteSupplierAction(id: string) {
  try {
    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.suppliers.findFirst({
        where: (s, { eq }) => eq(s.id, id),
      });
      if (!oldData) throw new Error('Fornecedor não encontrado');

      await deleteSupplier(id, tx);
      await recordAudit({
        tableName: 'suppliers',
        entityId: id,
        action: 'DELETE',
        oldValues: toPlainObject(oldData),
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao excluir', ok: false };
  }
}

// ============================================
// Sub-suppliers
// ============================================

const subSupplierSchema = z.object({
  supplierId: z.string().uuid(),
  name: z.string().min(1),
  taxId: z.string().optional(),
  countryCode: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  siscomexId: z.string().optional(),
});

export async function createSubSupplierAction(prev: unknown, formData: FormData) {
  try {
    const parsed = subSupplierSchema.safeParse({
      supplierId: formData.get('supplierId'),
      name: formData.get('name'),
      taxId: formData.get('taxId') || undefined,
      countryCode: formData.get('countryCode') || undefined,
      email: formData.get('email') || undefined,
      address: formData.get('address') || undefined,
      siscomexId: formData.get('siscomexId') || undefined,
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const created = await createSubSupplier(
        {
          ...parsed.data,
          taxId: parsed.data.taxId || null,
          countryCode: parsed.data.countryCode || null,
          email: parsed.data.email || null,
          address: parsed.data.address || null,
          siscomexId: parsed.data.siscomexId || null,
        },
        tx,
      );
      await recordAudit({
        tableName: 'sub_suppliers',
        entityId: created.id,
        action: 'CREATE',
        newValues: toPlainObject(created),
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao criar', ok: false };
  }
}

export async function updateSubSupplierAction(
  id: string,
  prev: unknown,
  formData: FormData,
) {
  try {
    const parsed = z
      .object({
        name: z.string().min(1),
        taxId: z.string().optional(),
        countryCode: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        siscomexId: z.string().optional(),
      })
      .safeParse({
        name: formData.get('name'),
        taxId: formData.get('taxId') || undefined,
        countryCode: formData.get('countryCode') || undefined,
        email: formData.get('email') || undefined,
        address: formData.get('address') || undefined,
        siscomexId: formData.get('siscomexId') || undefined,
      });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.subSuppliers.findFirst({
        where: (s, { eq }) => eq(s.id, id),
      });
      if (!oldData) throw new Error('Sub-fornecedor não encontrado');

      await updateSubSupplier(
        id,
        {
          ...parsed.data,
          taxId: parsed.data.taxId ?? null,
          countryCode: parsed.data.countryCode ?? null,
          email: parsed.data.email ?? null,
          address: parsed.data.address ?? null,
          siscomexId: parsed.data.siscomexId ?? null,
        },
        tx,
      );
      await recordAudit({
        tableName: 'sub_suppliers',
        entityId: id,
        action: 'UPDATE',
        oldValues: toPlainObject(oldData),
        newValues: parsed.data,
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao atualizar', ok: false };
  }
}

export async function deleteSubSupplierAction(id: string) {
  try {
    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.subSuppliers.findFirst({
        where: (s, { eq }) => eq(s.id, id),
      });
      if (!oldData) throw new Error('Sub-fornecedor não encontrado');

      await deleteSubSupplier(id, tx);
      await recordAudit({
        tableName: 'sub_suppliers',
        entityId: id,
        action: 'DELETE',
        oldValues: toPlainObject(oldData),
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao excluir', ok: false };
  }
}

// ============================================
// Carriers (ShipsGo sync)
// ============================================

export async function syncCarriersFromShipsGoAction() {
  try {
    await requireSuperAdmin();
    const result = await syncCarriersFromShipsGo();
    revalidatePath('/admin/settings');
    return {
      ok: true,
      inserted: result.inserted,
      updated: result.updated,
      errors: result.errors,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro ao sincronizar',
    };
  }
}

// ============================================
// Currency Exchange Brokers (corretoras de câmbio)
// ============================================

const currencyExchangeBrokerSchema = z.object({
  name: z.string().min(1),
});

export async function createCurrencyExchangeBrokerAction(
  prev: unknown,
  formData: FormData,
) {
  try {
    const parsed = currencyExchangeBrokerSchema.safeParse({
      name: formData.get('name'),
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const created = await createCurrencyExchangeBroker(parsed.data, tx);
      await recordAudit({
        tableName: 'currency_exchange_brokers',
        entityId: created.id,
        action: 'CREATE',
        newValues: toPlainObject(created),
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao criar', ok: false };
  }
}

export async function updateCurrencyExchangeBrokerAction(
  id: string,
  prev: unknown,
  formData: FormData,
) {
  try {
    const parsed = currencyExchangeBrokerSchema.safeParse({
      name: formData.get('name'),
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.currencyExchangeBrokers.findFirst({
        where: (c, { eq }) => eq(c.id, id),
      });
      if (!oldData) throw new Error('Corretora não encontrada');

      await updateCurrencyExchangeBroker(id, parsed.data, tx);
      await recordAudit({
        tableName: 'currency_exchange_brokers',
        entityId: id,
        action: 'UPDATE',
        oldValues: toPlainObject(oldData),
        newValues: parsed.data,
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao atualizar', ok: false };
  }
}

export async function deleteCurrencyExchangeBrokerAction(id: string) {
  try {
    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.currencyExchangeBrokers.findFirst({
        where: (c, { eq }) => eq(c.id, id),
      });
      if (!oldData) throw new Error('Corretora não encontrada');

      await deleteCurrencyExchangeBroker(id, tx);
      await recordAudit({
        tableName: 'currency_exchange_brokers',
        entityId: id,
        action: 'DELETE',
        oldValues: toPlainObject(oldData),
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao excluir', ok: false };
  }
}

// ============================================
// Carriers (search for Autocomplete)
// ============================================

const CARRIERS_PAGE_SIZE = 20;

export async function searchCarriersAction(
  limit: number = CARRIERS_PAGE_SIZE,
  offset: number = 0,
  search?: string
) {
  try {
    await requireSuperAdmin();
    const items = await getCarriersPaginated(limit, offset, search);
    return { items, ok: true };
  } catch {
    return { items: [], ok: false };
  }
}

export async function getCarrierByIdAction(id: string) {
  try {
    await requireSuperAdmin();
    const carrier = await getCarrierById(id);
    return { carrier, ok: true };
  } catch {
    return { carrier: null, ok: false };
  }
}

// ============================================
// International Freights
// ============================================

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

// ============================================
// Pricing Rules (Taxas de Frete)
// ============================================

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

export interface GetAuditLogsActionParams {
  limit?: number;
  offset?: number;
  tableName?: string;
  actorId?: string;
  action?: 'CREATE' | 'UPDATE' | 'DELETE';
  from?: string;
  to?: string;
}

export async function getAuditLogsAction(params: GetAuditLogsActionParams = {}) {
  try {
    const { from, to, ...rest } = params;
    const result = await getAuditLogsPaginated({
      ...rest,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
    return { ok: true, ...result };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro ao carregar histórico',
      items: [],
      total: 0,
    };
  }
}
