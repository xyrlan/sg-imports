/**
 * Shipment Workflow Service — step transitions, payments, invoices, and cancellation.
 */

import { db } from '@/db';
import { shipments, shipmentStepHistory, transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import { getTotalMerchandisePaidBrl } from '@/services/shipment.service';

// ==========================================
// STEP MACHINE CONSTANTS
// ==========================================

/** Map from step to the shipment status it implies */
const STEP_TO_STATUS = {
  CONTRACT_CREATION: 'PENDING',
  MERCHANDISE_PAYMENT: 'PRODUCTION',
  SHIPPING_PREPARATION: 'BOOKED',
  DOCUMENT_PREPARATION: 'IN_TRANSIT',
  CUSTOMS_CLEARANCE: 'CUSTOMS_CLEARANCE',
  COMPLETION: 'DELIVERED',
} as const;

const STEP_ORDER = [
  'CONTRACT_CREATION',
  'MERCHANDISE_PAYMENT',
  'SHIPPING_PREPARATION',
  'DOCUMENT_PREPARATION',
  'CUSTOMS_CLEARANCE',
  'COMPLETION',
] as const;

type ShipmentStep = (typeof STEP_ORDER)[number];

function getNextStep(current: ShipmentStep): ShipmentStep | null {
  const idx = STEP_ORDER.indexOf(current);
  return idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : null;
}

// ==========================================
// STEP TRANSITIONS
// ==========================================

/**
 * Advance shipment to the next step.
 * Idempotent — checks current state before writing.
 */
export async function advanceStep(
  shipmentId: string,
  expectedCurrentStep: ShipmentStep,
  completedById?: string
) {
  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.id, shipmentId),
    columns: { currentStep: true, status: true },
  });

  if (!shipment) throw new Error(`Shipment ${shipmentId} not found`);
  if (shipment.currentStep !== expectedCurrentStep) {
    return { advanced: false, currentStep: shipment.currentStep };
  }

  const nextStep = getNextStep(expectedCurrentStep);
  if (!nextStep) throw new Error(`No next step after ${expectedCurrentStep}`);

  const newStatus = STEP_TO_STATUS[nextStep];

  await db.transaction(async (tx) => {
    await tx.insert(shipmentStepHistory).values({
      shipmentId,
      step: expectedCurrentStep,
      status: 'COMPLETED',
      completedAt: new Date(),
      completedById: completedById ?? null,
    });

    await tx.insert(shipmentStepHistory).values({
      shipmentId,
      step: nextStep,
      status: 'PENDING',
    });

    await tx
      .update(shipments)
      .set({ currentStep: nextStep, status: newStatus, updatedAt: new Date() })
      .where(eq(shipments.id, shipmentId));
  });

  return { advanced: true, currentStep: nextStep, status: newStatus };
}

// ==========================================
// INVOICE GENERATION
// ==========================================

/**
 * Generate initial FOB advance invoice on shipment creation.
 * Percentage is driven by fobAdvancePercentage on the shipment record.
 */
export async function generateInitialFobInvoice(shipmentId: string) {
  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.id, shipmentId),
    with: { clientOrganization: { columns: { id: true, orderType: true } } },
    columns: {
      id: true,
      totalProductsUsd: true,
      fobAdvancePercentage: true,
      clientOrganizationId: true,
    },
  });

  if (!shipment) throw new Error(`Shipment ${shipmentId} not found`);

  const fobUsd = parseFloat(shipment.totalProductsUsd ?? '0');
  const advancePct = parseFloat(shipment.fobAdvancePercentage ?? '30');
  const advanceUsd = roundBrl(fobUsd * (advancePct / 100));

  // Both ORDER and DIRECT_ORDER create a MERCHANDISE transaction.
  // Asaas invoice generation for ORDER type is deferred to Phase 2.
  return createShipmentTransaction({
    shipmentId,
    organizationId: shipment.clientOrganizationId,
    type: 'MERCHANDISE',
    amountUsd: String(advanceUsd),
  });
}

/**
 * Generate 90% remaining invoice for customs clearance step.
 * Calculates: (totalCostsBrl - alreadyPaidBrl) * 0.90
 */
export async function generate90Invoice(shipmentId: string) {
  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.id, shipmentId),
    with: { clientOrganization: { columns: { id: true, orderType: true } } },
    columns: {
      id: true,
      totalCostsBrl: true,
      clientOrganizationId: true,
    },
  });

  if (!shipment) throw new Error(`Shipment ${shipmentId} not found`);

  const totalCostsBrl = parseFloat(shipment.totalCostsBrl ?? '0');
  const totalPaidBrl = await getTotalMerchandisePaidBrl(shipmentId);
  const remainingValue = totalCostsBrl - totalPaidBrl;
  const invoice90 = roundBrl(remainingValue * 0.9);

  return createShipmentTransaction({
    shipmentId,
    organizationId: shipment.clientOrganizationId,
    type: 'BALANCE',
    amountBrl: String(invoice90),
  });
}

// ==========================================
// TRANSACTION MANAGEMENT
// ==========================================

/** Create a transaction for a shipment payment */
export async function createShipmentTransaction(params: {
  shipmentId: string;
  organizationId: string;
  type: 'MERCHANDISE' | 'BALANCE' | 'FREIGHT' | 'TAXES' | 'SERVICE_FEE';
  amountBrl?: string;
  amountUsd?: string;
  exchangeRate?: string;
  gatewayId?: string;
  gatewayUrl?: string;
}) {
  const [txn] = await db
    .insert(transactions)
    .values({
      shipmentId: params.shipmentId,
      organizationId: params.organizationId,
      type: params.type,
      status: 'PENDING',
      amountBrl: params.amountBrl,
      amountUsd: params.amountUsd,
      exchangeRate: params.exchangeRate,
      gatewayId: params.gatewayId,
      gatewayUrl: params.gatewayUrl,
    })
    .returning();

  return txn;
}

/**
 * Mark transaction as paid and dispatch step evaluation via Inngest.
 */
export async function markTransactionPaid(transactionId: string, shipmentId: string) {
  await db
    .update(transactions)
    .set({ status: 'PAID', paidAt: new Date() })
    .where(eq(transactions.id, transactionId));

  await inngest.send({
    name: 'shipment/step.evaluate',
    data: { shipmentId },
  });
}

// ==========================================
// SHIPMENT LIFECYCLE
// ==========================================

/**
 * Cancel a shipment at any step.
 * Idempotent — returns early if already canceled.
 */
export async function cancelShipment(
  shipmentId: string,
  reason: string,
  cancelledById: string
) {
  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.id, shipmentId),
    columns: { currentStep: true, status: true },
  });

  if (!shipment) throw new Error(`Shipment ${shipmentId} not found`);
  if (shipment.status === 'CANCELED') return { success: true, alreadyCanceled: true };

  await db.transaction(async (tx) => {
    await tx.insert(shipmentStepHistory).values({
      shipmentId,
      step: shipment.currentStep,
      status: 'FAILED',
      completedAt: new Date(),
      completedById: cancelledById,
      metadata: { cancellationReason: reason },
    });

    await tx
      .update(shipments)
      .set({ status: 'CANCELED', updatedAt: new Date() })
      .where(eq(shipments.id, shipmentId));
  });

  return { success: true, alreadyCanceled: false };
}

/**
 * Finalize shipment — sets status to FINISHED.
 * Shipment must be in the COMPLETION step.
 */
export async function finalizeShipment(shipmentId: string, adminProfileId: string) {
  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.id, shipmentId),
    columns: { currentStep: true, status: true },
  });

  if (!shipment) throw new Error(`Shipment ${shipmentId} not found`);
  if (shipment.currentStep !== 'COMPLETION') {
    throw new Error('Shipment must be in COMPLETION step to finalize');
  }

  await db.transaction(async (tx) => {
    await tx.insert(shipmentStepHistory).values({
      shipmentId,
      step: 'COMPLETION',
      status: 'COMPLETED',
      completedAt: new Date(),
      completedById: adminProfileId,
    });

    await tx
      .update(shipments)
      .set({ status: 'FINISHED', updatedAt: new Date() })
      .where(eq(shipments.id, shipmentId));
  });

  return { success: true };
}

// ==========================================
// UTILITIES
// ==========================================

/**
 * Banker's rounding (round half to even) for BRL monetary values.
 * Avoids systematic rounding bias on .5 cases.
 */
function roundBrl(value: number): number {
  const factor = 100;
  const shifted = value * factor;
  const floored = Math.floor(shifted);
  const decimal = shifted - floored;
  if (decimal > 0.5) return (floored + 1) / factor;
  if (decimal < 0.5) return floored / factor;
  // Exactly 0.5 — round to nearest even
  return (floored % 2 === 0 ? floored : floored + 1) / factor;
}
