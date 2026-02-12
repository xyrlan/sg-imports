/**
 * Carriers Service — Ocean carriers synced from ShipsGo API.
 * Read-only CRUD; use syncCarriersFromShipsGo to update from ShipsGo.
 */

import { db } from '@/db';
import { carriers } from '@/db/schema';
import type { InferSelectModel } from 'drizzle-orm';
import { eq, asc } from 'drizzle-orm';
import { fetchCarriers } from '@/lib/shipsgo/client';

// ============================================
// Types
// ============================================

export type Carrier = InferSelectModel<typeof carriers>;

// ============================================
// Carriers (read-only)
// ============================================

export async function getAllCarriers(): Promise<Carrier[]> {
  return db.select().from(carriers).orderBy(asc(carriers.name));
}

export async function getCarrierById(id: string): Promise<Carrier | null> {
  const [row] = await db.select().from(carriers).where(eq(carriers.id, id));
  return row ?? null;
}

export async function getCarrierByScac(scacCode: string): Promise<Carrier | null> {
  const [row] = await db
    .select()
    .from(carriers)
    .where(eq(carriers.scacCode, scacCode));
  return row ?? null;
}

// ============================================
// Sync from ShipsGo
// ============================================

export async function syncCarriersFromShipsGo(): Promise<{
  inserted: number;
  updated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let inserted = 0;
  let updated = 0;
  let skip = 0;
  const take = 100;

  while (true) {
    const res = await fetchCarriers({
      filters: { status: 'ACTIVE' },
      take,
      skip,
      orderBy: 'name,asc',
    });

    for (const c of res.carriers) {
      if (!c.scac) continue;
      try {
        const existing = await getCarrierByScac(c.scac);
        if (existing) {
          await db
            .update(carriers)
            .set({ name: c.name, status: c.status })
            .where(eq(carriers.id, existing.id));
          updated++;
        } else {
          await db.insert(carriers).values({
            name: c.name,
            scacCode: c.scac,
            status: c.status,
          });
          inserted++;
        }
      } catch (err) {
        errors.push(`${c.scac}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (!res.meta.more) break;
    skip += take;
  }

  return { inserted, updated, errors };
}
