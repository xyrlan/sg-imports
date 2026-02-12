'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { AlertDialog, Button, Card } from '@heroui/react';
import { Plus, Pencil, Trash2, Landmark } from 'lucide-react';
import { AddCurrencyExchangeBrokerModal } from './add-currency-exchange-broker-modal';
import { EditCurrencyExchangeBrokerModal } from './edit-currency-exchange-broker-modal';
import { deleteCurrencyExchangeBrokerAction } from '../actions';
import type { CurrencyExchangeBroker } from '@/services/admin';

interface CurrencyExchangeBrokersSectionProps {
  brokers: CurrencyExchangeBroker[];
}

export function CurrencyExchangeBrokersSection({
  brokers,
}: CurrencyExchangeBrokersSectionProps) {
  const t = useTranslations('Admin.Settings');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingBroker, setEditingBroker] =
    useState<CurrencyExchangeBroker | null>(null);
  const [deletingBroker, setDeletingBroker] =
    useState<CurrencyExchangeBroker | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDeleteConfirm = () => {
    if (!deletingBroker) return;
    startTransition(async () => {
      await deleteCurrencyExchangeBrokerAction(deletingBroker.id);
      setDeletingBroker(null);
    });
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">
            {t('CurrencyExchangeBrokers.title')}
          </h2>
          <p className="text-sm text-muted">
            {t('CurrencyExchangeBrokers.description')}
          </p>
        </div>
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
      </div>
      {brokers.length === 0 ? (
        <p className="text-muted">
          {t('CurrencyExchangeBrokers.noBrokers')}
        </p>
      ) : (
        <ul className="space-y-2">
          {brokers.map((broker) => (
            <li
              key={broker.id}
              className="flex items-center justify-between p-3 rounded-lg bg-default-100 hover:bg-accent-soft-hover duration-200"
            >
              <div className="flex items-center gap-2">
                <Landmark className="size-4" />
                <span className="font-medium">{broker.name}</span>
              </div>
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
            </li>
          ))}
        </ul>
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
