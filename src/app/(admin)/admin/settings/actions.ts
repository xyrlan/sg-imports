'use server';

import { revalidatePath } from 'next/cache';
import { getUserProfile } from '@/services/auth.service';
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
  createCurrencyExchangeBroker,
  updateCurrencyExchangeBroker,
  deleteCurrencyExchangeBroker,
} from '@/services/admin';
import { z } from 'zod';
import { RATE_TYPES } from './constants';

async function requireSuperAdmin() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const profile = await getUserProfile(user.id);
  if (!profile || profile.systemRole !== 'SUPER_ADMIN') {
    throw new Error('Forbidden');
  }
}

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
  additions: z.string().optional(),
  additions11To20: z.string().optional(),
  additions21To50: z.string().optional(),
  additions51AndAbove: z.string().optional(),
});

export async function updateSiscomexFeeAction(prev: unknown, formData: FormData) {
  try {
    await requireSuperAdmin();
    const parsed = siscomexSchema.safeParse({
      registrationValue: formData.get('registrationValue'),
      additions: formData.get('additions'),
      additions11To20: formData.get('additions11To20'),
      additions21To50: formData.get('additions21To50'),
      additions51AndAbove: formData.get('additions51AndAbove'),
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }
    const parseArray = (s: string | undefined) =>
      s ? s.split(',').map((x) => x.trim()).filter(Boolean) : [];
    // Normalize decimal: pt-BR uses comma, DB expects dot
    const parseDecimal = (s: string | undefined) =>
      s ? s.trim().replace(',', '.') : undefined;
    await upsertSiscomexFeeConfig({
      registrationValue: parsed.data.registrationValue.replace(',', '.'),
      additions: parseArray(parsed.data.additions),
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
