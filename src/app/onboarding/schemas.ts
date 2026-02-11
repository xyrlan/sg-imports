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

const postalCodeSchema = z
  .string()
  .regex(/^\d{5}-?\d{3}$/, 'Onboarding.Errors.invalidCEP')
  .transform((val) => val.replace(/\D/g, ''));

/**
 * Schema for Step 2: Address
 * Validates Brazilian address with CEP (postal code)
 * - SELLER: single address only
 * - OWNER: billing + optional delivery (when sameAsDelivery is false)
 */
export const addressSchema = z
  .object({
    role: z.string().optional(),
    postalCode: postalCodeSchema,
    street: z.string().min(3, 'Onboarding.Errors.requiredField'),
    number: z.string().min(1, 'Onboarding.Errors.requiredField'),
    complement: z.string().optional(),
    neighborhood: z.string().min(2, 'Onboarding.Errors.requiredField'),
    city: z.string().min(2, 'Onboarding.Errors.requiredField'),
    state: z.string().length(2, 'Onboarding.Errors.invalidState'),
    country: z.string().default('Brazil'),
    sameAsDelivery: z
      .string()
      .optional()
      .transform((val) => val !== 'false'),
    // Delivery address fields (OWNER only, when sameAsDelivery is false)
    deliveryPostalCode: z.string().optional(),
    deliveryStreet: z.string().optional(),
    deliveryNumber: z.string().optional(),
    deliveryComplement: z.string().optional(),
    deliveryNeighborhood: z.string().optional(),
    deliveryCity: z.string().optional(),
    deliveryState: z.string().optional(),
    deliveryCountry: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // When OWNER and delivery is different, validate delivery fields
    const isOwner = data.role === 'OWNER';
    const needsDeliveryAddress = isOwner && data.sameAsDelivery === false;

    if (needsDeliveryAddress) {
      if (!data.deliveryPostalCode || !/^\d{5}-?\d{3}$/.test(data.deliveryPostalCode.replace(/\D/g, ''))) {
        ctx.addIssue({ code: 'custom', message: 'Onboarding.Errors.invalidCEP', path: ['deliveryPostalCode'] });
      }
      if (!data.deliveryStreet || data.deliveryStreet.length < 3) {
        ctx.addIssue({ code: 'custom', message: 'Onboarding.Errors.requiredField', path: ['deliveryStreet'] });
      }
      if (!data.deliveryNumber || data.deliveryNumber.length < 1) {
        ctx.addIssue({ code: 'custom', message: 'Onboarding.Errors.requiredField', path: ['deliveryNumber'] });
      }
      if (!data.deliveryNeighborhood || data.deliveryNeighborhood.length < 2) {
        ctx.addIssue({ code: 'custom', message: 'Onboarding.Errors.requiredField', path: ['deliveryNeighborhood'] });
      }
      if (!data.deliveryCity || data.deliveryCity.length < 2) {
        ctx.addIssue({ code: 'custom', message: 'Onboarding.Errors.requiredField', path: ['deliveryCity'] });
      }
      if (!data.deliveryState || data.deliveryState.length !== 2) {
        ctx.addIssue({ code: 'custom', message: 'Onboarding.Errors.invalidState', path: ['deliveryState'] });
      }
    }
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
