'use server';

import { revalidatePath } from 'next/cache';
import { requireSuperAdmin } from '@/services/auth.service';
import {
  syncCarriersFromShipsGo,
  getCarriersPaginated,
  getCarrierById,
} from '@/services/admin';

const CARRIERS_PAGE_SIZE = 20;

export async function syncCarriersFromShipsGoAction() {
  try {
    await requireSuperAdmin();
    const result = await syncCarriersFromShipsGo();
    revalidatePath('/admin/settings');
    return {
      ok: true,
      inserted: result.inserted,
      updated: result.updated,
      errors: result.errors,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro ao sincronizar',
    };
  }
}

export async function searchCarriersAction(
  limit: number = CARRIERS_PAGE_SIZE,
  offset: number = 0,
  search?: string
) {
  try {
    await requireSuperAdmin();
    const items = await getCarriersPaginated(limit, offset, search);
    return { items, ok: true };
  } catch {
    return { items: [], ok: false };
  }
}

export async function getCarrierByIdAction(id: string) {
  try {
    await requireSuperAdmin();
    const carrier = await getCarrierById(id);
    return { carrier, ok: true };
  } catch {
    return { carrier: null, ok: false };
  }
}
