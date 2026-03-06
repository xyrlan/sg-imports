'use client';

import { useTranslations } from 'next-intl';
import { Modal } from '@heroui/react';
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
  const t = useTranslations('Products.CreateProduct');

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
                />
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
