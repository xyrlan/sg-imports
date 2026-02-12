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
import { eq, asc } from 'drizzle-orm';

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

export interface UpsertStorageRuleData {
  terminalId: string;
  type: 'GP_20' | 'GP_40' | 'HC_40' | 'RF_20' | 'RF_40';
  currency?: 'BRL' | 'USD' | 'CNY' | 'EUR';
  shipmentType?: 'FCL' | 'FCL_PARTIAL' | 'LCL';
  minValue?: string;
  freeDays?: number;
  additionalFees?: StorageRuleAdditionalFee[];
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

export async function createStorageRule(
  data: Omit<UpsertStorageRuleData, 'terminalId'> & { terminalId: string },
): Promise<StorageRule> {
  const [inserted] = await db
    .insert(storageRules)
    .values({
      terminalId: data.terminalId,
      type: data.type,
      currency: data.currency ?? 'BRL',
      shipmentType: data.shipmentType ?? 'FCL',
      minValue: data.minValue ?? '0',
      freeDays: data.freeDays ?? 0,
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
      ...(data.type && { type: data.type }),
      ...(data.currency && { currency: data.currency }),
      ...(data.shipmentType && { shipmentType: data.shipmentType }),
      ...(data.minValue !== undefined && { minValue: data.minValue }),
      ...(data.freeDays !== undefined && { freeDays: data.freeDays }),
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
