'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

const COOKIE_NAME = 'active_organization_id';
const PROFORMA_QUOTE_COOKIE = 'active_proforma_quote_id';
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

/**
 * Set the active proforma quote cookie
 * Persists the user's proforma quote selection (SELLER/ADMIN only)
 * @param quoteId - Quote UUID or null to clear
 */
export async function setProformaQuoteCookie(quoteId: string | null) {
  const cookieStore = await cookies();

  if (quoteId) {
    cookieStore.set(PROFORMA_QUOTE_COOKIE, quoteId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  } else {
    cookieStore.delete(PROFORMA_QUOTE_COOKIE);
  }

  revalidatePath('/', 'layout');
}

/**
 * Get the active proforma quote ID from cookie
 * @returns Quote ID or null if not set
 */
export async function getProformaQuoteCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(PROFORMA_QUOTE_COOKIE);
  return cookie?.value ?? null;
}

/**
 * Switch to organization and redirect to onboarding
 * Used for "Completar cadastro" button - sets cookie and redirects
 * Server Action: receives formData with organizationId
 */
export async function completeOrganizationRegistration(formData: FormData) {
  const organizationId = formData.get('organizationId') as string;
  if (!organizationId) return;

  const { requireAuth } = await import('@/services/auth.service');
  const { getOrganizationById } = await import(
    '@/services/organization.service'
  );
  const { redirect: nextRedirect } = await import('next/navigation');

  const user = await requireAuth();
  const orgData = await getOrganizationById(organizationId, user.id);

  if (!orgData) {
    nextRedirect('/dashboard/profile');
    return;
  }

  await setOrganizationCookie(organizationId);
  nextRedirect('/onboarding');
}

export type CreateProformaQuoteActionResult =
  | { ok: true; quoteId: string }
  | { ok: false; error: string };

/**
 * Create a PROFORMA quote and set it as selected.
 * Only SELLER or SUPER_ADMIN can create (enforced in quote.service).
 */
export async function createProformaQuoteAction(
  _prev: unknown,
  formData: FormData
): Promise<CreateProformaQuoteActionResult> {
  try {
    const { requireAuth } = await import('@/services/auth.service');
    const { getUserProfile } = await import('@/services/auth.service');
    const { createProformaQuote } = await import('@/services/quote.service');

    const user = await requireAuth();
    const profile = await getUserProfile(user.id);
    const name = formData.get('name') as string;
    const organizationId = formData.get('organizationId') as string;

    if (!name?.trim()) {
      return { ok: false, error: 'Nome é obrigatório' };
    }
    if (!organizationId) {
      return { ok: false, error: 'Organização é obrigatória' };
    }

    const created = await createProformaQuote({
      organizationId,
      userId: user.id,
      name: name.trim(),
      systemRole: profile?.systemRole ?? undefined,
    });

    if (!created) {
      return { ok: false, error: 'Sem permissão para criar proforma' };
    }

    await setProformaQuoteCookie(created.id);
    revalidatePath('/', 'layout');
    revalidatePath('/dashboard', 'layout');
    return { ok: true, quoteId: created.id };
  } catch (error) {
    console.error('createProformaQuoteAction:', error);
    return { ok: false, error: 'Erro ao criar proforma' };
  }
}

export type DeleteProformaQuoteActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Delete a PROFORMA quote.
 * If it was the active one, clears the cookie.
 */
export async function deleteProformaQuoteAction(
  quoteId: string,
  organizationId: string
): Promise<DeleteProformaQuoteActionResult> {
  try {
    const { requireAuth } = await import('@/services/auth.service');
    const { getUserProfile } = await import('@/services/auth.service');
    const { deleteProformaQuote } = await import('@/services/quote.service');

    const user = await requireAuth();
    const profile = await getUserProfile(user.id);

    const deleted = await deleteProformaQuote(
      quoteId,
      organizationId,
      user.id,
      profile?.systemRole ?? undefined
    );

    if (!deleted) {
      return { ok: false, error: 'Sem permissão ou proforma não encontrado' };
    }

    const activeQuoteId = await getProformaQuoteCookie();
    if (activeQuoteId === quoteId) {
      await setProformaQuoteCookie(null);
    }

    revalidatePath('/', 'layout');
    revalidatePath('/dashboard', 'layout');
    return { ok: true };
  } catch (error) {
    console.error('deleteProformaQuoteAction:', error);
    return { ok: false, error: 'Erro ao excluir proforma' };
  }
}
