'use client';

import { useTranslations } from 'next-intl';
import { SupplierFormModal } from '@/components/shared/supplier-form-modal';
import { createSupplierAction } from './supplier-actions';

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

  return (
    <SupplierFormModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      trigger={trigger}
      action={createSupplierAction}
      organizationId={organizationId}
      labels={{
        heading: t('addSupplier'),
        name: t('name'),
        namePlaceholder: t('namePlaceholder'),
        taxId: t('taxId'),
        taxIdPlaceholder: t('taxIdPlaceholder'),
        countryCode: t('countryCode'),
        countryCodePlaceholder: t('countryCodePlaceholder'),
        email: t('email'),
        emailPlaceholder: t('emailPlaceholder'),
        address: t('address'),
        addressPlaceholder: t('addressPlaceholder'),
        cancel: t('cancel'),
        save: t('save'),
        saving: t('saving'),
      }}
    />
  );
}
