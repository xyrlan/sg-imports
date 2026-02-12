/**
 * Admin Ports Service — CRUD for ports (UN/LOCODE)
 */

import { db } from '@/db';
import { ports } from '@/db/schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { eq, asc } from 'drizzle-orm';

// ============================================
// Types
// ============================================

export type Port = InferSelectModel<typeof ports>;

export interface CreatePortData {
  name: string;
  code: string;
  country: string;
}

export interface UpdatePortData {
  name?: string;
  code?: string;
  country?: string;
}

// ============================================
// Ports
// ============================================

export async function getAllPorts(): Promise<Port[]> {
  return db.select().from(ports).orderBy(asc(ports.name));
}

export async function getPortById(id: string): Promise<Port | null> {
  const [row] = await db.select().from(ports).where(eq(ports.id, id));
  return row ?? null;
}

export async function createPort(data: CreatePortData): Promise<Port> {
  const [inserted] = await db
    .insert(ports)
    .values(data as InferInsertModel<typeof ports>)
    .returning();
  return inserted!;
}

export async function updatePort(
  id: string,
  data: UpdatePortData,
): Promise<Port | null> {
  const [updated] = await db
    .update(ports)
    .set(data)
    .where(eq(ports.id, id))
    .returning();
  return updated ?? null;
}

export async function deletePort(id: string): Promise<boolean> {
  const deleted = await db.delete(ports).where(eq(ports.id, id)).returning();
  return deleted.length > 0;
}
