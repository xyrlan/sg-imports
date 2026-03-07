'use server';

import { signOutAndRedirect } from '@/services/auth.service';

/**
 * Server Action: Sign out and redirect to login
 * Use from client components (e.g. navbar logout button)
 */
export async function signOutAction() {
  await signOutAndRedirect();
}
