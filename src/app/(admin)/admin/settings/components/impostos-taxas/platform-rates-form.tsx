'use client';

import { useActionState, useEffect } from 'react';
import { Card, Button, toast } from '@heroui/react';
import { RATE_TYPES } from '../../constants';
import { updateAllPlatformRatesAction } from '../../actions';
import { PlatformRateFormRow } from './platform-rate-form';
import { SettingsSectionHeader } from '../_shared/settings-section-header';
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

  useEffect(() => {
    if (state?.ok) toast.success(t('Taxes.platformSaveSuccess'));
    if (state?.error) toast.danger(state.error);
  }, [state, t]);

  return (
    <Card className="space-y-6">
      <SettingsSectionHeader
        title={t('Taxes.platformRates')}
        description={t('Taxes.platformRatesDescription')}
      />
      <form action={formAction} className="space-y-4">
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
        <Button type="submit" variant="primary" isPending={isPending}>
          {isPending ? t('Taxes.saving') : t('Taxes.save')}
        </Button>
      </form>
    </Card>
  );
}
