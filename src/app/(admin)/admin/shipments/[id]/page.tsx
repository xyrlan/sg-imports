import { notFound } from 'next/navigation';
import { getShipmentDetail } from '@/services/admin';
import { getTotalMerchandisePaidUsd } from '@/services/shipment.service';
import { ShipmentDetailContent } from '../components/shipment-detail-content';

export default async function AdminShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shipment = await getShipmentDetail(id);
  if (!shipment) notFound();

  const totalPaidUsd = await getTotalMerchandisePaidUsd(id);

  return <ShipmentDetailContent shipment={shipment} totalPaidUsd={totalPaidUsd} />;
}
