'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { Button, Dropdown, Label } from '@heroui/react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { ProductWithVariants } from '@/services/product.service';

const columnHelper = createColumnHelper<ProductWithVariants>();

interface ProductColumnsActions {
  onEdit: (product: ProductWithVariants) => void;
  onDelete: (product: ProductWithVariants) => void;
}

function ProductRowActions({
  product,
  onEdit,
  onDelete,
}: {
  product: ProductWithVariants;
  onEdit: (product: ProductWithVariants) => void;
  onDelete: (product: ProductWithVariants) => void;
}) {
  const t = useTranslations('Products.Actions');

  function handleAction(key: string | number) {
    if (key === 'edit') onEdit(product);
    if (key === 'delete') onDelete(product);
  }

  return (
    <Dropdown>
      <Button
        aria-label={t('label')}
        variant="ghost"
        size="sm"
        isIconOnly
      >
        <MoreHorizontal className="size-4" />
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu onAction={(key) => handleAction(key)}>
          <Dropdown.Item id="edit" textValue={t('edit')}>
            <Pencil className="size-4" />
            <Label>{t('edit')}</Label>
          </Dropdown.Item>
          <Dropdown.Item id="delete" textValue={t('delete')} className="text-danger">
            <Trash2 className="size-4" />
            <Label>{t('delete')}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

export function getProductColumns(
  t: ReturnType<typeof useTranslations<'Products.Columns'>>,
  actions: ProductColumnsActions
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
    columnHelper.accessor((row) => row.variants?.[0]?.unitsPerCarton, {
      id: 'unitsPerCarton',
      header: t('unitsPerCarton'),
      cell: (info) => (
        <span className="text-sm text-muted">{info.getValue() ?? '—'}</span>
      ),
    }),
    columnHelper.accessor((row) => row.variants?.[0]?.cartonWeight, {
      id: 'cartonWeight',
      header: t('cartonWeight'),
      cell: (info) => (
        <span className="text-sm text-muted">{info.getValue() ?? '—'}</span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <ProductRowActions
          product={info.row.original}
          onEdit={actions.onEdit}
          onDelete={actions.onDelete}
        />
      ),
      size: 50,
    }),
  ];
}
