'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, Modal, TextField } from '@heroui/react';
import { Truck } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { useActionModal } from '@/hooks/use-action-modal';
import { updateSupplierAction } from './actions';
import type { Supplier } from '@/services/admin';

interface EditSupplierModalProps {
  supplier: Supplier;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trigger: React.ReactNode;
}

export function EditSupplierModal({
  supplier,
  isOpen,
  onOpenChange,
  trigger,
}: EditSupplierModalProps) {
  const t = useTranslations('Admin.Settings');
  const [name, setName] = useState(supplier.name);
  const [taxId, setTaxId] = useState(supplier.taxId ?? '');
  const [countryCode, setCountryCode] = useState(supplier.countryCode ?? '');
  const [email, setEmail] = useState(supplier.email ?? '');
  const [address, setAddress] = useState(supplier.address ?? '');
  const { state, formAction, isPending } = useActionModal({
    action: updateSupplierAction.bind(null, supplier.id),
    onSuccess: () => onOpenChange(false),
  });

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setName(supplier.name);
        setTaxId(supplier.taxId ?? '');
        setCountryCode(supplier.countryCode ?? '');
        setEmail(supplier.email ?? '');
        setAddress(supplier.address ?? '');
      });
    }
  }, [isOpen, supplier]);

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
              <Modal.Heading>
                {t('Suppliers.edit')} - {supplier.name}
              </Modal.Heading>
            </Modal.Header>
            <form action={formAction}>
              <Modal.Body className="p-2">
                <div className="space-y-4">
                  <TextField variant="primary" isRequired>
                    <Label>{t('Suppliers.name')}</Label>
                    <Input
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('Suppliers.namePlaceholder')}
                    />
                  </TextField>
                  <TextField variant="primary">
                    <Label>{t('Suppliers.taxId')}</Label>
                    <Input
                      name="taxId"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder={t('Suppliers.taxIdPlaceholder')}
                    />
                  </TextField>
                  <TextField variant="primary">
                    <Label>{t('Suppliers.countryCode')}</Label>
                    <Input
                      name="countryCode"
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      placeholder={t('Suppliers.countryCodePlaceholder')}
                    />
                  </TextField>
                  <TextField variant="primary">
                    <Label>{t('Suppliers.email')}</Label>
                    <Input
                      name="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('Suppliers.emailPlaceholder')}
                    />
                  </TextField>
                  <TextField variant="primary">
                    <Label>{t('Suppliers.address')}</Label>
                    <Input
                      name="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={t('Suppliers.addressPlaceholder')}
                    />
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
