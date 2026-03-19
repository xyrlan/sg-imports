# Admin Products Server-Side Pagination

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire server-side pagination, search, and sorting for both Products and NCMs tables in the admin products page.

**Architecture:** Add two Server Actions (`fetchProductsAction`, `fetchHsCodesAction`) that accept `AdminQueryParams` and return `PaginatedResult`. The client component (`ProductsContent`) manages pagination/search state and calls these actions on change, passing results to `DataTable` with `manualPagination`.

**Tech Stack:** Next.js Server Actions, React 19 useTransition, TanStack Table manual pagination, Drizzle ORM (existing services).

---

### Task 1: Add Server Actions for paginated fetching

**Files:**
- Modify: `src/app/(admin)/admin/products/actions.ts`

- [ ] **Step 1: Add `fetchProductsAction` and `fetchHsCodesAction`**

```ts
export async function fetchProductsAction(params: {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  await requireSuperAdmin();
  const result = await getAllProducts(params);
  return result;
}

export async function fetchHsCodesAction(params: {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  await requireSuperAdmin();
  const result = await getAllHsCodes(params);
  return result;
}
```

Add imports for `getAllProducts`, `getAllHsCodes` from `@/services/admin`.

- [ ] **Step 2: Verify types compile**

Run: `bunx tsc --noEmit 2>&1 | grep "actions.ts"`

---

### Task 2: Update page.tsx to pass PaginatedResult (not just data)

**Files:**
- Modify: `src/app/(admin)/admin/products/page.tsx`
- Modify: `src/app/(admin)/admin/products/products-content.tsx` (props interface)

- [ ] **Step 1: Update page.tsx to pass full PaginatedResult**

Change page.tsx to pass the full paginated result objects instead of just `.data`:

```ts
return (
  <ProductsContent
    initialProducts={productsResult}
    initialHsCodes={hsCodesResult}
  />
);
```

- [ ] **Step 2: Update ProductsContent props to accept PaginatedResult**

Change the interface to:
```ts
import type { PaginatedResult } from '@/services/admin/types';

interface ProductsContentProps {
  initialProducts: PaginatedResult<ProductWithOrgAndNcm>;
  initialHsCodes: PaginatedResult<HsCode>;
}
```

---

### Task 3: Wire server-side pagination in ProductsContent

**Files:**
- Modify: `src/app/(admin)/admin/products/products-content.tsx`

- [ ] **Step 1: Add state for pagination, search, and data**

Add state variables for both tabs:
- `products` / `hsCodes` (data arrays, initialized from props)
- `productsPagination` / `hsCodesPagination` (`PaginationState`)
- `productsPageCount` / `hsCodesPageCount`
- `productsTotal` / `hsCodesTotal`
- `productsSearch` / `hsCodesSearch` (debounced search strings)
- `isLoading` transition state

- [ ] **Step 2: Add fetch effect for products**

When `productsPagination` or `productsSearch` changes, call `fetchProductsAction` via `startTransition` and update state.

- [ ] **Step 3: Add fetch effect for NCMs**

Same pattern for HS codes.

- [ ] **Step 4: Wire DataTable with manualPagination props**

For each DataTable, pass:
- `manualPagination={true}`
- `pagination={productsPagination}`
- `onPaginationChange={setProductsPagination}`
- `pageCount={productsPageCount}`
- `isLoading={isPending}`

- [ ] **Step 5: Wire server-side search**

Replace the DataTable's client-side `globalFilter` with a debounced search that triggers server calls. Use a custom `onSearchChange` callback prop or override the search behavior.

- [ ] **Step 6: Update tab counts to show totals**

Change tab labels from `initialProducts.length` to the total count from the paginated result.

---

### Task 4: Add server-search support to DataTable

**Files:**
- Modify: `src/components/ui/data-table.tsx`

- [ ] **Step 1: Add `onSearchChange` prop**

Add an optional `onSearchChange?: (value: string) => void` prop. When provided, the search input calls this instead of (or in addition to) setting `globalFilter`. This allows the parent to handle search server-side.

- [ ] **Step 2: Disable client-side filtering when manual pagination is active**

When `manualPagination` is true, don't pass `getFilteredRowModel` to the table config (the server already filtered).

---

### Task 5: Verify and commit

- [ ] **Step 1: Type check**

Run: `bunx tsc --noEmit 2>&1 | grep -v "bun:test" | grep -v "03-products"`

- [ ] **Step 2: Manual verification**

Run `bun dev`, navigate to Admin > Products, verify:
- Pagination controls work
- Changing page fetches new data
- Search triggers server-side filtering
- Tab counts show total, not page size
- Both Products and NCMs tabs work independently

- [ ] **Step 3: Commit**

```bash
git add src/app/(admin)/admin/products/ src/components/ui/data-table.tsx
git commit -m "feat: add server-side pagination to admin products and NCMs tables"
```
