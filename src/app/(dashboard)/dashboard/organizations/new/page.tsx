'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import NextLink from 'next/link';
import { Card, TextField, Input, Label, Button } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';

import { useOrganizationState } from '@/contexts/organization-context';

import { createOrganization } from './actions';

export default function CreateOrganizationPage() {
  const t = useTranslations('Organization');
  const router = useRouter();
  const { membership } = useOrganizationState();
  const [state, formAction, isPending] = useActionState(createOrganization, null);

  useEffect(() => {
    if (membership?.role !== 'OWNER') {
      router.replace('/dashboard');
    }
  }, [membership?.role, router]);

  if (membership?.role !== 'OWNER') {
    return null;
  }

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 14) {
      value = value.replace(/^(\d{2})(\d)/, '$1.$2');
      value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
      value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
      value = value.replace(/(\d{4})(\d)/, '$1-$2');
    }
    e.target.value = value;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <Card variant="default" className="w-full max-w-md">
        <Card.Content className="p-8">
          <div className="mb-6">
            <NextLink
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('CreateNew.backToDashboard')}
            </NextLink>
            <h1 className="text-2xl font-bold text-foreground">
              {t('CreateNew.title')}
            </h1>
            <p className="text-sm text-muted mt-1">
              {t('CreateNew.description')}
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="p-3 bg-danger/10 border border-danger rounded-lg">
                <p className="text-sm text-danger">{state.error}</p>
              </div>
            )}

            <TextField variant="primary" isDisabled={isPending} isRequired>
              <Label>{t('CreateNew.companyName')}</Label>
              <Input
                name="companyName"
                placeholder={t('CreateNew.companyNamePlaceholder')}
              />
            </TextField>

            <TextField variant="primary" isDisabled={isPending} isRequired>
              <Label>{t('CreateNew.cnpj')}</Label>
              <Input
                name="cnpj"
                placeholder={t('CreateNew.cnpjPlaceholder')}
                maxLength={18}
                onChange={handleCnpjChange}
              />
            </TextField>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isDisabled={isPending}
              size="lg"
            >
              {isPending ? t('CreateNew.submitting') : t('CreateNew.submit')}
            </Button>
          </form>
        </Card.Content>
      </Card>
    </div>
  );
}
