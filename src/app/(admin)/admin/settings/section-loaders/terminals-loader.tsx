import { getAllTerminals } from '@/services/admin';
import { TerminalsSection } from '../components';

export async function TerminalsLoader() {
  const terminals = await getAllTerminals();
  return <TerminalsSection terminals={terminals} />;
}
