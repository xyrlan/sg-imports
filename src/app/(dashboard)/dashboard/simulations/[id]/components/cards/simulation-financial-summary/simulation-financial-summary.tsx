'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@heroui/react';
import { DollarSign, Package, Ship, Plane } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { computeFreightDisplayFromQuote } from '@/lib/simulation/freight-display';
import { FreightCapacityProgress } from '../../freight-capacity-progress';
import type {
  QuoteFinancialSummary,
  Simulation,
  SimulationItem,
} from '@/services/simulation.service';
import type { ShippingMetadata } from '@/db/types';
import { useTaxBreakdown } from './use-tax-breakdown';
import { FinancialSummaryItem } from './financial-summary-item';
import { TaxBreakdownSection } from './tax-breakdown-section';
import { CostBreakdownBar } from './cost-breakdown-bar';
import { LandedCostPerItemList } from './landed-cost-per-item-list';

interface SimulationFinancialSummaryProps {
  summary: QuoteFinancialSummary | null;
  items?: SimulationItem[];
  simulation?: Simulation;
}

export function SimulationFinancialSummary({
  summary,
  items = [],
  simulation,
}: SimulationFinancialSummaryProps) {
  const t = useTranslations('Simulations.FinancialSummary');
  const { taxBreakdown, hasTaxBreakdown } = useTaxBreakdown(items);

  const quote = simulation
    ? {
        totalCbm: simulation.totalCbm,
        totalWeight: simulation.totalWeight,
        totalChargeableWeight: simulation.totalChargeableWeight,
        shippingModality: simulation.shippingModality,
        metadata: simulation.metadata as ShippingMetadata | null,
      }
    : {
        totalCbm: null,
        totalWeight: null,
        totalChargeableWeight: null,
        shippingModality: null,
        metadata: null,
      };

  const {
    selectedModality,
    selectedEquipment,
    totalCbm,
    totalWeight,
    totalChargeableWeight,
    effectiveCapacity,
  } = computeFreightDisplayFromQuote(quote ?? { totalCbm: null, totalWeight: null });

  if (!summary) return null;

  const { totalFobUsd, totalFreightUsd, totalInsuranceUsd, totalTaxesBrl, totalLandedCostBrl } =
    summary;

  const formatUsd = (v: number) => formatCurrency(v, 'en-US', 'USD');
  const formatBrl = (v: number) => formatCurrency(v, 'pt-BR', 'BRL');

  const totalLogisticsUsd = totalFreightUsd + totalInsuranceUsd;
  const fobBrl = totalFobUsd * summary.effectiveDolar;
  const logisticsBrl = totalLogisticsUsd * summary.effectiveDolar;
  const totalBrl = totalLandedCostBrl;
  const productPct = totalBrl > 0 ? (fobBrl / totalBrl) * 100 : 0;
  const logisticsPct = totalBrl > 0 ? (logisticsBrl / totalBrl) * 100 : 0;
  const taxesPct = totalBrl > 0 ? (totalTaxesBrl / totalBrl) * 100 : 0;

  const FreightIcon =
    selectedModality === 'AIR' || selectedModality === 'EXPRESS' ? Plane : Ship;

  return (
    <div className="space-y-4">
      {simulation && (
        <Card>
          <FreightCapacityProgress
            modality={selectedModality}
            totalCbm={totalCbm}
            totalWeight={totalWeight}
            totalChargeableWeight={totalChargeableWeight}
            effectiveCapacity={effectiveCapacity}
            containerType={selectedEquipment?.type}
            containerQuantity={selectedEquipment?.quantity}
          />
        </Card>
      )}
      <Card>
        <Card.Header className="px-0 pt-0">
          <Card.Title className="flex items-center gap-2 text-lg">{t('title')}</Card.Title>
        </Card.Header>
        <Card.Content className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <FinancialSummaryItem
              icon={<Package className="size-5" />}
              label={t('totalFobUsd')}
              value={formatUsd(totalFobUsd)}
            />
            <FinancialSummaryItem
              icon={<FreightIcon className="size-5" />}
              label={t('totalFreightUsd')}
              value={formatUsd(totalFreightUsd)}
            />
            <TaxBreakdownSection
              totalTaxesBrl={totalTaxesBrl}
              taxBreakdown={taxBreakdown}
              hasTaxBreakdown={hasTaxBreakdown}
            />
            <FinancialSummaryItem
              icon={<DollarSign className="size-5" />}
              label={t('totalLandedCostBrl')}
              value={formatBrl(totalLandedCostBrl)}
            />
          </div>

          <CostBreakdownBar
            productPct={productPct}
            logisticsPct={logisticsPct}
            taxesPct={taxesPct}
          />

          <LandedCostPerItemList items={items} />
        </Card.Content>
      </Card>
    </div>
  );
}
