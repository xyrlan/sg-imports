'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  withAuditTransaction,
  createCurrencyExchangeBroker,
  updateCurrencyExchangeBroker,
  deleteCurrencyExchangeBroker,
} from '@/services/admin';
import { toPlainObject } from '../../action-utils';

const currencyExchangeBrokerSchema = z.object({
  name: z.string().min(1),
});

export async function createCurrencyExchangeBrokerAction(
  prev: unknown,
  formData: FormData,
) {
  try {
    const parsed = currencyExchangeBrokerSchema.safeParse({
      name: formData.get('name'),
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const created = await createCurrencyExchangeBroker(parsed.data, tx);
      await recordAudit({
        tableName: 'currency_exchange_brokers',
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

export async function updateCurrencyExchangeBrokerAction(
  id: string,
  prev: unknown,
  formData: FormData,
) {
  try {
    const parsed = currencyExchangeBrokerSchema.safeParse({
      name: formData.get('name'),
    });
    if (!parsed.success) {
      return { error: 'Dados inválidos', ok: false };
    }

    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.currencyExchangeBrokers.findFirst({
        where: (c, { eq }) => eq(c.id, id),
      });
      if (!oldData) throw new Error('Corretora não encontrada');

      await updateCurrencyExchangeBroker(id, parsed.data, tx);
      await recordAudit({
        tableName: 'currency_exchange_brokers',
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

export async function deleteCurrencyExchangeBrokerAction(id: string) {
  try {
    await withAuditTransaction(async ({ tx, recordAudit }) => {
      const oldData = await tx.query.currencyExchangeBrokers.findFirst({
        where: (c, { eq }) => eq(c.id, id),
      });
      if (!oldData) throw new Error('Corretora não encontrada');

      await deleteCurrencyExchangeBroker(id, tx);
      await recordAudit({
        tableName: 'currency_exchange_brokers',
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
