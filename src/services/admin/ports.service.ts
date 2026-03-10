/**
 * Admin Ports Service — CRUD for ports (UN/LOCODE)
 */

import { db } from '@/db';
import { ports } from '@/db/schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { eq, asc } from 'drizzle-orm';
import type { DbTransaction } from './audit.service';

type DbOrTx = typeof db | DbTransaction;

// ============================================
// Types
// ============================================

export type Port = InferSelectModel<typeof ports>;

export type PortType = 'PORT' | 'AIRPORT';

export interface CreatePortData {
  name: string;
  code: string;
  country: string;
  type?: PortType;
}

export interface UpdatePortData {
  name?: string;
  code?: string;
  country?: string;
  type?: PortType;
}

// ============================================
// Ports
// ============================================

export async function getAllPorts(): Promise<Port[]> {
  return db.select().from(ports).orderBy(asc(ports.name));
}

export async function getPortsByType(type: PortType): Promise<Port[]> {
  return db
    .select()
    .from(ports)
    .where(eq(ports.type, type))
    .orderBy(asc(ports.name));
}

export async function getPortById(id: string): Promise<Port | null> {
  const [row] = await db.select().from(ports).where(eq(ports.id, id));
  return row ?? null;
}

export async function createPort(data: CreatePortData, client: DbOrTx = db): Promise<Port> {
  const [inserted] = await client
    .insert(ports)
    .values({
      name: data.name,
      code: data.code,
      country: data.country,
      type: data.type ?? 'PORT',
    } as InferInsertModel<typeof ports>)
    .returning();
  return inserted!;
}

export async function updatePort(
  id: string,
  data: UpdatePortData,
  client: DbOrTx = db,
): Promise<Port | null> {
  const [updated] = await client
    .update(ports)
    .set(data)
    .where(eq(ports.id, id))
    .returning();
  return updated ?? null;
}

export async function deletePort(id: string, client: DbOrTx = db): Promise<boolean> {
  const deleted = await client.delete(ports).where(eq(ports.id, id)).returning();
  return deleted.length > 0;
}
