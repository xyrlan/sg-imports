import { db } from '@/db';
import { memberships, organizations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

type Organization = InferSelectModel<typeof organizations>;
type Membership = InferSelectModel<typeof memberships>;

export interface UserOrganization {
  organization: Organization;
  role: string;
  membership: Membership;
}

/**
 * Fetch all organizations where the user has membership
 * @param userId - Profile ID from Supabase Auth
 * @returns Array of organizations with user's role
 */
export async function getUserOrganizations(userId: string): Promise<UserOrganization[]> {
  const userMemberships = await db.query.memberships.findMany({
    where: eq(memberships.profileId, userId),
    with: {
      organization: true,
    },
  });

  return userMemberships.map((membership) => ({
    organization: membership.organization,
    role: membership.role,
    membership,
  }));
}

/**
 * Get specific organization with user's membership details
 * Validates that the user has access to the organization
 * @param orgId - Organization UUID
 * @param userId - Profile ID from Supabase Auth
 * @returns Organization data with membership or null if no access
 */
export async function getOrganizationById(
  orgId: string,
  userId: string
): Promise<UserOrganization | null> {
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.organizationId, orgId),
      eq(memberships.profileId, userId)
    ),
    with: {
      organization: true,
    },
  });

  if (!membership) {
    return null;
  }

  return {
    organization: membership.organization,
    role: membership.role,
    membership,
  };
}
