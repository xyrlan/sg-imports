import { db } from '@/db';
import { profiles, organizations, memberships } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface UserMetadata {
  role: 'OWNER' | 'SELLER' | 'ADMIN' | 'ADMIN_EMPLOYEE' | 'CUSTOMS_BROKER' | 'VIEWER';
  fullName: string;
  document: string;
  organizationName?: string;
}

/**
 * Ensures that profile, organization, and membership exist for a user
 * This is a fallback in case the database trigger fails or is disabled
 * @param userId - User ID from auth.users
 * @param email - User email
 * @param metadata - User metadata from registration
 */
export async function ensureUserSetup(
  userId: string,
  email: string,
  metadata: UserMetadata
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Ensure Profile exists
    const existingProfile = await db.query.profiles.findFirst({
      where: eq(profiles.id, userId),
    });

    if (!existingProfile) {
      await db.insert(profiles).values({
        id: userId,
        email,
        fullName: metadata.fullName,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing();
    }

    // 2. Ensure Organization exists
    let organizationId: string | undefined;
    
    const existingOrg = await db.query.organizations.findFirst({
      where: eq(organizations.document, metadata.document),
    });

    if (existingOrg) {
      organizationId = existingOrg.id;
    } else {
      const [newOrg] = await db.insert(organizations).values({
        name: metadata.organizationName || metadata.fullName,
        document: metadata.document,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).onConflictDoNothing().returning();
      
      organizationId = newOrg?.id;
    }

    if (!organizationId) {
      return { success: false, error: 'Failed to create or find organization' };
    }

    // 3. Ensure Membership exists
    const existingMembership = await db.query.memberships.findFirst({
      where: eq(memberships.profileId, userId),
    });

    if (!existingMembership) {
      const role = metadata.role === 'ADMIN_EMPLOYEE' ? 'EMPLOYEE' : metadata.role;
      await db.insert(memberships).values({
        organizationId,
        profileId: userId,
        role: role as 'OWNER' | 'ADMIN' | 'EMPLOYEE' | 'SELLER' | 'CUSTOMS_BROKER' | 'VIEWER',
        createdAt: new Date(),
      }).onConflictDoNothing();
    }

    return { success: true };
  } catch (error) {
    console.error('Error in ensureUserSetup:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
