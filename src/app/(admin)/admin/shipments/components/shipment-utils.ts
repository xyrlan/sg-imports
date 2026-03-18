import type { getShipmentDetail } from '@/services/admin/shipments.service';
import { STEP_ORDER, type ShipmentStep } from '@/lib/shipment-constants';

export type ShipmentDetail = NonNullable<Awaited<ReturnType<typeof getShipmentDetail>>>;

export const STATUS_COLORS: Record<string, 'default' | 'warning' | 'accent' | 'success' | 'danger'> = {
  PENDING: 'default',
  PRODUCTION: 'warning',
  BOOKED: 'accent',
  IN_TRANSIT: 'accent',
  CUSTOMS_CLEARANCE: 'warning',
  RELEASED: 'success',
  DELIVERED: 'success',
  FINISHED: 'success',
  CANCELED: 'danger',
};

// Re-export shared constants so consumers can import from one place
export { STEP_ORDER, type ShipmentStep };

// ============================================
// Shared Formatters
// ============================================

/** Format date as DD/MM/YYYY for Brazilian display */
export function formatDateBR(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('pt-BR');
}

/** Format BRL currency value */
export function formatBrl(value: string | number | null | undefined): string {
  if (value == null) return 'R$ 0,00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Format USD currency value */
export function formatUsd(value: string | number | null | undefined): string {
  if (value == null) return '$0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}
