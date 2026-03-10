'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@heroui/react';
import { DollarSign, Package, Truck, Receipt } from 'lucide-react';
import { computeFreightDisplayFromQuote } from '@/lib/simulation/freight-display';
import { FreightCapacityProgress } from '../freight-capacity-progress';
import type {
  QuoteFinancialSummary,
  Simulation,
  SimulationItem,
} from '@/services/simulation.service';
import type { ShippingMetadata } from '@/db/types';

interface SimulationFinancialSummaryProps {
  summary: QuoteFinancialSummary | null;
  items?: SimulationItem[];
  simulation?: Simulation;
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function SimulationFinancialSummary({
  summary,
  items = [],
  simulation,
}: SimulationFinancialSummaryProps) {
  const t = useTranslations('Simulations.FinancialSummary');

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

  if (!summary) {
    return null;
  }

  const { totalFobUsd, totalFreightUsd, totalInsuranceUsd, totalTaxesBrl, totalLandedCostBrl } =
    summary;

  const totalLogisticsUsd = totalFreightUsd + totalInsuranceUsd;
  const fobBrl = totalFobUsd * summary.effectiveDolar;
  const logisticsBrl = totalLogisticsUsd * summary.effectiveDolar;

  const totalBrl = totalLandedCostBrl;
  const productPct = totalBrl > 0 ? (fobBrl / totalBrl) * 100 : 0;
  const logisticsPct = totalBrl > 0 ? (logisticsBrl / totalBrl) * 100 : 0;
  const taxesPct = totalBrl > 0 ? (totalTaxesBrl / totalBrl) * 100 : 0;

  return (
    <Card className="p-6">
      <Card.Header className="px-0 pt-0">
        <Card.Title className="flex items-center gap-2 text-lg">
          {t('title')}
        </Card.Title>
      </Card.Header>
      <Card.Content className="space-y-4">
        {simulation && (
          <FreightCapacityProgress
            modality={selectedModality}
            totalCbm={totalCbm}
            totalWeight={totalWeight}
            totalChargeableWeight={totalChargeableWeight}
            effectiveCapacity={effectiveCapacity}
            containerType={selectedEquipment?.type}
            containerQuantity={selectedEquipment?.quantity}
          />
        )}
        <div className="grid grid-cols-1  gap-4">
          <div className="rounded-lg border p-3 flex items-center gap-3">
            <Package className="size-5" />
            <div>
              <p className="text-xs">{t('totalFobUsd')}</p>
              <p className="font-medium">{formatUsd(totalFobUsd)}</p>
            </div>
          </div>
          <div className="rounded-lg border p-3 flex items-center gap-3">
            <Truck className="size-5" />
            <div>
              <p className="text-xs">{t('totalFreightUsd')}</p>
              <p className="font-medium">{formatUsd(totalFreightUsd)}</p>
            </div>
          </div>
          <div className="rounded-lg border p-3 flex items-center gap-3">
            <Receipt className="size-5" />
            <div>
              <p className="text-xs">{t('totalTaxesBrl')}</p>
              <p className="font-medium">{formatBrl(totalTaxesBrl)}</p>
            </div>
          </div>
          <div className="rounded-lg border p-3 flex items-center gap-3">
            <DollarSign className="size-5" />
            <div>
              <p className="text-xs">{t('totalLandedCostBrl')}</p>
              <p className="font-medium">{formatBrl(totalLandedCostBrl)}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t('breakdown')}</p>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
            {productPct > 0 && (
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${productPct}%` }}
                title={`${t('productShare')}: ${productPct.toFixed(1)}%`}
              />
            )}
            {logisticsPct > 0 && (
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${logisticsPct}%` }}
                title={`${t('logisticsShare')}: ${logisticsPct.toFixed(1)}%`}
              />
            )}
            {taxesPct > 0 && (
              <div
                className="h-full bg-warning transition-all"
                style={{ width: `${taxesPct}%` }}
                title={`${t('taxesShare')}: ${taxesPct.toFixed(1)}%`}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-accent" />
              {t('productShare')} ({productPct.toFixed(1)}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-blue-500" />
              {t('logisticsShare')} ({logisticsPct.toFixed(1)}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-warning" />
              {t('taxesShare')} ({taxesPct.toFixed(1)}%)
            </span>
          </div>
        </div>
        {items.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('landedCostPerItem')}</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {items.map((item) => {
                const name =
                  item.variant?.product?.name && item.variant?.name
                    ? `${item.variant.product.name} - ${item.variant.name}`
                    : item.simulatedProductSnapshot?.name ?? 'Item';
                const landedUnit = Number(
                  (item as { landedCostUnitSnapshot?: string })?.landedCostUnitSnapshot ?? 0,
                );
                return (
                  <div
                    key={item.id}
                    className="flex justify-between text-sm py-1 border-b last:border-0"
                  >
                    <span className="truncate max-w-[180px]" title={name}>
                      {name}
                    </span>
                    <span className="font-mono shrink-0">{formatBrl(landedUnit)}/un</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
