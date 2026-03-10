'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertDialog, Button } from '@heroui/react';
import { deleteProductAsAdminAction } from '../actions';
import type { ProductWithOrgAndNcm } from '@/services/admin';

interface DeleteProductDialogProps {
  product: ProductWithOrgAndNcm | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteProductDialog({
  product,
  open,
  onOpenChange,
  onSuccess,
}: DeleteProductDialogProps) {
  const t = useTranslations('Admin.Products');
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleConfirmDelete() {
    if (!product) return;
    setIsDeleting(true);
    const result = await deleteProductAsAdminAction(product.id);
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
              <AlertDialog.Heading>{t('deleteProductTitle')}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p>{t('deleteProductConfirm')}</p>
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
