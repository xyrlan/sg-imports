import {
  getGlobalServiceFeeConfig,
  getStateIcmsRates,
  getSiscomexFeeConfig,
  getGlobalPlatformRates,
  getAllTerminals,
  getAllPorts,
  getAllCarriers,
  getAllCurrencyExchangeBrokers,
  getAllInternationalFreights,
  getAllPricingRules,
} from '@/services/admin';
import { SettingsContent } from './settings-content';

export default async function AdminSettingsPage() {
  const [
    honorarios,
    stateIcms,
    siscomexFee,
    platformRates,
    terminalsList,
    portsList,
    carriersList,
    currencyExchangeBrokersList,
    internationalFreightsList,
    pricingRulesList,
  ] = await Promise.all([
    getGlobalServiceFeeConfig(),
    getStateIcmsRates(),
    getSiscomexFeeConfig(),
    getGlobalPlatformRates(),
    getAllTerminals(),
    getAllPorts(),
    getAllCarriers(),
    getAllCurrencyExchangeBrokers(),
    getAllInternationalFreights(),
    getAllPricingRules(),
  ]);

  return (
    <SettingsContent
      honorarios={honorarios}
      stateIcmsRates={stateIcms}
      siscomexFee={siscomexFee}
      platformRates={platformRates}
      terminals={terminalsList}
      ports={portsList}
      carriers={carriersList}
      currencyExchangeBrokers={currencyExchangeBrokersList}
      internationalFreights={internationalFreightsList}
      pricingRules={pricingRulesList}
    />
  );
}
