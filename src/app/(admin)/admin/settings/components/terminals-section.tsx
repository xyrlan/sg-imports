'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { parseAsString, useQueryState } from 'nuqs';
import { Button, Card, Spinner } from '@heroui/react';
import { Plus, Pencil, Settings, Building2 } from 'lucide-react';
import { AddTerminalModal } from './add-terminal-modal';
import { EditTerminalModal } from './edit-terminal-modal';
import { TerminalEditForm } from '../terminals/[id]/terminal-edit-form';
import { getTerminalWithRulesAction } from '../terminals/[id]/actions';
import type { Terminal, TerminalWithRules } from '@/services/admin';

interface TerminalsSectionProps {
  terminals: Terminal[];
}

export function TerminalsSection({ terminals }: TerminalsSectionProps) {
  const t = useTranslations('Admin.Settings');
  const [terminalId, setTerminalId] = useQueryState('terminalId', parseAsString.withDefault(''));
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingTerminal, setEditingTerminal] = useState<Terminal | null>(null);
  const [selectedTerminal, setSelectedTerminal] = useState<TerminalWithRules | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTerminal = useCallback((id: string) => {
    setLoading(true);
    return getTerminalWithRulesAction(id)
      .then((terminal) => {
        setSelectedTerminal(terminal ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!terminalId) {
      queueMicrotask(() => {
        setSelectedTerminal(null);
        setLoading(false);
      });
      return;
    }
    queueMicrotask(() => fetchTerminal(terminalId));
  }, [terminalId, fetchTerminal]);

  const handleConfigure = (id: string) => setTerminalId(id);
  const handleBack = () => setTerminalId(null);
  const handleRefreshTerminal = () => terminalId && fetchTerminal(terminalId);

  const showEditForm = !!selectedTerminal;

  return (
    <Card className="p-6">
      {showEditForm ? (
        <TerminalEditForm
          terminal={selectedTerminal}
          onBack={handleBack}
          onRefresh={handleRefreshTerminal}
        />
      ) : terminalId && loading ? (
        <div className="flex justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
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
                  className="flex items-center justify-between p-3 rounded-lg bg-default-100 hover:bg-accent-soft-hover duration-200"
                >
                  <div className='flex items-center gap-2'>
                    <Building2 className="size-4" />
                    <span className="font-medium">{term.name}</span>
                    {term.code && (
                      <span className="text-sm text-muted ml-2">({term.code})</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => handleConfigure(term.id)}
                    >
                      <Settings className="size-4" />
                      {t('Terminals.configure')}
                    </Button>
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
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}
