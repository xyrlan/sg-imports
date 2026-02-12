import {
  getGlobalServiceFeeConfig,
  getStateIcmsRates,
  getSiscomexFeeConfig,
  getGlobalPlatformRates,
  getAllTerminals,
} from '@/services/admin';
import { SettingsContent } from './settings-content';

export default async function AdminSettingsPage() {
  const [honorarios, stateIcms, siscomexFee, platformRates, terminalsList] =
    await Promise.all([
      getGlobalServiceFeeConfig(),
      getStateIcmsRates(),
      getSiscomexFeeConfig(),
      getGlobalPlatformRates(),
      getAllTerminals(),
    ]);

  return (
    <SettingsContent
      honorarios={honorarios}
      stateIcmsRates={stateIcms}
      siscomexFee={siscomexFee}
      platformRates={platformRates}
      terminals={terminalsList}
    />
  );
}
