'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAuth } from '@/services/auth.service';
import { updateProfile } from '@/services/profile.service';

const updateProfileSchema = z.object({
  fullName: z
    .string()
    .optional()
    .transform((s) => (s?.trim() || undefined))
    .refine((s) => !s || s.length >= 3, 'Nome deve ter no mínimo 3 caracteres'),
  phone: z.string().optional().transform((s) => s?.trim() || undefined),
});

export interface UpdateProfileState {
  success?: boolean;
  error?: string;
}

/**
 * Server Action: Update profile (fullName, phone)
 */
export async function updateProfileAction(
  _prevState: UpdateProfileState | null,
  formData: FormData
): Promise<UpdateProfileState> {
  try {
    const user = await requireAuth();

    const rawData = {
      fullName: formData.get('fullName') as string,
      phone: formData.get('phone') as string,
    };

    const validated = updateProfileSchema.safeParse(rawData);

    if (!validated.success) {
      return { error: validated.error.issues[0]?.message ?? 'Dados inválidos' };
    }

    const data: { fullName?: string; phone?: string } = {};
    if (validated.data.fullName !== undefined) data.fullName = validated.data.fullName;
    if (validated.data.phone !== undefined) data.phone = validated.data.phone;

    const updated = await updateProfile(user.id, data);

    if (!updated) {
      return { error: 'Erro ao atualizar perfil' };
    }

    revalidatePath('/dashboard/profile', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    return {
      error: error instanceof Error ? error.message : 'Erro ao atualizar perfil',
    };
  }
}
