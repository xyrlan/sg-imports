import { db } from '@/db';
import { hsCodes, products } from '@/db/schema';
import { eq, ilike, or, sql, desc, asc, type AnyColumn } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { type AdminQueryParams, type PaginatedResult, buildPaginatedResult } from './types';

export type HsCode = InferSelectModel<typeof hsCodes>;

export interface UpdateHsCodeData {
  code?: string;
  description?: string | null;
  ii?: string;
  ipi?: string;
  pis?: string;
  cofins?: string;
  antidumping?: string;
}

// ============================================
// Sortable columns mapping
// ============================================

const SORT_COLUMNS: Record<string, AnyColumn> = {
  code: hsCodes.code,
  description: hsCodes.description,
  updatedAt: hsCodes.updatedAt,
};

// ============================================
// Queries
// ============================================

/**
 * Fetch all HS codes (NCMs) with pagination, sorting, and search.
 */
export async function getAllHsCodes(
  params: AdminQueryParams = {},
): Promise<PaginatedResult<HsCode>> {
  const {
    search,
    sortBy = 'code',
    sortOrder = 'asc',
    page = 0,
    pageSize = 10,
  } = params;

  const offset = page * pageSize;

  const whereConditions = search
    ? or(
        ilike(hsCodes.code, `%${search}%`),
        ilike(hsCodes.description, `%${search}%`),
      )
    : undefined;

  const sortColumn = SORT_COLUMNS[sortBy] ?? hsCodes.code;
  const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const [data, countResult] = await Promise.all([
    db
      .select()
      .from(hsCodes)
      .where(whereConditions)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(hsCodes)
      .where(whereConditions),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return buildPaginatedResult(data, total, page, pageSize);
}

/**
 * Fetch a single HS code by ID.
 */
export async function getHsCodeById(id: string): Promise<HsCode | null> {
  const result = await db.query.hsCodes.findFirst({
    where: eq(hsCodes.id, id),
  });
  return result ?? null;
}

/**
 * Update HS code. Fails if new code conflicts with existing unique.
 */
export async function updateHsCode(
  id: string,
  data: UpdateHsCodeData,
): Promise<HsCode | null> {
  const updatePayload: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (data.code !== undefined) updatePayload.code = data.code;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.ii !== undefined) updatePayload.ii = data.ii;
  if (data.ipi !== undefined) updatePayload.ipi = data.ipi;
  if (data.pis !== undefined) updatePayload.pis = data.pis;
  if (data.cofins !== undefined) updatePayload.cofins = data.cofins;
  if (data.antidumping !== undefined) updatePayload.antidumping = data.antidumping;

  const [updated] = await db
    .update(hsCodes)
    .set(updatePayload as Record<string, string | Date | null>)
    .where(eq(hsCodes.id, id))
    .returning();

  return updated ?? null;
}

/**
 * Delete HS code. Fails if any product references it.
 */
export async function deleteHsCode(id: string): Promise<void> {
  const inUse = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.hsCodeId, id))
    .limit(1);

  if (inUse.length > 0) {
    throw new Error('Cannot delete NCM: it is in use by one or more products');
  }

  await db.delete(hsCodes).where(eq(hsCodes.id, id));
}
