import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  decimal,
  timestamp,
  primaryKey,
  jsonb,
  check,
  foreignKey,
} from 'drizzle-orm/pg-core';

import {
  shippingModalityEnum,
  containerTypeEnum,
  currencyEnum,
  freightProposalStatusEnum,
  incotermEnum,
  pricingScopeEnum,
  feeBasisEnum,
} from './enums';
import { carriers, ports } from './admin-config';
import { organizations, profiles } from './auth';
import { shipments, shipmentDocuments } from './shipments';

// ==========================================
// 12. FREIGHT MANAGEMENT (InternacionalFreight, FreightProposal, PricingRule)
// ==========================================

/** Base freight rates by carrier, container type, and ports */
export const internationalFreights = pgTable(
  'international_freights',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    shippingModality: shippingModalityEnum('shipping_modality').default('SEA_FCL').notNull(),
    carrierId: uuid('carrier_id').references(() => carriers.id, { onDelete: 'cascade' }),
    containerType: containerTypeEnum('container_type'),
    value: decimal('value', { precision: 10, scale: 2 }).notNull(),
    currency: currencyEnum('currency').default('USD').notNull(),
    freeTimeDays: integer('free_time_days').default(0),
    expectedProfit: decimal('expected_profit', { precision: 10, scale: 2 }),
    validFrom: timestamp('valid_from').defaultNow().notNull(),
    validTo: timestamp('valid_to'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [],
);

/** Junction: international freight ↔ ports of loading (many-to-many) */
export const internationalFreightPortsOfLoading = pgTable(
  'int_freight_ports_loading',
  {
    internationalFreightId: uuid('international_freight_id').notNull(),
    portId: uuid('port_id').references(() => ports.id, { onDelete: 'cascade' }).notNull(),
  },
  (t) => [
    primaryKey({
      name: 'int_freight_loading_pk',
      columns: [t.internationalFreightId, t.portId],
    }),
    foreignKey({
      columns: [t.internationalFreightId],
      foreignColumns: [internationalFreights.id],
      name: 'ifpl_intl_freight_fk',
    }).onDelete('cascade'),
  ]
);

/** Junction: international freight ↔ ports of discharge (many-to-many) */
export const internationalFreightPortsOfDischarge = pgTable(
  'int_freight_ports_discharge',
  {
    internationalFreightId: uuid('international_freight_id').notNull(),
    portId: uuid('port_id').references(() => ports.id, { onDelete: 'cascade' }).notNull(),
  },
  (t) => [
    primaryKey({
      name: 'int_freight_discharge_pk',
      columns: [t.internationalFreightId, t.portId],
    }),
    foreignKey({
      columns: [t.internationalFreightId],
      foreignColumns: [internationalFreights.id],
      name: 'ifpd_intl_freight_fk',
    }).onDelete('cascade'),
  ]
);

/** Commercial proposals sent to clients (based on internationalFreights) */
export const freightProposals = pgTable(
  'freight_proposals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
    internationalFreightId: uuid('international_freight_id').notNull(),
    status: freightProposalStatusEnum('status').default('DRAFT').notNull(),
    freightValue: decimal('freight_value', { precision: 10, scale: 2 }).notNull(),
    totalValue: decimal('total_value', { precision: 10, scale: 2 }).notNull(),
    customTaxes: jsonb('custom_taxes'),
    transitTimeDays: integer('transit_time_days'),
    validUntil: timestamp('valid_until'),
    pdfUrl: text('pdf_url'),
    cnpj: text('cnpj'),
    email: text('email'),
    reference: text('reference'),
    incoterm: incotermEnum('incoterm').default('FOB'),
    createdById: uuid('created_by_id').references(() => profiles.id, { onDelete: 'restrict' }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.internationalFreightId],
      foreignColumns: [internationalFreights.id],
      name: 'fp_intl_freight_fk',
    }).onDelete('restrict'),
  ]
);

/** Admin tariff rules — carrier/port/container scope */
export const pricingRules = pgTable(
  'pricing_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    carrierId: uuid('carrier_id').references(() => carriers.id, { onDelete: 'restrict' }).notNull(),
    portId: uuid('port_id').references(() => ports.id, { onDelete: 'restrict' }),
    containerType: containerTypeEnum('container_type'),
    portDirection: text('port_direction').$type<'ORIGIN' | 'DESTINATION' | 'BOTH'>().default('BOTH').notNull(),
    scope: pricingScopeEnum('scope').default('SPECIFIC').notNull(),
    validFrom: timestamp('valid_from').notNull(),
    validTo: timestamp('valid_to'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    check(
      'pricing_rules_scope_integrity',
      sql`(
        (${t.scope} = 'CARRIER' AND ${t.portId} IS NULL AND ${t.containerType} IS NULL)
        OR (${t.scope} = 'PORT' AND ${t.portId} IS NOT NULL AND ${t.containerType} IS NULL)
        OR (${t.scope} = 'SPECIFIC' AND ${t.portId} IS NOT NULL AND ${t.containerType} IS NOT NULL)
      )`
    ),
  ]
);

/** Fee items within a pricing rule (AFRMM, desova, etc.) — Catalog only, no shipment link */
export const pricingItems = pgTable('pricing_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  pricingRuleId: uuid('pricing_rule_id').references(() => pricingRules.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: currencyEnum('currency').default('BRL').notNull(),
  basis: feeBasisEnum('basis').default('PER_CONTAINER').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/** Snapshot of freight used for a shipment (1:1 with shipment) */
export const shipmentFreightReceipts = pgTable('shipment_freight_receipts', {
  id: uuid('id').defaultRandom().primaryKey(),
  shipmentId: uuid('shipment_id').references(() => shipments.id, { onDelete: 'cascade' }).notNull().unique(),
  carrierId: uuid('carrier_id').references(() => carriers.id, { onDelete: 'restrict' }).notNull(),
  containerType: containerTypeEnum('container_type').notNull(),
  containerQuantity: integer('container_quantity').default(1).notNull(),
  portOfLoadingId: uuid('port_of_loading_id').references(() => ports.id, { onDelete: 'restrict' }).notNull(),
  portOfDischargeId: uuid('port_of_discharge_id').references(() => ports.id, { onDelete: 'restrict' }).notNull(),
  freightValue: decimal('freight_value', { precision: 10, scale: 2 }).notNull(),
  freightSellValue: decimal('freight_sell_value', { precision: 10, scale: 2 }),
  dolarQuotation: decimal('dolar_quotation', { precision: 10, scale: 4 }).notNull(),
  documentId: uuid('document_id').references(() => shipmentDocuments.id, { onDelete: 'set null' }),
  freightExpenses: jsonb('freight_expenses').$type<Record<string, unknown>[]>().default([]),
  pricingItems: jsonb('pricing_items').$type<Record<string, unknown>[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
