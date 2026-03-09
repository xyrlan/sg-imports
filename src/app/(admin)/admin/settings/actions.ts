'use server';

import { revalidatePath } from 'next/cache';
import { requireSuperAdmin } from '@/services/auth.service';
import {
  upsertGlobalServiceFeeConfig,
  upsertStateIcmsRates,
  getSiscomexFeeConfig,
  upsertSiscomexFeeConfig,
  upsertGlobalPlatformRate,
  createTerminal,
  updateTerminal,
  deleteTerminal,
  createPort,
  updatePort,
  deletePort,
  syncCarriersFromShipsGo,
  getCarriersPaginated,
  getCarrierById,
  createCurrencyExchangeBroker,
  updateCurrencyExchangeBroker,
  deleteCurrencyExchangeBroker,
  createInternationalFreight,
  updateInternationalFreight,
  deleteInternationalFreight,
} from '@/services/admin';
import { z } from 'zod';
import { RATE_TYPES } from './constants';

const honorariosSchema = z.object({
  minimumWageBrl: z.string().min(1),
  defaultMultiplier: z.coerce.number().min(2).max(4),
  defaultPercentage: z.string().min(1),
  defaultApplyToChina: z.coerce.boolean(),
});

export async function updateHonorariosAction(prev: unknown, formData: FormData) {
  try {
    await requireSuperAdmin();
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
    await upsertGlobalServiceFeeConfig(parsed.data);
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
    await requireSuperAdmin();
    const rates: { state: string; difal: 'INSIDE' | 'OUTSIDE'; icmsRate: string }[] = [];
    const keys = formData.keys();
    for (const key of keys) {
      if (key.startsWith('icms_')) {
        const [state, difal] = key.replace('icms_', '').split('_');
        const val = formData.get(key);
        if (state && difal && val !== null && val !== '') {
          const num = parseFloat(String(val));
          // NumberField percent submits 0-1 (0.18 = 18%); convert to percent string for storage
          const icmsRate = !Number.isNaN(num) && num > 0 && num <= 1
            ? (num * 100).toFixed(2)
            : String(val);
          rates.push({ state, difal: difal as 'INSIDE' | 'OUTSIDE', icmsRate });
        }
      }
    }
    if (rates.length > 0) {
      await upsertStateIcmsRates(rates);
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
    await requireSuperAdmin();
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
    // Normalize decimal: pt-BR uses comma, DB expects dot
    const parseDecimal = (s: string | undefined) =>
      s ? s.trim().replace(',', '.') : undefined;
    await upsertSiscomexFeeConfig({
      registrationValue: parsed.data.registrationValue.replace(',', '.'),
      additions: parseAdditions(additionsRaw),
      additions11To20: parseDecimal(parsed.data.additions11To20),
      additions21To50: parseDecimal(parsed.data.additions21To50),
      additions51AndAbove: parseDecimal(parsed.data.additions51AndAbove),
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
    await requireSuperAdmin();

    for (const rateType of RATE_TYPES) {
      const rawValue = formData.get(`rate_${rateType}_value`);
      const unit = (formData.get(`rate_${rateType}_unit`) ?? 'PERCENT') as string;
      const value = parsePlatformRateValue(rawValue, unit);

      await upsertGlobalPlatformRate({
        rateType,
        value: value ?? '0',
        unit: unit || undefined,
      });
    }
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
    await requireSuperAdmin();
    const parsed = terminalSchema.safeParse({
      name: formData.get('name'),
      code: formData.get('code') || undefined,
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }
    await createTerminal(parsed.data);
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
    await requireSuperAdmin();
    const parsed = terminalSchema.safeParse({
      name: formData.get('name'),
      code: formData.get('code') || undefined,
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }
    await updateTerminal(id, parsed.data);
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
    await requireSuperAdmin();
    await deleteTerminal(id);
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
});

export async function createPortAction(prev: unknown, formData: FormData) {
  try {
    await requireSuperAdmin();
    const parsed = portSchema.safeParse({
      name: formData.get('name'),
      code: formData.get('code'),
      country: formData.get('country'),
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }
    await createPort(parsed.data);
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
    await requireSuperAdmin();
    const parsed = portSchema.safeParse({
      name: formData.get('name'),
      code: formData.get('code'),
      country: formData.get('country'),
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }
    await updatePort(id, parsed.data);
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao atualizar', ok: false };
  }
}

export async function deletePortAction(id: string) {
  try {
    await requireSuperAdmin();
    await deletePort(id);
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
    await requireSuperAdmin();
    const parsed = currencyExchangeBrokerSchema.safeParse({
      name: formData.get('name'),
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }
    await createCurrencyExchangeBroker(parsed.data);
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
    await requireSuperAdmin();
    const parsed = currencyExchangeBrokerSchema.safeParse({
      name: formData.get('name'),
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }
    await updateCurrencyExchangeBroker(id, parsed.data);
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao atualizar', ok: false };
  }
}

export async function deleteCurrencyExchangeBrokerAction(id: string) {
  try {
    await requireSuperAdmin();
    await deleteCurrencyExchangeBroker(id);
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

const CONTAINER_TYPES = ['GP_20', 'GP_40', 'HC_40', 'RF_20', 'RF_40'] as const;
const CURRENCIES = ['BRL', 'USD', 'CNY', 'EUR'] as const;

const createInternationalFreightSchema = z.object({
  carrierId: z.string().uuid(),
  containerType: z.enum(CONTAINER_TYPES),
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

const updateInternationalFreightSchema = createInternationalFreightSchema.partial();

export async function createInternationalFreightAction(data: unknown) {
  try {
    await requireSuperAdmin();
    const parsed = createInternationalFreightSchema.safeParse(data);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues.map((e) => e.message).join(', ') || 'Dados inválidos',
      };
    }
    const p = parsed.data;
    await createInternationalFreight({
      carrierId: p.carrierId,
      containerType: p.containerType,
      value: p.value,
      currency: p.currency,
      freeTimeDays: p.freeTimeDays,
      expectedProfit: p.expectedProfit ?? null,
      validTo: p.validTo ? new Date(p.validTo) : null,
      portOfLoadingIds: p.portOfLoadingIds,
      portOfDischargeIds: p.portOfDischargeIds,
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro ao criar frete internacional',
    };
  }
}

export async function updateInternationalFreightAction(id: string, data: unknown) {
  try {
    await requireSuperAdmin();
    const parsed = updateInternationalFreightSchema.safeParse(data);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues.map((e) => e.message).join(', ') || 'Dados inválidos',
      };
    }
    const p = parsed.data;
    await updateInternationalFreight(id, {
      ...(p.carrierId && { carrierId: p.carrierId }),
      ...(p.containerType && { containerType: p.containerType }),
      ...(p.value && { value: p.value }),
      ...(p.currency && { currency: p.currency }),
      ...(p.freeTimeDays !== undefined && { freeTimeDays: p.freeTimeDays }),
      ...(p.expectedProfit !== undefined && { expectedProfit: p.expectedProfit }),
      ...(p.validTo !== undefined && {
        validTo: p.validTo ? new Date(p.validTo) : null,
      }),
      ...(p.portOfLoadingIds && { portOfLoadingIds: p.portOfLoadingIds }),
      ...(p.portOfDischargeIds && { portOfDischargeIds: p.portOfDischargeIds }),
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro ao atualizar frete internacional',
    };
  }
}

export async function deleteInternationalFreightAction(id: string) {
  try {
    await requireSuperAdmin();
    await deleteInternationalFreight(id);
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro ao excluir frete internacional',
    };
  }
}
