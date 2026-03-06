'use client';

import { useRouter } from 'next/navigation';
import { ProductsTable } from './products-table';
import type { ProductWithVariants } from '@/services/product.service';

interface ProductsPageContentProps {
  initialProducts: ProductWithVariants[];
  organizationId: string;
  initialPaging: { totalCount: number; page: number; pageSize: number };
}

export function ProductsPageContent({
  initialProducts,
  organizationId,
  initialPaging,
}: ProductsPageContentProps) {
  const router = useRouter();

  const handleMutate = () => {
    router.refresh();
  };

  return (
    <ProductsTable
      initialProducts={initialProducts}
      organizationId={organizationId}
      onMutate={handleMutate}
    />
  );
}
