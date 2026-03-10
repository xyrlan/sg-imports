import { getAllCarriers } from '@/services/admin';
import { CarriersSection } from '../components';

export async function CarriersLoader() {
  const carriers = await getAllCarriers();
  return <CarriersSection carriers={carriers} />;
}
