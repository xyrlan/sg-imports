'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Card, TextField, Input, Label, Button } from '@heroui/react';
import { registerOwner } from './actions';

/**
 * Owner Registration Page
 * For importing clients (OWNER role)
 * Collects: Full Name, Company Name, Email, Password, CNPJ
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
              <Input name="fullName" placeholder="João Silva" />
            </TextField>

            {/* Company Name */}
            <TextField variant="primary" isDisabled={isPending} isRequired>
              <Label>{t('companyName')}</Label>
              <Input name="companyName" placeholder="Empresa XYZ LTDA" />
            </TextField>

            {/* Email */}
            <TextField variant="primary" isDisabled={isPending} isRequired>
              <Label>{t('email')}</Label>
              <Input name="email" type="email" placeholder="joao@empresa.com.br" />
            </TextField>

            {/* CNPJ with mask */}
            <TextField variant="primary" isDisabled={isPending} isRequired>
              <Label>{t('cnpj')}</Label>
              <Input
                name="cnpj"
                placeholder="00.000.000/0000-00"
                maxLength={18}
                onChange={handleCnpjChange}
              />
            </TextField>

            {/* Password */}
            <TextField variant="primary" isDisabled={isPending} isRequired>
              <Label>{t('password')}</Label>
              <Input name="password" type="password" placeholder="••••••••" />
            </TextField>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
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
              <Link href="/register/seller" className="text-accent hover:underline font-medium">
                {t('seller')}
              </Link>
            </p>
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
