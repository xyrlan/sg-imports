'use client';

import { Button, FieldError, Input, Label, TextField } from '@heroui/react';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { LogisticsFields } from '@/components/ui/logistics-fields';
import type { TieredPriceRow, AttributePair, FormVariant } from './product-form-types';
import { defaultVariant } from './product-form-types';
import { TieredPricingSection } from './tiered-pricing-section';
import { AttributesSection } from './attributes-section';

interface VariantsSectionProps {
  formData: { variants: FormVariant[] };
  variantKeys: number[];
  tieredPriceRows: Record<number, TieredPriceRow[]>;
  setTieredPriceRows: React.Dispatch<React.SetStateAction<Record<number, TieredPriceRow[]>>>;
  attributePairs: Record<number, AttributePair[]>;
  setAttributePairs: React.Dispatch<React.SetStateAction<Record<number, AttributePair[]>>>;
  isPending: boolean;
  isSimulated: boolean;
  isEdit: boolean;
  getError: (path: string) => string | undefined;
  addVariant: () => void;
  removeVariant: (index: number) => void;
  updateVariant: (index: number, updates: Partial<FormVariant>) => void;
  onVariantLogisticsChange: (index: number, updates: Partial<FormVariant>) => void;
  t: (key: string) => string;
}

export function VariantsSection({
  formData, variantKeys, tieredPriceRows, setTieredPriceRows,
  attributePairs, setAttributePairs, isPending, isSimulated, isEdit,
  getError, addVariant, removeVariant, updateVariant, onVariantLogisticsChange, t,
}: VariantsSectionProps) {
  return (
    <div className="border-t border-divider pt-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-muted">{t('variantsLabel')}</p>
        {!isSimulated && (
          <Button type="button" variant="ghost" size="sm" onPress={addVariant} isDisabled={isPending} className="inline-flex items-center gap-2">
            <PlusIcon size={16} />{t('addVariant')}
          </Button>
        )}
      </div>
      <div className="space-y-4">
        {variantKeys.map((key, i) => {
          const variant = formData.variants[i] ?? defaultVariant();
          const tpRows = tieredPriceRows[key] ?? [{ beginAmount: 1, price: '' }];
          const attrRows = attributePairs[key] ?? [];
          const buildTieredPrice = () => {
            const valid = tpRows.filter((r) => r.price.trim() !== '').map((r) => ({ beginAmount: Math.max(1, r.beginAmount), price: r.price.trim() })).sort((a, b) => a.beginAmount - b.beginAmount);
            return valid.length > 0 ? valid : undefined;
          };
          const buildAttributes = () => {
            const obj: Record<string, string> = {};
            attrRows.forEach(({ key: k, value: v }) => { const norm = k.trim().toLowerCase().replace(/\s+/g, '_'); if (norm && v.trim()) obj[norm] = v.trim(); });
            return Object.keys(obj).length > 0 ? obj : undefined;
          };
          return (
            <div key={key} className="rounded-lg border border-divider p-3 space-y-3">
              {isEdit && <input type="hidden" name="variantId" value={variant.id ?? ''} />}
              <div className="flex items-end gap-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                  <TextField variant="primary" isDisabled={isPending} isRequired isInvalid={!!getError(`variants.${i}.sku`)} value={variant.sku ?? ''} onChange={(v) => updateVariant(i, { sku: v })} validate={(v) => (!v?.trim() ? t('skuRequired') : null)}>
                    <Label>{t('sku')}</Label>
                    <Input name="variantSku" placeholder={t('skuPlaceholder')} />
                    <FieldError>{getError(`variants.${i}.sku`)}</FieldError>
                  </TextField>
                  <TextField variant="primary" isDisabled={isPending} isRequired isInvalid={!!getError(`variants.${i}.name`)} value={variant.name ?? ''} onChange={(v) => updateVariant(i, { name: v })} validate={(v) => (!v?.trim() ? t('variantNameRequired') : null)}>
                    <Label>{t('variantName')}</Label>
                    <Input name="variantName" placeholder={t('variantNamePlaceholder')} />
                    <FieldError>{getError(`variants.${i}.name`)}</FieldError>
                  </TextField>
                  <TextField variant="primary" isDisabled={isPending} isRequired isInvalid={!!getError(`variants.${i}.priceUsd`)} value={variant.priceUsd ?? ''} onChange={(v) => updateVariant(i, { priceUsd: v })} validate={(v) => (!v?.trim() ? t('priceRequired') : null)}>
                    <Label>{t('priceUsd')}</Label>
                    <Input name="priceUsd" placeholder={t('priceUsdPlaceholder')} />
                    <FieldError>{getError(`variants.${i}.priceUsd`)}</FieldError>
                  </TextField>
                </div>
                {!isSimulated && variantKeys.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onPress={() => removeVariant(i)} isDisabled={isPending}><Trash2Icon size={18} /></Button>
                )}
              </div>
              <LogisticsFields variantData={variant} onChange={(updates) => onVariantLogisticsChange(i, updates)} isPending={isPending} t={t} variantIndex={i} getError={getError} />
              {!isSimulated && (
                <>
                  <input type="hidden" name="variantPackagingType" value={variant.packagingType ?? ''} />
                  <input type="hidden" name="variantTieredPriceInfo" value={JSON.stringify(buildTieredPrice() ?? [])} />
                  <input type="hidden" name="variantAttributes" value={JSON.stringify(buildAttributes() ?? {})} />
                  <div className="space-y-3">
                    <TieredPricingSection rows={tpRows} onChange={(rows) => setTieredPriceRows((prev) => ({ ...prev, [key]: rows }))} isPending={isPending} t={t} />
                    <AttributesSection rows={attrRows} onChange={(rows) => setAttributePairs((prev) => ({ ...prev, [key]: rows }))} isPending={isPending} t={t} />
                  </div>
                </>
              )}
              {isSimulated && (
                <>
                  <input type="hidden" name="variantTieredPriceInfo" value="[]" />
                  <input type="hidden" name="variantAttributes" value="{}" />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
