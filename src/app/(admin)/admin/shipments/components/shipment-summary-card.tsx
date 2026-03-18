'use client';

import { useTranslations } from 'next-intl';
import { Chip } from '@heroui/react';
import { DollarSign, Percent, CalendarClock, Ship } from 'lucide-react';
import { STATUS_COLORS } from './shipment-utils';

// ============================================
// Props
// ============================================

interface ShipmentSummaryCardProps {
  totalProductsUsd: string | null;
  totalPaidUsd?: string | null;
  eta: Date | null | undefined;
  shipmentType: string;
  status: string;
  orderType: string;
}

// ============================================
// Helpers
// ============================================

function formatUsd(value: string | null | undefined): string {
  if (!value) return '—';
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(value: Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function calcPaidPercent(
  totalProductsUsd: string | null | undefined,
  totalPaidUsd: string | null | undefined,
): string {
  const total = parseFloat(totalProductsUsd ?? '0');
  const paid = parseFloat(totalPaidUsd ?? '0');
  if (!total || total === 0) return '—';
  return `${((paid / total) * 100).toFixed(0)}%`;
}

// ============================================
// Component
// ============================================

export function ShipmentSummaryCard({
  totalProductsUsd,
  totalPaidUsd,
  eta,
  shipmentType,
  status,
  orderType,
}: ShipmentSummaryCardProps) {
  const t = useTranslations('Admin.Shipments.Summary');
  const tStatus = useTranslations('Shipments.Status');

  const statusColor = STATUS_COLORS[status] ?? 'default';
  const isFinished = status === 'FINISHED';

  return (
    <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-default-50 border border-default-200">
      {/* FOB Total */}
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center h-7 w-7 rounded-full bg-default-100 text-default-500">
          <DollarSign className="h-3.5 w-3.5" />
        </span>
        <div className="flex flex-col">
          <span className="text-xs text-default-400">{t('fobTotal')}</span>
          <span className="text-sm font-semibold text-default-700">{formatUsd(totalProductsUsd)}</span>
        </div>
      </div>

      {/* % Paid */}
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center h-7 w-7 rounded-full bg-default-100 text-default-500">
          <Percent className="h-3.5 w-3.5" />
        </span>
        <div className="flex flex-col">
          <span className="text-xs text-default-400">{t('paid')}</span>
          <span className="text-sm font-semibold text-default-700">
            {calcPaidPercent(totalProductsUsd, totalPaidUsd)}
          </span>
        </div>
      </div>

      {/* ETA */}
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center h-7 w-7 rounded-full bg-default-100 text-default-500">
          <CalendarClock className="h-3.5 w-3.5" />
        </span>
        <div className="flex flex-col">
          <span className="text-xs text-default-400">{t('eta')}</span>
          <span className="text-sm font-semibold text-default-700">{formatDate(eta)}</span>
        </div>
      </div>

      {/* Modality */}
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center h-7 w-7 rounded-full bg-default-100 text-default-500">
          <Ship className="h-3.5 w-3.5" />
        </span>
        <div className="flex flex-col">
          <span className="text-xs text-default-400">{t('modality')}</span>
          <span className="text-sm font-semibold text-default-700">{shipmentType.replace(/_/g, ' ')}</span>
        </div>
      </div>

      {/* Status chip + Type chip */}
      <div className="flex items-center gap-2 ml-auto">
        <Chip
          color={statusColor}
          variant={isFinished ? 'tertiary' : 'soft'}
          size="sm"
        >
          {tStatus(status)}
        </Chip>

        <Chip
          color={orderType === 'ORDER' ? 'warning' : 'default'}
          variant="secondary"
          size="sm"
        >
          {orderType}
        </Chip>
      </div>
    </div>
  );
}
