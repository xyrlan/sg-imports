import { getAllInternationalFreights, getAllPorts } from '@/services/admin';
import { InternationalFreightsSection } from '../components';

export async function InternationalFreightsLoader() {
  const [freights, ports] = await Promise.all([
    getAllInternationalFreights(),
    getAllPorts(),
  ]);

  return (
    <InternationalFreightsSection freights={freights} ports={ports} />
  );
}
