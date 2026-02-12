'use client';

import { useState } from 'react';
import { Label, Select, ListBox, NumberField, Card } from '@heroui/react';
import { RATE_TYPES } from '../constants';
import type { GlobalPlatformRate } from '@/services/admin';
import type { TranslateFn } from '../constants';

type UnitType = 'PERCENT' | 'FIXED_BRL' | 'FIXED_USD';

const FORMAT_BY_UNIT: Record<UnitType, Intl.NumberFormatOptions> = {
  PERCENT: { style: 'percent', maximumFractionDigits: 2, minimumFractionDigits: 0 },
  FIXED_BRL: { currency: 'BRL', style: 'currency' },
  FIXED_USD: { currency: 'USD', style: 'currency' },
};

function parseValue(value: string | null | undefined, unit: UnitType): number {
  const n = parseFloat(value ?? '0');
  if (Number.isNaN(n)) return 0;
  return unit === 'PERCENT' ? n / 100 : n;
}

interface PlatformRateFormRowProps {
  rateType: (typeof RATE_TYPES)[number];
  rate: GlobalPlatformRate | undefined;
  t: TranslateFn;
}

export function PlatformRateFormRow({ rateType, rate, t }: PlatformRateFormRowProps) {
  const labelKey = `Taxes.rateType.${rateType}`;
  const label = t(labelKey);
  const namePrefix = `rate_${rateType}`;

  const initialUnit = (rate?.unit ?? 'PERCENT') as UnitType;
  const [unit, setUnit] = useState<UnitType>(initialUnit);

  const formatOptions = FORMAT_BY_UNIT[unit];
  const defaultValue = parseValue(rate?.value, unit);

  return (
    <Card className="p-6">
      <Card.Header>
        <Card.Title className="font-semibold">{label}</Card.Title>
      </Card.Header>
      <Card.Content className='grid grid-cols-2 gap-4'>
      <NumberField
        key={`${rateType}-${unit}`}
        variant="primary"
        minValue={0}
        step={unit === 'PERCENT' ? 0.001 : 0.01}
        formatOptions={formatOptions}
        name={`${namePrefix}_value`}
        defaultValue={defaultValue}
        className="min-w-[200px] flex flex-col gap-2"
      >
        <Label>Value</Label>
        <NumberField.Group>
          <NumberField.DecrementButton />
          <NumberField.Input className="w-32" />
          <NumberField.IncrementButton />
        </NumberField.Group>
      </NumberField>
      <div className="flex flex-col gap-2">
        <Label>{t('Taxes.unit')}</Label>
        <Select
          name={`${namePrefix}_unit`}
          variant="primary"
          defaultValue={unit}
          value={unit}
          onChange={(key) => key != null && setUnit(key as UnitType)}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item key="PERCENT" id="PERCENT" textValue="Percentual">
                Percentual
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item key="FIXED_BRL" id="FIXED_BRL" textValue="Fixo (BRL)">
                Fixo (BRL)
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item key="FIXED_USD" id="FIXED_USD" textValue="Fixo (USD)">
                Fixo (USD)
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
      </Card.Content>
    </Card>
  );
}
