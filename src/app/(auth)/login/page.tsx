'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { AppCard } from '@/components/ui/card';
import { AppInput } from '@/components/ui/input';
import { AppButton } from '@/components/ui/button';
import { loginAction } from '@/app/(auth)/login/actions';

/**
 * Login Page
 * Unified login for all user types (OWNER, SELLER, etc.)
 */
export default function LoginPage() {
  const t = useTranslations('Auth.Login');
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <AppCard className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            SG-Imports
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sistema de Gerenciamento de Importações
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          {/* Error Message */}
          {state?.error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
            </div>
          )}

          {/* Email */}
          <AppInput
            name="email"
            type="email"
            label={t('email')}
            placeholder="seu@email.com"
            required
            isDisabled={isPending}
            autoComplete="email"
          />

          {/* Password */}
          <AppInput
            name="password"
            type="password"
            label={t('password')}
            placeholder="••••••••"
            required
            isDisabled={isPending}
            autoComplete="current-password"
          />

          {/* Submit Button */}
          <AppButton
            type="submit"
            variant="primary"
            className="w-full"
            isLoading={isPending}
            size="lg"
          >
            {t('submit')}
          </AppButton>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">
              {t('noAccount')}
            </span>
          </div>
        </div>

        {/* Registration Links */}
        <div className="flex flex-col gap-2">
          <Link href="/register/owner">
            <AppButton
              variant="outline"
              className="w-full"
              size="lg"
            >
              {t('registerOwner')}
            </AppButton>
          </Link>
          
          <Link href="/register/seller">
            <AppButton
              variant="outline"
              className="w-full"
              size="lg"
            >
              {t('registerSeller')}
            </AppButton>
          </Link>
        </div>
      </AppCard>
    </div>
  );
}
