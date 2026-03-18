'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import {
  advanceStep,
  cancelShipment as cancelShipmentService,
  finalizeShipment as finalizeShipmentService,
  createShipmentTransaction,
  markTransactionPaid,
  generate90Invoice,
} from '@/services/shipment-workflow.service';
import { getSuperAdminUser } from '@/services/auth.service';
import { uploadShipmentDocument } from '@/services/shipment-documents.service';
import { calculateServiceFee } from '@/services/service-fee.service';
import { generateAsaasInvoice } from '@/services/asaas.service';
import { db } from '@/db';
import { shipments, exchangeContracts, shipmentFreightReceipts, transactions, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { inngest } from '@/inngest/client';
import * as shipsGo from '@/lib/shipsgo/client';
import { z } from 'zod';

// ============================================
// Schemas
// ============================================

const cancelShipmentSchema = z.object({
  shipmentId: z.string().uuid(),
  reason: z.string().min(1),
});

// ============================================
// State Types
// ============================================

export interface AdvanceShipmentStepState {
  success?: boolean;
  data?: { currentStep: string; status?: string };
  error?: string;
}

export interface CancelShipmentState {
  success?: boolean;
  error?: string;
}

export interface FinalizeShipmentState {
  success?: boolean;
  error?: string;
}

// ============================================
// Actions
// ============================================

/**
 * Advance shipment to the next step.
 * Requires SUPER_ADMIN role.
 */
export async function advanceShipmentStepAction(
  shipmentId: string,
  currentStep: string,
): Promise<AdvanceShipmentStepState> {
  const t = await getTranslations('Admin.Shipments.Errors');

  try {
    const { profile } = await getSuperAdminUser();

    const result = await advanceStep(
      shipmentId,
      currentStep as Parameters<typeof advanceStep>[1],
      profile.id,
    );

    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error advancing shipment step:', error);
    return { success: false, error: t('advanceFailed') };
  }
}

/**
 * Cancel a shipment with a reason.
 * Validates shipmentId (UUID) and reason (required) via Zod.
 * Requires SUPER_ADMIN role.
 */
export async function cancelShipmentAction(
  formData: FormData,
): Promise<CancelShipmentState> {
  const t = await getTranslations('Admin.Shipments.Errors');

  try {
    const { profile } = await getSuperAdminUser();

    const rawData = {
      shipmentId: formData.get('shipmentId') as string,
      reason: formData.get('reason') as string,
    };

    const validated = cancelShipmentSchema.safeParse(rawData);
    if (!validated.success) {
      const firstIssue = validated.error.issues[0];
      const isReasonError = firstIssue?.path.includes('reason');
      return { success: false, error: isReasonError ? t('reasonRequired') : t('invalidData') };
    }

    await cancelShipmentService(
      validated.data.shipmentId,
      validated.data.reason,
      profile.id,
    );

    revalidatePath(`/admin/shipments/${validated.data.shipmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error canceling shipment:', error);
    return { success: false, error: t('cancelFailed') };
  }
}

/**
 * Finalize a shipment (sets status to FINISHED).
 * Shipment must be in COMPLETION step.
 * Requires SUPER_ADMIN role.
 */
export async function finalizeShipmentAction(
  shipmentId: string,
): Promise<FinalizeShipmentState> {
  const t = await getTranslations('Admin.Shipments.Errors');

  try {
    const { profile } = await getSuperAdminUser();

    await finalizeShipmentService(shipmentId, profile.id);

    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error finalizing shipment:', error);
    return { success: false, error: t('finalizeFailed') };
  }
}

// ============================================
// Step 1 — Merchandise Payment Actions
// ============================================

/**
 * Update the production ready date for a shipment.
 */
export async function updateProductionReadyDateAction(
  shipmentId: string,
  date: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await getSuperAdminUser();

    await db
      .update(shipments)
      .set({ productionReadyDate: new Date(date), updatedAt: new Date() })
      .where(eq(shipments.id, shipmentId));

    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating production ready date:', error);
    return { success: false, error: 'Failed to update production ready date.' };
  }
}

/**
 * Generate a FOB invoice (MERCHANDISE transaction) for a given USD amount.
 * If the org is ORDER type, also creates an Asaas payment in BRL.
 */
export async function generateFobInvoiceAction(
  shipmentId: string,
  amountUsd: string,
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    await getSuperAdminUser();

    const shipment = await db.query.shipments.findFirst({
      where: eq(shipments.id, shipmentId),
      columns: { clientOrganizationId: true },
      with: {
        clientOrganization: { columns: { orderType: true } },
        quote: { columns: { exchangeRateIof: true } },
      },
    });

    if (!shipment) return { success: false, error: 'Shipment not found.' };

    const txn = await createShipmentTransaction({
      shipmentId,
      organizationId: shipment.clientOrganizationId,
      type: 'MERCHANDISE',
      amountUsd,
    });

    // Integrate with Asaas for ORDER-type organizations
    if (shipment.clientOrganization?.orderType === 'ORDER') {
      try {
        const exchangeRate = parseFloat(shipment.quote?.exchangeRateIof ?? '5.0');
        const amountBrl = parseFloat(amountUsd) * exchangeRate;

        const asaasResult = await generateAsaasInvoice({
          organizationId: shipment.clientOrganizationId,
          transactionId: txn.id,
          amountBrl,
          description: `Fatura FOB — Embarque ${shipmentId}`,
        });

        await db
          .update(transactions)
          .set({ gatewayId: asaasResult.gatewayId, gatewayUrl: asaasResult.gatewayUrl })
          .where(eq(transactions.id, txn.id));
      } catch (asaasError) {
        console.error('Asaas FOB invoice creation failed (non-blocking):', asaasError);
      }
    }

    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true, data: { id: txn.id } };
  } catch (error) {
    console.error('Error generating FOB invoice:', error);
    return { success: false, error: 'Failed to generate FOB invoice.' };
  }
}

const registerManualPaymentSchema = z.object({
  shipmentId: z.string().uuid(),
  amountUsd: z.string().min(1),
  paymentDate: z.string().min(1),
});

/**
 * Register a manual merchandise payment, mark it as paid, and optionally attach a proof file.
 */
export async function registerManualPaymentAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { profile } = await getSuperAdminUser();

    const validated = registerManualPaymentSchema.safeParse({
      shipmentId: formData.get('shipmentId'),
      amountUsd: formData.get('amountUsd'),
      paymentDate: formData.get('paymentDate'),
    });

    if (!validated.success) {
      return { success: false, error: 'Invalid payment data.' };
    }

    const { shipmentId, amountUsd, paymentDate } = validated.data;

    const shipment = await db.query.shipments.findFirst({
      where: eq(shipments.id, shipmentId),
      columns: { clientOrganizationId: true },
    });

    if (!shipment) return { success: false, error: 'Shipment not found.' };

    let proofUrl: string | undefined;
    const proofFile = formData.get('proofFile') as File | null;
    if (proofFile && proofFile.size > 0) {
      const doc = await uploadShipmentDocument({
        shipmentId,
        type: 'PAYMENT_PROOF',
        name: proofFile.name,
        file: proofFile,
        uploadedById: profile.id,
        metadata: { paymentDate },
      });
      proofUrl = doc.url;
    }

    const txn = await createShipmentTransaction({
      shipmentId,
      organizationId: shipment.clientOrganizationId,
      type: 'MERCHANDISE',
      amountUsd,
    });

    if (proofUrl) {
      await db
        .update(transactions)
        .set({ proofUrl })
        .where(eq(transactions.id, txn.id));
    }

    await markTransactionPaid(txn.id, shipmentId);

    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error registering manual payment:', error);
    return { success: false, error: 'Failed to register manual payment.' };
  }
}

const createExchangeContractSchema = z.object({
  transactionId: z.string().uuid(),
  shipmentId: z.string().uuid(),
  contractNumber: z.string().min(1),
  amountUsd: z.string().min(1),
  exchangeRate: z.string().min(1),
  closedAt: z.string().min(1),
  brokerId: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  brokerName: z.string().optional(),
  vetDate: z.string().optional(),
  effectiveRate: z.string().optional(),
});

/**
 * Create an exchange contract record, optionally uploading SWIFT/contract PDFs.
 */
export async function createExchangeContractAction(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { profile } = await getSuperAdminUser();

    const validated = createExchangeContractSchema.safeParse({
      transactionId: formData.get('transactionId'),
      shipmentId: formData.get('shipmentId'),
      contractNumber: formData.get('contractNumber'),
      amountUsd: formData.get('amountUsd'),
      exchangeRate: formData.get('exchangeRate'),
      closedAt: formData.get('closedAt'),
      brokerId: formData.get('brokerId') || undefined,
      supplierId: formData.get('supplierId') || undefined,
      brokerName: formData.get('brokerName') || undefined,
      vetDate: formData.get('vetDate') || undefined,
      effectiveRate: formData.get('effectiveRate') || undefined,
    });

    if (!validated.success) {
      return { success: false, error: 'Invalid exchange contract data.' };
    }

    const { shipmentId, transactionId, contractNumber, amountUsd, exchangeRate, closedAt, brokerId, supplierId, brokerName, vetDate, effectiveRate } = validated.data;

    let swiftFileUrl: string | undefined;
    let contractFileUrl: string | undefined;

    const swiftFile = formData.get('swiftFile') as File | null;
    if (swiftFile && swiftFile.size > 0) {
      const doc = await uploadShipmentDocument({
        shipmentId,
        type: 'SWIFT',
        name: swiftFile.name,
        file: swiftFile,
        uploadedById: profile.id,
      });
      swiftFileUrl = doc.url;
    }

    const contractFile = formData.get('contractFile') as File | null;
    if (contractFile && contractFile.size > 0) {
      const doc = await uploadShipmentDocument({
        shipmentId,
        type: 'EXCHANGE_CONTRACT',
        name: contractFile.name,
        file: contractFile,
        uploadedById: profile.id,
      });
      contractFileUrl = doc.url;
    }

    await db.insert(exchangeContracts).values({
      transactionId,
      contractNumber,
      amountUsd,
      exchangeRate,
      closedAt: new Date(closedAt),
      brokerId: brokerId ?? null,
      supplierId: supplierId ?? null,
      brokerName: brokerName ?? null,
      vetDate: vetDate ? new Date(vetDate) : null,
      effectiveRate: effectiveRate ?? null,
      swiftFileUrl: swiftFileUrl ?? null,
      contractFileUrl: contractFileUrl ?? null,
    });

    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error creating exchange contract:', error);
    return { success: false, error: 'Failed to create exchange contract.' };
  }
}

// ============================================
// Step 2 — Shipping Preparation Actions
// ============================================

/**
 * Update the booking number on a shipment.
 */
export async function updateBookingNumberAction(
  shipmentId: string,
  bookingNumber: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await getSuperAdminUser();

    await db
      .update(shipments)
      .set({ bookingNumber, updatedAt: new Date() })
      .where(eq(shipments.id, shipmentId));

    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating booking number:', error);
    return { success: false, error: 'Failed to update booking number.' };
  }
}

/**
 * Register the Master Bill of Lading and attempt to create a ShipsGo tracking entry.
 */
export async function registerMblAction(
  shipmentId: string,
  mbl: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await getSuperAdminUser();

    // Update MBL immediately
    await db
      .update(shipments)
      .set({ masterBl: mbl, updatedAt: new Date() })
      .where(eq(shipments.id, shipmentId));

    // Try to create ShipsGo tracking — requires carrier scacCode
    const shipment = await db.query.shipments.findFirst({
      where: eq(shipments.id, shipmentId),
      with: {
        freightReceipt: {
          with: { carrier: { columns: { scacCode: true } } },
        },
      },
      columns: { id: true },
    });

    const scacCode = shipment?.freightReceipt?.carrier?.scacCode;
    if (scacCode) {
      const trackingResult = await shipsGo.createTracking({
        containerOrBookingNumber: mbl,
        shippingLine: scacCode,
      });

      if (trackingResult.success) {
        await db
          .update(shipments)
          .set({
            shipsGoId: trackingResult.tracking.id,
            shipsGoTrackingUrl: trackingResult.tracking.trackingUrl,
            shipsGoLastUpdate: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(shipments.id, shipmentId));
      }
    }

    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error registering MBL:', error);
    return { success: false, error: 'Failed to register MBL.' };
  }
}

/**
 * Toggle whether the shipment is a part-lot (LCL).
 */
export async function togglePartLotAction(
  shipmentId: string,
  isPartLot: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    await getSuperAdminUser();

    await db
      .update(shipments)
      .set({ isPartLot, updatedAt: new Date() })
      .where(eq(shipments.id, shipmentId));

    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error toggling part lot:', error);
    return { success: false, error: 'Failed to update part lot setting.' };
  }
}

/**
 * Update the freight sell price on the shipment freight receipt.
 */
export async function updateFreightSellPriceAction(
  shipmentId: string,
  freightSellValue: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await getSuperAdminUser();

    await db
      .update(shipmentFreightReceipts)
      .set({ freightSellValue, updatedAt: new Date() })
      .where(eq(shipmentFreightReceipts.shipmentId, shipmentId));

    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating freight sell price:', error);
    return { success: false, error: 'Failed to update freight sell price.' };
  }
}

const uploadShipmentDocumentSchema = z.object({
  shipmentId: z.string().uuid(),
  type: z.string().min(1),
  name: z.string().min(1),
  supplierId: z.string().uuid().optional(),
});

/**
 * Generic document upload for any shipment step.
 */
export async function uploadShipmentDocumentAction(
  formData: FormData,
): Promise<{ success: boolean; data?: { id: string; url: string }; error?: string }> {
  try {
    const { profile } = await getSuperAdminUser();

    const validated = uploadShipmentDocumentSchema.safeParse({
      shipmentId: formData.get('shipmentId'),
      type: formData.get('type'),
      name: formData.get('name'),
      supplierId: formData.get('supplierId') || undefined,
    });

    if (!validated.success) {
      return { success: false, error: 'Invalid document upload data.' };
    }

    const { shipmentId, type, name, supplierId } = validated.data;

    const file = formData.get('file') as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: 'No file provided.' };
    }

    const metadata: Record<string, unknown> = {};
    if (supplierId) metadata.supplierId = supplierId;

    const doc = await uploadShipmentDocument({
      shipmentId,
      type,
      name,
      file,
      uploadedById: profile.id,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    });

    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true, data: { id: doc.id, url: doc.url } };
  } catch (error) {
    console.error('Error uploading shipment document:', error);
    return { success: false, error: 'Failed to upload document.' };
  }
}

// ============================================
// Step 4 — Customs Clearance Actions
// ============================================

/**
 * Generate the 90% balance invoice for customs clearance.
 * If the org is ORDER type, also creates an Asaas payment in BRL.
 */
export async function generate90InvoiceAction(
  shipmentId: string,
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    await getSuperAdminUser();

    const txn = await generate90Invoice(shipmentId);

    // Integrate with Asaas for ORDER-type organizations
    try {
      const shipment = await db.query.shipments.findFirst({
        where: eq(shipments.id, shipmentId),
        columns: { clientOrganizationId: true },
        with: { clientOrganization: { columns: { orderType: true } } },
      });

      if (shipment?.clientOrganization?.orderType === 'ORDER' && txn.amountBrl) {
        const asaasResult = await generateAsaasInvoice({
          organizationId: shipment.clientOrganizationId,
          transactionId: txn.id,
          amountBrl: parseFloat(txn.amountBrl),
          description: `Fatura 90% — Embarque ${shipmentId}`,
        });

        await db
          .update(transactions)
          .set({ gatewayId: asaasResult.gatewayId, gatewayUrl: asaasResult.gatewayUrl })
          .where(eq(transactions.id, txn.id));
      }
    } catch (asaasError) {
      console.error('Asaas 90% invoice creation failed (non-blocking):', asaasError);
    }

    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true, data: { id: txn.id } };
  } catch (error) {
    console.error('Error generating 90% invoice:', error);
    return { success: false, error: 'Failed to generate 90% invoice.' };
  }
}

/**
 * Register a DUIMP number: save it to the shipment and send an Inngest event
 * to trigger Siscomex data fetch.
 */
export async function registerDuimpAction(
  shipmentId: string,
  duimpNumber: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await getSuperAdminUser();

    await db
      .update(shipments)
      .set({ duimpNumber, updatedAt: new Date() })
      .where(eq(shipments.id, shipmentId));

    await inngest.send({
      name: 'shipment/duimp.registered',
      data: { shipmentId, duimpNumber },
    });

    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error registering DUIMP:', error);
    return { success: false, error: 'Failed to register DUIMP number.' };
  }
}

// ============================================
// Step 5 — Completion Actions
// ============================================

/**
 * Save completion-phase costs: ICMS exit taxes, storage cost, and discounts.
 */
export async function saveCompletionCostsAction(
  shipmentId: string,
  costs: { icmsExitTaxes: string; storageCost: string; discounts: string },
): Promise<{ success: boolean; error?: string }> {
  try {
    await getSuperAdminUser();

    await db
      .update(shipments)
      .set({
        icmsExitTaxes: costs.icmsExitTaxes,
        storageCost: costs.storageCost,
        discounts: costs.discounts,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, shipmentId));

    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error saving completion costs:', error);
    return { success: false, error: 'Failed to save completion costs.' };
  }
}

/**
 * Generate a balance invoice (BALANCE transaction) in BRL for the completion step.
 * If the org is ORDER type, also creates an Asaas payment in BRL.
 */
export async function generateBalanceInvoiceAction(
  shipmentId: string,
  amountBrl: string,
): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    await getSuperAdminUser();

    const shipment = await db.query.shipments.findFirst({
      where: eq(shipments.id, shipmentId),
      columns: { clientOrganizationId: true },
      with: { clientOrganization: { columns: { orderType: true } } },
    });

    if (!shipment) return { success: false, error: 'Shipment not found.' };

    const txn = await createShipmentTransaction({
      shipmentId,
      organizationId: shipment.clientOrganizationId,
      type: 'BALANCE',
      amountBrl,
    });

    // Integrate with Asaas for ORDER-type organizations
    if (shipment.clientOrganization?.orderType === 'ORDER') {
      try {
        const asaasResult = await generateAsaasInvoice({
          organizationId: shipment.clientOrganizationId,
          transactionId: txn.id,
          amountBrl: parseFloat(amountBrl),
          description: `Fatura Saldo — Embarque ${shipmentId}`,
        });

        await db
          .update(transactions)
          .set({ gatewayId: asaasResult.gatewayId, gatewayUrl: asaasResult.gatewayUrl })
          .where(eq(transactions.id, txn.id));
      } catch (asaasError) {
        console.error('Asaas balance invoice creation failed (non-blocking):', asaasError);
      }
    }

    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true, data: { id: txn.id } };
  } catch (error) {
    console.error('Error generating balance invoice:', error);
    return { success: false, error: 'Failed to generate balance invoice.' };
  }
}

/**
 * Calculate the service fee and generate a SERVICE_FEE transaction.
 */
export async function generateServiceFeeInvoiceAction(
  shipmentId: string,
): Promise<{ success: boolean; data?: { id: string; serviceFee: number }; error?: string }> {
  try {
    await getSuperAdminUser();

    const shipment = await db.query.shipments.findFirst({
      where: eq(shipments.id, shipmentId),
      columns: {
        clientOrganizationId: true,
        totalProductsUsd: true,
        totalCostsBrl: true,
      },
      with: {
        quote: { columns: { exchangeRateIof: true } },
      },
    });

    if (!shipment) return { success: false, error: 'Shipment not found.' };

    // Prefer the exchange rate recorded at simulation time (quote.exchangeRateIof).
    // Falls back to 5.0 only when no linked quote exists (edge case: manually created shipments).
    const exchangeRate = parseFloat(shipment.quote?.exchangeRateIof ?? '5.0');

    const feeResult = await calculateServiceFee({
      clientOrganizationId: shipment.clientOrganizationId,
      totalProductsUsd: parseFloat(shipment.totalProductsUsd ?? '0'),
      exchangeRate,
      totalCostsBrl: parseFloat(shipment.totalCostsBrl ?? '0'),
    });

    const txn = await createShipmentTransaction({
      shipmentId,
      organizationId: shipment.clientOrganizationId,
      type: 'SERVICE_FEE',
      amountBrl: String(feeResult.serviceFee),
    });

    // Integrate with Asaas for ORDER-type organizations
    const orgOrderType = await db.query.organizations.findFirst({
      where: eq(organizations.id, shipment.clientOrganizationId),
      columns: { orderType: true },
    });

    if (orgOrderType?.orderType === 'ORDER') {
      try {
        const asaasResult = await generateAsaasInvoice({
          organizationId: shipment.clientOrganizationId,
          transactionId: txn.id,
          amountBrl: feeResult.serviceFee,
          description: `Honorários — Embarque ${shipmentId}`,
        });

        await db
          .update(transactions)
          .set({ gatewayId: asaasResult.gatewayId, gatewayUrl: asaasResult.gatewayUrl })
          .where(eq(transactions.id, txn.id));
      } catch (asaasError) {
        console.error('Asaas service fee invoice creation failed (non-blocking):', asaasError);
      }
    }

    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true, data: { id: txn.id, serviceFee: feeResult.serviceFee } };
  } catch (error) {
    console.error('Error generating service fee invoice:', error);
    return { success: false, error: 'Failed to generate service fee invoice.' };
  }
}

// ============================================
// Item Editing Action
// ============================================

/**
 * Initiate an item edit for a shipment, triggering an Inngest workflow
 * that will generate a contractual amendment (aditivo) for ZapSign signature.
 */
export async function editShipmentItemsAction(
  shipmentId: string,
  changes: Array<{
    type: 'ADD' | 'REMOVE' | 'UPDATE';
    quoteItemId?: string;
    variantId?: string;
    quantity?: number;
    priceUsd?: number;
  }>,
): Promise<{ success: boolean; data?: { success: boolean; message: string }; error?: string }> {
  const { profile } = await getSuperAdminUser();
  try {
    const { initiateItemEdit } = await import('@/services/shipment-items.service');
    const result = await initiateItemEdit({
      shipmentId,
      adminProfileId: profile.id,
      changes,
    });
    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error' };
  }
}

/**
 * Preview the service fee calculation without creating a transaction.
 */
export async function getServiceFeePreviewAction(shipmentId: string): Promise<{
  success: boolean;
  data?: {
    serviceFee: number;
    calculationBase: 'FOB' | 'INVOICE';
    baseValue: number;
    percentage: number;
    percentageValue: number;
    minimumValue: number;
    usedMinimum: boolean;
  };
  error?: string;
}> {
  try {
    await getSuperAdminUser();

    const shipment = await db.query.shipments.findFirst({
      where: eq(shipments.id, shipmentId),
      columns: {
        clientOrganizationId: true,
        totalProductsUsd: true,
        totalCostsBrl: true,
      },
      with: {
        quote: { columns: { exchangeRateIof: true } },
      },
    });

    if (!shipment) return { success: false, error: 'Shipment not found.' };

    // Prefer the exchange rate recorded at simulation time (quote.exchangeRateIof).
    // Falls back to 5.0 only when no linked quote exists (edge case: manually created shipments).
    const exchangeRate = parseFloat(shipment.quote?.exchangeRateIof ?? '5.0');

    const feeResult = await calculateServiceFee({
      clientOrganizationId: shipment.clientOrganizationId,
      totalProductsUsd: parseFloat(shipment.totalProductsUsd ?? '0'),
      exchangeRate,
      totalCostsBrl: parseFloat(shipment.totalCostsBrl ?? '0'),
    });

    return { success: true, data: feeResult };
  } catch (error) {
    console.error('Error calculating service fee preview:', error);
    return { success: false, error: 'Failed to calculate service fee preview.' };
  }
}
