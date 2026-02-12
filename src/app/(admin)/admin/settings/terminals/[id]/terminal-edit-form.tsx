'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { TextField, Input, Label, Button, Card } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { useTranslations } from 'next-intl';
import { updateTerminalAction } from '../../actions';
import type { TerminalWithRules } from '@/services/admin';

interface TerminalEditFormProps {
  terminal: TerminalWithRules;
}

export function TerminalEditForm({ terminal }: TerminalEditFormProps) {
  const t = useTranslations('Admin.Settings.Terminals');
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    updateTerminalAction.bind(null, terminal.id),
    null,
  );

  if (state?.ok && !isPending) {
    router.push('/admin/settings');
  }

  return (
    <Card className="p-6">
      <NextLink
        href="/admin/settings"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" />
        Voltar
      </NextLink>
      <h2 className="text-lg font-semibold mb-4">{t('edit')} - {terminal.name}</h2>
      <form action={formAction}>
        <div className="space-y-4">
          <TextField variant="primary" isRequired>
            <Label>{t('name')}</Label>
            <Input name="name" defaultValue={terminal.name} placeholder="Nome do terminal" />
          </TextField>
          <TextField variant="primary">
            <Label>{t('code')}</Label>
            <Input name="code" defaultValue={terminal.code ?? ''} placeholder="Código Siscomex" />
          </TextField>
          {state?.error && <FormError message={state.error} />}
          <div className="flex gap-2">
            <Button type="submit" variant="primary" isPending={isPending}>
              {isPending ? 'Salvando...' : 'Salvar'}
            </Button>
            <NextLink href="/admin/settings">
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </NextLink>
          </div>
        </div>
      </form>

      {terminal.storageRules.length > 0 && (
        <div className="mt-8 pt-6 border-t border-default-200">
          <h3 className="font-semibold mb-2">{t('storageRules')}</h3>
          <p className="text-sm text-muted mb-4">
            Regras de armazenagem e taxas adicionais podem ser configuradas em breve.
          </p>
          <ul className="space-y-2">
            {terminal.storageRules.map((rule) => (
              <li key={rule.id} className="text-sm">
                Tipo: {rule.type} | Tipo envio: {rule.shipmentType}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
