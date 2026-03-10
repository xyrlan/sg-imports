'use client';

import { startTransition, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button, Modal, Input, TextField, Label, FieldError, Select, ListBox } from '@heroui/react';
import { ClipboardPen } from 'lucide-react';
import { createSimulationAction } from '../actions';
import { getShipmentTypeLabel } from '@/lib/storage-utils';

const SHIPPING_MODALITIES = ['AIR', 'SEA_LCL', 'SEA_FCL', 'SEA_FCL_PARTIAL', 'EXPRESS'] as const;

interface CreateSimulationModalProps {
  organizationId: string;
  onMutate?: () => void;
}

export function CreateSimulationModal({ organizationId, onMutate }: CreateSimulationModalProps) {
  const [open, setOpen] = useState(false);
  const [shippingModality, setShippingModality] = useState<string | null>(null);
  const t = useTranslations('Simulations.CreateSimulation');

  const [state, formAction, isPending] = useActionState(createSimulationAction, null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    if (shippingModality && shippingModality !== '__none__') {
      formData.set('shippingModality', shippingModality);
    }
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
      <Modal>
        <Button
          variant="primary"
          size="sm"
          onPress={() => setOpen(true)}
          className="inline-flex items-center gap-2"
        >
          <ClipboardPen size={18} />
          {t('addNew')}
        </Button>
        <Modal.Backdrop isOpen={open} onOpenChange={setOpen} isDismissable={!isPending}>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.CloseTrigger />
                <Modal.Header className='mb-6'>
                  <Modal.Icon className="bg-default text-foreground">
                    <ClipboardPen size={22} />
                  </Modal.Icon>
                  <Modal.Heading>{t('heading')}</Modal.Heading>
                </Modal.Header>
              <form onSubmit={handleSubmit}>
                <Modal.Body className='p-2'>
                  <div className='space-y-4'>
                  <input type="hidden" name="organizationId" value={organizationId} />
                  <TextField
                    variant="primary"
                    name="name"
                    isRequired
                    isInvalid={!!state?.fieldErrors?.name}
                    isDisabled={isPending}
                    validate={() => state?.fieldErrors?.name ?? null}
                  >
                    <Label>{t('nameLabel')}</Label>
                    <Input name="name" placeholder={t('namePlaceholder')} autoFocus />
                    <FieldError />
                  </TextField>
                  <div className="flex flex-col gap-2">
                    <Label>{t('shippingModalityLabel')}</Label>
                    <Select
                      variant="primary"
                      placeholder={t('shippingModalityPlaceholder')}
                      value={shippingModality ?? '__none__'}
                      onChange={(k) => setShippingModality(k === '__none__' ? null : (k as string))}
                      isDisabled={isPending}
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item key="__none__" id="__none__" textValue={t('none')}>
                            {t('none')}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          {SHIPPING_MODALITIES.map((m) => (
                            <ListBox.Item key={m} id={m} textValue={getShipmentTypeLabel(m)}>
                              {getShipmentTypeLabel(m)}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                  {state?.error && (
                    <p className="text-sm text-danger mt-2">{state.error}</p>
                  )}
                  </div>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="tertiary" onPress={() => setOpen(false)} isDisabled={isPending}>
                    {t('cancel')}
                  </Button>
                  <Button variant="primary" type="submit" isPending={isPending}>
                    {t('create')}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
  );
}
