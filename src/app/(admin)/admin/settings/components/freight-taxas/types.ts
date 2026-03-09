import type { PricingRuleWithRelations, Port, Carrier } from '@/services/admin';

export type { PricingRuleWithRelations, Port, Carrier };

export interface PricingRuleFormData {
  scope: 'CARRIER' | 'PORT' | 'SPECIFIC';
  carrierId: string;
  portId?: string;
  containerType?: string;
  portDirection: 'ORIGIN' | 'DESTINATION' | 'BOTH';
  validFrom: string;
  validTo?: string;
  items: Array<{
    name: string;
    amount: number;
    currency: 'BRL' | 'USD' | 'CNY';
    basis: 'PER_BL' | 'PER_CONTAINER';
  }>;
}
