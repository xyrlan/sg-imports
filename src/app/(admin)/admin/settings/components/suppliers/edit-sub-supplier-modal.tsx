'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Label, Modal, TextField } from '@heroui/react';
import { Users } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { useActionState } from 'react';
import { updateSubSupplierAction } from '../../actions';
import type { SubSupplier } from '@/services/admin';

interface EditSubSupplierModalProps {
  subSupplier: SubSupplier;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  trigger: React.ReactNode;
}

export function EditSubSupplierModal({
  subSupplier,
  isOpen,
  onOpenChange,
  trigger,
}: EditSubSupplierModalProps) {
  const t = useTranslations('Admin.Settings');
  const [name, setName] = useState(subSupplier.name);
  const [taxId, setTaxId] = useState(subSupplier.taxId ?? '');
  const [countryCode, setCountryCode] = useState(subSupplier.countryCode ?? '');
  const [email, setEmail] = useState(subSupplier.email ?? '');
  const [address, setAddress] = useState(subSupplier.address ?? '');
  const [state, formAction, isPending] = useActionState(
    updateSubSupplierAction.bind(null, subSupplier.id),
    null,
  );

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setName(subSupplier.name);
        setTaxId(subSupplier.taxId ?? '');
        setCountryCode(subSupplier.countryCode ?? '');
        setEmail(subSupplier.email ?? '');
        setAddress(subSupplier.address ?? '');
      });
    }
  }, [isOpen, subSupplier]);

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
                <Users className="size-5" />
              </Modal.Icon>
              <Modal.Heading>
                {t('SubSuppliers.edit')} - {subSupplier.name}
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
