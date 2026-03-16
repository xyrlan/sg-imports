'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  withAuditTransaction,
  createPort,
  updatePort,
  deletePort,
} from '@/services/admin';
import { toPlainObject } from '../../action-utils';

const portSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  country: z.string().min(1),
  type: z.enum(['PORT', 'AIRPORT']).default('PORT'),
});

export async function createPortAction(prev: unknown, formData: FormData) {
  try {
    const parsed = portSchema.safeParse({
      name: formData.get('name'),
      code: formData.get('code'),
      country: formData.get('country'),
      type: formData.get('type') || 'PORT',
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const created = await createPort(parsed.data, tx);
      await recordAudit({
        tableName: 'ports',
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

export async function updatePortAction(
  id: string,
  prev: unknown,
  formData: FormData,
) {
  try {
    const parsed = portSchema.safeParse({
      name: formData.get('name'),
      code: formData.get('code'),
      country: formData.get('country'),
      type: formData.get('type') || 'PORT',
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.ports.findFirst({
        where: (p, { eq }) => eq(p.id, id),
      });
      if (!oldData) throw new Error('Porto não encontrado');

      await updatePort(id, parsed.data, tx);
      await recordAudit({
        tableName: 'ports',
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

export async function deletePortAction(id: string) {
  try {
    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.ports.findFirst({
        where: (p, { eq }) => eq(p.id, id),
      });
      if (!oldData) throw new Error('Porto não encontrado');

      await deletePort(id, tx);
      await recordAudit({
        tableName: 'ports',
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
