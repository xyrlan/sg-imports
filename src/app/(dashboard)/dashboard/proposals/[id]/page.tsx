import { notFound } from 'next/navigation';
import { requireAuthAndOrg } from '@/services/auth.service';
import { ProposalDetailContent } from './components/proposal-detail-content';
import { getSimulationById } from '@/services/simulation.service';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, activeOrgId } = await requireAuthAndOrg();

  const data = await getSimulationById(id, activeOrgId, user.id);

  if (!data) {
    notFound();
  }

  const sellerOrg = await db.query.organizations.findFirst({
    where: eq(organizations.id, data.simulation.sellerOrganizationId),
    columns: { name: true },
  });

  let totalFobUsd = 0;
  let totalLandedCostBrl = 0;
  for (const item of data.items) {
    totalFobUsd += Number(item.priceUsd ?? 0) * item.quantity;
    totalLandedCostBrl += Number(item.landedCostTotalSnapshot ?? 0);
  }

  return (
    <ProposalDetailContent
      simulation={data.simulation}
      items={data.items}
      organizationId={activeOrgId}
      sellerOrganizationName={sellerOrg?.name ?? '—'}
      totalFobUsd={totalFobUsd}
      totalLandedCostBrl={totalLandedCostBrl}
    />
  );
}
