'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TextField, Input, Label, Button } from '@heroui/react';
import { FormError } from '@/components/ui/form-error';
import { useTranslations } from 'next-intl';

import { updateProfileAction } from './actions';

interface ProfileFormProps {
  fullName: string | null;
  phone: string | null;
}

export function ProfileForm({ fullName, phone }: ProfileFormProps) {
  const t = useTranslations('ProfilePage');
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(updateProfileAction, null);

  useEffect(() => {
    if (state?.success) {
      router.refresh();
    }
  }, [state?.success, router]);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state?.error} variant="danger" />

      <TextField
        variant="primary"
        isDisabled={isPending}
        defaultValue={fullName ?? ''}
      >
        <Label>{t('fullName')}</Label>
        <Input name="fullName" placeholder={t('fullNamePlaceholder')} />
      </TextField>

      <TextField
        variant="primary"
        isDisabled={isPending}
        defaultValue={phone ?? ''}
      >
        <Label>{t('phone')}</Label>
        <Input name="phone" type="tel" placeholder={t('phonePlaceholder')} />
      </TextField>

      <Button type="submit" variant="primary" isDisabled={isPending}>
        {isPending ? t('saving') : t('save')}
      </Button>
    </form>
  );
}
