/**
 * Asaas Service — Customer sync and invoice generation.
 * Handles lazy customer creation and payment gateway integration.
 */

import { db } from '@/db';
import { organizations, transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createCustomer, createPayment } from '@/lib/asaas/client';

// ==========================================
// Customer Sync
// ==========================================

/**
 * Ensures an Asaas customer exists for the given organization.
 * Creates one lazily if `asaasCustomerId` is not yet set, then persists it.
 * Returns the Asaas customer ID.
 */
export async function ensureAsaasCustomer(organizationId: string): Promise<string> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: {
      id: true,
      name: true,
      document: true, // CNPJ
      email: true,
      phone: true,
      asaasCustomerId: true,
    },
  });

  if (!org) throw new Error(`Organization ${organizationId} not found`);

  if (org.asaasCustomerId) {
    return org.asaasCustomerId;
  }

  // Create a new customer in Asaas
  const result = await createCustomer({
    name: org.name,
    cpfCnpj: org.document,
    email: org.email ?? undefined,
    phone: org.phone ?? undefined,
  });

  if (!result.success) {
    throw new Error(`Failed to create Asaas customer: ${result.error}`);
  }

  const asaasCustomerId = result.customer.id;

  // Persist the new customer ID to avoid duplicate creation
  await db
    .update(organizations)
    .set({ asaasCustomerId })
    .where(eq(organizations.id, organizationId));

  return asaasCustomerId;
}

// ==========================================
// Invoice Generation
// ==========================================

export interface GenerateAsaasInvoiceParams {
  organizationId: string;
  transactionId: string;
  amountBrl: number;
  description?: string;
  /** Due date in YYYY-MM-DD format */
  dueDate?: string;
}

export interface AsaasInvoiceResult {
  gatewayId: string;
  gatewayUrl: string;
}

/**
 * Lazily syncs the organization as an Asaas customer, then creates a payment.
 * Returns `{ gatewayId, gatewayUrl }` for storage on the transaction record.
 */
export async function generateAsaasInvoice(
  params: GenerateAsaasInvoiceParams,
): Promise<AsaasInvoiceResult> {
  const customerId = await ensureAsaasCustomer(params.organizationId);

  // Default due date: 3 business days from today
  const dueDate = params.dueDate ?? getDueDateString(3);

  const result = await createPayment({
    customer: customerId,
    billingType: 'UNDEFINED',
    value: params.amountBrl,
    dueDate,
    description: params.description,
    externalReference: params.transactionId,
  });

  if (!result.success) {
    throw new Error(`Failed to create Asaas payment: ${result.error}`);
  }

  return {
    gatewayId: result.payment.id,
    gatewayUrl: result.payment.invoiceUrl,
  };
}

// ==========================================
// Helpers
// ==========================================

/** Returns a due date string N days from today in YYYY-MM-DD format */
function getDueDateString(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}
