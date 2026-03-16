'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertDialog, Button, Card } from '@heroui/react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { createColumnHelper } from '@tanstack/react-table';
import { SettingsSectionHeader } from '../_shared/settings-section-header';
import { AddCurrencyExchangeBrokerModal } from './add-currency-exchange-broker-modal';
import { EditCurrencyExchangeBrokerModal } from './edit-currency-exchange-broker-modal';
import { deleteCurrencyExchangeBrokerAction } from './actions';
import type { CurrencyExchangeBroker } from '@/services/admin';

const brokerColumnHelper = createColumnHelper<CurrencyExchangeBroker>();

function useBrokerColumns(
  editingBroker: CurrencyExchangeBroker | null,
  setEditingBroker: (broker: CurrencyExchangeBroker | null) => void,
  setDeletingBroker: (broker: CurrencyExchangeBroker | null) => void
) {
  const t = useTranslations('Admin.Settings');

  return useMemo(
    () => [
      brokerColumnHelper.accessor('name', {
        header: t('CurrencyExchangeBrokers.columns.name'),
        cell: (info) => (
          <span className="font-medium">{info.getValue()}</span>
        ),
      }),
      brokerColumnHelper.display({
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: (info) => {
          const broker = info.row.original;
          return (
            <div className="flex gap-2">
              <EditCurrencyExchangeBrokerModal
                key={`${broker.id}-${editingBroker?.id === broker.id}`}
                broker={broker}
                isOpen={editingBroker?.id === broker.id}
                onOpenChange={(open) =>
                  setEditingBroker(open ? broker : null)
                }
                trigger={
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => setEditingBroker(broker)}
                  >
                    <Pencil className="size-4" />
                    {t('CurrencyExchangeBrokers.edit')}
                  </Button>
                }
              />
              <Button
                size="sm"
                variant="danger"
                onPress={() => setDeletingBroker(broker)}
              >
                <Trash2 className="size-4" />
                {t('CurrencyExchangeBrokers.delete')}
              </Button>
            </div>
          );
        },
        size: 180,
      }),
    ],
    [t, editingBroker?.id, setEditingBroker, setDeletingBroker]
  );
}

interface CurrencyExchangeBrokersSectionProps {
  brokers: CurrencyExchangeBroker[];
}

export function CurrencyExchangeBrokersSection({
  brokers,
}: CurrencyExchangeBrokersSectionProps) {
  const t = useTranslations('Admin.Settings');
  const router = useRouter();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingBroker, setEditingBroker] =
    useState<CurrencyExchangeBroker | null>(null);
  const [deletingBroker, setDeletingBroker] =
    useState<CurrencyExchangeBroker | null>(null);
  const [isPending, startTransition] = useTransition();

  const columns = useBrokerColumns(
    editingBroker,
    setEditingBroker,
    setDeletingBroker
  );

  const handleDeleteConfirm = () => {
    if (!deletingBroker) return;
    startTransition(async () => {
      await deleteCurrencyExchangeBrokerAction(deletingBroker.id);
      setDeletingBroker(null);
      router.refresh();
    });
  };

  return (
    <Card className="space-y-6">
      <SettingsSectionHeader
        title={t('CurrencyExchangeBrokers.title')}
        description={t('CurrencyExchangeBrokers.description')}
        actions={
          <AddCurrencyExchangeBrokerModal
            isOpen={addModalOpen}
            onOpenChange={setAddModalOpen}
            trigger={
              <Button variant="primary" onPress={() => setAddModalOpen(true)}>
                <Plus className="size-4" />
                {t('CurrencyExchangeBrokers.addBroker')}
              </Button>
            }
          />
        }
        className="mb-4"
      />
      {brokers.length === 0 ? (
        <p className="text-muted">
          {t('CurrencyExchangeBrokers.noBrokers')}
        </p>
      ) : (
        <DataTable<CurrencyExchangeBroker>
          columns={columns}
          data={brokers}
          searchPlaceholder={t('CurrencyExchangeBrokers.searchPlaceholder')}
        />
      )}
      <AlertDialog>
        <AlertDialog.Backdrop
          isOpen={!!deletingBroker}
          onOpenChange={(open) => !open && setDeletingBroker(null)}
        >
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[400px]">
              <AlertDialog.CloseTrigger />
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>
                  {t('CurrencyExchangeBrokers.deleteConfirmTitle')}
                </AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  {deletingBroker &&
                    t('CurrencyExchangeBrokers.deleteConfirm', {
                      name: deletingBroker.name,
                    })}
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button
                  slot="close"
                  variant="tertiary"
                  onPress={() => setDeletingBroker(null)}
                >
                  {t('CurrencyExchangeBrokers.cancel')}
                </Button>
                <Button
                  variant="danger"
                  isPending={isPending}
                  onPress={handleDeleteConfirm}
                >
                  {t('CurrencyExchangeBrokers.delete')}
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </Card>
  );
}
