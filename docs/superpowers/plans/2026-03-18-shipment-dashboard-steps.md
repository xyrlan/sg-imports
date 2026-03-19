# Shipment Dashboard — Step Components (Plan B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 5 placeholder step components with full implementations including forms, tables, file uploads, modals, and server actions for each shipment management step.

**Architecture:** Each step component is a self-contained 'use client' component receiving `ShipmentDetail` + `readOnly` props. Server actions handle mutations (Zod validation, auth check, revalidation). Modals for complex forms (exchange contracts, invoices, payments). Inline forms for simple fields. All strings via next-intl.

**Tech Stack:** Next.js 16, React 19, Hero UI, Drizzle ORM, Zod, next-intl, lucide-react, Supabase Storage

**Spec:** `docs/superpowers/specs/2026-03-18-shipment-dashboard-ui-design.md`
**Foundation:** `docs/superpowers/plans/2026-03-18-shipment-dashboard-foundation.md` (already implemented)

---

## File Structure

### Server Actions (all in one file, grouped by step)
- **Modify:** `src/app/(admin)/admin/shipments/[id]/actions.ts` — add all step-specific actions

### Step Components (replace placeholders)
- **Replace:** `src/app/(admin)/admin/shipments/components/steps/merchandise-payment-step.tsx`
- **Replace:** `src/app/(admin)/admin/shipments/components/steps/shipping-preparation-step.tsx`
- **Replace:** `src/app/(admin)/admin/shipments/components/steps/document-preparation-step.tsx`
- **Replace:** `src/app/(admin)/admin/shipments/components/steps/customs-clearance-step.tsx`
- **Replace:** `src/app/(admin)/admin/shipments/components/steps/completion-step.tsx`

### Modals
- **Create:** `src/app/(admin)/admin/shipments/components/modals/generate-invoice-modal.tsx`
- **Create:** `src/app/(admin)/admin/shipments/components/modals/register-payment-modal.tsx`
- **Create:** `src/app/(admin)/admin/shipments/components/modals/create-exchange-contract-modal.tsx`

### Services
- **Create:** `src/services/shipment-documents.service.ts` — document upload + CRUD for shipment documents

### i18n
- **Modify:** `messages/pt.json` — expand `Admin.Shipments.Steps.*` and add `Admin.Shipments.Modals.*`

---

## Task 1: Shipment Document Service

**Files:**
- Create: `src/services/shipment-documents.service.ts`

This service handles uploading files to Supabase Storage and creating `shipmentDocuments` records.

- [ ] **Step 1: Create the service**

```typescript
import { db } from '@/db';
import { shipmentDocuments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

/** Upload a file to Supabase Storage and create a shipmentDocument record */
export async function uploadShipmentDocument(params: {
  shipmentId: string;
  type: string;
  name: string;
  file: File;
  uploadedById: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();

  const fileExt = params.file.name.split('.').pop()?.toLowerCase();
  const fileName = `${params.type}-${Date.now()}.${fileExt}`;
  const filePath = `shipments/${params.shipmentId}/${fileName}`;

  const arrayBuffer = await params.file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabase.storage
    .from('shipment-documents')
    .upload(filePath, buffer, {
      contentType: params.file.type,
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('shipment-documents')
    .getPublicUrl(filePath);

  const [doc] = await db
    .insert(shipmentDocuments)
    .values({
      shipmentId: params.shipmentId,
      type: params.type as any,
      name: params.name,
      url: publicUrl,
      uploadedById: params.uploadedById,
      metadata: params.metadata,
    })
    .returning();

  return doc;
}

/** Get documents for a shipment, optionally filtered by type */
export async function getShipmentDocumentsByType(shipmentId: string, type?: string) {
  if (type) {
    return db.query.shipmentDocuments.findMany({
      where: and(
        eq(shipmentDocuments.shipmentId, shipmentId),
        eq(shipmentDocuments.type, type as any)
      ),
    });
  }
  return db.query.shipmentDocuments.findMany({
    where: eq(shipmentDocuments.shipmentId, shipmentId),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/shipment-documents.service.ts
git commit -m "feat: add shipment document upload service"
```

---

## Task 2: i18n — Expand Step Translation Keys

**Files:**
- Modify: `messages/pt.json`

- [ ] **Step 1: Expand Admin.Shipments.Steps with full keys for each step**

Replace the placeholder keys and add modal keys. Merge into existing `Admin.Shipments`:

```json
"Steps": {
  "ContractCreation": {
    "title": "Criação do Contrato",
    "contractSigned": "Contrato assinado",
    "signatureDate": "Data da assinatura",
    "viewQuote": "Ver proposta"
  },
  "MerchandisePayment": {
    "title": "Pagamento da Mercadoria",
    "production": "Produção",
    "productionReadyDate": "Data Estimada de Prontidão",
    "fobAdvancePercentage": "% Adiantamento FOB",
    "payments": "Pagamentos FOB",
    "progress": "{paid} / {total} ({percent}%)",
    "generateInvoice": "Gerar Fatura",
    "registerPayment": "Registrar Pagamento",
    "exchangeContracts": "Contratos de Câmbio",
    "newExchangeContract": "Novo Contrato de Câmbio",
    "transactionTable": {
      "number": "#",
      "amountUsd": "Valor USD",
      "amountBrl": "Valor BRL",
      "status": "Status",
      "date": "Data",
      "proof": "Comprovante"
    },
    "contractTable": {
      "supplier": "Fornecedor",
      "contractNumber": "Nº Contrato",
      "broker": "Corretora",
      "amountUsd": "USD",
      "exchangeRate": "Taxa",
      "swift": "Swift",
      "contract": "Contrato"
    }
  },
  "ShippingPreparation": {
    "title": "Preparação de Embarque",
    "bookingTracking": "Booking & Tracking",
    "bookingNumber": "Número do Booking",
    "mbl": "MBL",
    "registerShipsGo": "Registrar na ShipsGo",
    "shipsGoData": "Dados ShipsGo",
    "carrier": "Transportadora",
    "cargoType": "Tipo de Carga",
    "partLot": "Part Lot",
    "trackingLink": "Link de Rastreamento",
    "containers": "Containers",
    "freight": "Frete",
    "freightCost": "Custo (simulação)",
    "freightSellPrice": "Preço de Venda",
    "documents": "Documentos",
    "save": "Salvar"
  },
  "DocumentPreparation": {
    "title": "Preparação de Documentos",
    "exchangeSummary": "Resumo de Câmbio",
    "totalPaid": "Total pago",
    "avgRate": "Taxa média",
    "numContracts": "Contratos",
    "documentsPerSupplier": "Documentos por Fornecedor",
    "invoice": "Invoice",
    "packingList": "Packing List",
    "uploaded": "Enviado",
    "pending": "Pendente",
    "otherDocuments": "Outros Documentos",
    "addDocument": "Adicionar Documento",
    "checklist": "Checklist",
    "pendingDocs": "{count} documento(s) pendente(s)"
  },
  "CustomsClearance": {
    "title": "Desembaraço Aduaneiro",
    "invoice90": "Fatura 90%",
    "totalCosts": "Custo Total",
    "paidFobBrl": "Pago FOB (BRL)",
    "remaining": "Restante",
    "invoice90Value": "90%",
    "generate90Invoice": "Gerar Fatura de 90%",
    "invoiceStatus": "Status da Fatura",
    "duimp": "DUIMP",
    "duimpNumber": "Número da DUIMP",
    "register": "Registrar",
    "siscomexData": "Dados Siscomex",
    "channel": "Canal",
    "taxBreakdown": "Impostos"
  },
  "Completion": {
    "title": "Conclusão",
    "fiscalDocuments": "Documentos Fiscais",
    "storageInvoice": "NF Armazenagem",
    "salesInvoicePdf": "NF Venda (PDF)",
    "salesInvoiceXml": "NF Venda (XML)",
    "finalCosts": "Custos Finais",
    "icmsExitTaxes": "ICMS e Tributos de Saída",
    "storageCost": "Armazenagem",
    "discounts": "Descontos",
    "saveCosts": "Salvar",
    "pl": "Cálculo Final (P&L)",
    "totalRealized": "Total Realizado",
    "estimatedCost": "Custo Estimado",
    "finalBalance": "Saldo Final",
    "clientOwes": "Cliente deve",
    "refundPending": "Ressarcimento pendente",
    "balanced": "Sem saldo pendente",
    "generateBalanceInvoice": "Gerar Fatura do Saldo",
    "serviceFee": "Honorários",
    "base": "Base",
    "percentage": "Percentual",
    "calculatedValue": "Valor Calculado",
    "minimumFloor": "Mínimo (piso)",
    "finalFee": "Honorários Final",
    "usedMinimum": "(usado mínimo)",
    "generateServiceFeeInvoice": "Gerar Fatura de Honorários"
  }
},
"Modals": {
  "GenerateInvoice": {
    "title": "Gerar Fatura",
    "amount": "Valor",
    "description": "Descrição",
    "cancel": "Cancelar",
    "generate": "Gerar Fatura"
  },
  "RegisterPayment": {
    "title": "Registrar Pagamento",
    "amountUsd": "Valor (USD)",
    "paymentDate": "Data do Pagamento",
    "proof": "Comprovante",
    "cancel": "Cancelar",
    "register": "Registrar"
  },
  "ExchangeContract": {
    "title": "Novo Contrato de Câmbio",
    "supplier": "Fornecedor",
    "transaction": "Transação Vinculada",
    "contractNumber": "Nº Contrato",
    "broker": "Corretora",
    "amountUsd": "Valor USD",
    "exchangeRate": "Taxa de Câmbio",
    "closingDate": "Data de Fechamento",
    "swift": "Swift (PDF)",
    "contract": "Contrato (PDF)",
    "cancel": "Cancelar",
    "save": "Salvar Contrato"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add messages/pt.json
git commit -m "feat(i18n): expand step and modal translation keys"
```

---

## Task 3: Server Actions — Step-Specific

**Files:**
- Modify: `src/app/(admin)/admin/shipments/[id]/actions.ts`

- [ ] **Step 1: Add all step-specific server actions**

Append the following actions to the existing actions file. Each action follows the pattern: auth check → Zod validation → service call → revalidate → return result.

```typescript
// ========================================
// Step 1: Merchandise Payment Actions
// ========================================

export async function updateProductionReadyDateAction(shipmentId: string, date: string) {
  const { profile } = await getSuperAdminUser();
  try {
    await db.update(shipments).set({ productionReadyDate: new Date(date), updatedAt: new Date() }).where(eq(shipments.id, shipmentId));
    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error' };
  }
}

export async function generateFobInvoiceAction(shipmentId: string, amountUsd: string) {
  const { profile } = await getSuperAdminUser();
  try {
    const txn = await createShipmentTransaction({
      shipmentId,
      organizationId: (await db.query.shipments.findFirst({ where: eq(shipments.id, shipmentId), columns: { clientOrganizationId: true } }))!.clientOrganizationId,
      type: 'MERCHANDISE',
      amountUsd,
    });
    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true, data: txn };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error' };
  }
}

export async function registerManualPaymentAction(formData: FormData) {
  const { profile } = await getSuperAdminUser();
  const schema = z.object({
    shipmentId: z.string().uuid(),
    amountUsd: z.string().min(1),
    paymentDate: z.string().min(1),
  });
  const parsed = schema.safeParse({
    shipmentId: formData.get('shipmentId'),
    amountUsd: formData.get('amountUsd'),
    paymentDate: formData.get('paymentDate'),
  });
  if (!parsed.success) return { success: false, error: 'Invalid data' };

  try {
    const shipment = await db.query.shipments.findFirst({ where: eq(shipments.id, parsed.data.shipmentId), columns: { clientOrganizationId: true } });
    if (!shipment) return { success: false, error: 'Shipment not found' };

    const txn = await createShipmentTransaction({
      shipmentId: parsed.data.shipmentId,
      organizationId: shipment.clientOrganizationId,
      type: 'MERCHANDISE',
      amountUsd: parsed.data.amountUsd,
    });

    // Mark as paid immediately for DIRECT_ORDER
    await markTransactionPaid(txn.id, parsed.data.shipmentId);

    // Upload proof if provided
    const proofFile = formData.get('proof') as File | null;
    if (proofFile && proofFile.size > 0) {
      const { uploadShipmentDocument } = await import('@/services/shipment-documents.service');
      await uploadShipmentDocument({
        shipmentId: parsed.data.shipmentId,
        type: 'OTHER',
        name: `Comprovante-${txn.id}`,
        file: proofFile,
        uploadedById: profile.id,
        metadata: { transactionId: txn.id },
      });
    }

    revalidatePath(`/admin/shipments/${parsed.data.shipmentId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error' };
  }
}

export async function createExchangeContractAction(formData: FormData) {
  const { profile } = await getSuperAdminUser();
  const schema = z.object({
    shipmentId: z.string().uuid(),
    transactionId: z.string().uuid(),
    supplierId: z.string().uuid(),
    contractNumber: z.string().min(1),
    brokerId: z.string().uuid().optional(),
    amountUsd: z.string().min(1),
    exchangeRate: z.string().min(1),
    closedAt: z.string().min(1),
  });
  const parsed = schema.safeParse({
    shipmentId: formData.get('shipmentId'),
    transactionId: formData.get('transactionId'),
    supplierId: formData.get('supplierId'),
    contractNumber: formData.get('contractNumber'),
    brokerId: formData.get('brokerId') || undefined,
    amountUsd: formData.get('amountUsd'),
    exchangeRate: formData.get('exchangeRate'),
    closedAt: formData.get('closedAt'),
  });
  if (!parsed.success) return { success: false, error: 'Invalid data', fieldErrors: parsed.error.flatten().fieldErrors };

  try {
    const [contract] = await db.insert(exchangeContracts).values({
      transactionId: parsed.data.transactionId,
      supplierId: parsed.data.supplierId,
      contractNumber: parsed.data.contractNumber,
      brokerId: parsed.data.brokerId ?? null,
      amountUsd: parsed.data.amountUsd,
      exchangeRate: parsed.data.exchangeRate,
      closedAt: new Date(parsed.data.closedAt),
    }).returning();

    // Upload Swift and Contract PDFs if provided
    const swiftFile = formData.get('swiftFile') as File | null;
    const contractFile = formData.get('contractFile') as File | null;

    if (swiftFile && swiftFile.size > 0) {
      const { uploadShipmentDocument } = await import('@/services/shipment-documents.service');
      const doc = await uploadShipmentDocument({
        shipmentId: parsed.data.shipmentId,
        type: 'OTHER',
        name: `Swift-${contract.contractNumber}`,
        file: swiftFile,
        uploadedById: profile.id,
      });
      await db.update(exchangeContracts).set({ swiftFileUrl: doc.url }).where(eq(exchangeContracts.id, contract.id));
    }

    if (contractFile && contractFile.size > 0) {
      const { uploadShipmentDocument } = await import('@/services/shipment-documents.service');
      const doc = await uploadShipmentDocument({
        shipmentId: parsed.data.shipmentId,
        type: 'OTHER',
        name: `Contrato-${contract.contractNumber}`,
        file: contractFile,
        uploadedById: profile.id,
      });
      await db.update(exchangeContracts).set({ contractFileUrl: doc.url }).where(eq(exchangeContracts.id, contract.id));
    }

    revalidatePath(`/admin/shipments/${parsed.data.shipmentId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error' };
  }
}

// ========================================
// Step 2: Shipping Preparation Actions
// ========================================

export async function updateBookingNumberAction(shipmentId: string, bookingNumber: string) {
  const { profile } = await getSuperAdminUser();
  await db.update(shipments).set({ bookingNumber, updatedAt: new Date() }).where(eq(shipments.id, shipmentId));
  revalidatePath(`/admin/shipments/${shipmentId}`);
  return { success: true };
}

export async function registerMblAction(shipmentId: string, mbl: string) {
  const { profile } = await getSuperAdminUser();
  try {
    // Save MBL to shipment
    await db.update(shipments).set({ masterBl: mbl, updatedAt: new Date() }).where(eq(shipments.id, shipmentId));

    // Try to register with ShipsGo
    const { createTracking } = await import('@/lib/shipsgo/client');
    const result = await createTracking({ containerOrBookingNumber: mbl, shippingLine: '' });

    if (result.success) {
      await db.update(shipments).set({
        shipsGoId: result.tracking.id,
        shipsGoTrackingUrl: result.tracking.trackingUrl,
        shipsGoLastUpdate: new Date(),
        eta: result.tracking.eta ? new Date(result.tracking.eta) : undefined,
        etd: result.tracking.etd ? new Date(result.tracking.etd) : undefined,
      }).where(eq(shipments.id, shipmentId));
    }

    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true, shipsGoRegistered: result.success };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error' };
  }
}

export async function togglePartLotAction(shipmentId: string, isPartLot: boolean) {
  const { profile } = await getSuperAdminUser();
  await db.update(shipments).set({ isPartLot, updatedAt: new Date() }).where(eq(shipments.id, shipmentId));
  revalidatePath(`/admin/shipments/${shipmentId}`);
  return { success: true };
}

export async function updateFreightSellPriceAction(shipmentId: string, freightSellValue: string) {
  const { profile } = await getSuperAdminUser();
  await db.update(shipmentFreightReceipts).set({ freightSellValue }).where(eq(shipmentFreightReceipts.shipmentId, shipmentId));
  revalidatePath(`/admin/shipments/${shipmentId}`);
  return { success: true };
}

export async function uploadShipmentDocumentAction(formData: FormData) {
  const { profile } = await getSuperAdminUser();
  const shipmentId = formData.get('shipmentId') as string;
  const type = formData.get('type') as string;
  const name = formData.get('name') as string;
  const file = formData.get('file') as File;
  const supplierId = formData.get('supplierId') as string | null;

  if (!file || file.size === 0) return { success: false, error: 'No file provided' };

  try {
    const { uploadShipmentDocument } = await import('@/services/shipment-documents.service');
    await uploadShipmentDocument({
      shipmentId,
      type,
      name,
      file,
      uploadedById: profile.id,
      metadata: supplierId ? { supplierId } : undefined,
    });
    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error' };
  }
}

// ========================================
// Step 4: Customs Clearance Actions
// ========================================

export async function generate90InvoiceAction(shipmentId: string) {
  const { profile } = await getSuperAdminUser();
  try {
    const txn = await generate90Invoice(shipmentId);
    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true, data: txn };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error' };
  }
}

export async function registerDuimpAction(shipmentId: string, duimpNumber: string) {
  const { profile } = await getSuperAdminUser();
  try {
    await inngest.send({
      name: 'shipment/duimp.registered',
      data: { shipmentId, duimpNumber },
    });
    // Save number immediately (Inngest will fetch Siscomex data async)
    await db.update(shipments).set({ duimpNumber, updatedAt: new Date() }).where(eq(shipments.id, shipmentId));
    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error' };
  }
}

// ========================================
// Step 5: Completion Actions
// ========================================

export async function saveCompletionCostsAction(shipmentId: string, costs: { icmsExitTaxes: string; storageCost: string; discounts: string }) {
  const { profile } = await getSuperAdminUser();
  await db.update(shipments).set({
    icmsExitTaxes: costs.icmsExitTaxes || null,
    storageCost: costs.storageCost || null,
    discounts: costs.discounts || null,
    updatedAt: new Date(),
  }).where(eq(shipments.id, shipmentId));
  revalidatePath(`/admin/shipments/${shipmentId}`);
  return { success: true };
}

export async function generateBalanceInvoiceAction(shipmentId: string, amountBrl: string) {
  const { profile } = await getSuperAdminUser();
  try {
    const shipment = await db.query.shipments.findFirst({ where: eq(shipments.id, shipmentId), columns: { clientOrganizationId: true } });
    if (!shipment) return { success: false, error: 'Not found' };
    const txn = await createShipmentTransaction({ shipmentId, organizationId: shipment.clientOrganizationId, type: 'BALANCE', amountBrl });
    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true, data: txn };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error' };
  }
}

export async function generateServiceFeeInvoiceAction(shipmentId: string) {
  const { profile } = await getSuperAdminUser();
  try {
    const shipment = await db.query.shipments.findFirst({
      where: eq(shipments.id, shipmentId),
      columns: { clientOrganizationId: true, totalProductsUsd: true, totalCostsBrl: true },
    });
    if (!shipment) return { success: false, error: 'Not found' };

    const { calculateServiceFee } = await import('@/services/service-fee.service');
    const feeResult = await calculateServiceFee({
      clientOrganizationId: shipment.clientOrganizationId,
      totalProductsUsd: parseFloat(shipment.totalProductsUsd ?? '0'),
      exchangeRate: 5.0, // TODO: use actual exchange rate from quote or latest PTAX
      totalCostsBrl: parseFloat(shipment.totalCostsBrl ?? '0'),
    });

    const txn = await createShipmentTransaction({
      shipmentId,
      organizationId: shipment.clientOrganizationId,
      type: 'SERVICE_FEE',
      amountBrl: String(feeResult.serviceFee),
    });
    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true, data: { ...txn, feeDetails: feeResult } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error' };
  }
}
```

You'll need to add these imports at the top of the actions file:
```typescript
import { db } from '@/db';
import { shipments, exchangeContracts } from '@/db/schema';
import { shipmentFreightReceipts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createShipmentTransaction, markTransactionPaid, generate90Invoice } from '@/services/shipment-workflow.service';
import { inngest } from '@/inngest/client';
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(admin)/admin/shipments/[id]/actions.ts
git commit -m "feat: add step-specific server actions for all 5 steps"
```

---

## Task 4: Modals — Generate Invoice, Register Payment, Exchange Contract

**Files:**
- Create: `src/app/(admin)/admin/shipments/components/modals/generate-invoice-modal.tsx`
- Create: `src/app/(admin)/admin/shipments/components/modals/register-payment-modal.tsx`
- Create: `src/app/(admin)/admin/shipments/components/modals/create-exchange-contract-modal.tsx`

Each modal follows the pattern established in the codebase: HeroUI Modal compound component, Zod-validated form, useTranslations for labels.

- [ ] **Step 1: Create generate-invoice-modal.tsx**

Shared modal for generating invoices (FOB partial, 90%, balance, service fee).

Props: `shipmentId`, `type` (MERCHANDISE | BALANCE | SERVICE_FEE), `defaultAmount?`, `currency` (USD | BRL), `readOnly?` (amount not editable for 90%/balance), `onSuccess`, `trigger` (ReactNode)

Uses `generateFobInvoiceAction` for MERCHANDISE, `generate90InvoiceAction` for BALANCE, `generateServiceFeeInvoiceAction` for SERVICE_FEE.

- [ ] **Step 2: Create register-payment-modal.tsx**

For DIRECT_ORDER — register off-platform payment.

Props: `shipmentId`, `onSuccess`, `trigger`

Fields: amountUsd (input), paymentDate (input date), proof (FileUpload). Uses `registerManualPaymentAction`.

- [ ] **Step 3: Create create-exchange-contract-modal.tsx**

Props: `shipmentId`, `transactions` (for select), `suppliers` (for select), `brokers` (from currencyExchangeBrokers), `onSuccess`, `trigger`

Fields: supplier (select), transaction (select), contractNumber (input), broker (select), amountUsd (input), exchangeRate (input), closedAt (input date), swiftFile (FileUpload), contractFile (FileUpload). Uses `createExchangeContractAction`.

IMPORTANT: Read existing modal patterns in the codebase (e.g., `create-proforma-quote-modal.tsx`) to match the exact HeroUI v3 Modal API pattern used in the project.

- [ ] **Step 4: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(admin)/admin/shipments/components/modals/
git commit -m "feat: add invoice, payment, and exchange contract modals"
```

---

## Task 5: Step 1 — Merchandise Payment Component

**Files:**
- Replace: `src/app/(admin)/admin/shipments/components/steps/merchandise-payment-step.tsx`

Replace the placeholder with full implementation.

- [ ] **Step 1: Implement the component**

Sections:
1. **Production** — date input for `productionReadyDate`, read-only `fobAdvancePercentage`
2. **FOB Payments** — progress bar, transactions table, [Gerar Fatura] button (opens GenerateInvoiceModal), [Registrar Pagamento] button (opens RegisterPaymentModal, DIRECT_ORDER only)
3. **Exchange Contracts** — table of contracts, [Novo Contrato] button (opens CreateExchangeContractModal)

Key data from `shipment` prop:
- `shipment.transactions` — filter by `type === 'MERCHANDISE'`
- `shipment.transactions[].exchangeContracts` — flatten for contract table
- `shipment.totalProductsUsd` — FOB total
- `shipment.productionReadyDate`
- `shipment.fobAdvancePercentage`
- `shipment.clientOrganization?.orderType` — determines if Register Payment button shows

When `readOnly`, hide all action buttons and disable inputs.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(admin)/admin/shipments/components/steps/merchandise-payment-step.tsx
git commit -m "feat: implement merchandise payment step with payments and exchange contracts"
```

---

## Task 6: Step 2 — Shipping Preparation Component

**Files:**
- Replace: `src/app/(admin)/admin/shipments/components/steps/shipping-preparation-step.tsx`

- [ ] **Step 1: Implement the component**

Sections:
1. **Booking & Tracking** — inputs for bookingNumber and MBL with save buttons. After ShipsGo registration: display carrier, ETD, ETA, cargo type, tracking link. Part Lot checkbox. Containers list.
2. **Freight** — read-only cost from `freightReceipt.freightValue`, editable sell price input.
3. **Documents** — FileUpload for MBL (type: MBL_DOCUMENT) and HBL (type: HBL_DOCUMENT).

Key data:
- `shipment.bookingNumber`, `shipment.masterBl`
- `shipment.shipsGoId`, `shipment.shipsGoTrackingUrl`, `shipment.eta`, `shipment.etd`
- `shipment.isPartLot`, `shipment.shipmentType`
- `shipment.containers`
- `shipment.freightReceipt?.freightValue`, `shipment.freightReceipt?.freightSellValue`
- `shipment.documents` — filter by type MBL_DOCUMENT, HBL_DOCUMENT

Uses `updateBookingNumberAction`, `registerMblAction`, `togglePartLotAction`, `updateFreightSellPriceAction`, `uploadShipmentDocumentAction`.

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/admin/shipments/components/steps/shipping-preparation-step.tsx
git commit -m "feat: implement shipping preparation step with ShipsGo and freight"
```

---

## Task 7: Step 3 — Document Preparation Component

**Files:**
- Replace: `src/app/(admin)/admin/shipments/components/steps/document-preparation-step.tsx`

- [ ] **Step 1: Implement the component**

Sections:
1. **Exchange Summary** (read-only) — total paid per supplier, average rate, number of contracts. Data from `shipment.transactions` with `exchangeContracts` grouped by `supplierId`.
2. **Documents per Supplier** — derive suppliers from `shipment.quote.items[].variant.product.supplier`. For each supplier: Invoice upload (COMMERCIAL_INVOICE) + Packing List upload (PACKING_LIST) with status indicators.
3. **Other Documents** — list of OTHER type documents + [Add Document] button.
4. **Checklist** — count pending docs, show warning if incomplete.

Uses `uploadShipmentDocumentAction` with `supplierId` in metadata.

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/admin/shipments/components/steps/document-preparation-step.tsx
git commit -m "feat: implement document preparation step with supplier grouping"
```

---

## Task 8: Step 4 — Customs Clearance Component

**Files:**
- Replace: `src/app/(admin)/admin/shipments/components/steps/customs-clearance-step.tsx`

- [ ] **Step 1: Implement the component**

Sections:
1. **90% Invoice** — display calculation (totalCostsBrl - totalPaidBrl → remaining → 90%), [Gerar Fatura] button, status display. Find BALANCE transaction from `shipment.transactions`.
2. **DUIMP** — input for duimpNumber + [Registrar] button. After registration: channel chip (colored), tax breakdown table from `shipment.expenses` filtered by TAX_* categories.

Key data:
- `shipment.totalCostsBrl`, transaction totals for BRL
- `shipment.duimpNumber`, `shipment.duimpChannel`
- `shipment.expenses` — filter by TAX_* categories

Channel chip colors: GREEN=success, YELLOW=warning, RED=danger, GREY=default.

Uses `generate90InvoiceAction`, `registerDuimpAction`.

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/admin/shipments/components/steps/customs-clearance-step.tsx
git commit -m "feat: implement customs clearance step with 90% invoice and DUIMP"
```

---

## Task 9: Step 5 — Completion Component

**Files:**
- Replace: `src/app/(admin)/admin/shipments/components/steps/completion-step.tsx`

- [ ] **Step 1: Implement the component**

Sections:
1. **Fiscal Documents** — FileUpload for STORAGE_INVOICE (PDF), SALES_INVOICE_PDF, SALES_INVOICE_XML.
2. **Final Costs** — decimal inputs for icmsExitTaxes, storageCost, discounts + [Salvar] button.
3. **P&L** — calculate totalRealized, finalBalance. Show [Gerar Fatura do Saldo] if balance > 0, "Ressarcimento pendente" if < 0.
4. **Service Fee** — call `calculateServiceFee` results display (read-only summary: base, percentage, calculated value, minimum floor, final fee, whether minimum was used). [Gerar Fatura de Honorários] button.

Key data:
- `shipment.icmsExitTaxes`, `shipment.storageCost`, `shipment.discounts`
- `shipment.expenses` — sum TAX_* values for Siscomex taxes
- `shipment.transactions` — filter by type for paid amounts
- `shipment.totalCostsBrl`, `shipment.totalProductsUsd`

Uses `saveCompletionCostsAction`, `uploadShipmentDocumentAction`, `generateBalanceInvoiceAction`, `generateServiceFeeInvoiceAction`.

Note: Service fee calculation needs to be done client-side for display. Pass the fee result from `generateServiceFeeInvoiceAction` or compute it via a separate server action/service call. For simplicity, the step component can call a new `getServiceFeePreviewAction(shipmentId)` that returns the fee calculation without creating a transaction.

- [ ] **Step 2: Add getServiceFeePreviewAction to actions.ts**

```typescript
export async function getServiceFeePreviewAction(shipmentId: string) {
  const { profile } = await getSuperAdminUser();
  const shipment = await db.query.shipments.findFirst({
    where: eq(shipments.id, shipmentId),
    columns: { clientOrganizationId: true, totalProductsUsd: true, totalCostsBrl: true },
  });
  if (!shipment) return { success: false, error: 'Not found' };

  const { calculateServiceFee } = await import('@/services/service-fee.service');
  const result = await calculateServiceFee({
    clientOrganizationId: shipment.clientOrganizationId,
    totalProductsUsd: parseFloat(shipment.totalProductsUsd ?? '0'),
    exchangeRate: 5.0, // TODO: use actual rate
    totalCostsBrl: parseFloat(shipment.totalCostsBrl ?? '0'),
  });
  return { success: true, data: result };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(admin)/admin/shipments/components/steps/completion-step.tsx src/app/(admin)/admin/shipments/[id]/actions.ts
git commit -m "feat: implement completion step with P&L and service fee"
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

- [ ] **Step 3: Fix any issues**

- [ ] **Step 4: Commit fixes if any**

```bash
git add -A
git commit -m "fix: resolve build issues from step components"
```

---

## Execution Order & Dependencies

```
Task 1 (Document Service) ─────┐
Task 2 (i18n Keys) ────────────┤→ Task 3 (Server Actions)
                                        ↓
                                Task 4 (Modals) ──→ Task 5 (Step 1: Merchandise Payment)
                                                     Task 6 (Step 2: Shipping Prep)
                                                     Task 7 (Step 3: Documents)
                                                     Task 8 (Step 4: Customs)
                                                     Task 9 (Step 5: Completion)
                                                            ↓
                                                     Task 10 (Verify Build)
```

Tasks 1-2 are independent.
Task 3 depends on Task 1.
Task 4 depends on Task 3.
Tasks 5-9 depend on Tasks 3 and 4, but are independent of each other.
Task 10 runs last.
