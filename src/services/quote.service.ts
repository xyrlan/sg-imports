import { db } from '@/db';
import { quotes, memberships } from '@/db/schema';
import { eq, and, or, inArray } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { getOrganizationById } from '@/services/organization.service';

type Quote = InferSelectModel<typeof quotes>;

/**
 * Fetch PROFORMA quotes for an organization.
 * Validates that the user has access to the organization (membership check).
 * Returns quotes with type PROFORMA in DRAFT or SENT status.
 *
 * @param organizationId - Organization UUID
 * @param userId - Profile ID from Supabase Auth
 * @returns Array of PROFORMA quotes or empty array if no access
 */
export async function getProformaQuotesByOrganization(
  organizationId: string,
  userId: string
): Promise<Quote[]> {
  // Verify user has access to the organization
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.organizationId, organizationId),
      eq(memberships.profileId, userId)
    ),
  });

  if (!membership) {
    return [];
  }

  const proformaQuotes = await db.query.quotes.findMany({
    where: and(
      or(
        eq(quotes.sellerOrganizationId, organizationId),
        eq(quotes.clientOrganizationId, organizationId)
      ),
      eq(quotes.type, 'PROFORMA'),
      inArray(quotes.status, ['DRAFT', 'SENT'])
    ),
    orderBy: (quotes, { desc }) => [desc(quotes.updatedAt)],
  });

  return proformaQuotes;
}

/**
 * Get a single quote by ID, validating it belongs to the organization
 * and the user has access.
 *
 * @param quoteId - Quote UUID
 * @param organizationId - Organization UUID
 * @param userId - Profile ID from Supabase Auth
 * @returns Quote or null if not found / no access
 */
export async function getProformaQuoteById(
  quoteId: string,
  organizationId: string,
  userId: string
): Promise<Quote | null> {
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.organizationId, organizationId),
      eq(memberships.profileId, userId)
    ),
  });

  if (!membership) {
    return null;
  }

  const quote = await db.query.quotes.findFirst({
    where: and(
      eq(quotes.id, quoteId),
      or(
        eq(quotes.sellerOrganizationId, organizationId),
        eq(quotes.clientOrganizationId, organizationId)
      ),
      eq(quotes.type, 'PROFORMA')
    ),
  });

  return quote ?? null;
}

export interface CreateProformaQuoteInput {
  organizationId: string;
  userId: string;
  name: string;
  systemRole?: string;
}

/**
 * Create a PROFORMA quote for an organization.
 * Only SELLER (org role) or SUPER_ADMIN (system role) can create.
 *
 * @param input - organizationId, userId, name, and optional systemRole
 * @returns Created quote or null if no permission
 */
export async function createProformaQuote(
  input: CreateProformaQuoteInput
): Promise<Quote | null> {
  const { organizationId, userId, name, systemRole } = input;

  const orgData = await getOrganizationById(organizationId, userId);
  if (!orgData) {
    return null;
  }

  const canCreate =
    orgData.role === 'SELLER' || systemRole === 'SUPER_ADMIN';
  if (!canCreate) {
    return null;
  }

  const [created] = await db
    .insert(quotes)
    .values({
      sellerOrganizationId: organizationId,
      createdById: userId,
      type: 'PROFORMA',
      status: 'DRAFT',
      name: name.trim(),
      targetDolar: '0',
      incoterm: 'FOB',
    })
    .returning();

  if (created) {
    const { createServiceFeeConfig } = await import('@/services/config.service');
    await createServiceFeeConfig(created.id);
  }

  return created ?? null;
}

/**
 * Delete a PROFORMA quote.
 * Only SELLER (org role) or SUPER_ADMIN (system role) can delete.
 *
 * @param quoteId - Quote UUID
 * @param organizationId - Organization UUID
 * @param userId - Profile ID from Supabase Auth
 * @param systemRole - Optional system role for SUPER_ADMIN bypass
 * @returns true if deleted, false if no permission or not found
 */
export async function deleteProformaQuote(
  quoteId: string,
  organizationId: string,
  userId: string,
  systemRole?: string
): Promise<boolean> {
  const orgData = await getOrganizationById(organizationId, userId);
  if (!orgData) {
    return false;
  }

  const canDelete =
    orgData.role === 'SELLER' || systemRole === 'SUPER_ADMIN';
  if (!canDelete) {
    return false;
  }

  const quote = await getProformaQuoteById(quoteId, organizationId, userId);
  if (!quote) {
    return false;
  }

  const deleted = await db
    .delete(quotes)
    .where(eq(quotes.id, quoteId))
    .returning();

  return deleted.length > 0;
}
