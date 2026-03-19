'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, Modal, TextField, useOverlayState } from '@heroui/react';
import { Pencil, AlertCircle, Trash2 } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { editShipmentItemsAction } from '@/app/(admin)/admin/shipments/[id]/actions';
import type { ShipmentDetail } from '../shipment-utils';

// ============================================
// Types
// ============================================

interface EditItemsModalProps {
  shipment: ShipmentDetail;
  onSuccess?: () => void;
  trigger: React.ReactNode;
}

interface EditedValues {
  quantity: number;
  priceUsd: number;
}

// ============================================
// Component
// ============================================

export function EditItemsModal({ shipment, onSuccess, trigger }: EditItemsModalProps) {
  const t = useTranslations('Admin.Shipments.Modals.EditItems');

  const [editedItems, setEditedItems] = useState<Map<string, EditedValues>>(new Map());
  const [removedItemIds, setRemovedItemIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [noChangesMessage, setNoChangesMessage] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const quoteItems = shipment.quote?.items ?? [];

  const state = useOverlayState({
    onOpenChange: (isOpen) => {
      if (isOpen) {
        setEditedItems(new Map());
        setRemovedItemIds(new Set());
        setError(null);
        setNoChangesMessage(false);
      }
    },
  });

  const handleQuantityChange = (itemId: string, originalQty: number, value: string) => {
    const parsed = parseInt(value, 10);
    setNoChangesMessage(false);
    setEditedItems((prev) => {
      const next = new Map(prev);
      const current = next.get(itemId);
      const priceUsd = current?.priceUsd ?? parseFloat(getOriginalPrice(itemId));
      next.set(itemId, { quantity: isNaN(parsed) ? originalQty : parsed, priceUsd });
      return next;
    });
  };

  const handlePriceChange = (itemId: string, originalQty: number, value: string) => {
    const parsed = parseFloat(value);
    setNoChangesMessage(false);
    setEditedItems((prev) => {
      const next = new Map(prev);
      const current = next.get(itemId);
      const quantity = current?.quantity ?? originalQty;
      next.set(itemId, { quantity, priceUsd: isNaN(parsed) ? 0 : parsed });
      return next;
    });
  };

  const handleRemove = (itemId: string) => {
    setNoChangesMessage(false);
    setRemovedItemIds((prev) => {
      const next = new Set(prev);
      next.add(itemId);
      return next;
    });
    setEditedItems((prev) => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
  };

  const handleUndoRemove = (itemId: string) => {
    setRemovedItemIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  };

  const getOriginalPrice = (itemId: string): string => {
    const item = quoteItems.find((i) => i.id === itemId);
    return item?.priceUsd ?? '0';
  };

  const getDisplayQuantity = (itemId: string, originalQty: number): number => {
    return editedItems.get(itemId)?.quantity ?? originalQty;
  };

  const getDisplayPrice = (itemId: string): string => {
    const edited = editedItems.get(itemId);
    if (edited !== undefined) return String(edited.priceUsd);
    return getOriginalPrice(itemId);
  };

  const buildChanges = () => {
    const changes: Array<{
      type: 'ADD' | 'REMOVE' | 'UPDATE';
      quoteItemId?: string;
      quantity?: number;
      priceUsd?: number;
    }> = [];

    for (const itemId of removedItemIds) {
      changes.push({ type: 'REMOVE', quoteItemId: itemId });
    }

    for (const [itemId, edited] of editedItems.entries()) {
      if (removedItemIds.has(itemId)) continue;

      const originalItem = quoteItems.find((i) => i.id === itemId);
      if (!originalItem) continue;

      const originalQty = originalItem.quantity ?? 1;
      const originalPrice = parseFloat(originalItem.priceUsd ?? '0');

      const hasQtyChange = edited.quantity !== originalQty;
      const hasPriceChange = edited.priceUsd !== originalPrice;

      if (hasQtyChange || hasPriceChange) {
        changes.push({
          type: 'UPDATE',
          quoteItemId: itemId,
          quantity: edited.quantity,
          priceUsd: edited.priceUsd,
        });
      }
    }

    return changes;
  };

  const handleSave = async () => {
    setError(null);
    setNoChangesMessage(false);

    const changes = buildChanges();

    if (changes.length === 0) {
      setNoChangesMessage(true);
      return;
    }

    setIsPending(true);
    try {
      const result = await editShipmentItemsAction(shipment.id, changes);
      if (result.success) {
        state.close();
        onSuccess?.();
      } else {
        setError(result.error ?? 'Erro desconhecido');
      }
    } catch {
      setError('Erro ao salvar alterações');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Modal state={state}>
      {trigger}
      <Modal.Backdrop >
          <Modal.Container size="cover">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header className="mb-4">
                <Modal.Heading>
                  <div className="flex items-center gap-2">
                    <Pencil className="size-5" />
                    {t('title')}
                  </div>
                </Modal.Heading>
              </Modal.Header>

              <Modal.Body className="p-2">
                <div className="space-y-4">
                  {/* Amendment note */}
                  <div className="flex items-start gap-2 rounded-md border border-warning-200 bg-warning-50 p-3">
                    <AlertCircle className="size-4 mt-0.5 shrink-0 text-warning-600" />
                    <p className="text-xs text-warning-700">{t('amendmentNote')}</p>
                  </div>

                  {/* Items table */}
                  {quoteItems.length === 0 ? (
                    <p className="text-sm text-muted text-center py-4">—</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-default-200">
                            <th className="py-2 px-2 text-left text-xs font-medium text-muted">
                              {t('product')}
                            </th>
                            <th className="py-2 px-2 text-left text-xs font-medium text-muted">
                              {t('variant')}
                            </th>
                            <th className="py-2 px-2 text-left text-xs font-medium text-muted w-24">
                              {t('quantity')}
                            </th>
                            <th className="py-2 px-2 text-left text-xs font-medium text-muted w-28">
                              {t('priceUsd')}
                            </th>
                            <th className="py-2 px-2 text-left text-xs font-medium text-muted w-24">
                              {t('total')}
                            </th>
                            <th className="py-2 px-2 w-10" />
                          </tr>
                        </thead>
                        <tbody>
                          {quoteItems.map((item) => {
                            const isRemoved = removedItemIds.has(item.id);
                            const originalQty = item.quantity ?? 1;
                            const displayQty = getDisplayQuantity(item.id, originalQty);
                            const displayPrice = getDisplayPrice(item.id);
                            const total = (displayQty * parseFloat(displayPrice || '0')).toFixed(2);

                            return (
                              <tr
                                key={item.id}
                                className={`border-b border-default-100 last:border-0 transition-opacity ${isRemoved ? 'opacity-40' : ''}`}
                              >
                                <td className="py-2 px-2 text-foreground">
                                  {item.variant?.product?.name ?? '—'}
                                </td>
                                <td className="py-2 px-2 text-muted">
                                  {item.variant?.name ?? '—'}
                                </td>
                                <td className="py-2 px-2">
                                  {isRemoved ? (
                                    <span className="text-muted line-through">{originalQty}</span>
                                  ) : (
                                    <TextField variant="primary">
                                      <Input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={String(displayQty)}
                                        onChange={(e) =>
                                          handleQuantityChange(item.id, originalQty, e.target.value)
                                        }
                                        className="w-20"
                                        autoComplete="off"
                                      />
                                    </TextField>
                                  )}
                                </td>
                                <td className="py-2 px-2">
                                  {isRemoved ? (
                                    <span className="text-muted line-through">
                                      ${parseFloat(item.priceUsd ?? '0').toFixed(2)}
                                    </span>
                                  ) : (
                                    <TextField variant="primary">
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={displayPrice}
                                        onChange={(e) =>
                                          handlePriceChange(item.id, originalQty, e.target.value)
                                        }
                                        className="w-24"
                                        autoComplete="off"
                                      />
                                    </TextField>
                                  )}
                                </td>
                                <td className="py-2 px-2 text-foreground font-medium">
                                  {isRemoved ? (
                                    <span className="text-muted">—</span>
                                  ) : (
                                    `$${total}`
                                  )}
                                </td>
                                <td className="py-2 px-2">
                                  {isRemoved ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onPress={() => handleUndoRemove(item.id)}
                                      className="text-xs"
                                    >
                                      ↩
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onPress={() => handleRemove(item.id)}
                                      aria-label={t('remove')}
                                    >
                                      <Trash2 className="size-4 text-danger" />
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Feedback */}
                  {noChangesMessage && (
                    <p className="text-sm text-muted text-center">{t('noChanges')}</p>
                  )}
                  {error && <FormError message={error} />}
                </div>
              </Modal.Body>

              <Modal.Footer>
                <Button
                  type="button"
                  variant="outline"
                  slot="close"
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onPress={handleSave}
                  isPending={isPending}
                >
                  {isPending ? t('saving') : t('save')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
    </Modal>
  );
}
