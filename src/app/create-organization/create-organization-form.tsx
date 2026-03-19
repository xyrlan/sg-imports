'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, TextField, Input, Label, Button } from '@heroui/react';

import { createFirstOrganizationAction } from './actions';

export function CreateOrganizationForm() {
  const t = useTranslations('Organization');
  const [state, formAction, isPending] = useActionState(createFirstOrganizationAction, null);

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
    <Card variant="secondary" className="w-full max-w-md shadow-lg border border-border/50">
      <Card.Content className="p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            {t('CreateNew.title')}
          </h1>
          <p className="text-sm text-muted mt-2">
            {t('CreateNew.description')}
          </p>
        </div>

        <form action={formAction} className="space-y-5">
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
  );
}
