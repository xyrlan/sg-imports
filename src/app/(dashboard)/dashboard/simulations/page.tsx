import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationById } from '@/services/organization.service';
import { getSimulationsByOrganization } from '@/services/simulation.service';
import { SimulationsPageContent } from './components/simulations-page-content';

export default async function SimulationsPage() {
  const t = await getTranslations('Simulations');
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get('active_organization_id')?.value;

  if (!activeOrgId) {
    redirect('/select-organization');
  }

  const access = await getOrganizationById(activeOrgId, user.id);

  if (!access) {
    redirect('/select-organization');
  }

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
