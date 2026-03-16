'use client';

import { Button, Input, Label, TextField } from '@heroui/react';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import type { AttributePair } from './product-form-types';

interface AttributesSectionProps {
  rows: AttributePair[];
  onChange: (rows: AttributePair[]) => void;
  isPending: boolean;
  t: (key: string) => string;
}

export function AttributesSection({ rows, onChange, isPending, t }: AttributesSectionProps) {
  return (
    <div>
      <p className="text-sm font-medium text-muted mb-2">{t('attributes')}</p>
      <div className="space-y-2">
        {rows.map((pair, pairIdx) => (
          <div key={pairIdx} className="flex gap-2 items-center">
            <TextField variant="primary" isDisabled={isPending} className="flex-1">
              <Label className="sr-only">{t('attrKeyPlaceholder')}</Label>
              <Input placeholder={t('attrKeyPlaceholder')} value={pair.key} onChange={(e) => onChange(rows.map((p, idx) => idx === pairIdx ? { ...p, key: e.target.value } : p))} />
            </TextField>
            <TextField variant="primary" isDisabled={isPending} className="flex-1">
              <Label className="sr-only">{t('attrValuePlaceholder')}</Label>
              <Input placeholder={t('attrValuePlaceholder')} value={pair.value} onChange={(e) => onChange(rows.map((p, idx) => idx === pairIdx ? { ...p, value: e.target.value } : p))} />
            </TextField>
            <Button type="button" variant="ghost" size="sm" onPress={() => onChange(rows.filter((_, idx) => idx !== pairIdx))} isDisabled={isPending}><Trash2Icon size={16} /></Button>
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" onPress={() => onChange([...rows, { key: '', value: '' }])} isDisabled={isPending} className="inline-flex items-center gap-2"><PlusIcon size={14} />{t('addAttribute')}</Button>
      </div>
    </div>
  );
}
