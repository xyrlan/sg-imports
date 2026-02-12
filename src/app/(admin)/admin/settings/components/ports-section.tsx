'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { AlertDialog, Button, Card } from '@heroui/react';
import { Plus, Pencil, Trash2, Anchor } from 'lucide-react';
import { AddPortModal } from './add-port-modal';
import { EditPortModal } from './edit-port-modal';
import { deletePortAction } from '../actions';
import type { Port } from '@/services/admin';

interface PortsSectionProps {
  ports: Port[];
}

export function PortsSection({ ports }: PortsSectionProps) {
  const t = useTranslations('Admin.Settings');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingPort, setEditingPort] = useState<Port | null>(null);
  const [deletingPort, setDeletingPort] = useState<Port | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleDeleteConfirm = () => {
    if (!deletingPort) return;
    startTransition(async () => {
      await deletePortAction(deletingPort.id);
      setDeletingPort(null);
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
        <ul className="space-y-2">
          {ports.map((port) => (
            <li
              key={port.id}
              className="flex items-center justify-between p-3 rounded-lg bg-default-100 hover:bg-accent-soft-hover duration-200"
            >
              <div className="flex items-center gap-2">
                <Anchor className="size-4" />
                <span className="font-medium">{port.name}</span>
                <span className="text-sm text-muted">({port.code})</span>
                <span className="text-sm text-muted">— {port.country}</span>
              </div>
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
            </li>
          ))}
        </ul>
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
