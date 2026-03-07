'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Modal, Tabs, Input, TextField, Label } from '@heroui/react';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { addSimulationItemFromCatalogAction, addSimulatedProductAction } from '../../actions';
import { formatCurrency } from '@/lib/utils';
import type { ProductWithVariants } from '@/services/product.service';
import { SimulatedProductForm } from './simulated-product-form';
import { ProductSnapshot } from '@/db/types';

interface AddProductToSimulationModalProps {
  simulationId: string;
  organizationId: string;
  products: ProductWithVariants[];
  onMutate?: () => void;
  triggerLabel?: string;
}

export function AddProductToSimulationModal({
  simulationId,
  organizationId,
  products,
  onMutate,
  triggerLabel,
}: AddProductToSimulationModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>('catalog');
  const [search, setSearch] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [catalogQuantity, setCatalogQuantity] = useState(1);
  const [catalogPrice, setCatalogPrice] = useState('');
  const [isSubmittingCatalog, setIsSubmittingCatalog] = useState(false);
  const [isSubmittingSimulated, setIsSubmittingSimulated] = useState(false);

  const t = useTranslations('Simulations.AddProduct');
  const router = useRouter();

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      setSelectedTab('catalog');
      setSearch('');
      setSelectedVariantId(null);
      setCatalogQuantity(1);
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

  async function handleAddFromCatalog() {
    if (!selectedVariantId || !catalogPrice) return;
    setIsSubmittingCatalog(true);
    const result = await addSimulationItemFromCatalogAction(
      simulationId,
      organizationId,
      selectedVariantId,
      catalogQuantity,
      catalogPrice
    );
    setIsSubmittingCatalog(false);
    if (result.success) {
      handleOpenChange(false);
      onMutate?.();
      router.refresh();
    } else if (result.error) {
      alert(result.error);
    }
  }

  async function handleAddSimulated(snapshot: ProductSnapshot, quantity: number, priceUsd: string) {
    setIsSubmittingSimulated(true);
    const result = await addSimulatedProductAction(
      simulationId,
      organizationId,
      snapshot,
      quantity,
      priceUsd
    );
    setIsSubmittingSimulated(false);
    if (result.success) {
      handleOpenChange(false);
      onMutate?.();
      router.refresh();
    } else if (result.error) {
      alert(result.error);
    }
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
        <Modal.Backdrop isOpen={open} onOpenChange={handleOpenChange} isDismissable={false}>
          <Modal.Container>
            <Modal.Dialog className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
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
                      <div className="max-h-48 overflow-y-auto border rounded-lg">
                        {filteredProducts.length === 0 ? (
                          <p className="p-4 text-muted text-sm">{t('noProducts')}</p>
                        ) : (
                          <div className="divide-y">
                            {filteredProducts.map((product) =>
                              (product.variants ?? []).map((variant) => (
                                <button
                                  key={variant.id}
                                  type="button"
                                  className={`w-full text-left p-3 hover:bg-muted/50 ${
                                    selectedVariantId === variant.id ? 'bg-primary/10' : ''
                                  }`}
                                  onClick={() => {
                                    setSelectedVariantId(variant.id);
                                    setCatalogPrice(String(variant.priceUsd ?? ''));
                                  }}
                                >
                                  <span className="font-medium">{product.name} - {variant.name}</span>
                                  <span className="block text-sm text-muted font-mono">{variant.sku}</span>
                                  <span className="text-sm">{formatCurrency(String(variant.priceUsd ?? '0'), 'en-US', 'USD')}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      {selectedVariant && (
                        <div className="flex gap-4 items-end flex-wrap">
                          <TextField
                            variant="primary"
                            value={String(catalogQuantity)}
                            onChange={(v) => setCatalogQuantity(Number(v) || 1)}
                          >
                            <Label>{t('quantity')}</Label>
                            <Input type="number" min={1} />
                          </TextField>
                          <TextField
                            variant="primary"
                            value={catalogPrice}
                            onChange={setCatalogPrice}
                          >
                            <Label>{t('priceUsd')}</Label>
                            <Input type="text" placeholder="0.00" />
                          </TextField>
                          <Button
                            variant="primary"
                            onPress={handleAddFromCatalog}
                            isPending={isSubmittingCatalog}
                          >
                            {t('add')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </Tabs.Panel>
                  <Tabs.Panel id="simulated" className="pt-4">
                    <SimulatedProductForm
                      onSubmit={handleAddSimulated}
                      isSubmitting={isSubmittingSimulated}
                      submitLabel={t('add')}
                    />
                  </Tabs.Panel>
                </Tabs>
              </Modal.Body>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
