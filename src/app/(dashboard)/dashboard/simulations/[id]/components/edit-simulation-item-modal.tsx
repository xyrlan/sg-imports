'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button, Modal } from '@heroui/react';
import { Box } from 'lucide-react';
import { SimulatedProductQuickForm } from './simulated-product-quick-form';
import { updateSimulationItemAction } from '../../actions';
import type { ProductSnapshot } from '@/db/types';
import type { HsCodeOption } from '@/services/simulation.service';
import type { SimulationItem } from '@/services/simulation.service';

interface EditSimulationItemModalProps {
  item: SimulationItem | null;
  organizationId: string;
  hsCodes: HsCodeOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMutate?: () => void;
}

export function EditSimulationItemModal({
  item,
  organizationId,
  hsCodes,
  open,
  onOpenChange,
  onMutate,
}: EditSimulationItemModalProps) {
  const [isPending, setIsPending] = useState(false);
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
    setIsPending(true);
    const result = await updateSimulationItemAction(item.id, organizationId, {
      simulatedProductSnapshot: updatedSnapshot,
      quantity,
      priceUsd,
    });
    setIsPending(false);
    if (result.success) {
      onOpenChange(false);
      onMutate?.();
      router.refresh();
    } else if (result.error) {
      alert(result.error);
    }
  }

  if (!item || !isSimulatedItem) return null;

  return (
    <Modal>
      <Modal.Backdrop isOpen={open} onOpenChange={onOpenChange} isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="max-w-5xl">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-default text-foreground">
                <Box size={22} />
              </Modal.Icon>
              <Modal.Heading>{t('editItem')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className='overflow-visible'>
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
