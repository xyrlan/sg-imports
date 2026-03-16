import {
  pgTable,
  uuid,
  text,
  integer,
  decimal,
  timestamp,
  primaryKey,
  jsonb,
  unique,
  foreignKey,
} from 'drizzle-orm/pg-core';

import { packagingTypeEnum, walletTransactionTypeEnum, currencyEnum } from './enums';
import { organizations } from './auth';
import {
  ProductSnapshot,
  VariantAttributes,
  TieredPriceInfo
} from '../types';
import { shipments } from './shipments';
import { transactions, exchangeContracts } from './financial';

// ==========================================
// 3. CATALOG & SISCOMEX DATA
// ==========================================

export const hsCodes = pgTable('hs_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(), // NCM
  description: text('description'),
  ii: decimal('ii', { precision: 5, scale: 2 }).default('0'),
  ipi: decimal('ipi', { precision: 5, scale: 2 }).default('0'),
  pis: decimal('pis', { precision: 5, scale: 2 }).default('0'),
  cofins: decimal('cofins', { precision: 5, scale: 2 }).default('0'),
  antidumping: decimal('antidumping_tax', { precision: 5, scale: 2 }).default('0'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  name: text('name').notNull(),
  taxId: text('tax_id'), // TIN number
  countryCode: text('country_code').default('CN'),
  email: text('email'),
  address: text('address'),
  siscomexId: text('siscomex_id').unique(),
});

export const subSuppliers = pgTable('sub_suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  supplierId: uuid('supplier_id').references(() => suppliers.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  taxId: text('tax_id'), // TIN number
  countryCode: text('country_code').default('CN'),
  email: text('email'),
  address: text('address'),
  siscomexId: text('siscomex_id').unique(),
});

export const suppliersWallets = pgTable('suppliers_wallets', {
  id: uuid('id').defaultRandom().primaryKey(),
  supplierId: uuid('supplier_id').references(() => suppliers.id, { onDelete: 'cascade' }).notNull(),
  balanceUsd: decimal('balance_usd', { precision: 10, scale: 2 }).notNull().default('0'),
});

export const suppliersWalletTransactions = pgTable(
  'suppliers_wallet_transactions',
  {
    id: uuid('id').defaultRandom(),
    walletId: uuid('wallet_id').references(() => suppliersWallets.id, { onDelete: 'cascade' }).notNull(),
    exchangeContractId: uuid('exchange_contract_id'),
    orderId: uuid('order_id').references(() => shipments.id, { onDelete: 'cascade' }).notNull(),
    transactionId: uuid('transaction_id').references(() => transactions.id, { onDelete: 'cascade' }),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    type: walletTransactionTypeEnum('type').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.walletId, t.orderId, t.type] }),
    foreignKey({
      columns: [t.exchangeContractId],
      foreignColumns: [exchangeContracts.id],
      name: 'swt_exchange_contract_fk',
    }).onDelete('cascade'),
  ]
);

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  styleCode: text('style_code'), // Optional: style/product grouping code (SPU level)
  name: text('name').notNull(),
  description: text('description'),
  photos: text('photos').array(),

  // Foreign Keys
  hsCodeId: uuid('hs_code_id').references(() => hsCodes.id),
  supplierId: uuid('supplier_id').references(() => suppliers.id),

  siscomexId: text('siscomex_id').unique(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
    organizationId: uuid('organization_id')
      .references(() => organizations.id, { onDelete: 'cascade' })
      .notNull(),
    sku: text('sku').notNull(), // Stock Keeping Unit — unique per org (Alibaba/1688)
    name: text('name').notNull(), // Ex: "Azul - G" or "Default" for simple products
    priceUsd: decimal('price_usd', { precision: 10, scale: 2 }).notNull(), // Base price / first tier

    // Minimum sale unit: 1 carton. All freight/CBM calculations use carton_* fields.
    unitsPerCarton: integer('units_per_carton').default(1).notNull(),
    cartonHeight: decimal('carton_height', { precision: 10, scale: 2 }).notNull().default('0'),
    cartonWidth: decimal('carton_width', { precision: 10, scale: 2 }).notNull().default('0'),
    cartonLength: decimal('carton_length', { precision: 10, scale: 2 }).notNull().default('0'),
    cartonWeight: decimal('carton_weight', { precision: 10, scale: 3 }).notNull().default('0'),

    // Alibaba/1688: property_id:value_id mapping for i18n
    attributes: jsonb('attributes').$type<VariantAttributes>(),

    // Tiered pricing: [{ beginAmount: 1, price: "10.00" }, { beginAmount: 100, price: "9.00" }]
    tieredPriceInfo: jsonb('tiered_price_info').$type<TieredPriceInfo>(),

    // Dimensões específicas
    height: decimal('height', { precision: 10, scale: 2 }),
    width: decimal('width', { precision: 10, scale: 2 }),
    length: decimal('length', { precision: 10, scale: 2 }),
    netWeight: decimal('net_weight', { precision: 10, scale: 3 }),
    // Unit weight with packaging (kg) — for chargeable/volumetric weight
    unitWeight: decimal('unit_weight', { precision: 10, scale: 3 }),

    packagingType: packagingTypeEnum('packaging_type'),
  },
  (t) => [unique('product_variants_org_sku').on(t.organizationId, t.sku)]
);
