'use client';

import { useState, useEffect, useTransition, useCallback, useRef } from 'react';
import { Tabs, Button, Dropdown, Label } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { createColumnHelper } from '@tanstack/react-table';
import { useQueryState } from 'nuqs';
import type { PaginationState } from '@tanstack/react-table';

import type { ProductWithOrgAndNcm, HsCode } from '@/services/admin';
import type { PaginatedResult } from '@/services/admin/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { DeleteProductDialog } from './components/delete-product-dialog';
import { DeleteNcmDialog } from './components/delete-ncm-dialog';
import { EditNcmModal } from './components/edit-ncm-modal';
import { fetchProductsAction, fetchHsCodesAction } from './actions';

// ============================================
// Debounce hook
// ============================================

function useDebouncedValue(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ============================================
// Column Definitions: Products
// ============================================

const productColumnHelper = createColumnHelper<ProductWithOrgAndNcm>();

function useProductColumns(
  onEdit: (p: ProductWithOrgAndNcm) => void,
  onDelete: (p: ProductWithOrgAndNcm) => void,
) {
  const t = useTranslations('Admin.Products');

  return [
    productColumnHelper.accessor('name', {
      header: t('columns.name'),
      cell: (info) => (
        <span className="font-medium max-w-[200px] truncate block">
          {info.getValue()}
        </span>
      ),
    }),
    productColumnHelper.accessor('organizationName', {
      header: t('columns.organization'),
      cell: (info) => (
        <span className="text-sm text-muted max-w-[150px] truncate block">
          {info.getValue()}
        </span>
      ),
    }),
    productColumnHelper.accessor('ncmCode', {
      header: t('columns.ncmCode'),
      cell: (info) => (
        <span className="font-mono text-sm">
          {info.getValue() ?? '—'}
        </span>
      ),
    }),
    productColumnHelper.accessor('firstSku', {
      header: t('columns.sku'),
      cell: (info) => (
        <span className="font-mono text-sm text-muted">
          {info.getValue() ?? '—'}
        </span>
      ),
    }),
    productColumnHelper.accessor('firstPriceUsd', {
      header: t('columns.price'),
      cell: (info) => {
        const price = info.getValue();
        return (
          <span className="font-medium">
            {price ? formatCurrency(price, 'en-US', 'USD') : '—'}
          </span>
        );
      },
    }),
    productColumnHelper.accessor('createdAt', {
      header: t('columns.createdAt'),
      cell: (info) => {
        const date = info.getValue();
        return (
          <span className="text-sm text-muted">
            {date ? formatDate(new Date(date)) : '—'}
          </span>
        );
      },
    }),
    productColumnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <ProductActions
          product={info.row.original}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ),
      size: 50,
    }),
  ];
}

function ProductActions({
  product,
  onEdit,
  onDelete,
}: {
  product: ProductWithOrgAndNcm;
  onEdit: (p: ProductWithOrgAndNcm) => void;
  onDelete: (p: ProductWithOrgAndNcm) => void;
}) {
  const t = useTranslations('Admin.Products');

  function handleAction(key: string | number) {
    if (key === 'edit') onEdit(product);
    if (key === 'delete') onDelete(product);
  }

  return (
    <Dropdown>
      <Button aria-label={t('actions.label')} variant="ghost" size="sm" isIconOnly>
        <MoreHorizontal className="size-4" />
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu onAction={(key) => handleAction(key)}>
          <Dropdown.Item id="edit" textValue={t('actions.edit')}>
            <Pencil className="size-4" />
            <Label>{t('actions.edit')}</Label>
          </Dropdown.Item>
          <Dropdown.Item id="delete" textValue={t('actions.delete')} className="text-danger">
            <Trash2 className="size-4" />
            <Label>{t('actions.delete')}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

// ============================================
// Column Definitions: NCMs
// ============================================

const hsCodeColumnHelper = createColumnHelper<HsCode>();

function useHsCodeColumns(
  onEdit: (h: HsCode) => void,
  onDelete: (h: HsCode) => void,
) {
  const t = useTranslations('Admin.Products');

  return [
    hsCodeColumnHelper.accessor('code', {
      header: t('columns.ncmCode'),
      cell: (info) => (
        <span className="font-mono font-medium">{info.getValue()}</span>
      ),
    }),
    hsCodeColumnHelper.accessor('description', {
      header: t('columns.description'),
      cell: (info) => (
        <span className="text-sm text-muted max-w-[250px] truncate block">
          {info.getValue() ?? '—'}
        </span>
      ),
    }),
    hsCodeColumnHelper.accessor('ii', {
      header: 'II %',
      cell: (info) => (
        <span className="text-sm">{info.getValue() ?? '0'}</span>
      ),
    }),
    hsCodeColumnHelper.accessor('ipi', {
      header: 'IPI %',
      cell: (info) => (
        <span className="text-sm">{info.getValue() ?? '0'}</span>
      ),
    }),
    hsCodeColumnHelper.accessor('pis', {
      header: 'PIS %',
      cell: (info) => (
        <span className="text-sm">{info.getValue() ?? '0'}</span>
      ),
    }),
    hsCodeColumnHelper.accessor('cofins', {
      header: 'COFINS %',
      cell: (info) => (
        <span className="text-sm">{info.getValue() ?? '0'}</span>
      ),
    }),
    hsCodeColumnHelper.accessor('updatedAt', {
      header: t('columns.updatedAt'),
      cell: (info) => {
        const date = info.getValue();
        return (
          <span className="text-sm text-muted">
            {date ? formatDate(new Date(date)) : '—'}
          </span>
        );
      },
    }),
    hsCodeColumnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <HsCodeActions
          hsCode={info.row.original}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ),
      size: 50,
    }),
  ];
}

function HsCodeActions({
  hsCode,
  onEdit,
  onDelete,
}: {
  hsCode: HsCode;
  onEdit: (h: HsCode) => void;
  onDelete: (h: HsCode) => void;
}) {
  const t = useTranslations('Admin.Products');

  function handleAction(key: string | number) {
    if (key === 'edit') onEdit(hsCode);
    if (key === 'delete') onDelete(hsCode);
  }

  return (
    <Dropdown>
      <Button aria-label={t('actions.label')} variant="ghost" size="sm" isIconOnly>
        <MoreHorizontal className="size-4" />
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu onAction={(key) => handleAction(key)}>
          <Dropdown.Item id="edit" textValue={t('actions.edit')}>
            <Pencil className="size-4" />
            <Label>{t('actions.edit')}</Label>
          </Dropdown.Item>
          <Dropdown.Item id="delete" textValue={t('actions.delete')} className="text-danger">
            <Trash2 className="size-4" />
            <Label>{t('actions.delete')}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

// ============================================
// Main Component
// ============================================

interface ProductsContentProps {
  initialProducts: PaginatedResult<ProductWithOrgAndNcm>;
  initialHsCodes: PaginatedResult<HsCode>;
}

export function ProductsContent({
  initialProducts,
  initialHsCodes,
}: ProductsContentProps) {
  const [selectedTab, setSelectedTab] = useQueryState('selectedTab', {
    defaultValue: 'products',
  });
  const t = useTranslations('Admin.Products');
  const router = useRouter();
  const [isProductsPending, startProductsTransition] = useTransition();
  const [isHsCodesPending, startHsCodesTransition] = useTransition();

  // Products state
  const [products, setProducts] = useState(initialProducts.data);
  const [productsTotal, setProductsTotal] = useState(initialProducts.total);
  const [productsPageCount, setProductsPageCount] = useState(initialProducts.pageCount);
  const [productsPagination, setProductsPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [productsSearch, setProductsSearch] = useState('');
  const debouncedProductsSearch = useDebouncedValue(productsSearch, 300);

  // HS Codes state
  const [hsCodes, setHsCodes] = useState(initialHsCodes.data);
  const [hsCodesTotal, setHsCodesTotal] = useState(initialHsCodes.total);
  const [hsCodesPageCount, setHsCodesPageCount] = useState(initialHsCodes.pageCount);
  const [hsCodesPagination, setHsCodesPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [hsCodesSearch, setHsCodesSearch] = useState('');
  const debouncedHsCodesSearch = useDebouncedValue(hsCodesSearch, 300);

  // Dialog state
  const [deleteProductTarget, setDeleteProductTarget] =
    useState<ProductWithOrgAndNcm | null>(null);
  const [deleteNcmTarget, setDeleteNcmTarget] = useState<HsCode | null>(null);
  const [editNcmTarget, setEditNcmTarget] = useState<HsCode | null>(null);
  const [editNcmOpen, setEditNcmOpen] = useState(false);

  // Fetch products when pagination or search changes
  const isFirstProductsFetch = useRef(true);
  useEffect(() => {
    if (isFirstProductsFetch.current) {
      isFirstProductsFetch.current = false;
      return;
    }
    startProductsTransition(async () => {
      const result = await fetchProductsAction({
        page: productsPagination.pageIndex,
        pageSize: productsPagination.pageSize,
        search: debouncedProductsSearch || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setProducts(result.data);
      setProductsTotal(result.total);
      setProductsPageCount(result.pageCount);
    });
  }, [productsPagination.pageIndex, productsPagination.pageSize, debouncedProductsSearch]);

  // Fetch HS codes when pagination or search changes
  const isFirstHsCodesFetch = useRef(true);
  useEffect(() => {
    if (isFirstHsCodesFetch.current) {
      isFirstHsCodesFetch.current = false;
      return;
    }
    startHsCodesTransition(async () => {
      const result = await fetchHsCodesAction({
        page: hsCodesPagination.pageIndex,
        pageSize: hsCodesPagination.pageSize,
        search: debouncedHsCodesSearch || undefined,
        sortBy: 'code',
        sortOrder: 'asc',
      });
      setHsCodes(result.data);
      setHsCodesTotal(result.total);
      setHsCodesPageCount(result.pageCount);
    });
  }, [hsCodesPagination.pageIndex, hsCodesPagination.pageSize, debouncedHsCodesSearch]);

  // Reset to page 0 when search changes
  const handleProductsSearch = useCallback((value: string) => {
    setProductsSearch(value);
    setProductsPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const handleHsCodesSearch = useCallback((value: string) => {
    setHsCodesSearch(value);
    setHsCodesPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  // Refetch current page after mutations
  const refetchProducts = useCallback(() => {
    startProductsTransition(async () => {
      const result = await fetchProductsAction({
        page: productsPagination.pageIndex,
        pageSize: productsPagination.pageSize,
        search: debouncedProductsSearch || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setProducts(result.data);
      setProductsTotal(result.total);
      setProductsPageCount(result.pageCount);
    });
  }, [productsPagination, debouncedProductsSearch]);

  const refetchHsCodes = useCallback(() => {
    startHsCodesTransition(async () => {
      const result = await fetchHsCodesAction({
        page: hsCodesPagination.pageIndex,
        pageSize: hsCodesPagination.pageSize,
        search: debouncedHsCodesSearch || undefined,
        sortBy: 'code',
        sortOrder: 'asc',
      });
      setHsCodes(result.data);
      setHsCodesTotal(result.total);
      setHsCodesPageCount(result.pageCount);
    });
  }, [hsCodesPagination, debouncedHsCodesSearch]);

  const productColumns = useProductColumns(
    (p) => router.push(`/admin/products/${p.id}`),
    (p) => setDeleteProductTarget(p),
  );
  const hsCodeColumns = useHsCodeColumns(
    (h) => {
      setEditNcmTarget(h);
      setEditNcmOpen(true);
    },
    (h) => setDeleteNcmTarget(h),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted mt-1">{t('description')}</p>
      </div>

      <Tabs selectedKey={selectedTab} onSelectionChange={(k) => setSelectedTab(k as string)}>
        <Tabs.ListContainer>
          <Tabs.List aria-label={t('title')}>
            <Tabs.Tab id="products">
              {t('productsTab')} ({productsTotal})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="ncms">
              {t('ncmsTab')} ({hsCodesTotal})
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="products" className="pt-4">
          <DataTable
            columns={productColumns}
            data={products}
            searchPlaceholder={t('searchProducts')}
            enableRowSelection
            manualPagination
            pagination={productsPagination}
            onPaginationChange={setProductsPagination}
            pageCount={productsPageCount}
            totalRows={productsTotal}
            isLoading={isProductsPending}
            onSearchChange={handleProductsSearch}
          />
        </Tabs.Panel>

        <Tabs.Panel id="ncms" className="pt-4">
          <DataTable
            columns={hsCodeColumns}
            data={hsCodes}
            searchPlaceholder={t('searchNcms')}
            enableRowSelection
            manualPagination
            pagination={hsCodesPagination}
            onPaginationChange={setHsCodesPagination}
            pageCount={hsCodesPageCount}
            totalRows={hsCodesTotal}
            isLoading={isHsCodesPending}
            onSearchChange={handleHsCodesSearch}
          />
        </Tabs.Panel>
      </Tabs>

      <DeleteProductDialog
        product={deleteProductTarget}
        open={!!deleteProductTarget}
        onOpenChange={(open) => !open && setDeleteProductTarget(null)}
        onSuccess={() => {
          setDeleteProductTarget(null);
          refetchProducts();
        }}
      />

      <DeleteNcmDialog
        hsCode={deleteNcmTarget}
        open={!!deleteNcmTarget}
        onOpenChange={(open) => !open && setDeleteNcmTarget(null)}
        onSuccess={() => {
          setDeleteNcmTarget(null);
          refetchHsCodes();
        }}
      />

      <EditNcmModal
        hsCode={editNcmTarget}
        isOpen={editNcmOpen}
        onOpenChange={(open) => {
          setEditNcmOpen(open);
        }}
        trigger={null}
        onSuccess={refetchHsCodes}
      />
    </div>
  );
}
