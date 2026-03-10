'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Tabs } from '@heroui/react';
import { ProductsTable } from './products-table';
import { SuppliersTabContent } from './suppliers-tab-content';
import type { ProductWithVariants } from '@/services/product.service';
import type { Supplier } from '@/services/admin';

interface ProductsPageContentProps {
  initialProducts: ProductWithVariants[];
  initialSuppliers: Supplier[];
  organizationId: string;
  initialPaging: { totalCount: number; page: number; pageSize: number };
}

export function ProductsPageContent({
  initialProducts,
  initialSuppliers,
  organizationId,
  initialPaging,
}: ProductsPageContentProps) {
  const t = useTranslations('Products');
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<string>('products');

  const handleMutate = () => {
    router.refresh();
  };

  return (
    <Tabs
      selectedKey={selectedTab}
      onSelectionChange={(key) => setSelectedTab(key as string)}
    >
      <Tabs.ListContainer>
        <Tabs.List aria-label={t('title')}>
          <Tabs.Tab id="products">
            {t('productsTab')} ({initialProducts.length})
            <Tabs.Indicator />
          </Tabs.Tab>
          <Tabs.Tab id="suppliers">
            {t('suppliersTab')} ({initialSuppliers.length})
            <Tabs.Indicator />
          </Tabs.Tab>
        </Tabs.List>
      </Tabs.ListContainer>

      <Tabs.Panel id="products" className="pt-4">
        <ProductsTable
          initialProducts={initialProducts}
          organizationId={organizationId}
          onMutate={handleMutate}
        />
      </Tabs.Panel>

      <Tabs.Panel id="suppliers" className="pt-4">
        <SuppliersTabContent
          suppliers={initialSuppliers}
          organizationId={organizationId}
          onMutate={handleMutate}
        />
      </Tabs.Panel>
    </Tabs>
  );
}
