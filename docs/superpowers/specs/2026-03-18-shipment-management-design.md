# Shipment Management — Design Spec

## Overview

Full lifecycle management of import shipments (pedidos) from FOB payment through customs clearance to completion. Supports two order types: **ORDER** (gateway-integrated payments via Asaas) and **DIRECT_ORDER** (manual off-platform payments). The only difference between the two flows is the payment mechanism — all other steps are identical.

The order type is determined by `clientOrganization.orderType` (field on `organizations` table, not per-shipment). An organization is either entirely ORDER or DIRECT_ORDER.

Architecture: **State Machine orchestrated by Inngest** with durable execution, idempotent steps, and concurrency control per shipmentId.

---

## Step Flow

```
CONTRACT_CREATION → MERCHANDISE_PAYMENT → SHIPPING_PREPARATION → DOCUMENT_PREPARATION → CUSTOMS_CLEARANCE → COMPLETION → FINISHED
```

**Rationale for step order:** Shipping preparation (booking, MBL, freight) happens before document preparation because operationally the vessel is booked first, then commercial documents (Invoice, Packing List) are gathered while cargo is in transit. This differs from the current schema order where `DOCUMENT_PREPARATION` comes before `SHIPPING`.

**Note on CONTRACT_CREATION:** This step is handled by the existing `quote-contract-signed` Inngest function which creates the shipment and immediately sets `currentStep = CONTRACT_CREATION`. The shipment transitions to `MERCHANDISE_PAYMENT` automatically upon creation since the contract is already signed at that point.

### Step ↔ Status Mapping

| Step                   | shipmentStatus      | Transition Trigger         |
|------------------------|--------------------|-----------------------------|
| CONTRACT_CREATION      | PENDING            | Auto (on shipment creation) |
| MERCHANDISE_PAYMENT    | PRODUCTION         | Auto (FOB 100% paid)       |
| SHIPPING_PREPARATION   | BOOKED             | Manual (Admin confirms)     |
| DOCUMENT_PREPARATION   | IN_TRANSIT         | Manual (Admin confirms)     |
| CUSTOMS_CLEARANCE      | CUSTOMS_CLEARANCE  | Auto (DUIMP + 90% paid)    |
| COMPLETION             | DELIVERED          | Manual (Admin finalizes)    |
| —                      | FINISHED           | Final state                 |
| —                      | CANCELED           | Any time (see Cancellation) |

**Note on RELEASED status:** The existing `RELEASED` status in `shipmentStatusEnum` is retained for backward compatibility but is not mapped to any step in this flow. It may be used in the future for a more granular customs release state. No existing shipments use it.

---

## `totalCostsBrl` — Definition

`totalCostsBrl` is the **estimated total landed cost in BRL** calculated at quote conversion time. It represents the full expected cost of the shipment including:

- FOB value in BRL (totalProductsUsd × exchangeRate at quote time)
- International freight (estimated)
- All estimated taxes (II, IPI, PIS, COFINS, ICMS)
- Customs broker fees, handling, storage (estimated)

This value is set once during `convertQuoteToShipmentSystem()` from the quote's `landedCostTotalSnapshot` values. It is **recalculated** when items are edited in Step 1 (via the existing tax calculation engine). It serves as the reference for the 90% invoice calculation and the final P&L.

---

## Step 1: MERCHANDISE_PAYMENT (Pagamento da Mercadoria / FOB)

### Purpose
Control FOB payments from client, exchange contracts with brokers, and production timeline.

### Data

New fields on `shipments`:
- `productionReadyDate`: timestamp (nullable) — estimated production ready date
- `fobAdvancePercentage`: decimal (default 30) — advance % defined in quote

### Payment Flow

**ORDER:**
1. Shipment created → system auto-generates invoice for `fobAdvancePercentage`% of FOB via Asaas (boleto/PIX, client chooses)
2. Client pays → Asaas webhook confirms → Inngest records payment
3. Admin creates exchange contract (contract number, bank, rate, attaches Swift PDF + contract PDF)
4. Admin can generate additional partial invoices until FOB is 100% paid
5. FOB 100% paid → Inngest evaluates → auto-advances to SHIPPING_PREPARATION

**DIRECT_ORDER:**
1. Shipment created → system creates transaction with status PENDING (no gateway)
2. Admin manually registers each payment received (amount, date, proof)
3. Same exchange contract flow
4. FOB 100% paid → auto-advances

### Item Editing

Admin can edit shipment items (add/remove product, change price/quantity):
1. Recalculates `totalProductsUsd` and `totalCostsBrl` using existing tax calculation engine
2. Recalculates pending FOB balance
3. Generates contract amendment via ZapSign
4. Client signs amendment → ZapSign webhook confirms
5. Changes are applied to the shipment

### Transaction ↔ ExchangeContract Relationship

Each `transaction` (FOB payment) can have 1+ `exchangeContracts` linked via `exchangeContracts.transactionId` FK (already modeled).

### Notifications
- Invoice generated → notify client
- Payment confirmed → notify Admin
- Amendment generated → notify client to sign
- FOB complete → notify both

All notification messages must use `getTranslations` (next-intl) — no hardcoded strings.

---

## Step 2: SHIPPING_PREPARATION (Preparação de Embarque)

### Purpose
Register booking, create ShipsGo tracking, define freight sell price, attach shipping documents.

### Admin Actions

1. Register Booking Number on shipment
2. Register MBL → system creates tracking via ShipsGo API
3. ShipsGo returns: containers, cargo type (FCL/LCL), carrier, ETD, ETA
4. Admin can override cargo type to PART_LOT (flag `isPartLot`)
5. Admin defines freight sell price (`freightSellPriceUsd`)
6. Admin attaches MBL and HBL documents (PDF)
7. Admin confirms → advances to DOCUMENT_PREPARATION

### ShipsGo Integration

**Tracking creation:**
```
POST ShipsGo API with bookingNumber/MBL
  → Receives shipsGoId, containers[], cargoType, carrier
  → Persists to shipments (shipsGoId, shipsGoTrackingUrl)
  → Persists containers to shipmentContainers
  → Updates ETD/ETA on shipment
```

**ShipsGo webhook (tracking updates):**
```
Receives position/status update event
  → Inngest processes: updates shipsGoLastUpdate
  → If status changed (vessel departed, arrived at port) → logs in stepHistory.metadata
```

### Part Lot (multiple shipments on same MBL)

- Multiple shipments can reference the same `masterBl`
- `isPartLot: boolean` (new field, default false)
- When `isPartLot = true`:
  - System ignores ShipsGo automatic cargo typing (which returns FCL)
  - Each shipment has its own `freightSellPriceUsd` defined by Admin
  - ShipsGo tracking is shared (same shipsGoId for all shipments on the MBL)

### Freight: Cost vs. Sell

Freight values are stored in `shipmentFreightReceipts`:
- `freightValue` (existing field) — represents the **cost price** (from simulation/quote)
- `freightSellValue` (new field) — **sell price** defined by Admin in this step

The `freightSellPriceUsd` convenience field is NOT added to `shipments` to avoid data duplication. The single source of truth is `shipmentFreightReceipts`.

### New fields on `shipments`
- `isPartLot`: boolean (default false)

### New fields on `shipmentFreightReceipts`
- `freightSellValue`: decimal (nullable) — Admin-defined sell price in USD

### Notifications
- ShipsGo tracking created → notify Admin (confirmation)
- Vessel departed → notify client
- ETA updated → notify both

---

## Step 3: DOCUMENT_PREPARATION (Preparação de Documentos)

### Purpose
Gather all commercial documents (Invoice, Packing List) per supplier. Read-only view of exchange contract summary.

### Read-Only View

Exchange summary from Step 1:
- List of all exchange contracts
- Total paid per supplier in USD
- Average exchange rate used
- Data sourced from `transactions` + `exchangeContracts`

### Admin Actions

1. Upload Commercial Invoice (PDF) per supplier → type: `COMMERCIAL_INVOICE`, `metadata.supplierId`
2. Upload Packing List (PDF) per supplier → type: `PACKING_LIST`, `metadata.supplierId`
3. Upload "Other Documents" (any type) → type: `OTHER`, free-text description
4. Admin confirms → advances to CUSTOMS_CLEARANCE

### Validation Checklist (soft)

Before advancing, system displays visual checklist:
- [ ] Invoice attached for each supplier
- [ ] Packing List attached for each supplier

Admin **can** advance with missing items (manual override) but receives a warning alert.

### Notifications
- Documents attached → log in stepHistory
- Step advanced → notify Admin (confirmation)

---

## Step 4: CUSTOMS_CLEARANCE (Desembaraço)

### Purpose
Generate 90% invoice for remaining costs, register DUIMP, fetch Siscomex data.

### 90% Invoice

```
remainingValue = totalCostsBrl - totalPaidInBrlStep1
invoice90 = remainingValue × 0.90
```

Rounding: all monetary calculations use 2 decimal places with banker's rounding (HALF_EVEN), per Brazilian fiscal regulations.

- **ORDER** → generate invoice via Asaas (boleto/PIX)
- **DIRECT_ORDER** → create transaction PENDING (no gateway)
- The 90% is fixed (not adjustable).

### International Freight Receipt

Phase 2 — placeholder in UI for future implementation.

### DUIMP & Siscomex Integration

1. Admin manually enters DUIMP number
2. System calls Portal Único Siscomex API to fetch:
   - Actual taxes (II, IPI, PIS, COFINS, Taxa Siscomex)
   - Parametrization channel (Green, Yellow, Red, Grey)
   - Declaration data
3. Persisted data:
   - Taxes → `shipmentExpenses` (by category: TAX_II, TAX_IPI, TAX_PIS, TAX_COFINS, TAX_SISCOMEX)
   - Channel → `duimpChannel` field
   - Number → `duimpNumber` field
   - Full payload → `duimpData` JSONB snapshot

### New fields on `shipments`
- `duimpNumber`: varchar (nullable)
- `duimpChannel`: duimpChannelEnum (nullable) — GREEN, YELLOW, RED, GREY
- `duimpData`: jsonb (nullable) — full Siscomex API snapshot

### Auto-advance condition

CUSTOMS_CLEARANCE → COMPLETION when:
- `duimpNumber` is filled
- 90% invoice status is PAID

### Notifications
- 90% invoice generated → notify client
- Payment confirmed → notify Admin
- DUIMP registered → notify both
- Channel parametrized → notify Admin (urgent if Red/Grey)

---

## Step 5: COMPLETION (Conclusão)

### Purpose
Final P&L reconciliation, upload fiscal documents, collect remaining payments, close shipment.

### Required Uploads

1. Storage Invoice (PDF) → type: `STORAGE_INVOICE`
2. Sales Invoice PDF → type: `SALES_INVOICE_PDF`
3. Sales Invoice XML → type: `SALES_INVOICE_XML`

### Financial Inputs

- `icmsExitTaxes`: decimal — ICMS and exit taxes
- `storageCost`: decimal — storage cost
- `discounts`: decimal (optional) — discounts

The authoritative source is `shipmentExpenses` (categories: TAX_ICMS, STORAGE, DISCOUNT). The fields `icmsExitTaxes`, `storageCost`, `discounts` on the `shipments` table are **denormalized caches** for quick access in the P&L calculation, written at the same time as the expense rows.

### Final Calculation (P&L)

```
totalRealized = totalPaidFOB(BRL) + invoice90Paid + siscomexTaxes + icmsExitTaxes + storageCost - discounts
finalBalance = totalCostsBrl - totalRealized

If finalBalance > 0 → client owes (generate balance invoice)
If finalBalance < 0 → refund to client (Admin registers manually)
If finalBalance = 0 → no action
```

Rounding: 2 decimal places, banker's rounding (HALF_EVEN).

### Service Fee (Honorários)

Calculation:
1. Fetch `serviceFeeConfigs` for client organization
2. If not found → use `globalServiceFeeConfig`
3. Determine calculation base:
   - `applyToChinaProducts = true` → percentage over FOB (`totalProductsUsd × exchangeRate`)
   - `applyToChinaProducts = false` → percentage over full invoice value (NF = `totalCostsBrl`)
4. `percentageValue = base × (percentage / 100)`
5. `minimumValue = minimumWageBrl × minimumValueMultiplier`
6. `serviceFee = MAX(percentageValue, minimumValue)`
   - The multiplier acts as a **floor** — only used when percentage doesn't exceed it

Field names match schema exactly: `applyToChinaProducts` (serviceFeeConfigs) / `defaultApplyToChina` (globalServiceFeeConfig), `minimumValueMultiplier` (serviceFeeConfigs) / `defaultMultiplier` (globalServiceFeeConfig).

Generate transaction type `SERVICE_FEE`:
- **ORDER** → invoice via Asaas
- **DIRECT_ORDER** → transaction PENDING (manual)

### Finalization

Admin clicks "Finalize Shipment" when:
- Final balance paid/refunded (or zero)
- Service fee paid

→ `shipmentStatus = FINISHED`
→ Record in `shipmentStepHistory` with timestamp
→ Notify both: "Shipment completed successfully"

### Notifications
- Balance invoice generated → notify client
- Service fee invoice generated → notify client
- Shipment finalized → notify both

---

## Schema Changes

### Enum Changes

```sql
-- shipmentStepEnum: remove DELIVERY, rename SHIPPING → SHIPPING_PREPARATION, add CUSTOMS_CLEARANCE
-- New order: CONTRACT_CREATION, MERCHANDISE_PAYMENT, SHIPPING_PREPARATION, DOCUMENT_PREPARATION, CUSTOMS_CLEARANCE, COMPLETION
-- Migration: DROP and recreate enum (no existing shipments in production yet)

-- shipmentStatusEnum: add FINISHED
-- RELEASED is retained but unmapped (future use)
-- Full list: PENDING, PRODUCTION, BOOKED, IN_TRANSIT, CUSTOMS_CLEARANCE, RELEASED, DELIVERED, FINISHED, CANCELED

-- documentTypeEnum: add new types
-- + STORAGE_INVOICE, SALES_INVOICE_PDF, SALES_INVOICE_XML, MBL_DOCUMENT, HBL_DOCUMENT
-- Note: existing BILL_OF_LADING is deprecated in favor of MBL_DOCUMENT/HBL_DOCUMENT

-- expenseTypeEnum: add new types
-- + TAX_SISCOMEX, DISCOUNT

-- duimpChannelEnum (new enum in enums.ts)
-- GREEN, YELLOW, RED, GREY
```

### New Fields on `shipments`

| Field                  | Type      | Default | Notes                          |
|------------------------|-----------|---------|--------------------------------|
| productionReadyDate    | timestamp | null    | Estimated production ready     |
| fobAdvancePercentage   | decimal   | 30      | Advance % from quote           |
| isPartLot              | boolean   | false   | Override ShipsGo cargo type    |
| duimpNumber            | varchar   | null    | DUIMP number                   |
| duimpChannel           | enum      | null    | GREEN/YELLOW/RED/GREY          |
| duimpData              | jsonb     | null    | Full Siscomex API snapshot     |
| icmsExitTaxes          | decimal   | null    | ICMS and exit taxes            |
| storageCost            | decimal   | null    | Storage cost                   |
| discounts              | decimal   | null    | Discounts (optional)           |

### New Fields on `shipmentFreightReceipts`

| Field              | Type    | Default | Notes                      |
|--------------------|---------|---------|----------------------------|
| freightSellValue   | decimal | null    | Admin-defined sell price   |

### Migration Strategy

No existing shipments in production.
- `shipmentStepEnum`: requires DROP and recreate (rename SHIPPING → SHIPPING_PREPARATION, remove DELIVERY, add CUSTOMS_CLEARANCE, reorder)
- `shipmentStatusEnum`: simple `ALTER TYPE ADD VALUE 'FINISHED'` (additive only)
- `documentTypeEnum`: simple `ALTER TYPE ADD VALUE` for each new type (additive)
- `expenseTypeEnum`: simple `ALTER TYPE ADD VALUE` for TAX_SISCOMEX and DISCOUNT (additive)
- `duimpChannelEnum`: new enum creation

---

## Inngest Architecture

### Central Function: `shipmentStepEvaluator`

```
Event: "shipment/step.evaluate"
Concurrency: limit 1 per shipmentId
Retries: 3

Idempotency: The evaluator must handle re-evaluation gracefully. If called
twice after the same payment, it checks current state before acting. If the
step has already advanced, it is a no-op.

Logic:
  1. Fetch current shipment (currentStep, status)
  2. Evaluate exit conditions for current step:

  MERCHANDISE_PAYMENT:
    totalPaidUsd = SUM(transactions WHERE type=MERCHANDISE AND status=PAID)
    If totalPaidUsd >= totalProductsUsd → advance to SHIPPING_PREPARATION

  CUSTOMS_CLEARANCE:
    If duimpNumber filled AND invoice90.status = PAID → advance to COMPLETION

  Other steps: no auto-advance (manual)

  3. If advancing:
    → Update currentStep + shipmentStatus (within transaction)
    → Insert record in shipmentStepHistory
    → Notify relevant parties
```

### Event-Specific Functions

| Event                         | Actions                                                    |
|-------------------------------|------------------------------------------------------------|
| `shipment/payment.received`   | Update transaction → PAID, dispatch step.evaluate          |
| `shipment/items.changed`      | Recalculate FOB + totalCostsBrl, generate ZapSign amendment, waitForEvent amendment.signed, apply changes |
| `shipment/shipsgo.updated`    | Update tracking data, log in stepHistory, notify if relevant |
| `shipment/duimp.registered`   | Call Siscomex API, persist taxes + channel, dispatch step.evaluate |
| `shipment/amendment.signed`   | Mark amendment as signed, apply item changes               |

### Webhook Routes

| Route                  | Validates          | Dispatches                          |
|------------------------|--------------------|-------------------------------------|
| `/api/webhooks/asaas`  | Asaas signature    | `shipment/payment.received`         |
| `/api/webhooks/shipsgo`| ShipsGo token      | `shipment/shipsgo.updated`          |
| `/api/webhooks/zapsign`| ZapSign verification| `shipment/amendment.signed` (amendments) / `quote/contract.signed` (existing) |

---

## ORDER vs. DIRECT_ORDER — Differences Summary

Order type is determined by `clientOrganization.orderType` (organization-level setting, not per-shipment).

| Aspect              | ORDER                        | DIRECT_ORDER                  |
|---------------------|------------------------------|-------------------------------|
| Contract template   | ZAPSIGN_TEMPLATE_ORDER       | ZAPSIGN_TEMPLATE_DIRECT_ORDER |
| FOB payments        | Asaas invoice (boleto/PIX)   | Manual registration by Admin  |
| 90% invoice         | Asaas invoice (boleto/PIX)   | Manual registration by Admin  |
| Balance invoice     | Asaas invoice (boleto/PIX)   | Manual registration by Admin  |
| Service fee invoice | Asaas invoice (boleto/PIX)   | Manual registration by Admin  |
| All other steps     | Identical                    | Identical                     |

---

## Cancellation

Cancellation can happen at any step. Semantics:
- `shipmentStatus` → `CANCELED`
- Pending Asaas invoices → cancelled via Asaas API (ORDER only)
- In-progress ZapSign documents (amendments) → cancelled via ZapSign API
- ShipsGo tracking → remains (informational, no action needed)
- Partial payments already received → Admin handles refund manually outside the platform
- A dedicated `shipmentStepHistory` entry is created with `step = currentStep` (the step active at cancellation time), `status = FAILED`, and `metadata.cancellationReason` containing the reason text

Full cancellation workflow (automated refunds, etc.) is Phase 2.

---

## Client Visibility

Phase 1: Client receives **notifications only** (in-app + future email/WhatsApp). No direct access to shipment management UI.

Future: Client dashboard with read-only view of progress, pending invoices, and tracking.

---

## Out of Scope (Phase 2)

- OCR of Swift/Exchange contracts
- AI-powered Invoice/Packing List reconciliation
- NCM extraction from Invoice
- MBL/HBL validation via AI
- Siscomex channel prediction
- International Freight Receipt generation
- Performance/Post-mortem reports
- Client-facing shipment dashboard
- Full cancellation workflow with automated refunds
