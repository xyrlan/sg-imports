import { notFound } from 'next/navigation';
import { getQuoteByPublicToken } from '@/services/quote-workflow.service';
import { getAuthenticatedUser } from '@/services/auth.service';
import { getUserOrganizations } from '@/services/organization.service';
import { PublicQuoteView } from './components/public-quote-view';

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}) {
  const { publicToken } = await params;

  const [quoteData, user] = await Promise.all([
    getQuoteByPublicToken(publicToken),
    getAuthenticatedUser(),
  ]);

  if (!quoteData) notFound();

  const userOrgs = user ? await getUserOrganizations(user.id) : [];

  return (
    <PublicQuoteView
      data={quoteData}
      publicToken={publicToken}
      user={user ? { id: user.id, email: user.email ?? null } : null}
      userOrganizations={userOrgs.map((o) => ({
        id: o.organization.id,
        name: o.organization.name,
      }))}
    />
  );
}
