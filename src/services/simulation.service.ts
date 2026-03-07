import { db } from '@/db';
import { quotes, quoteItems, memberships, productVariants, products } from '@/db/schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import type { ProductSnapshot } from '@/db/types';
import { getOrganizationById } from '@/services/organization.service';

type Quote = InferSelectModel<typeof quotes>;
type QuoteItem = InferSelectModel<typeof quoteItems>;

export type Simulation = Quote;
export type SimulationItem = QuoteItem & {
  variant?: InferSelectModel<typeof productVariants> & { product?: InferSelectModel<typeof products> };
  simulatedProductSnapshot?: ProductSnapshot | null;
};

export interface GetSimulationsOptions {
  page?: number;
  pageSize?: number;
  orderBy?: 'name' | 'updatedAt' | 'createdAt';
  orderDirection?: 'asc' | 'desc';
}

export interface GetSimulationsResult {
  data: Simulation[];
  paging: {
    totalCount: number;
    page: number;
    pageSize: number;
  };
}

/**
 * Fetch SIMULATION quotes for an organization.
 * Validates that the user has access to the organization (membership check).
 *
 * @param organizationId - Organization UUID
 * @param userId - Profile ID from Supabase Auth
 * @returns Array of SIMULATION quotes or empty array if no access
 */
export async function getSimulationsByOrganization(
  organizationId: string,
  userId: string,
  options: GetSimulationsOptions = {}
): Promise<GetSimulationsResult> {
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.organizationId, organizationId),
      eq(memberships.profileId, userId)
    ),
  });

  if (!membership) {
    return { data: [], paging: { totalCount: 0, page: 1, pageSize: 50 } };
  }

  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 50;
  const orderBy = options.orderBy ?? 'updatedAt';
  const orderDirection = options.orderDirection ?? 'desc';
  const orderFn = orderDirection === 'desc' ? desc : asc;

  const [data, countResult] = await Promise.all([
    db.query.quotes.findMany({
      where: and(
        eq(quotes.organizationId, organizationId),
        eq(quotes.type, 'SIMULATION')
      ),
      orderBy:
        orderBy === 'name'
          ? orderFn(quotes.name)
          : orderBy === 'createdAt'
            ? orderFn(quotes.createdAt)
            : orderFn(quotes.updatedAt),
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(quotes)
      .where(and(eq(quotes.organizationId, organizationId), eq(quotes.type, 'SIMULATION'))),
  ]);

  const totalCount = countResult[0]?.count ?? 0;

  return {
    data,
    paging: { totalCount, page, pageSize },
  };
}

/**
 * Get a single simulation by ID (quote with type SIMULATION).
 * Validates that it belongs to the organization and user has access.
 *
 * @param simulationId - Quote UUID
 * @param organizationId - Organization UUID
 * @param userId - Profile ID from Supabase Auth
 * @returns Simulation with items or null if not found / no access
 */
export async function getSimulationById(
  simulationId: string,
  organizationId: string,
  userId: string
): Promise<{ simulation: Simulation; items: SimulationItem[] } | null> {
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.organizationId, organizationId),
      eq(memberships.profileId, userId)
    ),
  });

  if (!membership) {
    return null;
  }

  const simulation = await db.query.quotes.findFirst({
    where: and(
      eq(quotes.id, simulationId),
      eq(quotes.organizationId, organizationId),
      eq(quotes.type, 'SIMULATION')
    ),
  });

  if (!simulation) {
    return null;
  }

  const items = await db.query.quoteItems.findMany({
    where: eq(quoteItems.quoteId, simulationId),
    with: {
      variant: {
        with: { product: true },
      },
    },
  });

  return {
    simulation,
    items: items as SimulationItem[],
  };
}

export interface CreateSimulationInput {
  organizationId: string;
  userId: string;
  name: string;
}

/**
 * Create a SIMULATION quote for an organization.
 * Any user with org access can create.
 *
 * @param input - organizationId, userId, name
 * @returns Created simulation or null if no permission
 */
export async function createSimulation(
  input: CreateSimulationInput
): Promise<Simulation | null> {
  const orgData = await getOrganizationById(input.organizationId, input.userId);
  if (!orgData) {
    return null;
  }

  const [created] = await db
    .insert(quotes)
    .values({
      organizationId: input.organizationId,
      type: 'SIMULATION',
      status: 'DRAFT',
      name: input.name.trim(),
      targetDolar: '0',
      incoterm: 'FOB',
    })
    .returning();

  return created ?? null;
}

/**
 * Delete a SIMULATION quote and its items (cascade).
 *
 * @param simulationId - Quote UUID
 * @param organizationId - Organization UUID
 * @param userId - Profile ID from Supabase Auth
 * @returns true if deleted, false if no permission or not found
 */
export async function deleteSimulation(
  simulationId: string,
  organizationId: string,
  userId: string
): Promise<boolean> {
  const data = await getSimulationById(simulationId, organizationId, userId);
  if (!data) {
    return false;
  }

  const deleted = await db
    .delete(quotes)
    .where(eq(quotes.id, simulationId))
    .returning();

  return deleted.length > 0;
}

export interface AddSimulationItemInput {
  variantId?: string;
  simulatedProductSnapshot?: ProductSnapshot;
  quantity: number;
  priceUsd: string;
}

/**
 * Add an item to a simulation.
 * Either variantId (catalog product) or simulatedProductSnapshot (non-catalog) must be provided.
 *
 * @param simulationId - Quote UUID
 * @param organizationId - Organization UUID
 * @param userId - Profile ID from Supabase Auth
 * @param item - Item with variantId OR simulatedProductSnapshot + quantity + priceUsd
 * @returns Created item or null
 */
export async function addSimulationItem(
  simulationId: string,
  organizationId: string,
  userId: string,
  item: AddSimulationItemInput
): Promise<QuoteItem | null> {
  const data = await getSimulationById(simulationId, organizationId, userId);
  if (!data) {
    return null;
  }

  const hasVariant = !!item.variantId;
  const hasSimulated = !!item.simulatedProductSnapshot;
  if (!hasVariant && !hasSimulated) {
    return null;
  }
  if (hasVariant && hasSimulated) {
    return null;
  }

  const [created] = await db
    .insert(quoteItems)
    .values({
      quoteId: simulationId,
      variantId: item.variantId ?? null,
      simulatedProductSnapshot: item.simulatedProductSnapshot ?? null,
      quantity: item.quantity,
      priceUsd: item.priceUsd,
    })
    .returning();

  return created ?? null;
}

/**
 * Remove an item from a simulation.
 *
 * @param itemId - Quote item UUID
 * @param organizationId - Organization UUID
 * @param userId - Profile ID from Supabase Auth
 * @returns true if removed, false if no permission or not found
 */
export async function removeSimulationItem(
  itemId: string,
  organizationId: string,
  userId: string
): Promise<boolean> {
  const item = await db.query.quoteItems.findFirst({
    where: eq(quoteItems.id, itemId),
    with: { quote: true },
  });

  if (!item || !item.quote || item.quote.type !== 'SIMULATION' || item.quote.organizationId !== organizationId) {
    return false;
  }

  const orgData = await getOrganizationById(organizationId, userId);
  if (!orgData) {
    return false;
  }

  const deleted = await db
    .delete(quoteItems)
    .where(eq(quoteItems.id, itemId))
    .returning();

  return deleted.length > 0;
}

export interface UpdateSimulationItemInput {
  quantity?: number;
  priceUsd?: string;
}

/**
 * Update quantity or price of a simulation item.
 *
 * @param itemId - Quote item UUID
 * @param organizationId - Organization UUID
 * @param userId - Profile ID from Supabase Auth
 * @param updates - quantity and/or priceUsd
 * @returns Updated item or null
 */
export async function updateSimulationItem(
  itemId: string,
  organizationId: string,
  userId: string,
  updates: UpdateSimulationItemInput
): Promise<QuoteItem | null> {
  const item = await db.query.quoteItems.findFirst({
    where: eq(quoteItems.id, itemId),
    with: { quote: true },
  });

  if (!item || !item.quote || item.quote.type !== 'SIMULATION' || item.quote.organizationId !== organizationId) {
    return null;
  }

  const orgData = await getOrganizationById(organizationId, userId);
  if (!orgData) {
    return null;
  }

  const values: Partial<{ quantity: number; priceUsd: string }> = {};
  if (updates.quantity !== undefined) values.quantity = updates.quantity;
  if (updates.priceUsd !== undefined) values.priceUsd = updates.priceUsd;

  if (Object.keys(values).length === 0) {
    return item;
  }

  const [updated] = await db
    .update(quoteItems)
    .set(values)
    .where(eq(quoteItems.id, itemId))
    .returning();

  return updated ?? null;
}
