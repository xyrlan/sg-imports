'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, Modal, TextField } from '@heroui/react';
import { Anchor } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { useActionState } from 'react';
import { createPortAction } from '../actions';
import { getCountryFromCode } from '@/lib/country-codes';

interface AddPortModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trigger: React.ReactNode;
}

export function AddPortModal({
  isOpen,
  onOpenChange,
  trigger,
}: AddPortModalProps) {
  const t = useTranslations('Admin.Settings');
  const [code, setCode] = useState('');
  const [country, setCountry] = useState('');
  const [state, formAction, isPending] = useActionState(createPortAction, null);

  const handleCodeChange = (value: string) => {
    setCode(value);
    const autoCountry = getCountryFromCode(value);
    if (autoCountry) setCountry(autoCountry);
  };

  useEffect(() => {
    if (state?.ok && !isPending) {
      queueMicrotask(() => onOpenChange(false));
    }
  }, [state?.ok, isPending, onOpenChange]);

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setCountry('');
    }
  }, [isOpen]);

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
                  <Anchor className="size-5" />
                  {t('Ports.addPort')}
                </div>
              </Modal.Heading>
            </Modal.Header>
            <form action={formAction}>
              <Modal.Body className="p-2">
                <div className="space-y-4">
                  <TextField variant="primary" isRequired>
                    <Label>{t('Ports.name')}</Label>
                    <Input name="name" placeholder={t('Ports.namePlaceholder')} />
                  </TextField>
                  <TextField variant="primary" isRequired>
                    <Label>{t('Ports.code')}</Label>
                    <Input
                      name="code"
                      value={code}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      placeholder={t('Ports.codePlaceholder')}
                    />
                  </TextField>
                  <TextField variant="primary" isRequired>
                    <Label>{t('Ports.country')}</Label>
                    <Input
                      name="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder={t('Ports.countryPlaceholder')}
                    />
                  </TextField>
                  {state?.error && <FormError message={state.error} />}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="outline" slot="close">
                  {t('Ports.cancel')}
                </Button>
                <Button type="submit" variant="primary" isPending={isPending}>
                  {isPending ? t('Ports.saving') : t('Ports.save')}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
