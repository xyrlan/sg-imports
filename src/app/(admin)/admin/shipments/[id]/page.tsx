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
  const [shipment, totalPaidUsd] = await Promise.all([
    getShipmentDetail(id),
    getTotalMerchandisePaidUsd(id),
  ]);
  if (!shipment) notFound();

  return <ShipmentDetailContent shipment={shipment} totalPaidUsd={totalPaidUsd} />;
}
