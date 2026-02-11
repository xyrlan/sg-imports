'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAuth } from '@/services/auth.service';
import { getUserProfile } from '@/services/auth.service';
import { updateProfileAsAdmin } from '@/services/admin';
import { uploadProfileDocument, validateFile } from '@/services/upload.service';

const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  systemRole: z.enum(['USER', 'SUPER_ADMIN', 'SUPER_ADMIN_EMPLOYEE']),
});

export interface UpdateProfileAdminState {
  success?: boolean;
  error?: string;
}

export interface UploadDocumentAdminState {
  success?: boolean;
  error?: string;
}

/**
 * Server Action: Update a user profile as admin
 * Only SUPER_ADMIN can execute this action.
 */
export async function updateProfileAdminAction(
  profileId: string,
  _prevState: UpdateProfileAdminState | null,
  formData: FormData,
): Promise<UpdateProfileAdminState> {
  try {
    // Auth: require logged in user
    const user = await requireAuth();

    // Auth: check caller is SUPER_ADMIN
    const callerProfile = await getUserProfile(user.id);
    if (!callerProfile || callerProfile.systemRole !== 'SUPER_ADMIN') {
      return { error: 'Sem permissão para executar esta ação' };
    }

    const rawData = {
      fullName: (formData.get('fullName') as string) || undefined,
      phone: (formData.get('phone') as string) || undefined,
      systemRole: formData.get('systemRole') as string,
    };

    const validated = updateProfileSchema.safeParse(rawData);

    if (!validated.success) {
      return { error: validated.error.issues[0]?.message ?? 'Dados inválidos' };
    }

    const data = {
      fullName: validated.data.fullName || undefined,
      phone: validated.data.phone || undefined,
      systemRole: validated.data.systemRole,
    };

    const updated = await updateProfileAsAdmin(profileId, data);

    if (!updated) {
      return { error: 'Erro ao atualizar perfil' };
    }

    revalidatePath('/admin/management');
    revalidatePath(`/admin/users/${profileId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating profile as admin:', error);
    return {
      error: error instanceof Error ? error.message : 'Erro ao atualizar perfil',
    };
  }
}

/**
 * Server Action: Upload profile documents as admin
 * Only SUPER_ADMIN can execute this action.
 */
export async function uploadProfileDocumentsAdminAction(
  profileId: string,
  _prevState: UploadDocumentAdminState | null,
  formData: FormData,
): Promise<UploadDocumentAdminState> {
  try {
    const user = await requireAuth();
    const callerProfile = await getUserProfile(user.id);
    if (!callerProfile || callerProfile.systemRole !== 'SUPER_ADMIN') {
      return { error: 'Sem permissão para executar esta ação' };
    }

    const documentPhoto = formData.get('documentPhoto') as File | null;
    const addressProof = formData.get('addressProof') as File | null;

    if (!documentPhoto?.size && !addressProof?.size) {
      return { error: 'Selecione pelo menos um arquivo para enviar' };
    }

    const updateData: Record<string, string> = {};

    if (documentPhoto && documentPhoto.size > 0) {
      const validation = validateFile(documentPhoto);
      if (!validation.valid) {
        return { error: validation.error };
      }
      const url = await uploadProfileDocument(documentPhoto, profileId, 'document');
      updateData.documentPhotoUrl = url;
    }

    if (addressProof && addressProof.size > 0) {
      const validation = validateFile(addressProof);
      if (!validation.valid) {
        return { error: validation.error };
      }
      const url = await uploadProfileDocument(addressProof, profileId, 'address');
      updateData.addressProofUrl = url;
    }

    if (Object.keys(updateData).length > 0) {
      await updateProfileAsAdmin(profileId, updateData);
    }

    revalidatePath('/admin/management');
    revalidatePath(`/admin/users/${profileId}`);
    return { success: true };
  } catch (error) {
    console.error('Error uploading profile documents as admin:', error);
    return {
      error: error instanceof Error ? error.message : 'Erro ao enviar documentos',
    };
  }
}
