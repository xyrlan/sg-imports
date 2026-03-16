'use client';

import { startTransition, useActionState, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  ListBox,
  Select,
  TextArea,
  TextField,
} from '@heroui/react';
import { HsCodeAutocomplete } from '@/components/ui/hs-code-autocomplete';
import { PlusIcon, Trash2Icon } from 'lucide-react';

import { LogisticsFields } from '@/components/ui/logistics-fields';
import { ProductPhotosUpload } from '@/components/ui/product-photos-upload';
import {
  createProductAction,
  updateProductAction,
  type CreateProductSubmittedData,
  type CreateProductState,
  getProductFormOptions,
} from '../actions';
import type { ProductWithVariants } from '@/services/product.service';
import type { ProductSnapshot } from '@/db/types';
import { snapshotToInitialSimulatedState } from '@/lib/simulation-item-utils';

type TieredPriceRow = { beginAmount: number; price: string };
type AttributePair = { key: string; value: string };

type FormVariant = CreateProductSubmittedData['variants'][number] & { id?: string };

const defaultVariant = (): FormVariant => ({
  sku: '',
  name: '',
  priceUsd: '',
  height: '',
  width: '',
  length: '',
  netWeight: '',
  unitWeight: '',
  cartonHeight: '0',
  cartonWidth: '0',
  cartonLength: '0',
  cartonWeight: '0',
  unitsPerCarton: '1',
  packagingType: '',
});

const defaultFormData: CreateProductSubmittedData = {
  name: '',
  styleCode: '',
  description: '',
  hsCodeId: '',
  supplierId: '',
  variants: [defaultVariant()],
};

interface ProductFormProps {
  organizationId: string;
  initialProduct?: ProductWithVariants | null;
  onMutate?: () => void;
  onClose?: () => void;
  mode?: 'catalog' | 'simulated';
  onSimulatedSubmit?: (
    snapshot: ProductSnapshot,
    quantity: number,
    priceUsd: string
  ) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
  hideFooter?: boolean;
  formId?: string;
  onPendingChange?: (isPending: boolean) => void;
  initialSimulatedSnapshot?: { snapshot: ProductSnapshot; quantity: number } | null;
  /** When provided, used instead of updateProductAction for edit mode (e.g. admin) */
  updateAction?: (
    prev: CreateProductState | null,
    formData: FormData
  ) => Promise<CreateProductState>;
}

function productToFormData(p: ProductWithVariants): CreateProductSubmittedData & { variants: FormVariant[] } {
  const variants = (p.variants ?? []).map((v) => ({
    id: v.id,
    sku: v.sku ?? '',
    name: v.name ?? '',
    priceUsd: String(v.priceUsd ?? ''),
    height: v.height ? String(v.height) : '',
    width: v.width ? String(v.width) : '',
    length: v.length ? String(v.length) : '',
    netWeight: v.netWeight ? String(v.netWeight) : '',
    unitWeight: v.unitWeight ? String(v.unitWeight) : '',
    cartonHeight: v.cartonHeight ? String(v.cartonHeight) : '0',
    cartonWidth: v.cartonWidth ? String(v.cartonWidth) : '0',
    cartonLength: v.cartonLength ? String(v.cartonLength) : '0',
    cartonWeight: v.cartonWeight ? String(v.cartonWeight) : '0',
    unitsPerCarton: v.unitsPerCarton ? String(v.unitsPerCarton) : '1',
    packagingType: v.packagingType ?? '',
  }));
  return {
    name: p.name ?? '',
    styleCode: p.styleCode ?? '',
    description: p.description ?? '',
    hsCodeId: p.hsCodeId ?? '',
    supplierId: p.supplierId ?? '',
    variants: variants.length > 0 ? variants : [defaultVariant()],
  };
}

function getInitialState(initialProduct: ProductWithVariants | null | undefined) {
  if (!initialProduct) {
    return {
      formData: defaultFormData as CreateProductSubmittedData & { variants: FormVariant[] },
      variantKeys: [1],
      tieredPriceRows: { 1: [{ beginAmount: 1, price: '' }] } as Record<number, TieredPriceRow[]>,
      attributePairs: {} as Record<number, AttributePair[]>,
    };
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
    ap[k] = attrs
      ? Object.entries(attrs).map(([attrKey, value]) => ({ key: attrKey, value }))
      : [];
  });
  return {
    formData: data,
    variantKeys: keys,
    tieredPriceRows: tp,
    attributePairs: ap,
  };
}

export function ProductForm({
  organizationId,
  initialProduct,
  onMutate,
  onClose,
  mode = 'catalog',
  onSimulatedSubmit,
  isSubmitting = false,
  submitLabel,
  hideFooter = false,
  formId,
  onPendingChange,
  initialSimulatedSnapshot,
  updateAction,
}: ProductFormProps) {
  const t = useTranslations('Products.Form');
  const isSimulated = mode === 'simulated';
  const isEdit = !!initialProduct && !isSimulated;
  const [state, formAction, isCatalogPending] = useActionState(
    isEdit ? (updateAction ?? updateProductAction) : createProductAction,
    null
  );
  const isPending = isSimulated ? isSubmitting : isCatalogPending;

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  const initialState = getInitialState(initialProduct);
  const initialSimulated = initialSimulatedSnapshot
    ? snapshotToInitialSimulatedState(initialSimulatedSnapshot.snapshot, initialSimulatedSnapshot.quantity)
    : null;

  const [formData, setFormData] = useState<CreateProductSubmittedData & { variants: FormVariant[] }>(
    isSimulated && initialSimulated ? initialSimulated.formData : initialState.formData
  );
  const [variantKeys, setVariantKeys] = useState<number[]>(
    isSimulated ? [1] : initialState.variantKeys
  );
  const [tieredPriceRows, setTieredPriceRows] = useState<Record<number, TieredPriceRow[]>>(
    initialState.tieredPriceRows
  );
  const [attributePairs, setAttributePairs] = useState<Record<number, AttributePair[]>>(
    initialState.attributePairs
  );
  const [options, setOptions] = useState<{
    hsCodes: { id: string; code: string }[];
    suppliers: { id: string; name: string }[];
  } | null>(null);

  const [simulatedQuantity, setSimulatedQuantity] = useState(
    initialSimulated?.simulatedQuantity ?? 1
  );
  const [simulatedHsCode, setSimulatedHsCode] = useState(
    initialSimulated?.simulatedHsCode ?? ''
  );
  const [simulatedSupplierName, setSimulatedSupplierName] = useState(
    initialSimulated?.simulatedSupplierName ?? ''
  );

  useEffect(() => {
    if (state?.success) {
      if (!isEdit) {
        startTransition(() => {
          setFormData(defaultFormData);
          setVariantKeys([1]);
          setTieredPriceRows({ 1: [{ beginAmount: 1, price: '' }] });
          setAttributePairs({});
        });
      }
      onMutate?.();
      onClose?.();
    }
  }, [state?.success, onMutate, onClose, isEdit]);

  useEffect(() => {
    if (state?.fieldErrors && state?.submittedData) {
      const sd = state.submittedData;
      startTransition(() => {
        setFormData(sd);
        const n = sd.variants.length;
        setVariantKeys(Array.from({ length: n }, (_, i) => i + 1));
      });
    }
  }, [state?.fieldErrors, state?.submittedData]);

  // Sync form data when opening for edit (ensures modal shows latest product data)
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
        ap[k] = attrs
          ? Object.entries(attrs).map(([attrKey, value]) => ({ key: attrKey, value }))
          : [];
      });
      queueMicrotask(() => {
      setFormData(data);
        setVariantKeys(keys);
        setTieredPriceRows(tp);
        setAttributePairs(ap);
      });
    }
  }, [isEdit, initialProduct?.id]);

  useEffect(() => {
    if (!isSimulated) {
      getProductFormOptions(organizationId).then(setOptions);
    }
  }, [organizationId, isSimulated]);

  const getError = (path: string) => state?.fieldErrors?.[path];

  const validationErrors = state?.fieldErrors
    ? Object.fromEntries(
        Object.entries(state.fieldErrors).filter(
          ([key]) => !key.startsWith('variants.')
        )
      )
    : undefined;

    async function handleSubmit(e: { preventDefault: () => void; target: EventTarget | null }) {
      e.preventDefault();
      if (isSimulated && onSimulatedSubmit) {
        if (!formData.name?.trim() || !formData.variants[0]?.priceUsd?.trim() || !simulatedHsCode.trim()) {
          return;
        }
        const v = formData.variants[0];
        const toNum = (s: string) => Number(String(s).replace(',', '.'));
        const snapshot: ProductSnapshot = {
          name: formData.name.trim(),
          priceUsd: (v?.priceUsd ?? '').replace(',', '.').trim(),
          unitsPerCarton: Math.max(1, toNum(v?.unitsPerCarton ?? '1') || 1),
          hsCode: simulatedHsCode.trim(),
        };
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
      startTransition(() => {
        formAction(fd);
      });
    }

  return (
    <Form
      {...(formId && { id: formId })}
      // action={formAction}
      onSubmit={handleSubmit}
      validationErrors={validationErrors}
      className="space-y-4 p-4"
    >
      <input type="hidden" name="organizationId" value={organizationId} />
      {isEdit && initialProduct && (
        <input type="hidden" name="productId" value={initialProduct.id} />
      )}

      {state?.error && (
        <div className="p-3 bg-danger/10 border border-danger rounded-lg">
          <p className="text-sm text-danger">{state.error}</p>
        </div>
      )}

      <TextField
        variant="primary"
        isDisabled={isPending}
        isRequired
        name="name"
        value={formData.name}
        onChange={(v) => setFormData((prev) => ({ ...prev, name: v }))}
        validate={(v) => (!v?.trim() ? t('nameRequired') : null)}
      >
        <Label>{t('productName')}</Label>
        <Input placeholder={t('productNamePlaceholder')} />
        <FieldError />
      </TextField>

      {!isSimulated && (
        <TextField
          variant="primary"
          isDisabled={isPending}
          name="styleCode"
          value={formData.styleCode}
          onChange={(v) => setFormData((prev) => ({ ...prev, styleCode: v }))}
        >
          <Label>{t('spu')}</Label>
          <Input placeholder={t('spuPlaceholder')} />
          <FieldError />
        </TextField>
      )}

      <TextField
        variant="primary"
        isDisabled={isPending}
        name="description"
        value={formData.description}
        onChange={(v) => setFormData((prev) => ({ ...prev, description: v }))}
      >
        <Label>{t('description')}</Label>
        <TextArea placeholder={t('descriptionPlaceholder')} />
        <FieldError />
      </TextField>

      {!isSimulated && (
        <ProductPhotosUpload
          name="photos"
          label={t('productPhotos')}
          helpText={t('photosHelp')}
          disabled={isPending}
          initialPhotos={isEdit ? initialProduct?.photos ?? undefined : undefined}
        />
      )}

      {isSimulated ? (
        <div className="grid grid-cols-2 gap-4">
          <TextField
            variant="primary"
            isDisabled={isPending}
            isRequired
            value={simulatedHsCode}
            onChange={(v) => setSimulatedHsCode(v)}
          >
            <Label>{t('hsCodeLabel')}</Label>
            <Input placeholder="8504.40.10" />
          </TextField>
          <TextField
            variant="primary"
            isDisabled={isPending}
            value={simulatedSupplierName}
            onChange={(v) => setSimulatedSupplierName(v)}
          >
            <Label>{t('supplierNameLabel')}</Label>
            <Input placeholder={t('supplierNamePlaceholder')} />
          </TextField>
          <TextField
            variant="primary"
            isDisabled={isPending}
            isRequired
            value={String(simulatedQuantity)}
            onChange={(v) => setSimulatedQuantity(Math.max(1, Number(v) || 1))}
          >
            <Label>{t('quantity')}</Label>
            <Input type="number" min={1} />
          </TextField>
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-4">
        {options && (
          <>
            <HsCodeAutocomplete
              hsCodes={options.hsCodes}
              value={formData.hsCodeId || null}
              onChange={(id) =>
                setFormData((prev) => ({ ...prev, hsCodeId: id ?? '' }))
              }
              name="hsCodeId"
              label={t('hsCodeLabel')}
              placeholder={t('hsCodePlaceholder')}
              isRequired
              isDisabled={isPending}
              isInvalid={!!getError('hsCodeId')}
              errorMessage={getError('hsCodeId')}
              fullWidth
            />
            <TextField variant="primary" isRequired isInvalid={!!getError('supplierId')}>
            <Label>{t('supplierPlaceholder')}</Label>
            <Select
              name="supplierId"
              variant="primary"
              isDisabled={isPending}
              isInvalid={!!getError('supplierId')}
              placeholder={t('supplierPlaceholder')}
              className="w-full"
              value={formData.supplierId || null}
              onChange={(key) =>
                setFormData((prev) => ({ ...prev, supplierId: (key as string) ?? '' }))
              }
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item key="__none__" id="__none__" textValue={t('none')}>
                    {t('none')}
                  </ListBox.Item>
                  {options.suppliers.map((s) => (
                    <ListBox.Item
                      key={s.id}
                      id={s.id}
                      textValue={s.name}
                    >
                      {s.name}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
              <FieldError>{getError('supplierId')}</FieldError>
            </Select>
            </TextField>

          </>
        )}
      </div>
      )}

      <div className="border-t border-divider pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted">{t('variantsLabel')}</p>
          {!isSimulated && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onPress={() => {
                const newKey = Math.max(0, ...variantKeys) + 1;
                setVariantKeys((k) => [...k, newKey]);
                setFormData((prev) => ({ ...prev, variants: [...prev.variants, defaultVariant()] }));
                setTieredPriceRows((prev) => ({ ...prev, [newKey]: [{ beginAmount: 1, price: '' }] }));
                setAttributePairs((prev) => ({ ...prev, [newKey]: [] }));
              }}
              isDisabled={isPending}
              className="inline-flex items-center gap-2"
            >
              <PlusIcon size={16} />
              {t('addVariant')}
            </Button>
          )}
        </div>
        <div className="space-y-4">
          {variantKeys.map((key, i) => (
            <div key={key} className="rounded-lg border border-divider p-3 space-y-3">
              {isEdit && (
                <input
                  type="hidden"
                  name="variantId"
                  value={(formData.variants[i] as FormVariant)?.id ?? ''}
                />
              )}
              <div className="flex items-end gap-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                  <TextField
                    variant="primary"
                    isDisabled={isPending}
                    isRequired
                    isInvalid={!!getError(`variants.${i}.sku`)}
                    value={formData.variants[i]?.sku ?? ''}
                    onChange={(v) =>
                      setFormData((prev) => ({
                        ...prev,
                        variants: prev.variants.map((vr, idx) =>
                          idx === i ? { ...vr, sku: v } : vr
                        ),
                      }))
                    }
                    validate={(v) => (!v?.trim() ? t('skuRequired') : null)}
                  >
                    <Label>{t('sku')}</Label>
                    <Input name="variantSku" placeholder={t('skuPlaceholder')} />
                    <FieldError>{getError(`variants.${i}.sku`)}</FieldError>
                  </TextField>
                  <TextField
                    variant="primary"
                    isDisabled={isPending}
                    isRequired
                    isInvalid={!!getError(`variants.${i}.name`)}
                    value={formData.variants[i]?.name ?? ''}
                    onChange={(v) =>
                      setFormData((prev) => ({
                        ...prev,
                        variants: prev.variants.map((vr, idx) =>
                          idx === i ? { ...vr, name: v } : vr
                        ),
                      }))
                    }
                    validate={(v) => (!v?.trim() ? t('variantNameRequired') : null)}
                  >
                    <Label>{t('variantName')}</Label>
                    <Input name="variantName" placeholder={t('variantNamePlaceholder')} />
                    <FieldError>{getError(`variants.${i}.name`)}</FieldError>
                  </TextField>
                  <TextField
                    variant="primary"
                    isDisabled={isPending}
                    isRequired
                    isInvalid={!!getError(`variants.${i}.priceUsd`)}
                    value={formData.variants[i]?.priceUsd ?? ''}
                    onChange={(v) =>
                      setFormData((prev) => ({
                        ...prev,
                        variants: prev.variants.map((vr, idx) =>
                          idx === i ? { ...vr, priceUsd: v } : vr
                        ),
                      }))
                    }
                    validate={(v) => (!v?.trim() ? t('priceRequired') : null)}
                  >
                    <Label>{t('priceUsd')}</Label>
                    <Input name="priceUsd" placeholder={t('priceUsdPlaceholder')} />
                    <FieldError>{getError(`variants.${i}.priceUsd`)}</FieldError>
                  </TextField>
                </div>
                {!isSimulated && variantKeys.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      setVariantKeys((k) => k.filter((_, idx) => idx !== i));
                      setFormData((prev) => ({
                        ...prev,
                        variants: prev.variants.filter((_, idx) => idx !== i),
                      }));
                    }}
                    isDisabled={isPending}
                  >
                    <Trash2Icon size={18} />
                  </Button>
                )}
              </div>
              <LogisticsFields
                variantData={formData.variants[i] ?? defaultVariant()}
                onChange={(updates) =>
                  setFormData((prev) => ({
                    ...prev,
                    variants: prev.variants.map((vr, idx) =>
                      idx === i ? { ...vr, ...updates } : vr
                    ),
                  }))
                }
                isPending={isPending}
                t={t}
                variantIndex={i}
                getError={getError}
              />
              {!isSimulated && (() => {
                const tpRows = tieredPriceRows[key] ?? [{ beginAmount: 1, price: '' }];
                const attrRows = attributePairs[key] ?? [];
                const buildTieredPrice = () => {
                  const valid = tpRows
                    .filter((r) => r.price.trim() !== '')
                    .map((r) => ({ beginAmount: Math.max(1, r.beginAmount), price: r.price.trim() }))
                    .sort((a, b) => a.beginAmount - b.beginAmount);
                  return valid.length > 0 ? valid : undefined;
                };
                const buildAttributes = () => {
                  const obj: Record<string, string> = {};
                  attrRows.forEach(({ key: k, value: v }) => {
                    const norm = k.trim().toLowerCase().replace(/\s+/g, '_');
                    if (norm && v.trim()) obj[norm] = v.trim();
                  });
                  return Object.keys(obj).length > 0 ? obj : undefined;
                };
                return (
                  <>
                    <input
                      type="hidden"
                      name="variantPackagingType"
                      value={formData.variants[i]?.packagingType ?? ''}
                    />
                    <input
                      type="hidden"
                      name="variantTieredPriceInfo"
                      value={JSON.stringify(buildTieredPrice() ?? [])}
                    />
                    <input
                      type="hidden"
                      name="variantAttributes"
                      value={JSON.stringify(buildAttributes() ?? {})}
                    />
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted mb-2">{t('tieredPricing')}</p>
                        <div className="space-y-2">
                          {tpRows.map((row, rowIdx) => (
                            <div key={rowIdx} className="flex gap-2 items-center">
                              <TextField variant="primary" isDisabled={isPending} className="flex-1">
                                <Label className="sr-only">{t('minQty')}</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  placeholder={t('minQty')}
                                  value={row.beginAmount === 0 ? '' : String(row.beginAmount)}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const next =
                                      raw === ''
                                        ? 0
                                        : Math.max(1, parseInt(raw, 10) || 1);
                                    setTieredPriceRows((prev) => ({
                                      ...prev,
                                      [key]: (prev[key] ?? [{ beginAmount: 1, price: '' }]).map((r, idx) =>
                                        idx === rowIdx ? { ...r, beginAmount: next } : r
                                      ),
                                    }));
                                  }}
                                />
                              </TextField>
                              <TextField variant="primary" isDisabled={isPending} className="flex-1">
                                <Label className="sr-only">{t('priceUsdLabel')}</Label>
                                <Input
                                  placeholder={t('priceUsdLabel')}
                                  value={row.price}
                                  onChange={(e) =>
                                    setTieredPriceRows((prev) => ({
                                      ...prev,
                                      [key]: (prev[key] ?? [{ beginAmount: 1, price: '' }]).map((r, idx) =>
                                        idx === rowIdx ? { ...r, price: e.target.value } : r
                                      ),
                                    }))
                                  }
                                />
                              </TextField>
                              {tpRows.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onPress={() =>
                                    setTieredPriceRows((prev) => ({
                                      ...prev,
                                      [key]: (prev[key] ?? [{ beginAmount: 1, price: '' }]).filter(
                                        (_, idx) => idx !== rowIdx
                                      ),
                                    }))
                                  }
                                  isDisabled={isPending}
                                >
                                  <Trash2Icon size={16} />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onPress={() =>
                              setTieredPriceRows((prev) => ({
                                ...prev,
                                [key]: [...(prev[key] ?? [{ beginAmount: 1, price: '' }]), { beginAmount: 1, price: '' }],
                              }))
                            }
                            isDisabled={isPending}
                            className="inline-flex items-center gap-2"
                          >
                            <PlusIcon size={14} />
                            {t('addTier')}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted mb-2">{t('attributes')}</p>
                        <div className="space-y-2">
                          {attrRows.map((pair, pairIdx) => (
                            <div key={pairIdx} className="flex gap-2 items-center">
                              <TextField variant="primary" isDisabled={isPending} className="flex-1">
                                <Label className="sr-only">{t('attrKeyPlaceholder')}</Label>
                                <Input
                                  placeholder={t('attrKeyPlaceholder')}
                                  value={pair.key}
                                  onChange={(e) =>
                                    setAttributePairs((prev) => ({
                                      ...prev,
                                      [key]: (prev[key] ?? []).map((p, idx) =>
                                        idx === pairIdx ? { ...p, key: e.target.value } : p
                                      ),
                                    }))
                                  }
                                />
                              </TextField>
                              <TextField variant="primary" isDisabled={isPending} className="flex-1">
                                <Label className="sr-only">{t('attrValuePlaceholder')}</Label>
                                <Input
                                  placeholder={t('attrValuePlaceholder')}
                                  value={pair.value}
                                  onChange={(e) =>
                                    setAttributePairs((prev) => ({
                                      ...prev,
                                      [key]: (prev[key] ?? []).map((p, idx) =>
                                        idx === pairIdx ? { ...p, value: e.target.value } : p
                                      ),
                                    }))
                                  }
                                />
                              </TextField>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onPress={() =>
                                  setAttributePairs((prev) => ({
                                    ...prev,
                                    [key]: (prev[key] ?? []).filter((_, idx) => idx !== pairIdx),
                                  }))
                                }
                                isDisabled={isPending}
                              >
                                <Trash2Icon size={16} />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onPress={() =>
                              setAttributePairs((prev) => ({
                                ...prev,
                                [key]: [...(prev[key] ?? []), { key: '', value: '' }],
                              }))
                            }
                            isDisabled={isPending}
                            className="inline-flex items-center gap-2"
                          >
                            <PlusIcon size={14} />
                            {t('addAttribute')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
              {isSimulated && (
                <>
                  <input type="hidden" name="variantTieredPriceInfo" value="[]" />
                  <input type="hidden" name="variantAttributes" value="{}" />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {!hideFooter && (
        <div className="flex justify-end gap-2 pt-4">
          {onClose && (
            <Button type="button" variant="ghost" onPress={onClose}>
              {t('cancel')}
            </Button>
          )}
          <Button type="submit" variant="primary" isPending={isPending}>
            {isSimulated ? (submitLabel ?? t('createProduct')) : isEdit ? t('updateProduct') : t('createProduct')}
          </Button>
        </div>
      )}
    </Form>
  );
}
