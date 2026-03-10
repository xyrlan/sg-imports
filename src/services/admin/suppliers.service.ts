/**
 * Admin Suppliers Service — CRUD for suppliers and sub-suppliers
 */

import { db } from '@/db';
import { suppliers, subSuppliers } from '@/db/schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { eq, asc } from 'drizzle-orm';
import type { DbTransaction } from './audit.service';

type DbOrTx = typeof db | DbTransaction;

// ============================================
// Types
// ============================================

export type Supplier = InferSelectModel<typeof suppliers>;
export type SubSupplier = InferSelectModel<typeof subSuppliers>;

export interface SupplierWithSubSuppliers extends Supplier {
  subSuppliers: SubSupplier[];
}

export interface CreateSupplierData {
  organizationId: string;
  name: string;
  taxId?: string | null;
  countryCode?: string | null;
  email?: string | null;
  address?: string | null;
  siscomexId?: string | null;
}

export interface UpdateSupplierData {
  name?: string;
  taxId?: string | null;
  countryCode?: string | null;
  email?: string | null;
  address?: string | null;
  siscomexId?: string | null;
}

export interface CreateSubSupplierData {
  supplierId: string;
  name: string;
  taxId?: string | null;
  countryCode?: string | null;
  email?: string | null;
  address?: string | null;
  siscomexId?: string | null;
}

export interface UpdateSubSupplierData {
  name?: string;
  taxId?: string | null;
  countryCode?: string | null;
  email?: string | null;
  address?: string | null;
  siscomexId?: string | null;
}

// ============================================
// Suppliers
// ============================================

export async function getAllSuppliers(
  organizationId?: string,
  client: DbOrTx = db,
): Promise<Supplier[]> {
  if (!organizationId) return [];
  return client
    .select()
    .from(suppliers)
    .where(eq(suppliers.organizationId, organizationId))
    .orderBy(asc(suppliers.name));
}

export async function getSupplierById(id: string, client: DbOrTx = db): Promise<Supplier | null> {
  const [row] = await client.select().from(suppliers).where(eq(suppliers.id, id));
  return row ?? null;
}

export async function getSupplierWithSubSuppliers(
  id: string,
  client: DbOrTx = db,
): Promise<SupplierWithSubSuppliers | null> {
  const supplier = await getSupplierById(id, client);
  if (!supplier) return null;

  const subSuppliersList = await client
    .select()
    .from(subSuppliers)
    .where(eq(subSuppliers.supplierId, id))
    .orderBy(asc(subSuppliers.name));

  return { ...supplier, subSuppliers: subSuppliersList };
}

export async function createSupplier(
  data: CreateSupplierData,
  client: DbOrTx = db,
): Promise<Supplier> {
  const [inserted] = await client
    .insert(suppliers)
    .values({
      organizationId: data.organizationId,
      name: data.name,
      taxId: data.taxId ?? null,
      countryCode: data.countryCode ?? 'CN',
      email: data.email ?? null,
      address: data.address ?? null,
      siscomexId: data.siscomexId ?? null,
    } as InferInsertModel<typeof suppliers>)
    .returning();
  return inserted!;
}

export async function updateSupplier(
  id: string,
  data: UpdateSupplierData,
  client: DbOrTx = db,
): Promise<Supplier | null> {
  const [updated] = await client
    .update(suppliers)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.taxId !== undefined && { taxId: data.taxId }),
      ...(data.countryCode !== undefined && { countryCode: data.countryCode }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.siscomexId !== undefined && { siscomexId: data.siscomexId }),
    })
    .where(eq(suppliers.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteSupplier(id: string, client: DbOrTx = db): Promise<boolean> {
  const deleted = await client.delete(suppliers).where(eq(suppliers.id, id)).returning();
  return deleted.length > 0;
}

// ============================================
// Sub-suppliers
// ============================================

export async function createSubSupplier(
  data: CreateSubSupplierData,
  client: DbOrTx = db,
): Promise<SubSupplier> {
  const [inserted] = await client
    .insert(subSuppliers)
    .values({
      supplierId: data.supplierId,
      name: data.name,
      taxId: data.taxId ?? null,
      countryCode: data.countryCode ?? 'CN',
      email: data.email ?? null,
      address: data.address ?? null,
      siscomexId: data.siscomexId ?? null,
    } as InferInsertModel<typeof subSuppliers>)
    .returning();
  return inserted!;
}

export async function updateSubSupplier(
  id: string,
  data: UpdateSubSupplierData,
  client: DbOrTx = db,
): Promise<SubSupplier | null> {
  const [updated] = await client
    .update(subSuppliers)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.taxId !== undefined && { taxId: data.taxId }),
      ...(data.countryCode !== undefined && { countryCode: data.countryCode }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.siscomexId !== undefined && { siscomexId: data.siscomexId }),
    })
    .where(eq(subSuppliers.id, id))
    .returning();
  return updated ?? null;
}

export async function deleteSubSupplier(id: string, client: DbOrTx = db): Promise<boolean> {
  const deleted = await client.delete(subSuppliers).where(eq(subSuppliers.id, id)).returning();
  return deleted.length > 0;
}
