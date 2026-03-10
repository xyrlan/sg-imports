'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertDialog, Button } from '@heroui/react';
import { deleteHsCodeAction } from '../actions';
import type { HsCode } from '@/services/admin';

interface DeleteNcmDialogProps {
  hsCode: HsCode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteNcmDialog({
  hsCode,
  open,
  onOpenChange,
  onSuccess,
}: DeleteNcmDialogProps) {
  const t = useTranslations('Admin.Products');
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirmDelete() {
    if (!hsCode) return;
    setIsDeleting(true);
    const result = await deleteHsCodeAction(hsCode.id);
    setIsDeleting(false);
    if (result.success) {
      onOpenChange(false);
      onSuccess?.();
    } else if (result.error) {
      alert(result.error);
    }
  }

  return (
    <AlertDialog>
      <AlertDialog.Backdrop isOpen={open} onOpenChange={onOpenChange}>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.CloseTrigger />
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>{t('deleteNcmTitle')}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>{t('deleteNcmConfirm')}</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="tertiary" onPress={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button
                variant="danger"
                isPending={isDeleting}
                onPress={handleConfirmDelete}
              >
                {t('delete')}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
