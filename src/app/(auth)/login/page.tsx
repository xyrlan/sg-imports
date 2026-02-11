'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, TextField, Input, Label, Button } from '@heroui/react';
import { loginAction } from '@/app/(auth)/login/actions';

/**
 * Login Page
 * Unified login for all user types (OWNER, SELLER, etc.)
 */
export default function LoginPage() {
  const t = useTranslations('Auth.Login');
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card variant="default" className="w-full max-w-md">
        <Card.Content className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              SG-Imports
            </h1>
            <p className="text-sm text-muted">
              Sistema de Gerenciamento de Importações
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            {/* Error Message */}
            {state?.error && (
              <div className="p-3 bg-danger/10 border border-danger rounded-lg">
                <p className="text-sm text-danger">{state.error}</p>
              </div>
            )}

            {/* Email */}
            <TextField variant="primary" isDisabled={isPending} isRequired>
              <Label>{t('email')}</Label>
              <Input
                name="email"
                type="email"
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </TextField>

            {/* Password */}
            <TextField variant="primary" isDisabled={isPending} isRequired>
              <Label>{t('password')}</Label>
              <Input
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </TextField>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isDisabled={isPending}
              size="lg"
            >
              {isPending ? t('submitting') : t('submit')}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-background text-muted">
                {t('noAccount')}
              </span>
            </div>
          </div>

          {/* Registration Links */}
          <div className="flex flex-col gap-2">
            <Link href="/register/owner">
              <Button
                variant="outline"
                className="w-full"
                size="lg"
              >
                {t('registerOwner')}
              </Button>
            </Link>
            
            <Link href="/register/seller">
              <Button
                variant="outline"
                className="w-full"
                size="lg"
              >
                {t('registerSeller')}
              </Button>
            </Link>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
