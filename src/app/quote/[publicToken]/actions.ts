'use server';

import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { linkQuoteToClientOrganization } from '@/services/quote-workflow.service';
import { getAuthenticatedUser } from '@/services/auth.service';
import { setOrganizationCookie } from '@/app/(dashboard)/actions';

export interface LinkQuoteState {
  success?: boolean;
  error?: string;
  quoteId?: string;
}

/**
 * Vincula a cotação à organização do cliente quando o email coincide.
 * Requer autenticação e que o email do usuário corresponda ao clientEmail da proposta.
 */
export async function linkQuoteToClientOrganizationAction(
  _prevState: LinkQuoteState | null,
  formData: FormData
): Promise<LinkQuoteState> {
  const quoteId = formData.get('quoteId') as string;
  const publicToken = formData.get('publicToken') as string;
  const clientOrganizationId = formData.get('clientOrganizationId') as string;

  const t = await getTranslations('Quote.Public.errors');

  const user = await getAuthenticatedUser();
  if (!user) return { error: t('loginRequired') };

  if (!quoteId || !publicToken || !clientOrganizationId) {
    return { error: t('invalidData') };
  }

  let result;
  try {
    result = await linkQuoteToClientOrganization(
      quoteId,
      publicToken,
      clientOrganizationId,
      user.id
    );
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) throw err;
    return { error: t('linkFailed') };
  }

  if (!result.success) return { error: result.error ?? t('linkFailed') };

  await setOrganizationCookie(clientOrganizationId);
  redirect(`/dashboard/proposals/${quoteId}`);
}
