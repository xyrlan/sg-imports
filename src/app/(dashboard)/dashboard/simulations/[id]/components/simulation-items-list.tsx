'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@heroui/react';
import { Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { removeSimulationItemAction } from '../../actions';
import type { SimulationItem } from '@/services/simulation.service';

interface SimulationItemsListProps {
  items: SimulationItem[];
  organizationId: string;
  onMutate?: () => void;
}

function getItemDisplayName(item: SimulationItem): string {
  if (item.variant) {
    const productName = item.variant.product?.name ?? '';
    const variantName = item.variant.name ?? '';
    return productName ? `${productName} - ${variantName}` : variantName || '—';
  }
  if (item.simulatedProductSnapshot) {
    return item.simulatedProductSnapshot.name;
  }
  return '—';
}

function getItemSku(item: SimulationItem): string {
  if (item.variant) {
    return item.variant.sku ?? '—';
  }
  if (item.simulatedProductSnapshot?.sku) {
    return item.simulatedProductSnapshot.sku;
  }
  return '—';
}

export function SimulationItemsList({
  items,
  organizationId,
  onMutate,
}: SimulationItemsListProps) {
  const t = useTranslations('Simulations.Detail');

  async function handleRemove(itemId: string) {
    const result = await removeSimulationItemAction(itemId, organizationId);
    if (result.success) {
      onMutate?.();
    } else if (result.error) {
      alert(result.error);
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="text-left p-3 font-medium">{t('itemName')}</th>
            <th className="text-left p-3 font-medium">{t('itemSku')}</th>
            <th className="text-right p-3 font-medium">{t('itemQuantity')}</th>
            <th className="text-right p-3 font-medium">{t('itemPrice')}</th>
            <th className="text-right p-3 font-medium">{t('itemTotal')}</th>
            <th className="w-12 p-3" />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const qty = item.quantity;
            const price = String(item.priceUsd ?? '0');
            const total = (Number(price) * qty).toFixed(2);
            return (
              <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="p-3">{getItemDisplayName(item)}</td>
                <td className="p-3 font-mono text-sm">{getItemSku(item)}</td>
                <td className="p-3 text-right">{qty}</td>
                <td className="p-3 text-right">{formatCurrency(price, 'en-US', 'USD')}</td>
                <td className="p-3 text-right font-medium">{formatCurrency(total, 'en-US', 'USD')}</td>
                <td className="p-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    aria-label={t('removeItem')}
                    onPress={() => handleRemove(item.id)}
                  >
                    <Trash2 className="size-4 text-danger" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
