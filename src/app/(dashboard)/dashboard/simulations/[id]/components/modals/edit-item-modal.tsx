'use client';

import { useId, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button, Modal, toast } from '@heroui/react';
import { Box } from 'lucide-react';
import { CatalogItemEditForm } from '../shared/catalog-item-edit-form';
import { SimulatedProductQuickForm } from '../shared/simulated-product-quick-form';
import { updateSimulationItemAction } from '../../../actions';
import type { ProductSnapshot } from '@/db/types';
import type { HsCodeOption } from '@/services/simulation.service';
import type { SimulationItem } from '@/services/simulation.service';

function getItemDisplayName(item: SimulationItem): string {
  if (item.variant) {
    const productName = item.variant.product?.name ?? '';
    const variantName = item.variant.name ?? '';
    return productName ? `${productName} - ${variantName}` : variantName || '—';
  }
  if (item.simulatedProductSnapshot) {
    return item.simulatedProductSnapshot.name;
  }
  return '—';
}

function getItemSku(item: SimulationItem): string {
  if (item.variant) {
    return item.variant.sku ?? '—';
  }
  if (item.simulatedProductSnapshot?.sku) {
    return item.simulatedProductSnapshot.sku;
  }
  return '—';
}

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
  const isCatalogItem = !!item?.variant;

  async function handleSimulatedUpdate(
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

  async function handleCatalogUpdate(quantity: number, priceUsd: string) {
    if (!item) return;
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          const result = await updateSimulationItemAction(item.id, organizationId, {
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

  if (!item) return null;

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
              {isCatalogItem ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-default-50 px-3 py-2">
                    <p className="text-sm font-medium">{getItemDisplayName(item)}</p>
                    <p className="font-mono text-xs text-muted">{getItemSku(item)}</p>
                  </div>
                  <CatalogItemEditForm
                    initialQuantity={item.quantity}
                    initialPriceUsd={String(item.priceUsd ?? '')}
                    unitsPerCarton={item.variant?.unitsPerCarton ?? 1}
                    onSubmit={handleCatalogUpdate}
                    formId={formId}
                    isSubmitting={isPending}
                  />
                </div>
              ) : (
                <SimulatedProductQuickForm
                  hsCodes={hsCodes}
                  onSubmit={handleSimulatedUpdate}
                  isSubmitting={isPending}
                  formId={formId}
                  initialSnapshot={snapshot ?? undefined}
                  initialQuantity={item.quantity}
                  initialPriceUsd={String(item.priceUsd ?? '')}
                  submitLabel={t('saveItem')}
                  hideSubmitButton
                />
              )}
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
