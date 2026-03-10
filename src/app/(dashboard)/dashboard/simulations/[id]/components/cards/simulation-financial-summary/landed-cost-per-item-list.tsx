'use client';

import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/utils';
import type { SimulationItem } from '@/services/simulation.service';

interface LandedCostPerItemListProps {
  items: SimulationItem[];
}

function getItemDisplayName(item: SimulationItem): string {
  if (item.variant?.product?.name && item.variant?.name) {
    return `${item.variant.product.name} - ${item.variant.name}`;
  }
  return item.simulatedProductSnapshot?.name ?? 'Item';
}

export function LandedCostPerItemList({ items }: LandedCostPerItemListProps) {
  const t = useTranslations('Simulations.FinancialSummary');

  if (items.length === 0) return null;

  const formatBrl = (value: number) => formatCurrency(value, 'pt-BR', 'BRL');

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t('landedCostPerItem')}</p>
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {items.map((item) => {
          const name = getItemDisplayName(item);
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
  );
}
