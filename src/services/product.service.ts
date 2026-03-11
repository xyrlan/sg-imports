import { db } from '@/db';
import { products, productVariants, quoteItems } from '@/db/schema';
import { eq, and, sql, desc, asc, inArray } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import type { TieredPriceInfo, VariantAttributes } from '@/db/types';

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
  height?: string;
  width?: string;
  length?: string;
  netWeight?: string;
  unitWeight?: string;
  cartonHeight?: string;
  cartonWidth?: string;
  cartonLength?: string;
  cartonWeight?: string;
  unitsPerCarton?: number;
  packagingType?: 'BOX' | 'PALLET' | 'BAG' | null;
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

export interface UpdateProductVariantInput extends CreateProductVariantInput {
  id?: string;
}

export interface UpdateProductInput {
  name: string;
  styleCode?: string;
  description?: string;
  hsCodeId?: string;
  supplierId?: string;
  photos?: string[];
  variants: UpdateProductVariantInput[];
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
      : [{ sku: 'DEFAULT', name: 'Default', priceUsd: '0', unitsPerCarton: 1 }];

  const variantValues = variantInputs.map((v) => ({
    productId: product.id,
    organizationId: orgId,
    sku: v.sku,
    name: v.name,
    priceUsd: v.priceUsd,
    height: v.height ?? null,
    width: v.width ?? null,
    length: v.length ?? null,
    netWeight: v.netWeight ?? null,
    unitWeight: v.unitWeight ?? null,
    cartonHeight: v.cartonHeight ?? '0',
    cartonWidth: v.cartonWidth ?? '0',
    cartonLength: v.cartonLength ?? '0',
    cartonWeight: v.cartonWeight ?? '0',
    unitsPerCarton: v.unitsPerCarton ?? 1,
    packagingType: v.packagingType ?? null,
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

/**
 * Update product and its variants
 */
export async function updateProduct(
  productId: string,
  orgId: string,
  data: UpdateProductInput
): Promise<ProductWithVariants> {

  console.log('updateProduct data', data);
  
  const rawHsCodeId = data.hsCodeId && data.hsCodeId !== '' ? data.hsCodeId : null;
  const rawSupplierId = data.supplierId && data.supplierId !== '' ? data.supplierId : null;

  await db
    .update(products)
    .set({
      name: data.name,
      styleCode: data.styleCode ?? null,
      description: data.description ?? null,
      photos: data.photos ?? null,
      hsCodeId: rawHsCodeId,
      supplierId: rawSupplierId,
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, productId), eq(products.organizationId, orgId)));

  const existingVariants = await db.query.productVariants.findMany({
    where: eq(productVariants.productId, productId),
  });
  const existingIds = new Set(existingVariants.map((v) => v.id));
  const payloadIds = new Set(
    (data.variants ?? []).filter((v): v is UpdateProductVariantInput & { id: string } => !!v.id).map((v) => v.id)
  );

  const toDelete = existingVariants.filter((v) => !payloadIds.has(v.id));
  if (toDelete.length > 0) {
    await db.delete(productVariants).where(
      inArray(
        productVariants.id,
        toDelete.map((v) => v.id)
      )
    );
  }

  const variantInputs =
    (data.variants ?? []).length > 0
      ? data.variants
      : [{ sku: 'DEFAULT', name: 'Default', priceUsd: '0', unitsPerCarton: 1 }];

  for (const v of variantInputs) {
    const input = v as UpdateProductVariantInput;
    const variantData = {
      sku: input.sku,
      name: input.name,
      priceUsd: input.priceUsd,
      height: input.height ?? null,
      width: input.width ?? null,
      length: input.length ?? null,
      netWeight: input.netWeight ?? null,
      unitWeight: input.unitWeight ?? null,
      cartonHeight: input.cartonHeight ?? '0',
      cartonWidth: input.cartonWidth ?? '0',
      cartonLength: input.cartonLength ?? '0',
      cartonWeight: input.cartonWeight ?? '0',
      unitsPerCarton: input.unitsPerCarton ?? 1,
      packagingType: input.packagingType ?? null,
      attributes: input.attributes ?? null,
      tieredPriceInfo: input.tieredPriceInfo ?? null,
    };

    if (input.id && existingIds.has(input.id)) {
      await db
        .update(productVariants)
        .set(variantData)
        .where(eq(productVariants.id, input.id));
    } else {
      await db.insert(productVariants).values({
        productId,
        organizationId: orgId,
        ...variantData,
      });
    }
  }

  const [result] = await db.query.products.findMany({
    where: eq(products.id, productId),
    with: { variants: true },
  });

  return result as ProductWithVariants;
}

/**
 * Delete product (variants cascade). Fails if product variants are in quote items.
 */
export async function deleteProduct(productId: string, orgId: string): Promise<void> {
  const product = await db.query.products.findFirst({
    where: and(eq(products.id, productId), eq(products.organizationId, orgId)),
    with: { variants: true },
  });

  if (!product) {
    throw new Error('Product not found');
  }

  const variantIds = product.variants.map((v) => v.id);
  if (variantIds.length > 0) {
    const inUse = await db.query.quoteItems.findFirst({
      where: inArray(quoteItems.variantId, variantIds),
    });
    if (inUse) {
      throw new Error('Product is in use in quotes and cannot be deleted');
    }
  }

  await db.delete(products).where(and(eq(products.id, productId), eq(products.organizationId, orgId)));
}

export interface ImportRow {
  sku: string;
  name: string;
  description?: string;
  unitsPerCarton?: number | string;
  cartonHeight?: string;
  cartonWidth?: string;
  cartonLength?: string;
  cartonWeight?: string;
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
        unitsPerCarton: Number(row.unitsPerCarton) || 1,
        cartonHeight: (row.cartonHeight?.trim() || '0').replace(',', '.'),
        cartonWidth: (row.cartonWidth?.trim() || '0').replace(',', '.'),
        cartonLength: (row.cartonLength?.trim() || '0').replace(',', '.'),
        cartonWeight: (row.cartonWeight?.trim() || '0').replace(',', '.'),
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
            unitsPerCarton: variantData.unitsPerCarton,
            cartonHeight: variantData.cartonHeight,
            cartonWidth: variantData.cartonWidth,
            cartonLength: variantData.cartonLength,
            cartonWeight: variantData.cartonWeight,
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
  unitsPerCarton: number;
  cartonHeight: string;
  cartonWidth: string;
  cartonLength: string;
  cartonWeight: string;
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
        unitsPerCarton: v.unitsPerCarton ?? 1,
        cartonHeight: v.cartonHeight ? String(v.cartonHeight) : '',
        cartonWidth: v.cartonWidth ? String(v.cartonWidth) : '',
        cartonLength: v.cartonLength ? String(v.cartonLength) : '',
        cartonWeight: v.cartonWeight ? String(v.cartonWeight) : '',
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
