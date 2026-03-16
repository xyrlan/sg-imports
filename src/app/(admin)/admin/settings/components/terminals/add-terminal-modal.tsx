'use client';

import { useTranslations } from 'next-intl';
import { Button, Input, Label, Modal, TextField } from '@heroui/react';
import { Building2 } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { useActionModal } from '@/hooks/use-action-modal';
import { createTerminalAction } from './actions';

interface AddTerminalModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trigger: React.ReactNode;
}

export function AddTerminalModal({
  isOpen,
  onOpenChange,
  trigger,
}: AddTerminalModalProps) {
  const t = useTranslations('Admin.Settings');
  const { state, formAction, isPending } = useActionModal({
    action: createTerminalAction,
    onSuccess: () => onOpenChange(false),
  });

  return (
    <Modal>
      {trigger}
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header className='mb-6'>
              <Modal.Icon className="bg-default text-foreground">
                <Building2 className="size-5" />
              </Modal.Icon>
              <Modal.Heading>{t('Terminals.addTerminal')}</Modal.Heading>
            </Modal.Header>
            <form action={formAction}>
              <Modal.Body className='p-2'>
                <div className="space-y-4">
                  <TextField variant="primary" isRequired>
                    <Label>{t('Terminals.name')}</Label>
                    <Input name="name" placeholder={t('Terminals.namePlaceholder')} />
                  </TextField>
                  <TextField variant="primary">
                    <Label>{t('Terminals.code')}</Label>
                    <Input name="code" placeholder={t('Terminals.codePlaceholder')} />
                  </TextField>
                  {state?.error && <FormError message={state.error} />}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="outline" slot="close">
                  {t('Terminals.cancel')}
                </Button>
                <Button type="submit" variant="primary" isPending={isPending}>
                  {isPending ? t('Terminals.saving') : t('Terminals.save')}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
