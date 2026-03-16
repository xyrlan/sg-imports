'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertDialog, Button, Dropdown, Label } from '@heroui/react';
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { createColumnHelper } from '@tanstack/react-table';
import { AddSupplierModal } from './add-supplier-modal';
import { EditSupplierModal } from './edit-supplier-modal';
import { deleteSupplierAction } from './supplier-actions';
import type { Supplier } from '@/services/admin';

const supplierColumnHelper = createColumnHelper<Supplier>();

function SupplierRowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations('Products.Suppliers');

  function handleAction(key: string | number) {
    if (key === 'edit') onEdit();
    if (key === 'delete') onDelete();
  }

  return (
    <Dropdown>
      <Button aria-label={t('actionsLabel')} variant="ghost" size="sm" isIconOnly>
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

function useSupplierColumns(
  editingSupplier: Supplier | null,
  setEditingSupplier: (s: Supplier | null) => void,
  setDeletingSupplier: (s: Supplier | null) => void,
) {
  const t = useTranslations('Products.Suppliers');

  return useMemo(
    () => [
      supplierColumnHelper.accessor('name', {
        header: t('columns.name'),
        cell: (info) => (
          <span className="font-medium">{info.getValue()}</span>
        ),
      }),
      supplierColumnHelper.accessor('taxId', {
        header: t('columns.taxId'),
        cell: (info) => (
          <span className="font-mono text-sm text-muted">
            {info.getValue() ?? '—'}
          </span>
        ),
      }),
      supplierColumnHelper.accessor('countryCode', {
        header: t('columns.countryCode'),
        cell: (info) => (
          <span className="text-sm text-muted">{info.getValue() ?? '—'}</span>
        ),
      }),
      supplierColumnHelper.accessor('email', {
        header: t('columns.email'),
        cell: (info) => (
          <span className="text-sm text-muted">{info.getValue() ?? '—'}</span>
        ),
      }),
      supplierColumnHelper.display({
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: (info) => {
          const sup = info.row.original;
          return (
            <SupplierRowActions
              onEdit={() => setEditingSupplier(sup)}
              onDelete={() => setDeletingSupplier(sup)}
            />
          );
        },
        size: 50,
      }),
    ],
    [t, editingSupplier?.id, setEditingSupplier, setDeletingSupplier],
  );
}

interface SuppliersTabContentProps {
  suppliers: Supplier[];
  organizationId: string;
  onMutate?: () => void;
}

export function SuppliersTabContent({
  suppliers,
  organizationId,
  onMutate,
}: SuppliersTabContentProps) {
  const t = useTranslations('Products.Suppliers');
  const router = useRouter();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [isPending, startTransition] = useTransition();

  const columns = useSupplierColumns(
    editingSupplier,
    setEditingSupplier,
    setDeletingSupplier,
  );

  const handleDeleteConfirm = () => {
    if (!deletingSupplier) return;
    startTransition(async () => {
      await deleteSupplierAction(deletingSupplier.id);
      setDeletingSupplier(null);
      onMutate?.();
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <AddSupplierModal
          organizationId={organizationId}
          isOpen={addModalOpen}
          onOpenChange={setAddModalOpen}
          trigger={
            <Button variant="primary" onPress={() => setAddModalOpen(true)}>
              <Plus className="size-4" />
              {t('addSupplier')}
            </Button>
          }
        />
      </div>
      {suppliers.length === 0 ? (
        <p className="text-muted">{t('noSuppliers')}</p>
      ) : (
        <DataTable<Supplier>
          columns={columns}
          data={suppliers}
          searchPlaceholder={t('searchPlaceholder')}
        />
      )}
      {editingSupplier && (
        <EditSupplierModal
          supplier={editingSupplier}
          isOpen
          onOpenChange={(open) => !open && setEditingSupplier(null)}
        />
      )}
      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={!!deletingSupplier}
          onOpenChange={(open) => !open && setDeletingSupplier(null)}
        >
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[400px]">
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>
                  {t('deleteConfirmTitle')}
                </AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  {deletingSupplier &&
                    t('deleteConfirm', { name: deletingSupplier.name })}
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button
                  slot="close"
                  variant="tertiary"
                  onPress={() => setDeletingSupplier(null)}
                >
                  {t('cancel')}
                </Button>
                <Button
                  variant="danger"
                  isPending={isPending}
                  onPress={handleDeleteConfirm}
                >
                  {t('delete')}
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  );
}
