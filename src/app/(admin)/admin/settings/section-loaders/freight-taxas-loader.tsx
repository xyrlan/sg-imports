import {
  getAllPricingRules,
  getAllPorts,
} from '@/services/admin';
import { FreightTaxasSection } from '../components';

export async function FreightTaxasLoader() {
  const [pricingRules, ports] = await Promise.all([
    getAllPricingRules(),
    getAllPorts(),
  ]);

  return (
    <FreightTaxasSection
      pricingRules={pricingRules}
      ports={ports}
    />
  );
}
