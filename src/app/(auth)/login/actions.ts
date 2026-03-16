'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loginSchema } from '@/app/(auth)/schemas';
import { getUserOrganizations } from '@/services/organization.service';
import { setOrganizationCookie } from '@/app/(dashboard)/actions';
import { getSafeRedirect, isSafeRedirect } from '@/lib/safe-redirect';

export interface LoginState {
  error?: string;
  success?: boolean;
}

/**
 * Server Action for user login
 * Validates credentials and signs in with Supabase Auth
 * Redirects to select-organization or dashboard based on organizations count
 */
export async function loginAction(
  prevState: LoginState | null,
  formData: FormData
): Promise<LoginState> {
  try {
    // Extract form data
    const rawData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    };

    // Validate with Zod
    const validatedData = loginSchema.parse(rawData);

    // Create Supabase client
    const supabase = await createClient();

    // Sign in with password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    });

    if (error) {
      // Handle specific Supabase errors
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'E-mail ou senha inválidos' };
      }
      if (error.message.includes('Email not confirmed')) {
        return { error: 'Confirme seu e-mail antes de fazer login' };
      }
      return { error: error.message };
    }

    if (!data.user) {
      return { error: 'Erro ao fazer login. Tente novamente.' };
    }

    const next = formData.get('next') as string | null;
    const organizations = await getUserOrganizations(data.user.id);

    if (organizations.length === 0) {
      redirect('/create-organization' + (isSafeRedirect(next) ? '?next=' + encodeURIComponent(next!) : ''));
    }
    if (organizations.length === 1) {
      await setOrganizationCookie(organizations[0].organization.id);
      redirect(getSafeRedirect(next, '/dashboard'));
    }
    redirect(getSafeRedirect(next, '/select-organization'));
  } catch (error) {
    // NEXT_REDIRECT is a special error thrown by Next.js redirect()
    // It has a 'digest' property and should be re-thrown, not handled
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }

    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const zodError = error as { issues: Array<{ message: string }> };
      return { error: zodError.issues[0]?.message || 'Dados inválidos' };
    }

    // Generic error
    return { error: 'Ocorreu um erro. Tente novamente.' };
  }
}
