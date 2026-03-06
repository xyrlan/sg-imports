'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/ui/data-table';
import { getProductColumns } from './product-columns';
import { ProductActions } from './product-actions';
import type { ProductWithVariants } from '@/services/product.service';

interface ProductsTableProps {
  initialProducts: ProductWithVariants[];
  organizationId: string;
  onMutate?: () => void;
}

export function ProductsTable({
  initialProducts,
  organizationId,
  onMutate,
}: ProductsTableProps) {
  const t = useTranslations('Products.Table');
  const tCols = useTranslations('Products.Columns');
  const columns = useMemo(() => getProductColumns(tCols), [tCols]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <ProductActions organizationId={organizationId} onMutate={onMutate} />
      </div>

      <DataTable<ProductWithVariants>
        columns={columns}
        data={initialProducts}
        searchPlaceholder={t('searchPlaceholder')}
      />
    </div>
  );
}
