'use client';

import { useTranslations } from 'next-intl';
import { AlertDialog, Button } from '@heroui/react';
import type { PricingRuleWithRelations } from './types';

interface DeletePricingRuleDialogProps {
  rule: PricingRuleWithRelations | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeletePricingRuleDialog({
  rule,
  isDeleting,
  onConfirm,
  onClose,
}: DeletePricingRuleDialogProps) {
  const t = useTranslations('Admin.Settings.FreightTaxas.delete');
  return (
    <AlertDialog>
      <AlertDialog.Backdrop isOpen={!!rule} onOpenChange={(open) => !open && onClose()}>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>{t('title')}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>{t('confirm')}</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary" onPress={onClose}>
                {t('cancel')}
              </Button>
              <Button variant="danger" isPending={isDeleting} onPress={onConfirm}>
                {t('confirmButton')}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
