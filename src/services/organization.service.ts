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

export interface UpdateOrganizationData {
  tradeName?: string;
  email?: string;
  phone?: string;
  taxRegime?: string;
  stateRegistry?: string;
  billingAddressId?: string;
  deliveryAddressId?: string;
}

/**
 * Update organization details
 * Validates that the user has access to the organization
 * @param orgId - Organization UUID
 * @param userId - Profile ID from Supabase Auth
 * @param data - Updated organization data
 * @returns Updated organization or null if no access
 */
export async function updateOrganization(
  orgId: string,
  userId: string,
  data: UpdateOrganizationData
): Promise<Organization | null> {
  // First verify user has access to this organization
  const access = await getOrganizationById(orgId, userId);
  
  if (!access) {
    return null;
  }

  // Update the organization
  const [updatedOrg] = await db
    .update(organizations)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, orgId))
    .returning();

  return updatedOrg || null;
}

/**
 * Check if organization has completed onboarding
 * An organization needs onboarding if it lacks billing or delivery address
 * @param orgId - Organization UUID
 * @returns True if onboarding is complete, false otherwise
 */
export async function checkOnboardingStatus(orgId: string): Promise<boolean> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

  if (!org) {
    return false;
  }

  // Organization needs onboarding if missing addresses
  return !!(org.billingAddressId && org.deliveryAddressId);
}
