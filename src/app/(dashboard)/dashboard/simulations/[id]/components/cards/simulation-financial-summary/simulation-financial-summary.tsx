'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@heroui/react';
import { DollarSign, Package, Ship, Plane, Shield } from 'lucide-react';
import { formatBrl, formatUsd } from '@/app/(admin)/admin/shipments/components/shipment-utils';
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

  const quote = useMemo(
    () =>
      simulation
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
          },
    [simulation],
  );

  const {
    selectedModality,
    selectedEquipment,
    totalCbm,
    totalWeight,
    totalChargeableWeight,
    effectiveCapacity,
  } = computeFreightDisplayFromQuote(quote ?? { totalCbm: null, totalWeight: null });

  const financialMetrics = useMemo(() => {
    if (!summary) return null;
    const {
      totalFobUsd,
      totalFreightUsd,
      totalInsuranceUsd,
      totalTaxesBrl,
      totalLandedCostBrl,
      effectiveDolar,
    } = summary;
    const totalLogisticsUsd = totalFreightUsd + totalInsuranceUsd;
    const fobBrl = totalFobUsd * effectiveDolar;
    const logisticsBrl = totalLogisticsUsd * effectiveDolar;
    const totalBrl = totalLandedCostBrl;
    return {
      productPct: totalBrl > 0 ? (fobBrl / totalBrl) * 100 : 0,
      logisticsPct: totalBrl > 0 ? (logisticsBrl / totalBrl) * 100 : 0,
      taxesPct: totalBrl > 0 ? (totalTaxesBrl / totalBrl) * 100 : 0,
    };
  }, [summary]);

  if (!summary) return null;

  const { totalFobUsd, totalFreightUsd, totalInsuranceUsd, totalTaxesBrl, totalLandedCostBrl } =
    summary;

  const productPct = financialMetrics?.productPct ?? 0;
  const logisticsPct = financialMetrics?.logisticsPct ?? 0;
  const taxesPct = financialMetrics?.taxesPct ?? 0;

  const FreightIcon =
    selectedModality === 'AIR' || selectedModality === 'EXPRESS' ? Plane : Ship;

  const metadata = (simulation?.metadata as ShippingMetadata | null) ?? {};
  const additionalFreightUsd = metadata.additionalFreightUsd ?? 0;
  const commissionPercent = metadata.commissionPercent ?? 0;
  const commissionUsd =
    commissionPercent > 0 ? totalFobUsd * (commissionPercent / 100) : 0;

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
          {/* Hero: Total Landed Cost highlighted */}
          <div className="rounded-lg border border-default-200 bg-default-50/50 dark:bg-default-100/5 p-4 flex items-center gap-3">
            <DollarSign className="size-8 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-default-500">{t('totalLandedCostBrl')}</p>
              <p className="text-2xl font-bold">{formatBrl(totalLandedCostBrl)}</p>
              <p className="text-xs text-default-500 mt-1">
                {t('effectiveDolarLabel', {
                  rate: formatBrl(summary.effectiveDolar),
                })}
              </p>
            </div>
          </div>

          {/* Breakdown bar - visual context for total */}
          <CostBreakdownBar
            productPct={productPct}
            logisticsPct={logisticsPct}
            taxesPct={taxesPct}
          />

          {/* Section: Costs in USD - 2 col grid, subtle USD zone styling */}
          <div className="pt-2 mt-2 border-t border-default-200">
            <p className="text-xs font-medium text-default-500 mb-2">{t('costsUsdSection')}</p>
            <div className="rounded-lg py-2 grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
              <FinancialSummaryItem
                icon={<Package className="size-5" />}
                label={t('totalFobUsd')}
                value={formatUsd(totalFobUsd)}
              />
              <FinancialSummaryItem
                icon={<FreightIcon className="size-5" />}
                label={t('totalFreightUsd')}
                value={formatUsd(totalFreightUsd)}
              >
                {totalFreightUsd === 0 &&
                  simulation &&
                  !(simulation.metadata as ShippingMetadata | null)?.isOverride && (
                    <p className="text-xs text-warning mt-1">{t('configureFreightHint')}</p>
                  )}
              </FinancialSummaryItem>
            </div>
            {(commissionPercent > 0 || additionalFreightUsd > 0) && (
              <div className="mt-3 pt-3 border-t border-default-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {commissionPercent > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-default-500">{t('commissionLabel')}</span>
                    <span className="font-mono">{formatUsd(commissionUsd)}</span>
                  </div>
                )}
                {additionalFreightUsd > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-default-500">{t('additionalFreightLabel')}</span>
                    <span className="font-mono">{formatUsd(additionalFreightUsd)}</span>
                  </div>
                )}
              </div>
            )}
            {totalInsuranceUsd > 0 && (
              <div className="mt-3">
                <FinancialSummaryItem
                  icon={<Shield className="size-5" />}
                  label={t('totalInsuranceUsd')}
                  value={formatUsd(totalInsuranceUsd)}
                />
              </div>
            )}
          </div>

          {/* Section: Taxes */}
          <div>
            <p className="text-xs font-medium text-default-500 mb-2">{t('taxesSection')}</p>
            <TaxBreakdownSection
              totalTaxesBrl={totalTaxesBrl}
              taxBreakdown={taxBreakdown}
              hasTaxBreakdown={hasTaxBreakdown}
            />
          </div>

          {/* Section: Per-item detail - collapsible */}
          <LandedCostPerItemList items={items} />
        </Card.Content>
      </Card>
    </div>
  );
}
