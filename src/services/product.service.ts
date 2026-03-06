import { db } from '@/db';
import { products, productVariants } from '@/db/schema';
import { eq, and, sql, desc, asc } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import type { TieredPriceInfo, VariantAttributes } from '@/db/schema';

export type Product = InferSelectModel<typeof products>;
export type ProductVariant = InferSelectModel<typeof productVariants>;

export type ProductWithVariants = Product & { variants: ProductVariant[] };

export interface GetProductsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  orderBy?: 'name' | 'sku' | 'createdAt';
  orderDirection?: 'asc' | 'desc';
}

export interface GetProductsResult {
  data: ProductWithVariants[];
  paging: {
    totalCount: number;
    page: number;
    pageSize: number;
  };
}

/**
 * List products by organization with variants
 */
export async function getProductsByOrganization(
  orgId: string,
  options: GetProductsOptions = {}
): Promise<GetProductsResult> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 50;
  const search = options.search?.trim();
  const orderBy = options.orderBy ?? 'name';
  const orderDirection = options.orderDirection ?? 'asc';

  const orderFn = orderDirection === 'desc' ? desc : asc;

  const whereConditions = [eq(products.organizationId, orgId)];

  if (search) {
    whereConditions.push(
      sql`(${products.name} ILIKE ${`%${search}%`} OR EXISTS (
        SELECT 1 FROM product_variants pv
        WHERE pv.product_id = products.id AND pv.sku ILIKE ${`%${search}%`}
      ))`
    );
  }

  const whereClause = and(...whereConditions);

  const [data, countResult] = await Promise.all([
    db.query.products.findMany({
      where: whereClause,
      with: { variants: true },
      orderBy:
        orderBy === 'sku'
          ? orderFn(sql`(SELECT pv.sku FROM product_variants pv WHERE pv.product_id = products.id LIMIT 1)`)
          : orderBy === 'createdAt'
            ? orderFn(products.createdAt)
            : orderFn(products.name),
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(whereClause),
  ]);

  const totalCount = countResult[0]?.count ?? 0;

  return {
    data: data as ProductWithVariants[],
    paging: { totalCount, page, pageSize },
  };
}

export interface CreateProductVariantInput {
  sku: string;
  name: string;
  priceUsd: string;
  boxQuantity?: number;
  boxWeight?: string;
  height?: string;
  width?: string;
  length?: string;
  netWeight?: string;
  unitWeight?: string;
  attributes?: VariantAttributes;
  tieredPriceInfo?: TieredPriceInfo;
}

export interface CreateProductInput {
  name: string;
  styleCode?: string;
  description?: string;
  hsCodeId?: string;
  supplierId?: string;
  photos?: string[];
  variants: CreateProductVariantInput[];
}

/**
 * Create product (Alibaba pattern: at least one variant required)
 */
export async function createProduct(
  orgId: string,
  data: CreateProductInput
): Promise<ProductWithVariants> {
  const [product] = await db
    .insert(products)
    .values({
      organizationId: orgId,
      name: data.name,
      styleCode: data.styleCode ?? null,
      description: data.description ?? null,
      hsCodeId: data.hsCodeId ?? null,
      supplierId: data.supplierId ?? null,
      photos: data.photos ?? null,
    })
    .returning();

  if (!product) throw new Error('Failed to create product');

  const rawVariants = data.variants ?? [];
  const variantInputs =
    rawVariants.length > 0
      ? rawVariants
      : [{ sku: 'DEFAULT', name: 'Default', priceUsd: '0', boxQuantity: 1, boxWeight: '0' }];

  const variantValues = variantInputs.map((v) => ({
    productId: product.id,
    organizationId: orgId,
    sku: v.sku,
    name: v.name,
    priceUsd: v.priceUsd,
    boxQuantity: v.boxQuantity ?? 1,
    boxWeight: v.boxWeight ?? '0',
    height: v.height ?? null,
    width: v.width ?? null,
    length: v.length ?? null,
    netWeight: v.netWeight ?? null,
    unitWeight: v.unitWeight ?? null,
    attributes: v.attributes ?? null,
    tieredPriceInfo: v.tieredPriceInfo ?? null,
  }));

  await db.insert(productVariants).values(variantValues);

  const [result] = await db.query.products.findMany({
    where: eq(products.id, product.id),
    with: { variants: true },
  });

  return result as ProductWithVariants;
}

export interface ImportRow {
  sku: string;
  name: string;
  description?: string;
  boxQuantity: number | string;
  boxWeight: string;
  variantName: string;
  priceUsd: string;
  height?: string;
  width?: string;
  length?: string;
  netWeight?: string;
  unitWeight?: string;
}

export interface ImportResult {
  criados: number;
  atualizados: number;
  ignorados: number;
  erros: number;
  detalhesErros: Array<{ nome: string; reason: string; linha?: number }>;
}

/**
 * Import products from parsed rows (CSV/XLSX)
 * Match by sku; create or update product + variant
 */
export async function importProductsFromRows(
  orgId: string,
  rows: ImportRow[]
): Promise<ImportResult> {
  const result: ImportResult = {
    criados: 0,
    atualizados: 0,
    ignorados: 0,
    erros: 0,
    detalhesErros: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 2; // 1-based + header

    try {
      if (!row.sku?.trim() || !row.name?.trim() || !row.variantName?.trim() || !row.priceUsd) {
        result.ignorados++;
        result.erros++;
        result.detalhesErros.push({
          nome: row.name || 'N/A',
          reason: 'Missing required fields: sku, name, variantName, priceUsd',
          linha: lineNum,
        });
        continue;
      }

      const existingVariant = await db.query.productVariants.findFirst({
        where: and(
          eq(productVariants.organizationId, orgId),
          eq(productVariants.sku, row.sku.trim())
        ),
        with: { product: true },
      });

      const variantData = {
        sku: row.sku.trim(),
        name: row.variantName.trim(),
        priceUsd: String(row.priceUsd).replace(',', '.'),
        boxQuantity: Number(row.boxQuantity) || 1,
        boxWeight: String(row.boxWeight || '0').replace(',', '.'),
        height: row.height?.trim() || undefined,
        width: row.width?.trim() || undefined,
        length: row.length?.trim() || undefined,
        netWeight: row.netWeight?.trim() || undefined,
        unitWeight: row.unitWeight?.trim() || undefined,
      };

      if (existingVariant) {
        await db
          .update(productVariants)
          .set({
            name: variantData.name,
            priceUsd: variantData.priceUsd,
            boxQuantity: variantData.boxQuantity,
            boxWeight: variantData.boxWeight,
            height: variantData.height,
            width: variantData.width,
            length: variantData.length,
            netWeight: variantData.netWeight,
            unitWeight: variantData.unitWeight,
          })
          .where(eq(productVariants.id, existingVariant.id));

        await db
          .update(products)
          .set({
            name: row.name.trim(),
            description: row.description?.trim() || null,
            updatedAt: new Date(),
          })
          .where(eq(products.id, existingVariant.productId));

        result.atualizados++;
      } else {
        await createProduct(orgId, {
          name: row.name.trim(),
          description: row.description?.trim(),
          variants: [variantData],
        });
        result.criados++;
      }
    } catch (err: unknown) {
      result.ignorados++;
      result.erros++;
      result.detalhesErros.push({
        nome: row.name || 'N/A',
        reason: err instanceof Error ? err.message : 'Unknown error',
        linha: lineNum,
      });
    }
  }

  return result;
}

export interface ExportRow {
  sku: string;
  name: string;
  description: string;
  boxQuantity: number;
  boxWeight: string;
  variantName: string;
  priceUsd: string;
  height: string;
  width: string;
  length: string;
  netWeight: string;
  unitWeight: string;
}

/**
 * Export products to flat rows for CSV (one row per variant/SKU)
 */
export async function exportProductsToRows(
  orgId: string,
  queryCriteria?: { params?: Record<string, unknown>; orderBy?: Record<string, 'asc' | 'desc'> }
): Promise<ExportRow[]> {
  const orderBy = queryCriteria?.orderBy ?? { name: 'asc' };
  const orderColumn = Object.keys(orderBy)[0] as keyof typeof products | 'sku';
  const orderDir = orderBy[orderColumn] ?? 'asc';

  const orderFn = orderDir === 'desc' ? desc : asc;

  const productList = await db.query.products.findMany({
    where: eq(products.organizationId, orgId),
    with: { variants: true },
    orderBy:
      orderColumn === 'sku'
        ? orderFn(sql`(SELECT pv.sku FROM product_variants pv WHERE pv.product_id = products.id LIMIT 1)`)
        : orderColumn === 'createdAt'
          ? orderFn(products.createdAt)
          : orderFn(products.name),
  });

  const rows: ExportRow[] = [];

  for (const p of productList) {
    for (const v of p.variants) {
      rows.push({
        sku: v.sku,
        name: p.name,
        description: p.description ?? '',
        boxQuantity: v.boxQuantity ?? 1,
        boxWeight: String(v.boxWeight ?? ''),
        variantName: v.name ?? 'Default',
        priceUsd: String(v.priceUsd ?? '0'),
        height: v.height ? String(v.height) : '',
        width: v.width ? String(v.width) : '',
        length: v.length ? String(v.length) : '',
        netWeight: v.netWeight ? String(v.netWeight) : '',
        unitWeight: v.unitWeight ? String(v.unitWeight) : '',
      });
    }
  }

  return rows;
}
