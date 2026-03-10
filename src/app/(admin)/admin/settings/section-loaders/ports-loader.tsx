import { getAllPorts } from '@/services/admin';
import { PortsSection } from '../components';

export async function PortsLoader() {
  const ports = await getAllPorts();
  return <PortsSection ports={ports} />;
}
