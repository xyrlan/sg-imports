'use client';

import { useTranslations } from 'next-intl';
import {
  Anchor,
  Building2,
  DollarSign,
  Landmark,
  Receipt,
  Ship,
} from 'lucide-react';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import type {
  GlobalServiceFeeConfig,
  StateIcmsRate,
  SiscomexFeeConfig,
  GlobalPlatformRate,
  Terminal,
  Port,
  Carrier,
  CurrencyExchangeBroker,
} from '@/services/admin';
import { SECTION_KEYS, type SectionKey } from './constants';
import {
  SettingsSidebar,
  HonorariosSection,
  ImpostosTaxasSection,
  TerminalsSection,
  PortsSection,
  CarriersSection,
  CurrencyExchangeBrokersSection,
} from './components';

interface SettingsContentProps {
  honorarios: GlobalServiceFeeConfig | null;
  stateIcmsRates: StateIcmsRate[];
  siscomexFee: SiscomexFeeConfig | null;
  platformRates: GlobalPlatformRate[];
  terminals: Terminal[];
  ports: Port[];
  carriers: Carrier[];
  currencyExchangeBrokers: CurrencyExchangeBroker[];
}

export function SettingsContent({
  honorarios,
  stateIcmsRates,
  siscomexFee,
  platformRates,
  terminals,
  ports,
  carriers,
  currencyExchangeBrokers,
}: SettingsContentProps) {
  const t = useTranslations('Admin.Settings');
  const [activeSection, setActiveSection] = useQueryState(
    'activeSection',
    parseAsStringLiteral(SECTION_KEYS).withDefault('honorarios'),
  );

  const sections = [
    {
      key: 'honorarios' as const,
      label: t('honorarios'),
      icon: <DollarSign size={16} />,
      description: t('honorariosDescription'),
    },
    {
      key: 'impostos-taxas' as const,
      label: t('taxes'),
      icon: <Receipt size={16} />,
      description: t('taxesDescription'),
    },
    {
      key: 'terminals' as const,
      label: t('terminals'),
      icon: <Building2 size={16} />,
      description: t('terminalsDescription'),
    },
    {
      key: 'ports' as const,
      label: t('ports'),
      icon: <Anchor size={16} />,
      description: t('portsDescription'),
    },
    {
      key: 'carriers' as const,
      label: t('carriers'),
      icon: <Ship size={16} />,
      description: t('carriersDescription'),
    },
    {
      key: 'currency-exchange-brokers' as const,
      label: t('currencyExchangeBrokers'),
      icon: <Landmark size={16} />,
      description: t('currencyExchangeBrokersDescription'),
    },
  ];

  const sectionContent: Record<SectionKey, React.ReactNode> = {
    honorarios: <HonorariosSection honorarios={honorarios} />,
    'impostos-taxas': (
      <ImpostosTaxasSection
        stateIcmsRates={stateIcmsRates}
        siscomexFee={siscomexFee}
        platformRates={platformRates}
      />
    ),
    terminals: <TerminalsSection terminals={terminals} />,
    ports: <PortsSection ports={ports} />,
    carriers: <CarriersSection carriers={carriers} />,
    'currency-exchange-brokers': (
      <CurrencyExchangeBrokersSection brokers={currencyExchangeBrokers} />
    ),
  };

  return (
      <div className="flex min-h-[700px] gap-4">
        <SettingsSidebar
          sections={sections}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <div className="flex-1 min-w-0">{sectionContent[activeSection]}</div>
      </div>
  );
}
  