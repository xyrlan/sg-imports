'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createOrganizationForOwner } from '@/services/organization.service';
import { setOrganizationCookie } from '@/app/(dashboard)/actions';

const createOrganizationSchema = z.object({
  companyName: z.string().min(3, 'Nome da empresa deve ter no mínimo 3 caracteres'),
  cnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido (formato: XX.XXX.XXX/XXXX-XX)')
    .transform((val) => val.replace(/[^\d]/g, '')),
});

export interface CreateOrganizationState {
  error?: string;
}

/**
 * Server Action: Create new organization for authenticated OWNER
 * Validates user is OWNER, creates org + membership, sets cookie, redirects to onboarding
 */
export async function createOrganization(
  _prevState: CreateOrganizationState | null,
  formData: FormData
): Promise<CreateOrganizationState> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect('/login');
    }

    const rawData = {
      companyName: formData.get('companyName') as string,
      cnpj: formData.get('cnpj') as string,
    };

    const validated = createOrganizationSchema.safeParse(rawData);
    if (!validated.success) {
      return {
        error: validated.error.issues[0]?.message ?? 'Dados inválidos',
      };
    }

    const result = await createOrganizationForOwner(user.id, {
      name: validated.data.companyName,
      document: validated.data.cnpj,
    });

    if ('error' in result) {
      return { error: result.error };
    }

    await setOrganizationCookie(result.organization.id);
    redirect('/onboarding');
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err;
    }
    return {
      error:
        err instanceof Error ? err.message : 'Ocorreu um erro ao criar a organização.',
    };
  }
}
