'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button, Dropdown, Label } from '@heroui/react';
import { MoreHorizontal, Trash2, Eye } from 'lucide-react';
import Link from 'next/link';
import type { Simulation } from '@/services/simulation.service';

const columnHelper = createColumnHelper<Simulation>();

interface SimulationColumnsActions {
  onDelete: (simulation: Simulation) => void;
}

function SimulationRowActions({
  simulation,
  onDelete,
}: {
  simulation: Simulation;
  onDelete: (simulation: Simulation) => void;
}) {
  const t = useTranslations('Simulations.Actions');
  const router = useRouter();

  function handleAction(key: string | number) {
    if (key === 'view') router.push(`/dashboard/simulations/${simulation.id}`);
    if (key === 'delete') onDelete(simulation);
  }

  return (
    <Dropdown>
      <Button
        aria-label={t('label')}
        variant="ghost"
        size="sm"
        isIconOnly
      >
        <MoreHorizontal className="size-4" />
      </Button>
      <Dropdown.Popover>
        <Dropdown.Menu onAction={(key) => handleAction(key)}>
          <Dropdown.Item id="view" textValue={t('view')}>
            <Eye className="size-4" />
            <Label>{t('view')}</Label>
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

export function getSimulationColumns(
  t: ReturnType<typeof useTranslations<'Simulations.Columns'>>,
  tStatus: ReturnType<typeof useTranslations<'Simulations.Status'>>,
  actions: SimulationColumnsActions
) {
  return [
    columnHelper.accessor('name', {
      header: t('name'),
      cell: (info) => (
        <Link
          href={`/dashboard/simulations/${info.row.original.id}`}
          className="font-medium hover:underline text-primary"
        >
          {info.getValue()}
        </Link>
      ),
    }),
    columnHelper.accessor('status', {
      header: t('status'),
      cell: (info) => {
        const status = info.getValue();
        return (
          <span className="text-sm text-muted">
            {status ? tStatus(status as 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'PENDING_SIGNATURE' | 'CONVERTED') : '—'}
          </span>
        );
      },
    }),
    columnHelper.accessor('updatedAt', {
      header: t('updatedAt'),
      cell: (info) => {
        const date = info.getValue();
        if (!date) return '—';
        return new Date(date).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => (
        <SimulationRowActions
          simulation={info.row.original}
          onDelete={actions.onDelete}
        />
      ),
      size: 50,
    }),
  ];
}
