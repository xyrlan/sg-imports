import { getTranslations } from 'next-intl/server';
import { requireAuthAndOrg } from '@/services/auth.service';
import { getProposalsForClient } from '@/services/simulation.service';
import { ProposalsPageContent } from './components/proposals-page-content';

export default async function ProposalsPage() {
  const t = await getTranslations('Proposals');
  const { user, activeOrgId } = await requireAuthAndOrg();

  const { pending, history } = await getProposalsForClient(activeOrgId, user.id);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted text-sm">{t('description')}</p>
      </div>
      <ProposalsPageContent pending={pending} history={history} />
    </div>
  );
}
