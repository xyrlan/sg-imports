'use client';

import { CreateProductDrawer } from './create-product-drawer';
import { ImportProductsDrawer } from './import-products-drawer';
import { ExportCSVButton } from './export-csv-button';

interface ProductActionsProps {
  organizationId: string;
  onMutate?: () => void;
}

export function ProductActions({ organizationId, onMutate }: ProductActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <CreateProductDrawer organizationId={organizationId} onMutate={onMutate} />
      <ImportProductsDrawer organizationId={organizationId} onMutate={onMutate} />
      <ExportCSVButton organizationId={organizationId} />
    </div>
  );
}
