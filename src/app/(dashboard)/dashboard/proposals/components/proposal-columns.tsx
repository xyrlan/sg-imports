'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { useTranslations } from 'next-intl';
import { Chip } from '@heroui/react';
import Link from 'next/link';
import type { ProposalWithSeller } from '@/services/simulation.service';

const columnHelper = createColumnHelper<ProposalWithSeller>();

const statusColorMap: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
  APPROVED: 'success',
  REJECTED: 'danger',
  PENDING_SIGNATURE: 'warning',
  CONVERTED: 'default',
};

export function getProposalColumns(
  t: ReturnType<typeof useTranslations<'Proposals.Columns'>>,
  tStatus: ReturnType<typeof useTranslations<'Proposals.Status'>>
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
    columnHelper.accessor('sellerOrganization', {
      header: t('seller'),
      cell: (info) => (
        <span className="text-sm">{info.getValue()?.name ?? '—'}</span>
      ),
    }),
    columnHelper.accessor('createdAt', {
      header: t('receivedAt'),
      cell: (info) => {
        const date = info.getValue();
        if (!date) return '—';
        return new Date(date).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      },
    }),
    columnHelper.accessor('status', {
      header: t('status'),
      cell: (info) => {
        const status = info.getValue();
        const color = statusColorMap[status] ?? 'default';
        return (
          <Chip size="sm" color={color as 'success' | 'danger' | 'warning' | 'default'} variant="soft">
            {tStatus(status as 'APPROVED' | 'REJECTED' | 'PENDING_SIGNATURE' | 'CONVERTED')}
          </Chip>
        );
      },
    }),
  ];
}
