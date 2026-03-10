'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Link } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import { AlertDialog, Button, Card } from '@heroui/react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { createColumnHelper } from '@tanstack/react-table';
import { AddSubSupplierModal } from './add-sub-supplier-modal';
import { EditSubSupplierModal } from './edit-sub-supplier-modal';
import { deleteSubSupplierAction } from '../../actions';
import type { SupplierWithSubSuppliers, SubSupplier } from '@/services/admin';

const subSupplierColumnHelper = createColumnHelper<SubSupplier>();

function useSubSupplierColumns(
  editingSubSupplier: SubSupplier | null,
  setEditingSubSupplier: (s: SubSupplier | null) => void,
  setDeletingSubSupplier: (s: SubSupplier | null) => void,
) {
  const t = useTranslations('Admin.Settings');

  return useMemo(
    () => [
      subSupplierColumnHelper.accessor('name', {
        header: t('SubSuppliers.columns.name'),
        cell: (info) => (
          <span className="font-medium">{info.getValue()}</span>
        ),
      }),
      subSupplierColumnHelper.accessor('taxId', {
        header: t('SubSuppliers.columns.taxId'),
        cell: (info) => (
          <span className="font-mono text-sm text-muted">
            {info.getValue() ?? '—'}
          </span>
        ),
      }),
      subSupplierColumnHelper.accessor('countryCode', {
        header: t('SubSuppliers.columns.countryCode'),
        cell: (info) => (
          <span className="text-sm text-muted">{info.getValue() ?? '—'}</span>
        ),
      }),
      subSupplierColumnHelper.accessor('email', {
        header: t('SubSuppliers.columns.email'),
        cell: (info) => (
          <span className="text-sm text-muted">{info.getValue() ?? '—'}</span>
        ),
      }),
      subSupplierColumnHelper.accessor('siscomexId', {
        header: t('SubSuppliers.columns.siscomexId'),
        cell: (info) => (
          <span className="font-mono text-sm text-muted">
            {info.getValue() ?? '—'}
          </span>
        ),
      }),
      subSupplierColumnHelper.display({
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: (info) => {
          const sub = info.row.original;
          return (
            <div className="flex gap-2">
              <EditSubSupplierModal
                key={`${sub.id}-${editingSubSupplier?.id === sub.id}`}
                subSupplier={sub}
                isOpen={editingSubSupplier?.id === sub.id}
                onOpenChange={(open) => setEditingSubSupplier(open ? sub : null)}
                trigger={
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => setEditingSubSupplier(sub)}
                  >
                    <Pencil className="size-4" />
                    {t('SubSuppliers.edit')}
                  </Button>
                }
              />
              <Button
                size="sm"
                variant="danger"
                onPress={() => setDeletingSubSupplier(sub)}
              >
                <Trash2 className="size-4" />
                {t('SubSuppliers.delete')}
              </Button>
            </div>
          );
        },
        size: 180,
      }),
    ],
    [t, editingSubSupplier?.id, setEditingSubSupplier, setDeletingSubSupplier],
  );
}

interface SupplierEditFormProps {
  supplier: SupplierWithSubSuppliers;
  onBack?: () => void;
  onRefresh?: () => void;
}

export function SupplierEditForm({
  supplier,
  onBack,
  onRefresh,
}: SupplierEditFormProps) {
  const t = useTranslations('Admin.Settings');
  const router = useRouter();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingSubSupplier, setEditingSubSupplier] = useState<SubSupplier | null>(null);
  const [deletingSubSupplier, setDeletingSubSupplier] = useState<SubSupplier | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDeleteConfirm = () => {
    if (!deletingSubSupplier) return;
    startTransition(async () => {
      await deleteSubSupplierAction(deletingSubSupplier.id);
      setDeletingSubSupplier(null);
      onRefresh?.();
      router.refresh();
    });
  };

  const columns = useSubSupplierColumns(
    editingSubSupplier,
    setEditingSubSupplier,
    setDeletingSubSupplier,
  );

  const backLink = onBack ? (
    <Link 
      onClick={onBack}
      className="inline-flex items-center gap-1 mb-4"
    >
      <ArrowLeft className="size-4" />
      {t('Suppliers.back')}
    </Link>
  ) : (
    <Link
      href="/admin/settings?activeSection=suppliers"
      className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-4"
    >
      <ArrowLeft className="size-4" />
      {t('Suppliers.back')}
    </Link>
  );

  return (
    <>
      {backLink}
      <Card className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{supplier.name}</h2>
            <p className="text-sm text-muted">{t('SubSuppliers.description')}</p>
          </div>
          <AddSubSupplierModal
            supplierId={supplier.id}
            isOpen={addModalOpen}
            onOpenChange={setAddModalOpen}
            trigger={
              <Button variant="primary" onPress={() => setAddModalOpen(true)}>
                <Plus className="size-4" />
                {t('SubSuppliers.addSubSupplier')}
              </Button>
            }
          />
        </div>
        {supplier.subSuppliers.length === 0 ? (
          <p className="text-muted">{t('SubSuppliers.noSubSuppliers')}</p>
        ) : (
          <DataTable<SubSupplier>
            columns={columns}
            data={supplier.subSuppliers}
            searchPlaceholder={t('SubSuppliers.searchPlaceholder')}
          />
        )}
        <AlertDialog>
          <AlertDialog.Backdrop
            isOpen={!!deletingSubSupplier}
            onOpenChange={(open) => !open && setDeletingSubSupplier(null)}
          >
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-[400px]">
                <AlertDialog.CloseTrigger />
                <AlertDialog.Header>
                  <AlertDialog.Icon status="danger" />
                  <AlertDialog.Heading>
                    {t('SubSuppliers.deleteConfirmTitle')}
                  </AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>
                    {deletingSubSupplier &&
                      t('SubSuppliers.deleteConfirm', {
                        name: deletingSubSupplier.name,
                      })}
                  </p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button
                    slot="close"
                    variant="tertiary"
                    onPress={() => setDeletingSubSupplier(null)}
                  >
                    {t('Suppliers.cancel')}
                  </Button>
                  <Button
                    variant="danger"
                    isPending={isPending}
                    onPress={handleDeleteConfirm}
                  >
                    {t('SubSuppliers.delete')}
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      </Card>
    </>
  );
}
