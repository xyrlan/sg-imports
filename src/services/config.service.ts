import { db } from '@/db';
import { serviceFeeConfigs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

type ServiceFeeConfig = InferSelectModel<typeof serviceFeeConfigs>;
type ServiceFeeConfigInsert = InferInsertModel<typeof serviceFeeConfigs>;

export interface ServiceFeeConfigData {
  percentage?: string;
  minimumValue?: string;
  currency?: 'BRL' | 'USD' | 'CNY' | 'EUR';
  applyToChinaProducts?: boolean;
}

/**
 * Create service fee config for an organization with default or custom values
 * @param organizationId - Organization UUID
 * @param data - Optional custom configuration
 * @returns Created service fee config
 */
export async function createServiceFeeConfig(
  organizationId: string,
  data?: ServiceFeeConfigData
): Promise<ServiceFeeConfig> {
  const configData: ServiceFeeConfigInsert = {
    organizationId,
    percentage: data?.percentage || '2.5',
    minimumValue: data?.minimumValue || '3060.00',
    currency: data?.currency || 'BRL',
    applyToChinaProducts: data?.applyToChinaProducts ?? true,
  };

  const [config] = await db
    .insert(serviceFeeConfigs)
    .values(configData)
    .returning();

  return config;
}

/**
 * Get service fee config for an organization
 * @param organizationId - Organization UUID
 * @returns Service fee config or null if not found
 */
export async function getServiceFeeConfig(
  organizationId: string
): Promise<ServiceFeeConfig | null> {
  const config = await db.query.serviceFeeConfigs.findFirst({
    where: eq(serviceFeeConfigs.organizationId, organizationId),
  });

  return config || null;
}

/**
 * Update service fee config for an organization
 * @param organizationId - Organization UUID
 * @param data - Updated configuration data
 * @returns Updated service fee config or null if not found
 */
export async function updateServiceFeeConfig(
  organizationId: string,
  data: ServiceFeeConfigData
): Promise<ServiceFeeConfig | null> {
  const [config] = await db
    .update(serviceFeeConfigs)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(serviceFeeConfigs.organizationId, organizationId))
    .returning();

  return config || null;
}

/**
 * Get or create service fee config for an organization
 * If config doesn't exist, creates one with default values
 * @param organizationId - Organization UUID
 * @returns Service fee config
 */
export async function getOrCreateServiceFeeConfig(
  organizationId: string
): Promise<ServiceFeeConfig> {
  const existing = await getServiceFeeConfig(organizationId);
  
  if (existing) {
    return existing;
  }

  return createServiceFeeConfig(organizationId);
}
