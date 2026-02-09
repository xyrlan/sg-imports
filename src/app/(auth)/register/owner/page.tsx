'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { AppCard } from '@/components/ui/card';
import { AppInput } from '@/components/ui/input';
import { AppButton } from '@/components/ui/button';
import { registerOwner } from './actions';

/**
 * Owner Registration Page
 * For importing clients (OWNER role)
 * Collects: Full Name, Email, Password, CNPJ
 */
export default function OwnerRegisterPage() {
  const t = useTranslations('Auth.Register.Owner');
  const [state, formAction, isPending] = useActionState(registerOwner, null);

  // CNPJ mask handler
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    // Apply mask: XX.XXX.XXX/XXXX-XX
    if (value.length <= 14) {
      value = value.replace(/^(\d{2})(\d)/, '$1.$2');
      value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
      value = value.replace(/(\d{4})(\d)/, '$1-$2');
    }
    
    e.target.value = value;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <AppCard className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            SG-Imports - Sistema de Gerenciamento de Importações
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          {/* Error Message */}
          {state?.error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
            </div>
          )}

          {/* Full Name */}
          <AppInput
            name="fullName"
            label={t('fullName')}
            placeholder="João Silva"
            required
            isDisabled={isPending}
          />

          {/* Email */}
          <AppInput
            name="email"
            type="email"
            label={t('email')}
            placeholder="joao@empresa.com.br"
            required
            isDisabled={isPending}
          />

          {/* CNPJ with mask */}
          <AppInput
            name="cnpj"
            label={t('cnpj')}
            placeholder="00.000.000/0000-00"
            required
            isDisabled={isPending}
            maxLength={18}
            onChange={handleCnpjChange}
          />

          {/* Password */}
          <AppInput
            name="password"
            type="password"
            label={t('password')}
            placeholder="••••••••"
            required
            isDisabled={isPending}
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

        {/* Footer Links */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('hasAccount')}{' '}
            <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              {t('login')}
            </Link>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('orRegisterAs')}{' '}
            <Link href="/register/seller" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              {t('seller')}
            </Link>
          </p>
        </div>
      </AppCard>
    </div>
  );
}
