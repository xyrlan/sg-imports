'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  withAuditTransaction,
  upsertStateIcmsRates,
  getStateIcmsRates,
  getSiscomexFeeConfig,
  upsertSiscomexFeeConfig,
  getGlobalPlatformRates,
  upsertGlobalPlatformRate,
} from '@/services/admin';
import { RATE_TYPES } from '../../constants';
import { toPlainObject } from '../../action-utils';

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
