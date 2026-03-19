# Shipment Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full shipment lifecycle management with 5 operational steps, Inngest state machine orchestration, payment integration (Asaas + manual), and ShipsGo/Siscomex integrations.

**Architecture:** State Machine via Inngest. Each shipment step has entry conditions, actions, and exit conditions. Server Actions call services, services dispatch Inngest events, Inngest functions orchestrate side effects and step transitions. Webhooks (Asaas, ShipsGo, ZapSign) feed events into the state machine.

**Tech Stack:** Next.js 16 (App Router), React 19, Drizzle ORM, Inngest, Zod, next-intl, Hero UI, Supabase Storage

**Spec:** `docs/superpowers/specs/2026-03-18-shipment-management-design.md`

---

## File Structure

### Schema & Database
- **Modify:** `src/db/schema/enums.ts` — update enums (steps, status, document types, expense types, add duimpChannel)
- **Modify:** `src/db/schema/shipments.ts` — add new fields (productionReadyDate, fobAdvancePercentage, isPartLot, duimp fields, financial inputs, metadata on documents)
- **Modify:** `src/db/schema/freight.ts` — add `freightSellValue` to shipmentFreightReceipts
- **Modify:** `src/db/schema/relations.ts` — no changes needed (relations already cover all tables)
- **Modify:** `src/db/schema/index.ts` — no changes needed (already exports all)

### Services (Business Logic)
- **Create:** `src/services/shipment-workflow.service.ts` — main orchestration: step transitions, payment logic, item editing, cancellation
- **Create:** `src/services/shipment.service.ts` — data access: queries, getById, getByStep, financial summaries
- **Create:** `src/services/service-fee.service.ts` — honorários calculation logic
- **Create:** `src/lib/asaas/client.ts` — Asaas API client (invoice creation, cancellation, webhook validation)
- **Modify:** `src/lib/shipsgo/client.ts` — add tracking creation and container fetch methods
- **Modify:** `src/services/zapsign.service.ts` — add createAmendmentDocument method (Phase 2: items.changed flow)
- **Create:** `src/lib/siscomex/client.ts` — Siscomex Portal Único API client

### Inngest Functions
- **Create:** `src/inngest/events.ts` — typed event definitions for all shipment events
- **Create:** `src/inngest/functions/shipment-step-evaluator.ts` — central state machine evaluator
- **Create:** `src/inngest/functions/shipment-payment-received.ts` — handles payment confirmation
- **Create (Phase 2):** `src/inngest/functions/shipment-items-changed.ts` — recalculate + amendment flow (depends on ZapSign amendment template)
- **Create:** `src/inngest/functions/shipment-shipsgo-updated.ts` — tracking updates
- **Create:** `src/inngest/functions/shipment-duimp-registered.ts` — Siscomex integration
- **Modify:** `src/app/api/inngest/route.ts` — register new functions

### Webhook Routes
- **Create:** `src/app/api/webhooks/asaas/route.ts` — Asaas payment webhook
- **Create:** `src/app/api/webhooks/shipsgo/route.ts` — ShipsGo tracking webhook
- **Modify:** `src/app/api/webhooks/zapsign/route.ts` — handle amendment signed events (in addition to existing contract signed)

### i18n
- **Modify:** `messages/pt.json` — add all shipment management translation keys

---

## Task 1: Schema Changes — Enums

**Files:**
- Modify: `src/db/schema/enums.ts`

- [ ] **Step 1: Update `shipmentStepEnum`**

```typescript
// Replace line 17
export const shipmentStepEnum = pgEnum('shipment_step', ['CONTRACT_CREATION', 'MERCHANDISE_PAYMENT', 'SHIPPING_PREPARATION', 'DOCUMENT_PREPARATION', 'CUSTOMS_CLEARANCE', 'COMPLETION']);
```

Old: `['CONTRACT_CREATION', 'MERCHANDISE_PAYMENT', 'DOCUMENT_PREPARATION', 'SHIPPING', 'DELIVERY', 'COMPLETION']`

Changes: removed `DELIVERY`, renamed `SHIPPING` → `SHIPPING_PREPARATION`, added `CUSTOMS_CLEARANCE`, reordered.

- [ ] **Step 2: Update `shipmentStatusEnum`**

```typescript
// Replace line 15
export const shipmentStatusEnum = pgEnum('shipment_status', ['PENDING', 'PRODUCTION', 'BOOKED', 'IN_TRANSIT', 'CUSTOMS_CLEARANCE', 'RELEASED', 'DELIVERED', 'FINISHED', 'CANCELED']);
```

Added: `FINISHED` after `DELIVERED`.

- [ ] **Step 3: Update `documentTypeEnum`**

```typescript
// Replace line 26
export const documentTypeEnum = pgEnum('document_type', ['COMMERCIAL_INVOICE', 'PACKING_LIST', 'BILL_OF_LADING', 'IMPORT_DECLARATION', 'ORIGIN_CERTIFICATE', 'SISCOMEX_RECEIPT', 'ICMS_PROOF', 'MBL_DOCUMENT', 'HBL_DOCUMENT', 'STORAGE_INVOICE', 'SALES_INVOICE_PDF', 'SALES_INVOICE_XML', 'OTHER']);
```

Added: `MBL_DOCUMENT`, `HBL_DOCUMENT`, `STORAGE_INVOICE`, `SALES_INVOICE_PDF`, `SALES_INVOICE_XML`.

- [ ] **Step 4: Update `expenseTypeEnum`**

```typescript
// Replace line 20
export const expenseTypeEnum = pgEnum('expense_type', ['TAX_II', 'TAX_IPI', 'TAX_PIS', 'TAX_COFINS', 'TAX_ICMS', 'TAX_SISCOMEX', 'FREIGHT_INTL', 'FREIGHT_LOCAL', 'STORAGE', 'HANDLING', 'CUSTOMS_BROKER', 'DISCOUNT', 'OTHER']);
```

Added: `TAX_SISCOMEX`, `DISCOUNT`.

- [ ] **Step 5: Add `duimpChannelEnum`**

```typescript
// Add after line 15 (shipmentStatusEnum)
export const duimpChannelEnum = pgEnum('duimp_channel', ['GREEN', 'YELLOW', 'RED', 'GREY']);
```

- [ ] **Step 6: Generate and run migration**

```bash
bun drizzle-kit generate
bun drizzle-kit migrate
```

Note: Since there are no shipments in production, the enum DROP+recreate for `shipmentStepEnum` is safe. If Drizzle doesn't handle this automatically, a custom SQL migration will be needed to DROP and recreate the enum.

- [ ] **Step 7: Commit**

```bash
git add src/db/schema/enums.ts drizzle/
git commit -m "feat(schema): update enums for shipment management steps"
```

---

## Task 2: Schema Changes — Shipment Fields

**Files:**
- Modify: `src/db/schema/shipments.ts`
- Modify: `src/db/schema/freight.ts`

- [ ] **Step 1: Add new fields to `shipments` table**

In `src/db/schema/shipments.ts`, add the import for `duimpChannelEnum`:

```typescript
import {
  shipmentStatusEnum,
  shippingModalityEnum,
  shipmentStepEnum,
  containerTypeEnum,
  expenseTypeEnum,
  currencyEnum,
  paymentStatusEnum,
  documentTypeEnum,
  duimpChannelEnum, // NEW
} from './enums';
```

Add the following fields to the `shipments` table definition, after the `totalCostsBrl` field (line 44) and before `etd`:

```typescript
  // Passo 1: Merchandise Payment
  productionReadyDate: timestamp('production_ready_date'),
  fobAdvancePercentage: decimal('fob_advance_percentage', { precision: 5, scale: 2 }).default('30'),

  // Passo 2: Shipping Preparation
  isPartLot: boolean('is_part_lot').default(false).notNull(),

  // Passo 4: Customs Clearance
  duimpNumber: text('duimp_number'),
  duimpChannel: duimpChannelEnum('duimp_channel'),
  duimpData: jsonb('duimp_data'),

  // Passo 5: Completion (denormalized caches — authoritative source is shipmentExpenses)
  icmsExitTaxes: decimal('icms_exit_taxes', { precision: 12, scale: 2 }),
  storageCost: decimal('storage_cost', { precision: 12, scale: 2 }),
  discounts: decimal('discounts', { precision: 12, scale: 2 }),
```

- [ ] **Step 2: Add `metadata` to `shipmentDocuments`**

In the `shipmentDocuments` table definition, add after `url` (line 111):

```typescript
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
```

- [ ] **Step 3: Add `freightSellValue` to `shipmentFreightReceipts`**

In `src/db/schema/freight.ts`, add after `freightValue` (line 171):

```typescript
  freightSellValue: decimal('freight_sell_value', { precision: 10, scale: 2 }),
```

- [ ] **Step 4: Generate and run migration**

```bash
bun drizzle-kit generate
bun drizzle-kit migrate
```

- [ ] **Step 5: Commit**

```bash
git add src/db/schema/shipments.ts src/db/schema/freight.ts drizzle/
git commit -m "feat(schema): add shipment management fields and freight sell value"
```

---

## Task 3: Inngest Event Types

**Files:**
- Create: `src/inngest/events.ts`
- Modify: `src/inngest/client.ts`

- [ ] **Step 1: Create typed event definitions**

Create `src/inngest/events.ts`:

```typescript
/** Typed Inngest event definitions for the shipment management state machine. */

export type ShipmentEvents = {
  /** Evaluate step conditions and auto-advance if met */
  'shipment/step.evaluate': {
    data: { shipmentId: string };
  };

  /** Payment confirmed (Asaas webhook or manual registration) */
  'shipment/payment.received': {
    data: { transactionId: string; shipmentId: string };
  };

  /** ZapSign amendment signed by client (Phase 2: items.changed flow) */
  'shipment/amendment.signed': {
    data: { shipmentId: string; docToken: string };
  };

  /** ShipsGo tracking update received */
  'shipment/shipsgo.updated': {
    data: { shipmentId: string; shipsGoId: string; payload: Record<string, unknown> };
  };

  /** Admin registered DUIMP number — triggers Siscomex API fetch */
  'shipment/duimp.registered': {
    data: { shipmentId: string; duimpNumber: string };
  };

  /** Existing quote contract signed event */
  'quote/contract.signed': {
    data: { quoteId: string };
  };
};
```

- [ ] **Step 2: Update Inngest client with typed events**

Replace `src/inngest/client.ts`:

```typescript
import { EventSchemas, Inngest } from 'inngest';
import type { ShipmentEvents } from './events';

export const inngest = new Inngest({
  id: 'sg-imports',
  schemas: new EventSchemas().fromRecord<ShipmentEvents>(),
});
```

This uses Inngest v3's `EventSchemas` to get compile-time type checking on all `inngest.send()` and `createFunction` event parameters.

- [ ] **Step 3: Commit**

```bash
git add src/inngest/events.ts src/inngest/client.ts
git commit -m "feat(inngest): add typed event definitions for shipment state machine"
```

---

## Task 4: Shipment Data Access Service

**Files:**
- Create: `src/services/shipment.service.ts`

- [ ] **Step 1: Create the service**

```typescript
import { db } from '@/db';
import {
  shipments,
  transactions,
  exchangeContracts,
  shipmentDocuments,
  shipmentStepHistory,
  shipmentExpenses,
} from '@/db/schema';
import { eq, and, sum, sql } from 'drizzle-orm';

/** Fetch a shipment by ID with all relations needed for step evaluation */
export async function getShipmentById(shipmentId: string) {
  return db.query.shipments.findFirst({
    where: eq(shipments.id, shipmentId),
    with: {
      sellerOrganization: true,
      clientOrganization: true,
      quote: { with: { items: true } },
      transactions: { with: { exchangeContracts: true } },
      documents: true,
      containers: true,
      expenses: true,
      stepHistory: true,
      freightReceipt: true,
    },
  });
}

/** Get total paid in USD for MERCHANDISE transactions */
export async function getTotalMerchandisePaidUsd(shipmentId: string): Promise<number> {
  const [result] = await db
    .select({ total: sum(transactions.amountUsd) })
    .from(transactions)
    .where(
      and(
        eq(transactions.shipmentId, shipmentId),
        eq(transactions.type, 'MERCHANDISE'),
        eq(transactions.status, 'PAID')
      )
    );
  return parseFloat(result?.total ?? '0');
}

/** Get total paid in BRL for MERCHANDISE transactions (for 90% invoice calc) */
export async function getTotalMerchandisePaidBrl(shipmentId: string): Promise<number> {
  const [result] = await db
    .select({ total: sum(transactions.amountBrl) })
    .from(transactions)
    .where(
      and(
        eq(transactions.shipmentId, shipmentId),
        eq(transactions.type, 'MERCHANDISE'),
        eq(transactions.status, 'PAID')
      )
    );
  return parseFloat(result?.total ?? '0');
}

/** Check if the 90% invoice is paid */
export async function is90InvoicePaid(shipmentId: string): Promise<boolean> {
  const result = await db.query.transactions.findFirst({
    where: and(
      eq(transactions.shipmentId, shipmentId),
      eq(transactions.type, 'BALANCE'),
      eq(transactions.status, 'PAID')
    ),
  });
  return !!result;
}

/** Get exchange contract summary grouped by supplier for Step 3 display */
export async function getExchangeContractSummary(shipmentId: string) {
  const txns = await db.query.transactions.findMany({
    where: and(
      eq(transactions.shipmentId, shipmentId),
      eq(transactions.type, 'MERCHANDISE'),
      eq(transactions.status, 'PAID')
    ),
    with: {
      exchangeContracts: { with: { broker: true } },
    },
  });

  return txns.map((t) => ({
    transactionId: t.id,
    amountUsd: t.amountUsd,
    amountBrl: t.amountBrl,
    exchangeRate: t.exchangeRate,
    contracts: t.exchangeContracts,
  }));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/shipment.service.ts
git commit -m "feat: add shipment data access service"
```

---

## Task 5: Shipment Workflow Service — Core Step Logic

**Files:**
- Create: `src/services/shipment-workflow.service.ts`

This is the main orchestration service. It contains the business logic for advancing steps, creating transactions, and validating conditions.

- [ ] **Step 1: Create the service with step advancement logic**

```typescript
import { db } from '@/db';
import { shipments, shipmentStepHistory, transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { inngest } from '@/inngest/client';

/** Map from step to shipment status */
const STEP_TO_STATUS = {
  CONTRACT_CREATION: 'PENDING',
  MERCHANDISE_PAYMENT: 'PRODUCTION',
  SHIPPING_PREPARATION: 'BOOKED',
  DOCUMENT_PREPARATION: 'IN_TRANSIT',
  CUSTOMS_CLEARANCE: 'CUSTOMS_CLEARANCE',
  COMPLETION: 'DELIVERED',
} as const;

/** Ordered steps for determining next step */
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

/** Advance shipment to the next step. Idempotent — checks current state first. */
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
    // Already advanced — idempotent no-op
    return { advanced: false, currentStep: shipment.currentStep };
  }

  const nextStep = getNextStep(expectedCurrentStep);
  if (!nextStep) throw new Error(`No next step after ${expectedCurrentStep}`);

  const newStatus = STEP_TO_STATUS[nextStep];

  await db.transaction(async (tx) => {
    // Complete current step
    await tx.insert(shipmentStepHistory).values({
      shipmentId,
      step: expectedCurrentStep,
      status: 'COMPLETED',
      completedAt: new Date(),
      completedById: completedById ?? null,
    });

    // Start next step
    await tx.insert(shipmentStepHistory).values({
      shipmentId,
      step: nextStep,
      status: 'PENDING',
    });

    // Update shipment
    await tx
      .update(shipments)
      .set({
        currentStep: nextStep,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, shipmentId));
  });

  return { advanced: true, currentStep: nextStep, status: newStatus };
}

/** Generate initial FOB advance invoice on shipment creation */
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

  const isDirectOrder = shipment.clientOrganization?.orderType === 'DIRECT_ORDER';

  if (isDirectOrder) {
    // DIRECT_ORDER: create PENDING transaction (no gateway)
    return createShipmentTransaction({
      shipmentId,
      organizationId: shipment.clientOrganizationId,
      type: 'MERCHANDISE',
      amountUsd: String(advanceUsd),
    });
  }

  // ORDER: generate Asaas invoice
  // TODO: Convert USD to BRL using current exchange rate, create Asaas payment
  // For now, create transaction with PENDING status — Asaas integration in Task 7
  return createShipmentTransaction({
    shipmentId,
    organizationId: shipment.clientOrganizationId,
    type: 'MERCHANDISE',
    amountUsd: String(advanceUsd),
  });
}

/** Generate 90% invoice for customs clearance step */
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

  const { getTotalMerchandisePaidBrl } = await import('@/services/shipment.service');
  const totalCostsBrl = parseFloat(shipment.totalCostsBrl ?? '0');
  const totalPaidBrl = await getTotalMerchandisePaidBrl(shipmentId);
  const remainingValue = totalCostsBrl - totalPaidBrl;
  const invoice90 = roundBrl(remainingValue * 0.90);

  const isDirectOrder = shipment.clientOrganization?.orderType === 'DIRECT_ORDER';

  if (isDirectOrder) {
    return createShipmentTransaction({
      shipmentId,
      organizationId: shipment.clientOrganizationId,
      type: 'BALANCE',
      amountBrl: String(invoice90),
    });
  }

  // ORDER: generate Asaas invoice
  return createShipmentTransaction({
    shipmentId,
    organizationId: shipment.clientOrganizationId,
    type: 'BALANCE',
    amountBrl: String(invoice90),
  });
}

function roundBrl(value: number): number {
  const factor = 100;
  const shifted = value * factor;
  const floored = Math.floor(shifted);
  const decimal = shifted - floored;
  if (decimal > 0.5) return (floored + 1) / factor;
  if (decimal < 0.5) return floored / factor;
  return (floored % 2 === 0 ? floored : floored + 1) / factor;
}

/** Cancel a shipment at any step */
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
    // Record cancellation in step history
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

  // TODO Phase 2: Cancel pending Asaas invoices, ZapSign documents

  return { success: true, alreadyCanceled: false };
}

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

/** Mark transaction as paid and dispatch step evaluation */
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

/** Finalize shipment — set status to FINISHED */
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
```

- [ ] **Step 2: Commit**

```bash
git add src/services/shipment-workflow.service.ts
git commit -m "feat: add shipment workflow service with step advancement logic"
```

---

## Task 6: Service Fee Calculation Service

**Files:**
- Create: `src/services/service-fee.service.ts`

- [ ] **Step 1: Create the service**

```typescript
import { db } from '@/db';
import { serviceFeeConfigs, globalServiceFeeConfig } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface ServiceFeeInput {
  clientOrganizationId: string;
  totalProductsUsd: number;
  exchangeRate: number;
  totalCostsBrl: number;
}

interface ServiceFeeResult {
  serviceFee: number;
  calculationBase: 'FOB' | 'INVOICE';
  baseValue: number;
  percentage: number;
  percentageValue: number;
  minimumValue: number;
  usedMinimum: boolean;
}

/**
 * Calculate service fee (honorários) for a shipment.
 *
 * Logic:
 * 1. Fetch org-specific config, fallback to global
 * 2. Base = FOB in BRL (if applyToChina) or totalCostsBrl (NF)
 * 3. percentageValue = base × (percentage / 100)
 * 4. minimumValue = minimumWageBrl × multiplier
 * 5. serviceFee = MAX(percentageValue, minimumValue)
 */
export async function calculateServiceFee(input: ServiceFeeInput): Promise<ServiceFeeResult> {
  // 1. Try org-specific config
  const orgConfig = await db.query.serviceFeeConfigs.findFirst({
    where: eq(serviceFeeConfigs.organizationId, input.clientOrganizationId),
  });

  // 2. Fallback to global
  const global = await db.query.globalServiceFeeConfig.findFirst();
  if (!global) throw new Error('Global service fee config not found');

  const applyToChina = orgConfig?.applyToChinaProducts ?? global.defaultApplyToChina ?? true;
  const percentage = parseFloat(orgConfig?.percentage ?? global.defaultPercentage ?? '2.5');
  const multiplier = orgConfig?.minimumValueMultiplier ?? global.defaultMultiplier ?? 2;
  const minimumWageBrl = parseFloat(global.minimumWageBrl);

  // 3. Determine base
  const calculationBase = applyToChina ? 'FOB' : 'INVOICE';
  const baseValue = applyToChina
    ? input.totalProductsUsd * input.exchangeRate
    : input.totalCostsBrl;

  // 4. Calculate
  const percentageValue = roundBrl(baseValue * (percentage / 100));
  const minimumValue = roundBrl(minimumWageBrl * multiplier);
  const usedMinimum = percentageValue < minimumValue;
  const serviceFee = Math.max(percentageValue, minimumValue);

  return {
    serviceFee,
    calculationBase,
    baseValue: roundBrl(baseValue),
    percentage,
    percentageValue,
    minimumValue,
    usedMinimum,
  };
}

/** Round to 2 decimal places using banker's rounding (HALF_EVEN) */
function roundBrl(value: number): number {
  const factor = 100;
  const shifted = value * factor;
  const floored = Math.floor(shifted);
  const decimal = shifted - floored;

  if (decimal > 0.5) return (floored + 1) / factor;
  if (decimal < 0.5) return floored / factor;
  // Exactly 0.5 — round to even
  return (floored % 2 === 0 ? floored : floored + 1) / factor;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/service-fee.service.ts
git commit -m "feat: add service fee calculation service with org-specific overrides"
```

---

## Task 7: Asaas API Client

**Files:**
- Create: `src/lib/asaas/client.ts`

- [ ] **Step 1: Create the client**

```typescript
/**
 * Asaas Payment Gateway Client
 * @see https://docs.asaas.com/reference
 */

const BASE_URL = process.env.ASAAS_BASE_URL ?? 'https://api.asaas.com/v3';
const API_KEY = process.env.ASAAS_API_KEY;

function getAuthHeaders(): HeadersInit {
  if (!API_KEY) throw new Error('ASAAS_API_KEY is not configured');
  return {
    'access_token': API_KEY,
    'Content-Type': 'application/json',
  };
}

export interface CreatePaymentInput {
  customer: string; // Asaas customer ID
  billingType: 'BOLETO' | 'PIX' | 'UNDEFINED'; // UNDEFINED lets customer choose
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference?: string; // our transactionId for webhook matching
}

export interface AsaasPayment {
  id: string;
  status: string;
  value: number;
  netValue: number;
  billingType: string;
  invoiceUrl: string;
  bankSlipUrl?: string;
  pixQrCode?: string;
  pixCopiaECola?: string;
}

export type CreatePaymentResult =
  | { success: true; payment: AsaasPayment }
  | { success: false; error: string };

/** Create a payment (boleto/PIX) in Asaas */
export async function createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  if (!API_KEY) {
    return { success: false, error: 'Asaas is not configured' };
  }

  try {
    const res = await fetch(`${BASE_URL}/payments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { success: false, error: `Asaas API error ${res.status}: ${body}` };
    }

    const payment = (await res.json()) as AsaasPayment;
    return { success: true, payment };
  } catch (error) {
    return { success: false, error: `Failed to connect to Asaas: ${error}` };
  }
}

/** Cancel a pending payment in Asaas */
export async function cancelPayment(paymentId: string): Promise<boolean> {
  if (!API_KEY) return false;

  try {
    const res = await fetch(`${BASE_URL}/payments/${paymentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Validate Asaas webhook signature */
export function validateWebhookToken(token: string): boolean {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expectedToken) return false;
  return token === expectedToken;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/asaas/client.ts
git commit -m "feat: add Asaas payment gateway API client"
```

---

## Task 8: ShipsGo Client — Tracking Methods

**Files:**
- Modify: `src/lib/shipsgo/client.ts`

- [ ] **Step 1: Add tracking creation and container fetch methods**

Append to the existing `src/lib/shipsgo/client.ts`:

```typescript
// ==========================================
// TRACKING — Create & Fetch
// ==========================================

export interface CreateTrackingInput {
  containerOrBookingNumber: string;
  shippingLine: string; // SCAC code
}

export interface ShipsGoTracking {
  id: string;
  trackingUrl: string;
  status: string;
  containers: ShipsGoContainer[];
  cargoType: string; // FCL, LCL
  etd?: string;
  eta?: string;
  carrier?: string;
}

export interface ShipsGoContainer {
  containerNumber: string;
  type: string;
  status: string;
}

export type CreateTrackingResult =
  | { success: true; tracking: ShipsGoTracking }
  | { success: false; error: string };

/** Create a new tracking in ShipsGo by booking number or container number */
export async function createTracking(input: CreateTrackingInput): Promise<CreateTrackingResult> {
  try {
    const res = await fetch(`${BASE_URL}/ocean/tracking`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        container_or_booking_number: input.containerOrBookingNumber,
        shipping_line: input.shippingLine,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `ShipsGo API error ${res.status}: ${text}` };
    }

    const data = (await res.json()) as ShipsGoTracking;
    return { success: true, tracking: data };
  } catch (error) {
    return { success: false, error: `Failed to connect to ShipsGo: ${error}` };
  }
}

/** Fetch tracking details by ShipsGo ID */
export async function getTracking(shipsGoId: string): Promise<ShipsGoTracking | null> {
  try {
    const res = await fetch(`${BASE_URL}/ocean/tracking/${shipsGoId}`, {
      headers: getAuthHeaders(),
    });

    if (!res.ok) return null;
    return (await res.json()) as ShipsGoTracking;
  } catch {
    return null;
  }
}
```

Note: The exact ShipsGo API endpoints and response shapes must be verified against ShipsGo documentation. The types above are approximations based on common ocean tracking API patterns. Adjust field names and endpoints as needed.

- [ ] **Step 2: Commit**

```bash
git add src/lib/shipsgo/client.ts
git commit -m "feat: add ShipsGo tracking creation and fetch methods"
```

---

## Task 9: Siscomex API Client

**Files:**
- Create: `src/lib/siscomex/client.ts`

- [ ] **Step 1: Create the client**

```typescript
/**
 * Siscomex Portal Único API Client
 * Fetches DUIMP data (taxes, channel, declaration info)
 */

const BASE_URL = process.env.SISCOMEX_BASE_URL;
const CERTIFICATE = process.env.SISCOMEX_CERTIFICATE; // Digital certificate path or token

export interface DuimpData {
  numero: string;
  canal: 'VERDE' | 'AMARELO' | 'VERMELHO' | 'CINZA';
  impostos: {
    ii: number;
    ipi: number;
    pis: number;
    cofins: number;
    taxaSiscomex: number;
  };
  declaracao: Record<string, unknown>; // Full declaration payload
}

type DuimpChannelMap = {
  VERDE: 'GREEN';
  AMARELO: 'YELLOW';
  VERMELHO: 'RED';
  CINZA: 'GREY';
};

const CHANNEL_MAP: DuimpChannelMap = {
  VERDE: 'GREEN',
  AMARELO: 'YELLOW',
  VERMELHO: 'RED',
  CINZA: 'GREY',
};

export type FetchDuimpResult =
  | { success: true; data: DuimpData; channel: 'GREEN' | 'YELLOW' | 'RED' | 'GREY' }
  | { success: false; error: string };

/** Fetch DUIMP data from Siscomex Portal Único */
export async function fetchDuimpData(duimpNumber: string): Promise<FetchDuimpResult> {
  if (!BASE_URL || !CERTIFICATE) {
    return { success: false, error: 'Siscomex API is not configured' };
  }

  try {
    const res = await fetch(`${BASE_URL}/duimp/${duimpNumber}`, {
      headers: {
        Authorization: `Bearer ${CERTIFICATE}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { success: false, error: `Siscomex API error ${res.status}: ${text}` };
    }

    const data = (await res.json()) as DuimpData;
    const channel = CHANNEL_MAP[data.canal] ?? 'GREEN';

    return { success: true, data, channel };
  } catch (error) {
    return { success: false, error: `Failed to connect to Siscomex: ${error}` };
  }
}
```

Note: The exact Siscomex Portal Único API contract must be verified against their documentation. The types above are approximations. The service is already accessible per user confirmation — adjust auth mechanism (certificate, token, etc.) as needed.

- [ ] **Step 2: Commit**

```bash
git add src/lib/siscomex/client.ts
git commit -m "feat: add Siscomex Portal Único API client for DUIMP data"
```

---

## Task 10: Inngest Function — Step Evaluator

**Important i18n note for all Inngest functions (Tasks 10-13):** All notification messages shown in code samples below use hardcoded Portuguese for readability. During implementation, replace with `getTranslations('Shipments.Notifications')` from `next-intl/server`. Example:
```typescript
import { getTranslations } from 'next-intl/server';
const t = await getTranslations('Shipments.Notifications');
// Then use: t('fobComplete'), t('paymentConfirmed', { amount, code }), etc.
```

**Files:**
- Create: `src/inngest/functions/shipment-step-evaluator.ts`

- [ ] **Step 1: Create the central state machine evaluator**

```typescript
import { inngest } from '@/inngest/client';
import { advanceStep } from '@/services/shipment-workflow.service';
import { getTotalMerchandisePaidUsd, is90InvoicePaid } from '@/services/shipment.service';
import { notifyOrganizationMembers } from '@/services/notification.service';
import { db } from '@/db';
import { shipments } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const shipmentStepEvaluator = inngest.createFunction(
  {
    id: 'shipment-step-evaluator',
    concurrency: { key: 'event.data.shipmentId', limit: 1 },
    retries: 3,
  },
  { event: 'shipment/step.evaluate' },
  async ({ event, step }) => {
    const { shipmentId } = event.data;

    const shipment = await step.run('fetch-shipment', async () => {
      return db.query.shipments.findFirst({
        where: eq(shipments.id, shipmentId),
        columns: {
          id: true,
          currentStep: true,
          status: true,
          totalProductsUsd: true,
          duimpNumber: true,
          sellerOrganizationId: true,
          clientOrganizationId: true,
        },
      });
    });

    if (!shipment || shipment.status === 'CANCELED') {
      return { evaluated: false, reason: 'Shipment not found or canceled' };
    }

    // Evaluate conditions based on current step
    if (shipment.currentStep === 'MERCHANDISE_PAYMENT') {
      const shouldAdvance = await step.run('check-fob-paid', async () => {
        const totalPaid = await getTotalMerchandisePaidUsd(shipmentId);
        const totalRequired = parseFloat(shipment.totalProductsUsd ?? '0');
        return totalPaid >= totalRequired && totalRequired > 0;
      });

      if (shouldAdvance) {
        const result = await step.run('advance-to-shipping-prep', async () => {
          return advanceStep(shipmentId, 'MERCHANDISE_PAYMENT');
        });

        if (result.advanced) {
          await step.run('notify-fob-complete', async () => {
            await notifyOrganizationMembers(
              shipment.sellerOrganizationId,
              'Pagamento FOB concluído',
              'O pagamento FOB foi concluído. O pedido avançou para Preparação de Embarque.',
              `/dashboard/shipments/${shipmentId}`,
              'SUCCESS'
            );
            if (shipment.clientOrganizationId) {
              await notifyOrganizationMembers(
                shipment.clientOrganizationId,
                'Pagamento FOB concluído',
                'Seu pagamento FOB foi concluído. O pedido avançou para a próxima etapa.',
                `/dashboard/shipments/${shipmentId}`,
                'SUCCESS'
              );
            }
          });
        }

        return { evaluated: true, advanced: result.advanced, newStep: result.currentStep };
      }
    }

    if (shipment.currentStep === 'CUSTOMS_CLEARANCE') {
      const shouldAdvance = await step.run('check-customs-conditions', async () => {
        const hasDuimp = !!shipment.duimpNumber;
        const invoicePaid = await is90InvoicePaid(shipmentId);
        return hasDuimp && invoicePaid;
      });

      if (shouldAdvance) {
        const result = await step.run('advance-to-completion', async () => {
          return advanceStep(shipmentId, 'CUSTOMS_CLEARANCE');
        });

        if (result.advanced) {
          await step.run('notify-customs-cleared', async () => {
            await notifyOrganizationMembers(
              shipment.sellerOrganizationId,
              'Desembaraço concluído',
              'O desembaraço aduaneiro foi concluído. O pedido avançou para Conclusão.',
              `/dashboard/shipments/${shipmentId}`,
              'SUCCESS'
            );
          });
        }

        return { evaluated: true, advanced: result.advanced, newStep: result.currentStep };
      }
    }

    // Other steps have manual advancement — no auto-evaluation
    return { evaluated: true, advanced: false, currentStep: shipment.currentStep };
  }
);
```

- [ ] **Step 2: Commit**

```bash
git add src/inngest/functions/shipment-step-evaluator.ts
git commit -m "feat(inngest): add shipment step evaluator state machine"
```

---

## Task 11: Inngest Function — Payment Received

**Files:**
- Create: `src/inngest/functions/shipment-payment-received.ts`

- [ ] **Step 1: Create the function**

```typescript
import { inngest } from '@/inngest/client';
import { db } from '@/db';
import { shipments, transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notifyOrganizationMembers } from '@/services/notification.service';

export const shipmentPaymentReceived = inngest.createFunction(
  {
    id: 'shipment-payment-received',
    concurrency: { key: 'event.data.shipmentId', limit: 1 },
    retries: 3,
  },
  { event: 'shipment/payment.received' },
  async ({ event, step }) => {
    const { transactionId, shipmentId } = event.data;

    // Mark transaction as paid
    const txn = await step.run('mark-paid', async () => {
      const [updated] = await db
        .update(transactions)
        .set({ status: 'PAID', paidAt: new Date() })
        .where(eq(transactions.id, transactionId))
        .returning();
      return updated;
    });

    if (!txn) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // Notify admin
    await step.run('notify-admin', async () => {
      const shipment = await db.query.shipments.findFirst({
        where: eq(shipments.id, shipmentId),
        columns: { sellerOrganizationId: true, code: true },
      });

      if (shipment) {
        await notifyOrganizationMembers(
          shipment.sellerOrganizationId,
          'Pagamento confirmado',
          `Pagamento de R$ ${txn.amountBrl} confirmado para o pedido #${shipment.code}.`,
          `/dashboard/shipments/${shipmentId}`,
          'SUCCESS'
        );
      }
    });

    // Trigger step evaluation (may auto-advance if FOB complete)
    await step.run('evaluate-step', async () => {
      await inngest.send({
        name: 'shipment/step.evaluate',
        data: { shipmentId },
      });
    });

    return { success: true, transactionId };
  }
);
```

- [ ] **Step 2: Commit**

```bash
git add src/inngest/functions/shipment-payment-received.ts
git commit -m "feat(inngest): add payment received handler with step evaluation"
```

---

## Task 12: Inngest Function — DUIMP Registered

**Files:**
- Create: `src/inngest/functions/shipment-duimp-registered.ts`

- [ ] **Step 1: Create the function**

```typescript
import { inngest } from '@/inngest/client';
import { db } from '@/db';
import { shipments, shipmentExpenses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { fetchDuimpData } from '@/lib/siscomex/client';
import { notifyOrganizationMembers } from '@/services/notification.service';

export const shipmentDuimpRegistered = inngest.createFunction(
  {
    id: 'shipment-duimp-registered',
    concurrency: { key: 'event.data.shipmentId', limit: 1 },
    retries: 3,
  },
  { event: 'shipment/duimp.registered' },
  async ({ event, step }) => {
    const { shipmentId, duimpNumber } = event.data;

    // Fetch data from Siscomex
    const siscomexResult = await step.run('fetch-siscomex', async () => {
      return fetchDuimpData(duimpNumber);
    });

    if (!siscomexResult.success) {
      // Store DUIMP number even if API fails — admin can retry
      await step.run('save-duimp-number', async () => {
        await db
          .update(shipments)
          .set({ duimpNumber, updatedAt: new Date() })
          .where(eq(shipments.id, shipmentId));
      });
      throw new Error(`Siscomex API failed: ${siscomexResult.error}`);
    }

    // Persist DUIMP data and taxes
    await step.run('persist-duimp-data', async () => {
      const { data, channel } = siscomexResult;

      await db.transaction(async (tx) => {
        // Update shipment with DUIMP info
        await tx
          .update(shipments)
          .set({
            duimpNumber,
            duimpChannel: channel,
            duimpData: data, // Full Siscomex API snapshot
            updatedAt: new Date(),
          })
          .where(eq(shipments.id, shipmentId));

        // Persist taxes as shipment expenses
        const taxEntries = [
          { category: 'TAX_II' as const, value: data.impostos.ii },
          { category: 'TAX_IPI' as const, value: data.impostos.ipi },
          { category: 'TAX_PIS' as const, value: data.impostos.pis },
          { category: 'TAX_COFINS' as const, value: data.impostos.cofins },
          { category: 'TAX_SISCOMEX' as const, value: data.impostos.taxaSiscomex },
        ]
          .filter((e) => e.value > 0)
          .map((e) => ({
            shipmentId,
            category: e.category,
            description: `Imposto ${e.category} - DUIMP ${duimpNumber}`,
            value: String(e.value),
            currency: 'BRL' as const,
            status: 'PENDING' as const,
          }));

        if (taxEntries.length > 0) {
          await tx.insert(shipmentExpenses).values(taxEntries);
        }
      });
    });

    // Notify parties
    await step.run('notify-duimp', async () => {
      const shipment = await db.query.shipments.findFirst({
        where: eq(shipments.id, shipmentId),
        columns: { sellerOrganizationId: true, clientOrganizationId: true, code: true },
      });

      if (!shipment) return;

      const { channel } = siscomexResult;
      const channelLabel = { GREEN: 'Verde', YELLOW: 'Amarelo', RED: 'Vermelho', GREY: 'Cinza' }[channel];
      const isUrgent = channel === 'RED' || channel === 'GREY';

      await notifyOrganizationMembers(
        shipment.sellerOrganizationId,
        isUrgent ? 'DUIMP — Canal de Atenção' : 'DUIMP registrada',
        `DUIMP ${duimpNumber} registrada. Canal: ${channelLabel}.`,
        `/dashboard/shipments/${shipmentId}`,
        isUrgent ? 'WARNING' : 'SUCCESS'
      );

      if (shipment.clientOrganizationId) {
        await notifyOrganizationMembers(
          shipment.clientOrganizationId,
          'DUIMP registrada',
          `A DUIMP do seu pedido #${shipment.code} foi registrada.`,
          `/dashboard/shipments/${shipmentId}`,
          'INFO'
        );
      }
    });

    // Evaluate step (may auto-advance if 90% is also paid)
    await step.run('evaluate-step', async () => {
      await inngest.send({
        name: 'shipment/step.evaluate',
        data: { shipmentId },
      });
    });

    return { success: true, channel: siscomexResult.channel };
  }
);
```

- [ ] **Step 2: Commit**

```bash
git add src/inngest/functions/shipment-duimp-registered.ts
git commit -m "feat(inngest): add DUIMP registration with Siscomex integration"
```

---

## Task 13: Inngest Function — ShipsGo Updated

**Files:**
- Create: `src/inngest/functions/shipment-shipsgo-updated.ts`

- [ ] **Step 1: Create the function**

```typescript
import { inngest } from '@/inngest/client';
import { db } from '@/db';
import { shipments, shipmentStepHistory } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notifyOrganizationMembers } from '@/services/notification.service';

export const shipmentShipsgoUpdated = inngest.createFunction(
  {
    id: 'shipment-shipsgo-updated',
    concurrency: { key: 'event.data.shipmentId', limit: 1 },
    retries: 3,
  },
  { event: 'shipment/shipsgo.updated' },
  async ({ event, step }) => {
    const { shipmentId, payload } = event.data;

    // Update tracking data on shipment
    await step.run('update-tracking', async () => {
      const updateData: Record<string, unknown> = {
        shipsGoLastUpdate: new Date(),
        updatedAt: new Date(),
      };

      // Update ETA/ETD if present in payload
      if (payload.eta) updateData.eta = new Date(payload.eta as string);
      if (payload.etd) updateData.etd = new Date(payload.etd as string);

      await db
        .update(shipments)
        .set(updateData)
        .where(eq(shipments.id, shipmentId));
    });

    // Log significant events in step history
    const eventType = payload.eventType as string | undefined;
    if (eventType) {
      await step.run('log-event', async () => {
        const shipment = await db.query.shipments.findFirst({
          where: eq(shipments.id, shipmentId),
          columns: { currentStep: true },
        });

        if (shipment) {
          await db.insert(shipmentStepHistory).values({
            shipmentId,
            step: shipment.currentStep,
            status: 'PENDING',
            metadata: { shipsGoEvent: eventType, payload },
          });
        }
      });
    }

    // Notify on significant events
    const significantEvents = ['VESSEL_DEPARTED', 'VESSEL_ARRIVED', 'DELIVERED'];
    if (eventType && significantEvents.includes(eventType)) {
      await step.run('notify-tracking', async () => {
        const shipment = await db.query.shipments.findFirst({
          where: eq(shipments.id, shipmentId),
          columns: { sellerOrganizationId: true, clientOrganizationId: true, code: true },
        });

        if (!shipment) return;

        const messages: Record<string, string> = {
          VESSEL_DEPARTED: 'O navio partiu do porto de origem.',
          VESSEL_ARRIVED: 'O navio chegou ao porto de destino.',
          DELIVERED: 'A carga foi entregue.',
        };

        const msg = messages[eventType] ?? `Atualização de tracking: ${eventType}`;

        await notifyOrganizationMembers(
          shipment.sellerOrganizationId,
          'Atualização de rastreamento',
          `Pedido #${shipment.code}: ${msg}`,
          `/dashboard/shipments/${shipmentId}`,
          'INFO'
        );

        if (shipment.clientOrganizationId) {
          await notifyOrganizationMembers(
            shipment.clientOrganizationId,
            'Atualização do seu pedido',
            `Pedido #${shipment.code}: ${msg}`,
            `/dashboard/shipments/${shipmentId}`,
            'INFO'
          );
        }
      });
    }

    return { success: true };
  }
);
```

- [ ] **Step 2: Commit**

```bash
git add src/inngest/functions/shipment-shipsgo-updated.ts
git commit -m "feat(inngest): add ShipsGo tracking update handler"
```

---

## Task 14: Register Inngest Functions

**Files:**
- Modify: `src/app/api/inngest/route.ts`

- [ ] **Step 1: Register all new functions**

```typescript
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { quoteContractSigned } from "@/inngest/functions/quote-contract-signed";
import { shipmentStepEvaluator } from "@/inngest/functions/shipment-step-evaluator";
import { shipmentPaymentReceived } from "@/inngest/functions/shipment-payment-received";
import { shipmentDuimpRegistered } from "@/inngest/functions/shipment-duimp-registered";
import { shipmentShipsgoUpdated } from "@/inngest/functions/shipment-shipsgo-updated";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    quoteContractSigned,
    shipmentStepEvaluator,
    shipmentPaymentReceived,
    shipmentDuimpRegistered,
    shipmentShipsgoUpdated,
  ],
});
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/inngest/route.ts
git commit -m "feat(inngest): register all shipment management functions"
```

---

## Task 15: Webhook Route — Asaas

**Files:**
- Create: `src/app/api/webhooks/asaas/route.ts`

- [ ] **Step 1: Create the webhook handler**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateWebhookToken } from '@/lib/asaas/client';
import { inngest } from '@/inngest/client';
import { db } from '@/db';
import { transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Validate webhook token
    const token = request.headers.get('asaas-access-token') ?? '';
    if (!validateWebhookToken(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const { event, payment } = payload;

    // Only handle confirmed payments
    if (event !== 'PAYMENT_CONFIRMED' && event !== 'PAYMENT_RECEIVED') {
      return NextResponse.json({ ok: true });
    }

    // Find transaction by gateway ID (externalReference or id)
    const externalRef = payment.externalReference as string | undefined;
    const gatewayId = payment.id as string;

    const txn = await db.query.transactions.findFirst({
      where: externalRef
        ? eq(transactions.id, externalRef)
        : eq(transactions.gatewayId, gatewayId),
      columns: { id: true, shipmentId: true, status: true },
    });

    if (!txn || !txn.shipmentId) {
      // Not a shipment payment — ignore gracefully
      return NextResponse.json({ ok: true });
    }

    if (txn.status === 'PAID') {
      // Already processed — idempotent
      return NextResponse.json({ ok: true });
    }

    // Dispatch Inngest event
    await inngest.send({
      name: 'shipment/payment.received',
      data: { transactionId: txn.id, shipmentId: txn.shipmentId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Asaas webhook error:', error);
    // Always return 200 to prevent retries on our errors
    return NextResponse.json({ ok: true });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/webhooks/asaas/route.ts
git commit -m "feat: add Asaas payment webhook handler"
```

---

## Task 16: Webhook Route — ShipsGo

**Files:**
- Create: `src/app/api/webhooks/shipsgo/route.ts`

- [ ] **Step 1: Create the webhook handler**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';
import { db } from '@/db';
import { shipments } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Validate ShipsGo webhook token
    const token = request.headers.get('x-shipsgo-webhook-token') ?? '';
    const expectedToken = process.env.SHIPSGO_WEBHOOK_TOKEN;
    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await request.json();
    const shipsGoId = payload.trackingId ?? payload.id;

    if (!shipsGoId) {
      return NextResponse.json({ error: 'Missing tracking ID' }, { status: 400 });
    }

    // Find shipment by ShipsGo ID
    const shipment = await db.query.shipments.findFirst({
      where: eq(shipments.shipsGoId, String(shipsGoId)),
      columns: { id: true },
    });

    if (!shipment) {
      // Unknown tracking — ignore
      return NextResponse.json({ ok: true });
    }

    await inngest.send({
      name: 'shipment/shipsgo.updated',
      data: {
        shipmentId: shipment.id,
        shipsGoId: String(shipsGoId),
        payload,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('ShipsGo webhook error:', error);
    return NextResponse.json({ ok: true });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/webhooks/shipsgo/route.ts
git commit -m "feat: add ShipsGo tracking webhook handler"
```

---

## Task 17: Update ZapSign Webhook — Amendment Support

**Files:**
- Modify: `src/app/api/webhooks/zapsign/route.ts`

- [ ] **Step 1: Read the existing handler and add amendment logic**

The existing handler dispatches `quote/contract.signed`. We need to also handle amendment documents signed for shipments. The distinction is: if the docToken matches a `quote.zapSignDocToken`, it's a quote contract. If it matches a shipment amendment (stored in `shipmentDocuments` or a future `zapSignAmendmentToken` field), it's an amendment.

For now, add a secondary check after the quote check:

```typescript
// After the existing quote check, add:
// Check if this is a shipment amendment
const shipment = await db.query.shipments.findFirst({
  where: eq(shipments.zapSignToken, docToken),
  columns: { id: true, status: true },
});

if (shipment && shipment.status !== 'CANCELED') {
  await inngest.send({
    name: 'shipment/amendment.signed',
    data: { shipmentId: shipment.id, docToken },
  });
}
```

The exact integration point depends on the current handler structure. Read the file first and add the amendment path.

- [ ] **Step 2: Commit**

```bash
git add src/app/api/webhooks/zapsign/route.ts
git commit -m "feat: add amendment signed handling to ZapSign webhook"
```

---

## Task 18: i18n Translation Keys

**Files:**
- Modify: `messages/pt.json`

- [ ] **Step 1: Add shipment management translation keys**

Add the following keys under a new `"Shipments"` section in `messages/pt.json`:

```json
{
  "Shipments": {
    "Steps": {
      "CONTRACT_CREATION": "Criação do Contrato",
      "MERCHANDISE_PAYMENT": "Pagamento da Mercadoria",
      "SHIPPING_PREPARATION": "Preparação de Embarque",
      "DOCUMENT_PREPARATION": "Preparação de Documentos",
      "CUSTOMS_CLEARANCE": "Desembaraço Aduaneiro",
      "COMPLETION": "Conclusão"
    },
    "Status": {
      "PENDING": "Pendente",
      "PRODUCTION": "Em Produção",
      "BOOKED": "Embarcado",
      "IN_TRANSIT": "Em Trânsito",
      "CUSTOMS_CLEARANCE": "Em Desembaraço",
      "RELEASED": "Liberado",
      "DELIVERED": "Entregue",
      "FINISHED": "Finalizado",
      "CANCELED": "Cancelado"
    },
    "DuimpChannel": {
      "GREEN": "Verde",
      "YELLOW": "Amarelo",
      "RED": "Vermelho",
      "GREY": "Cinza"
    },
    "Notifications": {
      "fobComplete": "O pagamento FOB foi concluído. O pedido avançou para Preparação de Embarque.",
      "paymentConfirmed": "Pagamento de {amount} confirmado para o pedido #{code}.",
      "duimpRegistered": "DUIMP {number} registrada. Canal: {channel}.",
      "duimpUrgent": "DUIMP — Canal de Atenção",
      "customsCleared": "O desembaraço aduaneiro foi concluído. O pedido avançou para Conclusão.",
      "shipmentFinalized": "Pedido #{code} finalizado com sucesso.",
      "trackingUpdate": "Pedido #{code}: {message}",
      "vesselDeparted": "O navio partiu do porto de origem.",
      "vesselArrived": "O navio chegou ao porto de destino.",
      "cargoDelivered": "A carga foi entregue.",
      "invoiceGenerated": "Nova fatura gerada para o pedido #{code}.",
      "amendmentGenerated": "Um aditivo contratual foi gerado. Por favor assine."
    },
    "Actions": {
      "advanceStep": "Avançar Etapa",
      "cancel": "Cancelar Pedido",
      "finalize": "Finalizar Pedido",
      "generateInvoice": "Gerar Fatura",
      "registerPayment": "Registrar Pagamento",
      "attachDocument": "Anexar Documento",
      "registerDuimp": "Registrar DUIMP",
      "registerBooking": "Registrar Booking",
      "setFreightPrice": "Definir Preço do Frete"
    },
    "Labels": {
      "productionReadyDate": "Data Estimada de Prontidão",
      "fobAdvancePercentage": "% Adiantamento FOB",
      "bookingNumber": "Número do Booking",
      "masterBl": "MBL",
      "houseBl": "HBL",
      "isPartLot": "Part Lot",
      "freightSellPrice": "Preço de Venda do Frete",
      "duimpNumber": "Número da DUIMP",
      "duimpChannel": "Canal de Parametrização",
      "icmsExitTaxes": "ICMS e Tributos de Saída",
      "storageCost": "Armazenagem",
      "discounts": "Descontos",
      "serviceFee": "Honorários",
      "finalBalance": "Saldo Final",
      "totalPaidFob": "Total Pago FOB",
      "totalCosts": "Custo Total Estimado",
      "exchangeSummary": "Resumo de Câmbio"
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add messages/pt.json
git commit -m "feat(i18n): add shipment management translation keys"
```

---

## Task 19: Verify Build

- [ ] **Step 1: Run TypeScript check**

```bash
bun run build
```

Expected: No type errors. If there are Drizzle type mismatches from enum changes, fix them.

- [ ] **Step 2: Run existing tests**

```bash
bun test
```

Expected: All existing tests pass (the changes are additive — no existing behavior was modified).

- [ ] **Step 3: Fix any issues found**

Address any type errors or test failures. The most likely issues:
- Drizzle enum types not matching after migration
- Import paths
- Missing re-exports from schema/index.ts

- [ ] **Step 4: Commit fixes if any**

```bash
git add -A
git commit -m "fix: resolve build issues from shipment management schema changes"
```

---

## Execution Order & Dependencies

```
Task 1 (Enums) → Task 2 (Schema Fields) → Task 3 (Events) → Task 4 (Shipment Service)
                                                                        ↓
Task 7 (Asaas Client) ─────────────────────┐                   Task 5 (Workflow Service)
Task 8 (ShipsGo Client) ───────────────────┤                           ↓
Task 9 (Siscomex Client) ──────────────────┤    Task 6 (Service Fee) ──┘
                                            ↓                           ↓
                                    Task 10 (Step Evaluator)
                                    Task 11 (Payment Received)
                                    Task 12 (DUIMP Registered)
                                    Task 13 (ShipsGo Updated)
                                            ↓
                                    Task 14 (Register Functions)
                                            ↓
                               Task 15 (Asaas Webhook)
                               Task 16 (ShipsGo Webhook)
                               Task 17 (ZapSign Amendment)
                                            ↓
                                    Task 18 (i18n)
                                            ↓
                                    Task 19 (Verify Build)
```

**Parallelizable groups:**
- Tasks 7, 8, 9 (API clients) can run in parallel
- Tasks 10, 11, 12, 13 (Inngest functions) can run in parallel after Tasks 4-9
- Tasks 15, 16, 17 (webhooks) can run in parallel

---

## What This Plan Does NOT Cover (Future Tasks)

This plan covers the **backend infrastructure** — schema, services, Inngest functions, webhooks, and i18n. The following are separate implementation cycles:

1. **UI/Frontend** — Shipment management dashboard pages, step-by-step UI, forms, server actions for each step
2. **Item Editing + Amendment flow** (`shipment/items.changed` Inngest function) — Requires ZapSign amendment template setup, recalculation engine integration, and `step.waitForEvent` pattern. Event type is defined but handler is deferred.
3. **Asaas customer sync** — Mapping organizations to Asaas customers (required before Asaas invoice generation works end-to-end)
4. **Asaas invoice generation** — The `createShipmentTransaction` and `generate90Invoice` functions create DB records but don't yet call the Asaas API to generate boleto/PIX. This needs the customer sync first.
5. **Phase 2 automations** — OCR, AI reconciliation, performance reports
