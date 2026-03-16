'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAuthAndOrg } from '@/services/auth.service';
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierById,
} from '@/services/admin';

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
