import { db } from '@/db';
import { quoteObservations, quotes, memberships } from '@/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';

async function verifyQuoteAccess(
  quoteId: string,
  organizationId: string,
  userId: string
) {
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.organizationId, organizationId),
      eq(memberships.profileId, userId)
    ),
  });
  if (!membership) return null;

  const quote = await db.query.quotes.findFirst({
    where: and(
      eq(quotes.id, quoteId),
      or(
        eq(quotes.sellerOrganizationId, organizationId),
        eq(quotes.clientOrganizationId, organizationId)
      )
    ),
  });
  return quote ?? null;
}

/**
 * Fetch all observations for a quote, ordered by newest first.
 * Validates membership and quote ownership before returning data.
 */
export async function getObservationsByQuoteId(
  quoteId: string,
  organizationId: string,
  userId: string
) {
  const quote = await verifyQuoteAccess(quoteId, organizationId, userId);
  if (!quote) return [];

  return db.query.quoteObservations.findMany({
    where: eq(quoteObservations.quoteId, quoteId),
    orderBy: [desc(quoteObservations.createdAt)],
  });
}

/**
 * Add an observation to a quote.
 * Validates membership and quote ownership before inserting.
 */
export async function addObservation(
  quoteId: string,
  organizationId: string,
  userId: string,
  data: { description: string; documents: { name: string; url: string }[] }
) {
  const quote = await verifyQuoteAccess(quoteId, organizationId, userId);
  if (!quote) throw new Error('Quote not found or unauthorized');

  const [observation] = await db.insert(quoteObservations).values({
    quoteId,
    description: data.description,
    documents: data.documents,
  }).returning();

  return observation;
}

/**
 * Delete an observation by ID.
 * Validates membership and quote ownership before deleting.
 */
export async function deleteObservation(
  observationId: string,
  quoteId: string,
  organizationId: string,
  userId: string
) {
  const quote = await verifyQuoteAccess(quoteId, organizationId, userId);
  if (!quote) throw new Error('Quote not found or unauthorized');

  await db.delete(quoteObservations).where(
    and(
      eq(quoteObservations.id, observationId),
      eq(quoteObservations.quoteId, quoteId)
    )
  );
}
