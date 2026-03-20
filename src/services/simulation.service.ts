import { db } from '@/db';
import { quotes, quoteItems, memberships, productVariants, products, hsCodes } from '@/db/schema';
import { eq, and, or, ne, desc, asc, sql, inArray, isNotNull } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import type { ProductSnapshot, ShippingMetadata } from '@/db/types';
import { getOrganizationById } from '@/services/organization.service';

type Quote = InferSelectModel<typeof quotes>;
type QuoteItem = InferSelectModel<typeof quoteItems>;

export type Simulation = Quote;
export type SimulationItem = QuoteItem & {
  variant?: InferSelectModel<typeof productVariants> & { product?: InferSelectModel<typeof products> };
  simulatedProductSnapshot?: ProductSnapshot | null;
};

export interface HsCodeOption {
  id: string;
  code: string;
}

export async function getHsCodesForSimulation(): Promise<HsCodeOption[]> {
  const rows = await db
    .select({ id: hsCodes.id, code: hsCodes.code })
    .from(hsCodes)
    .orderBy(hsCodes.code);
  return rows;
}

/**
 * Mark quotes that contain items from the given product as needing recalculation.
 * Used when product.hsCodeId changes (different NCM selected).
 * @returns Number of quotes updated
 */
export async function markQuotesForRecalculationByProductId(productId: string): Promise<number> {
  const affectedQuotes = await db
    .selectDistinct({ quoteId: quoteItems.quoteId })
    .from(quoteItems)
    .innerJoin(productVariants, eq(quoteItems.variantId, productVariants.id))
    .where(and(eq(productVariants.productId, productId), isNotNull(quoteItems.variantId)));

  const quoteIds = affectedQuotes.map((r) => r.quoteId);
  if (quoteIds.length === 0) return 0;

  await db
    .update(quotes)
    .set({ isRecalculationNeeded: true, updatedAt: new Date() })
    .where(inArray(quotes.id, quoteIds));

  return quoteIds.length;
}

/**
 * Mark quotes that contain items from products using the given hsCode as needing recalculation.
 * Used when an hsCode is edited (II, IPI, PIS, COFINS, etc.).
 * @returns Number of quotes updated
 */
export async function markQuotesForRecalculationByHsCodeId(hsCodeId: string): Promise<number> {
  const affectedQuotes = await db
    .selectDistinct({ quoteId: quoteItems.quoteId })
    .from(quoteItems)
    .innerJoin(productVariants, eq(quoteItems.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(eq(products.hsCodeId, hsCodeId), isNotNull(quoteItems.variantId)));

  const quoteIds = affectedQuotes.map((r) => r.quoteId);
  if (quoteIds.length === 0) return 0;

  await db
    .update(quotes)
    .set({ isRecalculationNeeded: true, updatedAt: new Date() })
    .where(inArray(quotes.id, quoteIds));

  return quoteIds.length;
}

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
        or(
          eq(quotes.sellerOrganizationId, organizationId),
          eq(quotes.clientOrganizationId, organizationId)
        ),
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
      .where(
        and(
          or(
            eq(quotes.sellerOrganizationId, organizationId),
            eq(quotes.clientOrganizationId, organizationId)
          ),
          eq(quotes.type, 'SIMULATION')
        )
      ),
  ]);

  const totalCount = countResult[0]?.count ?? 0;

  return {
    data,
    paging: { totalCount, page, pageSize },
  };
}

export type ProposalWithSeller = Simulation & {
  sellerOrganization: { id: string; name: string } | null;
};

export interface GetProposalsResult {
  pending: ProposalWithSeller[];
  history: ProposalWithSeller[];
}

/**
 * Fetch proposals (SIMULATION quotes) where the organization is the client.
 * Excludes DRAFTs. Splits into pending (SENT) and history (everything else).
 */
export async function getProposalsForClient(
  organizationId: string,
  userId: string
): Promise<GetProposalsResult> {
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.organizationId, organizationId),
      eq(memberships.profileId, userId)
    ),
  });

  if (!membership) {
    return { pending: [], history: [] };
  }

  const data = await db.query.quotes.findMany({
    where: and(
      eq(quotes.clientOrganizationId, organizationId),
      eq(quotes.type, 'SIMULATION'),
      ne(quotes.status, 'DRAFT')
    ),
    with: {
      sellerOrganization: { columns: { id: true, name: true } },
    },
    orderBy: desc(quotes.updatedAt),
  });

  const pending = data.filter((q) => q.status === 'SENT' || q.status === 'PENDING_SIGNATURE') as ProposalWithSeller[];
  const history = data.filter((q) => q.status !== 'SENT' && q.status !== 'PENDING_SIGNATURE') as ProposalWithSeller[];

  return { pending, history };
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
      or(
        eq(quotes.sellerOrganizationId, organizationId),
        eq(quotes.clientOrganizationId, organizationId)
      ),
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
  targetDolar?: string | null;
  shippingModality?: 'SEA_LCL' | 'AIR' | 'EXPRESS';
  metadata?: ShippingMetadata | null;
}

export interface UpdateSimulationInput {
  name?: string;
  targetDolar?: string | null;
  shippingModality?: 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'SEA_FCL_PARTIAL' | 'EXPRESS' | null;
  incoterm?: 'EXW' | 'FOB' | 'CIF' | 'DDP';
  metadata?: ShippingMetadata | null;
  isRecalculationNeeded?: boolean;
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
      sellerOrganizationId: input.organizationId,
      createdById: input.userId,
      type: 'SIMULATION',
      status: 'DRAFT',
      name: input.name.trim(),
      targetDolar: (input.targetDolar?.trim() || '0').replace(',', '.'),
      incoterm: 'FOB',
      shippingModality: input.shippingModality ?? 'SEA_LCL',
      metadata: input.metadata ?? null,
    })
    .returning();

  if (created) {
    const { createServiceFeeConfig } = await import('@/services/config.service');
    await createServiceFeeConfig(created.id);
  }

  return created ?? null;
}

/**
 * Update simulation (quote) settings.
 */
export async function updateSimulation(
  simulationId: string,
  organizationId: string,
  userId: string,
  input: UpdateSimulationInput
): Promise<Simulation | null> {
  const data = await getSimulationById(simulationId, organizationId, userId);
  if (!data) return null;

  const [updated] = await db
    .update(quotes)
    .set({
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.targetDolar !== undefined && {
        targetDolar: (input.targetDolar?.trim() || '0').replace(',', '.'),
      }),
      ...(input.shippingModality !== undefined && { shippingModality: input.shippingModality }),
      ...(input.incoterm !== undefined && { incoterm: input.incoterm }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
      ...(input.isRecalculationNeeded !== undefined && { isRecalculationNeeded: input.isRecalculationNeeded }),
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, simulationId))
    .returning();

  return updated ?? null;
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

// ==========================================
// Re-exports from simulation-items.service.ts (backward compatibility)
// ==========================================
export {
  recalculateQuoteTotals,
  zeroQuoteTotals,
  addSimulationItem,
  removeSimulationItem,
  updateSimulationItem,
  getQuoteFinancialSummary,
  type AddSimulationItemInput,
  type UpdateSimulationItemInput,
  type QuoteFinancialSummary,
} from './simulation-items.service';

// NOTE: All item operations have been moved to simulation-items.service.ts
// The re-exports above maintain backward compatibility.
