'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createColumnHelper } from '@tanstack/react-table';
import { Chip } from '@heroui/react';

import {
  DataTable,
  facetedFilterFn,
  type FacetedFilterDef,
} from '@/components/ui/data-table';
import { type getAllShipments } from '@/services/admin';
import { STATUS_COLORS } from './shipment-utils';

// ============================================
// Types
// ============================================

type ShipmentRow = Awaited<ReturnType<typeof getAllShipments>>[number];

const columnHelper = createColumnHelper<ShipmentRow>();

// ============================================
// Helpers
// ============================================

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ============================================
// Props
// ============================================

interface ShipmentsPageContentProps {
  shipments: Awaited<ReturnType<typeof getAllShipments>>;
}

// ============================================
// Component
// ============================================

export function ShipmentsPageContent({ shipments }: ShipmentsPageContentProps) {
  const router = useRouter();
  const t = useTranslations('Admin.Shipments.List');
  const tStepper = useTranslations('Admin.Shipments.Stepper');
  const tStatus = useTranslations('Shipments.Status');

  const columns = [
    columnHelper.accessor('code', {
      header: t('columns.code'),
      cell: (info) => {
        const code = info.getValue();
        return <span className="font-mono text-sm">#{code}</span>;
      },
    }),
    columnHelper.accessor((row) => row.clientOrganization?.name ?? '—', {
      id: 'client',
      header: t('columns.client'),
      cell: (info) => <span>{info.getValue()}</span>,
    }),
    columnHelper.accessor('status', {
      header: t('columns.status'),
      filterFn: facetedFilterFn,
      cell: (info) => {
        const status = info.getValue();
        const color = STATUS_COLORS[status] ?? 'default';
        const isFinished = status === 'FINISHED';
        return (
          <Chip
            color={color}
            variant={isFinished ? 'tertiary' : 'soft'}
            size="sm"
          >
            {tStatus(status)}
          </Chip>
        );
      },
    }),
    columnHelper.accessor('currentStep', {
      header: t('columns.step'),
      filterFn: facetedFilterFn,
      cell: (info) => {
        const step = info.getValue();
        return <span className="text-sm">{tStepper(step)}</span>;
      },
    }),
    columnHelper.accessor((row) => row.clientOrganization?.orderType ?? '—', {
      id: 'type',
      header: t('columns.type'),
      filterFn: facetedFilterFn,
      cell: (info) => <span className="text-sm">{info.getValue()}</span>,
    }),
    columnHelper.accessor('eta', {
      header: t('columns.eta'),
      cell: (info) => <span className="text-sm">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.accessor('bookingNumber', {
      header: t('columns.booking'),
      cell: (info) => {
        const val = info.getValue();
        return <span className="text-sm font-mono">{val ?? '—'}</span>;
      },
    }),
    columnHelper.accessor('createdAt', {
      header: t('columns.created'),
      cell: (info) => <span className="text-sm">{formatDate(info.getValue())}</span>,
    }),
  ];

  const facetedFilters: FacetedFilterDef[] = [
    {
      columnId: 'status',
      title: t('filters.status'),
      options: [
        { value: 'PENDING', label: tStatus('PENDING') },
        { value: 'PRODUCTION', label: tStatus('PRODUCTION') },
        { value: 'BOOKED', label: tStatus('BOOKED') },
        { value: 'IN_TRANSIT', label: tStatus('IN_TRANSIT') },
        { value: 'CUSTOMS_CLEARANCE', label: tStatus('CUSTOMS_CLEARANCE') },
        { value: 'RELEASED', label: tStatus('RELEASED') },
        { value: 'DELIVERED', label: tStatus('DELIVERED') },
        { value: 'FINISHED', label: tStatus('FINISHED') },
        { value: 'CANCELED', label: tStatus('CANCELED') },
      ],
    },
    {
      columnId: 'currentStep',
      title: t('filters.step'),
      options: [
        { value: 'CONTRACT_CREATION', label: tStepper('CONTRACT_CREATION') },
        { value: 'MERCHANDISE_PAYMENT', label: tStepper('MERCHANDISE_PAYMENT') },
        { value: 'SHIPPING_PREPARATION', label: tStepper('SHIPPING_PREPARATION') },
        { value: 'DOCUMENT_PREPARATION', label: tStepper('DOCUMENT_PREPARATION') },
        { value: 'CUSTOMS_CLEARANCE', label: tStepper('CUSTOMS_CLEARANCE') },
        { value: 'COMPLETION', label: tStepper('COMPLETION') },
      ],
    },
    {
      columnId: 'type',
      title: t('filters.type'),
      options: [
        { value: 'ORDER', label: 'ORDER' },
        { value: 'DIRECT_ORDER', label: 'DIRECT_ORDER' },
      ],
    },
  ];

  return (
    <div className="container mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted mt-1">{t('description')}</p>
      </div>

      <DataTable
        columns={columns}
        data={shipments}
        searchPlaceholder={t('empty')}
        facetedFilters={facetedFilters}
        onRowClick={(row) => router.push(`/admin/shipments/${row.id}`)}
      />
    </div>
  );
}
