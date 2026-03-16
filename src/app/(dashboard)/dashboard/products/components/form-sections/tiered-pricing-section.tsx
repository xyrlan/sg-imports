'use client';

import { Button, Input, Label, TextField } from '@heroui/react';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import type { TieredPriceRow } from './product-form-types';

interface TieredPricingSectionProps {
  rows: TieredPriceRow[];
  onChange: (rows: TieredPriceRow[]) => void;
  isPending: boolean;
  t: (key: string) => string;
}

export function TieredPricingSection({ rows, onChange, isPending, t }: TieredPricingSectionProps) {
  return (
    <div>
      <p className="text-sm font-medium text-muted mb-2">{t('tieredPricing')}</p>
      <div className="space-y-2">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-2 items-center">
            <TextField variant="primary" isDisabled={isPending} className="flex-1">
              <Label className="sr-only">{t('minQty')}</Label>
              <Input type="number" min={1} placeholder={t('minQty')} value={row.beginAmount === 0 ? '' : String(row.beginAmount)} onChange={(e) => { const raw = e.target.value; const next = raw === '' ? 0 : Math.max(1, parseInt(raw, 10) || 1); onChange(rows.map((r, idx) => idx === rowIdx ? { ...r, beginAmount: next } : r)); }} />
            </TextField>
            <TextField variant="primary" isDisabled={isPending} className="flex-1">
              <Label className="sr-only">{t('priceUsdLabel')}</Label>
              <Input placeholder={t('priceUsdLabel')} value={row.price} onChange={(e) => onChange(rows.map((r, idx) => idx === rowIdx ? { ...r, price: e.target.value } : r))} />
            </TextField>
            {rows.length > 1 && (
              <Button type="button" variant="ghost" size="sm" onPress={() => onChange(rows.filter((_, idx) => idx !== rowIdx))} isDisabled={isPending}><Trash2Icon size={16} /></Button>
            )}
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" onPress={() => onChange([...rows, { beginAmount: 1, price: '' }])} isDisabled={isPending} className="inline-flex items-center gap-2"><PlusIcon size={14} />{t('addTier')}</Button>
      </div>
    </div>
  );
}
