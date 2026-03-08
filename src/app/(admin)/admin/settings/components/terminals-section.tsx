'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { parseAsString, useQueryState } from 'nuqs';
import { Button, Card, Spinner } from '@heroui/react';
import { Plus, Pencil, Settings } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { createColumnHelper } from '@tanstack/react-table';
import { AddTerminalModal } from './add-terminal-modal';
import { EditTerminalModal } from './edit-terminal-modal';
import { TerminalEditForm } from '../terminals/[id]/terminal-edit-form';
import { getTerminalWithRulesAction } from '../terminals/[id]/actions';
import type { Terminal, TerminalWithRules } from '@/services/admin';

const terminalColumnHelper = createColumnHelper<Terminal>();

function useTerminalColumns(
  editingTerminal: Terminal | null,
  setEditingTerminal: (terminal: Terminal | null) => void,
  onConfigure: (id: string) => void
) {
  const t = useTranslations('Admin.Settings');

  return useMemo(
    () => [
      terminalColumnHelper.accessor('name', {
        header: t('Terminals.columns.name'),
        cell: (info) => (
          <span className="font-medium">{info.getValue()}</span>
        ),
      }),
      terminalColumnHelper.accessor('code', {
        header: t('Terminals.columns.code'),
        cell: (info) => (
          <span className="font-mono text-sm text-muted">
            {info.getValue() ?? '—'}
          </span>
        ),
      }),
      terminalColumnHelper.display({
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: (info) => {
          const term = info.row.original;
          return (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onPress={() => onConfigure(term.id)}
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
          );
        },
        size: 220,
      }),
    ],
    [t, editingTerminal?.id, setEditingTerminal, onConfigure]
  );
}

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

  const handleConfigure = useCallback((id: string) => setTerminalId(id), [setTerminalId]);
  const handleBack = () => setTerminalId(null);
  const handleRefreshTerminal = () => terminalId && fetchTerminal(terminalId);

  const columns = useTerminalColumns(editingTerminal, setEditingTerminal, handleConfigure);

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
          {terminals.length === 0 ? (
            <p className="text-muted">{t('Terminals.noTerminals')}</p>
          ) : (
            <DataTable<Terminal>
              columns={columns}
              data={terminals}
              searchPlaceholder={t('Terminals.searchPlaceholder')}
            />
          )}
        </>
      )}
    </Card>
  );
}
