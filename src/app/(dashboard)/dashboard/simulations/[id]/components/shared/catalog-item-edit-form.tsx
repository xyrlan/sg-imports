'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Description, FieldError, Input, Label, TextField } from '@heroui/react';

interface CatalogItemEditFormProps {
  initialQuantity: number;
  initialPriceUsd: string;
  unitsPerCarton: number;
  onSubmit: (quantity: number, priceUsd: string) => Promise<void>;
  formId: string;
  isSubmitting?: boolean;
}

export function CatalogItemEditForm({
  initialQuantity,
  initialPriceUsd,
  unitsPerCarton,
  onSubmit,
  formId,
  isSubmitting = false,
}: CatalogItemEditFormProps) {
  const t = useTranslations('Simulations.AddProduct');
  const tForm = useTranslations('Products.Form');
  const [quantity, setQuantity] = useState(String(initialQuantity));
  const [priceUsd, setPriceUsd] = useState(initialPriceUsd);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const price = priceUsd.trim() || '0';

    setQuantityError(null);
    setPriceError(null);

    const priceNum = parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      setPriceError(t('invalidPrice'));
      return;
    }

    if (qty % unitsPerCarton !== 0) {
      setQuantityError(t('quantityMustBeMultipleOf', { unitsPerCarton }));
      return;
    }

    await onSubmit(qty, price);
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <TextField
          variant="primary"
          isRequired
          value={quantity}
          onChange={(v) => {
            if (v === '' || /^\d+$/.test(v)) {
              setQuantity(v);
              setQuantityError(null);
            }
          }}
          isInvalid={!!quantityError}
        >
          <Label>{t('quantity')}</Label>
          <Input type="text" inputMode="numeric" placeholder={t('quantityPlaceholder')} />
          {quantityError ? <FieldError>{quantityError}</FieldError> : null}
          <Description>{t('quantityHint', { unitsPerCarton })}</Description>
        </TextField>
        <TextField
          variant="primary"
          isRequired
          value={priceUsd}
          onChange={(v) => {
            setPriceUsd(v);
            setPriceError(null);
          }}
          isInvalid={!!priceError}
        >
          <Label>{t('priceUsd')}</Label>
          <Input type="text" inputMode="decimal" placeholder={tForm('priceUsdPlaceholder')} />
          {priceError ? <FieldError>{priceError}</FieldError> : null}
        </TextField>
      </div>
    </form>
  );
}
