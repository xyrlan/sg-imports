'use client';

import { useTranslations } from 'next-intl';

interface CostBreakdownBarProps {
  productPct: number;
  logisticsPct: number;
  taxesPct: number;
}

export function CostBreakdownBar({
  productPct,
  logisticsPct,
  taxesPct,
}: CostBreakdownBarProps) {
  const t = useTranslations('Simulations.FinancialSummary');

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t('breakdown')}</p>
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden flex">
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
          <span className="size-2 rounded-full bg-accent" />
          {t('productShare')} ({productPct.toFixed(1)}%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-blue-500" />
          {t('logisticsShare')} ({logisticsPct.toFixed(1)}%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-warning" />
          {t('taxesShare')} ({taxesPct.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}
