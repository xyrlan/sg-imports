'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/services/auth.service';
import { updateOrganization, getOrganizationById } from '@/services/organization.service';
import { createAddress, fetchAddressFromCEP, type ViaCEPResponse } from '@/services/address.service';
import { createServiceFeeConfig, getOrCreateServiceFeeConfig } from '@/services/config.service';
import { setOrganizationCookie, getOrganizationCookie } from '@/app/(dashboard)/actions';
import { organizationDetailsSchema, addressSchema, serviceFeeConfigSchema } from './schemas';

export interface ActionState {
  error?: string;
  success?: boolean;
}

/**
 * Get the current organization ID for onboarding
 * Reads from cookie or returns the first organization
 */
async function getCurrentOrganizationId(): Promise<string | null> {
  const user = await requireAuth();
  const orgId = await getOrganizationCookie();
  
  if (orgId) {
    // Verify user has access
    const access = await getOrganizationById(orgId, user.id);
    if (access) {
      return orgId;
    }
  }
  
  return null;
}

/**
 * Server Action: Update Organization Details (Step 1)
 * Updates trade name, state registry, tax regime, email, and phone
 */
export async function updateOrganizationDetails(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireAuth();
    const orgId = await getCurrentOrganizationId();

    if (!orgId) {
      return { error: 'Organização não encontrada' };
    }

    // Extract form data
    const rawData = {
      tradeName: formData.get('tradeName') as string,
      stateRegistry: formData.get('stateRegistry') as string || undefined,
      taxRegime: formData.get('taxRegime') as string || undefined,
      email: formData.get('email') as string || undefined,
      phone: formData.get('phone') as string || undefined,
    };

    // Validate with Zod
    const validatedData = organizationDetailsSchema.parse(rawData);

    // Update organization
    const updated = await updateOrganization(orgId, user.id, validatedData);

    if (!updated) {
      return { error: 'Erro ao atualizar organização' };
    }

    return { success: true };
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as { issues: Array<{ message: string }> };
      return { error: zodError.issues[0]?.message || 'Dados inválidos' };
    }
    return { error: 'Erro ao atualizar organização' };
  }
}

/**
 * Server Action: Create Address (Step 2)
 * Creates billing and delivery addresses for the organization
 */
export async function createAddressAction(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireAuth();
    const orgId = await getCurrentOrganizationId();

    if (!orgId) {
      return { error: 'Organização não encontrada' };
    }

    // Extract form data
    const rawData = {
      postalCode: formData.get('postalCode') as string,
      street: formData.get('street') as string,
      number: formData.get('number') as string,
      complement: formData.get('complement') as string || undefined,
      neighborhood: formData.get('neighborhood') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      country: formData.get('country') as string || 'Brazil',
      sameAsDelivery: formData.get('sameAsDelivery') === 'true',
    };

    // Validate with Zod
    const validatedData = addressSchema.parse(rawData);

    // Create billing address
    const billingAddress = await createAddress({
      street: validatedData.street,
      number: validatedData.number,
      complement: validatedData.complement,
      neighborhood: validatedData.neighborhood,
      city: validatedData.city,
      state: validatedData.state,
      postalCode: validatedData.postalCode,
      country: validatedData.country,
    });

    // Create delivery address (same as billing if checkbox is checked)
    let deliveryAddressId = billingAddress.id;
    
    if (!validatedData.sameAsDelivery) {
      // If delivery is different, we would need another form step
      // For now, use the same address
      deliveryAddressId = billingAddress.id;
    }

    // Update organization with address IDs
    const updated = await updateOrganization(orgId, user.id, {
      billingAddressId: billingAddress.id,
      deliveryAddressId,
    });

    if (!updated) {
      return { error: 'Erro ao vincular endereço' };
    }

    // Revalidate dashboard path
    revalidatePath('/dashboard', 'layout');

    return { success: true };
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as { issues: Array<{ message: string }> };
      return { error: zodError.issues[0]?.message || 'Dados inválidos' };
    }
    return { error: 'Erro ao criar endereço' };
  }
}

/**
 * Server Action: Fetch CEP Data from ViaCEP API
 * Returns address data for auto-fill
 */
export async function fetchCEPData(cep: string): Promise<ViaCEPResponse | null> {
  try {
    return await fetchAddressFromCEP(cep);
  } catch (error) {
    console.error('Error fetching CEP:', error);
    return null;
  }
}

/**
 * Server Action: Save Service Fee Config (Step 3 - OWNER only)
 * Creates or updates service fee configuration
 */
export async function saveServiceFeeConfig(
  prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireAuth();
    const orgId = await getCurrentOrganizationId();

    if (!orgId) {
      return { error: 'Organização não encontrada' };
    }

    // Extract form data
    const rawData = {
      percentage: formData.get('percentage') as string || '2.5',
      minimumValue: formData.get('minimumValue') as string || '3060.00',
      currency: (formData.get('currency') as string || 'BRL') as 'BRL' | 'USD' | 'CNY' | 'EUR',
      applyToChinaProducts: formData.get('applyToChinaProducts') === 'true',
    };

    // Validate with Zod
    const validatedData = serviceFeeConfigSchema.parse(rawData);

    // Create or update config
    await createServiceFeeConfig(orgId, {
      percentage: validatedData.percentage.toString(),
      minimumValue: validatedData.minimumValue.toString(),
      currency: validatedData.currency,
      applyToChinaProducts: validatedData.applyToChinaProducts,
    });

    return { success: true };
  } catch (error) {
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as { issues: Array<{ message: string }> };
      return { error: zodError.issues[0]?.message || 'Dados inválidos' };
    }
    return { error: 'Erro ao salvar configurações' };
  }
}

/**
 * Server Action: Complete Onboarding
 * Finalizes onboarding and redirects to dashboard
 */
export async function completeOnboarding(): Promise<void> {
  try {
    const user = await requireAuth();
    const orgId = await getCurrentOrganizationId();

    if (!orgId) {
      redirect('/select-organization');
    }

    // Ensure organization has addresses
    const orgData = await getOrganizationById(orgId, user.id);
    
    if (!orgData?.organization.billingAddressId || !orgData?.organization.deliveryAddressId) {
      throw new Error('Endereço não configurado');
    }

    // Ensure service fee config exists (create with defaults if not)
    await getOrCreateServiceFeeConfig(orgId);

    // Set organization cookie
    await setOrganizationCookie(orgId);

    // Revalidate and redirect
    revalidatePath('/dashboard', 'layout');
    redirect('/dashboard');
  } catch (error) {
    console.error('Error completing onboarding:', error);
    redirect('/onboarding');
  }
}
