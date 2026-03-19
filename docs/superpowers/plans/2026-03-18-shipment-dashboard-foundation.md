# Shipment Dashboard UI — Foundation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the navigable foundation for the admin shipment management dashboard — list page, detail page shell with stepper and summary card, sidebar navigation, and i18n keys.

**Architecture:** Server Components fetch data via services, pass to Client Content components. Detail page uses a horizontal stepper with `viewingStep` state to render step-specific content. Placeholder step components are created for all 6 steps (filled in Plan B).

**Tech Stack:** Next.js 16 (App Router), React 19, Hero UI, TanStack Table, Drizzle ORM, next-intl, lucide-react

**Spec:** `docs/superpowers/specs/2026-03-18-shipment-dashboard-ui-design.md`

---

## File Structure

### Schema

- **Modify:** `src/db/schema/financial.ts` — add `supplierId` to `exchangeContracts`
- **Modify:** `src/db/schema/relations.ts` — add supplier relation to exchangeContracts

### Service

- **Create:** `src/services/admin/shipments.service.ts` — admin queries for shipment list and detail

### DataTable Enhancement

- **Modify:** `src/components/ui/data-table.tsx` — add `onRowClick` prop

### Admin Sidebar

- **Modify:** `src/components/admin/admin-sidebar.tsx` — add "Pedidos" nav item

### Pages & Components

- **Create:** `src/app/(admin)/admin/shipments/page.tsx` — list page (Server)
- **Create:** `src/app/(admin)/admin/shipments/components/shipments-page-content.tsx` — list (Client)
- **Create:** `src/app/(admin)/admin/shipments/[id]/page.tsx` — detail page (Server)
- **Create:** `src/app/(admin)/admin/shipments/[id]/actions.ts` — server actions (advanceStep, cancelShipment, finalizeShipment only in this plan)
- **Create:** `src/app/(admin)/admin/shipments/components/shipment-detail-content.tsx` — detail layout (Client)
- **Create:** `src/app/(admin)/admin/shipments/components/shipment-stepper.tsx` — horizontal stepper
- **Create:** `src/app/(admin)/admin/shipments/components/shipment-summary-card.tsx` — compact metrics
- **Create:** `src/app/(admin)/admin/shipments/components/steps/contract-creation-step.tsx` — placeholder
- **Create:** `src/app/(admin)/admin/shipments/components/steps/merchandise-payment-step.tsx` — placeholder
- **Create:** `src/app/(admin)/admin/shipments/components/steps/shipping-preparation-step.tsx` — placeholder
- **Create:** `src/app/(admin)/admin/shipments/components/steps/document-preparation-step.tsx` — placeholder
- **Create:** `src/app/(admin)/admin/shipments/components/steps/customs-clearance-step.tsx` — placeholder
- **Create:** `src/app/(admin)/admin/shipments/components/steps/completion-step.tsx` — placeholder

### i18n

- **Modify:** `messages/pt.json` — add `Admin.Shipments.*` and `Admin.Sidebar.shipments` keys

---

## Task 1: Schema — Add supplierId to exchangeContracts

**Files:**

- Modify: `src/db/schema/financial.ts`
- Modify: `src/db/schema/relations.ts`

- [ ] **Step 1: Add supplierId field**

In `src/db/schema/financial.ts`, add import for `suppliers` and the field:

```typescript
import { suppliers } from './products';

// In exchangeContracts table, after brokerId:
supplierId: uuid('supplier_id').references(() => suppliers.id),
```

- [ ] **Step 2: Add relation in relations.ts**

In `src/db/schema/relations.ts`, update `exchangeContractsRelations`:

```typescript
supplier: one(suppliers, {
  fields: [exchangeContracts.supplierId],
  references: [suppliers.id],
}),
```

Note: `suppliers` is already imported from `./products` in relations.ts — no import change needed.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/db/schema/financial.ts src/db/schema/relations.ts
git commit -m "feat(schema): add supplierId to exchangeContracts"
```

---

## Task 2: DataTable — Add onRowClick prop

**Files:**

- Modify: `src/components/ui/data-table.tsx`

- [ ] **Step 1: Add prop to interface**

Find the `DataTableProps` interface and add:

```typescript
onRowClick?: (row: TData) => void;
```

- [ ] **Step 2: Destructure onRowClick from props and apply to table rows**

Add `onRowClick` to the destructured props in the `DataTable` function signature. Then find the `<tr>` rendering in the table body and add `onClick` and `cursor-pointer`:

```typescript
<tr
  key={row.id}
  onClick={() => onRowClick?.(row.original)}
  className={`
    border-b border-border transition-colors
    ${onRowClick ? 'cursor-pointer hover:bg-accent-soft-hover' : ''}
  `}
>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/data-table.tsx
git commit -m "feat(ui): add onRowClick prop to DataTable"
```

---

## Task 3: Admin Service — Shipment Queries

**Files:**

- Create: `src/services/admin/shipments.service.ts`

- [ ] **Step 1: Create the service**

```typescript
import { db } from "@/db";
import { shipments } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

/** Fetch all shipments for admin list view */
export async function getAllShipments() {
  return db.query.shipments.findMany({
    with: {
      clientOrganization: {
        columns: { id: true, name: true, orderType: true },
      },
      sellerOrganization: { columns: { id: true, name: true } },
    },
    orderBy: [desc(shipments.createdAt)],
  });
}

/** Fetch a single shipment with all relations for detail view */
export async function getShipmentDetail(shipmentId: string) {
  return db.query.shipments.findFirst({
    where: eq(shipments.id, shipmentId),
    with: {
      clientOrganization: true,
      sellerOrganization: true,
      quote: {
        with: {
          items: {
            with: {
              variant: { with: { product: { with: { supplier: true } } } },
            },
          },
        },
      },
      transactions: {
        with: { exchangeContracts: { with: { broker: true, supplier: true } } },
      },
      documents: true,
      containers: true,
      expenses: true,
      stepHistory: true,
      freightReceipt: true,
    },
  });
}
```

- [ ] **Step 2: Export from admin index**

In `src/services/admin/index.ts`, add:

```typescript
export * from "./shipments.service";
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/services/admin/shipments.service.ts src/services/admin/index.ts
git commit -m "feat: add admin shipment service with list and detail queries"
```

---

## Task 4: Admin Sidebar — Add Shipments Link

**Files:**

- Modify: `src/components/admin/admin-sidebar.tsx`
- Modify: `messages/pt.json`

- [ ] **Step 1: Add nav item**

In `admin-sidebar.tsx`, import `ClipboardList` from `lucide-react` and add to the `navItems` array (after the dashboard item):

```typescript
{
  labelKey: 'shipments',
  href: '/admin/shipments',
  icon: <ClipboardList className="size-5 shrink-0" />,
},
```

- [ ] **Step 2: Add translation key**

In `messages/pt.json`, inside the `Admin.Sidebar` section, add:

```json
"shipments": "Pedidos"
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/admin-sidebar.tsx messages/pt.json
git commit -m "feat: add Pedidos link to admin sidebar"
```

---

## Task 5: i18n — Add All Shipment Translation Keys

**Files:**

- Modify: `messages/pt.json`

- [ ] **Step 1: Add Admin.Shipments section**

Add the following under a new `"Admin"` key (or merge into existing `Admin` if it exists). This adds all keys needed for the list page, detail page, stepper, and summary card:

```json
{
  "Admin": {
    "Shipments": {
      "List": {
        "title": "Pedidos",
        "description": "Gerencie todos os pedidos de importação",
        "columns": {
          "code": "Código",
          "client": "Cliente",
          "status": "Status",
          "step": "Etapa Atual",
          "type": "Tipo",
          "eta": "ETA",
          "booking": "Booking",
          "created": "Criação"
        },
        "filters": {
          "status": "Status",
          "step": "Etapa",
          "type": "Tipo"
        },
        "empty": "Nenhum pedido encontrado"
      },
      "Detail": {
        "title": "Pedido #{code}",
        "back": "Voltar",
        "cancel": "Cancelar Pedido",
        "advanceStep": "Avançar Etapa",
        "finalize": "Finalizar Pedido",
        "confirmAdvance": "Tem certeza que deseja avançar para a próxima etapa?",
        "confirmFinalize": "Tem certeza que deseja finalizar este pedido?",
        "confirmCancel": "Tem certeza que deseja cancelar este pedido?",
        "cancelReason": "Motivo do cancelamento",
        "cancelConfirmation": "Entendo que esta ação não pode ser desfeita"
      },
      "Summary": {
        "fobTotal": "FOB Total",
        "paid": "Pago",
        "eta": "ETA",
        "modality": "Modalidade",
        "status": "Status",
        "type": "Tipo"
      },
      "Stepper": {
        "CONTRACT_CREATION": "Contrato",
        "MERCHANDISE_PAYMENT": "Pagamento FOB",
        "SHIPPING_PREPARATION": "Embarque",
        "DOCUMENT_PREPARATION": "Documentos",
        "CUSTOMS_CLEARANCE": "Desembaraço",
        "COMPLETION": "Conclusão"
      },
      "Steps": {
        "ContractCreation": {
          "title": "Criação do Contrato",
          "contractSigned": "Contrato assinado",
          "signatureDate": "Data da assinatura",
          "viewQuote": "Ver proposta"
        },
        "MerchandisePayment": {
          "title": "Pagamento da Mercadoria",
          "placeholder": "Conteúdo do passo será implementado em breve."
        },
        "ShippingPreparation": {
          "title": "Preparação de Embarque",
          "placeholder": "Conteúdo do passo será implementado em breve."
        },
        "DocumentPreparation": {
          "title": "Preparação de Documentos",
          "placeholder": "Conteúdo do passo será implementado em breve."
        },
        "CustomsClearance": {
          "title": "Desembaraço Aduaneiro",
          "placeholder": "Conteúdo do passo será implementado em breve."
        },
        "Completion": {
          "title": "Conclusão",
          "placeholder": "Conteúdo do passo será implementado em breve."
        }
      }
    }
  }
}
```

Notes:

- Merge into existing `Admin` key if it already exists in `pt.json`. Do NOT overwrite other `Admin.*` keys.
- The `Shipments.Status.*` and `Shipments.Steps.*` keys already exist at the top-level `Shipments` namespace (added in the backend PR). Do NOT duplicate them under `Admin.Shipments`. The list/detail components use `useTranslations('Shipments.Status')` to access those.
- Add error keys for server actions:

```json
"Errors": {
  "advanceFailed": "Erro ao avançar etapa",
  "cancelFailed": "Erro ao cancelar pedido",
  "finalizeFailed": "Erro ao finalizar pedido",
  "invalidData": "Dados inválidos",
  "reasonRequired": "Motivo é obrigatório"
}
```

- [ ] **Step 2: Commit**

```bash
git add messages/pt.json
git commit -m "feat(i18n): add admin shipment dashboard translation keys"
```

---

## Task 6: Shared Constants and Types

**Files:**

- Create: `src/app/(admin)/admin/shipments/components/shipment-utils.ts`

- [ ] **Step 1: Create shared constants and types**

```typescript
// src/app/(admin)/admin/shipments/components/shipment-utils.ts
import type { getShipmentDetail } from "@/services/admin/shipments.service";

/** Shipment detail type — used across all step components and the detail page */
export type ShipmentDetail = NonNullable<
  Awaited<ReturnType<typeof getShipmentDetail>>
>;

/** Status chip color mapping — used in list page and summary card */
export const STATUS_COLORS: Record<
  string,
  "default" | "warning" | "secondary" | "primary" | "success" | "danger"
> = {
  PENDING: "default",
  PRODUCTION: "warning",
  BOOKED: "secondary",
  IN_TRANSIT: "primary",
  CUSTOMS_CLEARANCE: "warning",
  RELEASED: "success",
  DELIVERED: "success",
  FINISHED: "success",
  CANCELED: "danger",
};
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/admin/shipments/components/shipment-utils.ts
git commit -m "feat: add shared shipment types and constants"
```

---

## Task 7: List Page — Server Component + Client Content

**Files:**

- Create: `src/app/(admin)/admin/shipments/page.tsx`
- Create: `src/app/(admin)/admin/shipments/components/shipments-page-content.tsx`

- [ ] **Step 1: Create server page**

```typescript
// src/app/(admin)/admin/shipments/page.tsx
import { getAllShipments } from '@/services/admin';
import { ShipmentsPageContent } from './components/shipments-page-content';

export default async function AdminShipmentsPage() {
  const shipments = await getAllShipments();
  return <ShipmentsPageContent shipments={shipments} />;
}
```

- [ ] **Step 2: Create client content with DataTable**

Create `src/app/(admin)/admin/shipments/components/shipments-page-content.tsx`:

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createColumnHelper } from '@tanstack/react-table';
import { DataTable, type FacetedFilterDef, facetedFilterFn } from '@/components/ui/data-table';
import { Chip } from '@heroui/react';
import type { getAllShipments } from '@/services/admin/shipments.service';
import { STATUS_COLORS } from './shipment-utils';

type ShipmentRow = Awaited<ReturnType<typeof getAllShipments>>[number];

const columnHelper = createColumnHelper<ShipmentRow>();

export function ShipmentsPageContent({ shipments }: { shipments: ShipmentRow[] }) {
  const router = useRouter();
  const t = useTranslations('Admin.Shipments.List');
  const tSteps = useTranslations('Admin.Shipments.Stepper');
  const tStatus = useTranslations('Shipments.Status');

  const columns = [
    columnHelper.accessor('code', {
      header: t('columns.code'),
      cell: (info) => <span className="font-mono font-medium">#{info.getValue()}</span>,
    }),
    columnHelper.accessor((row) => row.clientOrganization?.name ?? '—', {
      id: 'client',
      header: t('columns.client'),
      cell: (info) => <span className="truncate max-w-[200px] block">{info.getValue()}</span>,
    }),
    columnHelper.accessor('status', {
      header: t('columns.status'),
      cell: (info) => (
        <Chip size="sm" color={STATUS_COLORS[info.getValue()] ?? 'default'} variant={info.getValue() === 'FINISHED' ? 'bordered' : 'flat'}>
          {tStatus(info.getValue())}
        </Chip>
      ),
      filterFn: facetedFilterFn,
    }),
    columnHelper.accessor('currentStep', {
      header: t('columns.step'),
      cell: (info) => <span className="text-sm text-muted">{tSteps(info.getValue())}</span>,
      filterFn: facetedFilterFn,
    }),
    columnHelper.accessor((row) => row.clientOrganization?.orderType ?? '—', {
      id: 'type',
      header: t('columns.type'),
      cell: (info) => <span className="text-sm">{info.getValue()}</span>,
      filterFn: facetedFilterFn,
    }),
    columnHelper.accessor('eta', {
      header: t('columns.eta'),
      cell: (info) => {
        const val = info.getValue();
        return val ? new Date(val).toLocaleDateString('pt-BR') : '—';
      },
    }),
    columnHelper.accessor('bookingNumber', {
      header: t('columns.booking'),
      cell: (info) => info.getValue() ?? '—',
      enableSorting: false,
    }),
    columnHelper.accessor('createdAt', {
      header: t('columns.created'),
      cell: (info) => new Date(info.getValue()).toLocaleDateString('pt-BR'),
    }),
  ];

  const facetedFilters: FacetedFilterDef[] = [
    {
      columnId: 'status',
      title: t('filters.status'),
      options: ['PENDING', 'PRODUCTION', 'BOOKED', 'IN_TRANSIT', 'CUSTOMS_CLEARANCE', 'RELEASED', 'DELIVERED', 'FINISHED', 'CANCELED']
        .map((s) => ({ label: tStatus(s), value: s })),
    },
    {
      columnId: 'currentStep',
      title: t('filters.step'),
      options: ['CONTRACT_CREATION', 'MERCHANDISE_PAYMENT', 'SHIPPING_PREPARATION', 'DOCUMENT_PREPARATION', 'CUSTOMS_CLEARANCE', 'COMPLETION']
        .map((s) => ({ label: tSteps(s), value: s })),
    },
    {
      columnId: 'type',
      title: t('filters.type'),
      options: [
        { label: 'ORDER', value: 'ORDER' },
        { label: 'DIRECT_ORDER', value: 'DIRECT_ORDER' },
      ],
    },
  ];

  return (
    <div className="container mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted mt-1">{t('description')}</p>
      </div>
      <DataTable
        columns={columns}
        data={shipments}
        searchPlaceholder={t('title')}
        facetedFilters={facetedFilters}
        onRowClick={(row) => router.push(`/admin/shipments/${row.id}`)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(admin)/admin/shipments/page.tsx src/app/(admin)/admin/shipments/components/shipments-page-content.tsx
git commit -m "feat: add admin shipments list page with DataTable"
```

---

## Task 8: Stepper Component

**Files:**

- Create: `src/app/(admin)/admin/shipments/components/shipment-stepper.tsx`

- [ ] **Step 1: Create the stepper**

```typescript
'use client';

import { useTranslations } from 'next-intl';
import { FileCheck, DollarSign, Ship, FileText, Shield, CheckCircle, Check } from 'lucide-react';
import type { ReactNode } from 'react';

const STEP_ORDER = [
  'CONTRACT_CREATION',
  'MERCHANDISE_PAYMENT',
  'SHIPPING_PREPARATION',
  'DOCUMENT_PREPARATION',
  'CUSTOMS_CLEARANCE',
  'COMPLETION',
] as const;

type ShipmentStep = (typeof STEP_ORDER)[number];

const STEP_ICONS: Record<ShipmentStep, ReactNode> = {
  CONTRACT_CREATION: <FileCheck className="size-4" />,
  MERCHANDISE_PAYMENT: <DollarSign className="size-4" />,
  SHIPPING_PREPARATION: <Ship className="size-4" />,
  DOCUMENT_PREPARATION: <FileText className="size-4" />,
  CUSTOMS_CLEARANCE: <Shield className="size-4" />,
  COMPLETION: <CheckCircle className="size-4" />,
};

interface ShipmentStepperProps {
  currentStep: ShipmentStep;
  viewingStep: ShipmentStep;
  onStepClick: (step: ShipmentStep) => void;
  isCanceled?: boolean;
}

export function ShipmentStepper({ currentStep, viewingStep, onStepClick, isCanceled }: ShipmentStepperProps) {
  const t = useTranslations('Admin.Shipments.Stepper');
  const currentIdx = STEP_ORDER.indexOf(currentStep);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {STEP_ORDER.map((step, idx) => {
        const isCompleted = idx < currentIdx;
        const isCurrent = step === currentStep;
        const isFuture = idx > currentIdx;
        const isViewing = step === viewingStep;
        const isClickable = isCompleted || isCurrent;

        let bgClass = 'bg-border text-muted';
        if (isCanceled) bgClass = 'bg-danger/10 text-danger';
        else if (isCompleted) bgClass = 'bg-success/10 text-success';
        else if (isCurrent) bgClass = 'bg-accent/10 text-accent';

        return (
          <div key={step} className="flex items-center">
            <button
              type="button"
              onClick={() => isClickable && onStepClick(step)}
              disabled={isFuture}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                whitespace-nowrap transition-all
                ${bgClass}
                ${isViewing ? 'ring-2 ring-accent ring-offset-1' : ''}
                ${isClickable ? 'cursor-pointer hover:opacity-80' : ''}
                ${isFuture ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {isCompleted ? <Check className="size-4" /> : STEP_ICONS[step]}
              <span className="hidden sm:inline">{t(step)}</span>
            </button>
            {idx < STEP_ORDER.length - 1 && (
              <div className={`w-4 h-px mx-1 ${isCompleted ? 'bg-success' : 'bg-surface'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export { STEP_ORDER, type ShipmentStep };
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/admin/shipments/components/shipment-stepper.tsx
git commit -m "feat: add shipment stepper component"
```

---

## Task 9: Summary Card Component

**Files:**

- Create: `src/app/(admin)/admin/shipments/components/shipment-summary-card.tsx`

- [ ] **Step 1: Create the summary card**

```typescript
'use client';

import { useTranslations } from 'next-intl';
import { Chip } from '@heroui/react';
import { DollarSign, Percent, CalendarClock, Ship } from 'lucide-react';
import { STATUS_COLORS } from './shipment-utils';

interface ShipmentSummaryCardProps {
  totalProductsUsd: string | null;
  totalPaidUsd: number;
  eta: Date | string | null;
  shipmentType: string;
  status: string;
  orderType: string;
}

export function ShipmentSummaryCard({
  totalProductsUsd,
  totalPaidUsd,
  eta,
  shipmentType,
  status,
  orderType,
}: ShipmentSummaryCardProps) {
  const t = useTranslations('Admin.Shipments.Summary');
  const tStatus = useTranslations('Shipments.Status');

  const fob = parseFloat(totalProductsUsd ?? '0');
  const paidPct = fob > 0 ? Math.round((totalPaidUsd / fob) * 100) : 0;
  const etaStr = eta ? new Date(eta).toLocaleDateString('pt-BR') : '—';

  return (
    <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-surface border border-border">
      <Metric icon={<DollarSign className="size-4" />} label={t('fobTotal')} value={`$${fob.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} />
      <Metric icon={<Percent className="size-4" />} label={t('paid')} value={`${paidPct}%`} />
      <Metric icon={<CalendarClock className="size-4" />} label={t('eta')} value={etaStr} />
      <Metric icon={<Ship className="size-4" />} label={t('modality')} value={shipmentType} />
      <div className="flex items-center gap-2">
        <Chip size="sm" color={STATUS_COLORS[status] ?? 'default'} variant={status === 'FINISHED' ? 'bordered' : 'flat'}>
          {tStatus(status)}
        </Chip>
        <Chip size="sm" variant="flat">{orderType}</Chip>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <span className="text-muted">{icon}</span>
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/admin/shipments/components/shipment-summary-card.tsx
git commit -m "feat: add shipment summary card component"
```

---

## Task 10: Placeholder Step Components

**Files:**

- Create: `src/app/(admin)/admin/shipments/components/steps/contract-creation-step.tsx`
- Create: `src/app/(admin)/admin/shipments/components/steps/merchandise-payment-step.tsx`
- Create: `src/app/(admin)/admin/shipments/components/steps/shipping-preparation-step.tsx`
- Create: `src/app/(admin)/admin/shipments/components/steps/document-preparation-step.tsx`
- Create: `src/app/(admin)/admin/shipments/components/steps/customs-clearance-step.tsx`
- Create: `src/app/(admin)/admin/shipments/components/steps/completion-step.tsx`

- [ ] **Step 1: Create contract creation step (read-only)**

```typescript
// src/app/(admin)/admin/shipments/components/steps/contract-creation-step.tsx
'use client';

import { useTranslations } from 'next-intl';
import { FileCheck, ExternalLink } from 'lucide-react';
import { Chip } from '@heroui/react';
import Link from 'next/link';
import type { ShipmentDetail } from '../shipment-utils';

export function ContractCreationStep({ shipment }: { shipment: ShipmentDetail; readOnly?: boolean }) {
  const t = useTranslations('Admin.Shipments.Steps.ContractCreation');

  const signatureEntry = shipment.stepHistory?.find(
    (h) => h.step === 'CONTRACT_CREATION' && h.status === 'COMPLETED'
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <FileCheck className="size-5" />
        {t('title')}
      </h3>
      <div className="p-4 rounded-lg bg-surface border border-border space-y-3">
        <div className="flex items-center gap-2">
          <Chip size="sm" color="success" variant="flat">{t('contractSigned')}</Chip>
        </div>
        {signatureEntry?.completedAt && (
          <p className="text-sm text-muted">
            {t('signatureDate')}: {new Date(signatureEntry.completedAt).toLocaleDateString('pt-BR')}
          </p>
        )}
        {shipment.quoteId && (
          <Link
            href={`/admin/simulations/${shipment.quoteId}`}
            className="text-sm text-accent hover:underline flex items-center gap-1"
          >
            {t('viewQuote')} <ExternalLink className="size-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create 5 placeholder step components**

Each follows this template (adjust step name, translation key, and icon):

```typescript
// src/app/(admin)/admin/shipments/components/steps/merchandise-payment-step.tsx
'use client';

import { useTranslations } from 'next-intl';
import { DollarSign } from 'lucide-react';
import type { ShipmentDetail } from '../shipment-utils';

export function MerchandisePaymentStep({ shipment, readOnly }: { shipment: ShipmentDetail; readOnly?: boolean }) {
  const t = useTranslations('Admin.Shipments.Steps.MerchandisePayment');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <DollarSign className="size-5" />
        {t('title')}
      </h3>
      <div className="p-6 rounded-lg border border-dashed border-border text-center text-muted">
        {t('placeholder')}
      </div>
    </div>
  );
}
```

Create the same pattern for:

- `shipping-preparation-step.tsx` — icon: `Ship`, key: `ShippingPreparation`
- `document-preparation-step.tsx` — icon: `FileText`, key: `DocumentPreparation`
- `customs-clearance-step.tsx` — icon: `Shield`, key: `CustomsClearance`
- `completion-step.tsx` — icon: `CheckCircle`, key: `Completion`

- [ ] **Step 3: Commit**

```bash
git add src/app/(admin)/admin/shipments/components/steps/
git commit -m "feat: add step components (contract creation + 5 placeholders)"
```

---

## Task 11: Server Actions — General Actions

**Files:**

- Create: `src/app/(admin)/admin/shipments/[id]/actions.ts`

- [ ] **Step 1: Create server actions**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import {
  advanceStep,
  cancelShipment as cancelShipmentService,
  finalizeShipment as finalizeShipmentService,
} from "@/services/shipment-workflow.service";
import { requireSuperAdmin } from "@/services/auth.service";
import { z } from "zod";

export async function advanceShipmentStepAction(
  shipmentId: string,
  currentStep: string,
) {
  const { profileId } = await requireSuperAdmin();
  const t = await getTranslations("Admin.Shipments.Errors");

  try {
    const result = await advanceStep(shipmentId, currentStep as any, profileId);
    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : t("advanceFailed"),
    };
  }
}

export async function cancelShipmentAction(formData: FormData) {
  const { profileId } = await requireSuperAdmin();
  const t = await getTranslations("Admin.Shipments.Errors");

  const cancelSchema = z.object({
    shipmentId: z.string().uuid(),
    reason: z.string().min(1, t("reasonRequired")),
  });

  const raw = {
    shipmentId: formData.get("shipmentId") as string,
    reason: formData.get("reason") as string,
  };

  const parsed = cancelSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: t("invalidData"),
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const result = await cancelShipmentService(
      parsed.data.shipmentId,
      parsed.data.reason,
      profileId,
    );
    revalidatePath(`/admin/shipments/${parsed.data.shipmentId}`);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : t("cancelFailed"),
    };
  }
}

export async function finalizeShipmentAction(shipmentId: string) {
  const { profileId } = await requireSuperAdmin();
  const t = await getTranslations("Admin.Shipments.Errors");

  try {
    const result = await finalizeShipmentService(shipmentId, profileId);
    revalidatePath(`/admin/shipments/${shipmentId}`);
    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : t("finalizeFailed"),
    };
  }
}
```

Note: Check if `requireSuperAdmin()` exists in `auth.service.ts` and returns `{ profileId }`. If not, look for the existing pattern (e.g., `requireAuthAndOrg()` in dashboard pages) and adapt accordingly. The key requirement is auth validation + profile ID extraction.

- [ ] **Step 2: Commit**

```bash
git add src/app/(admin)/admin/shipments/[id]/actions.ts
git commit -m "feat: add shipment general server actions (advance, cancel, finalize)"
```

---

## Task 12: Detail Page — Server Component + Client Content

**Files:**

- Create: `src/app/(admin)/admin/shipments/[id]/page.tsx`
- Create: `src/app/(admin)/admin/shipments/components/shipment-detail-content.tsx`

- [ ] **Step 1: Create server page**

```typescript
// src/app/(admin)/admin/shipments/[id]/page.tsx
import { notFound } from 'next/navigation';
import { getShipmentDetail } from '@/services/admin';
import { ShipmentDetailContent } from '../components/shipment-detail-content';
import { getTotalMerchandisePaidUsd } from '@/services/shipment.service';

export default async function AdminShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const shipment = await getShipmentDetail(id);
  if (!shipment) notFound();

  const totalPaidUsd = await getTotalMerchandisePaidUsd(id);

  return <ShipmentDetailContent shipment={shipment} totalPaidUsd={totalPaidUsd} />;
}
```

- [ ] **Step 2: Create client detail content**

```typescript
// src/app/(admin)/admin/shipments/components/shipment-detail-content.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, Textarea, Checkbox } from '@heroui/react';
import { ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';
import { ShipmentStepper, STEP_ORDER, type ShipmentStep } from './shipment-stepper';
import { ShipmentSummaryCard } from './shipment-summary-card';
import { ContractCreationStep } from './steps/contract-creation-step';
import { MerchandisePaymentStep } from './steps/merchandise-payment-step';
import { ShippingPreparationStep } from './steps/shipping-preparation-step';
import { DocumentPreparationStep } from './steps/document-preparation-step';
import { CustomsClearanceStep } from './steps/customs-clearance-step';
import { CompletionStep } from './steps/completion-step';
import { advanceShipmentStepAction, cancelShipmentAction, finalizeShipmentAction } from '../[id]/actions';
import type { ShipmentDetail } from './shipment-utils';

const MANUAL_ADVANCE_STEPS: ShipmentStep[] = ['SHIPPING_PREPARATION', 'DOCUMENT_PREPARATION'];

const STEP_COMPONENTS: Record<ShipmentStep, React.ComponentType<{ shipment: ShipmentDetail; readOnly?: boolean }>> = {
  CONTRACT_CREATION: ContractCreationStep,
  MERCHANDISE_PAYMENT: MerchandisePaymentStep,
  SHIPPING_PREPARATION: ShippingPreparationStep,
  DOCUMENT_PREPARATION: DocumentPreparationStep,
  CUSTOMS_CLEARANCE: CustomsClearanceStep,
  COMPLETION: CompletionStep,
};

interface ShipmentDetailContentProps {
  shipment: ShipmentDetail;
  totalPaidUsd: number;
}

export function ShipmentDetailContent({ shipment, totalPaidUsd }: ShipmentDetailContentProps) {
  const t = useTranslations('Admin.Shipments.Detail');
  const router = useRouter();
  const [viewingStep, setViewingStep] = useState<ShipmentStep>(shipment.currentStep as ShipmentStep);
  const [isPending, startTransition] = useTransition();
  const cancelModal = useDisclosure();
  const [cancelReason, setCancelReason] = useState('');
  const [cancelConfirmed, setCancelConfirmed] = useState(false);

  const isCurrentStep = viewingStep === shipment.currentStep;
  const isCanceled = shipment.status === 'CANCELED';
  const isFinished = shipment.status === 'FINISHED';
  const canAdvance = isCurrentStep && !isCanceled && !isFinished && MANUAL_ADVANCE_STEPS.includes(viewingStep);
  const canFinalize = isCurrentStep && !isCanceled && !isFinished && viewingStep === 'COMPLETION';

  const StepComponent = STEP_COMPONENTS[viewingStep];

  const handleAdvance = () => {
    if (!confirm(t('confirmAdvance'))) return;
    startTransition(async () => {
      await advanceShipmentStepAction(shipment.id, shipment.currentStep);
      router.refresh();
    });
  };

  const handleFinalize = () => {
    if (!confirm(t('confirmFinalize'))) return;
    startTransition(async () => {
      await finalizeShipmentAction(shipment.id);
      router.refresh();
    });
  };

  const handleCancel = async (formData: FormData) => {
    formData.set('shipmentId', shipment.id);
    const result = await cancelShipmentAction(formData);
    if (result.success) {
      cancelModal.onClose();
      router.refresh();
    }
  };

  return (
    <div className="container mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/shipments">
            <Button variant="ghost" size="sm" isIconOnly>
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">
            {t('title', { code: shipment.code })} — {shipment.clientOrganization?.name}
          </h1>
        </div>
        {!isCanceled && !isFinished && (
          <Button color="danger" variant="ghost" size="sm" onPress={cancelModal.onOpen}>
            <X className="size-4" />
            {t('cancel')}
          </Button>
        )}
      </div>

      {/* Summary Card */}
      <ShipmentSummaryCard
        totalProductsUsd={shipment.totalProductsUsd}
        totalPaidUsd={totalPaidUsd}
        eta={shipment.eta}
        shipmentType={shipment.shipmentType}
        status={shipment.status}
        orderType={shipment.clientOrganization?.orderType ?? 'ORDER'}
      />

      {/* Stepper */}
      <ShipmentStepper
        currentStep={shipment.currentStep as ShipmentStep}
        viewingStep={viewingStep}
        onStepClick={setViewingStep}
        isCanceled={isCanceled}
      />

      {/* Step Content */}
      <StepComponent shipment={shipment} readOnly={!isCurrentStep || isCanceled || isFinished} />

      {/* Advance / Finalize Button */}
      {canAdvance && (
        <div className="flex justify-end">
          <Button color="primary" onPress={handleAdvance} isDisabled={isPending}>
            {t('advanceStep')}
          </Button>
        </div>
      )}
      {canFinalize && (
        <div className="flex justify-end">
          <Button color="success" onPress={handleFinalize} isDisabled={isPending}>
            {t('finalize')}
          </Button>
        </div>
      )}

      {/* Cancel Modal */}
      <Modal isOpen={cancelModal.isOpen} onOpenChange={cancelModal.onOpenChange}>
        <ModalContent>
          <form action={handleCancel}>
            <ModalHeader>{t('cancel')}</ModalHeader>
            <ModalBody className="space-y-4">
              <Textarea
                name="reason"
                label={t('cancelReason')}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                isRequired
              />
              <Checkbox isSelected={cancelConfirmed} onValueChange={setCancelConfirmed}>
                {t('cancelConfirmation')}
              </Checkbox>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onPress={cancelModal.onClose}>
                {t('back')}
              </Button>
              <Button type="submit" color="danger" isDisabled={!cancelConfirmed || !cancelReason}>
                {t('cancel')}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bunx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(admin)/admin/shipments/[id]/page.tsx src/app/(admin)/admin/shipments/components/shipment-detail-content.tsx
git commit -m "feat: add shipment detail page with stepper, summary, and step routing"
```

---

## Task 13: Verify Build

- [ ] **Step 1: Run TypeScript check**

```bash
bunx tsc --noEmit
```

- [ ] **Step 2: Run tests**

```bash
bun test
```

- [ ] **Step 3: Fix any issues**

Address type errors, missing imports, or Hero UI component API differences.

- [ ] **Step 4: Commit fixes if any**

```bash
git add -A
git commit -m "fix: resolve build issues from shipment dashboard foundation"
```

---

## Execution Order & Dependencies

```
Task 1 (Schema) ──────────────────┐
Task 2 (DataTable onRowClick) ────┤
Task 3 (Admin Service) ───────────┤→ Task 7 (List Page)
Task 4 (Sidebar Nav) ─────────────┤
Task 5 (i18n Keys) ───────────────┤
Task 6 (Shared Types/Constants) ──┘

Task 8 (Stepper) ──────────┐
Task 9 (Summary Card) ─────┤→ Task 12 (Detail Page)
Task 10 (Step Placeholders) ┤
Task 11 (Server Actions) ───┘

Task 13 (Verify Build)
```

Tasks 1-6 are independent and can run in parallel.
Tasks 8-11 are independent and can run in parallel.
Task 7 depends on Tasks 2, 3, 5, 6.
Task 12 depends on Tasks 6, 8, 9, 10, 11.
Task 13 runs last.

---

## What This Plan Produces

After this plan, you have:

- Navigable admin shipments list at `/admin/shipments`
- Shipment detail page at `/admin/shipments/[id]` with working stepper, summary card, and cancel flow
- 6 step components (1 real + 5 placeholders)
- Advance step and finalize actions working
- "Pedidos" link in admin sidebar

**Next:** Plan B will fill in each step component with real content (payment tables, uploads, modals, etc.).
