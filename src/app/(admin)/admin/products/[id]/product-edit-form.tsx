'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ProductForm } from '@/app/(dashboard)/dashboard/products/components/product-form';
import { updateProductAsAdminAction } from '../actions';
import type { ProductWithVariants } from '@/services/product.service';

interface ProductEditFormProps {
  product: ProductWithVariants;
  organizationId: string;
}

export function ProductEditForm({ product, organizationId }: ProductEditFormProps) {
  const t = useTranslations('Admin.Products');
  const router = useRouter();
  const handleMutate = useCallback(() => router.refresh(), [router]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/products">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="size-4" />
            {t('backToProducts')}
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{t('editProduct')} - {product.name}</h1>
        <p className="text-muted mt-1">{t('editProductDescription')}</p>
      </div>

      <ProductForm
        organizationId={organizationId}
        initialProduct={product}
        updateAction={updateProductAsAdminAction}
        onMutate={handleMutate}
      />
    </div>
  );
}
