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
import { PlusIcon, Trash2Icon } from 'lucide-react';

import { ProductPhotosUpload } from '@/components/ui/product-photos-upload';
import {
  createProductAction,
  updateProductAction,
  type CreateProductSubmittedData,
  getProductFormOptions,
} from '../actions';
import type { ProductWithVariants } from '@/services/product.service';

type TieredPriceRow = { beginAmount: number; price: string };
type AttributePair = { key: string; value: string };

type FormVariant = CreateProductSubmittedData['variants'][number] & { id?: string };

const defaultVariant = (): FormVariant => ({
  sku: '',
  name: '',
  priceUsd: '',
  boxQuantity: '1',
  boxWeight: '',
  height: '',
  width: '',
  length: '',
  netWeight: '',
  unitWeight: '',
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
}

function productToFormData(p: ProductWithVariants): CreateProductSubmittedData & { variants: FormVariant[] } {
  const variants = (p.variants ?? []).map((v) => ({
    id: v.id,
    sku: v.sku ?? '',
    name: v.name ?? '',
    priceUsd: String(v.priceUsd ?? ''),
    boxQuantity: String(v.boxQuantity ?? 1),
    boxWeight: String(v.boxWeight ?? '0'),
    height: v.height ? String(v.height) : '',
    width: v.width ? String(v.width) : '',
    length: v.length ? String(v.length) : '',
    netWeight: v.netWeight ? String(v.netWeight) : '',
    unitWeight: v.unitWeight ? String(v.unitWeight) : '',
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

export function ProductForm({ organizationId, initialProduct, onMutate, onClose }: ProductFormProps) {
  const t = useTranslations('Products.Form');
  const isEdit = !!initialProduct;
  const [state, formAction, isPending] = useActionState(
    isEdit ? updateProductAction : createProductAction,
    null
  );
  const initialState = getInitialState(initialProduct);
  const [formData, setFormData] = useState<CreateProductSubmittedData & { variants: FormVariant[] }>(
    initialState.formData
  );
  const [variantKeys, setVariantKeys] = useState<number[]>(initialState.variantKeys);
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

  useEffect(() => {
    if (state?.success) {
      startTransition(() => {
        setFormData(defaultFormData);
        setVariantKeys([1]);
        setTieredPriceRows({ 1: [{ beginAmount: 1, price: '' }] });
        setAttributePairs({});
      });
      onMutate?.();
      onClose?.();
    }
  }, [state?.success, onMutate, onClose]);

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

  useEffect(() => {
    getProductFormOptions(organizationId).then(setOptions);
  }, [organizationId]);

  const getError = (path: string) => state?.fieldErrors?.[path];

  const validationErrors = state?.fieldErrors
    ? Object.fromEntries(
        Object.entries(state.fieldErrors).filter(
          ([key]) => !key.startsWith('variants.')
        )
      )
    : undefined;

    function handleSubmit(e: { preventDefault: () => void; target: EventTarget | null }) {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      startTransition(() => {
        formAction(formData);
      });
    }

  return (
    <Form
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

      <ProductPhotosUpload
        name="photos"
        label={t('productPhotos')}
        helpText={t('photosHelp')}
        disabled={isPending}
        initialPhotos={isEdit ? initialProduct?.photos ?? undefined : undefined}
      />

      <div className="grid grid-cols-2 gap-4">
        {options && (
          <>
            <Select
              name="hsCodeId"
              variant="primary"
              isDisabled={isPending}
              isInvalid={!!getError('hsCodeId')}
              placeholder={t('hsCodePlaceholder')}
              className="w-full"
              value={formData.hsCodeId || null}
              onChange={(key) =>
                setFormData((prev) => ({ ...prev, hsCodeId: (key as string) ?? '' }))
              }
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item key="__none__" id="__none__" textValue={t('none')} />
                  {options.hsCodes.map((hc) => (
                    <ListBox.Item
                      key={hc.id}
                      id={hc.id}
                      textValue={hc.code}
                    />
                  ))}
                </ListBox>
              </Select.Popover>
              <FieldError>{getError('hsCodeId')}</FieldError>
            </Select>
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
                  <ListBox.Item key="__none__" id="__none__" textValue={t('none')} />
                  {options.suppliers.map((s) => (
                    <ListBox.Item
                      key={s.id}
                      id={s.id}
                      textValue={s.name}
                    />
                  ))}
                </ListBox>
              </Select.Popover>
              <FieldError>{getError('supplierId')}</FieldError>
            </Select>
          </>
        )}
      </div>

      <div className="border-t border-divider pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted">{t('variantsLabel')}</p>
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
                {variantKeys.length > 1 && (
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <TextField
                  variant="primary"
                  isDisabled={isPending}
                  isRequired
                  isInvalid={!!getError(`variants.${i}.boxQuantity`)}
                  value={formData.variants[i]?.boxQuantity ?? '1'}
                  onChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      variants: prev.variants.map((vr, idx) =>
                        idx === i ? { ...vr, boxQuantity: v} : vr
                      ),
                    }))
                  }
                  validate={(v) =>
                    !v || Number(v) < 1 ? t('boxQuantityRequired') : null
                  }
                >
                  <Label>{t('boxQuantity')}</Label>
                  <Input name="variantBoxQuantity" type="number" placeholder={t('boxQuantityPlaceholder')} />
                  <FieldError>{getError(`variants.${i}.boxQuantity`)}</FieldError>
                </TextField>
                <TextField
                  variant="primary"
                  isDisabled={isPending}
                  isRequired
                  isInvalid={!!getError(`variants.${i}.boxWeight`)}
                  value={formData.variants[i]?.boxWeight ?? ''}
                  onChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      variants: prev.variants.map((vr, idx) =>
                        idx === i ? { ...vr, boxWeight: v } : vr
                      ),
                    }))
                  }
                  validate={(v) => (!v?.trim() ? t('boxWeightRequired') : null)}
                >
                  <Label>{t('boxWeight')}</Label>
                  <Input name="variantBoxWeight" placeholder={t('boxWeightPlaceholder')} />
                  <FieldError>{getError(`variants.${i}.boxWeight`)}</FieldError>
                </TextField>
                <TextField
                  variant="primary"
                  isDisabled={isPending}
                  isInvalid={!!getError(`variants.${i}.height`)}
                  value={formData.variants[i]?.height ?? ''}
                  onChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      variants: prev.variants.map((vr, idx) =>
                        idx === i ? { ...vr, height: v } : vr
                      ),
                    }))
                  }
                >
                  <Label>{t('height')}</Label>
                  <Input name="variantHeight" placeholder={t('heightPlaceholder')} />
                  <FieldError>{getError(`variants.${i}.height`)}</FieldError>
                </TextField>
                <TextField
                  variant="primary"
                  isDisabled={isPending}
                  isInvalid={!!getError(`variants.${i}.width`)}
                  value={formData.variants[i]?.width ?? ''}
                  onChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      variants: prev.variants.map((vr, idx) =>
                        idx === i ? { ...vr, width: v } : vr
                      ),
                    }))
                  }
                >
                  <Label>{t('width')}</Label>
                  <Input name="variantWidth" placeholder={t('widthPlaceholder')} />
                  <FieldError>{getError(`variants.${i}.width`)}</FieldError>
                </TextField>
                <TextField
                  variant="primary"
                  isDisabled={isPending}
                  isInvalid={!!getError(`variants.${i}.length`)}
                  value={formData.variants[i]?.length ?? ''}
                  onChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      variants: prev.variants.map((vr, idx) =>
                        idx === i ? { ...vr, length: v } : vr
                      ),
                    }))
                  }
                >
                  <Label>{t('length')}</Label>
                  <Input name="variantLength" placeholder={t('lengthPlaceholder')} />
                  <FieldError>{getError(`variants.${i}.length`)}</FieldError>
                </TextField>
                <TextField
                  variant="primary"
                  isDisabled={isPending}
                  isInvalid={!!getError(`variants.${i}.netWeight`)}
                  value={formData.variants[i]?.netWeight ?? ''}
                  onChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      variants: prev.variants.map((vr, idx) =>
                        idx === i ? { ...vr, netWeight: v } : vr
                      ),
                    }))
                  }
                >
                  <Label>{t('netWeight')}</Label>
                  <Input name="variantNetWeight" placeholder={t('netWeightPlaceholder')} />
                  <FieldError>{getError(`variants.${i}.netWeight`)}</FieldError>
                </TextField>
                <TextField
                  variant="primary"
                  isDisabled={isPending}
                  isInvalid={!!getError(`variants.${i}.unitWeight`)}
                  value={formData.variants[i]?.unitWeight ?? ''}
                  onChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      variants: prev.variants.map((vr, idx) =>
                        idx === i ? { ...vr, unitWeight: v } : vr
                      ),
                    }))
                  }
                >
                  <Label>{t('unitWeight')}</Label>
                  <Input name="variantUnitWeight" placeholder={t('unitWeightPlaceholder')} />
                  <FieldError>{getError(`variants.${i}.unitWeight`)}</FieldError>
                </TextField>
              </div>
              {(() => {
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
                                  value={String(row.beginAmount)}
                                  onChange={(e) =>
                                    setTieredPriceRows((prev) => ({
                                      ...prev,
                                      [key]: (prev[key] ?? [{ beginAmount: 1, price: '' }]).map((r, idx) =>
                                        idx === rowIdx
                                          ? { ...r, beginAmount: Math.max(1, Number(e.target.value) || 1) }
                                          : r
                                      ),
                                    }))
                                  }
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
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onClose && (
          <Button type="button" variant="ghost" onPress={onClose}>
            {t('cancel')}
          </Button>
        )}
        <Button type="submit" variant="primary" isPending={isPending}>
          {isEdit ? t('updateProduct') : t('createProduct')}
        </Button>
      </div>
    </Form>
  );
}
