'use client';

import { useActionState } from 'react';
import { Card, Button } from '@heroui/react';
import { RATE_TYPES } from '../../constants';
import { updateAllPlatformRatesAction } from '../../actions';
import { PlatformRateFormRow } from './platform-rate-form';
import { FormError } from '@/components/ui/form-error';
import type { GlobalPlatformRate } from '@/services/admin';
import type { TranslateFn } from '../../constants';

interface PlatformRatesFormProps {
  platformRates: GlobalPlatformRate[];
  t: TranslateFn;
}

export function PlatformRatesForm({ platformRates, t }: PlatformRatesFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateAllPlatformRatesAction,
    null,
  );

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="font-semibold text-lg">{t('Taxes.platformRates')}</h3>
        <p className="text-sm text-muted mt-1">
          {t('Taxes.platformRatesDescription')}
        </p>
      </div>
      <form action={formAction} className="space-y-4">
        {state?.ok && (
          <p className="text-sm text-success">{t('Taxes.platformSaveSuccess')}</p>
        )}
        <div className="rounded-xl border border-default-200 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 gap-y-2 px-4 py-3 bg-default-100 border-b border-default-200 text-xs font-semibold tracking-wider text-muted">
            <span>{t('Taxes.rateTypeLabel')}</span>
            <span className="min-w-[140px]">{t('Taxes.value')}</span>
            <span className="min-w-[140px]">{t('Taxes.unit')}</span>
          </div>
          <div className="divide-y divide-default-100">
            {RATE_TYPES.map((rateType) => {
              const rate = platformRates.find((r) => r.rateType === rateType);
              return (
                <PlatformRateFormRow
                  key={rateType}
                  rateType={rateType}
                  rate={rate}
                  t={t}
                />
              );
            })}
          </div>
        </div>
        {state?.error && <FormError message={state.error} />}
        <Button type="submit" variant="primary" isPending={isPending}>
          {isPending ? t('Taxes.saving') : t('Taxes.save')}
        </Button>
      </form>
    </Card>
  );
}
