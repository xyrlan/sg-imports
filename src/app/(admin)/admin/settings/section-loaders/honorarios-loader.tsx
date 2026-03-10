import { getGlobalServiceFeeConfig } from '@/services/admin';
import { HonorariosSection } from '../components';

export async function HonorariosLoader() {
  const honorarios = await getGlobalServiceFeeConfig();
  return <HonorariosSection honorarios={honorarios} />;
}
