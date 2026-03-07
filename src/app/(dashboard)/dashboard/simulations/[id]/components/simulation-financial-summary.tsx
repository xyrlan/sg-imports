'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@heroui/react';
import { DollarSign, Package, Truck, Receipt } from 'lucide-react';
import type { QuoteFinancialSummary } from '@/services/simulation.service';

interface SimulationFinancialSummaryProps {
  summary: QuoteFinancialSummary | null;
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

export function SimulationFinancialSummary({ summary }: SimulationFinancialSummaryProps) {
  const t = useTranslations('Simulations.FinancialSummary');

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
    <Card variant="default" className="p-6">
      <Card.Header className="px-0 pt-0">
        <Card.Title className="flex items-center gap-2 text-lg">
          <DollarSign className="size-5" />
          {t('title')}
        </Card.Title>
      </Card.Header>
      <Card.Content className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-default-200 p-3 flex items-center gap-3">
            <Package className="size-5 text-default-500" />
            <div>
              <p className="text-xs text-default-500">{t('totalFobUsd')}</p>
              <p className="font-medium">{formatUsd(totalFobUsd)}</p>
            </div>
          </div>
          <div className="rounded-lg border border-default-200 p-3 flex items-center gap-3">
            <Truck className="size-5 text-default-500" />
            <div>
              <p className="text-xs text-default-500">{t('totalFreightUsd')}</p>
              <p className="font-medium">{formatUsd(totalFreightUsd)}</p>
            </div>
          </div>
          <div className="rounded-lg border border-default-200 p-3 flex items-center gap-3">
            <Receipt className="size-5 text-default-500" />
            <div>
              <p className="text-xs text-default-500">{t('totalTaxesBrl')}</p>
              <p className="font-medium">{formatBrl(totalTaxesBrl)}</p>
            </div>
          </div>
          <div className="rounded-lg border border-default-200 p-3 flex items-center gap-3">
            <DollarSign className="size-5 text-default-500" />
            <div>
              <p className="text-xs text-default-500">{t('totalLandedCostBrl')}</p>
              <p className="font-medium">{formatBrl(totalLandedCostBrl)}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-default-600">{t('breakdown')}</p>
          <div className="h-3 w-full rounded-full bg-default-200 overflow-hidden flex">
            {productPct > 0 && (
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${productPct}%` }}
                title={`${t('productShare')}: ${productPct.toFixed(1)}%`}
              />
            )}
            {logisticsPct > 0 && (
              <div
                className="h-full bg-secondary transition-all"
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
          <div className="flex flex-wrap gap-4 text-xs text-default-500">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-primary" />
              {t('productShare')} ({productPct.toFixed(1)}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-secondary" />
              {t('logisticsShare')} ({logisticsPct.toFixed(1)}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-warning" />
              {t('taxesShare')} ({taxesPct.toFixed(1)}%)
            </span>
          </div>
        </div>
      </Card.Content>
    </Card>
  );
}
