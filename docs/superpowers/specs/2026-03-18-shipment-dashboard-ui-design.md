# Shipment Dashboard UI — Design Spec

## Overview

Admin-facing dashboard for managing shipment lifecycle. Located under `/admin/shipments/` (SUPER_ADMIN only). Uses a horizontal stepper to navigate 6 steps, with a compact summary card and step-specific content. Client visibility is Phase 2 — clients only receive notifications.

**Depends on:** Shipment Management Backend (PR #1 — `feature/shipment-management`)

---

## Routes

```
/admin/shipments          → List all shipments (DataTable)
/admin/shipments/[id]     → Shipment detail with stepper + step content
```

Navigation: New "Pedidos" item in admin sidebar (`admin-sidebar.tsx`) with `ClipboardList` icon.

---

## Shipments List (`/admin/shipments`)

### DataTable Columns

| Column | Field | Format | Sortable |
|---|---|---|---|
| Código | `code` | `#123` | Yes |
| Cliente | `clientOrganization.name` | Text | Yes |
| Status | `status` | Colored chip | Yes |
| Etapa Atual | `currentStep` | Badge with icon | Yes |
| Tipo | `clientOrganization.orderType` | `ORDER` / `DIRECT_ORDER` | Yes |
| ETA | `eta` | `DD/MM/YYYY` or `—` | Yes |
| Booking | `bookingNumber` | Text or `—` | No |
| Criação | `createdAt` | `DD/MM/YYYY` | Yes |

### Faceted Filters

- **Status**: multi-select (PENDING, PRODUCTION, BOOKED, IN_TRANSIT, CUSTOMS_CLEARANCE, RELEASED, DELIVERED, FINISHED, CANCELED)
- **Etapa**: multi-select (6 steps)
- **Tipo**: ORDER / DIRECT_ORDER

### Status Chip Colors

| Status | Color |
|---|---|
| PENDING | default (grey) |
| PRODUCTION | warning (yellow) |
| BOOKED | secondary (blue) |
| IN_TRANSIT | primary (dark blue) |
| CUSTOMS_CLEARANCE | warning (yellow) |
| DELIVERED | success (green) |
| FINISHED | success (green, outlined) |
| CANCELED | danger (red) |

### Row Click

Navigates to `/admin/shipments/[id]`.

### Page Pattern

```
page.tsx (Server) → fetch shipments with clientOrganization join
  → <ShipmentsPageContent data={shipments} />

ShipmentsPageContent (Client) → <DataTable> with columns and filters
```

---

## Shipment Detail (`/admin/shipments/[id]`)

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  ← Voltar    Pedido #123 — Cliente X              [Cancelar]│
├──────────────────────────────────────────────────────────────┤
│  Summary Card (compact metrics)                              │
├──────────────────────────────────────────────────────────────┤
│  Stepper (horizontal, 6 steps)                               │
├──────────────────────────────────────────────────────────────┤
│  Step Content (active step component)                        │
│                                                              │
│  [Advance Step] (manual steps only)                          │
└──────────────────────────────────────────────────────────────┘
```

### Summary Card (`shipment-summary-card.tsx`)

Compact grid — 1 row on desktop, 2x2 on mobile:

| FOB Total (USD) | % Paid | ETA | Modality |
|---|---|---|---|
| Status (chip) | Type (ORDER/DIRECT_ORDER) | | |

### Stepper (`shipment-stepper.tsx`)

Horizontal, scrollable on mobile. 6 steps with lucide icons:

| Step | Icon | Label |
|---|---|---|
| CONTRACT_CREATION | `FileCheck` | Contrato |
| MERCHANDISE_PAYMENT | `DollarSign` | Pagamento FOB |
| SHIPPING_PREPARATION | `Ship` | Embarque |
| DOCUMENT_PREPARATION | `FileText` | Documentos |
| CUSTOMS_CLEARANCE | `Shield` | Desembaraço |
| COMPLETION | `CheckCircle` | Conclusão |

Visual states:
- **Completed** (`✓`): green background, clickable → shows step read-only
- **Current** (`●`): accent/primary background, active
- **Future** (`○`): grey, disabled
- **Failed** (canceled): red

### Step Navigation

```typescript
const [viewingStep, setViewingStep] = useState(shipment.currentStep);
const isCurrentStep = viewingStep === shipment.currentStep;
// Completed steps: clickable, renders with readOnly={true}
// Current step: editable
// Future steps: disabled
```

### Advance Step Button

- Only shows on manual steps: `SHIPPING_PREPARATION`, `DOCUMENT_PREPARATION`, `COMPLETION`
- Only when `isCurrentStep === true`
- `COMPLETION` uses "Finalizar Pedido" (success variant) instead
- Confirmation dialog before advancing

### Page Pattern

```
page.tsx (Server) → getShipmentById(id) with all relations → notFound() if missing
  → <ShipmentDetailContent shipment={shipment} />

ShipmentDetailContent (Client) → manages viewingStep state
  → renders summary card, stepper, step component
  → after mutations: router.refresh()
```

---

## Step Components

All step components receive `shipment` data + `readOnly` prop.

### Step 0: `contract-creation-step.tsx`

Minimal read-only component showing contract information (this step is always completed by the time the shipment exists):

- Contract status: Signed ✅
- ZapSign document link (if available)
- Signature date (from `shipmentStepHistory` for CONTRACT_CREATION)
- Quote reference link (`/admin/simulations/[quoteId]`)

Always rendered read-only — no actions available.

### Step 1: `merchandise-payment-step.tsx`

**Sections:**

1. **Production** (inline)
   - Production Ready Date: date input
   - FOB Advance %: read-only (from quote)

2. **FOB Payments** (inline table + modal actions)
   - Progress bar: `$paid / $total (X%)`
   - Buttons: [Gerar Fatura] (modal), [Registrar Pagamento] (modal, DIRECT_ORDER only)
   - Transactions table: #, Valor USD, Status (chip), Data, Comprovante (link), Actions

3. **Exchange Contracts** (inline table + modal)
   - Button: [Novo Contrato de Câmbio] (modal)
   - Table: Fornecedor, Nº Contrato, Banco, USD, Taxa, Swift (link), Contrato (link)

### Step 2: `shipping-preparation-step.tsx`

**Sections:**

1. **Booking & Tracking** (inline)
   - Booking Number: text input + [Salvar]
   - MBL: text input + [Registrar na ShipsGo]
   - After ShipsGo registration: carrier, ETD, ETA, cargo type, tracking link
   - Checkbox: Part Lot (override ShipsGo)
   - Containers list (from ShipsGo data)

2. **Freight** (inline)
   - Cost (from simulation): read-only
   - Sell Price: decimal input + [Salvar]

3. **Documents** (inline upload)
   - MBL: file upload (PDF)
   - HBL: file upload (PDF)

### Step 3: `document-preparation-step.tsx`

**Sections:**

1. **Exchange Summary** (read-only card)
   - Total paid per supplier in USD
   - Average exchange rate
   - Number of contracts
   - Data from `transactions` + `exchangeContracts` grouped by `supplierId`

2. **Documents per Supplier** (inline uploads)
   - One section per supplier (derived from shipment items → product → supplier)
   - Each section: Invoice upload + Packing List upload
   - Status indicators: ✅ uploaded / ⚠️ pending

3. **Other Documents** (inline)
   - [+ Add Document] button
   - List of uploaded other documents

4. **Checklist** (soft validation)
   - Visual checklist before advancing
   - Admin can override and advance with missing documents (warning alert)

### Step 4: `customs-clearance-step.tsx`

**Sections:**

1. **90% Invoice** (inline)
   - Display: Total Costs BRL, Paid FOB BRL, Remaining, 90% value
   - Button: [Gerar Fatura de 90%]
   - Status display: PENDING / PAID

2. **DUIMP** (inline)
   - Input: DUIMP number + [Registrar]
   - After registration: channel chip (colored), tax breakdown table (II, IPI, PIS, COFINS, Siscomex)
   - Channel colors: GREEN=green, YELLOW=yellow, RED=red, GREY=grey

Auto-advances when: DUIMP filled + 90% invoice PAID.

### Step 5: `completion-step.tsx`

**Sections:**

1. **Fiscal Documents** (inline uploads)
   - Storage Invoice (PDF)
   - Sales Invoice (PDF)
   - Sales Invoice (XML)

2. **Final Costs** (inline form)
   - ICMS & Exit Taxes: decimal input (BRL)
   - Storage Cost: decimal input (BRL)
   - Discounts: decimal input (BRL)
   - [Salvar]

3. **P&L (Final Calculation)** (read-only after save)
   - Total Realized, Estimated Cost, Final Balance
   - If balance > 0: [Gerar Fatura do Saldo]
   - If balance < 0: "Ressarcimento pendente" indicator

4. **Service Fee / Honorários** (read-only calculation)
   - Display: base (FOB/NF), percentage, calculated value, minimum floor, final fee
   - [Gerar Fatura de Honorários]

5. **Finalize** button (success variant, confirmation dialog)

---

## Modals

### `generate-invoice-modal.tsx`

Shared modal for generating invoices across steps.

Props: `shipmentId`, `type` (MERCHANDISE/BALANCE/SERVICE_FEE), `defaultAmount?`, `currency` (USD/BRL)

Fields:
- Amount: decimal input (pre-filled and read-only for 90%/balance/service fee)
- Description: text input (optional)
- Buttons: [Cancelar] [Gerar Fatura]

### `register-payment-modal.tsx`

Used in Step 1 for DIRECT_ORDER — register off-platform payment.

Fields:
- Amount (USD): decimal input
- Payment date: date input
- Proof: file upload
- Buttons: [Cancelar] [Registrar]

Creates transaction with status PAID, dispatches step evaluation.

### `create-exchange-contract-modal.tsx`

Used in Step 1 — create exchange contract linked to a transaction.

Fields:
- Supplier: select (suppliers from shipment items)
- Linked Transaction: select (transactions for this shipment)
- Contract Number: text input
- Broker: select (from `currencyExchangeBrokers` table)
- Amount USD: decimal input
- Exchange Rate: decimal input
- Closing Date: date input
- Swift (PDF): file upload
- Contract (PDF): file upload
- Buttons: [Cancelar] [Salvar Contrato]

Validates with Zod. Files uploaded to Supabase Storage.

### `cancel-shipment-modal.tsx`

Used from the header [Cancelar] button. Cancellation requires a reason.

Fields:
- Reason: textarea (required)
- Confirmation: "Entendo que esta ação não pode ser desfeita" checkbox (required)
- Buttons: [Voltar] [Cancelar Pedido] (danger variant)

Calls `cancelShipment(shipmentId, reason)` server action.

---

## DataTable Row Click

The existing `DataTable` component does not have an `onRowClick` prop. Add `onRowClick?: (row: TData) => void` to `DataTableProps` in `src/components/ui/data-table.tsx`. Apply `onClick` + `cursor-pointer` styling to `<tr>` elements. This is a reusable enhancement for all DataTables.

---

## Error Handling

All server actions return `{ success: boolean; error?: string; fieldErrors?: Record<string, string[]> }`.

- **Forms (modals, multi-field):** Use `useActionState`. Display field-level errors via `FormError` component (`src/components/ui/form-error.tsx`). Display general errors as inline alert.
- **Inline saves (single-field):** Use `startTransition(() => action(...))`. Show toast on success (`toast.success`) or error (`toast.danger`).
- **Auth:** All actions call `requireSuperAdmin()` first.
- **Validation:** All actions validate input with Zod schemas.

---

## i18n Key Structure

All UI strings use `next-intl` with `useTranslations`. Key namespace: `Admin.Shipments`.

```
Admin.Shipments.List.title
Admin.Shipments.List.columns.code, .client, .status, .step, .type, .eta, .booking, .created
Admin.Shipments.List.filters.status, .step, .type
Admin.Shipments.Detail.title           → "Pedido #{code}"
Admin.Shipments.Detail.back
Admin.Shipments.Detail.cancel
Admin.Shipments.Detail.advanceStep
Admin.Shipments.Detail.finalize
Admin.Shipments.Summary.*              → FOB, paid, eta, modality, status, type labels
Admin.Shipments.Steps.ContractCreation.*
Admin.Shipments.Steps.MerchandisePayment.*
Admin.Shipments.Steps.ShippingPreparation.*
Admin.Shipments.Steps.DocumentPreparation.*
Admin.Shipments.Steps.CustomsClearance.*
Admin.Shipments.Steps.Completion.*
Admin.Shipments.Modals.GenerateInvoice.*
Admin.Shipments.Modals.RegisterPayment.*
Admin.Shipments.Modals.ExchangeContract.*
Admin.Shipments.Modals.CancelShipment.*
```

All keys added to `messages/pt.json` under `Admin.Shipments`.

---

## File Upload Pattern

All file uploads use the existing `src/components/ui/file-upload.tsx` component with Supabase Storage. Files are uploaded to storage first, then the URL is passed to the server action which creates the `shipmentDocuments` record.

---

## Schema Change

**New field on `exchangeContracts` table:**

```typescript
supplierId: uuid('supplier_id').references(() => suppliers.id)
```

This enables grouping exchange contracts by supplier in Step 3's exchange summary view.

---

## Server Actions (`/admin/shipments/[id]/actions.ts`)

All actions validate with Zod, execute via services, and call `revalidatePath('/admin/shipments/[id]')`.

```
// Step 1
updateProductionReadyDate(shipmentId, date)
generateFobInvoice(shipmentId, amountUsd)
registerManualPayment(shipmentId, formData)         // DIRECT_ORDER
createExchangeContract(shipmentId, formData)

// Step 2
updateBookingNumber(shipmentId, bookingNumber)
registerMbl(shipmentId, mbl)                        // calls ShipsGo API
togglePartLot(shipmentId, isPartLot)
updateFreightSellPrice(shipmentId, value)
uploadShippingDocument(shipmentId, type, file)

// Step 3
uploadSupplierDocument(shipmentId, supplierId, type, file)
uploadOtherDocument(shipmentId, name, file)

// Step 4
generate90Invoice(shipmentId)
registerDuimp(shipmentId, duimpNumber)              // dispatches Inngest event

// Step 5
saveCompletionCosts(shipmentId, { icmsExitTaxes, storageCost, discounts })
uploadFiscalDocument(shipmentId, type, file)
generateBalanceInvoice(shipmentId)
generateServiceFeeInvoice(shipmentId)

// General
advanceStep(shipmentId)
cancelShipment(shipmentId, reason)
finalizeShipment(shipmentId)
```

---

## Data Flow

```
page.tsx (Server)
  → getShipmentById(id) with all relations
  → <ShipmentDetailContent shipment={shipment} />

ShipmentDetailContent (Client)
  → manages viewingStep state
  → renders: summary card, stepper, step component
  → passes readOnly={viewingStep !== shipment.currentStep}

Step Components (Client)
  → useActionState for form submissions
  → startTransition for quick saves (toggles, inline inputs)
  → Modals use useActionState internally
  → After mutation: router.refresh()
```

---

## File Structure

```
src/app/(admin)/admin/shipments/
  ├── page.tsx
  ├── [id]/
  │   ├── page.tsx
  │   └── actions.ts
  └── components/
      ├── shipments-page-content.tsx
      ├── shipment-detail-content.tsx
      ├── shipment-stepper.tsx
      ├── shipment-summary-card.tsx
      ├── steps/
      │   ├── contract-creation-step.tsx
      │   ├── merchandise-payment-step.tsx
      │   ├── shipping-preparation-step.tsx
      │   ├── document-preparation-step.tsx
      │   ├── customs-clearance-step.tsx
      │   └── completion-step.tsx
      └── modals/
          ├── cancel-shipment-modal.tsx
          ├── create-exchange-contract-modal.tsx
          ├── generate-invoice-modal.tsx
          └── register-payment-modal.tsx
```

---

## Out of Scope

- Client-facing shipment dashboard (Phase 2)
- Item editing UI + amendment flow (depends on ZapSign template)
- Asaas boleto/PIX generation in invoice modals (depends on customer sync)
- Real-time tracking map (ShipsGo embed)
