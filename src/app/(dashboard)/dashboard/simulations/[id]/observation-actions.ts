'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAuthOrRedirect } from '@/services/auth.service';
import { getOrganizationById } from '@/services/organization.service';
import { addObservation, deleteObservation } from '@/services/quote-observation.service';
import { uploadObservationDocuments } from '@/services/upload.service';

const deleteObservationSchema = z.object({
  observationId: z.string().uuid(),
  quoteId: z.string().uuid(),
  organizationId: z.string().uuid(),
});

const addObservationSchema = z.object({
  quoteId: z.string().uuid(),
  organizationId: z.string().uuid(),
  description: z.string().min(1, 'Descrição é obrigatória'),
});

type ActionState = {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

export async function addObservationAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const user = await requireAuthOrRedirect();

    const parsed = addObservationSchema.safeParse({
      quoteId: formData.get('quoteId'),
      organizationId: formData.get('organizationId'),
      description: formData.get('description'),
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      return { success: false, fieldErrors };
    }

    // Verify organization ownership (defense-in-depth)
    const org = await getOrganizationById(parsed.data.organizationId, user.id);
    if (!org) {
      return { success: false, error: 'Forbidden' };
    }

    // Handle file uploads
    const files = formData.getAll('files') as File[];
    const validFiles = files.filter((f) => f instanceof File && f.size > 0);

    let documents: { name: string; url: string }[] = [];
    if (validFiles.length > 0) {
      documents = await uploadObservationDocuments(
        validFiles,
        user.id,
        parsed.data.quoteId
      );
    }

    await addObservation(
      parsed.data.quoteId,
      parsed.data.organizationId,
      user.id,
      { description: parsed.data.description, documents }
    );

    revalidatePath(`/dashboard/simulations/${parsed.data.quoteId}`);
    return { success: true };
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }
    console.error('addObservationAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao adicionar observação',
    };
  }
}

export async function deleteObservationAction(
  observationId: string,
  quoteId: string,
  organizationId: string
): Promise<ActionState> {
  try {
    const user = await requireAuthOrRedirect();

    const parsed = deleteObservationSchema.safeParse({
      observationId,
      quoteId,
      organizationId,
    });

    if (!parsed.success) {
      return { success: false, error: 'Invalid data' };
    }

    const org = await getOrganizationById(parsed.data.organizationId, user.id);
    if (!org) {
      return { success: false, error: 'Forbidden' };
    }

    await deleteObservation(
      parsed.data.observationId,
      parsed.data.quoteId,
      parsed.data.organizationId,
      user.id
    );

    revalidatePath(`/dashboard/simulations/${parsed.data.quoteId}`);
    return { success: true };
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }
    console.error('deleteObservationAction error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir observação',
    };
  }
}
