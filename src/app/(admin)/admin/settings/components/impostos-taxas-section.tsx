'use client';

import { useTranslations } from 'next-intl';
import { Tabs } from '@heroui/react';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { TAX_TAB_KEYS } from '../constants';
import type { StateIcmsRate, SiscomexFeeConfig, GlobalPlatformRate } from '@/services/admin';
import { StateIcmsForm } from './state-icms-form';
import { SiscomexForm } from './siscomex-form';
import { PlatformRatesForm } from './platform-rates-form';

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
        <PlatformRatesForm platformRates={platformRates} t={translate} />
      </Tabs.Panel>
    </Tabs>
  );
}
