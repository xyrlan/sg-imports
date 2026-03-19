'use client';

import { useTranslations } from 'next-intl';
import { Button, Input, Label, Modal, TextField } from '@heroui/react';
import { Landmark } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { useActionModal } from '@/hooks/use-action-modal';
import { createCurrencyExchangeBrokerAction } from './actions';

interface AddCurrencyExchangeBrokerModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trigger: React.ReactNode;
}

export function AddCurrencyExchangeBrokerModal({
  isOpen,
  onOpenChange,
  trigger,
}: AddCurrencyExchangeBrokerModalProps) {
  const t = useTranslations('Admin.Settings');
  const { state, formAction, isPending } = useActionModal({
    action: createCurrencyExchangeBrokerAction,
    onSuccess: () => onOpenChange(false),
  });

  return (
    <Modal>
      {trigger}
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header className="mb-6">
                <Modal.Icon className="bg-surface text-foreground">
                <Landmark className="size-5" />
              </Modal.Icon>
              <Modal.Heading>{t('CurrencyExchangeBrokers.addBroker')}</Modal.Heading>
            </Modal.Header>
            <form action={formAction}>
              <Modal.Body className="p-2">
                <div className="space-y-4">
                  <TextField variant="primary" isRequired>
                    <Label>{t('CurrencyExchangeBrokers.name')}</Label>
                    <Input
                      name="name"
                      placeholder={t('CurrencyExchangeBrokers.namePlaceholder')}
                    />
                  </TextField>
                  {state?.error && <FormError message={state.error} />}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="outline" slot="close">
                  {t('CurrencyExchangeBrokers.cancel')}
                </Button>
                <Button type="submit" variant="primary" isPending={isPending}>
                  {isPending
                    ? t('CurrencyExchangeBrokers.saving')
                    : t('CurrencyExchangeBrokers.save')}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
