'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card } from '@heroui/react';
import { Plus, Pencil } from 'lucide-react';
import { AddTerminalModal } from './add-terminal-modal';
import { EditTerminalModal } from './edit-terminal-modal';
import type { Terminal } from '@/services/admin';

interface TerminalsSectionProps {
  terminals: Terminal[];
}

export function TerminalsSection({ terminals }: TerminalsSectionProps) {
  const t = useTranslations('Admin.Settings');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<Terminal | null>(null);

  return (
    <Card className="p-6">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t('Terminals.title')}</h2>
          <p className="text-sm text-muted">{t('Terminals.description')}</p>
        </div>
        <div className="flex justify-between items-center">
          <AddTerminalModal
            isOpen={addModalOpen}
            onOpenChange={setAddModalOpen}
            trigger={
              <Button variant="primary" onPress={() => setAddModalOpen(true)}>
                <Plus className="size-4" />
                {t('Terminals.addTerminal')}
              </Button>
            }
          />
        </div>
      </div>
      {terminals.length === 0 ? (
        <p className="text-muted">{t('Terminals.noTerminals')}</p>
      ) : (
        <ul className="space-y-2">
          {terminals.map((term) => (
            <li
              key={term.id}
              className="flex items-center justify-between p-3 rounded-lg bg-default-100"
            >
              <div>
                <span className="font-medium">{term.name}</span>
                {term.code && (
                  <span className="text-sm text-muted ml-2">({term.code})</span>
                )}
              </div>
              <EditTerminalModal
                key={`${term.id}-${editingTerminal?.id === term.id}`}
                terminal={term}
                isOpen={editingTerminal?.id === term.id}
                onOpenChange={(open) => setEditingTerminal(open ? term : null)}
                trigger={
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => setEditingTerminal(term)}
                  >
                    <Pencil className="size-4" />
                    {t('Terminals.edit')}
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
