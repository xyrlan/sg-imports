'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, Modal, TextField } from '@heroui/react';
import { Landmark } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { useActionState } from 'react';
import { updateCurrencyExchangeBrokerAction } from '../actions';
import type { CurrencyExchangeBroker } from '@/services/admin';

interface EditCurrencyExchangeBrokerModalProps {
  broker: CurrencyExchangeBroker;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trigger: React.ReactNode;
}

export function EditCurrencyExchangeBrokerModal({
  broker,
  isOpen,
  onOpenChange,
  trigger,
}: EditCurrencyExchangeBrokerModalProps) {
  const t = useTranslations('Admin.Settings');
  const [name, setName] = useState(broker.name);
  const [state, formAction, isPending] = useActionState(
    updateCurrencyExchangeBrokerAction.bind(null, broker.id),
    null,
  );

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => setName(broker.name));
    }
  }, [isOpen, broker.name]);

  useEffect(() => {
    if (state?.ok && !isPending) {
      queueMicrotask(() => onOpenChange(false));
    }
  }, [state?.ok, isPending, onOpenChange]);

  return (
    <Modal>
      {trigger}
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header className="mb-6">
              <Modal.Heading>
                <div className="flex items-center gap-2">
                  <Landmark className="size-5" />
                  {t('CurrencyExchangeBrokers.edit')} - {broker.name}
                </div>
              </Modal.Heading>
            </Modal.Header>
            <form action={formAction}>
              <Modal.Body className="p-2">
                <div className="space-y-4">
                  <TextField variant="primary" isRequired>
                    <Label>{t('CurrencyExchangeBrokers.name')}</Label>
                    <Input
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
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
