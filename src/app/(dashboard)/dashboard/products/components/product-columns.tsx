'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { formatCurrency } from '@/lib/utils';
import type { ProductWithVariants } from '@/services/product.service';

const columnHelper = createColumnHelper<ProductWithVariants>();

export function getProductColumns() {
  return [
    columnHelper.accessor((row) => {
      const variants = row.variants ?? [];
      if (variants.length === 0) return '—';
      if (variants.length === 1) return variants[0].sku;
      return `${variants[0].sku} (+${variants.length - 1})`;
    }, {
      id: 'sku',
      header: 'SKU',
      cell: (info) => (
        <span className="font-mono text-sm">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('name', {
      header: 'Name',
      cell: (info) => (
        <span className="font-medium max-w-[200px] truncate block">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row.variants?.[0]?.priceUsd, {
      id: 'price',
      header: 'Price',
      cell: (info) => {
        const price = info.getValue();
        return (
          <span className="font-medium">
            {price ? formatCurrency(price, 'en-US', 'USD') : '—'}
          </span>
        );
      },
    }),
    columnHelper.accessor((row) => row.variants?.[0]?.boxQuantity, {
      id: 'boxQuantity',
      header: 'Box Qty',
      cell: (info) => (
        <span className="text-sm text-muted">{info.getValue() ?? '—'}</span>
      ),
    }),
    columnHelper.accessor((row) => row.variants?.[0]?.boxWeight, {
      id: 'boxWeight',
      header: 'Box Weight (kg)',
      cell: (info) => (
        <span className="text-sm text-muted">{info.getValue() ?? '—'}</span>
      ),
    }),
  ];
}
