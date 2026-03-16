'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  withAuditTransaction,
  createTerminal,
  updateTerminal,
  deleteTerminal,
} from '@/services/admin';
import { toPlainObject } from '../../action-utils';

const terminalSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional(),
});

export async function createTerminalAction(prev: unknown, formData: FormData) {
  try {
    const parsed = terminalSchema.safeParse({
      name: formData.get('name'),
      code: formData.get('code') || undefined,
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const created = await createTerminal(parsed.data, tx);
      await recordAudit({
        tableName: 'terminals',
        entityId: created.id,
        action: 'CREATE',
        newValues: toPlainObject(created),
      });
    });
    revalidatePath('/admin/settings');
    revalidatePath('/admin/settings/terminals');
    return { ok: true };
  } catch {
    return { error: 'Erro ao criar', ok: false };
  }
}

export async function updateTerminalAction(
  id: string,
  prev: unknown,
  formData: FormData,
) {
  try {
    const parsed = terminalSchema.safeParse({
      name: formData.get('name'),
      code: formData.get('code') || undefined,
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.terminals.findFirst({
        where: (t, { eq }) => eq(t.id, id),
      });
      if (!oldData) throw new Error('Terminal não encontrado');

      await updateTerminal(id, parsed.data, tx);
      await recordAudit({
        tableName: 'terminals',
        entityId: id,
        action: 'UPDATE',
        oldValues: toPlainObject(oldData),
        newValues: parsed.data,
      });
    });
    revalidatePath('/admin/settings');
    revalidatePath('/admin/settings/terminals');
    revalidatePath(`/admin/settings/terminals/${id}`);
    return { ok: true };
  } catch {
    return { error: 'Erro ao atualizar', ok: false };
  }
}

export async function deleteTerminalAction(id: string) {
  try {
    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.terminals.findFirst({
        where: (t, { eq }) => eq(t.id, id),
      });
      if (!oldData) throw new Error('Terminal não encontrado');

      await deleteTerminal(id, tx);
      await recordAudit({
        tableName: 'terminals',
        entityId: id,
        action: 'DELETE',
        oldValues: toPlainObject(oldData),
      });
    });
    revalidatePath('/admin/settings');
    revalidatePath('/admin/settings/terminals');
    return { ok: true };
  } catch {
    return { error: 'Erro ao excluir', ok: false };
  }
}
