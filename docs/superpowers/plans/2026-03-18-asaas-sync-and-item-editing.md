# Asaas Customer Sync + Item Editing with ZapSign Amendment

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable Asaas invoice generation for ORDER-type shipments (lazy customer creation) and allow Admin to edit shipment items during MERCHANDISE_PAYMENT with automatic ZapSign amendment via document attachment.

**Architecture:** Asaas customer sync uses lazy creation — customer is created on first invoice. Item editing recalculates FOB/costs, generates a PDF amendment, attaches it to the existing ZapSign document, and waits for client signature via webhook before applying changes.

**Tech Stack:** Next.js 16, Drizzle ORM, Inngest, ZapSign API, Asaas API, PDF generation (basic HTML-to-PDF), Zod

---

## File Structure

### Schema
- **Modify:** `src/db/schema/auth.ts` — add `asaasCustomerId` to organizations table

### Asaas Integration
- **Modify:** `src/lib/asaas/client.ts` — add `createCustomer`, `getCustomer` functions
- **Create:** `src/services/asaas.service.ts` — lazy customer sync + invoice generation orchestrator

### Item Editing + Amendment
- **Create:** `src/services/shipment-items.service.ts` — edit items, recalculate, generate amendment
- **Create:** `src/lib/pdf/amendment-pdf.ts` — generate amendment PDF from item changes
- **Modify:** `src/services/zapsign.service.ts` — add `addDocumentAttachment` function
- **Create:** `src/inngest/functions/shipment-items-changed.ts` — Inngest function for amendment flow
- **Modify:** `src/inngest/events.ts` — add `shipment/items.changed` event type
- **Modify:** `src/app/api/inngest/route.ts` — register new function

### UI
- **Create:** `src/app/(admin)/admin/shipments/components/modals/edit-items-modal.tsx` — modal for editing items
- **Modify:** `src/app/(admin)/admin/shipments/components/steps/merchandise-payment-step.tsx` — add edit items button
- **Modify:** `src/app/(admin)/admin/shipments/[id]/actions.ts` — add item editing + Asaas invoice actions

### i18n
- **Modify:** `messages/pt.json` — add Asaas and item editing keys

---

## Task 1: Schema — Add asaasCustomerId to Organizations

**Files:**
- Modify: `src/db/schema/auth.ts`

- [ ] **Step 1: Add field**

In the `organizations` table, add after `orderType` (or wherever appropriate):

```typescript
asaasCustomerId: text('asaas_customer_id'),
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/db/schema/auth.ts
git commit -m "feat(schema): add asaasCustomerId to organizations"
```

---

## Task 2: Asaas Client — Customer Management

**Files:**
- Modify: `src/lib/asaas/client.ts`

- [ ] **Step 1: Add customer types and functions**

Append to existing `src/lib/asaas/client.ts`:

```typescript
// ==========================================
// CUSTOMER MANAGEMENT
// ==========================================

export interface CreateCustomerInput {
  name: string;
  email?: string;
  cpfCnpj: string;
  phone?: string;
  company?: string;
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
}

export type CreateCustomerResult =
  | { success: true; customer: AsaasCustomer }
  | { success: false; error: string };

/** Create a customer in Asaas */
export async function createCustomer(input: CreateCustomerInput): Promise<CreateCustomerResult> {
  if (!API_KEY) {
    return { success: false, error: 'Asaas is not configured' };
  }

  try {
    const res = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { success: false, error: `Asaas API error ${res.status}: ${body}` };
    }

    const customer = (await res.json()) as AsaasCustomer;
    return { success: true, customer };
  } catch (error) {
    return { success: false, error: `Failed to connect to Asaas: ${error}` };
  }
}

/** Get a customer by ID from Asaas */
export async function getCustomer(customerId: string): Promise<AsaasCustomer | null> {
  if (!API_KEY) return null;

  try {
    const res = await fetch(`${BASE_URL}/customers/${customerId}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return null;
    return (await res.json()) as AsaasCustomer;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/asaas/client.ts
git commit -m "feat: add Asaas customer management functions"
```

---

## Task 3: Asaas Service — Lazy Customer Sync + Invoice Generation

**Files:**
- Create: `src/services/asaas.service.ts`

- [ ] **Step 1: Create the service**

```typescript
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createCustomer, createPayment, type CreatePaymentInput } from '@/lib/asaas/client';

/**
 * Ensure organization has an Asaas customer ID.
 * Lazy creation — creates customer on first call.
 */
export async function ensureAsaasCustomer(organizationId: string): Promise<string> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: {
      id: true,
      asaasCustomerId: true,
      name: true,
      cnpj: true,
      email: true,
      phone: true,
    },
  });

  if (!org) throw new Error(`Organization ${organizationId} not found`);

  // Already synced
  if (org.asaasCustomerId) return org.asaasCustomerId;

  // Create in Asaas
  const result = await createCustomer({
    name: org.name,
    cpfCnpj: org.cnpj ?? '',
    email: org.email ?? undefined,
    phone: org.phone ?? undefined,
  });

  if (!result.success) {
    throw new Error(`Failed to create Asaas customer: ${result.error}`);
  }

  // Save customer ID
  await db
    .update(organizations)
    .set({ asaasCustomerId: result.customer.id })
    .where(eq(organizations.id, organizationId));

  return result.customer.id;
}

/**
 * Generate an Asaas payment (boleto/PIX) for a shipment transaction.
 * Handles lazy customer creation.
 */
export async function generateAsaasInvoice(params: {
  organizationId: string;
  value: number;
  description: string;
  dueDate: string; // YYYY-MM-DD
  externalReference: string; // transaction ID
}): Promise<{ gatewayId: string; gatewayUrl: string }> {
  const customerId = await ensureAsaasCustomer(params.organizationId);

  const paymentInput: CreatePaymentInput = {
    customer: customerId,
    billingType: 'UNDEFINED', // Let client choose boleto or PIX
    value: params.value,
    dueDate: params.dueDate,
    description: params.description,
    externalReference: params.externalReference,
  };

  const result = await createPayment(paymentInput);

  if (!result.success) {
    throw new Error(`Failed to create Asaas payment: ${result.error}`);
  }

  return {
    gatewayId: result.payment.id,
    gatewayUrl: result.payment.invoiceUrl,
  };
}
```

Note: Check if `organizations` table has `cnpj`, `email`, `phone` fields. If the field names differ (e.g., `document` instead of `cnpj`), adapt accordingly. Read the auth schema first.

- [ ] **Step 2: Commit**

```bash
git add src/services/asaas.service.ts
git commit -m "feat: add Asaas service with lazy customer sync and invoice generation"
```

---

## Task 4: Integrate Asaas into Invoice Generation Actions

**Files:**
- Modify: `src/app/(admin)/admin/shipments/[id]/actions.ts`

- [ ] **Step 1: Update generateFobInvoiceAction to use Asaas for ORDER type**

In `generateFobInvoiceAction`, after creating the transaction, check if the organization is ORDER type and generate an Asaas invoice:

```typescript
// After creating the transaction via createShipmentTransaction:
const org = await db.query.organizations.findFirst({
  where: eq(organizations.id, shipment.clientOrganizationId),
  columns: { orderType: true },
});

if (org?.orderType === 'ORDER') {
  try {
    const { generateAsaasInvoice } = await import('@/services/asaas.service');
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 days from now
    const asaas = await generateAsaasInvoice({
      organizationId: shipment.clientOrganizationId,
      value: parseFloat(amountUsd), // Note: Asaas works in BRL — need conversion
      description: `Pagamento FOB - Pedido #${shipment.code}`,
      dueDate,
      externalReference: txn.id,
    });

    // Update transaction with gateway info
    await db.update(transactions).set({
      gatewayId: asaas.gatewayId,
      gatewayUrl: asaas.gatewayUrl,
    }).where(eq(transactions.id, txn.id));
  } catch (error) {
    console.error('Asaas invoice generation failed:', error);
    // Transaction still created — Asaas can be retried
  }
}
```

Apply the same pattern to `generate90InvoiceAction`, `generateBalanceInvoiceAction`, and `generateServiceFeeInvoiceAction`.

IMPORTANT: Asaas works in BRL. For FOB invoices (USD), the amount needs to be converted to BRL using the quote's exchange rate. For balance/service fee invoices (already BRL), use the amount directly.

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/admin/shipments/[id]/actions.ts
git commit -m "feat: integrate Asaas invoice generation for ORDER-type shipments"
```

---

## Task 5: ZapSign — Add Attachment Function

**Files:**
- Modify: `src/services/zapsign.service.ts`

- [ ] **Step 1: Add addDocumentAttachment function**

```typescript
/**
 * Add an attachment (amendment) to an existing signed document.
 * @see https://docs.zapsign.com.br/documentos/adicionar-anexo-documento-extra-1
 */
export async function addDocumentAttachment(
  docToken: string,
  attachmentName: string,
  pdfBase64: string
): Promise<{ success: boolean; error?: string }> {
  if (!ZAPSIGN_API_TOKEN) {
    return { success: false, error: 'ZapSign is not configured' };
  }

  try {
    const response = await fetch(`${ZAPSIGN_BASE_URL}/docs/${docToken}/add-attachment/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ZAPSIGN_API_TOKEN}`,
      },
      body: JSON.stringify({
        name: attachmentName,
        base64_pdf: pdfBase64,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { success: false, error: `ZapSign API error: ${response.status} ${body}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: `Failed to connect to ZapSign: ${error}` };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/zapsign.service.ts
git commit -m "feat: add ZapSign document attachment function for amendments"
```

---

## Task 6: Amendment PDF Generator

**Files:**
- Create: `src/lib/pdf/amendment-pdf.ts`

- [ ] **Step 1: Create simple HTML-to-PDF amendment generator**

```typescript
/**
 * Generate a simple PDF for shipment item amendments.
 * Returns base64-encoded PDF string for ZapSign attachment.
 */

interface ItemChange {
  type: 'ADD' | 'REMOVE' | 'UPDATE';
  productName: string;
  oldQuantity?: number;
  newQuantity?: number;
  oldPriceUsd?: number;
  newPriceUsd?: number;
}

interface AmendmentData {
  shipmentCode: number;
  clientName: string;
  date: string;
  changes: ItemChange[];
  oldTotalFobUsd: number;
  newTotalFobUsd: number;
}

export function generateAmendmentHtml(data: AmendmentData): string {
  const changeRows = data.changes.map((c) => {
    if (c.type === 'ADD') {
      return `<tr><td>Adicionado</td><td>${c.productName}</td><td>—</td><td>${c.newQuantity}</td><td>—</td><td>$${c.newPriceUsd?.toFixed(2)}</td></tr>`;
    }
    if (c.type === 'REMOVE') {
      return `<tr><td>Removido</td><td>${c.productName}</td><td>${c.oldQuantity}</td><td>—</td><td>$${c.oldPriceUsd?.toFixed(2)}</td><td>—</td></tr>`;
    }
    return `<tr><td>Alterado</td><td>${c.productName}</td><td>${c.oldQuantity}</td><td>${c.newQuantity}</td><td>$${c.oldPriceUsd?.toFixed(2)}</td><td>$${c.newPriceUsd?.toFixed(2)}</td></tr>`;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><style>
      body { font-family: Arial, sans-serif; padding: 40px; font-size: 12px; }
      h1 { font-size: 18px; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background: #f5f5f5; }
      .total { font-weight: bold; font-size: 14px; margin-top: 20px; }
    </style></head>
    <body>
      <h1>Aditivo Contratual — Pedido #${data.shipmentCode}</h1>
      <p>Cliente: ${data.clientName}</p>
      <p>Data: ${data.date}</p>
      <h2>Alterações</h2>
      <table>
        <tr><th>Tipo</th><th>Produto</th><th>Qtd Anterior</th><th>Qtd Nova</th><th>Preço Anterior</th><th>Preço Novo</th></tr>
        ${changeRows}
      </table>
      <p class="total">FOB Anterior: $${data.oldTotalFobUsd.toFixed(2)}</p>
      <p class="total">FOB Novo: $${data.newTotalFobUsd.toFixed(2)}</p>
      <p class="total">Diferença: $${(data.newTotalFobUsd - data.oldTotalFobUsd).toFixed(2)}</p>
    </body>
    </html>
  `;
}
```

Note: For actual PDF generation from HTML, we need a library. Options:
- `puppeteer` / `playwright` (heavy but reliable)
- `jspdf` + `html2canvas` (client-side only)
- `@react-pdf/renderer` (React-based PDF)

For server-side simplicity, use a lightweight approach: generate HTML and convert to PDF. Check if `puppeteer` or a similar lib is already in the project. If not, we can use a simpler approach — ZapSign may accept HTML directly or we can use a minimal PDF library.

For now, export the HTML generator. The actual HTML→PDF conversion will depend on available libraries. Add a TODO for the conversion step.

```typescript
/**
 * Convert HTML to base64 PDF.
 * TODO: Implement with puppeteer or similar when available.
 * For now, returns the HTML as a placeholder.
 */
export async function generateAmendmentPdfBase64(data: AmendmentData): Promise<string> {
  const html = generateAmendmentHtml(data);
  // TODO: Convert HTML to PDF using puppeteer or @react-pdf/renderer
  // For now, convert HTML to base64 as placeholder
  return Buffer.from(html).toString('base64');
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pdf/amendment-pdf.ts
git commit -m "feat: add amendment PDF generator for item changes"
```

---

## Task 7: Shipment Items Service

**Files:**
- Create: `src/services/shipment-items.service.ts`

- [ ] **Step 1: Create the service**

```typescript
import { db } from '@/db';
import { shipments, quoteItems } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { inngest } from '@/inngest/client';

interface ItemEditPayload {
  shipmentId: string;
  adminProfileId: string;
  changes: Array<{
    type: 'ADD' | 'REMOVE' | 'UPDATE';
    quoteItemId?: string; // for REMOVE/UPDATE
    variantId?: string; // for ADD
    quantity?: number;
    priceUsd?: number;
  }>;
}

/**
 * Initiate item editing flow.
 * Dispatches Inngest event that handles recalculation + amendment.
 */
export async function initiateItemEdit(payload: ItemEditPayload) {
  // Validate shipment is in MERCHANDISE_PAYMENT step
  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.id, payload.shipmentId),
    columns: { currentStep: true, status: true },
  });

  if (!shipment) throw new Error('Shipment not found');
  if (shipment.currentStep !== 'MERCHANDISE_PAYMENT') {
    throw new Error('Items can only be edited during MERCHANDISE_PAYMENT step');
  }
  if (shipment.status === 'CANCELED') {
    throw new Error('Cannot edit items of a canceled shipment');
  }

  // Dispatch Inngest event for async processing
  await inngest.send({
    name: 'shipment/items.changed',
    data: {
      shipmentId: payload.shipmentId,
      adminProfileId: payload.adminProfileId,
      changes: payload.changes.map((c) => ({
        type: c.type,
        itemId: c.quoteItemId,
        data: {
          variantId: c.variantId,
          quantity: c.quantity,
          priceUsd: c.priceUsd,
        },
      })),
    },
  });

  return { success: true, message: 'Item changes submitted for processing' };
}

/**
 * Apply item changes to quote items and recalculate totals.
 * Called by Inngest function after amendment is signed.
 */
export async function applyItemChanges(
  shipmentId: string,
  changes: Array<{ type: string; itemId?: string; data: Record<string, unknown> }>
) {
  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.id, shipmentId),
    with: { quote: { with: { items: true } } },
    columns: { id: true, quoteId: true },
  });

  if (!shipment?.quote) throw new Error('Shipment has no linked quote');

  await db.transaction(async (tx) => {
    for (const change of changes) {
      if (change.type === 'REMOVE' && change.itemId) {
        await tx.delete(quoteItems).where(eq(quoteItems.id, change.itemId));
      }

      if (change.type === 'UPDATE' && change.itemId) {
        const updates: Record<string, unknown> = {};
        if (change.data.quantity !== undefined) updates.quantity = change.data.quantity;
        if (change.data.priceUsd !== undefined) updates.priceUsd = String(change.data.priceUsd);
        if (Object.keys(updates).length > 0) {
          await tx.update(quoteItems).set(updates).where(eq(quoteItems.id, change.itemId));
        }
      }

      if (change.type === 'ADD' && change.data.variantId) {
        await tx.insert(quoteItems).values({
          quoteId: shipment.quote!.id,
          variantId: change.data.variantId as string,
          quantity: (change.data.quantity as number) ?? 1,
          priceUsd: String(change.data.priceUsd ?? '0'),
        });
      }
    }

    // Recalculate totalProductsUsd
    const updatedItems = await tx.query.quoteItems.findMany({
      where: eq(quoteItems.quoteId, shipment.quote!.id),
      columns: { quantity: true, priceUsd: true },
    });

    const newTotalUsd = updatedItems.reduce(
      (sum, item) => sum + (item.quantity ?? 0) * parseFloat(item.priceUsd ?? '0'),
      0
    );

    await tx.update(shipments).set({
      totalProductsUsd: String(newTotalUsd),
      updatedAt: new Date(),
    }).where(eq(shipments.id, shipmentId));
  });

  return { success: true };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/shipment-items.service.ts
git commit -m "feat: add shipment items service for editing and recalculation"
```

---

## Task 8: Inngest — Items Changed Function + Event Type

**Files:**
- Modify: `src/inngest/events.ts` — add `shipment/items.changed` event
- Create: `src/inngest/functions/shipment-items-changed.ts`
- Modify: `src/app/api/inngest/route.ts` — register function

- [ ] **Step 1: Add event type**

In `src/inngest/events.ts`, add to `ShipmentEvents`:

```typescript
/** Admin edited shipment items — triggers recalculation + amendment */
'shipment/items.changed': {
  data: {
    shipmentId: string;
    adminProfileId: string;
    changes: Array<{ type: string; itemId?: string; data: Record<string, unknown> }>;
  };
};
```

- [ ] **Step 2: Create the Inngest function**

```typescript
import { inngest } from '@/inngest/client';
import { db } from '@/db';
import { shipments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { applyItemChanges } from '@/services/shipment-items.service';
import { addDocumentAttachment } from '@/services/zapsign.service';
import { generateAmendmentPdfBase64 } from '@/lib/pdf/amendment-pdf';
import { notifyOrganizationMembers } from '@/services/notification.service';
import { getTranslations } from 'next-intl/server';

export const shipmentItemsChanged = inngest.createFunction(
  {
    id: 'shipment-items-changed',
    concurrency: { key: 'event.data.shipmentId', limit: 1 },
    retries: 3,
  },
  { event: 'shipment/items.changed' },
  async ({ event, step }) => {
    const { shipmentId, changes } = event.data;

    // Step 1: Get current shipment data for amendment PDF
    const shipment = await step.run('fetch-shipment', async () => {
      return db.query.shipments.findFirst({
        where: eq(shipments.id, shipmentId),
        with: {
          quote: { with: { items: { with: { variant: { with: { product: true } } } } } },
          clientOrganization: { columns: { id: true, name: true } },
          sellerOrganization: { columns: { id: true } },
        },
        columns: {
          id: true,
          code: true,
          totalProductsUsd: true,
          zapSignId: true,
          sellerOrganizationId: true,
          clientOrganizationId: true,
        },
      });
    });

    if (!shipment) throw new Error(`Shipment ${shipmentId} not found`);

    const oldTotalFob = parseFloat(shipment.totalProductsUsd ?? '0');

    // Step 2: Apply changes and recalculate
    await step.run('apply-changes', async () => {
      return applyItemChanges(shipmentId, changes);
    });

    // Step 3: Get new total after recalculation
    const newShipment = await step.run('fetch-new-total', async () => {
      return db.query.shipments.findFirst({
        where: eq(shipments.id, shipmentId),
        columns: { totalProductsUsd: true },
      });
    });

    const newTotalFob = parseFloat(newShipment?.totalProductsUsd ?? '0');

    // Step 4: Generate amendment PDF
    const pdfBase64 = await step.run('generate-pdf', async () => {
      const amendmentChanges = changes.map((c) => {
        const existingItem = shipment.quote?.items?.find((i) => i.id === c.itemId);
        return {
          type: c.type as 'ADD' | 'REMOVE' | 'UPDATE',
          productName: existingItem?.variant?.product?.name ?? c.data.variantId as string ?? 'Novo produto',
          oldQuantity: existingItem?.quantity ?? undefined,
          newQuantity: c.data.quantity as number | undefined,
          oldPriceUsd: existingItem?.priceUsd ? parseFloat(existingItem.priceUsd) : undefined,
          newPriceUsd: c.data.priceUsd as number | undefined,
        };
      });

      return generateAmendmentPdfBase64({
        shipmentCode: shipment.code ?? 0,
        clientName: shipment.clientOrganization?.name ?? '',
        date: new Date().toLocaleDateString('pt-BR'),
        changes: amendmentChanges,
        oldTotalFobUsd: oldTotalFob,
        newTotalFobUsd: newTotalFob,
      });
    });

    // Step 5: Attach amendment to ZapSign document
    if (shipment.zapSignId) {
      await step.run('attach-to-zapsign', async () => {
        const result = await addDocumentAttachment(
          shipment.zapSignId!,
          `Aditivo-Pedido-${shipment.code}`,
          pdfBase64
        );
        if (!result.success) {
          throw new Error(`ZapSign attachment failed: ${result.error}`);
        }
      });
    }

    // Step 6: Notify parties
    await step.run('notify-parties', async () => {
      const t = await getTranslations('Shipments.Notifications');

      await notifyOrganizationMembers(
        shipment.sellerOrganizationId,
        t('titles.amendmentGenerated' as any),
        t('amendmentGenerated'),
        `/admin/shipments/${shipmentId}`,
        'INFO'
      );

      if (shipment.clientOrganizationId) {
        await notifyOrganizationMembers(
          shipment.clientOrganizationId,
          t('titles.amendmentGenerated' as any),
          t('amendmentGenerated'),
          `/dashboard`,
          'WARNING'
        );
      }
    });

    return { success: true, oldTotalFob, newTotalFob };
  }
);
```

- [ ] **Step 3: Register in Inngest route**

Add import and register `shipmentItemsChanged` in `src/app/api/inngest/route.ts`.

- [ ] **Step 4: Add i18n keys**

In `messages/pt.json`, add to `Shipments.Notifications`:
```json
"amendmentGenerated": "Um aditivo contratual foi gerado para o pedido #{code}. Por favor assine.",
"titles": {
  ...existing titles...,
  "amendmentGenerated": "Aditivo Contratual"
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/inngest/events.ts src/inngest/functions/shipment-items-changed.ts src/app/api/inngest/route.ts messages/pt.json
git commit -m "feat(inngest): add shipment items changed function with amendment flow"
```

---

## Task 9: Edit Items Modal + Server Action

**Files:**
- Create: `src/app/(admin)/admin/shipments/components/modals/edit-items-modal.tsx`
- Modify: `src/app/(admin)/admin/shipments/[id]/actions.ts`
- Modify: `src/app/(admin)/admin/shipments/components/steps/merchandise-payment-step.tsx`

- [ ] **Step 1: Add server action**

In actions.ts, add:

```typescript
export async function editShipmentItemsAction(shipmentId: string, changes: Array<{
  type: 'ADD' | 'REMOVE' | 'UPDATE';
  quoteItemId?: string;
  variantId?: string;
  quantity?: number;
  priceUsd?: number;
}>) {
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
```

- [ ] **Step 2: Create edit items modal**

A modal that displays the current quote items in a table with editable quantity and price fields, plus buttons to remove items or add new ones.

Props: `shipment: ShipmentDetail`, `onSuccess`, `trigger`

The modal should:
- Show a table of current items (from `shipment.quote?.items`)
- Each row: product name, variant, current quantity (editable input), current price USD (editable input), [Remove] button
- [Add Item] button (for now, just a placeholder — adding items requires a product selector which is complex)
- [Salvar Alterações] button that collects all changes and calls `editShipmentItemsAction`
- Track changes locally (what was modified, removed) and submit as a batch

Uses `useTranslations('Admin.Shipments.Modals.EditItems')`

- [ ] **Step 3: Add [Editar Itens] button to merchandise-payment-step.tsx**

In the merchandise payment step, add a button in the header area (next to the title or in the production card) that opens the edit items modal. Only show when `!readOnly`.

- [ ] **Step 4: Add i18n keys**

```json
"EditItems": {
  "title": "Editar Itens do Pedido",
  "product": "Produto",
  "variant": "Variante",
  "quantity": "Quantidade",
  "priceUsd": "Preço USD",
  "total": "Total",
  "remove": "Remover",
  "addItem": "Adicionar Item",
  "save": "Salvar Alterações",
  "cancel": "Cancelar",
  "noChanges": "Nenhuma alteração detectada",
  "amendmentNote": "As alterações gerarão um aditivo contratual para assinatura do cliente."
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/app/(admin)/admin/shipments/components/modals/edit-items-modal.tsx src/app/(admin)/admin/shipments/[id]/actions.ts src/app/(admin)/admin/shipments/components/steps/merchandise-payment-step.tsx messages/pt.json
git commit -m "feat: add item editing modal with ZapSign amendment integration"
```

---

## Task 10: Verify Build

- [ ] **Step 1: Run TypeScript check**

```bash
bunx tsc --noEmit
```

- [ ] **Step 2: Run tests**

```bash
bun test
```

- [ ] **Step 3: Fix any issues and commit**

---

## Execution Order & Dependencies

```
Task 1 (Schema: asaasCustomerId) ──→ Task 2 (Asaas Client) ──→ Task 3 (Asaas Service) ──→ Task 4 (Integrate into Actions)

Task 5 (ZapSign Attachment) ──┐
Task 6 (Amendment PDF) ───────┤→ Task 7 (Items Service) ──→ Task 8 (Inngest Function) ──→ Task 9 (UI: Modal + Action)

Task 10 (Verify Build) — runs last
```

Tasks 1-4 (Asaas) and Tasks 5-8 (Item Editing) can run as two parallel tracks.
Task 9 depends on both tracks.
