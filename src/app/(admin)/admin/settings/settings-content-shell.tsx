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
  Truck,
} from 'lucide-react';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { SECTION_KEYS } from './constants';
import { SettingsSidebar } from './components';

interface SettingsContentShellProps {
  children: React.ReactNode;
}

export function SettingsContentShell({ children }: SettingsContentShellProps) {
  const t = useTranslations('Admin.Settings');
  const [activeSection, setActiveSection] = useQueryState(
    'activeSection',
    parseAsStringLiteral(SECTION_KEYS).withDefault('honorarios').withOptions({
      shallow: false,
    }),
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
      key: 'suppliers' as const,
      label: t('suppliers'),
      icon: <Truck size={16} />,
      description: t('suppliersDescription'),
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

  return (
    <div className="flex min-h-[700px] gap-4">
      <SettingsSidebar
        sections={sections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
