'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { AppCard } from '@/components/ui/card';
import { AppInput } from '@/components/ui/input';
import { AppButton } from '@/components/ui/button';
import { registerSeller } from '@/app/(auth)/register/seller/actions';

/**
 * Seller Registration Page
 * For vendors/marketplace (SELLER role)
 * Collects: Full Name, Store Name, Email, Password, Tax ID
 */
export default function SellerRegisterPage() {
  const t = useTranslations('Auth.Register.Seller');
  const [state, formAction, isPending] = useActionState(registerSeller, null);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <AppCard className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('title')}
          </h1>
          <p className="text-sm text-muted">
            SG-Imports - Sistema de Gerenciamento de Importações
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          {/* Error Message */}
          {state?.error && (
            <div className="p-3 bg-danger/10 border border-danger rounded-lg">
              <p className="text-sm text-danger">{state.error}</p>
            </div>
          )}

          {/* Full Name */}
          <AppInput
            name="fullName"
            label={t('fullName')}
            placeholder="Maria Santos"
            required
            isDisabled={isPending}
          />

          {/* Store Name */}
          <AppInput
            name="storeName"
            label={t('storeName')}
            placeholder="Minha Loja LTDA"
            required
            isDisabled={isPending}
          />

          {/* Email */}
          <AppInput
            name="email"
            type="email"
            label={t('email')}
            placeholder="maria@loja.com"
            required
            isDisabled={isPending}
          />

          {/* Tax ID */}
          <AppInput
            name="taxId"
            label={t('taxId')}
            placeholder="123456789"
            required
            isDisabled={isPending}
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
            variant="secondary"
            className="w-full"
            isLoading={isPending}
            size="lg"
          >
            {t('submit')}
          </AppButton>
        </form>

        {/* Footer Links */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-muted">
            {t('hasAccount')}{' '}
            <Link href="/login" className="text-accent hover:underline font-medium">
              {t('login')}
            </Link>
          </p>
          <p className="text-sm text-muted">
            {t('orRegisterAs')}{' '}
            <Link href="/register/owner" className="text-accent hover:underline font-medium">
              {t('owner')}
            </Link>
          </p>
        </div>
      </AppCard>
    </div>
  );
}
