'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createFirstOrganization } from '@/services/organization.service';
import { setOrganizationCookie } from '@/app/(dashboard)/actions';

const createOrganizationSchema = z.object({
  companyName: z.string().min(3, 'Nome da empresa deve ter no mínimo 3 caracteres'),
  cnpj: z
    .string()
    .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido (formato: XX.XXX.XXX/XXXX-XX)')
    .transform((val) => val.replace(/[^\d]/g, '')),
});

export interface CreateFirstOrganizationState {
  error?: string;
}

/**
 * Server Action: Create first organization for user with zero organizations
 * Fallback for when ensureUserSetup fails or user has no orgs
 */
export async function createFirstOrganizationAction(
  _prevState: CreateFirstOrganizationState | null,
  formData: FormData
): Promise<CreateFirstOrganizationState> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      redirect('/login');
    }

    // Ensure profile exists (required for membership FK - user may have no profile if trigger failed)
    const { ensureProfileExists } = await import('@/services/user-setup.service');
    await ensureProfileExists(
      user.id,
      user.email ?? `${user.id}@temp.local`,
      user.user_metadata?.full_name as string | undefined
    );

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

    const result = await createFirstOrganization(user.id, {
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
