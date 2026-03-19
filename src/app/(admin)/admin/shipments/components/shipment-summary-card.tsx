'use client';

import { useTranslations } from 'next-intl';
import { Chip, Surface } from '@heroui/react';
import { DollarSign, Percent, CalendarClock, Ship } from 'lucide-react';
import { STATUS_COLORS, formatDateBR, formatUsd } from './shipment-utils';

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
    <Surface variant="transparent" className="p-4 flex flex-wrap gap-8">
      {/* FOB Total */}
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center h-7 w-7 rounded-full bg-default-100 text-muted">
          <DollarSign className="h-3.5 w-3.5" />
        </span>
        <div className="flex flex-col">
          <span className="text-xs text-muted">{t('fobTotal')}</span>
          <span className="text-sm font-semibold text-foreground">{formatUsd(totalProductsUsd)}</span>
        </div>
      </div>

      {/* % Paid */}
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center h-7 w-7 rounded-full bg-default-100 text-muted">
          <Percent className="h-3.5 w-3.5" />
        </span>
        <div className="flex flex-col">
          <span className="text-xs text-muted">{t('paid')}</span>
          <span className="text-sm font-semibold text-foreground">
            {calcPaidPercent(totalProductsUsd, totalPaidUsd)}
          </span>
        </div>
      </div>

      {/* ETA */}
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center h-7 w-7 rounded-full bg-default-100 text-muted">
          <CalendarClock className="h-3.5 w-3.5" />
        </span>
        <div className="flex flex-col">
          <span className="text-xs text-muted">{t('eta')}</span>
          <span className="text-sm font-semibold text-foreground">{formatDateBR(eta)}</span>
        </div>
      </div>

      {/* Modality */}
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center h-7 w-7 rounded-full bg-default-100 text-muted">
          <Ship className="h-3.5 w-3.5" />
        </span>
        <div className="flex flex-col">
          <span className="text-xs text-muted">{t('modality')}</span>
          <span className="text-sm font-semibold text-foreground">{shipmentType.replace(/_/g, ' ')}</span>
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
    </Surface>
  );
}
