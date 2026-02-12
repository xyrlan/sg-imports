'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, Modal, TextField } from '@heroui/react';
import { Anchor } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { useActionState } from 'react';
import { updatePortAction } from '../actions';
import { getCountryFromCode } from '@/lib/country-codes';
import type { Port } from '@/services/admin';

interface EditPortModalProps {
  port: Port;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trigger: React.ReactNode;
}

export function EditPortModal({
  port,
  isOpen,
  onOpenChange,
  trigger,
}: EditPortModalProps) {
  const t = useTranslations('Admin.Settings');
  const [name, setName] = useState(port.name);
  const [code, setCode] = useState(port.code);
  const [country, setCountry] = useState(port.country);
  const [state, formAction, isPending] = useActionState(
    updatePortAction.bind(null, port.id),
    null,
  );

  const handleCodeChange = (value: string) => {
    setCode(value);
    const autoCountry = getCountryFromCode(value);
    if (autoCountry) setCountry(autoCountry);
  };

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setName(port.name);
        setCode(port.code);
        setCountry(port.country);
      });
    }
  }, [isOpen, port.name, port.code, port.country]);

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
                  <Anchor className="size-5" />
                  {t('Ports.edit')} - {port.name}
                </div>
              </Modal.Heading>
            </Modal.Header>
            <form action={formAction}>
              <Modal.Body className="p-2">
                <div className="space-y-4">
                  <TextField variant="primary" isRequired>
                    <Label>{t('Ports.name')}</Label>
                    <Input
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('Ports.namePlaceholder')}
                    />
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
