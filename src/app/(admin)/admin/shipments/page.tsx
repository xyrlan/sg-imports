import { getAllShipments } from '@/services/admin';
import { ShipmentsPageContent } from './components/shipments-page-content';

export default async function AdminShipmentsPage() {
  const shipments = await getAllShipments();
  return <ShipmentsPageContent shipments={shipments} />;
}
