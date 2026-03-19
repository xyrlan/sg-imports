'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@heroui/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatBrl } from '@/app/(admin)/admin/shipments/components/shipment-utils';
import type { SimulationItem } from '@/services/simulation.service';

interface LandedCostPerItemListProps {
  items: SimulationItem[];
}

function getItemDisplayName(item: SimulationItem, fallback: string): string {
  if (item.variant?.product?.name && item.variant?.name) {
    return `${item.variant.product.name} - ${item.variant.name}`;
  }
  return item.simulatedProductSnapshot?.name ?? fallback;
}

export function LandedCostPerItemList({ items }: LandedCostPerItemListProps) {
  const t = useTranslations('Simulations.FinancialSummary');
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-default-500">{t('landedCostPerItem')}</p>
        <Button
          variant="ghost"
          size="sm"
          onPress={() => setExpanded((v) => !v)}
          className="shrink-0 text-xs inline-flex items-center gap-1 min-w-0"
        >
          {expanded ? t('showLess') : t('showMore')}
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      </div>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="space-y-1 max-h-32 overflow-y-auto rounded-lg border border-default-200 p-2">
            {items.map((item) => {
              const name = getItemDisplayName(item, t('itemFallback'));
              const landedUnit = Number(
                (item as { landedCostUnitSnapshot?: string })?.landedCostUnitSnapshot ?? 0,
              );
              return (
                <div
                  key={item.id}
                  className="flex justify-between text-sm py-1 border-b border-default-200 last:border-0 last:pb-0"
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
      </div>
    </div>
  );
}
