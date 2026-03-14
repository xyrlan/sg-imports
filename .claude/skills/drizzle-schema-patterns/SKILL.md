---
name: drizzle-schema-patterns
description: Drizzle ORM schema conventions for SG-Imports: decimal for money, JSONB typing, ProductSnapshot. Use when creating or modifying tables in src/db/schema.ts.
---

# Drizzle Schema Patterns

## Reference Schema First

Always reference `@src/db/schema.ts` before writing queries.

## Monetary Values (CRITICAL)

**NEVER use `float`.** Use:

- `decimal` (Drizzle) for monetary amounts
- `integer` for cents when exact precision is needed

```ts
decimal('min_order_value', { precision: 10, scale: 2 })
integer('amount_cents')
```

## Currency

Store `exchangeRate` used in every transaction involving currency conversion.  
Handle BRL, USD, CNY explicitly.

## JSONB Columns

### 1. Strictly type with `.$type<T>()`

```ts
import { ProductSnapshot } from './types';

jsonb('products').$type<ProductSnapshot[]>().notNull()
```

### 2. ProductSnapshot for Simulations

JSONB columns for simulations **MUST** use `ProductSnapshot` type from `src/db/types.ts`:

```ts
type ProductSnapshot = {
  styleCode?: string;
  sku?: string;
  name: string;
  nameEnglish?: string;
  description?: string;
  photos?: string[];
  priceUsd: string;
  netWeight?: number;
  unitWeight?: number;
  height?: number;
  width?: number;
  length?: number;
  attributes?: VariantAttributes;
  tieredPriceInfo?: TieredPriceInfo;
  hsCode: string;
  taxSnapshot?: TaxSnapshot;
  supplierName?: string;
  unitsPerCarton: number;
  cartonHeight?: number;
  cartonWidth?: number;
  cartonLength?: number;
  cartonWeight?: number;
  packagingType?: 'BOX' | 'PALLET' | 'BAG';
  totalCbm?: number;
  totalWeight?: number;
};
```

### 3. Other JSON Types

```ts
jsonb('metadata').$type<ShippingMetadata>()
```

## Directory Structure

- Schema: `src/db/schema.ts`
- Types: `src/db/types.ts`
- Business logic: `src/services/*.ts` (Data Access Layer)

## Enums

Define enums at top of schema, then use in tables:

```ts
export const shipmentStatusEnum = pgEnum('shipment_status', [
  'PENDING', 'PRODUCTION', 'BOOKED', ...
]);
```
