import {
  pgTable,
  uuid,
  text,
  integer,
  decimal,
  timestamp,
  jsonb,
  boolean,
} from 'drizzle-orm/pg-core';

import {
  shipmentStatusEnum,
  shippingModalityEnum,
  shipmentStepEnum,
  containerTypeEnum,
  expenseTypeEnum,
  currencyEnum,
  paymentStatusEnum,
  documentTypeEnum,
  duimpChannelEnum,
} from './enums';
import { organizations, profiles } from './auth';
import { quotes } from './quotes';

export const shipments = pgTable('shipments', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** Quote de origem (auditoria e comissões) */
  quoteId: uuid('quote_id').references(() => quotes.id),
  /** Organização administradora (Seller) — filtros "Meus Processos" */
  sellerOrganizationId: uuid('seller_organization_id').references(() => organizations.id).notNull(),
  /** Organização dona do pedido (Client) — billing/pagamentos */
  clientOrganizationId: uuid('client_organization_id').references(() => organizations.id).notNull(),
  code: integer('code').generatedAlwaysAsIdentity(), // ID legível sequencial (Postgres 10+)
  status: shipmentStatusEnum('status').default('PENDING').notNull(),

  // Logística
  bookingNumber: text('booking_number'),
  masterBl: text('master_bl'),
  carrierId: uuid('carrier_id'), // Relacionado abaixo
  shipmentType: shippingModalityEnum('shipment_type').default('SEA_FCL').notNull(),

  // Financeiro Macro
  totalProductsUsd: decimal('total_products_usd', { precision: 12, scale: 2 }).default('0'),
  totalCostsBrl: decimal('total_costs_brl', { precision: 12, scale: 2 }).default('0'),

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

  etd: timestamp('etd'),
  eta: timestamp('eta'),

  currentStep: shipmentStepEnum('current_step').default('CONTRACT_CREATION').notNull(),

  // =========================================================
  // INTEGRAÇÕES EXTERNAS (ZapSign & ShipsGo)
  // =========================================================

  // 1. ZapSign (Passo 1: Contrato)
  zapSignId: text('zap_sign_id').unique(),       // ID do documento na API (external_id)
  zapSignToken: text('zap_sign_token'),          // Token para assinar via Link/Embed
  zapSignStatus: text('zap_sign_status').default('created'), // created, signed, pending

  // 2. ShipsGo (Passo 3+: Rastreamento)
  shipsGoId: text('ships_go_id').unique(),       // ID do shipment na ShipsGo
  shipsGoTrackingUrl: text('ships_go_tracking_url'), // Link público do mapa
  shipsGoLastUpdate: timestamp('ships_go_last_update'), // Quando sincronizamos pela última vez?

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),

});

export const shipmentStepHistory = pgTable('shipment_step_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  shipmentId: uuid('shipment_id').references(() => shipments.id, { onDelete: 'cascade' }).notNull(),
  step: shipmentStepEnum('step').notNull(),

  status: text('status').$type<'PENDING' | 'COMPLETED' | 'FAILED'>().notNull(),

  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  completedById: uuid('completed_by_id').references(() => profiles.id), // Quem finalizou?

  // Metadados específicos da etapa (ex: ID da transação do câmbio)
  metadata: jsonb('metadata'),
});

export const shipmentContainers = pgTable('shipment_containers', {
  id: uuid('id').defaultRandom().primaryKey(),
  shipmentId: uuid('shipment_id').references(() => shipments.id, { onDelete: 'cascade' }).notNull(),
  containerNumber: text('container_number'), // ABCD1234567
  type: containerTypeEnum('type').notNull(),
});

export const shipmentExpenses = pgTable('shipment_expenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  shipmentId: uuid('shipment_id').references(() => shipments.id, { onDelete: 'cascade' }).notNull(),
  category: expenseTypeEnum('category').notNull(),
  description: text('description').notNull(),

  value: decimal('value', { precision: 10, scale: 2 }).notNull(),
  currency: currencyEnum('currency').default('BRL').notNull(),
  exchangeRate: decimal('exchange_rate', { precision: 10, scale: 4 }).default('1'),

  status: paymentStatusEnum('status').default('PENDING').notNull(),
});

export const shipmentDocuments = pgTable('shipment_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  shipmentId: uuid('shipment_id').references(() => shipments.id, { onDelete: 'cascade' }).notNull(),

  type: documentTypeEnum('type').notNull(),
  name: text('name').notNull(), // Nome amigável
  url: text('url').notNull(), // Supabase Storage URL
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),

  status: text('status').$type<'PENDING' | 'APPROVED' | 'REJECTED'>().default('PENDING'),
  rejectionReason: text('rejection_reason'),

  uploadedById: uuid('uploaded_by_id').references(() => profiles.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const shipmentChangeRequests = pgTable('shipment_change_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  shipmentId: uuid('shipment_id').references(() => shipments.id, { onDelete: 'cascade' }).notNull(),
  requestedById: uuid('requested_by_id').references(() => profiles.id).notNull(),

  status: text('status').$type<'PENDING' | 'APPROVED' | 'REJECTED'>().default('PENDING'),

  // O que mudou? (Snapshot Antes vs Depois)
  description: text('description').notNull(),
  changesJson: jsonb('changes_json'), // Ex: { oldQty: 100, newQty: 200 }

  adminResponse: text('admin_response'),
  processedAt: timestamp('processed_at'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});
