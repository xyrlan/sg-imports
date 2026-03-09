'use client';

import { useTranslations } from 'next-intl';
import { AlertDialog, Button } from '@heroui/react';
import { CONTAINER_TYPE_LABELS } from './constants';
import type { InternationalFreightWithPorts } from '@/services/admin';

interface DeleteFreightDialogProps {
  freight: InternationalFreightWithPorts | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteFreightDialog({
  freight,
  isDeleting,
  onConfirm,
  onClose,
}: DeleteFreightDialogProps) {
  const t = useTranslations('Admin.Settings.InternationalFreights');

  return (
    <AlertDialog>
      <AlertDialog.Backdrop isOpen={!!freight} onOpenChange={(open) => !open && onClose()}>
        <AlertDialog.Container>
          <AlertDialog.Dialog className="sm:max-w-[400px]">
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>{t('deleteConfirmTitle')}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>
                {freight &&
                  t('deleteConfirm', {
                    carrier: freight.carrier?.name ?? t('noCarrier'),
                    container: CONTAINER_TYPE_LABELS[freight.containerType],
                  })}
              </p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button slot="close" variant="tertiary" onPress={onClose}>
                {t('cancel')}
              </Button>
              <Button variant="danger" isPending={isDeleting} onPress={onConfirm}>
                {t('delete')}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
