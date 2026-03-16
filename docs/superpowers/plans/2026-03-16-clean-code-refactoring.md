# Clean Code & Architecture Refactoring Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the SG-Imports codebase to follow clean code principles — reduce file sizes, eliminate duplication, extract reusable patterns, and improve architecture.

**Architecture:** Extract shared hooks and UI abstractions for modal/form patterns. Split monolithic files (actions, schema, services) into focused modules. Componentize large forms into sub-components following SRP.

**Tech Stack:** Next.js 16, React 19, Hero UI, Drizzle ORM, Zod, next-intl, Bun

---

## Codebase Audit Summary

### Top Offenders by Line Count

| File | Lines | Issue |
|------|-------|-------|
| `src/app/(admin)/admin/settings/actions.ts` | 1381 | Monolithic actions file |
| `src/db/schema.ts` | 1123 | Single file for 30+ tables |
| `src/app/(dashboard)/dashboard/simulations/actions.ts` | 958 | Monolithic actions file |
| `src/services/simulation.service.ts` | 943 | Mixed concerns |
| `src/app/(dashboard)/dashboard/products/components/product-form.tsx` | 817 | God component |
| `src/domain/simulation/services/simulation-domain.service.ts` | 777 | Could split by concern |
| `src/app/(admin)/admin/organizations/[id]/organization-edit-form.tsx` | 685 | Multiple forms in one |
| `src/app/(dashboard)/dashboard/products/actions.ts` | 677 | Monolithic actions |
| `src/app/(auth)/verify-email/page.tsx` | 625 | Page does too much |
| `src/services/quote-workflow.service.ts` | 595 | Mixed workflow steps |
| `src/components/ui/data-table.tsx` | 578 | Acceptable but has i18n issues |

### Key Patterns Found

1. **22 add/edit modal files** follow the same `useActionState` + `useEffect` close pattern — extractable to a shared hook
2. **Supplier modals duplicated 4x** across admin and dashboard with identical structure
3. **Auth + org check pattern** repeated 140+ times in server actions
4. **Hardcoded Portuguese strings** in `data-table.tsx` (violates i18n rules)
5. **Naming inconsistency**: `useFreightModality.ts` vs `use-notifications.ts`
6. **Debug code**: `console.log` in `product-form.tsx:275`

---

## Chunk 1: Shared Hooks & UI Abstractions

### Task 1: Extract `useActionModal` Hook

**Why:** The pattern `useActionState` + `useEffect` to close modal on success is repeated in 22+ modal components. Extracting it eliminates ~4-8 lines per modal and centralizes the close-on-success logic.

**Files:**
- Create: `src/hooks/use-action-modal.ts`
- Test: `src/hooks/__tests__/use-action-modal.test.ts`

- [ ] **Step 1: Write the hook**

```ts
// src/hooks/use-action-modal.ts
'use client';

import { useActionState, useEffect } from 'react';

type ActionResult = { ok?: boolean; error?: string } | null;

type ActionFn<TState extends ActionResult> = (
  state: TState,
  formData: FormData,
) => Promise<TState>;

interface UseActionModalOptions<TState extends ActionResult> {
  action: ActionFn<TState>;
  onSuccess?: () => void;
}

export function useActionModal<TState extends ActionResult = ActionResult>({
  action,
  onSuccess,
}: UseActionModalOptions<TState>) {
  const [state, formAction, isPending] = useActionState(action, null as TState);

  useEffect(() => {
    if (state?.ok && !isPending) {
      queueMicrotask(() => onSuccess?.());
    }
  }, [state?.ok, isPending, onSuccess]);

  return { state, formAction, isPending };
}
```

- [ ] **Step 2: Write unit test**

```ts
// src/hooks/__tests__/use-action-modal.test.ts
import { describe, it, expect } from 'bun:test';

// Since this is a React hook wrapping useActionState, we verify the module exports correctly
import { useActionModal } from '../use-action-modal';

describe('useActionModal', () => {
  it('should be exported as a function', () => {
    expect(typeof useActionModal).toBe('function');
  });
});
```

- [ ] **Step 3: Run test**

Run: `bun test src/hooks/__tests__/use-action-modal.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-action-modal.ts src/hooks/__tests__/use-action-modal.test.ts
git commit -m "refactor: extract useActionModal hook for modal close-on-success pattern"
```

---

### Task 2: Migrate Terminal Modals to `useActionModal`

**Why:** Demonstrate the pattern migration on a simple pair of modals.

**Files:**
- Modify: `src/app/(admin)/admin/settings/components/terminals/add-terminal-modal.tsx`
- Modify: `src/app/(admin)/admin/settings/components/terminals/edit-terminal-modal.tsx`

- [ ] **Step 1: Refactor `add-terminal-modal.tsx`**

Replace the manual `useActionState` + `useEffect` pattern with:

```tsx
import { useActionModal } from '@/hooks/use-action-modal';

// Replace:
// const [state, formAction, isPending] = useActionState(createTerminalAction, null);
// useEffect(() => { if (state?.ok && !isPending) { queueMicrotask(() => onOpenChange(false)); } }, [...]);

// With:
const { state, formAction, isPending } = useActionModal({
  action: createTerminalAction,
  onSuccess: () => onOpenChange(false),
});
```

- [ ] **Step 2: Refactor `edit-terminal-modal.tsx`** — same transformation

- [ ] **Step 3: Verify the app still compiles**

Run: `bun run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/(admin)/admin/settings/components/terminals/
git commit -m "refactor: migrate terminal modals to useActionModal hook"
```

---

### Task 3: Migrate All Remaining Modals to `useActionModal`

**Why:** Apply the same pattern across all modal pairs to eliminate duplication.

**Files to modify (each has the same useActionState+useEffect pattern):**
- `src/app/(admin)/admin/settings/components/ports/add-port-modal.tsx`
- `src/app/(admin)/admin/settings/components/ports/edit-port-modal.tsx`
- `src/app/(admin)/admin/settings/components/currency-exchange-brokers/add-currency-exchange-broker-modal.tsx`
- `src/app/(admin)/admin/settings/components/currency-exchange-brokers/edit-currency-exchange-broker-modal.tsx`
- `src/app/(admin)/admin/settings/components/suppliers/add-supplier-modal.tsx`
- `src/app/(admin)/admin/settings/components/suppliers/edit-supplier-modal.tsx`
- `src/app/(admin)/admin/settings/components/suppliers/add-sub-supplier-modal.tsx`
- `src/app/(admin)/admin/settings/components/suppliers/edit-sub-supplier-modal.tsx`
- `src/app/(dashboard)/dashboard/products/components/add-supplier-modal.tsx`
- `src/app/(dashboard)/dashboard/products/components/edit-supplier-modal.tsx`
- `src/app/(dashboard)/dashboard/products/components/edit-product-modal.tsx`
- `src/app/(dashboard)/dashboard/simulations/components/create-simulation-modal.tsx`
- `src/app/(dashboard)/dashboard/simulations/[id]/components/modals/add-product-modal.tsx`
- `src/app/(dashboard)/dashboard/simulations/[id]/components/modals/edit-item-modal.tsx`
- `src/app/(dashboard)/dashboard/simulations/[id]/components/modals/settings-modal.tsx`
- `src/app/(admin)/admin/settings/components/international-freights/freight-form-modal.tsx`
- `src/app/(admin)/admin/settings/components/freight-taxas/pricing-rule-form-modal.tsx`
- `src/app/(admin)/admin/settings/terminals/[id]/components/storage-rule-form-modal.tsx`

- [ ] **Step 1: Migrate admin settings modals** — Replace the `useActionState` + `useEffect` close pattern with `useActionModal` in:
  - `ports/add-port-modal.tsx`, `ports/edit-port-modal.tsx`
  - `currency-exchange-brokers/add-currency-exchange-broker-modal.tsx`, `currency-exchange-brokers/edit-currency-exchange-broker-modal.tsx`
  - `suppliers/add-supplier-modal.tsx`, `suppliers/edit-supplier-modal.tsx`
  - `suppliers/add-sub-supplier-modal.tsx`, `suppliers/edit-sub-supplier-modal.tsx`
  - `international-freights/freight-form-modal.tsx`
  - `freight-taxas/pricing-rule-form-modal.tsx`
  - `terminals/[id]/components/storage-rule-form-modal.tsx`

- [ ] **Step 2: Verify build for admin modals**

Run: `bun run build`

- [ ] **Step 3: Commit admin modals batch**

```bash
git add src/app/\(admin\)/admin/settings/components/ src/app/\(admin\)/admin/settings/terminals/
git commit -m "refactor: migrate admin settings modals to useActionModal hook"
```

- [ ] **Step 4: Migrate dashboard modals** — Same transformation for:
  - `products/components/add-supplier-modal.tsx`, `products/components/edit-supplier-modal.tsx`
  - `products/components/edit-product-modal.tsx`
  - `simulations/components/create-simulation-modal.tsx`
  - `simulations/[id]/components/modals/add-product-modal.tsx`
  - `simulations/[id]/components/modals/edit-item-modal.tsx`
  - `simulations/[id]/components/modals/settings-modal.tsx`

- [ ] **Step 5: Verify build for dashboard modals**

Run: `bun run build`

- [ ] **Step 6: Commit dashboard modals batch**

```bash
git add src/app/\(dashboard\)/dashboard/products/components/ src/app/\(dashboard\)/dashboard/simulations/
git commit -m "refactor: migrate dashboard modals to useActionModal hook"
```

---

### Task 4: Deduplicate Supplier Modals (Admin ↔ Dashboard)

**Why:** Admin supplier modals (`src/app/(admin)/.../suppliers/`) and Dashboard supplier modals (`src/app/(dashboard)/.../products/`) are structurally identical — they differ only in translation namespace and server action import. We can extract a shared component.

**Files:**
- Create: `src/components/shared/supplier-form-modal.tsx`
- Modify: `src/app/(admin)/admin/settings/components/suppliers/add-supplier-modal.tsx`
- Modify: `src/app/(admin)/admin/settings/components/suppliers/edit-supplier-modal.tsx`
- Modify: `src/app/(dashboard)/dashboard/products/components/add-supplier-modal.tsx`
- Modify: `src/app/(dashboard)/dashboard/products/components/edit-supplier-modal.tsx`

- [ ] **Step 1: Create shared `SupplierFormModal` component**

```tsx
// src/components/shared/supplier-form-modal.tsx
'use client';

import { useCallback } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@heroui/react';
import { Input, Button } from '@heroui/react';
import { useActionModal } from '@/hooks/use-action-modal';
import { FormError } from '@/components/ui/form-error';

interface Supplier {
  id: string;
  name: string;
  taxId: string | null;
  countryCode: string | null;
  email: string | null;
  address: string | null;
}

interface SupplierFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  action: (state: any, formData: FormData) => Promise<any>;
  supplier?: Supplier | null;
  labels: {
    title: string;
    name: string;
    taxId: string;
    countryCode: string;
    email: string;
    address: string;
    cancel: string;
    submit: string;
    submitting: string;
  };
}

export function SupplierFormModal({
  isOpen,
  onOpenChange,
  action,
  supplier,
  labels,
}: SupplierFormModalProps) {
  const { state, formAction, isPending } = useActionModal({
    action,
    onSuccess: () => onOpenChange(false),
  });

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        <form action={formAction}>
          {supplier && <input type="hidden" name="id" value={supplier.id} />}
          <ModalHeader>{labels.title}</ModalHeader>
          <ModalBody className="space-y-4">
            <FormError state={state} />
            <Input name="name" label={labels.name} defaultValue={supplier?.name ?? ''} isRequired />
            <Input name="taxId" label={labels.taxId} defaultValue={supplier?.taxId ?? ''} />
            <Input name="countryCode" label={labels.countryCode} defaultValue={supplier?.countryCode ?? ''} />
            <Input name="email" label={labels.email} type="email" defaultValue={supplier?.email ?? ''} />
            <Input name="address" label={labels.address} defaultValue={supplier?.address ?? ''} />
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => onOpenChange(false)}>{labels.cancel}</Button>
            <Button type="submit" color="primary" isLoading={isPending}>
              {isPending ? labels.submitting : labels.submit}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
```

- [ ] **Step 2: Refactor admin add-supplier-modal.tsx to use shared component**

```tsx
// Reduced to ~20 lines — just imports, translations, and the shared component
'use client';
import { useTranslations } from 'next-intl';
import { createSupplierAction } from '../../actions';
import { SupplierFormModal } from '@/components/shared/supplier-form-modal';

interface Props {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSupplierModal({ isOpen, onOpenChange }: Props) {
  const t = useTranslations('Admin.Settings.Suppliers');
  return (
    <SupplierFormModal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      action={createSupplierAction}
      labels={{
        title: t('addSupplier'),
        name: t('name'), taxId: t('taxId'), countryCode: t('countryCode'),
        email: t('email'), address: t('address'),
        cancel: t('cancel'), submit: t('save'), submitting: t('saving'),
      }}
    />
  );
}
```

- [ ] **Step 3: Apply same pattern to edit-supplier-modal, and dashboard add/edit supplier modals**

- [ ] **Step 4: Verify build**

Run: `bun run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/components/shared/supplier-form-modal.tsx
git add src/app/(admin)/admin/settings/components/suppliers/
git add src/app/(dashboard)/dashboard/products/components/add-supplier-modal.tsx
git add src/app/(dashboard)/dashboard/products/components/edit-supplier-modal.tsx
git commit -m "refactor: deduplicate supplier modals with shared SupplierFormModal component"
```

---

### Task 5: Fix Naming Inconsistency in Hooks

**Why:** All other hook files use kebab-case (`use-notifications.ts`, `use-file-upload.ts`). One file uses camelCase.

**Files:**
- Rename: `src/hooks/useFreightModality.ts` → `src/hooks/use-freight-modality.ts`
- Modify: All files that import from the old path

- [ ] **Step 1: Find all imports of `useFreightModality`**

Run: `grep -r "useFreightModality" src/ --include="*.ts" --include="*.tsx" -l`

- [ ] **Step 2: Rename file and update all imports**

```bash
git mv src/hooks/useFreightModality.ts src/hooks/use-freight-modality.ts
```

Then update all import paths from `@/hooks/useFreightModality` to `@/hooks/use-freight-modality`.

- [ ] **Step 3: Verify build**

Run: `bun run build`

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-freight-modality.ts <files-that-import-the-hook>
git commit -m "refactor: rename useFreightModality to kebab-case for consistency"
```

---

### Task 6: Fix Hardcoded Portuguese in DataTable

**Why:** `src/components/ui/data-table.tsx` has 4 hardcoded Portuguese strings, violating the i18n rule (NO hardcoded strings).

**Files:**
- Modify: `src/components/ui/data-table.tsx`
- Modify: `messages/pt.json` (add `Common.DataTable` keys)

- [ ] **Step 1: Add i18n keys to `messages/pt.json`**

Add under a `Common.DataTable` namespace:
```json
{
  "Common": {
    "DataTable": {
      "clearFilters": "Limpar filtros",
      "rows": "Linhas:",
      "page": "Pag.",
      "noResults": "Nenhum resultado encontrado."
    }
  }
}
```

- [ ] **Step 2: Replace hardcoded strings in `data-table.tsx`**

Since DataTable is a client component, add `useTranslations('Common.DataTable')` and replace:
- Line 303: `"Limpar filtros"` → `t('clearFilters')`
- Line 337: `"Linhas:"` → `t('rows')`
- Line 353: `"Pag."` → `t('page')`
- Line 565: `"Nenhum resultado encontrado."` → `t('noResults')`

- [ ] **Step 3: Verify build**

Run: `bun run build`

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/data-table.tsx messages/pt.json
git commit -m "fix(i18n): replace hardcoded Portuguese strings in DataTable with translations"
```

---

### Task 7: Remove Debug Code

**Why:** `console.log` left in production code at `product-form.tsx:275`.

**Files:**
- Modify: `src/app/(dashboard)/dashboard/products/components/product-form.tsx`

- [ ] **Step 1: Remove the console.log**

Remove `console.log('handleSubmit formData', formData)` at line 275.

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/dashboard/products/components/product-form.tsx
git commit -m "chore: remove debug console.log from product-form"
```

---

## Chunk 2: Split Monolithic Actions Files

### Task 8: Split Admin Settings Actions

**Why:** `src/app/(admin)/admin/settings/actions.ts` is 1381 lines — the largest file in the project. It contains server actions for ~10 different settings sections (taxes, terminals, carriers, ports, brokers, suppliers, freights, pricing rules, honorarios). Each section should have its own actions file co-located with its components.

**Files:**
- Modify: `src/app/(admin)/admin/settings/actions.ts` (split into multiple files)
- Create: `src/app/(admin)/admin/settings/components/impostos-taxas/actions.ts`
- Create: `src/app/(admin)/admin/settings/components/terminals/actions.ts`
- Create: `src/app/(admin)/admin/settings/components/carriers/actions.ts`
- Create: `src/app/(admin)/admin/settings/components/ports/actions.ts`
- Create: `src/app/(admin)/admin/settings/components/currency-exchange-brokers/actions.ts`
- Create: `src/app/(admin)/admin/settings/components/suppliers/actions.ts`
- Create: `src/app/(admin)/admin/settings/components/international-freights/actions.ts`
- Create: `src/app/(admin)/admin/settings/components/freight-taxas/actions.ts`
- Create: `src/app/(admin)/admin/settings/components/honorarios/actions.ts`

- [ ] **Step 1: Read `actions.ts`** and document which functions belong to which domain. Map each exported function to its target file.

- [ ] **Step 2: Create `action-utils.ts`** with shared auth+org check pattern:

```ts
// src/app/(admin)/admin/settings/action-utils.ts
'use server';

import { requireAuthOrRedirect } from '@/services/auth.service';
import { getOrganizationById } from '@/services/admin/organizations.service';

export async function requireAdminOrg(organizationId: string) {
  const user = await requireAuthOrRedirect();
  const orgData = await getOrganizationById(organizationId, user.id);
  if (!orgData) throw new Error('Access denied');
  return { user, orgData };
}
```

- [ ] **Step 3: Extract batch 1** — Move tax/imposto, honorarios, and terminal actions to their component directories. Each new file gets `'use server'` directive and imports from `action-utils.ts`.

- [ ] **Step 4: Update imports for batch 1 consumers and verify build**

Run: `bun run build`

- [ ] **Step 5: Commit batch 1**

```bash
git add src/app/\(admin\)/admin/settings/
git commit -m "refactor: extract tax, honorarios, and terminal actions from settings monolith"
```

- [ ] **Step 6: Extract batch 2** — Move carrier, port, currency-broker, and supplier actions.

- [ ] **Step 7: Update imports for batch 2 and verify build**

Run: `bun run build`

- [ ] **Step 8: Commit batch 2**

```bash
git add src/app/\(admin\)/admin/settings/
git commit -m "refactor: extract carrier, port, broker, and supplier actions from settings monolith"
```

- [ ] **Step 9: Extract batch 3** — Move freight and pricing-rule actions. Delete original `actions.ts`.

- [ ] **Step 10: Update imports, verify build and run tests**

Run: `bun run build && bun test`

- [ ] **Step 11: Commit batch 3**

```bash
git add src/app/\(admin\)/admin/settings/
git commit -m "refactor: complete settings actions split, remove monolith (1381 LOC → 10 focused files)"
```

---

### Task 9: Split Simulations Actions

**Why:** `src/app/(dashboard)/dashboard/simulations/actions.ts` is 958 lines. It contains actions for simulation CRUD, item management, recalculation, and quote workflow — distinct concerns.

**Files:**
- Modify: `src/app/(dashboard)/dashboard/simulations/actions.ts` → keep only simulation CRUD
- Create: `src/app/(dashboard)/dashboard/simulations/[id]/actions.ts` — item management and recalculation
- Create: `src/app/(dashboard)/dashboard/simulations/[id]/components/quote-actions.ts` — quote workflow actions

- [ ] **Step 1: Read the actions file** to identify natural boundaries.

- [ ] **Step 2: Extract item-level actions** (add/edit/remove item, recalculate) into `[id]/actions.ts`.

- [ ] **Step 3: Extract quote workflow actions** (send quote, pull back, etc.) into quote-actions.ts.

- [ ] **Step 4: Update imports** in all consuming components.

- [ ] **Step 5: Verify build and tests**

Run: `bun run build && bun test`

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/simulations/
git commit -m "refactor: split simulation actions by concern (CRUD, items, quote workflow)"
```

---

### Task 10: Split Products Actions

**Why:** `src/app/(dashboard)/dashboard/products/actions.ts` is 677 lines. Contains product CRUD, variant management, supplier management, and import/export — distinct concerns.

**Files:**
- Modify: `src/app/(dashboard)/dashboard/products/actions.ts` → keep product CRUD
- Create: `src/app/(dashboard)/dashboard/products/components/supplier-actions.ts` — supplier CRUD
- Create: `src/app/(dashboard)/dashboard/products/components/import-export-actions.ts` — CSV import/export

- [ ] **Step 1: Read the actions file** and identify boundaries.

- [ ] **Step 2: Extract supplier-related actions** into `supplier-actions.ts`.

- [ ] **Step 3: Extract import/export actions** into `import-export-actions.ts`.

- [ ] **Step 4: Update imports and verify build + tests**

Run: `bun run build && bun test`

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/products/
git commit -m "refactor: split product actions into CRUD, suppliers, and import/export"
```

---

## Chunk 3: Split Large Components

### Task 11: Componentize ProductForm (817 lines → ~200 lines)

**Why:** The largest component in the codebase. Violates SRP by handling basic fields, variant management, tiered pricing, and attributes all in one component.

**Files:**
- Modify: `src/app/(dashboard)/dashboard/products/components/product-form.tsx`
- Create: `src/app/(dashboard)/dashboard/products/components/form-sections/basic-fields.tsx`
- Create: `src/app/(dashboard)/dashboard/products/components/form-sections/simulated-fields.tsx`
- Create: `src/app/(dashboard)/dashboard/products/components/form-sections/catalog-fields.tsx`
- Create: `src/app/(dashboard)/dashboard/products/components/form-sections/variants-section.tsx`
- Create: `src/app/(dashboard)/dashboard/products/components/form-sections/tiered-pricing-section.tsx`
- Create: `src/app/(dashboard)/dashboard/products/components/form-sections/attributes-section.tsx`
- Create: `src/app/(dashboard)/dashboard/products/hooks/use-product-form.ts`

- [ ] **Step 1: Read the full product-form.tsx** to understand all state, handlers, and sections.

- [ ] **Step 2: Extract `useProductForm` hook** — move all state management (`formData`, `variantKeys`, `tieredPriceRows`, `attributePairs`, `options`, etc.) and helper functions (`productToFormData`, `getInitialState`, `handleSubmit`) into a custom hook.

- [ ] **Step 3: Extract `BasicFields` component** — product name, description, HS code, photos (lines ~330-378).

- [ ] **Step 4: Extract `SimulatedFields` component** — fields shown in simulated product mode (lines ~380-430).

- [ ] **Step 5: Extract `CatalogFields` component** — fields shown in catalog mode (lines ~432-472).

- [ ] **Step 6: Extract `VariantsSection` component** — variant key management and variant field rendering (lines ~474-600).

- [ ] **Step 7: Extract `TieredPricingSection` component** — the tiered pricing rows logic (lines ~603-718).

- [ ] **Step 8: Extract `AttributesSection` component** — attribute key-value pair management (lines ~719-787).

- [ ] **Step 9: Rewrite `ProductForm`** as an orchestrator component that uses the hook and renders the sub-components. Target: < 150 lines.

- [ ] **Step 10: Verify build**

Run: `bun run build`

- [ ] **Step 11: Commit**

```bash
git add src/app/(dashboard)/dashboard/products/components/
git commit -m "refactor: split ProductForm (817 LOC) into focused sub-components and custom hook"
```

---

### Task 12: Split Verify Email Page (625 lines)

**Why:** A page component should be a thin orchestrator. This page likely contains UI, logic, and state management that should be extracted.

**Files:**
- Modify: `src/app/(auth)/verify-email/page.tsx`
- Create: `src/app/(auth)/verify-email/components/verify-email-content.tsx`

- [ ] **Step 1: Read the page.tsx** to understand its structure.

- [ ] **Step 2: Extract the client component** into `verify-email-content.tsx`, keeping the page as a thin server component wrapper.

- [ ] **Step 3: Verify build**

Run: `bun run build`

- [ ] **Step 4: Commit**

```bash
git add "src/app/(auth)/verify-email/"
git commit -m "refactor: extract verify-email page into thin page + client component"
```

---

### Task 13: Split Organization Edit Form (685 lines)

**Why:** Contains 4 separate `useActionState` calls and multiple form sections — each section should be its own component.

**Files:**
- Modify: `src/app/(admin)/admin/organizations/[id]/organization-edit-form.tsx`
- Create: `src/app/(admin)/admin/organizations/[id]/components/org-basic-info-section.tsx`
- Create: `src/app/(admin)/admin/organizations/[id]/components/org-address-section.tsx`
- Create: `src/app/(admin)/admin/organizations/[id]/components/org-documents-section.tsx`
- Create: `src/app/(admin)/admin/organizations/[id]/components/org-members-section.tsx`

- [ ] **Step 1: Read the form** to identify the 4 form sections and their state boundaries.

- [ ] **Step 2: Extract each section** into its own component, each managing its own `useActionState`.

- [ ] **Step 3: Rewrite the parent** as an orchestrator with tabs/sections rendering sub-components. Target: < 150 lines.

- [ ] **Step 4: Verify build**

Run: `bun run build`

- [ ] **Step 5: Commit**

```bash
git add "src/app/(admin)/admin/organizations/[id]/"
git commit -m "refactor: split organization edit form into section components"
```

---

### Task 14: Split NavbarProformaQuoteSelect (225 lines)

**Why:** Handles dropdown, create modal, and delete dialog in one component with hacky workarounds for event conflicts.

**Files:**
- Modify: `src/components/layout/navbar-proforma-quote-select.tsx`
- Create: `src/components/layout/proforma-quote-delete-dialog.tsx`

- [ ] **Step 1: Extract the delete dialog** into `proforma-quote-delete-dialog.tsx`.

- [ ] **Step 2: Simplify the main component** — just the select dropdown + modal trigger. Target: < 120 lines.

- [ ] **Step 3: Verify build**

Run: `bun run build`

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/
git commit -m "refactor: extract delete dialog from navbar proforma quote select"
```

---

## Chunk 4: Split Services & Schema

### Task 15: Split Database Schema (1123 lines)

**Why:** Single file with 30+ table definitions makes it hard to navigate and causes merge conflicts. Split by domain.

**Files:**
- Modify: `src/db/schema.ts` → becomes a barrel file (re-exports)
- Create: `src/db/schema/auth.ts` — users, sessions, accounts
- Create: `src/db/schema/organizations.ts` — organizations, memberships
- Create: `src/db/schema/products.ts` — products, variants, suppliers
- Create: `src/db/schema/simulations.ts` — simulations, simulation items
- Create: `src/db/schema/quotes.ts` — quotes, quote items
- Create: `src/db/schema/admin-config.ts` — settings, tax rates, terminals, carriers, ports, brokers, freights, pricing rules
- Create: `src/db/schema/notifications.ts` — notifications
- Create: `src/db/schema/index.ts` — barrel export

- [ ] **Step 1: Read `src/db/schema.ts`** and map each table to its domain.

- [ ] **Step 2: Create domain schema files** — move tables to their respective files, maintaining all relations and type exports.

- [ ] **Step 3: Convert `schema.ts` to barrel re-export**

```ts
// src/db/schema.ts
export * from './schema/auth';
export * from './schema/organizations';
export * from './schema/products';
export * from './schema/simulations';
export * from './schema/quotes';
export * from './schema/admin-config';
export * from './schema/notifications';
```

- [ ] **Step 4: Verify all imports still resolve**

Run: `bun run build`
Expected: Build succeeds (barrel export maintains backwards compatibility)

- [ ] **Step 5: Commit**

```bash
git add src/db/
git commit -m "refactor: split schema.ts (1123 LOC) into domain-specific modules"
```

---

### Task 16: Investigate & Split Simulation Service (943 lines)

**Why:** Mixes simulation CRUD, quote selection, HS code retrieval, and recalculation logic — distinct responsibilities.

**Files:**
- Modify: `src/services/simulation.service.ts` → keep simulation CRUD queries
- Create: `src/services/simulation-items.service.ts` — item-level operations (to be confirmed in investigation)

- [ ] **Step 1: Investigate** — Read the full service file. List every exported function and categorize it:
  - **Simulation CRUD**: functions dealing with simulation create/read/update/delete
  - **Item operations**: functions dealing with simulation items (add, edit, remove, reorder)
  - **Other concerns**: HS code lookup, recalculation triggers, etc.
  Document the function-to-target-file mapping before proceeding.

- [ ] **Step 2: Extract item operations** into `simulation-items.service.ts` based on the mapping from Step 1.

- [ ] **Step 3: Update imports and verify build + tests**

Run: `bun run build && bun test`

- [ ] **Step 4: Commit**

```bash
git add src/services/
git commit -m "refactor: split simulation service into focused modules"
```

---

### Task 17: Investigate & Split Quote Workflow Service (595 lines)

**Why:** Contains unrelated workflow steps (send, pull back, reject, sign) that could be individual functions or smaller service modules.

**Files:**
- Modify: `src/services/quote-workflow.service.ts`

- [ ] **Step 1: Investigate** — Read the service. List every exported function. Determine if they share significant helpers or state. Document:
  - Shared helpers/utilities used by multiple functions
  - Functions that could be independent modules
  - Decision: split or keep as-is with section comments

- [ ] **Step 2: If splitting is warranted**, extract into focused files (e.g., `quote-sending.service.ts`, `quote-signing.service.ts`). If not warranted, add section divider comments and skip to Step 4.

- [ ] **Step 3: Update imports and verify build + tests**

Run: `bun run build && bun test`

- [ ] **Step 4: Commit**

```bash
git add src/services/
git commit -m "refactor: reorganize quote workflow service"
```

---

### Task 18: Investigate & Split Simulation Domain Service (777 lines)

**Why:** `src/domain/simulation/services/simulation-domain.service.ts` is a large domain service. The `domain/` directory already follows DDD patterns — ensure the service is split by subdomain responsibility.

**Files:**
- Modify: `src/domain/simulation/services/simulation-domain.service.ts`

- [ ] **Step 1: Investigate** — Read the full service. List every exported function and categorize into subdomain responsibilities:
  - Freight selection / matching
  - Cost aggregation / totals
  - Item-level landed cost calculations
  - Other utilities
  Document the function-to-file mapping. Determine which extractions are worthwhile.

- [ ] **Step 2: Extract modules** based on investigation results. Create new files only where there's a clear separation of concerns (e.g., `freight-selection.service.ts`, `cost-aggregation.service.ts`).

- [ ] **Step 3: Ensure existing tests still pass**

Run: `bun test src/domain/`

- [ ] **Step 4: Verify build**

Run: `bun run build`

- [ ] **Step 5: Commit**

```bash
git add src/domain/
git commit -m "refactor: split simulation domain service into focused modules"
```

---

## Execution Priority

The tasks are ordered by impact and risk:

| Priority | Tasks | Impact | Risk |
|----------|-------|--------|------|
| **P0** | 1-3 (useActionModal hook + migration) | High — eliminates most repeated pattern | Low |
| **P0** | 7 (remove debug code) | Quick win | None |
| **P1** | 4 (deduplicate supplier modals) | Medium — eliminates 4x duplication | Low |
| **P1** | 5-6 (naming + i18n fixes) | Standards compliance | Low |
| **P1** | 8-10 (split actions files) | High — 3000+ LOC better organized | Medium |
| **P2** | 11 (split ProductForm) | High — most complex component | Medium |
| **P2** | 12-14 (split other large components) | Medium | Medium |
| **P3** | 15 (split schema) | High — reduces merge conflicts | High (many imports) |
| **P3** | 16-18 (split services) | Medium — better organization | Medium |
