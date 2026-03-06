'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/ui/data-table';
import { getProductColumns } from './product-columns';
import { ProductActions } from './product-actions';
import { EditProductModal } from './edit-product-modal';
import { DeleteProductAlertDialog } from './delete-product-alert-dialog';
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
  const [editingProduct, setEditingProduct] = useState<ProductWithVariants | null>(null);
  const [productToDelete, setProductToDelete] = useState<ProductWithVariants | null>(null);

  const columns = useMemo(
    () =>
      getProductColumns(tCols, {
        onEdit: (product) => setEditingProduct(product),
        onDelete: (product) => setProductToDelete(product),
      }),
    [tCols]
  );

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

      <EditProductModal
        product={editingProduct}
        open={!!editingProduct}
        onOpenChange={(open) => !open && setEditingProduct(null)}
        organizationId={organizationId}
        onMutate={onMutate}
      />

      <DeleteProductAlertDialog
        product={productToDelete}
        open={!!productToDelete}
        onOpenChange={(open) => !open && setProductToDelete(null)}
        organizationId={organizationId}
        onSuccess={onMutate}
      />
    </div>
  );
}
