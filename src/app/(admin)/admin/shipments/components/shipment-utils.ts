import type { getShipmentDetail } from '@/services/admin/shipments.service';

export type ShipmentDetail = NonNullable<Awaited<ReturnType<typeof getShipmentDetail>>>;

export const STATUS_COLORS: Record<string, 'default' | 'warning' | 'secondary' | 'primary' | 'success' | 'danger'> = {
  PENDING: 'default',
  PRODUCTION: 'warning',
  BOOKED: 'secondary',
  IN_TRANSIT: 'primary',
  CUSTOMS_CLEARANCE: 'warning',
  RELEASED: 'success',
  DELIVERED: 'success',
  FINISHED: 'success',
  CANCELED: 'danger',
};
