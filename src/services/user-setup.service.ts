import { db } from '@/db';
import { profiles, organizations, memberships } from '@/db/schema';
import { eq } from 'drizzle-orm';

const PG_UNIQUE_VIOLATION = '23505';

/** Thrown when profile insert fails due to email already existing (unique constraint) */
export class ProfileEmailConflictError extends Error {
  constructor() {
    super('Profile email already in use');
    this.name = 'ProfileEmailConflictError';
  }
}

export interface UserMetadata {
  role: 'OWNER' | 'SELLER' | 'ADMIN' | 'ADMIN_EMPLOYEE' | 'CUSTOMS_BROKER' | 'VIEWER';
  fullName: string;
  document: string;
  organizationName?: string;
}

/**
 * Checks if an email is already registered in profiles.
 * Use before signUp to prevent duplicate accounts.
 */
export async function isEmailInUse(email: string): Promise<boolean> {
  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.email, email),
    columns: { id: true },
  });
  return !!existing;
}

/**
 * Ensures that a profile exists for the user (required for memberships FK)
 * Creates minimal profile if missing - used when creating first organization
 */
export async function ensureProfileExists(
  userId: string,
  email: string,
  fullName?: string
): Promise<void> {
  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  });
  if (!existing) {
    try {
      await db
        .insert(profiles)
        .values({
          id: userId,
          email,
          fullName: fullName ?? email.split('@')[0],
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing({ target: profiles.id });
    } catch (err) {
      // Drizzle wraps PostgresError in DrizzleQueryError - check both err and err.cause
      const e = err as { code?: string; cause?: { code?: string } };
      const code = e.code ?? e.cause?.code;
      if (code === PG_UNIQUE_VIOLATION) {
        throw new ProfileEmailConflictError();
      }
      throw err;
    }
  }
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
      try {
        await db.insert(profiles).values({
          id: userId,
          email,
          fullName: metadata.fullName,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).onConflictDoNothing({ target: profiles.id });
      } catch (profileErr) {
        const e = profileErr as { code?: string; cause?: { code?: string } };
        if (e.code === PG_UNIQUE_VIOLATION || e.cause?.code === PG_UNIQUE_VIOLATION) {
          return { success: false, error: 'Este e-mail já está vinculado a outra conta.' };
        }
        throw profileErr;
      }
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
