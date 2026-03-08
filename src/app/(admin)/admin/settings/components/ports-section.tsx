'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertDialog, Button, Card } from '@heroui/react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { DataTable, facetedFilterFn, type FacetedFilterDef } from '@/components/ui/data-table';
import { createColumnHelper } from '@tanstack/react-table';
import { AddPortModal } from './add-port-modal';
import { EditPortModal } from './edit-port-modal';
import { deletePortAction } from '../actions';
import type { Port } from '@/services/admin';

const portColumnHelper = createColumnHelper<Port>();

function usePortColumns(
  editingPort: Port | null,
  setEditingPort: (port: Port | null) => void,
  setDeletingPort: (port: Port | null) => void
) {
  const t = useTranslations('Admin.Settings');

  return useMemo(
    () => [
      portColumnHelper.accessor('name', {
        header: t('Ports.columns.name'),
        cell: (info) => (
          <span className="font-medium">{info.getValue()}</span>
        ),
      }),
      portColumnHelper.accessor('code', {
        header: t('Ports.columns.code'),
        cell: (info) => (
          <span className="font-mono text-sm text-muted">{info.getValue()}</span>
        ),
      }),
      portColumnHelper.accessor('country', {
        header: t('Ports.columns.country'),
        filterFn: facetedFilterFn,
        cell: (info) => (
          <span className="text-sm text-muted">{info.getValue()}</span>
        ),
      }),
      portColumnHelper.display({
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: (info) => {
          const port = info.row.original;
          return (
            <div className="flex gap-2">
              <EditPortModal
                key={`${port.id}-${editingPort?.id === port.id}`}
                port={port}
                isOpen={editingPort?.id === port.id}
                onOpenChange={(open) => setEditingPort(open ? port : null)}
                trigger={
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => setEditingPort(port)}
                  >
                    <Pencil className="size-4" />
                    {t('Ports.edit')}
                  </Button>
                }
              />
              <Button
                size="sm"
                variant="danger"
                onPress={() => setDeletingPort(port)}
              >
                <Trash2 className="size-4" />
                {t('Ports.delete')}
              </Button>
            </div>
          );
        },
        size: 180,
      }),
    ],
    [t, editingPort?.id, setEditingPort, setDeletingPort]
  );
}

function usePortFilters(ports: Port[]): FacetedFilterDef[] {
  const t = useTranslations('Admin.Settings');

  return useMemo(() => {
    const countries = [...new Set(ports.map((p) => p.country))].sort();
    if (countries.length === 0) return [];
    return [
      {
        columnId: 'country',
        title: t('Ports.columns.country'),
        options: countries.map((c) => ({ label: c, value: c })),
      },
    ];
  }, [ports, t]);
}

interface PortsSectionProps {
  ports: Port[];
}

export function PortsSection({ ports }: PortsSectionProps) {
  const t = useTranslations('Admin.Settings');
  const router = useRouter();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingPort, setEditingPort] = useState<Port | null>(null);
  const [deletingPort, setDeletingPort] = useState<Port | null>(null);
  const [isPending, startTransition] = useTransition();

  const columns = usePortColumns(editingPort, setEditingPort, setDeletingPort);
  const facetedFilters = usePortFilters(ports);

  const handleDeleteConfirm = () => {
    if (!deletingPort) return;
    startTransition(async () => {
      await deletePortAction(deletingPort.id);
      setDeletingPort(null);
      router.refresh();
    });
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t('Ports.title')}</h2>
          <p className="text-sm text-muted">{t('Ports.description')}</p>
        </div>
        <AddPortModal
          isOpen={addModalOpen}
          onOpenChange={setAddModalOpen}
          trigger={
            <Button variant="primary" onPress={() => setAddModalOpen(true)}>
              <Plus className="size-4" />
              {t('Ports.addPort')}
            </Button>
          }
        />
      </div>
      {ports.length === 0 ? (
        <p className="text-muted">{t('Ports.noPorts')}</p>
      ) : (
        <DataTable<Port>
          columns={columns}
          data={ports}
          searchPlaceholder={t('Ports.searchPlaceholder')}
          facetedFilters={facetedFilters}
        />
      )}
      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={!!deletingPort}
          onOpenChange={(open) => !open && setDeletingPort(null)}
        >
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[400px]">
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>
                  {t('Ports.deleteConfirmTitle')}
                </AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  {deletingPort &&
                    t('Ports.deleteConfirm', { name: deletingPort.name })}
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button
                  slot="close"
                  variant="tertiary"
                  onPress={() => setDeletingPort(null)}
                >
                  {t('Ports.cancel')}
                </Button>
                <Button
                  variant="danger"
                  isPending={isPending}
                  onPress={handleDeleteConfirm}
                >
                  {t('Ports.delete')}
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </Card>
  );
}
