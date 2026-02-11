'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAuth } from '@/services/auth.service';
import { getUserProfile } from '@/services/auth.service';
import {
  updateOrganizationAsAdmin,
  updateMembershipRole,
  upsertServiceFeeConfig,
} from '@/services/admin';
import { createAddress, updateAddress, fetchAddressFromCEP } from '@/services/address.service';
import type { ViaCEPResponse } from '@/services/address.service';
import { uploadOrganizationDocument, validateFile } from '@/services/upload.service';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';

// ============================================
// Helpers
// ============================================

async function requireSuperAdmin() {
  const user = await requireAuth();
  const callerProfile = await getUserProfile(user.id);
  if (!callerProfile || callerProfile.systemRole !== 'SUPER_ADMIN') {
    throw new Error('Sem permissão para executar esta ação');
  }
  return user;
}

// ============================================
// Schemas
// ============================================

const updateOrganizationSchema = z.object({
  tradeName: z.string().optional().or(z.literal('')),
  stateRegistry: z.string().optional().or(z.literal('')),
  taxRegime: z
    .enum(['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL'])
    .optional()
    .or(z.literal('')),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  orderType: z.enum(['ORDER', 'DIRECT_ORDER']).optional(),
  minOrderValue: z.string().optional().or(z.literal('')),
});

const addressSchema = z.object({
  postalCode: z.string().min(8, 'CEP inválido'),
  street: z.string().min(1, 'Logradouro obrigatório'),
  number: z.string().min(1, 'Número obrigatório'),
  complement: z.string().optional().or(z.literal('')),
  neighborhood: z.string().min(1, 'Bairro obrigatório'),
  city: z.string().min(1, 'Cidade obrigatória'),
  state: z.string().length(2, 'UF deve ter 2 caracteres'),
});

// ============================================
// State types
// ============================================

export interface UpdateOrganizationAdminState {
  success?: boolean;
  error?: string;
}

export interface UploadSocialContractState {
  success?: boolean;
  error?: string;
}

export interface UpdateAddressAdminState {
  success?: boolean;
  error?: string;
}

export interface UpdateMemberRoleState {
  success?: boolean;
  error?: string;
}

export interface UpdateServiceFeeState {
  success?: boolean;
  error?: string;
}

// ============================================
// Actions
// ============================================

/**
 * Server Action: Update organization fields as admin
 */
export async function updateOrganizationAdminAction(
  orgId: string,
  _prevState: UpdateOrganizationAdminState | null,
  formData: FormData,
): Promise<UpdateOrganizationAdminState> {
  try {
    await requireSuperAdmin();

    const rawData = {
      tradeName: (formData.get('tradeName') as string) || undefined,
      stateRegistry: (formData.get('stateRegistry') as string) || undefined,
      taxRegime: (formData.get('taxRegime') as string) || undefined,
      email: (formData.get('email') as string) || undefined,
      phone: (formData.get('phone') as string) || undefined,
      orderType: (formData.get('orderType') as string) || undefined,
      minOrderValue: (formData.get('minOrderValue') as string) || undefined,
    };

    const validated = updateOrganizationSchema.safeParse(rawData);

    if (!validated.success) {
      return { error: validated.error.issues[0]?.message ?? 'Dados inválidos' };
    }

    const data = {
      tradeName: validated.data.tradeName || undefined,
      stateRegistry: validated.data.stateRegistry || undefined,
      taxRegime: validated.data.taxRegime || undefined,
      email: validated.data.email || undefined,
      phone: validated.data.phone || undefined,
      orderType: validated.data.orderType as 'ORDER' | 'DIRECT_ORDER' | undefined,
      minOrderValue: validated.data.minOrderValue || undefined,
    };

    const updated = await updateOrganizationAsAdmin(orgId, data);

    if (!updated) {
      return { error: 'Erro ao atualizar organização' };
    }

    revalidatePath('/admin/management');
    revalidatePath(`/admin/organizations/${orgId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating organization as admin:', error);
    return {
      error: error instanceof Error ? error.message : 'Erro ao atualizar organização',
    };
  }
}

/**
 * Server Action: Upload social contract as admin
 */
export async function uploadSocialContractAdminAction(
  orgId: string,
  _prevState: UploadSocialContractState | null,
  formData: FormData,
): Promise<UploadSocialContractState> {
  try {
    const user = await requireSuperAdmin();

    const file = formData.get('socialContract') as File | null;
    if (!file || file.size === 0) {
      return { error: 'Selecione um arquivo para enviar' };
    }

    const validation = validateFile(file);
    if (!validation.valid) {
      return { error: validation.error };
    }

    const url = await uploadOrganizationDocument(file, user.id, orgId);
    await updateOrganizationAsAdmin(orgId, { socialContractUrl: url });

    revalidatePath('/admin/management');
    revalidatePath(`/admin/organizations/${orgId}`);
    return { success: true };
  } catch (error) {
    console.error('Error uploading social contract as admin:', error);
    return {
      error: error instanceof Error ? error.message : 'Erro ao enviar contrato social',
    };
  }
}

/**
 * Server Action: Create or update addresses for an organization
 */
export async function updateOrganizationAddressAdminAction(
  orgId: string,
  _prevState: UpdateAddressAdminState | null,
  formData: FormData,
): Promise<UpdateAddressAdminState> {
  try {
    await requireSuperAdmin();

    // Parse billing address fields
    const billingData = {
      postalCode: (formData.get('billing_postalCode') as string) ?? '',
      street: (formData.get('billing_street') as string) ?? '',
      number: (formData.get('billing_number') as string) ?? '',
      complement: (formData.get('billing_complement') as string) || undefined,
      neighborhood: (formData.get('billing_neighborhood') as string) ?? '',
      city: (formData.get('billing_city') as string) ?? '',
      state: (formData.get('billing_state') as string) ?? '',
    };

    const billingValidated = addressSchema.safeParse(billingData);
    if (!billingValidated.success) {
      return { error: `Faturamento: ${billingValidated.error.issues[0]?.message ?? 'Dados inválidos'}` };
    }

    // Parse delivery address fields
    const sameAsDelivery = formData.get('sameAsDelivery') === 'true';

    let deliveryValidated;
    if (!sameAsDelivery) {
      const deliveryData = {
        postalCode: (formData.get('delivery_postalCode') as string) ?? '',
        street: (formData.get('delivery_street') as string) ?? '',
        number: (formData.get('delivery_number') as string) ?? '',
        complement: (formData.get('delivery_complement') as string) || undefined,
        neighborhood: (formData.get('delivery_neighborhood') as string) ?? '',
        city: (formData.get('delivery_city') as string) ?? '',
        state: (formData.get('delivery_state') as string) ?? '',
      };

      deliveryValidated = addressSchema.safeParse(deliveryData);
      if (!deliveryValidated.success) {
        return { error: `Entrega: ${deliveryValidated.error.issues[0]?.message ?? 'Dados inválidos'}` };
      }
    }

    // Get existing address IDs
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
      columns: { billingAddressId: true, deliveryAddressId: true },
    });

    if (!org) {
      return { error: 'Organização não encontrada' };
    }

    // Create or update billing address
    let billingAddressId: string;
    if (org.billingAddressId) {
      const updated = await updateAddress(org.billingAddressId, {
        ...billingValidated.data,
        complement: billingValidated.data.complement || null,
      });
      billingAddressId = updated?.id ?? org.billingAddressId;
    } else {
      const created = await createAddress({
        ...billingValidated.data,
        complement: billingValidated.data.complement || null,
      });
      billingAddressId = created.id;
    }

    // Create or update delivery address
    let deliveryAddressId: string;
    if (sameAsDelivery) {
      deliveryAddressId = billingAddressId;
    } else if (deliveryValidated?.data) {
      if (org.deliveryAddressId && org.deliveryAddressId !== org.billingAddressId) {
        const updated = await updateAddress(org.deliveryAddressId, {
          ...deliveryValidated.data,
          complement: deliveryValidated.data.complement || null,
        });
        deliveryAddressId = updated?.id ?? org.deliveryAddressId;
      } else {
        const created = await createAddress({
          ...deliveryValidated.data,
          complement: deliveryValidated.data.complement || null,
        });
        deliveryAddressId = created.id;
      }
    } else {
      deliveryAddressId = billingAddressId;
    }

    // Update organization with address IDs
    await db
      .update(organizations)
      .set({
        billingAddressId,
        deliveryAddressId,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, orgId));

    revalidatePath('/admin/management');
    revalidatePath(`/admin/organizations/${orgId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating organization address as admin:', error);
    return {
      error: error instanceof Error ? error.message : 'Erro ao atualizar endereço',
    };
  }
}

/**
 * Server Action: Update a member's role in an organization
 */
export async function updateMemberRoleAdminAction(
  orgId: string,
  profileId: string,
  role: string,
): Promise<UpdateMemberRoleState> {
  try {
    await requireSuperAdmin();

    const validRoles = ['OWNER', 'ADMIN', 'EMPLOYEE', 'SELLER', 'CUSTOMS_BROKER', 'VIEWER'];
    if (!validRoles.includes(role)) {
      return { error: 'Papel inválido' };
    }

    const success = await updateMembershipRole(orgId, profileId, role);
    if (!success) {
      return { error: 'Erro ao atualizar papel do membro' };
    }

    revalidatePath(`/admin/organizations/${orgId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating member role as admin:', error);
    return {
      error: error instanceof Error ? error.message : 'Erro ao atualizar papel',
    };
  }
}

/**
 * Server Action: Create or update service fee configuration for an organization
 */
export async function updateServiceFeeAdminAction(
  orgId: string,
  _prevState: UpdateServiceFeeState | null,
  formData: FormData,
): Promise<UpdateServiceFeeState> {
  try {
    await requireSuperAdmin();

    const percentage = (formData.get('percentage') as string) ?? '';
    const multiplierStr = (formData.get('minimumValueMultiplier') as string) ?? '2';
    const applyToChinaProducts = formData.get('applyToChinaProducts') === 'true';

    // NumberField with formatOptions percent uses 0-1 range (0.025 = 2.5%)
    const rawPercentage = parseFloat(percentage);
    const parsedPercentage = rawPercentage <= 1 ? rawPercentage * 100 : rawPercentage;
    if (isNaN(parsedPercentage) || parsedPercentage < 0 || parsedPercentage > 100) {
      return { error: 'Porcentagem deve estar entre 0 e 100' };
    }

    // Validate multiplier (2x, 3x, 4x salary)
    const multiplier = parseInt(multiplierStr, 10);
    if (![2, 3, 4].includes(multiplier)) {
      return { error: 'Multiplicador deve ser 2, 3 ou 4' };
    }

    await upsertServiceFeeConfig(orgId, {
      percentage: parsedPercentage.toFixed(2),
      minimumValueMultiplier: multiplier,
      applyToChinaProducts,
    });

    revalidatePath(`/admin/organizations/${orgId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating service fee config as admin:', error);
    return {
      error: error instanceof Error ? error.message : 'Erro ao atualizar configuração de honorários',
    };
  }
}

/**
 * Server Action: Fetch CEP data (admin context wrapper)
 */
export async function fetchCEPDataAdmin(cep: string): Promise<ViaCEPResponse | null> {
  try {
    return await fetchAddressFromCEP(cep);
  } catch (error) {
    console.error('Error fetching CEP:', error);
    return null;
  }
}
