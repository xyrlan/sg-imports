'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { sellerRegistrationSchema } from '../../schemas';
import { ensureUserSetup } from '@/services/user-setup.service';

export interface RegistrationState {
  error?: string;
  success?: boolean;
}

/**
 * Server Action for SELLER registration
 * Validates input, creates Supabase Auth user with metadata
 * Ensures profile, organization, and membership are created (fallback for trigger)
 */
export async function registerSeller(
  prevState: RegistrationState | null,
  formData: FormData
): Promise<RegistrationState> {
  try {
    // Extract form data
    const rawData = {
      fullName: formData.get('fullName') as string,
      storeName: formData.get('storeName') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      taxId: formData.get('taxId') as string,
    };

    // Validate with Zod
    const validatedData = sellerRegistrationSchema.parse(rawData);

    // Create Supabase client
    const supabase = await createClient();

    // Sign up user with metadata
    // Set emailRedirectTo for post-verification redirect
    const { data, error } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        data: {
          role: 'SELLER',
          fullName: validatedData.fullName,
          organizationName: validatedData.storeName,
          document: validatedData.taxId,
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

    // Fallback: Ensure profile, organization, and membership are created
    // This runs even if the database trigger is disabled or fails
    const setupResult = await ensureUserSetup(
      data.user.id,
      validatedData.email,
      {
        role: 'SELLER',
        fullName: validatedData.fullName,
        document: validatedData.taxId,
        organizationName: validatedData.storeName,
      }
    );

    if (!setupResult.success) {
      console.error('User setup failed:', setupResult.error);
      // Continue anyway - the trigger might have succeeded
    }

    // Supabase sends verification email automatically via configured SMTP (Mailtrap)
    // User will be redirected to /verify-email page to see instructions and resend option
    redirect(`/verify-email?email=${encodeURIComponent(validatedData.email)}`);
  } catch (error) {
    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as { issues: Array<{ message: string }> };
      return { error: zodError.issues[0]?.message || 'Dados inválidos' };
    }

    // Re-throw redirect errors (Next.js internal mechanism)
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }

    // Generic error
    return { error: 'Ocorreu um erro. Tente novamente.' };
  }
}
