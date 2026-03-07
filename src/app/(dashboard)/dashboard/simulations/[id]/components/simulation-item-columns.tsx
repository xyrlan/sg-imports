'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { Button } from '@heroui/react';
import { Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { SimulationItem } from '@/services/simulation.service';

const columnHelper = createColumnHelper<SimulationItem>();

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

interface SimulationItemColumnsActions {
  onRemove: (item: SimulationItem) => void;
}

export function getSimulationItemColumns(
  t: ReturnType<typeof import('next-intl').useTranslations<'Simulations.Detail'>>,
  actions: SimulationItemColumnsActions
) {
  return [
    columnHelper.accessor((row) => getItemDisplayName(row), {
      id: 'itemName',
      header: t('itemName'),
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor((row) => getItemSku(row), {
      id: 'itemSku',
      header: t('itemSku'),
      cell: (info) => (
        <span className="font-mono text-sm">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('quantity', {
      header: t('itemQuantity'),
      cell: (info) => (
        <span className="block text-right">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor((row) => String(row.priceUsd ?? '0'), {
      id: 'price',
      header: t('itemPrice'),
      cell: (info) => (
        <span className="block text-right">
          {formatCurrency(info.getValue(), 'en-US', 'USD')}
        </span>
      ),
    }),
    columnHelper.accessor(
      (row) => (Number(row.priceUsd ?? 0) * row.quantity).toFixed(2),
      {
        id: 'total',
        header: t('itemTotal'),
        cell: (info) => (
          <span className="block text-right font-medium">
            {formatCurrency(info.getValue(), 'en-US', 'USD')}
          </span>
        ),
      }
    ),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <Button
          variant="ghost"
          size="sm"
          isIconOnly
          aria-label={t('removeItem')}
          onPress={() => actions.onRemove(info.row.original)}
        >
          <Trash2 className="size-4 text-danger" />
        </Button>
      ),
      size: 50,
    }),
  ];
}
