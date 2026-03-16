'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  withAuditTransaction,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  createSubSupplier,
  updateSubSupplier,
  deleteSubSupplier,
} from '@/services/admin';
import { toPlainObject } from '../../action-utils';

const supplierSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1),
  taxId: z.string().optional(),
  countryCode: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  siscomexId: z.string().optional(),
});

export async function createSupplierAction(prev: unknown, formData: FormData) {
  try {
    const parsed = supplierSchema.safeParse({
      organizationId: formData.get('organizationId'),
      name: formData.get('name'),
      taxId: formData.get('taxId') || undefined,
      countryCode: formData.get('countryCode') || undefined,
      email: formData.get('email') || undefined,
      address: formData.get('address') || undefined,
      siscomexId: formData.get('siscomexId') || undefined,
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const created = await createSupplier(
        {
          ...parsed.data,
          taxId: parsed.data.taxId || null,
          countryCode: parsed.data.countryCode || null,
          email: parsed.data.email || null,
          address: parsed.data.address || null,
          siscomexId: parsed.data.siscomexId || null,
        },
        tx,
      );
      await recordAudit({
        tableName: 'suppliers',
        entityId: created.id,
        action: 'CREATE',
        newValues: toPlainObject(created),
      });
    });
    revalidatePath('/admin/settings');
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
    const parsed = z
      .object({
        name: z.string().min(1),
        taxId: z.string().optional(),
        countryCode: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        siscomexId: z.string().optional(),
      })
      .safeParse({
        name: formData.get('name'),
        taxId: formData.get('taxId') || undefined,
        countryCode: formData.get('countryCode') || undefined,
        email: formData.get('email') || undefined,
        address: formData.get('address') || undefined,
        siscomexId: formData.get('siscomexId') || undefined,
      });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.suppliers.findFirst({
        where: (s, { eq }) => eq(s.id, id),
      });
      if (!oldData) throw new Error('Fornecedor não encontrado');

      await updateSupplier(
        id,
        {
          ...parsed.data,
          taxId: parsed.data.taxId ?? null,
          countryCode: parsed.data.countryCode ?? null,
          email: parsed.data.email ?? null,
          address: parsed.data.address ?? null,
          siscomexId: parsed.data.siscomexId ?? null,
        },
        tx,
      );
      await recordAudit({
        tableName: 'suppliers',
        entityId: id,
        action: 'UPDATE',
        oldValues: toPlainObject(oldData),
        newValues: parsed.data,
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao atualizar', ok: false };
  }
}

export async function deleteSupplierAction(id: string) {
  try {
    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.suppliers.findFirst({
        where: (s, { eq }) => eq(s.id, id),
      });
      if (!oldData) throw new Error('Fornecedor não encontrado');

      await deleteSupplier(id, tx);
      await recordAudit({
        tableName: 'suppliers',
        entityId: id,
        action: 'DELETE',
        oldValues: toPlainObject(oldData),
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao excluir', ok: false };
  }
}

// ============================================
// Sub-suppliers
// ============================================

const subSupplierSchema = z.object({
  supplierId: z.string().uuid(),
  name: z.string().min(1),
  taxId: z.string().optional(),
  countryCode: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  siscomexId: z.string().optional(),
});

export async function createSubSupplierAction(prev: unknown, formData: FormData) {
  try {
    const parsed = subSupplierSchema.safeParse({
      supplierId: formData.get('supplierId'),
      name: formData.get('name'),
      taxId: formData.get('taxId') || undefined,
      countryCode: formData.get('countryCode') || undefined,
      email: formData.get('email') || undefined,
      address: formData.get('address') || undefined,
      siscomexId: formData.get('siscomexId') || undefined,
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const created = await createSubSupplier(
        {
          ...parsed.data,
          taxId: parsed.data.taxId || null,
          countryCode: parsed.data.countryCode || null,
          email: parsed.data.email || null,
          address: parsed.data.address || null,
          siscomexId: parsed.data.siscomexId || null,
        },
        tx,
      );
      await recordAudit({
        tableName: 'sub_suppliers',
        entityId: created.id,
        action: 'CREATE',
        newValues: toPlainObject(created),
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao criar', ok: false };
  }
}

export async function updateSubSupplierAction(
  id: string,
  prev: unknown,
  formData: FormData,
) {
  try {
    const parsed = z
      .object({
        name: z.string().min(1),
        taxId: z.string().optional(),
        countryCode: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        siscomexId: z.string().optional(),
      })
      .safeParse({
        name: formData.get('name'),
        taxId: formData.get('taxId') || undefined,
        countryCode: formData.get('countryCode') || undefined,
        email: formData.get('email') || undefined,
        address: formData.get('address') || undefined,
        siscomexId: formData.get('siscomexId') || undefined,
      });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.subSuppliers.findFirst({
        where: (s, { eq }) => eq(s.id, id),
      });
      if (!oldData) throw new Error('Sub-fornecedor não encontrado');

      await updateSubSupplier(
        id,
        {
          ...parsed.data,
          taxId: parsed.data.taxId ?? null,
          countryCode: parsed.data.countryCode ?? null,
          email: parsed.data.email ?? null,
          address: parsed.data.address ?? null,
          siscomexId: parsed.data.siscomexId ?? null,
        },
        tx,
      );
      await recordAudit({
        tableName: 'sub_suppliers',
        entityId: id,
        action: 'UPDATE',
        oldValues: toPlainObject(oldData),
        newValues: parsed.data,
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao atualizar', ok: false };
  }
}

export async function deleteSubSupplierAction(id: string) {
  try {
    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.subSuppliers.findFirst({
        where: (s, { eq }) => eq(s.id, id),
      });
      if (!oldData) throw new Error('Sub-fornecedor não encontrado');

      await deleteSubSupplier(id, tx);
      await recordAudit({
        tableName: 'sub_suppliers',
        entityId: id,
        action: 'DELETE',
        oldValues: toPlainObject(oldData),
      });
    });
    revalidatePath('/admin/settings');
    return { ok: true };
  } catch {
    return { error: 'Erro ao excluir', ok: false };
  }
}
