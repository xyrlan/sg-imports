'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Input, TextArea, TextField, Label } from '@heroui/react';
import type { ProductSnapshot } from '@/db/types';

interface SimulatedProductFormProps {
  onSubmit: (snapshot: ProductSnapshot, quantity: number, priceUsd: string) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
}

export function SimulatedProductForm({
  onSubmit,
  isSubmitting,
  submitLabel,
}: SimulatedProductFormProps) {
  const t = useTranslations('Simulations.SimulatedProduct');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [priceUsd, setPriceUsd] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [boxQuantity, setBoxQuantity] = useState(1);
  const [boxWeight, setBoxWeight] = useState('');
  const [hsCode, setHsCode] = useState('');
  const [description, setDescription] = useState('');
  const [supplierName, setSupplierName] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const snapshot: ProductSnapshot = {
      name: name.trim(),
      priceUsd: priceUsd.trim(),
      boxQuantity: Number(boxQuantity) || 1,
      boxWeight: Number(boxWeight) || 0,
      hsCode: hsCode.trim(),
    };
    if (sku.trim()) snapshot.sku = sku.trim();
    if (description.trim()) snapshot.description = description.trim();
    if (supplierName.trim()) snapshot.supplierName = supplierName.trim();

    await onSubmit(snapshot, quantity, priceUsd);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-4">
        <TextField variant="primary" value={name} onChange={(v) => setName(v)} isRequired>
          <Label>{t('name')}</Label>
          <Input placeholder={t('namePlaceholder')} />
        </TextField>
        <TextField variant="primary" value={sku} onChange={(v) => setSku(v)}>
          <Label>{t('sku')}</Label>
          <Input placeholder={t('skuPlaceholder')} />
        </TextField>
        <TextField variant="primary" value={description} onChange={(v) => setDescription(v)}>
          <Label>{t('description')}</Label>
          <TextArea placeholder={t('descriptionPlaceholder')} />
        </TextField>
        <TextField variant="primary" value={priceUsd} onChange={(v) => setPriceUsd(v)} isRequired>
          <Label>{t('priceUsd')}</Label>
          <Input placeholder="0.00" type="text" />
        </TextField>
        <TextField
          variant="primary"
          value={String(quantity)}
          onChange={(v) => setQuantity(Number(v) || 1)}
          isRequired
        >
          <Label>{t('quantity')}</Label>
          <Input type="number" min={1} />
        </TextField>
        <TextField
          variant="primary"
          value={String(boxQuantity)}
          onChange={(v) => setBoxQuantity(Number(v) || 1)}
        >
          <Label>{t('boxQuantity')}</Label>
          <Input type="number" min={1} />
        </TextField>
        <TextField variant="primary" value={boxWeight} onChange={(v) => setBoxWeight(v)}>
          <Label>{t('boxWeight')}</Label>
          <Input placeholder="0" type="text" />
        </TextField>
        <TextField variant="primary" value={hsCode} onChange={(v) => setHsCode(v)} isRequired>
          <Label>{t('hsCode')}</Label>
          <Input placeholder="8504.40.10" />
        </TextField>
        <TextField variant="primary" value={supplierName} onChange={(v) => setSupplierName(v)}>
          <Label>{t('supplierName')}</Label>
          <Input placeholder={t('supplierNamePlaceholder')} />
        </TextField>
      </div>
      <Button type="submit" variant="primary" isPending={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
