'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Modal } from '@heroui/react';
import { Box } from 'lucide-react';
import { ProductForm } from './product-form';
import type { ProductWithVariants } from '@/services/product.service';

interface EditProductModalProps {
  product: ProductWithVariants | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  onMutate?: () => void;
}

export function EditProductModal({
  product,
  open,
  onOpenChange,
  organizationId,
  onMutate,
}: EditProductModalProps) {
  const [isPending, setIsPending] = useState(false);
  const formId = useId();
  const t = useTranslations('Products.CreateProduct');
  const tForm = useTranslations('Products.Form');

  return (
    <Modal>
      <Modal.Backdrop isOpen={open} onOpenChange={onOpenChange} isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="max-w-5xl max-h-[90vh]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-default text-foreground">
                <Box size={22} />
              </Modal.Icon>
              <Modal.Heading>{t('editHeading')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {product && (
                <ProductForm
                  key={product.id}
                  organizationId={organizationId}
                  initialProduct={product}
                  onMutate={onMutate}
                  onClose={() => onOpenChange(false)}
                  hideFooter
                  formId={formId}
                  onPendingChange={setIsPending}
                />
              )}
            </Modal.Body>
            {product && (
              <Modal.Footer>
                <Button type="button" variant="ghost" onPress={() => onOpenChange(false)}>
                  {tForm('cancel')}
                </Button>
                <Button form={formId} type="submit" variant="primary" isPending={isPending}>
                  {tForm('updateProduct')}
                </Button>
              </Modal.Footer>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
