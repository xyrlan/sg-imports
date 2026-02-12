'use client';

import { useTranslations } from 'next-intl';
import { Tabs, Card, Button } from '@heroui/react';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { RATE_TYPES, TAX_TAB_KEYS } from '../constants';
import type { StateIcmsRate, SiscomexFeeConfig, GlobalPlatformRate } from '@/services/admin';
import { updateAllPlatformRatesAction } from '../actions';
import { StateIcmsForm } from './state-icms-form';
import { SiscomexForm } from './siscomex-form';
import { PlatformRateFormRow } from './platform-rate-form';
import { FormError } from '@/components/ui/form-error';
import { useActionState } from 'react';

interface ImpostosTaxasSectionProps {
  stateIcmsRates: StateIcmsRate[];
  siscomexFee: SiscomexFeeConfig | null;
  platformRates: GlobalPlatformRate[];
}

export function ImpostosTaxasSection({
  stateIcmsRates,
  siscomexFee,
  platformRates,
}: ImpostosTaxasSectionProps) {
  const t = useTranslations('Admin.Settings');
  const translate = (key: string) => t(key);

  const [taxTab, setTaxTab] = useQueryState(
    'taxTab',
    parseAsStringLiteral(TAX_TAB_KEYS).withDefault('icms'),
  );

  const [platformState, platformAction, isPlatformPending] = useActionState(
    updateAllPlatformRatesAction,
    null,
  );

  return (
    <Tabs
      selectedKey={taxTab}
      onSelectionChange={(key) => setTaxTab(key as (typeof TAX_TAB_KEYS)[number])}
      variant="primary"
    >
      <Tabs.ListContainer>
        <Tabs.List aria-label={t('Taxes.title')} className="w-full">
          <Tabs.Tab id="icms">
            {t('Taxes.stateIcms')}
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab id="siscomex">
            {t('Taxes.siscomexFee')}
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab id="platform">
            {t('Taxes.platformRates')}
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>

      <Tabs.Panel id="icms" className="pt-6">
        <StateIcmsForm stateIcmsRates={stateIcmsRates} t={translate} />
      </Tabs.Panel>

      <Tabs.Panel id="siscomex" className="pt-6">
        <SiscomexForm siscomexFee={siscomexFee} t={translate} />
      </Tabs.Panel>

      <Tabs.Panel id="platform" className="pt-6">
        <Card className="p-6">
          <h3 className="font-semibold mb-2">{t('Taxes.platformRates')}</h3>
          <form action={platformAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
            {RATE_TYPES.map((rateType) => {
              const rate = platformRates.find((r) => r.rateType === rateType);
              return (
                <PlatformRateFormRow
                  key={rateType}
                  rateType={rateType}
                  rate={rate}
                  t={translate}
                />
              );
            })}
            </div>
            {platformState?.error && (
              <FormError message={platformState.error} />
            )}
            <Button
              type="submit"
              variant="primary"
              isPending={isPlatformPending}
            >
              {isPlatformPending ? t('Taxes.saving') : t('Taxes.save')}
            </Button>
          </form>
        </Card>
      </Tabs.Panel>
    </Tabs>
  );
}
