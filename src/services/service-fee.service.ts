import { db } from '@/db';
import { serviceFeeConfigs, globalServiceFeeConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { roundMoney } from '@/lib/currency';

interface ServiceFeeInput {
  quoteId: string;
  totalProductsUsd: number;
  exchangeRate: number;
  totalCostsBrl: number;
}

export interface ServiceFeeResult {
  serviceFee: number;
  calculationBase: 'FOB' | 'INVOICE';
  baseValue: number;
  percentage: number;
  percentageValue: number;
  minimumValue: number;
  usedMinimum: boolean;
}

/**
 * Calculate service fee (honorários) for a quote.
 *
 * Logic:
 * 1. Fetch quote-specific config, fallback to global
 * 2. Base = FOB in BRL (if applyToChina) or totalCostsBrl (NF)
 * 3. percentageValue = base × (percentage / 100)
 * 4. minimumValue = minimumWageBrl × multiplier
 * 5. serviceFee = MAX(percentageValue, minimumValue)
 */
export async function calculateServiceFee(input: ServiceFeeInput): Promise<ServiceFeeResult> {
  const [quoteConfig, global] = await Promise.all([
    db.query.serviceFeeConfigs.findFirst({
      where: eq(serviceFeeConfigs.quoteId, input.quoteId),
    }),
    db.query.globalServiceFeeConfig.findFirst(),
  ]);

  if (!global) throw new Error('Global service fee config not found');

  const applyToChina = quoteConfig?.applyToChinaProducts ?? global.defaultApplyToChina ?? true;
  const percentage = parseFloat(quoteConfig?.percentage ?? global.defaultPercentage ?? '2.5');
  const multiplier = quoteConfig?.minimumValueMultiplier ?? global.defaultMultiplier ?? 2;
  const minimumWageBrl = parseFloat(global.minimumWageBrl);

  const calculationBase = applyToChina ? 'FOB' : 'INVOICE';
  const baseValue = applyToChina
    ? input.totalProductsUsd * input.exchangeRate
    : input.totalCostsBrl;

  const percentageValue = roundMoney(baseValue * (percentage / 100));
  const minimumValue = roundMoney(minimumWageBrl * multiplier);
  const usedMinimum = percentageValue < minimumValue;
  const serviceFee = Math.max(percentageValue, minimumValue);

  return {
    serviceFee,
    calculationBase,
    baseValue: roundMoney(baseValue),
    percentage,
    percentageValue,
    minimumValue,
    usedMinimum,
  };
}
