import { db } from '@/db';
import { serviceFeeConfigs, globalServiceFeeConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface ServiceFeeInput {
  clientOrganizationId: string;
  totalProductsUsd: number;
  exchangeRate: number;
  totalCostsBrl: number;
}

interface ServiceFeeResult {
  serviceFee: number;
  calculationBase: 'FOB' | 'INVOICE';
  baseValue: number;
  percentage: number;
  percentageValue: number;
  minimumValue: number;
  usedMinimum: boolean;
}

/**
 * Calculate service fee (honorários) for a shipment.
 *
 * Logic:
 * 1. Fetch org-specific config, fallback to global
 * 2. Base = FOB in BRL (if applyToChina) or totalCostsBrl (NF)
 * 3. percentageValue = base × (percentage / 100)
 * 4. minimumValue = minimumWageBrl × multiplier
 * 5. serviceFee = MAX(percentageValue, minimumValue)
 */
export async function calculateServiceFee(input: ServiceFeeInput): Promise<ServiceFeeResult> {
  const orgConfig = await db.query.serviceFeeConfigs.findFirst({
    where: eq(serviceFeeConfigs.organizationId, input.clientOrganizationId),
  });

  const global = await db.query.globalServiceFeeConfig.findFirst();
  if (!global) throw new Error('Global service fee config not found');

  const applyToChina = orgConfig?.applyToChinaProducts ?? global.defaultApplyToChina ?? true;
  const percentage = parseFloat(orgConfig?.percentage ?? global.defaultPercentage ?? '2.5');
  const multiplier = orgConfig?.minimumValueMultiplier ?? global.defaultMultiplier ?? 2;
  const minimumWageBrl = parseFloat(global.minimumWageBrl);

  const calculationBase = applyToChina ? 'FOB' : 'INVOICE';
  const baseValue = applyToChina
    ? input.totalProductsUsd * input.exchangeRate
    : input.totalCostsBrl;

  const percentageValue = roundBrl(baseValue * (percentage / 100));
  const minimumValue = roundBrl(minimumWageBrl * multiplier);
  const usedMinimum = percentageValue < minimumValue;
  const serviceFee = Math.max(percentageValue, minimumValue);

  return {
    serviceFee,
    calculationBase,
    baseValue: roundBrl(baseValue),
    percentage,
    percentageValue,
    minimumValue,
    usedMinimum,
  };
}

/** Round to 2 decimal places using banker's rounding (HALF_EVEN) */
function roundBrl(value: number): number {
  const factor = 100;
  const shifted = value * factor;
  const floored = Math.floor(shifted);
  const decimal = shifted - floored;
  if (decimal > 0.5) return (floored + 1) / factor;
  if (decimal < 0.5) return floored / factor;
  return (floored % 2 === 0 ? floored : floored + 1) / factor;
}
