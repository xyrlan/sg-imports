'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  withAuditTransaction,
  upsertGlobalServiceFeeConfig,
  getGlobalServiceFeeConfig,
} from '@/services/admin';
import { toPlainObject } from '../../action-utils';

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
