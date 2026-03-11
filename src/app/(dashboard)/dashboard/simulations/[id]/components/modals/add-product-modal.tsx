'use client';

import { useId, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Modal, Tabs, Input, TextField, Label, toast, ListBox, Description } from '@heroui/react';
import { Plus, Check } from 'lucide-react';
import { addSimulationItemFromCatalogAction, addSimulatedProductAction } from '../../../actions';
import { formatCurrency } from '@/lib/utils';
import type { ProductWithVariants } from '@/services/product.service';
import type { HsCodeOption } from '@/services/simulation.service';
import { SimulatedProductQuickForm } from '../shared/simulated-product-quick-form';
import type { ProductSnapshot } from '@/db/types';

interface AddProductModalProps {
  simulationId: string;
  organizationId: string;
  products: ProductWithVariants[];
  hsCodes: HsCodeOption[];
  onMutate?: () => void;
  triggerLabel?: string;
}

export function AddProductModal({
  simulationId,
  organizationId,
  products,
  hsCodes,
  onMutate,
  triggerLabel,
}: AddProductModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>('catalog');
  const [search, setSearch] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [catalogQuantity, setCatalogQuantity] = useState('1');
  const [catalogPrice, setCatalogPrice] = useState('');
  const [isPending, startTransition] = useTransition();
  const formId = useId();

  const t = useTranslations('Simulations.AddProduct');
  const tForm = useTranslations('Products.Form');

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      setSelectedTab('catalog');
      setSearch('');
      setSelectedVariantId(null);
      setCatalogQuantity('1');
      setCatalogPrice('');
    }
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.variants?.some((v) => v.sku?.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedVariant = products
    .flatMap((p) => (p.variants ?? []).map((v) => ({ ...v, product: p })))
    .find((v) => v.id === selectedVariantId);

  function handleAddFromCatalog() {
    if (!selectedVariantId || !catalogPrice) return;
    const upc = selectedVariant?.unitsPerCarton ?? 1;
    const qty = Number(catalogQuantity) || 1;
    if (qty % upc !== 0) {
      toast.danger(t('quantityMustBeMultipleOf', { unitsPerCarton: upc }));
      return;
    }
    startTransition(async () => {
      const result = await addSimulationItemFromCatalogAction(
        simulationId,
        organizationId,
        selectedVariantId,
        Number(catalogQuantity) || 1,
        catalogPrice
      );
      if (result.success) {
        handleOpenChange(false);
        toast.success(t('addSuccess'));
        // Defer refresh outside startTransition to avoid Next.js 15+ stuck "Rendering..." state
        setTimeout(() => onMutate?.(), 0);
      } else if (result.error) {
        toast.danger(result.error);
      }
    });
  }

  async function handleAddSimulated(snapshot: ProductSnapshot, quantity: number, priceUsd: string) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const result = await addSimulatedProductAction(
          simulationId,
          organizationId,
          snapshot,
          quantity,
          priceUsd
        );
        if (result.success) {
          handleOpenChange(false);
          toast.success(t('addSuccess'));
          // Defer refresh outside startTransition to avoid Next.js 15+ stuck "Rendering..." state
          setTimeout(() => onMutate?.(), 0);
        } else if (result.error) {
          toast.danger(result.error);
        }
        resolve();
      });
    });
  }

  return (
    <>
      <Modal>
        <Button
          variant="primary"
          size="sm"
          onPress={() => setOpen(true)}
          className="inline-flex items-center gap-2"
        >
          <Plus size={18} />
          {triggerLabel ?? t('addProduct')}
        </Button>
        <Modal.Backdrop isOpen={open} onOpenChange={handleOpenChange} isDismissable={!isPending}>
          <Modal.Container>
            <Modal.Dialog className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{t('heading')}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="overflow-y-auto">
                <Tabs selectedKey={selectedTab} onSelectionChange={(k) => setSelectedTab(String(k))}>
                  <Tabs.ListContainer>
                    <Tabs.List aria-label={t('heading')}>
                      <Tabs.Tab id="catalog">
                        {t('tabCatalog')}
                        <Tabs.Indicator />
                      </Tabs.Tab>
                      <Tabs.Tab id="simulated">
                        {t('tabSimulated')}
                        <Tabs.Indicator />
                      </Tabs.Tab>
                    </Tabs.List>
                  </Tabs.ListContainer>
                  <Tabs.Panel id="catalog" className="pt-4">
                    <div className="space-y-4">
                      <TextField
                        variant="primary"
                        value={search}
                        onChange={(v) => setSearch(v)}
                      >
                        <Label className="sr-only">{t('searchProducts')}</Label>
                        <Input placeholder={t('searchProducts')} />
                      </TextField>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{t('selectProduct')}</Label>
                        {filteredProducts.length === 0 ? (
                          <div className="rounded-lg border border-border p-4">
                            <p className="text-muted text-sm">{t('noProducts')}</p>
                          </div>
                        ) : (
                          <ListBox
                            aria-label={t('selectProduct')}
                            className="max-h-48 overflow-y-auto rounded-lg border border-border"
                            selectionMode="single"
                            selectedKeys={selectedVariantId ? new Set([selectedVariantId]) : new Set()}
                            onSelectionChange={(keys) => {
                              const id = typeof keys === 'string' ? null : [...keys][0] as string | undefined;
                              setSelectedVariantId(id ?? null);
                              if (id) {
                                const v = products
                                  .flatMap((p) => (p.variants ?? []).map((v) => ({ ...v, product: p })))
                                  .find((x) => x.id === id);
                                if (v) {
                                  setCatalogPrice(String(v.priceUsd ?? ''));
                                  setCatalogQuantity(String(v.unitsPerCarton ?? 1));
                                }
                              }
                            }}
                          >
                            {filteredProducts.flatMap((product) =>
                              (product.variants ?? []).map((variant) => (
                                <ListBox.Item
                                  key={variant.id}
                                  id={variant.id}
                                  textValue={`${product.name} — ${variant.name}`}
                                  className="py-3"
                                >
                                  <div className="flex flex-col gap-0.5">
                                    <Label className="font-medium">{product.name} — {variant.name}</Label>
                                    <Description className="font-mono text-xs">
                                      {variant.sku} · {formatCurrency(String(variant.priceUsd ?? '0'), 'en-US', 'USD')}
                                    </Description>
                                  </div>
                                  <ListBox.ItemIndicator>
                                    {({ isSelected }) =>
                                      isSelected ? <Check className="size-4 shrink-0 text-accent" /> : null
                                    }
                                  </ListBox.ItemIndicator>
                                </ListBox.Item>
                              ))
                            )}
                          </ListBox>
                        )}
                      </div>
                      {selectedVariant && (
                        <div className="space-y-6">
                          <div className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2">
                            <Check className="size-4 shrink-0 text-accent" />
                            <span className="text-sm font-medium">{selectedVariant.product.name} — {selectedVariant.name}</span>
                          </div>
                          <div className="flex gap-4 flex-wrap">
                            <TextField
                              variant="primary"
                              value={catalogQuantity}
                              onChange={(v) => setCatalogQuantity(v)}
                            >
                              <Label>{t('quantity')}</Label>
                              <Input
                                type="number"
                                min={selectedVariant?.unitsPerCarton ?? 1}
                                step={selectedVariant?.unitsPerCarton ?? 1}
                                onBlur={() => {
                                  const upc = selectedVariant?.unitsPerCarton ?? 1;
                                  const n = Number(catalogQuantity);
                                  if (catalogQuantity === '' || Number.isNaN(n) || n < upc) {
                                    setCatalogQuantity(String(upc));
                                  } else {
                                    const rounded = Math.round(n / upc) * upc;
                                    setCatalogQuantity(String(rounded));
                                  }
                                }}
                              />
                              {selectedVariant && (
                                <Description>
                                  {t('quantityHint', {
                                    unitsPerCarton: selectedVariant.unitsPerCarton ?? 1,
                                  })}
                                </Description>
                              )}
                            </TextField>
                            <TextField
                              variant="primary"
                              value={catalogPrice}
                              onChange={setCatalogPrice}
                            >
                              <Label>{t('priceUsd')}</Label>
                              <Input type="text" placeholder={tForm('priceUsdPlaceholder')} />
                            </TextField>
                          </div>
                        </div>
                      )}
                    </div>
                  </Tabs.Panel>
                  <Tabs.Panel id="simulated" className="pt-4">
                    <SimulatedProductQuickForm
                      hsCodes={hsCodes}
                      onSubmit={handleAddSimulated}
                      isSubmitting={isPending}
                      formId={formId}
                      hideSubmitButton
                    />
                  </Tabs.Panel>
                </Tabs>
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="ghost" onPress={() => handleOpenChange(false)}>
                  {tForm('cancel')}
                </Button>
                {selectedTab === 'catalog' ? (
                  <Button
                    variant="primary"
                    onPress={handleAddFromCatalog}
                    isDisabled={!selectedVariantId || !catalogPrice}
                    isPending={isPending}
                  >
                    {t('add')}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    form={formId}
                    variant="primary"
                    isDisabled={isPending}
                    isPending={isPending}
                  >
                    {t('add')}
                  </Button>
                )}
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
