'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { TextField, Input, Label, Button, Card } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { useTranslations } from 'next-intl';
import { createTerminalAction } from './actions';

interface TerminalFormProps {
  initialData?: { name: string; code?: string | null };
  terminalId?: string;
  updateAction?: (id: string, prev: unknown, formData: FormData) => Promise<{ ok?: boolean; error?: string }>;
}

export function TerminalForm({
  initialData,
  terminalId,
  updateAction,
}: TerminalFormProps) {
  const t = useTranslations('Admin.Settings.Terminals');
  const router = useRouter();
  const isEdit = !!terminalId && !!updateAction;

  const boundUpdate = updateAction?.bind(null, terminalId!);
  const [state, formAction, isPending] = useActionState(
    isEdit ? boundUpdate! : createTerminalAction,
    null,
  );

  if (state?.ok && !isPending) {
    router.push('/admin/settings?tab=terminals');
  }

  return (
    <Card className="p-6">
      <NextLink
        href="/admin/settings"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" />
        {t('back')}
      </NextLink>
      <h2 className="text-lg font-semibold mb-4">
        {isEdit ? t('edit') : t('addTerminal')}
      </h2>
      <form action={formAction}>
        <div className="space-y-4">
          <TextField variant="primary" isRequired>
            <Label>{t('name')}</Label>
            <Input
              name="name"
              defaultValue={initialData?.name ?? ''}
              placeholder={t('namePlaceholder')}
            />
          </TextField>
          <TextField variant="primary">
            <Label>{t('code')}</Label>
            <Input
              name="code"
              defaultValue={initialData?.code ?? ''}
              placeholder={t('codePlaceholder')}
            />
          </TextField>
          {state?.error && <FormError message={state.error} />}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" isPending={isPending}>
              {isPending ? t('saving') : t('save')}
            </Button>
            <NextLink href="/admin/settings">
              <Button type="button" variant="outline">
                {t('cancel')}
              </Button>
            </NextLink>
          </div>
        </div>
      </form>
    </Card>
  );
}
