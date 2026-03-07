'use client';

import { startTransition, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { Button, Modal, Input, TextField, Label, FieldError } from '@heroui/react';
import { ClipboardPen } from 'lucide-react';
import { createSimulationAction } from '../actions';

interface CreateSimulationModalProps {
  organizationId: string;
  onMutate?: () => void;
}

export function CreateSimulationModal({ organizationId, onMutate }: CreateSimulationModalProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('Simulations.CreateSimulation');

  const [state, formAction, isPending] = useActionState(createSimulationAction, null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); 
    const form = e.currentTarget;
    const formData = new FormData(form);
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
