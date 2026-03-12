import { cache } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { COOKIE_ORG_NAME } from '@/lib/cookie-signature';
import {
  getOrganizationById,
  getUserOrganizations,
} from '@/services/organization.service';

type Profile = InferSelectModel<typeof profiles>;

/**
 * Get the active organization ID from cookie.
 * Cached per request to deduplicate when multiple components need it.
 */
export const getOrganizationCookie = cache(async (): Promise<string | null> => {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_ORG_NAME)?.value ?? null;
});

/**
 * Require auth + user's organizations. Returns { user, userOrgs } or redirects.
 * Use in create-organization, select-organization, onboarding pages.
 */
export async function requireAuthWithOrgs() {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');

  const userOrgs = await getUserOrganizations(user.id);
  return { user, userOrgs };
}

/**
 * Require auth + valid org cookie for dashboard pages.
 * Returns { user, activeOrgId } or redirects.
 * Use in dashboard child pages to avoid duplicating auth/org checks.
 */
export async function requireAuthAndOrg(): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>;
  activeOrgId: string;
}> {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');

  const activeOrgId = await getOrganizationCookie();
  if (!activeOrgId) redirect('/select-organization');

  const orgData = await getOrganizationById(activeOrgId, user.id);
  if (!orgData) redirect('/api/clear-org');

  return { user, activeOrgId };
}

/**
 * Get the currently authenticated user from Supabase Auth
 * Returns user object or null if not authenticated
 * Cached per request to deduplicate when multiple components need it
 */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error('Error getting authenticated user:', error);
    return null;
  }

  return user;
});

/**
 * Require authentication - throws error if user is not authenticated
 * Use in Server Components that require a logged-in user
 *
 * @throws Error if user is not authenticated
 * @returns Authenticated user object
 */
export async function requireAuth() {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error('Authentication required. User is not logged in.');
  }

  return user;
}

/**
 * Require authentication or redirect to login
 * Use in Server Actions that need to redirect unauthenticated users
 */
export async function requireAuthOrRedirect() {
  const user = await getAuthenticatedUser();
  if (!user) redirect('/login');
  return user;
}

/**
 * Require SUPER_ADMIN role - throws if not authenticated or not super admin
 * Use in admin Server Actions
 */
export async function requireSuperAdmin() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  const profile = await getUserProfile(user.id);
  if (!profile || profile.systemRole !== 'SUPER_ADMIN') {
    throw new Error('Forbidden');
  }
}

/**
 * Require SUPER_ADMIN and return user + profile for audit logging
 * Use in admin Server Actions that need actor context
 */
export async function getSuperAdminUser(): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>;
  profile: Profile;
}> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error('Unauthorized');
  const profile = await getUserProfile(user.id);
  if (!profile || profile.systemRole !== 'SUPER_ADMIN') {
    throw new Error('Forbidden');
  }
  return { user, profile };
}

/**
 * Get user profile from database
 * Cached per userId per request to deduplicate when multiple components need it
 */
export const getUserProfile = cache(async (userId: string): Promise<Profile | null> => {
  try {
    const profile = await db.query.profiles.findFirst({
      where: eq(profiles.id, userId),
    });

    return profile || null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
});

/**
 * Get authenticated user with profile
 * Convenience function that combines auth check and profile fetch
 * 
 * @returns Object with user and profile, or null if not authenticated
 */
export async function getAuthenticatedUserWithProfile() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return null;
  }

  const profile = await getUserProfile(user.id);

  return {
    user,
    profile,
  };
}

/**
 * Sign out the current user
 * Clears session and cookies
 */
export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }

  return { success: true };
}

/**
 * Sign out and redirect to login
 * Use from Server Actions (e.g. navbar logout button via action)
 */
export async function signOutAndRedirect() {
  await signOut();
  redirect('/login');
}

/**
 * Update user metadata in Supabase Auth
 * Use after onboarding completion to set onboarded: true
 */
export async function updateUserMetadata(data: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ data });

  if (error) {
    console.error('Error updating user metadata:', error);
    throw error;
  }
}
