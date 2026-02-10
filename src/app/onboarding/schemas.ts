import { z } from 'zod';

/**
 * Schema for Step 1: Organization Details
 * Validates company information like trade name, tax regime, etc.
 */
export const organizationDetailsSchema = z.object({
  tradeName: z.string().min(2, 'Onboarding.Errors.requiredField'),
  stateRegistry: z.string().optional(),
  taxRegime: z.enum(['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL']).optional(),
  email: z.string().email('Onboarding.Errors.invalidEmail').optional().or(z.literal('')),
  phone: z.string().optional(),
});

export type OrganizationDetailsData = z.infer<typeof organizationDetailsSchema>;

/**
 * Schema for Step 2: Address
 * Validates Brazilian address with CEP (postal code)
 */
export const addressSchema = z.object({
  postalCode: z
    .string()
    .regex(/^\d{5}-?\d{3}$/, 'Onboarding.Errors.invalidCEP')
    .transform((val) => val.replace(/\D/g, '')), // Remove formatting
  street: z.string().min(3, 'Onboarding.Errors.requiredField'),
  number: z.string().min(1, 'Onboarding.Errors.requiredField'),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, 'Onboarding.Errors.requiredField'),
  city: z.string().min(2, 'Onboarding.Errors.requiredField'),
  state: z.string().length(2, 'Onboarding.Errors.invalidState'),
  country: z.string().default('Brazil'),
  sameAsDelivery: z.boolean().default(true).optional(),
});

export type AddressData = z.infer<typeof addressSchema>;

/**
 * Schema for Step 3: Service Fee Configuration (OWNER only)
 * Validates service fee settings with defaults
 */
export const serviceFeeConfigSchema = z.object({
  percentage: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(z.number().min(0).max(100))
    .default(2.5),
  minimumValue: z
    .string()
    .transform((val) => parseFloat(val))
    .pipe(z.number().min(0))
    .default(3060.0),
  currency: z.enum(['BRL', 'USD', 'CNY', 'EUR']).default('BRL'),
  applyToChinaProducts: z.boolean().default(true),
});

export type ServiceFeeConfigData = z.infer<typeof serviceFeeConfigSchema>;

/**
 * Combined schema for complete onboarding validation
 */
export const completeOnboardingSchema = z.object({
  organization: organizationDetailsSchema,
  address: addressSchema,
  config: serviceFeeConfigSchema.optional(),
});

export type CompleteOnboardingData = z.infer<typeof completeOnboardingSchema>;
