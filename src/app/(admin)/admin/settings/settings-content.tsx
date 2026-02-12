'use client';

import { useTranslations } from 'next-intl';
import { DollarSign, Receipt, Terminal as TerminalIcon } from 'lucide-react';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import type { GlobalServiceFeeConfig, StateIcmsRate, SiscomexFeeConfig, GlobalPlatformRate, Terminal } from '@/services/admin';
import { SECTION_KEYS, type SectionKey } from './constants';
import {
  SettingsSidebar,
  HonorariosSection,
  ImpostosTaxasSection,
  TerminalsSection,
} from './components';

interface SettingsContentProps {
  honorarios: GlobalServiceFeeConfig | null;
  stateIcmsRates: StateIcmsRate[];
  siscomexFee: SiscomexFeeConfig | null;
  platformRates: GlobalPlatformRate[];
  terminals: Terminal[];
}

export function SettingsContent({
  honorarios,
  stateIcmsRates,
  siscomexFee,
  platformRates,
  terminals,
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
      icon: <TerminalIcon size={16} />,
      description: t('terminalsDescription'),
    },
  ];
  

  const sectionContent: Record<SectionKey, React.ReactNode> = {
    'honorarios': <HonorariosSection honorarios={honorarios} />,
    'impostos-taxas': 
      <ImpostosTaxasSection
        stateIcmsRates={stateIcmsRates}
        siscomexFee={siscomexFee}
        platformRates={platformRates}
      />,
    'terminals': <TerminalsSection terminals={terminals} />,
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
  