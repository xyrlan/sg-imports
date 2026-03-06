'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertDialog, Button } from '@heroui/react';
import { deleteProductAction } from '../actions';
import type { ProductWithVariants } from '@/services/product.service';

interface DeleteProductAlertDialogProps {
  product: ProductWithVariants | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onSuccess?: () => void;
}

export function DeleteProductAlertDialog({
  product,
  open,
  onOpenChange,
  organizationId,
  onSuccess,
}: DeleteProductAlertDialogProps) {
  const t = useTranslations('Products.Actions');
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirmDelete() {
    if (!product) return;
    setIsDeleting(true);
    const result = await deleteProductAction(product.id, organizationId);
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
              <AlertDialog.Heading>{t('deleteTitle')}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>{t('deleteConfirm')}</p>
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
