'use client';

import { useTranslations } from 'next-intl';
import { SupplierFormModal } from '@/components/shared/supplier-form-modal';
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
  const t = useTranslations('Admin.Settings.Suppliers');

  return (
    <SupplierFormModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      trigger={trigger}
      action={updateSupplierAction.bind(null, supplier.id)}
      supplier={supplier}
      labels={{
        heading: `${t('edit')} - ${supplier.name}`,
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
