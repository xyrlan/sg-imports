'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ownerRegistrationSchema } from '../../schemas';

export interface RegistrationState {
  error?: string;
  success?: boolean;
}

/**
 * Server Action for OWNER registration
 * Validates input, creates Supabase Auth user with metadata
 * The database trigger will automatically create profile, organization, and membership
 */
export async function registerOwner(
  prevState: RegistrationState | null,
  formData: FormData
): Promise<RegistrationState> {
  try {
    // Extract form data
    const rawData = {
      fullName: formData.get('fullName') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      cnpj: formData.get('cnpj') as string,
    };

    // Validate with Zod
    const validatedData = ownerRegistrationSchema.parse(rawData);

    // Create Supabase client
    const supabase = await createClient();

    // Sign up user with metadata
    const { data, error } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        data: {
          role: 'OWNER',
          fullName: validatedData.fullName,
          document: validatedData.cnpj, // Already cleaned by Zod transform
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/callback`,
      },
    });

    if (error) {
      // Handle specific Supabase errors
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        return { error: 'Este e-mail já está cadastrado' };
      }
      if (error.message.includes('password')) {
        return { error: 'A senha deve ter no mínimo 8 caracteres' };
      }
      return { error: error.message };
    }

    if (!data.user) {
      return { error: 'Erro ao criar conta. Tente novamente.' };
    }

    // Success - redirect to verify email page
    redirect('/auth/verify-email');
  } catch (error) {
    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as { issues: Array<{ message: string }> };
      return { error: zodError.issues[0]?.message || 'Dados inválidos' };
    }

    // Generic error
    return { error: 'Ocorreu um erro. Tente novamente.' };
  }
}
