'use client';

import { useTranslations } from 'next-intl';
import { Button, Input, Label, Modal, TextField } from '@heroui/react';
import { Truck } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { useActionModal } from '@/hooks/use-action-modal';
import { createSupplierAction } from './actions';

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
  const t = useTranslations('Admin.Settings');
  const { state, formAction, isPending } = useActionModal({
    action: createSupplierAction,
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
              <Modal.Icon className="bg-default text-foreground">
                <Truck className="size-5" />
              </Modal.Icon>
              <Modal.Heading>{t('Suppliers.addSupplier')}</Modal.Heading>
            </Modal.Header>
            <form action={formAction}>
              <input type="hidden" name="organizationId" value={organizationId} />
              <Modal.Body className="p-2">
                <div className="space-y-4">
                  <TextField variant="primary" isRequired>
                    <Label>{t('Suppliers.name')}</Label>
                    <Input name="name" placeholder={t('Suppliers.namePlaceholder')} />
                  </TextField>
                  <TextField variant="primary">
                    <Label>{t('Suppliers.taxId')}</Label>
                    <Input name="taxId" placeholder={t('Suppliers.taxIdPlaceholder')} />
                  </TextField>
                  <TextField variant="primary">
                    <Label>{t('Suppliers.countryCode')}</Label>
                    <Input name="countryCode" placeholder={t('Suppliers.countryCodePlaceholder')} />
                  </TextField>
                  <TextField variant="primary">
                    <Label>{t('Suppliers.email')}</Label>
                    <Input name="email" placeholder={t('Suppliers.emailPlaceholder')} />
                  </TextField>
                  <TextField variant="primary">
                    <Label>{t('Suppliers.address')}</Label>
                    <Input name="address" placeholder={t('Suppliers.addressPlaceholder')} />
                  </TextField>
                  {state?.error && <FormError message={state.error} />}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="outline" slot="close">
                  {t('Suppliers.cancel')}
                </Button>
                <Button type="submit" variant="primary" isPending={isPending}>
                  {isPending ? t('Suppliers.saving') : t('Suppliers.save')}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
