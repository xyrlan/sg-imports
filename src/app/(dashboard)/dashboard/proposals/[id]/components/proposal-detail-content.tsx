'use client';

import { useRouter } from 'next/navigation';
import { QuoteDetailView } from '@/app/quote/[publicToken]/components/public-quote-view';
import type { QuoteDisplayData } from '@/app/quote/[publicToken]/components/public-quote-view';
import { QuoteWorkflowButtons } from '../../../simulations/[id]/components/quote-workflow-buttons';
import type { Simulation, SimulationItem } from '@/services/simulation.service';

interface ProposalDetailContentProps {
  simulation: Simulation;
  items: SimulationItem[];
  organizationId: string;
  sellerOrganizationName: string;
  totalFobUsd: number;
  totalLandedCostBrl: number;
}

export function ProposalDetailContent({
  simulation,
  items,
  organizationId,
  sellerOrganizationName,
  totalFobUsd,
  totalLandedCostBrl,
}: ProposalDetailContentProps) {
  const router = useRouter();

  const displayData: QuoteDisplayData = {
    quote: {
      id: simulation.id,
      name: simulation.name,
      status: simulation.status,
      sellerOrganizationName,
      isRecalculationNeeded: simulation.isRecalculationNeeded ?? false,
    },
    items: items.map((item) => ({
      id: item.id,
      name:
        item.variant?.product?.name ??
        (item.simulatedProductSnapshot as { name?: string } | null)?.name ??
        item.variant?.name ??
        '—',
      sku: item.variant?.sku ?? null,
      quantity: item.quantity,
      priceUsd: String(item.priceUsd ?? 0),
      landedCostTotalSnapshot: String(item.landedCostTotalSnapshot ?? 0),
      landedCostUnitSnapshot: String(item.landedCostUnitSnapshot ?? 0),
    })),
    summary: { totalFobUsd, totalLandedCostBrl },
  };

  return (
    <QuoteDetailView
      data={displayData}
      backHref="/dashboard/proposals"
      actions={
        <QuoteWorkflowButtons
          simulation={simulation}
          organizationId={organizationId}
          onMutate={() => router.refresh()}
        />
      }
    />
  );
}
