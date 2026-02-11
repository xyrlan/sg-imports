'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAuth } from '@/services/auth.service';
import {
  getOrganizationById,
  updateOrganization,
} from '@/services/organization.service';

const organizationEditSchema = z.object({
  tradeName: z.string().min(2, 'Nome fantasia deve ter no mínimo 2 caracteres'),
  stateRegistry: z.string().optional(),
  taxRegime: z
    .enum(['SIMPLES_NACIONAL', 'LUCRO_PRESUMIDO', 'LUCRO_REAL'])
    .optional(),
  email: z
    .string()
    .email('E-mail inválido')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional(),
});

export interface UpdateOrganizationState {
  success?: boolean;
  error?: string;
}

/**
 * Server Action: Update organization details
 * Only OWNER and ADMIN can update
 */
export async function updateOrganizationAction(
  organizationId: string,
  _prevState: UpdateOrganizationState | null,
  formData: FormData
): Promise<UpdateOrganizationState> {
  try {
    const user = await requireAuth();

    const orgData = await getOrganizationById(organizationId, user.id);
    if (!orgData) {
      redirect('/dashboard/profile');
    }

    if (orgData.role !== 'OWNER' && orgData.role !== 'ADMIN') {
      return { error: 'Sem permissão para editar esta organização' };
    }

    const rawData = {
      tradeName: formData.get('tradeName') as string,
      stateRegistry: (formData.get('stateRegistry') as string) || undefined,
      taxRegime: (formData.get('taxRegime') as string) || undefined,
      email: (formData.get('email') as string) || undefined,
      phone: (formData.get('phone') as string) || undefined,
    };

    const validated = organizationEditSchema.safeParse({
      ...rawData,
      email: rawData.email?.trim() || undefined,
    });

    if (!validated.success) {
      return { error: validated.error.issues[0]?.message ?? 'Dados inválidos' };
    }

    const data = {
      tradeName: validated.data.tradeName,
      stateRegistry: validated.data.stateRegistry,
      taxRegime: validated.data.taxRegime as
        | 'SIMPLES_NACIONAL'
        | 'LUCRO_PRESUMIDO'
        | 'LUCRO_REAL'
        | undefined,
      email: validated.data.email || undefined,
      phone: validated.data.phone || undefined,
    };

    const updated = await updateOrganization(organizationId, user.id, data);

    if (!updated) {
      return { error: 'Erro ao atualizar organização' };
    }

    revalidatePath('/dashboard/profile', 'layout');
    revalidatePath(`/dashboard/organizations/${organizationId}/edit`, 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error updating organization:', error);
    return {
      error:
        error instanceof Error ? error.message : 'Erro ao atualizar organização',
    };
  }
}
