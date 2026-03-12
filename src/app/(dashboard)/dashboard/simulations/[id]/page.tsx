import { notFound } from 'next/navigation';
import { requireAuthAndOrg } from '@/services/auth.service';
import { SimulationDetailContent } from './components/simulation-detail-content';
import {
  getSimulationById,
  getQuoteFinancialSummary,
  getHsCodesForSimulation,
  updateSimulation,
} from '@/services/simulation.service';
import { calculateAndPersistLandedCost } from '@/domain/simulation/services/simulation-domain.service';
import { getProductsByOrganization } from '@/services/product.service';
import { getOrganizationDeliveryState } from '@/services/organization.service';
import { getDolarPTAX } from '@/lib/fetch-dolar';

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

  let simulationData = data;
  let financialSummary = summary;

  try {
    const ptax = await getDolarPTAX();
    const ptaxStr = ptax.toFixed(4);
    const currentTarget = data.simulation.targetDolar?.toString()?.trim();
    if (!currentTarget || currentTarget !== ptaxStr) {
      await updateSimulation(id, activeOrgId, user.id, { targetDolar: ptaxStr });
      const taxResult = await calculateAndPersistLandedCost(id, activeOrgId, user.id);
      if (!taxResult.success) {
        await updateSimulation(id, activeOrgId, user.id, { isRecalculationNeeded: true });
      }
      const [fresh, newSummary] = await Promise.all([
        getSimulationById(id, activeOrgId, user.id),
        taxResult.success ? getQuoteFinancialSummary(id, activeOrgId, user.id) : null,
      ]);
      if (fresh) simulationData = fresh;
      if (newSummary) financialSummary = newSummary;
    }
  } catch {
    await updateSimulation(id, activeOrgId, user.id, { isRecalculationNeeded: true });
  }

  return (
    <div className="mx-auto p-6">
      <SimulationDetailContent
        simulation={simulationData.simulation}
        items={simulationData.items}
        organizationId={activeOrgId}
        products={productsResult.data}
        financialSummary={financialSummary}
        hsCodes={hsCodes}
        defaultDestinationState={defaultDestinationState}
      />
    </div>
  );
}
