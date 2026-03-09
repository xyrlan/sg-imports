import { notFound } from 'next/navigation';
import { requireAuthAndOrg } from '@/services/auth.service';
import { SimulationDetailContent } from './components/simulation-detail-content';
import {
  getSimulationById,
  getQuoteFinancialSummary,
  getHsCodesForSimulation,
} from '@/services/simulation.service';
import { getProductsByOrganization } from '@/services/product.service';
import { getOrganizationDeliveryState } from '@/services/organization.service';

export default async function SimulationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, activeOrgId } = await requireAuthAndOrg();

  const [data, productsResult, summary, hsCodes, defaultDestinationState] = await Promise.all([
    getSimulationById(id, activeOrgId, user.id),
    getProductsByOrganization(activeOrgId, { pageSize: 200 }),
    getQuoteFinancialSummary(id, activeOrgId, user.id),
    getHsCodesForSimulation(),
    getOrganizationDeliveryState(activeOrgId, user.id),
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
        financialSummary={summary}
        hsCodes={hsCodes}
        defaultDestinationState={defaultDestinationState}
      />
    </div>
  );
}
