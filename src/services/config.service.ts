import { db } from '@/db';
import { serviceFeeConfigs, globalServiceFeeConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

type ServiceFeeConfig = InferSelectModel<typeof serviceFeeConfigs>;

export interface ServiceFeeConfigData {
  percentage?: string;
  minimumValueMultiplier?: number;
  applyToChinaProducts?: boolean;
}

/**
 * Create service fee config for a quote, using global defaults as base.
 */
export async function createServiceFeeConfig(
  quoteId: string,
  data?: ServiceFeeConfigData
): Promise<ServiceFeeConfig> {
  let defaults: ServiceFeeConfigData = {
    percentage: '2.5',
    minimumValueMultiplier: 2,
    applyToChinaProducts: true,
  };

  // Fetch global defaults
  const global = await db.query.globalServiceFeeConfig.findFirst();
  if (global) {
    defaults = {
      percentage: global.defaultPercentage ?? '2.5',
      minimumValueMultiplier: global.defaultMultiplier ?? 2,
      applyToChinaProducts: global.defaultApplyToChina ?? true,
    };
  }

  const [config] = await db
    .insert(serviceFeeConfigs)
    .values({
      quoteId,
      percentage: data?.percentage ?? defaults.percentage,
      minimumValueMultiplier: data?.minimumValueMultiplier ?? defaults.minimumValueMultiplier,
      applyToChinaProducts: data?.applyToChinaProducts ?? defaults.applyToChinaProducts,
    })
    .onConflictDoNothing({ target: serviceFeeConfigs.quoteId })
    .returning();

  // If conflict occurred (already exists), fetch existing
  if (!config) {
    return (await getServiceFeeConfig(quoteId))!;
  }

  return config;
}

/**
 * Get service fee config for a quote.
 */
export async function getServiceFeeConfig(
  quoteId: string
): Promise<ServiceFeeConfig | null> {
  const config = await db.query.serviceFeeConfigs.findFirst({
    where: eq(serviceFeeConfigs.quoteId, quoteId),
  });

  return config || null;
}

/**
 * Update service fee config for a quote.
 */
export async function updateServiceFeeConfig(
  quoteId: string,
  data: ServiceFeeConfigData
): Promise<ServiceFeeConfig | null> {
  const [config] = await db
    .update(serviceFeeConfigs)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(serviceFeeConfigs.quoteId, quoteId))
    .returning();

  return config || null;
}

/**
 * Get or create service fee config for a quote.
 * If config doesn't exist, creates one with global defaults.
 */
export async function getOrCreateServiceFeeConfig(
  quoteId: string
): Promise<ServiceFeeConfig> {
  const existing = await getServiceFeeConfig(quoteId);

  if (existing) {
    return existing;
  }

  return createServiceFeeConfig(quoteId);
}
