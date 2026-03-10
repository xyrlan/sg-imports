import { db } from '@/db';
import { products, organizations, hsCodes } from '@/db/schema';
import { eq, ilike, or, sql, desc, asc, and, type AnyColumn } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { type AdminQueryParams, type PaginatedResult, buildPaginatedResult } from './types';
import { deleteProduct } from '@/services/product.service';

export type Product = InferSelectModel<typeof products>;

export interface ProductWithOrgAndNcm {
  id: string;
  organizationId: string;
  name: string;
  styleCode: string | null;
  description: string | null;
  photos: string[] | null;
  hsCodeId: string | null;
  supplierId: string | null;
  siscomexId: string | null;
  createdAt: Date;
  updatedAt: Date;
  organizationName: string;
  ncmCode: string | null;
  firstSku: string | null;
  firstPriceUsd: string | null;
}

// ============================================
// Sortable columns mapping
// ============================================

const SORT_COLUMNS: Record<string, AnyColumn> = {
  name: products.name,
  createdAt: products.createdAt,
};

// ============================================
// Queries
// ============================================

/**
 * Fetch all products across all organizations with org name and NCM code.
 */
export async function getAllProducts(
  params: AdminQueryParams = {},
): Promise<PaginatedResult<ProductWithOrgAndNcm>> {
  const {
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 0,
    pageSize = 10,
  } = params;

  const offset = page * pageSize;

  const whereConditions = search
    ? or(
        ilike(products.name, `%${search}%`),
        ilike(products.styleCode, `%${search}%`),
        ilike(organizations.name, `%${search}%`),
        ilike(hsCodes.code, `%${search}%`),
      )
    : undefined;

  const sortColumn = SORT_COLUMNS[sortBy] ?? products.createdAt;
  const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const [rows, countResult] = await Promise.all([
    db
      .select({
        id: products.id,
        organizationId: products.organizationId,
        name: products.name,
        styleCode: products.styleCode,
        description: products.description,
        photos: products.photos,
        hsCodeId: products.hsCodeId,
        supplierId: products.supplierId,
        siscomexId: products.siscomexId,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        organizationName: organizations.name,
        ncmCode: hsCodes.code,
        firstSku: sql<string | null>`(
          SELECT pv.sku FROM product_variants pv
          WHERE pv.product_id = ${products.id}
          LIMIT 1
        )`.as('first_sku'),
        firstPriceUsd: sql<string | null>`(
          SELECT pv.price_usd::text FROM product_variants pv
          WHERE pv.product_id = ${products.id}
          LIMIT 1
        )`.as('first_price_usd'),
      })
      .from(products)
      .leftJoin(organizations, eq(products.organizationId, organizations.id))
      .leftJoin(hsCodes, eq(products.hsCodeId, hsCodes.id))
      .where(whereConditions)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .leftJoin(organizations, eq(products.organizationId, organizations.id))
      .leftJoin(hsCodes, eq(products.hsCodeId, hsCodes.id))
      .where(whereConditions),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  const data: ProductWithOrgAndNcm[] = rows.map((row) => ({
    ...row,
    organizationName: row.organizationName ?? '—',
    ncmCode: row.ncmCode ?? null,
    firstSku: row.firstSku ?? null,
    firstPriceUsd: row.firstPriceUsd ?? null,
  }));

  return buildPaginatedResult(data, total, page, pageSize);
}

/**
 * Fetch a single product by ID (admin-level, no membership check).
 */
export async function getProductByIdAsAdmin(id: string) {
  const result = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: { variants: true, organization: true, hsCode: true },
  });
  return result ?? null;
}

/**
 * Delete product as admin (no membership check). Uses organizationId from product.
 */
export async function deleteProductAsAdmin(productId: string): Promise<void> {
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
    columns: { organizationId: true },
  });

  if (!product) {
    throw new Error('Product not found');
  }

  await deleteProduct(productId, product.organizationId);
}
