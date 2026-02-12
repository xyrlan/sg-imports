/**
 * Admin Config Service — global platform configuration
 *
 * Manages: global_service_fee_config, state_icms_rates, siscomex_fee_config, global_platform_rates
 */

import { db } from '@/db';
import {
  globalServiceFeeConfig,
  stateIcmsRates,
  siscomexFeeConfig,
  globalPlatformRates,
} from '@/db/schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

// ============================================
// Types
// ============================================

export type GlobalServiceFeeConfig = InferSelectModel<typeof globalServiceFeeConfig>;
export type StateIcmsRate = InferSelectModel<typeof stateIcmsRates>;
export type SiscomexFeeConfig = InferSelectModel<typeof siscomexFeeConfig>;
export type GlobalPlatformRate = InferSelectModel<typeof globalPlatformRates>;

export interface UpsertGlobalServiceFeeData {
  minimumWageBrl?: string;
  defaultMultiplier?: number;
  defaultPercentage?: string;
  defaultApplyToChina?: boolean;
}

export interface UpsertStateIcmsData {
  state: string;
  difal: 'INSIDE' | 'OUTSIDE';
  icmsRate: string;
}

export interface UpsertSiscomexFeeData {
  registrationValue?: string;
  additions?: string[];
  additions11To20?: string;
  additions21To50?: string;
  additions51AndAbove?: string;
}

export interface UpsertGlobalPlatformRateData {
  rateType: string;
  value?: string;
  unit?: string;
  description?: string | null;
}

// ============================================
// Global Service Fee (Honorários)
// ============================================

export async function getGlobalServiceFeeConfig(): Promise<GlobalServiceFeeConfig | null> {
  const [row] = await db.select().from(globalServiceFeeConfig).limit(1);
  return row ?? null;
}

export async function upsertGlobalServiceFeeConfig(
  data: UpsertGlobalServiceFeeData,
): Promise<GlobalServiceFeeConfig> {
  const [existing] = await db.select().from(globalServiceFeeConfig).limit(1);
  const payload = { ...data, updatedAt: new Date() };

  if (existing) {
    const [updated] = await db
      .update(globalServiceFeeConfig)
      .set(payload)
      .where(eq(globalServiceFeeConfig.id, existing.id))
      .returning();
    return updated!;
  }

  const [inserted] = await db
    .insert(globalServiceFeeConfig)
    .values(payload as Partial<InferInsertModel<typeof globalServiceFeeConfig>>)
    .returning();
  return inserted!;
}

// ============================================
// State ICMS Rates
// ============================================

export async function getStateIcmsRates(): Promise<StateIcmsRate[]> {
  return db.select().from(stateIcmsRates);
}

export async function upsertStateIcmsRates(rates: UpsertStateIcmsData[]): Promise<void> {
  for (const r of rates) {
    await db
      .insert(stateIcmsRates)
      .values({
        state: r.state,
        difal: r.difal,
        icmsRate: r.icmsRate,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [stateIcmsRates.state, stateIcmsRates.difal],
        set: { icmsRate: r.icmsRate, updatedAt: new Date() },
      });
  }
}

// ============================================
// Siscomex Fee Config
// ============================================

export async function getSiscomexFeeConfig(): Promise<SiscomexFeeConfig | null> {
  const [row] = await db.select().from(siscomexFeeConfig).limit(1);
  return row ?? null;
}

export async function upsertSiscomexFeeConfig(
  data: UpsertSiscomexFeeData,
): Promise<SiscomexFeeConfig> {
  const [existing] = await db.select().from(siscomexFeeConfig).limit(1);
  const payload = { ...data, updatedAt: new Date() };

  if (existing) {
    const [updated] = await db
      .update(siscomexFeeConfig)
      .set(payload)
      .where(eq(siscomexFeeConfig.id, existing.id))
      .returning();
    return updated!;
  }

  const [inserted] = await db
    .insert(siscomexFeeConfig)
    .values(payload as Partial<InferInsertModel<typeof siscomexFeeConfig>>)
    .returning();
  return inserted!;
}

// ============================================
// Global Platform Rates
// ============================================

export async function getGlobalPlatformRates(): Promise<GlobalPlatformRate[]> {
  return db.select().from(globalPlatformRates);
}

export async function upsertGlobalPlatformRate(
  data: UpsertGlobalPlatformRateData,
): Promise<GlobalPlatformRate> {
  const unit = (data.unit ?? 'PERCENT') as 'PERCENT' | 'FIXED_BRL' | 'FIXED_USD' | 'PER_CONTAINER_BRL';
  const value = data.value ?? '0';
  const description = data.description ?? null;
  const updatedAt = new Date();

  const [result] = await db
    .insert(globalPlatformRates)
    .values({
      rateType: data.rateType as InferInsertModel<typeof globalPlatformRates>['rateType'],
      value,
      unit,
      description,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: globalPlatformRates.rateType,
      set: { value, unit, description, updatedAt },
    })
    .returning();
  return result!;
}
