'use client';

import { useTranslations } from 'next-intl';
import { Button, Form } from '@heroui/react';
import type { ProductWithVariants } from '@/services/product.service';
import type { ProductSnapshot } from '@/db/types';
import type { CreateProductState } from '../actions';
import { useProductForm } from '../hooks/use-product-form';
import { BasicFields } from './form-sections/basic-fields';
import { SimulatedFields } from './form-sections/simulated-fields';
import { CatalogFields } from './form-sections/catalog-fields';
import { VariantsSection } from './form-sections/variants-section';

interface ProductFormProps {
  organizationId: string;
  initialProduct?: ProductWithVariants | null;
  onMutate?: () => void;
  onClose?: () => void;
  mode?: 'catalog' | 'simulated';
  onSimulatedSubmit?: (snapshot: ProductSnapshot, quantity: number, priceUsd: string) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
  hideFooter?: boolean;
  formId?: string;
  onPendingChange?: (isPending: boolean) => void;
  initialSimulatedSnapshot?: { snapshot: ProductSnapshot; quantity: number } | null;
  updateAction?: (prev: CreateProductState | null, formData: FormData) => Promise<CreateProductState>;
}

export function ProductForm({
  organizationId, initialProduct, onMutate, onClose, mode = 'catalog',
  onSimulatedSubmit, isSubmitting = false, submitLabel, hideFooter = false,
  formId, onPendingChange, initialSimulatedSnapshot, updateAction,
}: ProductFormProps) {
  const t = useTranslations('Products.Form');
  const {
    state, isPending, isSimulated, isEdit, formData, setFormData,
    variantKeys, tieredPriceRows, setTieredPriceRows, attributePairs, setAttributePairs,
    options, simulatedQuantity, setSimulatedQuantity, simulatedHsCode, setSimulatedHsCode,
    simulatedSupplierName, setSimulatedSupplierName, getError, validationErrors,
    handleSubmit, addVariant, removeVariant, updateVariant,
  } = useProductForm({
    organizationId, initialProduct, onMutate, onClose, mode, onSimulatedSubmit,
    isSubmitting, onPendingChange, initialSimulatedSnapshot, updateAction,
  });

  return (
    <Form {...(formId && { id: formId })} onSubmit={handleSubmit} validationErrors={validationErrors} className="space-y-4 p-4">
      <input type="hidden" name="organizationId" value={organizationId} />
      {isEdit && initialProduct && <input type="hidden" name="productId" value={initialProduct.id} />}
      {state?.error && (
        <div className="p-3 bg-danger/10 border border-danger rounded-lg">
          <p className="text-sm text-danger">{state.error}</p>
        </div>
      )}
      <BasicFields formData={formData} setFormData={setFormData} isPending={isPending} isSimulated={isSimulated} isEdit={isEdit} initialProduct={initialProduct} t={t} />
      {isSimulated ? (
        <SimulatedFields isPending={isPending} simulatedHsCode={simulatedHsCode} setSimulatedHsCode={setSimulatedHsCode} simulatedSupplierName={simulatedSupplierName} setSimulatedSupplierName={setSimulatedSupplierName} simulatedQuantity={simulatedQuantity} setSimulatedQuantity={setSimulatedQuantity} t={t} />
      ) : (
        <CatalogFields formData={formData} setFormData={setFormData} isPending={isPending} options={options} getError={getError} t={t} />
      )}
      <VariantsSection formData={formData} variantKeys={variantKeys} tieredPriceRows={tieredPriceRows} setTieredPriceRows={setTieredPriceRows} attributePairs={attributePairs} setAttributePairs={setAttributePairs} isPending={isPending} isSimulated={isSimulated} isEdit={isEdit} getError={getError} addVariant={addVariant} removeVariant={removeVariant} updateVariant={updateVariant} onVariantLogisticsChange={updateVariant} t={t} />
      {!hideFooter && (
        <div className="flex justify-end gap-2 pt-4">
          {onClose && <Button type="button" variant="ghost" onPress={onClose}>{t('cancel')}</Button>}
          <Button type="submit" variant="primary" isPending={isPending}>
            {isSimulated ? (submitLabel ?? t('createProduct')) : isEdit ? t('updateProduct') : t('createProduct')}
          </Button>
        </div>
      )}
    </Form>
  );
}
