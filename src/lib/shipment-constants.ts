/**
 * Shared shipment step constants — safe to import from both server services
 * and client-side UI components.
 */

export const STEP_ORDER = [
  'CONTRACT_CREATION',
  'MERCHANDISE_PAYMENT',
  'SHIPPING_PREPARATION',
  'DOCUMENT_PREPARATION',
  'CUSTOMS_CLEARANCE',
  'COMPLETION',
] as const;

export type ShipmentStep = (typeof STEP_ORDER)[number];
