'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Modal } from '@heroui/react';
import { Box, PlusIcon } from 'lucide-react';
import { ProductForm } from './product-form';

interface CreateProductDrawerProps {
  organizationId: string;
  onMutate?: () => void;
}

export function CreateProductDrawer({ organizationId, onMutate }: CreateProductDrawerProps) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const formId = useId();
  const t = useTranslations('Products.CreateProduct');
  const tForm = useTranslations('Products.Form');

  return (
    <>
      <Modal>
        <Button
          variant="primary"
          size="sm"
          onPress={() => setOpen(true)}
          className="inline-flex items-center gap-2"
        >
          <PlusIcon size={18} />
          {t('addNew')}
        </Button>
        <Modal.Backdrop isOpen={open} onOpenChange={setOpen} isDismissable={false}>
          <Modal.Container>
            <Modal.Dialog className="max-w-5xl max-h-[90vh]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Icon className="bg-surface text-foreground">
                  <Box size={22} />
                </Modal.Icon>
                <Modal.Heading>{t('heading')}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <ProductForm
                  organizationId={organizationId}
                  onMutate={onMutate}
                  onClose={() => setOpen(false)}
                  hideFooter
                  formId={formId}
                  onPendingChange={setIsPending}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="ghost" onPress={() => setOpen(false)}>
                  {tForm('cancel')}
                </Button>
                <Button form={formId} type="submit" variant="primary" isPending={isPending}>
                  {tForm('createProduct')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
