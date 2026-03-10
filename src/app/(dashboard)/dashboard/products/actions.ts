'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { hsCodes, suppliers } from '@/db/schema';
import { requireAuthAndOrg, requireAuthOrRedirect } from '@/services/auth.service';
import { getOrganizationById } from '@/services/organization.service';
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierById,
} from '@/services/admin';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  type UpdateProductVariantInput,
} from '@/services/product.service';
import { uploadProductPhotos } from '@/services/upload.service';

const tieredPriceInfoSchema = z.array(
  z.object({ beginAmount: z.number(), price: z.string() })
);
const variantAttributesSchema = z.record(z.string(), z.string());

const packagingTypeSchema = z.enum(['BOX', 'PALLET', 'BAG']);

const variantSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Variant name is required'),
  priceUsd: z.string().min(1, 'Price is required'),
  height: z.string().optional(),
  width: z.string().optional(),
  length: z.string().optional(),
  netWeight: z.string().optional(),
  unitWeight: z.string().optional(),
  cartonHeight: z.string().optional().default('0'),
  cartonWidth: z.string().optional().default('0'),
  cartonLength: z.string().optional().default('0'),
  cartonWeight: z.string().optional().default('0'),
  unitsPerCarton: z.coerce.number().int().min(1, 'Units per carton must be at least 1').default(1),
  packagingType: packagingTypeSchema.optional(),
  tieredPriceInfo: tieredPriceInfoSchema.optional(),
  attributes: variantAttributesSchema.optional(),
});

const createProductSchema = z.object({
  organizationId: z.string().uuid('Invalid organization'),
  name: z.string().min(1, 'Name is required'),
  styleCode: z.string().optional(),
  description: z.string().optional(),
  hsCodeId: z.string().uuid('NCM é obrigatório'),
  supplierId: z.union([z.string().uuid(), z.literal('')]).optional(),
  variants: z.array(variantSchema),
});

const updateProductSchema = createProductSchema.extend({
  productId: z.string().uuid('Product ID is required'),
});

export interface CreateProductSubmittedData {
  name: string;
  styleCode: string;
  description: string;
  hsCodeId: string;
  supplierId: string;
  variants: Array<{
    sku: string;
    name: string;
    priceUsd: string;
    height: string;
    width: string;
    length: string;
    netWeight: string;
    unitWeight: string;
    cartonHeight: string;
    cartonWidth: string;
    cartonLength: string;
    cartonWeight: string;
    unitsPerCarton: string;
    packagingType: string;
  }>;
}

export interface CreateProductState {
  error?: string;
  fieldErrors?: Record<string, string>;
  submittedData?: CreateProductSubmittedData;
  success?: boolean;
}

export async function createProductAction(
  _prevState: CreateProductState | null,
  formData: FormData
): Promise<CreateProductState> {
  try {
    const user = await requireAuthOrRedirect();

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
        : [{ sku: 'DEFAULT', name: 'Default', priceUsd: '0', unitsPerCarton: 1 }];

    const photoEntries = formData.getAll('photos');
    const photoFiles = photoEntries
      .filter((e): e is File => e instanceof File)
      .filter((f) => f.size > 0 && f.type?.startsWith('image/'));

    const rawData = {
      organizationId: formData.get('organizationId') as string,
      name: (formData.get('name') as string)?.trim(),
      styleCode: (formData.get('styleCode') as string)?.trim() || undefined,
      description: (formData.get('description') as string)?.trim() || undefined,
      hsCodeId: (formData.get('hsCodeId') as string)?.trim() || undefined,
      supplierId: (formData.get('supplierId') as string)?.trim() || undefined,
      variants,
    };

    const validated = createProductSchema.safeParse(rawData);
    if (!validated.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validated.error.issues) {
        const path = issue.path.map(String).join('.');
        if (path && !fieldErrors[path]) {
          fieldErrors[path] = issue.message;
        }
      }
      const error = fieldErrors.organizationId ?? undefined;
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
          unitsPerCarton: v.unitsPerCarton ? String(v.unitsPerCarton) : '1',
          packagingType: v.packagingType ?? '',
        })),
      };
      return { fieldErrors, submittedData, ...(error && { error }) };
    }

    const access = await getOrganizationById(validated.data.organizationId, user.id);
    if (!access) {
      return { error: 'Forbidden' };
    }

    let photoUrls: string[] = [];
    if (photoFiles.length > 0) {
      photoUrls = await uploadProductPhotos(
        photoFiles,
        user.id,
        validated.data.organizationId
      );
    }

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

    await createProduct(validated.data.organizationId, {
      name: validated.data.name,
      styleCode: validated.data.styleCode,
      description: validated.data.description,
      photos: photoUrls.length > 0 ? photoUrls : undefined,
      hsCodeId,
      supplierId,
      variants: (validated.data.variants ?? []).map((v) => ({
        sku: v.sku,
        name: v.name,
        priceUsd: v.priceUsd.replace(',', '.'),
        cartonHeight: (v.cartonHeight ?? '0').replace(',', '.'),
        cartonWidth: (v.cartonWidth ?? '0').replace(',', '.'),
        cartonLength: (v.cartonLength ?? '0').replace(',', '.'),
        cartonWeight: (v.cartonWeight ?? '0').replace(',', '.'),
        unitsPerCarton: v.unitsPerCarton ?? 1,
        height: v.height?.replace(',', '.') || undefined,
        width: v.width?.replace(',', '.') || undefined,
        length: v.length?.replace(',', '.') || undefined,
        netWeight: v.netWeight?.replace(',', '.') || undefined,
        unitWeight: v.unitWeight?.replace(',', '.') || undefined,
        tieredPriceInfo: v.tieredPriceInfo,
        attributes: v.attributes,
      })),
    });

    return { success: true };
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    return {
      error: err instanceof Error ? err.message : 'Failed to create product',
    };
  }
}

export async function updateProductAction(
  _prevState: CreateProductState | null,
  formData: FormData
): Promise<CreateProductState> {
  try {
    const user = await requireAuthOrRedirect();

    const productId = formData.get('productId') as string;
    if (!productId) {
      return { error: 'Product ID is required' };
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

    const rawVariants: Array<{
      id?: string;
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
      packagingType?: string;
      tieredPriceInfo?: { beginAmount: number; price: string }[];
      attributes?: Record<string, string>;
    }> = variantNames.map((name, i) => ({
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
      organizationId: formData.get('organizationId') as string,
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
        unitsPerCarton: v.unitsPerCarton ? String(v.unitsPerCarton) : '1',
        packagingType: v.packagingType ?? '',
      })),
    };
    return { fieldErrors, submittedData };
    }

    const access = await getOrganizationById(validated.data.organizationId, user.id);
    if (!access) {
      return { error: 'Forbidden' };
    }

    let newPhotoUrls: string[] = [];
    if (photoFiles.length > 0) {
      newPhotoUrls = await uploadProductPhotos(
        photoFiles,
        user.id,
        validated.data.organizationId
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

    const variantInputs: UpdateProductVariantInput[] = variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      name: v.name,
      priceUsd: v.priceUsd.replace(',', '.'),
      cartonHeight: (v.cartonHeight ?? '0').replace(',', '.'),
      cartonWidth: (v.cartonWidth ?? '0').replace(',', '.'),
      cartonLength: (v.cartonLength ?? '0').replace(',', '.'),
      cartonWeight: (v.cartonWeight ?? '0').replace(',', '.'),
      unitsPerCarton: v.unitsPerCarton ?? 1,
      height: v.height?.replace(',', '.') || undefined,
      width: v.width?.replace(',', '.') || undefined,
      length: v.length?.replace(',', '.') || undefined,
      netWeight: v.netWeight?.replace(',', '.') || undefined,
      unitWeight: v.unitWeight?.replace(',', '.') || undefined,
      tieredPriceInfo: v.tieredPriceInfo,
      attributes: v.attributes,
    }));

    await updateProduct(productId, validated.data.organizationId, {
      name: validated.data.name,
      styleCode: validated.data.styleCode,
      description: validated.data.description,
      photos: photoUrls.length > 0 ? photoUrls : undefined,
      hsCodeId,
      supplierId,
      variants: variantInputs,
    });

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

export async function deleteProductAction(
  productId: string,
  organizationId: string
): Promise<DeleteProductResult> {
  try {
    const user = await requireAuthOrRedirect();

    const access = await getOrganizationById(organizationId, user.id);
    if (!access) {
      return { error: 'Forbidden' };
    }

    await deleteProduct(productId, organizationId);
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

export async function getProductFormOptions(organizationId: string) {
  const [hsCodesList, suppliersList] = await Promise.all([
    db.select({ id: hsCodes.id, code: hsCodes.code }).from(hsCodes).orderBy(hsCodes.code),
    db
      .select({ id: suppliers.id, name: suppliers.name })
      .from(suppliers)
      .where(eq(suppliers.organizationId, organizationId))
      .orderBy(suppliers.name),
  ]);
  return { hsCodes: hsCodesList, suppliers: suppliersList };
}

// ============================================
// Supplier actions (dashboard)
// ============================================

const supplierSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  taxId: z.string().optional(),
  countryCode: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
});

export async function createSupplierAction(prev: unknown, formData: FormData) {
  try {
    const { activeOrgId } = await requireAuthAndOrg();

    const parsed = supplierSchema.safeParse({
      organizationId: formData.get('organizationId'),
      name: formData.get('name'),
      taxId: formData.get('taxId') || undefined,
      countryCode: formData.get('countryCode') || undefined,
      email: formData.get('email') || undefined,
      address: formData.get('address') || undefined,
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }
    if (parsed.data.organizationId !== activeOrgId) {
      return { error: 'Forbidden', ok: false };
    }

    await createSupplier({
      ...parsed.data,
      taxId: parsed.data.taxId || null,
      countryCode: parsed.data.countryCode || null,
      email: parsed.data.email || null,
      address: parsed.data.address || null,
    });
    revalidatePath('/dashboard/products');
    return { ok: true };
  } catch {
    return { error: 'Erro ao criar', ok: false };
  }
}

export async function updateSupplierAction(
  id: string,
  prev: unknown,
  formData: FormData,
) {
  try {
    const { activeOrgId } = await requireAuthAndOrg();

    const existing = await getSupplierById(id);
    if (!existing || existing.organizationId !== activeOrgId) {
      return { error: 'Fornecedor não encontrado', ok: false };
    }

    const parsed = z
      .object({
        name: z.string().min(1),
        taxId: z.string().optional(),
        countryCode: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
      })
      .safeParse({
        name: formData.get('name'),
        taxId: formData.get('taxId') || undefined,
        countryCode: formData.get('countryCode') || undefined,
        email: formData.get('email') || undefined,
        address: formData.get('address') || undefined,
      });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await updateSupplier(id, {
      ...parsed.data,
      taxId: parsed.data.taxId ?? null,
      countryCode: parsed.data.countryCode ?? null,
      email: parsed.data.email ?? null,
      address: parsed.data.address ?? null,
    });
    revalidatePath('/dashboard/products');
    return { ok: true };
  } catch {
    return { error: 'Erro ao atualizar', ok: false };
  }
}

export async function deleteSupplierAction(id: string) {
  try {
    const { activeOrgId } = await requireAuthAndOrg();

    const existing = await getSupplierById(id);
    if (!existing || existing.organizationId !== activeOrgId) {
      return { error: 'Fornecedor não encontrado', ok: false };
    }

    await deleteSupplier(id);
    revalidatePath('/dashboard/products');
    return { ok: true };
  } catch {
    return { error: 'Erro ao excluir', ok: false };
  }
}
