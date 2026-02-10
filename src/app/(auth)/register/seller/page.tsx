'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, TextField, Input, Label, Button } from '@heroui/react';
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
      <Card variant="default" className="w-full max-w-md">
        <Card.Content className="p-8">
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
            <TextField variant="primary" isDisabled={isPending} isRequired>
              <Label>{t('fullName')}</Label>
              <Input name="fullName" placeholder="Maria Santos" />
            </TextField>

            {/* Store Name */}
            <TextField variant="primary" isDisabled={isPending} isRequired>
              <Label>{t('storeName')}</Label>
              <Input name="storeName" placeholder="Minha Loja LTDA" />
            </TextField>

            {/* Email */}
            <TextField variant="primary" isDisabled={isPending} isRequired>
              <Label>{t('email')}</Label>
              <Input name="email" type="email" placeholder="maria@loja.com" />
            </TextField>

            {/* Tax ID */}
            <TextField variant="primary" isDisabled={isPending} isRequired>
              <Label>{t('taxId')}</Label>
              <Input name="taxId" placeholder="123456789" />
            </TextField>

            {/* Password */}
            <TextField variant="primary" isDisabled={isPending} isRequired>
              <Label>{t('password')}</Label>
              <Input name="password" type="password" placeholder="••••••••" />
            </TextField>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="secondary"
              className="w-full"
              isDisabled={isPending}
              size="lg"
            >
              {isPending ? 'Carregando...' : t('submit')}
            </Button>
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
        </Card.Content>
      </Card>
    </div>
  );
}
