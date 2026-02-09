'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const COOKIE_NAME = 'active_organization_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Set the active organization cookie
 * This persists the user's organization selection across sessions
 * 
 * @param organizationId - UUID of the organization to set as active
 */
export async function setOrganizationCookie(organizationId: string) {
  const cookieStore = await cookies();
  
  cookieStore.set(COOKIE_NAME, organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  
  // Revalidate all paths to ensure server components pick up the new cookie
  revalidatePath('/', 'layout');
}

/**
 * Get the active organization ID from cookie
 * @returns Organization ID or null if not set
 */
export async function getOrganizationCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  return cookie?.value ?? null;
}

/**
 * Clear the active organization cookie
 * Useful for logout or when switching to organization selection
 */
export async function clearOrganizationCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  revalidatePath('/', 'layout');
}
