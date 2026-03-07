import { getTranslations } from 'next-intl/server';
import { requireAuthAndOrg } from '@/services/auth.service';
import { getSimulationsByOrganization } from '@/services/simulation.service';
import { SimulationsPageContent } from './components/simulations-page-content';

export default async function SimulationsPage() {
  const t = await getTranslations('Simulations');
  const { user, activeOrgId } = await requireAuthAndOrg();

  const { data: initialSimulations, paging } = await getSimulationsByOrganization(activeOrgId, user.id, {
    page: 1,
    pageSize: 100,
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted text-sm">
          {t('description')}
        </p>
      </div>

      <SimulationsPageContent
        initialSimulations={initialSimulations}
        organizationId={activeOrgId}
        initialPaging={paging}
      />
    </div>
  );
}
