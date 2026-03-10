'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, Modal, TextField } from '@heroui/react';
import { Truck } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { useActionState } from 'react';
import { createSupplierAction } from '../actions';

interface AddSupplierModalProps {
  organizationId: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trigger: React.ReactNode;
}

export function AddSupplierModal({
  organizationId,
  isOpen,
  onOpenChange,
  trigger,
}: AddSupplierModalProps) {
  const t = useTranslations('Products.Suppliers');
  const [state, formAction, isPending] = useActionState(createSupplierAction, null);

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
              <Modal.Icon className="bg-default text-foreground">
                <Truck className="size-5" />
              </Modal.Icon>
              <Modal.Heading>{t('addSupplier')}</Modal.Heading>
            </Modal.Header>
            <form action={formAction}>
              <input type="hidden" name="organizationId" value={organizationId} />
              <Modal.Body className="p-2">
                <div className="space-y-4">
                  <TextField variant="primary" isRequired>
                    <Label>{t('name')}</Label>
                    <Input name="name" placeholder={t('namePlaceholder')} />
                  </TextField>
                  <TextField variant="primary">
                    <Label>{t('taxId')}</Label>
                    <Input name="taxId" placeholder={t('taxIdPlaceholder')} />
                  </TextField>
                  <TextField variant="primary">
                    <Label>{t('countryCode')}</Label>
                    <Input name="countryCode" placeholder={t('countryCodePlaceholder')} />
                  </TextField>
                  <TextField variant="primary">
                    <Label>{t('email')}</Label>
                    <Input name="email" placeholder={t('emailPlaceholder')} />
                  </TextField>
                  <TextField variant="primary">
                    <Label>{t('address')}</Label>
                    <Input name="address" placeholder={t('addressPlaceholder')} />
                  </TextField>
                  {state?.error && <FormError message={state.error} />}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="outline" slot="close">
                  {t('cancel')}
                </Button>
                <Button type="submit" variant="primary" isPending={isPending}>
                  {isPending ? t('saving') : t('save')}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
