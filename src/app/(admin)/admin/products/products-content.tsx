'use client';

import { useState } from 'react';
import { Tabs, Button, Dropdown, Label } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { createColumnHelper } from '@tanstack/react-table';
import { useQueryState } from 'nuqs';

import type { ProductWithOrgAndNcm, HsCode } from '@/services/admin';
import { formatDate, formatCurrency } from '@/lib/utils';
import { DeleteProductDialog } from './components/delete-product-dialog';
import { DeleteNcmDialog } from './components/delete-ncm-dialog';
import { EditNcmModal } from './components/edit-ncm-modal';

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
  initialProducts: ProductWithOrgAndNcm[];
  initialHsCodes: HsCode[];
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

  const [deleteProductTarget, setDeleteProductTarget] =
    useState<ProductWithOrgAndNcm | null>(null);
  const [deleteNcmTarget, setDeleteNcmTarget] = useState<HsCode | null>(null);
  const [editNcmTarget, setEditNcmTarget] = useState<HsCode | null>(null);
  const [editNcmOpen, setEditNcmOpen] = useState(false);

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
              {t('productsTab')} ({initialProducts.length})
              <Tabs.Indicator />
            </Tabs.Tab>
            <Tabs.Tab id="ncms">
              {t('ncmsTab')} ({initialHsCodes.length})
              <Tabs.Indicator />
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        <Tabs.Panel id="products" className="pt-4">
          <DataTable
            columns={productColumns}
            data={initialProducts}
            searchPlaceholder={t('searchProducts')}
            enableRowSelection
          />
        </Tabs.Panel>

        <Tabs.Panel id="ncms" className="pt-4">
          <DataTable
            columns={hsCodeColumns}
            data={initialHsCodes}
            searchPlaceholder={t('searchNcms')}
            enableRowSelection
          />
        </Tabs.Panel>
      </Tabs>

      <DeleteProductDialog
        product={deleteProductTarget}
        open={!!deleteProductTarget}
        onOpenChange={(open) => !open && setDeleteProductTarget(null)}
        onSuccess={() => {
          setDeleteProductTarget(null);
          router.refresh();
        }}
      />

      <DeleteNcmDialog
        hsCode={deleteNcmTarget}
        open={!!deleteNcmTarget}
        onOpenChange={(open) => !open && setDeleteNcmTarget(null)}
        onSuccess={() => {
          setDeleteNcmTarget(null);
          router.refresh();
        }}
      />

      <EditNcmModal
        hsCode={editNcmTarget}
        isOpen={editNcmOpen}
        onOpenChange={(open) => {
          setEditNcmOpen(open);
          if (!open) setEditNcmTarget(null);
        }}
        trigger={null}
      />
    </div>
  );
}
