import { sql } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  decimal,
  timestamp,
  jsonb,
  boolean,
  check,
} from 'drizzle-orm/pg-core';

import { quoteTypeEnum, quoteStatusEnum, incotermEnum, shippingModalityEnum } from './enums';
import { organizations, profiles } from './auth';
import { productVariants } from './products';
import { ProductSnapshot } from '../types';

// ==========================================
// 4. COMMERCIAL (QUOTES & SHIPMENTS)
// ==========================================

export const quotes = pgTable('quotes', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** A organização que criou (SELLER) */
  sellerOrganizationId: uuid('seller_organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  /** A organização que vai receber (CLIENT) — nullable enquanto rascunho ou envio por email */
  clientOrganizationId: uuid('client_organization_id').references(() => organizations.id),
  /** Quem dentro do Seller criou a cotação */
  createdById: uuid('created_by_id').references(() => profiles.id).notNull(),
  /** Ponte para cliente não cadastrado: token público; preenche clientOrganizationId quando cliente criar conta */
  publicToken: text('public_token').unique(),
  /** Email do cliente quando ainda não cadastrado */
  clientEmail: text('client_email'),
  /** Telefone do cliente quando enviado por WhatsApp */
  clientPhone: text('client_phone'),

  type: quoteTypeEnum('type').default('STANDARD').notNull(),
  status: quoteStatusEnum('status').default('DRAFT').notNull(),
  name: text('name').notNull(),

  // Configs da Simulação
  targetDolar: decimal('target_dolar', { precision: 10, scale: 4 }).notNull(),
  incoterm: incotermEnum('incoterm').default('FOB').notNull(),
  portOriginId: uuid('port_origin_id'), // Relacionado futuramente
  portDestId: uuid('port_dest_id'),     // Relacionado futuramente

  generatedShipmentId: uuid('generated_shipment_id'), // Preenchido se virar shipment

  metadata: jsonb('metadata'),

  simulatedProduct: jsonb('simulated_product').$type<ProductSnapshot>(),

  // Landed Cost: shipping & totals
  shippingModality: shippingModalityEnum('shipping_modality'),
  exchangeRateIof: decimal('exchange_rate_iof', { precision: 10, scale: 4 }),
  totalCbm: decimal('total_cbm', { precision: 12, scale: 6 }),
  totalWeight: decimal('total_weight', { precision: 12, scale: 3 }),
  totalChargeableWeight: decimal('total_chargeable_weight', { precision: 12, scale: 3 }).default('0').notNull(),

  /** Flag: set when PTAX fetch or recalc fails; UI shows banner to recalculate */
  isRecalculationNeeded: boolean('is_recalculation_needed').default(false).notNull(),

  // ZapSign — assinatura digital do contrato
  zapSignDocToken: text('zap_sign_doc_token'),       // Token do documento na ZapSign
  zapSignSignerToken: text('zap_sign_signer_token'), // Token do signatário (para construir URL de assinatura)

  /** Motivo da rejeição pelo cliente */
  rejectionReason: text('rejection_reason'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const quoteItems = pgTable(
  'quote_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    quoteId: uuid('quote_id').references(() => quotes.id, { onDelete: 'cascade' }).notNull(),
    variantId: uuid('variant_id').references(() => productVariants.id), // Nullable: item do catálogo OU simulado
    simulatedProductSnapshot: jsonb('simulated_product_snapshot').$type<ProductSnapshot>(), // Preenchido quando item é simulado (não cadastrado)
    quantity: integer('quantity').notNull(),
    priceUsd: decimal('price_usd', { precision: 10, scale: 2 }).notNull(), // Snapshot do preço

    // Landed Cost snapshots (audit & freight calc)
    weightSnapshot: decimal('weight_snapshot', { precision: 12, scale: 3 }).default('0').notNull(),
    cbmSnapshot: decimal('cbm_snapshot', { precision: 12, scale: 6 }).default('0').notNull(),
    unitPriceUsdSnapshot: decimal('unit_price_usd_snapshot', { precision: 10, scale: 4 }).default('0').notNull(),
    iiRateSnapshot: decimal('ii_rate_snapshot', { precision: 5, scale: 2 }).default('0').notNull(),
    ipiRateSnapshot: decimal('ipi_rate_snapshot', { precision: 5, scale: 2 }).default('0').notNull(),
    pisRateSnapshot: decimal('pis_rate_snapshot', { precision: 5, scale: 2 }).default('0').notNull(),
    cofinsRateSnapshot: decimal('cofins_rate_snapshot', { precision: 5, scale: 2 }).default('0').notNull(),
    iiValueSnapshot: decimal('ii_value_snapshot', { precision: 12, scale: 4 }).default('0').notNull(),
    ipiValueSnapshot: decimal('ipi_value_snapshot', { precision: 12, scale: 4 }).default('0').notNull(),
    pisValueSnapshot: decimal('pis_value_snapshot', { precision: 12, scale: 4 }).default('0').notNull(),
    cofinsValueSnapshot: decimal('cofins_value_snapshot', { precision: 12, scale: 4 }).default('0').notNull(),
    siscomexValueSnapshot: decimal('siscomex_value_snapshot', { precision: 12, scale: 4 }).default('0').notNull(),
    afrmmValueSnapshot: decimal('afrmm_value_snapshot', { precision: 12, scale: 4 }).default('0').notNull(),
    icmsRateSnapshot: decimal('icms_rate_snapshot', { precision: 5, scale: 2 }).default('0').notNull(),
    icmsValueSnapshot: decimal('icms_value_snapshot', { precision: 12, scale: 4 }).default('0').notNull(),
    landedCostTotalSnapshot: decimal('landed_cost_total_snapshot', { precision: 12, scale: 4 }).default('0').notNull(),
    landedCostUnitSnapshot: decimal('landed_cost_unit_snapshot', { precision: 12, scale: 4 }).default('0').notNull(),
  },
  (t) => [
    check(
      'quote_items_variant_or_simulated',
      sql`(${t.variantId} IS NOT NULL) OR (${t.simulatedProductSnapshot} IS NOT NULL)`
    ),
  ]
);

export const quoteObservations = pgTable('quote_observations', {
  id: uuid('id').defaultRandom().primaryKey(),
  quoteId: uuid('quote_id').references(() => quotes.id, { onDelete: 'cascade' }).notNull(),
  description: text('description').notNull(),
  documents: jsonb('documents').$type<{ name: string; url: string }[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
