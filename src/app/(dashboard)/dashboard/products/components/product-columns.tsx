'use client';

import { createColumnHelper } from '@tanstack/react-table';
import type { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/utils';
import type { ProductWithVariants } from '@/services/product.service';

const columnHelper = createColumnHelper<ProductWithVariants>();

export function getProductColumns(
  t: ReturnType<typeof useTranslations<'Products.Columns'>>
) {
  return [
    columnHelper.accessor((row) => {
      const variants = row.variants ?? [];
      if (variants.length === 0) return '—';
      if (variants.length === 1) return variants[0].sku;
      return `${variants[0].sku} (+${variants.length - 1})`;
    }, {
      id: 'sku',
      header: t('sku'),
      cell: (info) => (
        <span className="font-mono text-sm">{info.getValue()}</span>
      ),
    }),
    columnHelper.accessor('name', {
      header: t('name'),
      cell: (info) => (
        <span className="font-medium max-w-[200px] truncate block">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor((row) => row.variants?.[0]?.priceUsd, {
      id: 'price',
      header: t('price'),
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
      header: t('boxQty'),
      cell: (info) => (
        <span className="text-sm text-muted">{info.getValue() ?? '—'}</span>
      ),
    }),
    columnHelper.accessor((row) => row.variants?.[0]?.boxWeight, {
      id: 'boxWeight',
      header: t('boxWeight'),
      cell: (info) => (
        <span className="text-sm text-muted">{info.getValue() ?? '—'}</span>
      ),
    }),
  ];
}
