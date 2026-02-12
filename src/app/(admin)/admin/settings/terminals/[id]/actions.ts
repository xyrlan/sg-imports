'use server';

import { revalidatePath } from 'next/cache';
import { getUserProfile } from '@/services/auth.service';
import {
  getTerminalWithRules,
  createStorageRuleWithPeriods,
  updateStorageRuleWithPeriods,
  deleteStorageRule,
  duplicateStorageRule,
  findStorageRuleConflict,
} from '@/services/admin';
import { z } from 'zod';
import type { StorageRuleAdditionalFee } from '@/db/schema';

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

export async function getTerminalWithRulesAction(terminalId: string) {
  await requireSuperAdmin();
  return getTerminalWithRules(terminalId);
}

const feeBasisSchema = z.enum(['PER_BOX', 'PER_BL', 'PER_WM', 'PER_CONTAINER']);
const additionalFeeSchema = z.object({
  name: z.string().min(1),
  value: z.coerce.number().min(0),
  basis: feeBasisSchema,
});

const periodSchema = z.object({
  daysFrom: z.coerce.number().int().min(0),
  daysTo: z.union([z.coerce.number().int().min(0), z.null()]),
  chargeType: z.enum(['PERCENTAGE', 'FIXED']),
  rate: z.string().min(1),
  isDailyRate: z.coerce.boolean(),
});

const containerTypeSchema = z.enum(['GP_20', 'GP_40', 'HC_40', 'RF_20', 'RF_40']);
const shipmentTypeSchema = z.enum(['FCL', 'FCL_PARTIAL', 'LCL']);

const createStorageRuleSchema = z
  .object({
    terminalId: z.string().uuid(),
    containerType: z.string().optional(),
    shipmentType: shipmentTypeSchema,
    minValue: z.string().default('0'),
    cifInsurance: z.string().default('0'),
    additionalFees: z.array(additionalFeeSchema).default([]),
    periods: z.array(periodSchema).min(1),
  })
  .refine(
    (data) => {
      if (data.shipmentType === 'FCL') {
        return !!data.containerType && data.containerType !== '';
      }
      return true;
    },
    { message: 'Tipo de container é obrigatório para FCL', path: ['containerType'] },
  );

function parseFormData(formData: FormData) {
  const parseDecimal = (s: string | null | undefined) => {
    if (s == null || s === '') return '0';
    const n = parseFloat(String(s).replace(',', '.'));
    return Number.isNaN(n) ? '0' : String(n);
  };

  const terminalId = formData.get('terminalId') as string;
  const ruleId = formData.get('ruleId') as string | null;
  const containerType = formData.get('containerType') as string | null;
  const shipmentType = formData.get('shipmentType') as string;
  const minValue = parseDecimal(formData.get('minValue') as string);
  const cifInsurance = parseDecimal(formData.get('cifInsurance') as string);

  let additionalFees: StorageRuleAdditionalFee[] = [];
  try {
    const feesJson = formData.get('additionalFeesJson') as string;
    if (feesJson) {
      additionalFees = JSON.parse(feesJson) as StorageRuleAdditionalFee[];
    }
  } catch {
    additionalFees = [];
  }

  let periods: Array<{ daysFrom: number; daysTo: number | null; chargeType: 'PERCENTAGE' | 'FIXED'; rate: string; isDailyRate: boolean }> = [];
  try {
    const periodsJson = formData.get('periodsJson') as string;
    if (periodsJson) {
      periods = JSON.parse(periodsJson);
    }
  } catch {
    periods = [];
  }

  return {
    terminalId,
    ruleId: ruleId || null,
    containerType: containerType || '',
    shipmentType,
    minValue,
    cifInsurance,
    additionalFees,
    periods,
  };
}

export type StorageRuleActionState = { ok?: boolean; error?: string } | null;

export async function createStorageRuleAction(
  _prev: StorageRuleActionState,
  formData: FormData,
): Promise<StorageRuleActionState> {
  try {
    await requireSuperAdmin();
    const raw = parseFormData(formData);
    const parsed = createStorageRuleSchema.safeParse({
      ...raw,
      containerType: raw.containerType,
      shipmentType: raw.shipmentType as z.infer<typeof shipmentTypeSchema>,
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }
    const { terminalId, containerType, shipmentType, minValue, cifInsurance, additionalFees, periods } =
      parsed.data;

    const conflict = await findStorageRuleConflict(
      terminalId,
      shipmentType,
      shipmentType === 'FCL' && containerType ? (containerType as z.infer<typeof containerTypeSchema>) : null,
    );
    if (conflict) {
      const msg =
        shipmentType === 'LCL'
          ? 'Já existe uma regra LCL para este terminal.'
          : shipmentType === 'FCL_PARTIAL'
            ? 'Já existe uma regra FCL Parcial para este terminal.'
            : `Já existe uma regra FCL para o container ${containerType} neste terminal.`;
      return { error: msg, ok: false };
    }

    await createStorageRuleWithPeriods({
      terminalId,
      containerType:
        shipmentType === 'FCL' && containerType && containerTypeSchema.safeParse(containerType).success
          ? (containerType as z.infer<typeof containerTypeSchema>)
          : null,
      shipmentType,
      minValue,
      cifInsurance: shipmentType === 'LCL' ? cifInsurance : '0',
      additionalFees,
      periods: periods.map((p) => ({
        daysFrom: p.daysFrom,
        daysTo: p.daysTo,
        chargeType: p.chargeType,
        rate: p.rate,
        isDailyRate: p.isDailyRate,
      })),
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao criar regra', ok: false };
  }
}

export async function updateStorageRuleAction(
  terminalId: string,
  _prev: StorageRuleActionState,
  formData: FormData,
): Promise<StorageRuleActionState> {
  try {
    await requireSuperAdmin();
    const raw = parseFormData(formData);
    const ruleId = raw.ruleId;
    if (!ruleId) {
      return { error: 'ID da regra não informado', ok: false };
    }
    const parsed = createStorageRuleSchema.omit({ terminalId: true }).safeParse({
      ...raw,
      containerType: raw.containerType,
      shipmentType: raw.shipmentType as z.infer<typeof shipmentTypeSchema>,
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }
    const { containerType, shipmentType, minValue, cifInsurance, additionalFees, periods } = parsed.data;

    const conflict = await findStorageRuleConflict(
      terminalId,
      shipmentType,
      shipmentType === 'FCL' && containerType ? (containerType as z.infer<typeof containerTypeSchema>) : null,
      ruleId,
    );
    if (conflict) {
      const msg =
        shipmentType === 'LCL'
          ? 'Já existe uma regra LCL para este terminal.'
          : shipmentType === 'FCL_PARTIAL'
            ? 'Já existe uma regra FCL Parcial para este terminal.'
            : `Já existe uma regra FCL para o container ${containerType} neste terminal.`;
      return { error: msg, ok: false };
    }

    const updated = await updateStorageRuleWithPeriods(ruleId, {
      containerType:
        shipmentType === 'FCL' && containerType && containerTypeSchema.safeParse(containerType).success
          ? (containerType as z.infer<typeof containerTypeSchema>)
          : null,
      shipmentType,
      minValue,
      cifInsurance: shipmentType === 'LCL' ? cifInsurance : '0',
      additionalFees,
      periods: periods.map((p) => ({
        daysFrom: p.daysFrom,
        daysTo: p.daysTo,
        chargeType: p.chargeType,
        rate: p.rate,
        isDailyRate: p.isDailyRate,
      })),
    });
    if (!updated) {
      return { error: 'Regra não encontrada', ok: false };
    }
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao atualizar regra', ok: false };
  }
}

export async function deleteStorageRuleAction(ruleId: string, _terminalId: string): Promise<StorageRuleActionState> {
  try {
    await requireSuperAdmin();
    const deleted = await deleteStorageRule(ruleId);
    if (!deleted) {
      return { error: 'Regra não encontrada', ok: false };
    }
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao excluir regra', ok: false };
  }
}

export async function duplicateStorageRuleAction(ruleId: string, _terminalId: string): Promise<StorageRuleActionState> {
  try {
    await requireSuperAdmin();
    const duplicated = await duplicateStorageRule(ruleId);
    if (!duplicated) {
      return { error: 'Regra não encontrada', ok: false };
    }
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao duplicar regra', ok: false };
  }
}
