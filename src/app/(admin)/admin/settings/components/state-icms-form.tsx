'use client';

import { useActionState, useState, useMemo } from 'react';
import { Button, Card, Select, ListBox, NumberField } from '@heroui/react';
import { FormError } from '@/components/ui/form-error';
import { updateStateIcmsAction } from '../actions';
import { BRAZILIAN_STATES } from '../constants';
import type { StateIcmsRate } from '@/services/admin';
import type { TranslateFn } from '../constants';

interface StateIcmsFormProps {
  stateIcmsRates: StateIcmsRate[];
  t: TranslateFn;
}

export function StateIcmsForm({ stateIcmsRates, t }: StateIcmsFormProps) {
  const [state, formAction, isPending] = useActionState(updateStateIcmsAction, null);

  const initialDifalPerState = useMemo(() => {
    const map: Record<string, 'INSIDE' | 'OUTSIDE'> = {};
    for (const stateCode of BRAZILIAN_STATES) {
      const inside = stateIcmsRates.find((r) => r.state === stateCode && r.difal === 'INSIDE');
      const outside = stateIcmsRates.find((r) => r.state === stateCode && r.difal === 'OUTSIDE');
      map[stateCode] = inside ? 'INSIDE' : outside ? 'OUTSIDE' : 'INSIDE';
    }
    return map;
  }, [stateIcmsRates]);

  const [selectedDifal, setSelectedDifal] = useState<Record<string, 'INSIDE' | 'OUTSIDE'>>(
    initialDifalPerState,
  );

  const getIcmsRateValue = (stateCode: string, difal: 'INSIDE' | 'OUTSIDE'): number => {
    const rateStr =
      stateIcmsRates.find((r) => r.state === stateCode && r.difal === difal)?.icmsRate ?? '0';
    const parsed = parseFloat(rateStr);
    if (Number.isNaN(parsed)) return 0;
    // DB stores 18 for 18%; NumberField percent uses 0-1 (0.18 = 18%)
    return parsed <= 1 ? parsed : parsed / 100;
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="font-semibold text-lg">{t('Taxes.stateIcms')}</h3>
        <p className="text-sm text-muted mt-1">{t('Taxes.stateIcmsDescription')}</p>
      </div>
      <form action={formAction}>
        <div className="overflow-x-auto">
          <div className="min-w-[520px]overflow-y-auto rounded-xl border ">
            <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-2 p-4 bg-accent-foreground sticky top-0 z-10 border-b text-sm font-medium text-muted">
              <span className="min-w-10">{t('Taxes.state')}</span>
              <span>{t('Taxes.difal')}</span>
              <span>{t('Taxes.aliquota')}</span>
            </div>
            <div className="divide-y divide-default-100">
              {BRAZILIAN_STATES.map((stateCode) => {
                const difal = selectedDifal[stateCode] ?? 'INSIDE';
                return (
                  <div
                    key={stateCode}
                    className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-2 items-center p-3 transition-colors"
                  >
                    <span className="min-w-10 font-medium">{stateCode}</span>
                    <Select
                      name={`difal_${stateCode}`}
                      variant="primary"
                      defaultValue={difal}
                      onChange={(key) => {
                        if (key != null) {
                          setSelectedDifal((prev) => ({
                            ...prev,
                            [stateCode]: key as 'INSIDE' | 'OUTSIDE',
                          }));
                        }
                      }}
                      aria-label={t('Taxes.difal')}
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item key="INSIDE" id="INSIDE" textValue={t('Taxes.inside')}>
                            {t('Taxes.inside')}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item key="OUTSIDE" id="OUTSIDE" textValue={t('Taxes.outside')}>
                            {t('Taxes.outside')}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    <NumberField
                      key={`icms-${stateCode}-${difal}`}
                      name={`icms_${stateCode}_${difal}`}
                      variant="primary"
                      formatOptions={{
                        style: 'percent',
                        maximumFractionDigits: 1,
                        minimumFractionDigits: 1,
                      }}
                      defaultValue={getIcmsRateValue(stateCode, difal)}
                    >
                      <NumberField.Group>
                        <NumberField.DecrementButton />
                        <NumberField.Input className="w-24" />
                        <NumberField.IncrementButton />
                      </NumberField.Group>
                    </NumberField>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {state?.error && <FormError message={state.error} />}
        <Button type="submit" variant="primary" className="mt-4" isPending={isPending}>
          {isPending ? t('Taxes.saving') : t('Taxes.saveIcms')}
        </Button>
      </form>
    </Card>
  );
}
