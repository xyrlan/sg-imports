/**
 * Currency Exchange Brokers Service — CRUD for corretoras de câmbio.
 * Used in exchange_contracts (contratos de câmbio).
 */

import { db } from '@/db';
import { currencyExchangeBrokers } from '@/db/schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { eq, asc } from 'drizzle-orm';

// ============================================
// Types
// ============================================

export type CurrencyExchangeBroker =
  InferSelectModel<typeof currencyExchangeBrokers>;

export interface CreateCurrencyExchangeBrokerData {
  name: string;
}

export interface UpdateCurrencyExchangeBrokerData {
  name?: string;
}

// ============================================
// Currency Exchange Brokers
// ============================================

export async function getAllCurrencyExchangeBrokers(): Promise<
  CurrencyExchangeBroker[]
> {
  return db
    .select()
    .from(currencyExchangeBrokers)
    .orderBy(asc(currencyExchangeBrokers.name));
}

export async function getCurrencyExchangeBrokerById(
  id: string,
): Promise<CurrencyExchangeBroker | null> {
  const [row] = await db
    .select()
    .from(currencyExchangeBrokers)
    .where(eq(currencyExchangeBrokers.id, id));
  return row ?? null;
}

export async function createCurrencyExchangeBroker(
  data: CreateCurrencyExchangeBrokerData,
): Promise<CurrencyExchangeBroker> {
  const [inserted] = await db
    .insert(currencyExchangeBrokers)
    .values(data as InferInsertModel<typeof currencyExchangeBrokers>)
    .returning();
  return inserted!;
}

export async function updateCurrencyExchangeBroker(
  id: string,
  data: UpdateCurrencyExchangeBrokerData,
): Promise<CurrencyExchangeBroker | null> {
  const [updated] = await db
    .update(currencyExchangeBrokers)
    .set(data)
    .where(eq(currencyExchangeBrokers.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteCurrencyExchangeBroker(
  id: string,
): Promise<boolean> {
  const deleted = await db
    .delete(currencyExchangeBrokers)
    .where(eq(currencyExchangeBrokers.id, id))
    .returning();
  return deleted.length > 0;
}
