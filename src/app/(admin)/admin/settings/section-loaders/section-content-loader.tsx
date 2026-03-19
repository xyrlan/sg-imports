import type { SectionKey } from '../constants';
import { HonorariosLoader } from './honorarios-loader';
import { ImpostosLoader } from './impostos-loader';
import { InternationalFreightsLoader } from './international-freights-loader';
import { FreightTaxasLoader } from './freight-taxas-loader';
import { TerminalsLoader } from './terminals-loader';
import { PortsLoader } from './ports-loader';
import { SuppliersLoader } from './suppliers-loader';
import { CarriersLoader } from './carriers-loader';
import { CurrencyBrokersLoader } from './currency-brokers-loader';
import { AuditLoader } from './audit-loader';

interface SectionContentLoaderProps {
  sectionKey: SectionKey;
  organizationId?: string;
  supplierId?: string;
}

export async function SectionContentLoader({
  sectionKey,
  organizationId = '',
  supplierId = '',
}: SectionContentLoaderProps) {
  switch (sectionKey) {
    case 'honorarios':
      return <HonorariosLoader />;
    case 'impostos_taxas':
      return <ImpostosLoader />;
    case 'international_freights':
      return <InternationalFreightsLoader />;
    case 'freight_taxas':
      return <FreightTaxasLoader />;
    case 'terminals':
      return <TerminalsLoader />;
    case 'ports':
      return <PortsLoader />;
    case 'suppliers':
      return <SuppliersLoader supplierId={supplierId} />;
    case 'carriers':
      return <CarriersLoader />;
    case 'currency_exchange_brokers':
      return <CurrencyBrokersLoader />;
    case 'audit_log':
      return <AuditLoader />;
    default:
      return <HonorariosLoader />;
  }
}
