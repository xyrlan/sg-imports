'use client';

import { useTranslations } from 'next-intl';
import {
  Anchor,
  Building2,
  DollarSign,
  FileText,
  History,
  Landmark,
  Package,
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
  InternationalFreightWithPorts,
  PricingRuleWithRelations,
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
  InternationalFreightsSection,
  FreightTaxasSection,
  AuditLogSection,
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
  internationalFreights: InternationalFreightWithPorts[];
  pricingRules: PricingRuleWithRelations[];
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
  internationalFreights,
  pricingRules,
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
      key: 'international_freights' as const,
      label: t('internationalFreights'),
      icon: <Package size={16} />,
      description: t('internationalFreightsDescription'),
    },
    {
      key: 'freight_taxas' as const,
      label: t('freightTaxas'),
      icon: <FileText size={16} />,
      description: t('freightTaxasDescription'),
    },
    {
      key: 'impostos_taxas' as const,
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
      key: 'currency_exchange_brokers' as const,
      label: t('currencyExchangeBrokers'),
      icon: <Landmark size={16} />,
      description: t('currencyExchangeBrokersDescription'),
    },
    {
      key: 'audit_log' as const,
      label: t('auditLog'),
      icon: <History size={16} />,
      description: t('auditLogDescription'),
    },
  ];

  const sectionContent: Record<SectionKey, React.ReactNode> = {
    honorarios: <HonorariosSection honorarios={honorarios} />,
    international_freights: (
      <InternationalFreightsSection
        freights={internationalFreights}
        ports={ports}
      />
    ),
    freight_taxas: (
      <FreightTaxasSection
        pricingRules={pricingRules}
        ports={ports}
        carriers={carriers}
      />
    ),
    impostos_taxas:
      <ImpostosTaxasSection
        stateIcmsRates={stateIcmsRates}
        siscomexFee={siscomexFee}
        platformRates={platformRates}
      />,
    terminals: <TerminalsSection terminals={terminals} />,
    ports: <PortsSection ports={ports} />,
    carriers: <CarriersSection carriers={carriers} />,
    currency_exchange_brokers:
      <CurrencyExchangeBrokersSection brokers={currencyExchangeBrokers} />,
    audit_log: <AuditLogSection />,
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
  