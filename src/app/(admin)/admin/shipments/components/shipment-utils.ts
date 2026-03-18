import type { getShipmentDetail } from '@/services/admin/shipments.service';

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
