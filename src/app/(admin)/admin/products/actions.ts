'use server';

import { revalidatePath } from 'next/cache';
import { getSuperAdminUser, requireSuperAdmin } from '@/services/auth.service';
import {
  deleteProductAsAdmin,
  updateHsCode,
  deleteHsCode,
  getAllProducts,
  getAllHsCodes,
} from '@/services/admin';
import { markQuotesForRecalculationByHsCodeId } from '@/services/simulation.service';
import {
  updateProduct,
  type UpdateProductVariantInput,
} from '@/services/product.service';
import { uploadProductPhotos } from '@/services/upload.service';
import { z } from 'zod';

const tieredPriceInfoSchema = z.array(
  z.object({ beginAmount: z.number(), price: z.string() }),
);
const variantAttributesSchema = z.record(z.string(), z.string());
const packagingTypeSchema = z.enum(['BOX', 'PALLET', 'BAG']);

const variantSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  priceUsd: z.string().min(1),
  height: z.string().optional(),
  width: z.string().optional(),
  length: z.string().optional(),
  netWeight: z.string().optional(),
  unitWeight: z.string().optional(),
  cartonHeight: z.string().optional().default('0'),
  cartonWidth: z.string().optional().default('0'),
  cartonLength: z.string().optional().default('0'),
  cartonWeight: z.string().optional().default('0'),
  unitsPerCarton: z.coerce.number().int().min(1).default(1),
  packagingType: packagingTypeSchema.optional(),
  tieredPriceInfo: tieredPriceInfoSchema.optional(),
  attributes: variantAttributesSchema.optional(),
});

const updateProductSchema = z.object({
  organizationId: z.string().uuid(),
  productId: z.string().uuid(),
  name: z.string().min(1),
  styleCode: z.string().optional(),
  description: z.string().optional(),
  hsCodeId: z.string().uuid('NCM é obrigatório'),
  supplierId: z.union([z.string().uuid(), z.literal('')]).optional(),
  variants: z.array(variantSchema),
});

import type { CreateProductState, CreateProductSubmittedData } from '@/app/(dashboard)/dashboard/products/actions';

const updateHsCodeSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  description: z.string().optional(),
  ii: z.string().default('0'),
  ipi: z.string().default('0'),
  pis: z.string().default('0'),
  cofins: z.string().default('0'),
  antidumping: z.string().default('0'),
});

export async function updateProductAsAdminAction(
  _prevState: CreateProductState | null,
  formData: FormData,
): Promise<CreateProductState> {
  try {
    const { user } = await getSuperAdminUser();

    const productId = formData.get('productId') as string;
    const organizationId = formData.get('organizationId') as string;
    if (!productId || !organizationId) {
      return { error: 'Product ID and Organization ID are required' };
    }

    const variantIds = (formData.getAll('variantId') as string[]).filter(Boolean);
    const variantSkus = formData.getAll('variantSku') as string[];
    const variantNames = formData.getAll('variantName') as string[];
    const priceUsds = formData.getAll('priceUsd') as string[];
    const heights = (formData.getAll('variantHeight') as string[]) ?? [];
    const widths = (formData.getAll('variantWidth') as string[]) ?? [];
    const lengths = (formData.getAll('variantLength') as string[]) ?? [];
    const netWeights = (formData.getAll('variantNetWeight') as string[]) ?? [];
    const unitWeights = (formData.getAll('variantUnitWeight') as string[]) ?? [];
    const cartonHeights = (formData.getAll('variantCartonHeight') as string[]) ?? [];
    const cartonWidths = (formData.getAll('variantCartonWidth') as string[]) ?? [];
    const cartonLengths = (formData.getAll('variantCartonLength') as string[]) ?? [];
    const cartonWeights = (formData.getAll('variantCartonWeight') as string[]) ?? [];
    const unitsPerCartons = (formData.getAll('variantUnitsPerCarton') as string[]) ?? [];
    const packagingTypes = (formData.getAll('variantPackagingType') as string[]) ?? [];
    const tieredPriceInfos = (formData.getAll('variantTieredPriceInfo') as string[]) ?? [];
    const attributesList = (formData.getAll('variantAttributes') as string[]) ?? [];

    const parseTieredPriceInfo = (raw: string) => {
      const trimmed = raw?.trim();
      if (!trimmed) return undefined;
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        const result = tieredPriceInfoSchema.safeParse(parsed);
        return result.success ? result.data : undefined;
      } catch {
        return undefined;
      }
    };
    const parseAttributes = (raw: string) => {
      const trimmed = raw?.trim();
      if (!trimmed) return undefined;
      try {
        const parsed = JSON.parse(trimmed) as unknown;
        const result = variantAttributesSchema.safeParse(parsed);
        return result.success ? result.data : undefined;
      } catch {
        return undefined;
      }
    };

    const rawVariants = variantNames.map((name, i) => ({
      id: variantIds[i]?.trim() || undefined,
      sku: (variantSkus[i] ?? '').trim(),
      name: (name ?? '').trim(),
      priceUsd: (priceUsds[i] ?? '').trim(),
      height: (heights[i] ?? '').trim() || undefined,
      width: (widths[i] ?? '').trim() || undefined,
      length: (lengths[i] ?? '').trim() || undefined,
      netWeight: (netWeights[i] ?? '').trim() || undefined,
      unitWeight: (unitWeights[i] ?? '').trim() || undefined,
      cartonHeight: (cartonHeights[i] ?? '').trim() || '0',
      cartonWidth: (cartonWidths[i] ?? '').trim() || '0',
      cartonLength: (cartonLengths[i] ?? '').trim() || '0',
      cartonWeight: (cartonWeights[i] ?? '').trim() || '0',
      unitsPerCarton: unitsPerCartons[i] ? parseInt(unitsPerCartons[i], 10) : 1,
      packagingType: (packagingTypes[i] ?? '').trim() || undefined,
      tieredPriceInfo: parseTieredPriceInfo(tieredPriceInfos[i] ?? ''),
      attributes: parseAttributes(attributesList[i] ?? ''),
    }));

    const variants =
      rawVariants.filter((v) => v.sku || v.name || v.priceUsd).length > 0
        ? rawVariants.filter((v) => v.sku || v.name || v.priceUsd)
        : [{ id: undefined, sku: 'DEFAULT', name: 'Default', priceUsd: '0', unitsPerCarton: 1 }];

    const existingPhotosRaw = formData.get('existingPhotos') as string | null;
    let existingPhotos: string[] = [];
    if (existingPhotosRaw?.trim()) {
      try {
        const parsed = JSON.parse(existingPhotosRaw) as unknown;
        existingPhotos = Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : [];
      } catch {
        /* ignore */
      }
    }

    const photoEntries = formData.getAll('photos');
    const photoFiles = photoEntries
      .filter((e): e is File => e instanceof File)
      .filter((f) => f.size > 0 && f.type?.startsWith('image/'));

    const rawData = {
      organizationId,
      productId,
      name: (formData.get('name') as string)?.trim(),
      styleCode: (formData.get('styleCode') as string)?.trim() || undefined,
      description: (formData.get('description') as string)?.trim() || undefined,
      hsCodeId: (formData.get('hsCodeId') as string)?.trim() || undefined,
      supplierId: (formData.get('supplierId') as string)?.trim() || undefined,
      variants,
    };

    const validated = updateProductSchema.safeParse({
      ...rawData,
      variants: rawVariants.map((v) => ({
        sku: v.sku,
        name: v.name,
        priceUsd: v.priceUsd,
        height: v.height,
        width: v.width,
        length: v.length,
        netWeight: v.netWeight,
        unitWeight: v.unitWeight,
        cartonHeight: v.cartonHeight ?? '0',
        cartonWidth: v.cartonWidth ?? '0',
        cartonLength: v.cartonLength ?? '0',
        cartonWeight: v.cartonWeight ?? '0',
        unitsPerCarton: v.unitsPerCarton ?? 1,
        packagingType: v.packagingType as 'BOX' | 'PALLET' | 'BAG' | undefined,
        tieredPriceInfo: v.tieredPriceInfo,
        attributes: v.attributes,
      })),
    });

    if (!validated.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validated.error.issues) {
        const path = issue.path.map(String).join('.');
        if (path && path !== 'productId' && !fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      const submittedData: CreateProductSubmittedData = {
        name: rawData.name ?? '',
        styleCode: rawData.styleCode ?? '',
        description: rawData.description ?? '',
        hsCodeId: rawData.hsCodeId ?? '',
        supplierId: rawData.supplierId ?? '',
        variants: rawVariants.map((v) => ({
          sku: v.sku,
          name: v.name,
          priceUsd: v.priceUsd,
          height: v.height ?? '',
          width: v.width ?? '',
          length: v.length ?? '',
          netWeight: v.netWeight ?? '',
          unitWeight: v.unitWeight ?? '',
          cartonHeight: v.cartonHeight ?? '0',
          cartonWidth: v.cartonWidth ?? '0',
          cartonLength: v.cartonLength ?? '0',
          cartonWeight: v.cartonWeight ?? '0',
          unitsPerCarton: String(v.unitsPerCarton ?? 1),
          packagingType: v.packagingType ?? '',
        })),
      };
      return { fieldErrors, submittedData };
    }

    let newPhotoUrls: string[] = [];
    if (photoFiles.length > 0) {
      newPhotoUrls = await uploadProductPhotos(
        photoFiles,
        user.id,
        organizationId,
      );
    }
    const photoUrls = [...existingPhotos, ...newPhotoUrls];

    const rawHsCodeId = validated.data.hsCodeId;
    const rawSupplierId = validated.data.supplierId;
    const hsCodeId =
      rawHsCodeId && rawHsCodeId !== '' && rawHsCodeId !== '__none__'
        ? rawHsCodeId
        : undefined;
    const supplierId =
      rawSupplierId && rawSupplierId !== '' && rawSupplierId !== '__none__'
        ? rawSupplierId
        : undefined;

    const variantInputs: UpdateProductVariantInput[] = variants.map((v) => {
      const vv = v as {
        id?: string;
        sku: string;
        name: string;
        priceUsd: string;
        cartonHeight?: string;
        cartonWidth?: string;
        cartonLength?: string;
        cartonWeight?: string;
        unitsPerCarton?: number;
        height?: string;
        width?: string;
        length?: string;
        netWeight?: string;
        unitWeight?: string;
        packagingType?: string;
        tieredPriceInfo?: { beginAmount: number; price: string }[];
        attributes?: Record<string, string>;
      };
      const pt = vv.packagingType as 'BOX' | 'PALLET' | 'BAG' | undefined;
      const validPt = pt && ['BOX', 'PALLET', 'BAG'].includes(pt) ? pt : null;
      return {
        id: vv.id,
        sku: vv.sku,
        name: vv.name,
        priceUsd: vv.priceUsd.replace(',', '.'),
        cartonHeight: (vv.cartonHeight ?? '0').replace(',', '.'),
        cartonWidth: (vv.cartonWidth ?? '0').replace(',', '.'),
        cartonLength: (vv.cartonLength ?? '0').replace(',', '.'),
        cartonWeight: (vv.cartonWeight ?? '0').replace(',', '.'),
        unitsPerCarton: vv.unitsPerCarton ?? 1,
        height: vv.height?.replace(',', '.') || undefined,
        width: vv.width?.replace(',', '.') || undefined,
        length: vv.length?.replace(',', '.') || undefined,
        netWeight: vv.netWeight?.replace(',', '.') || undefined,
        unitWeight: vv.unitWeight?.replace(',', '.') || undefined,
        packagingType: validPt,
        tieredPriceInfo: vv.tieredPriceInfo,
        attributes: vv.attributes,
      };
    });

    await updateProduct(productId, organizationId, {
      name: validated.data.name,
      styleCode: validated.data.styleCode,
      description: validated.data.description,
      photos: photoUrls.length > 0 ? photoUrls : undefined,
      hsCodeId,
      supplierId,
      variants: variantInputs,
    });

    revalidatePath('/admin/products');
    revalidatePath(`/admin/products/${productId}`);
    return { success: true };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    return {
      error: err instanceof Error ? err.message : 'Failed to update product',
    };
  }
}

export interface DeleteProductResult {
  success?: boolean;
  error?: string;
}

export async function deleteProductAsAdminAction(
  productId: string,
): Promise<DeleteProductResult> {
  try {
    await requireSuperAdmin();
    await deleteProductAsAdmin(productId);
    revalidatePath('/admin/products');
    return { success: true };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    return {
      error: err instanceof Error ? err.message : 'Failed to delete product',
    };
  }
}

export interface UpdateHsCodeResult {
  ok?: boolean;
  error?: string;
}

export async function updateHsCodeAction(
  hsCodeId: string,
  _prev: unknown,
  formData: FormData,
): Promise<UpdateHsCodeResult> {
  try {
    await requireSuperAdmin();

    const raw = {
      code: formData.get('code')?.toString() ?? '',
      description: formData.get('description')?.toString() ?? undefined,
      ii: formData.get('ii')?.toString()?.replace(',', '.') ?? '0',
      ipi: formData.get('ipi')?.toString()?.replace(',', '.') ?? '0',
      pis: formData.get('pis')?.toString()?.replace(',', '.') ?? '0',
      cofins: formData.get('cofins')?.toString()?.replace(',', '.') ?? '0',
      antidumping: formData.get('antidumping')?.toString()?.replace(',', '.') ?? '0',
    };

    const parsed = updateHsCodeSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid data', ok: false };
    }

    await updateHsCode(hsCodeId, parsed.data);
    await markQuotesForRecalculationByHsCodeId(hsCodeId);
    revalidatePath('/admin/products');
    return { ok: true };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    return {
      error: err instanceof Error ? err.message : 'Failed to update NCM',
      ok: false,
    };
  }
}

export interface DeleteHsCodeResult {
  success?: boolean;
  error?: string;
}

export async function deleteHsCodeAction(
  hsCodeId: string,
): Promise<DeleteHsCodeResult> {
  try {
    await requireSuperAdmin();
    await deleteHsCode(hsCodeId);
    revalidatePath('/admin/products');
    return { success: true };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    return {
      error: err instanceof Error ? err.message : 'Failed to delete NCM',
    };
  }
}

// ============================================
// Paginated Fetch Actions
// ============================================

const paginationParamsSchema = z.object({
  page: z.number().int().min(0),
  pageSize: z.number().int().min(1).max(100),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export async function fetchProductsAction(params: unknown) {
  await requireSuperAdmin();
  const validated = paginationParamsSchema.parse(params);
  return getAllProducts(validated);
}

export async function fetchHsCodesAction(params: unknown) {
  await requireSuperAdmin();
  const validated = paginationParamsSchema.parse(params);
  return getAllHsCodes(validated);
}
