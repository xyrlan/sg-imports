'use client';

import { useActionState, useState, useMemo } from 'react';
import { Button, Card, Label, NumberField, Radio, RadioGroup } from '@heroui/react';
import { Search } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { updateStateIcmsAction } from '../actions';
import { STATE_REGIONS } from '../constants';
import type { StateIcmsRate } from '@/services/admin';
import type { TranslateFn } from '../constants';

interface StateIcmsFormProps {
  stateIcmsRates: StateIcmsRate[];
  t: TranslateFn;
}

function stateMatchesSearch(stateCode: string, search: string): boolean {
  const q = search.trim().toUpperCase();
  return !q || stateCode.includes(q);
}

export function StateIcmsForm({ stateIcmsRates, t }: StateIcmsFormProps) {
  const [state, formAction, isPending] = useActionState(updateStateIcmsAction, null);
  const [search, setSearch] = useState('');

  const initialDifalPerState = useMemo(() => {
    const map: Record<string, 'INSIDE' | 'OUTSIDE'> = {};
    for (const regionStates of Object.values(STATE_REGIONS)) {
      for (const stateCode of regionStates) {
        const inside = stateIcmsRates.find((r) => r.state === stateCode && r.difal === 'INSIDE');
        const outside = stateIcmsRates.find((r) => r.state === stateCode && r.difal === 'OUTSIDE');
        map[stateCode] = inside ? 'INSIDE' : outside ? 'OUTSIDE' : 'INSIDE';
      }
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
        <div className="mb-4 flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Taxes.searchByState')}
              aria-label={t('Taxes.searchByState')}
              className="w-full rounded-lg border border-default-200 bg-default-50 py-2 pl-9 pr-3 text-sm placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
            />
          </div>
        </div>
        {state?.ok && (
          <p className="mb-4 text-sm text-success">{t('Taxes.saveSuccess')}</p>
        )}
        <div className="overflow-x-auto">
          <div className="min-w-[520px] overflow-y-auto rounded-xl border border-default-200 overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-2 px-4 py-3 bg-default-100 sticky top-0 z-10 border-b border-default-200 text-xs font-semibold tracking-wider text-muted">
              <span className="min-w-10">{t('Taxes.state')}</span>
              <span>{t('Taxes.difal')}</span>
              <span>{t('Taxes.aliquota')}</span>
            </div>
            <div className="divide-y divide-default-100">
              {(Object.entries(STATE_REGIONS) as [keyof typeof STATE_REGIONS, readonly string[]][]).map(
                ([region, states]) => (
                  <div key={region}>
                    <div
                      className={`px-4 py-2 bg-default-50 text-xs font-medium text-muted border-b border-default-100 ${
                        states.every((s) => !stateMatchesSearch(s, search))
                          ? 'hidden'
                          : ''
                      }`}
                    >
                      {t(`Taxes.region.${region}`)}
                    </div>
                    {states.map((stateCode) => {
                      const difal = selectedDifal[stateCode] ?? 'INSIDE';
                      const isVisible = stateMatchesSearch(stateCode, search);
                      return (
                        <div
                          key={stateCode}
                          className={`grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-2 items-center px-4 py-3 transition-colors hover:bg-default-50 ${
                            !isVisible ? 'hidden' : ''
                          }`}
                        >
                        <span className="min-w-10 font-medium">{stateCode}</span>
                        <RadioGroup
                          name={`difal_${stateCode}`}
                          value={difal}
                          onChange={(v) => {
                            const val = v as 'INSIDE' | 'OUTSIDE';
                            if (val === 'INSIDE' || val === 'OUTSIDE') {
                              setSelectedDifal((prev) => ({
                                ...prev,
                                [stateCode]: val,
                              }));
                            }
                          }}
                          orientation="horizontal"
                          className="gap-4"
                        >
                          <Radio value="INSIDE">
                            <Radio.Control>
                              <Radio.Indicator />
                            </Radio.Control>
                            <Radio.Content>
                              <Label>{t('Taxes.inside')}</Label>
                            </Radio.Content>
                          </Radio>
                          <Radio value="OUTSIDE">
                            <Radio.Control>
                              <Radio.Indicator />
                            </Radio.Control>
                            <Radio.Content>
                              <Label>{t('Taxes.outside')}</Label>
                            </Radio.Content>
                          </Radio>
                        </RadioGroup>
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
              ))}
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
