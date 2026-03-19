'use client';

import { useState, useMemo, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';
import { AlertDialog, Button, Card, Label, Select, ListBox } from '@heroui/react';
import { Plus, Pencil, Settings, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { createColumnHelper } from '@tanstack/react-table';
import { SettingsSectionHeader } from '../_shared/settings-section-header';
import { AddSupplierModal } from './add-supplier-modal';
import { deleteSupplierAction } from './actions';
import type { Supplier, SupplierWithSubSuppliers } from '@/services/admin';
import { SupplierEditForm } from './supplier-edit-form';
import { EditSupplierModal } from './edit-supplier-modal';

const supplierColumnHelper = createColumnHelper<Supplier>();

function useSupplierColumns(
  organizations: { id: string; name: string }[],
  editingSupplier: Supplier | null,
  setEditingSupplier: (s: Supplier | null) => void,
  onConfigure: (id: string) => void,
  setDeletingSupplier: (s: Supplier | null) => void,
) {
  const t = useTranslations('Admin.Settings');

  return useMemo(
    () => [
      supplierColumnHelper.accessor('name', {
        header: t('Suppliers.columns.name'),
        cell: (info) => (
          <span className="font-medium">{info.getValue()}</span>
        ),
      }),
      supplierColumnHelper.accessor('organizationName', {
        header: t('Suppliers.columns.organization'),
        cell: (info) => (
          <span className="text-sm text-muted">{info.getValue() ?? '—'}</span>
        ),
      }),
      supplierColumnHelper.accessor('taxId', {
        header: t('Suppliers.columns.taxId'),
        cell: (info) => (
          <span className="font-mono text-sm text-muted">
            {info.getValue() ?? '—'}
          </span>
        ),
      }),
      supplierColumnHelper.accessor('countryCode', {
        header: t('Suppliers.columns.countryCode'),
        cell: (info) => (
          <span className="text-sm text-muted">{info.getValue() ?? '—'}</span>
        ),
      }),
      supplierColumnHelper.accessor('email', {
        header: t('Suppliers.columns.email'),
        cell: (info) => (
          <span className="text-sm text-muted">{info.getValue() ?? '—'}</span>
        ),
      }),
      supplierColumnHelper.accessor('siscomexId', {
        header: t('Suppliers.columns.siscomexId'),
        cell: (info) => (
          <span className="font-mono text-sm text-muted">
            {info.getValue() ?? '—'}
          </span>
        ),
      }),
      supplierColumnHelper.display({
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: (info) => {
          const sup = info.row.original;
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onPress={() => onConfigure(sup.id)}
              >
                <Settings className="size-4" />
                {t('Suppliers.configure')}
              </Button>
              <EditSupplierModal
                key={`${sup.id}-${editingSupplier?.id === sup.id}`}
                supplier={sup}
                organizations={organizations}
                isOpen={editingSupplier?.id === sup.id}
                onOpenChange={(open: boolean) => setEditingSupplier(open ? sup : null)}
                trigger={
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => setEditingSupplier(sup)}
                  >
                    <Pencil className="size-4" />
                    {t('Suppliers.edit')}
                  </Button>
                }
              />
              <Button
                size="sm"
                variant="danger"
                onPress={() => setDeletingSupplier(sup)}
              >
                <Trash2 className="size-4" />
                {t('Suppliers.delete')}
              </Button>
            </div>
          );
        },
        size: 280,
      }),
    ],
    [t, organizations, editingSupplier?.id, setEditingSupplier, setDeletingSupplier, onConfigure],
  );
}

interface SuppliersSectionProps {
  organizations: { id: string; name: string }[];
  suppliers: Supplier[];
  selectedSupplier: SupplierWithSubSuppliers | null;
  initialSupplierId: string;
}

export function SuppliersSection({
  organizations,
  suppliers,
  selectedSupplier,
  initialSupplierId,
}: SuppliersSectionProps) {
  const t = useTranslations('Admin.Settings');
  const router = useRouter();
  const [filterOrgId, setFilterOrgId] = useState('');
  const [supplierId, setSupplierId] = useQueryState(
    'supplierId',
    parseAsString.withDefault(initialSupplierId).withOptions({ shallow: false }),
  );
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredSuppliers = useMemo(() => {
    if (!filterOrgId) return suppliers;
    return suppliers.filter((s) => s.organizationId === filterOrgId);
  }, [suppliers, filterOrgId]);

  const handleConfigure = (id: string) => setSupplierId(id);
  const handleBack = () => setSupplierId('');

  const handleDeleteConfirm = () => {
    if (!deletingSupplier) return;
    startTransition(async () => {
      await deleteSupplierAction(deletingSupplier.id);
      setDeletingSupplier(null);
      if (supplierId === deletingSupplier.id) {
        setSupplierId('');
      }
      router.refresh();
    });
  };

  const columns = useSupplierColumns(
    organizations,
    editingSupplier,
    setEditingSupplier,
    handleConfigure,
    setDeletingSupplier,
  );

  const showEditForm = !!selectedSupplier && !!supplierId;

  return (
    <Card className="space-y-6">
      {showEditForm ? (
        <SupplierEditForm
          supplier={selectedSupplier}
          onBack={handleBack}
          onRefresh={() => router.refresh()}
        />
      ) : (
        <>
          <SettingsSectionHeader
            title={t('Suppliers.title')}
            description={t('Suppliers.description')}
            actions={
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-[200px]">
                  <Label className="text-sm text-muted mb-1 block">
                    {t('Suppliers.filterByOrganization')}
                  </Label>
                  <Select
                    selectedKey={filterOrgId || null}
                    onSelectionChange={(key) =>
                      setFilterOrgId(key != null && key !== 'all' ? String(key) : '')
                    }
                    variant="primary"
                    placeholder={t('Suppliers.allOrganizations')}
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item
                          key="all"
                          id="all"
                          textValue={t('Suppliers.allOrganizations')}
                        >
                          {t('Suppliers.allOrganizations')}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                        {organizations.map((org) => (
                          <ListBox.Item
                            key={org.id}
                            id={org.id}
                            textValue={org.name}
                          >
                            {org.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>
                <AddSupplierModal
                  organizations={organizations}
                  isOpen={addModalOpen}
                  onOpenChange={setAddModalOpen}
                  trigger={
                    <Button
                      variant="primary"
                      onPress={() => setAddModalOpen(true)}
                    >
                      <Plus className="size-4" />
                      {t('Suppliers.addSupplier')}
                    </Button>
                  }
                />
              </div>
            }
          />
          {filteredSuppliers.length === 0 ? (
            <p className="text-muted">{t('Suppliers.noSuppliers')}</p>
          ) : (
            <DataTable<Supplier>
              columns={columns}
              data={filteredSuppliers}
              searchPlaceholder={t('Suppliers.searchPlaceholder')}
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
                      {t('Suppliers.deleteConfirmTitle')}
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p>
                      {deletingSupplier &&
                        t('Suppliers.deleteConfirm', {
                          name: deletingSupplier.name,
                        })}
                    </p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button
                      slot="close"
                      variant="tertiary"
                      onPress={() => setDeletingSupplier(null)}
                    >
                      {t('Suppliers.cancel')}
                    </Button>
                    <Button
                      variant="danger"
                      isPending={isPending}
                      onPress={handleDeleteConfirm}
                    >
                      {t('Suppliers.delete')}
                    </Button>
                  </AlertDialog.Footer>
                </AlertDialog.Dialog>
              </AlertDialog.Container>
            </AlertDialog.Backdrop>
          </AlertDialog>
        </>
      )}
    </Card>
  );
}
