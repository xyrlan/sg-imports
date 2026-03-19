'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, ListBox, Modal, Select, TextField } from '@heroui/react';
import { Anchor } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { useActionModal } from '@/hooks/use-action-modal';
import { updatePortAction } from './actions';
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
  const [type, setType] = useState<'PORT' | 'AIRPORT'>((port.type as 'PORT' | 'AIRPORT') ?? 'PORT');
  const { state, formAction, isPending } = useActionModal({
    action: updatePortAction.bind(null, port.id),
    onSuccess: () => onOpenChange(false),
  });

  const handleCodeChange = (value: string) => {
    setCode(value);
    if (type === 'PORT') {
      const autoCountry = getCountryFromCode(value);
      if (autoCountry) setCountry(autoCountry);
    }
  };

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setName(port.name);
        setCode(port.code);
        setCountry(port.country);
        setType((port.type as 'PORT' | 'AIRPORT') ?? 'PORT');
      });
    }
  }, [isOpen, port.name, port.code, port.country, port.type]);

  return (
    <Modal>
      {trigger}
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header className="mb-6">
                  <Modal.Icon className="bg-surface text-foreground">
                    <Anchor className="size-5" />
                  </Modal.Icon>
                  <Modal.Heading>{t('Ports.edit')} - {port.name}</Modal.Heading>
            </Modal.Header>
            <form action={formAction}>
              <Modal.Body className="p-2">
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <Label>{t('Ports.type')}</Label>
                    <input type="hidden" name="type" value={type} />
                    <Select
                      selectedKey={type}
                      onSelectionChange={(k) => setType((k as 'PORT' | 'AIRPORT') ?? 'PORT')}
                      variant="primary"
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item key="PORT" id="PORT" textValue={t('Ports.typePort')}>
                            {t('Ports.typePort')}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item key="AIRPORT" id="AIRPORT" textValue={t('Ports.typeAirport')}>
                            {t('Ports.typeAirport')}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                  <TextField variant="primary" isRequired>
                    <Label>{t('Ports.name')}</Label>
                    <Input
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={type === 'AIRPORT' ? t('Ports.namePlaceholderAirport') : t('Ports.namePlaceholder')}
                    />
                  </TextField>
                  <TextField variant="primary" isRequired>
                    <Label>{type === 'AIRPORT' ? t('Ports.codeIata') : t('Ports.code')}</Label>
                    <Input
                      name="code"
                      value={code}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      placeholder={type === 'AIRPORT' ? t('Ports.codePlaceholderIata') : t('Ports.codePlaceholder')}
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
