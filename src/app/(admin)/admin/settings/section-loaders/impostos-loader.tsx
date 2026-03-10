import {
  getStateIcmsRates,
  getSiscomexFeeConfig,
  getGlobalPlatformRates,
} from '@/services/admin';
import { ImpostosTaxasSection } from '../components';

export async function ImpostosLoader() {
  const [stateIcmsRates, siscomexFee, platformRates] = await Promise.all([
    getStateIcmsRates(),
    getSiscomexFeeConfig(),
    getGlobalPlatformRates(),
  ]);

  return (
    <ImpostosTaxasSection
      stateIcmsRates={stateIcmsRates}
      siscomexFee={siscomexFee}
      platformRates={platformRates}
    />
  );
}
