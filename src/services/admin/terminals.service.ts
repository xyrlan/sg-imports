/**
 * Admin Terminals Service — CRUD for terminals and storage rules
 */

import { db } from '@/db';
import {
  terminals,
  storageRules,
  storagePeriods,
  type StorageRuleAdditionalFee,
} from '@/db/schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { eq, asc, and, ne } from 'drizzle-orm';

// ============================================
// Types
// ============================================

export type Terminal = InferSelectModel<typeof terminals>;
export type StorageRule = InferSelectModel<typeof storageRules>;
export type StoragePeriod = InferSelectModel<typeof storagePeriods>;

export interface TerminalWithRules extends Terminal {
  storageRules: (StorageRule & { periods: StoragePeriod[] })[];
}

export interface CreateTerminalData {
  name: string;
  code?: string | null;
}

export interface UpdateTerminalData {
  name?: string;
  code?: string | null;
}

export type ContainerType = 'GP_20' | 'GP_40' | 'HC_40' | 'RF_20' | 'RF_40';

export interface UpsertStorageRuleData {
  terminalId: string;
  /** Obrigatório somente quando shipmentType é FCL */
  containerType?: ContainerType | null;
  shipmentType?: 'FCL' | 'FCL_PARTIAL' | 'LCL';
  minValue?: string;
  /** Seguro CIF - somente para LCL */
  cifInsurance?: string;
  additionalFees?: StorageRuleAdditionalFee[];
}

export interface CreateStorageRuleWithPeriodsData extends Omit<UpsertStorageRuleData, 'terminalId'> {
  terminalId: string;
  periods: Array<{
    daysFrom: number;
    daysTo?: number | null;
    chargeType?: 'PERCENTAGE' | 'FIXED';
    rate: string;
    isDailyRate?: boolean;
  }>;
}

export interface UpsertStoragePeriodData {
  ruleId: string;
  daysFrom: number;
  daysTo?: number | null;
  chargeType?: 'PERCENTAGE' | 'FIXED';
  rate: string;
  isDailyRate?: boolean;
}

// ============================================
// Terminals
// ============================================

export async function getAllTerminals(): Promise<Terminal[]> {
  return db.select().from(terminals).orderBy(asc(terminals.name));
}

export async function getTerminalById(id: string): Promise<Terminal | null> {
  const [row] = await db.select().from(terminals).where(eq(terminals.id, id));
  return row ?? null;
}

export async function getTerminalWithRules(id: string): Promise<TerminalWithRules | null> {
  const terminal = await getTerminalById(id);
  if (!terminal) return null;

  const rules = await db
    .select()
    .from(storageRules)
    .where(eq(storageRules.terminalId, id));

  const rulesWithPeriods = await Promise.all(
    rules.map(async (rule) => {
      const periods = await db
        .select()
        .from(storagePeriods)
        .where(eq(storagePeriods.ruleId, rule.id));
      return { ...rule, periods };
    }),
  );

  return { ...terminal, storageRules: rulesWithPeriods };
}

export async function createTerminal(
  data: CreateTerminalData,
): Promise<Terminal> {
  const [inserted] = await db
    .insert(terminals)
    .values(data as InferInsertModel<typeof terminals>)
    .returning();
  return inserted!;
}

export async function updateTerminal(
  id: string,
  data: UpdateTerminalData,
): Promise<Terminal | null> {
  const [updated] = await db
    .update(terminals)
    .set(data)
    .where(eq(terminals.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteTerminal(id: string): Promise<boolean> {
  const deleted = await db.delete(terminals).where(eq(terminals.id, id)).returning();
  return deleted.length > 0;
}

// ============================================
// Storage Rules
// ============================================

/**
 * Verifica se já existe regra conflitante para o terminal.
 * Regras: 1 LCL, 1 FCL_PARTIAL, 1 FCL por containerType.
 * @param excludeRuleId - ID da regra a excluir (para update)
 */
export async function findStorageRuleConflict(
  terminalId: string,
  shipmentType: 'FCL' | 'FCL_PARTIAL' | 'LCL',
  containerType: ContainerType | null,
  excludeRuleId?: string,
): Promise<StorageRule | null> {
  const baseConditions = [
    eq(storageRules.terminalId, terminalId),
    eq(storageRules.shipmentType, shipmentType),
  ];
  if (excludeRuleId) {
    baseConditions.push(ne(storageRules.id, excludeRuleId));
  }

  if (shipmentType === 'FCL' && containerType) {
    const [existing] = await db
      .select()
      .from(storageRules)
      .where(and(...baseConditions, eq(storageRules.containerType, containerType)))
      .limit(1);
    return existing ?? null;
  }

  if (shipmentType === 'LCL' || shipmentType === 'FCL_PARTIAL') {
    const [existing] = await db
      .select()
      .from(storageRules)
      .where(and(...baseConditions))
      .limit(1);
    return existing ?? null;
  }

  return null;
}

export async function createStorageRule(
  data: Omit<UpsertStorageRuleData, 'terminalId'> & { terminalId: string },
): Promise<StorageRule> {
  const [inserted] = await db
    .insert(storageRules)
    .values({
      terminalId: data.terminalId,
      containerType: data.containerType ?? null,
      shipmentType: data.shipmentType ?? 'FCL',
      minValue: data.minValue ?? '0',
      cifInsurance: data.cifInsurance ?? '0',
      additionalFees: data.additionalFees ?? [],
    } as InferInsertModel<typeof storageRules>)
    .returning();
  return inserted!;
}

export async function updateStorageRule(
  id: string,
  data: Partial<UpsertStorageRuleData>,
): Promise<StorageRule | null> {
  const [updated] = await db
    .update(storageRules)
    .set({
      ...(data.containerType !== undefined && { containerType: data.containerType }),
      ...(data.shipmentType && { shipmentType: data.shipmentType }),
      ...(data.minValue !== undefined && { minValue: data.minValue }),
      ...(data.cifInsurance !== undefined && { cifInsurance: data.cifInsurance }),
      ...(data.additionalFees !== undefined && { additionalFees: data.additionalFees }),
    })
    .where(eq(storageRules.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteStorageRule(id: string): Promise<boolean> {
  const deleted = await db.delete(storageRules).where(eq(storageRules.id, id)).returning();
  return deleted.length > 0;
}

export async function createStorageRuleWithPeriods(
  data: CreateStorageRuleWithPeriodsData,
): Promise<StorageRule> {
  return db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(storageRules)
      .values({
        terminalId: data.terminalId,
        containerType: data.containerType ?? null,
        shipmentType: data.shipmentType ?? 'FCL',
        minValue: data.minValue ?? '0',
        cifInsurance: data.cifInsurance ?? '0',
        additionalFees: data.additionalFees ?? [],
      } as InferInsertModel<typeof storageRules>)
      .returning();
    if (!inserted) throw new Error('Failed to create storage rule');

    for (const p of data.periods) {
      await tx.insert(storagePeriods).values({
        ruleId: inserted.id,
        daysFrom: p.daysFrom,
        daysTo: p.daysTo ?? null,
        chargeType: p.chargeType ?? 'PERCENTAGE',
        rate: p.rate,
        isDailyRate: p.isDailyRate ?? true,
      } as InferInsertModel<typeof storagePeriods>);
    }
    return inserted;
  });
}

export async function updateStorageRuleWithPeriods(
  ruleId: string,
  data: Omit<CreateStorageRuleWithPeriodsData, 'terminalId'>,
): Promise<StorageRule | null> {
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(storageRules)
      .set({
        containerType: data.containerType ?? null,
        shipmentType: data.shipmentType ?? 'FCL',
        minValue: data.minValue ?? '0',
        cifInsurance: data.cifInsurance ?? '0',
        additionalFees: data.additionalFees ?? [],
      } as Partial<InferInsertModel<typeof storageRules>>)
      .where(eq(storageRules.id, ruleId))
      .returning();
    if (!updated) return null;

    await tx.delete(storagePeriods).where(eq(storagePeriods.ruleId, ruleId));

    for (const p of data.periods) {
      await tx.insert(storagePeriods).values({
        ruleId,
        daysFrom: p.daysFrom,
        daysTo: p.daysTo ?? null,
        chargeType: p.chargeType ?? 'PERCENTAGE',
        rate: p.rate,
        isDailyRate: p.isDailyRate ?? true,
      } as InferInsertModel<typeof storagePeriods>);
    }
    return updated;
  });
}

export async function duplicateStorageRule(ruleId: string): Promise<StorageRule | null> {
  const rule = await db.select().from(storageRules).where(eq(storageRules.id, ruleId)).limit(1);
  const [sourceRule] = rule;
  if (!sourceRule) return null;

  const conflict = await findStorageRuleConflict(
    sourceRule.terminalId,
    sourceRule.shipmentType as 'FCL' | 'FCL_PARTIAL' | 'LCL',
    sourceRule.containerType as ContainerType | null,
  );
  if (conflict) {
    throw new Error(
      sourceRule.shipmentType === 'LCL'
        ? 'Já existe uma regra LCL para este terminal.'
        : sourceRule.shipmentType === 'FCL_PARTIAL'
          ? 'Já existe uma regra FCL Parcial para este terminal.'
          : sourceRule.containerType
            ? `Já existe uma regra FCL para o container ${sourceRule.containerType} neste terminal.`
            : 'Já existe uma regra FCL para este terminal.',
    );
  }

  const periods = await db
    .select()
    .from(storagePeriods)
    .where(eq(storagePeriods.ruleId, ruleId));

  return createStorageRuleWithPeriods({
    terminalId: sourceRule.terminalId,
    containerType: sourceRule.containerType as ContainerType | null,
    shipmentType: sourceRule.shipmentType as 'FCL' | 'FCL_PARTIAL' | 'LCL',
    minValue: sourceRule.minValue ?? '0',
    cifInsurance: sourceRule.cifInsurance ?? '0',
    additionalFees: (sourceRule.additionalFees ?? []) as StorageRuleAdditionalFee[],
    periods: periods.map((p) => ({
      daysFrom: p.daysFrom,
      daysTo: p.daysTo,
      chargeType: p.chargeType as 'PERCENTAGE' | 'FIXED',
      rate: p.rate ?? '0',
      isDailyRate: p.isDailyRate ?? true,
    })),
  });
}

// ============================================
// Storage Periods
// ============================================

export async function createStoragePeriod(
  data: UpsertStoragePeriodData,
): Promise<StoragePeriod> {
  const [inserted] = await db
    .insert(storagePeriods)
    .values({
      ruleId: data.ruleId,
      daysFrom: data.daysFrom,
      daysTo: data.daysTo ?? null,
      chargeType: data.chargeType ?? 'PERCENTAGE',
      rate: data.rate,
      isDailyRate: data.isDailyRate ?? true,
    } as InferInsertModel<typeof storagePeriods>)
    .returning();
  return inserted!;
}

export async function updateStoragePeriod(
  id: string,
  data: Partial<UpsertStoragePeriodData>,
): Promise<StoragePeriod | null> {
  const [updated] = await db
    .update(storagePeriods)
    .set(data as Partial<InferInsertModel<typeof storagePeriods>>)
    .where(eq(storagePeriods.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteStoragePeriod(id: string): Promise<boolean> {
  const deleted = await db.delete(storagePeriods).where(eq(storagePeriods.id, id)).returning();
  return deleted.length > 0;
}
