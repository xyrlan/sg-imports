'use client';

import { useId, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button, Modal, toast } from '@heroui/react';
import { Box } from 'lucide-react';
import { SimulatedProductQuickForm } from '../shared/simulated-product-quick-form';
import { updateSimulationItemAction } from '../../../actions';
import type { ProductSnapshot } from '@/db/types';
import type { HsCodeOption } from '@/services/simulation.service';
import type { SimulationItem } from '@/services/simulation.service';

interface EditItemModalProps {
  item: SimulationItem | null;
  organizationId: string;
  hsCodes: HsCodeOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMutate?: () => void;
}

export function EditItemModal({
  item,
  organizationId,
  hsCodes,
  open,
  onOpenChange,
  onMutate,
}: EditItemModalProps) {
  const [isPending, startTransition] = useTransition();
  const formId = useId();
  const t = useTranslations('Simulations.Detail');
  const tForm = useTranslations('Products.Form');
  const router = useRouter();

  const snapshot = item?.simulatedProductSnapshot;
  const isSimulatedItem = !!snapshot;

  async function handleUpdate(
    updatedSnapshot: ProductSnapshot,
    quantity: number,
    priceUsd: string
  ) {
    if (!item) return;
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          const result = await updateSimulationItemAction(item.id, organizationId, {
            simulatedProductSnapshot: updatedSnapshot,
            quantity,
            priceUsd,
          });
          if (result.success) {
            onOpenChange(false);
            onMutate?.();
            router.refresh();
            toast.success(t('saveItem'));
          } else if (result.error) {
            toast.danger(result.error);
          }
        } finally {
          resolve();
        }
      });
    });
  }

  if (!item || !isSimulatedItem) return null;

  return (
    <Modal>
      <Modal.Backdrop isOpen={open} onOpenChange={onOpenChange} isDismissable={!isPending}>
        <Modal.Container>
          <Modal.Dialog className="max-w-5xl">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-default text-foreground">
                <Box size={22} />
              </Modal.Icon>
              <Modal.Heading>{t('editItem')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="overflow-visible">
              <SimulatedProductQuickForm
                hsCodes={hsCodes}
                onSubmit={handleUpdate}
                isSubmitting={isPending}
                formId={formId}
                initialSnapshot={snapshot}
                initialQuantity={item.quantity}
                initialPriceUsd={String(item.priceUsd ?? '')}
                submitLabel={t('saveItem')}
                hideSubmitButton
              />
            </Modal.Body>
            <Modal.Footer>
              <Button type="button" variant="ghost" onPress={() => onOpenChange(false)}>
                {tForm('cancel')}
              </Button>
              <Button form={formId} type="submit" variant="primary" isPending={isPending}>
                {t('saveItem')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
