'use client';

import { useState } from 'react';
import { Select, ListBox, NumberField } from '@heroui/react';
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
  rateType: string;
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
    <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-2 items-center px-4 py-3 transition-colors hover:bg-default-50">
      <span className="font-medium">{label}</span>
      <div className="min-w-[140px]">
        <NumberField
          key={`${rateType}-${unit}`}
          variant="primary"
          minValue={0}
          step={unit === 'PERCENT' ? 0.001 : 0.01}
          formatOptions={formatOptions}
          name={`${namePrefix}_value`}
          defaultValue={defaultValue}
        >
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input className="w-28" />
            <NumberField.IncrementButton />
          </NumberField.Group>
        </NumberField>
      </div>
      <div className="min-w-[140px]">
        <Select
          name={`${namePrefix}_unit`}
          variant="primary"
          defaultValue={unit}
          value={unit}
          onChange={(key) => key != null && setUnit(key as UnitType)}
          aria-label={t('Taxes.unit')}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item key="PERCENT" id="PERCENT" textValue={t('Taxes.unitPercent')}>
                {t('Taxes.unitPercent')}
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item key="FIXED_BRL" id="FIXED_BRL" textValue={t('Taxes.unitFixedBrl')}>
                {t('Taxes.unitFixedBrl')}
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item key="FIXED_USD" id="FIXED_USD" textValue={t('Taxes.unitFixedUsd')}>
                {t('Taxes.unitFixedUsd')}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
    </div>
  );
}
