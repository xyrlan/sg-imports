import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { SimulationDetailContent } from './components/simulation-detail-content';
import { getOrganizationById } from '@/services/organization.service';
import { getSimulationById } from '@/services/simulation.service';
import { getProductsByOrganization } from '@/services/product.service';

export default async function SimulationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const [data, productsResult] = await Promise.all([
    getSimulationById(id, activeOrgId, user.id),
    getProductsByOrganization(activeOrgId, { pageSize: 200 }),
  ]);

  if (!data) {
    notFound();
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <SimulationDetailContent
        simulation={data.simulation}
        items={data.items}
        organizationId={activeOrgId}
        products={productsResult.data}
      />
    </div>
  );
}
