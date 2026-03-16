'use client';

import { startTransition, useActionState, useEffect, useState } from 'react';
import { createProductAction, updateProductAction, type CreateProductSubmittedData, type CreateProductState, getProductFormOptions } from '../actions';
import type { ProductWithVariants } from '@/services/product.service';
import type { ProductSnapshot } from '@/db/types';
import { snapshotToInitialSimulatedState } from '@/lib/simulation-item-utils';
import { type TieredPriceRow, type AttributePair, type FormVariant, defaultVariant, defaultFormData } from '../components/form-sections/product-form-types';

function productToFormData(p: ProductWithVariants): CreateProductSubmittedData & { variants: FormVariant[] } {
  const variants = (p.variants ?? []).map((v) => ({ id: v.id, sku: v.sku ?? '', name: v.name ?? '', priceUsd: String(v.priceUsd ?? ''), height: v.height ? String(v.height) : '', width: v.width ? String(v.width) : '', length: v.length ? String(v.length) : '', netWeight: v.netWeight ? String(v.netWeight) : '', unitWeight: v.unitWeight ? String(v.unitWeight) : '', cartonHeight: v.cartonHeight ? String(v.cartonHeight) : '0', cartonWidth: v.cartonWidth ? String(v.cartonWidth) : '0', cartonLength: v.cartonLength ? String(v.cartonLength) : '0', cartonWeight: v.cartonWeight ? String(v.cartonWeight) : '0', unitsPerCarton: v.unitsPerCarton ? String(v.unitsPerCarton) : '1', packagingType: v.packagingType ?? '' }));
  return { name: p.name ?? '', styleCode: p.styleCode ?? '', description: p.description ?? '', hsCodeId: p.hsCodeId ?? '', supplierId: p.supplierId ?? '', variants: variants.length > 0 ? variants : [defaultVariant()] };
}

function getInitialState(initialProduct: ProductWithVariants | null | undefined) {
  if (!initialProduct) {
    return { formData: defaultFormData as CreateProductSubmittedData & { variants: FormVariant[] }, variantKeys: [1], tieredPriceRows: { 1: [{ beginAmount: 1, price: '' }] } as Record<number, TieredPriceRow[]>, attributePairs: {} as Record<number, AttributePair[]> };
  }
  const data = productToFormData(initialProduct);
  const n = data.variants.length;
  const keys = Array.from({ length: n }, (_, i) => i + 1);
  const tp: Record<number, TieredPriceRow[]> = {};
  const ap: Record<number, AttributePair[]> = {};
  initialProduct.variants?.forEach((v, i) => {
    const k = keys[i] ?? i + 1;
    const tiered = (v.tieredPriceInfo as TieredPriceRow[] | null) ?? [];
    tp[k] = tiered.length > 0 ? tiered : [{ beginAmount: 1, price: '' }];
    const attrs = v.attributes as Record<string, string> | null;
    ap[k] = attrs ? Object.entries(attrs).map(([attrKey, value]) => ({ key: attrKey, value })) : [];
  });
  return { formData: data, variantKeys: keys, tieredPriceRows: tp, attributePairs: ap };
}

export interface UseProductFormProps {
  organizationId: string;
  initialProduct?: ProductWithVariants | null;
  onMutate?: () => void;
  onClose?: () => void;
  mode?: 'catalog' | 'simulated';
  onSimulatedSubmit?: (snapshot: ProductSnapshot, quantity: number, priceUsd: string) => Promise<void>;
  isSubmitting?: boolean;
  onPendingChange?: (isPending: boolean) => void;
  initialSimulatedSnapshot?: { snapshot: ProductSnapshot; quantity: number } | null;
  updateAction?: (prev: CreateProductState | null, formData: FormData) => Promise<CreateProductState>;
}

export function useProductForm({ organizationId, initialProduct, onMutate, onClose, mode = 'catalog', onSimulatedSubmit, isSubmitting = false, onPendingChange, initialSimulatedSnapshot, updateAction }: UseProductFormProps) {
  const isSimulated = mode === 'simulated';
  const isEdit = !!initialProduct && !isSimulated;
  const [state, formAction, isCatalogPending] = useActionState(isEdit ? (updateAction ?? updateProductAction) : createProductAction, null);
  const isPending = isSimulated ? isSubmitting : isCatalogPending;

  useEffect(() => { onPendingChange?.(isPending); }, [isPending, onPendingChange]);

  const initialState = getInitialState(initialProduct);
  const initialSimulated = initialSimulatedSnapshot ? snapshotToInitialSimulatedState(initialSimulatedSnapshot.snapshot, initialSimulatedSnapshot.quantity) : null;

  const [formData, setFormData] = useState<CreateProductSubmittedData & { variants: FormVariant[] }>(isSimulated && initialSimulated ? initialSimulated.formData : initialState.formData);
  const [variantKeys, setVariantKeys] = useState<number[]>(isSimulated ? [1] : initialState.variantKeys);
  const [tieredPriceRows, setTieredPriceRows] = useState<Record<number, TieredPriceRow[]>>(initialState.tieredPriceRows);
  const [attributePairs, setAttributePairs] = useState<Record<number, AttributePair[]>>(initialState.attributePairs);
  const [options, setOptions] = useState<{ hsCodes: { id: string; code: string }[]; suppliers: { id: string; name: string }[] } | null>(null);
  const [simulatedQuantity, setSimulatedQuantity] = useState(initialSimulated?.simulatedQuantity ?? 1);
  const [simulatedHsCode, setSimulatedHsCode] = useState(initialSimulated?.simulatedHsCode ?? '');
  const [simulatedSupplierName, setSimulatedSupplierName] = useState(initialSimulated?.simulatedSupplierName ?? '');

  useEffect(() => {
    if (state?.success) {
      if (!isEdit) { startTransition(() => { setFormData(defaultFormData); setVariantKeys([1]); setTieredPriceRows({ 1: [{ beginAmount: 1, price: '' }] }); setAttributePairs({}); }); }
      onMutate?.(); onClose?.();
    }
  }, [state?.success, onMutate, onClose, isEdit]);

  useEffect(() => {
    if (state?.fieldErrors && state?.submittedData) {
      const sd = state.submittedData;
      startTransition(() => { setFormData(sd); setVariantKeys(Array.from({ length: sd.variants.length }, (_, i) => i + 1)); });
    }
  }, [state?.fieldErrors, state?.submittedData]);

  useEffect(() => {
    if (isEdit && initialProduct) {
      const data = productToFormData(initialProduct);
      const n = data.variants.length;
      const keys = Array.from({ length: n }, (_, i) => i + 1);
      const tp: Record<number, TieredPriceRow[]> = {};
      const ap: Record<number, AttributePair[]> = {};
      initialProduct.variants?.forEach((v, i) => {
        const k = keys[i] ?? i + 1;
        const tiered = (v.tieredPriceInfo as TieredPriceRow[] | null) ?? [];
        tp[k] = tiered.length > 0 ? tiered : [{ beginAmount: 1, price: '' }];
        const attrs = v.attributes as Record<string, string> | null;
        ap[k] = attrs ? Object.entries(attrs).map(([attrKey, value]) => ({ key: attrKey, value })) : [];
      });
      queueMicrotask(() => { setFormData(data); setVariantKeys(keys); setTieredPriceRows(tp); setAttributePairs(ap); });
    }
  }, [isEdit, initialProduct?.id]);

  useEffect(() => { if (!isSimulated) { getProductFormOptions(organizationId).then(setOptions); } }, [organizationId, isSimulated]);

  const getError = (path: string) => state?.fieldErrors?.[path];
  const validationErrors = state?.fieldErrors ? Object.fromEntries(Object.entries(state.fieldErrors).filter(([key]) => !key.startsWith('variants.'))) : undefined;

  async function handleSubmit(e: { preventDefault: () => void; target: EventTarget | null }) {
    e.preventDefault();
    if (isSimulated && onSimulatedSubmit) {
      if (!formData.name?.trim() || !formData.variants[0]?.priceUsd?.trim() || !simulatedHsCode.trim()) return;
      const v = formData.variants[0];
      const toNum = (s: string) => Number(String(s).replace(',', '.'));
      const snapshot: ProductSnapshot = { name: formData.name.trim(), priceUsd: (v?.priceUsd ?? '').replace(',', '.').trim(), unitsPerCarton: Math.max(1, toNum(v?.unitsPerCarton ?? '1') || 1), hsCode: simulatedHsCode.trim() };
      if (v?.sku?.trim()) snapshot.sku = v.sku.trim();
      if (formData.description?.trim()) snapshot.description = formData.description.trim();
      if (simulatedSupplierName.trim()) snapshot.supplierName = simulatedSupplierName.trim();
      if (v?.cartonHeight?.trim()) snapshot.cartonHeight = toNum(v.cartonHeight);
      if (v?.cartonWidth?.trim()) snapshot.cartonWidth = toNum(v.cartonWidth);
      if (v?.cartonLength?.trim()) snapshot.cartonLength = toNum(v.cartonLength);
      if (v?.cartonWeight?.trim()) snapshot.cartonWeight = toNum(v.cartonWeight);
      if (v?.height?.trim()) snapshot.height = toNum(v.height);
      if (v?.width?.trim()) snapshot.width = toNum(v.width);
      if (v?.length?.trim()) snapshot.length = toNum(v.length);
      if (v?.netWeight?.trim()) snapshot.netWeight = toNum(v.netWeight);
      if (v?.unitWeight?.trim()) snapshot.unitWeight = toNum(v.unitWeight);
      if (v?.packagingType) snapshot.packagingType = v.packagingType as 'BOX' | 'PALLET' | 'BAG';
      await onSimulatedSubmit(snapshot, simulatedQuantity, (v?.priceUsd ?? '').replace(',', '.'));
      return;
    }
    const fd = new FormData(e.target as HTMLFormElement);
    startTransition(() => { formAction(fd); });
  }

  const addVariant = () => {
    const newKey = Math.max(0, ...variantKeys) + 1;
    setVariantKeys((k) => [...k, newKey]);
    setFormData((prev) => ({ ...prev, variants: [...prev.variants, defaultVariant()] }));
    setTieredPriceRows((prev) => ({ ...prev, [newKey]: [{ beginAmount: 1, price: '' }] }));
    setAttributePairs((prev) => ({ ...prev, [newKey]: [] }));
  };

  const removeVariant = (index: number) => {
    setVariantKeys((k) => k.filter((_, idx) => idx !== index));
    setFormData((prev) => ({ ...prev, variants: prev.variants.filter((_, idx) => idx !== index) }));
  };

  const updateVariant = (index: number, updates: Partial<FormVariant>) => {
    setFormData((prev) => ({ ...prev, variants: prev.variants.map((vr, idx) => idx === index ? { ...vr, ...updates } : vr) }));
  };

  return { state, formAction, isPending, isSimulated, isEdit, formData, setFormData, variantKeys, tieredPriceRows, setTieredPriceRows, attributePairs, setAttributePairs, options, simulatedQuantity, setSimulatedQuantity, simulatedHsCode, setSimulatedHsCode, simulatedSupplierName, setSimulatedSupplierName, getError, validationErrors, handleSubmit, addVariant, removeVariant, updateVariant };
}
