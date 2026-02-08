import { relations } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  decimal,
  timestamp,
  pgEnum,
  primaryKey
} from 'drizzle-orm/pg-core';

// ==========================================
// 1. ENUMS (Postgres Types)
// ==========================================
export const organizationRoleEnum = pgEnum('organization_role', ['OWNER', 'ADMIN', 'OPERATOR', 'VIEWER']);
export const orderTypeEnum = pgEnum('order_type', ['ORDER', 'DIRECT_ORDER']);
export const quoteStatusEnum = pgEnum('quote_status', ['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'CONVERTED']);
export const shipmentStatusEnum = pgEnum('shipment_status', ['PENDING', 'PRODUCTION', 'BOOKED', 'IN_TRANSIT', 'CUSTOMS_CLEARANCE', 'RELEASED', 'DELIVERED', 'CANCELED']);
export const containerTypeEnum = pgEnum('container_type', ['GP_20', 'GP_40', 'HC_40', 'RF_20', 'RF_40']);
export const shipmentTypeEnum = pgEnum('shipment_type', ['FCL', 'FCL_PARTIAL', 'LCL']);
export const expenseTypeEnum = pgEnum('expense_type', ['TAX_II', 'TAX_IPI', 'TAX_PIS', 'TAX_COFINS', 'TAX_ICMS', 'FREIGHT_INTL', 'FREIGHT_LOCAL', 'STORAGE', 'HANDLING', 'CUSTOMS_BROKER', 'OTHER']);
export const currencyEnum = pgEnum('currency', ['BRL', 'USD', 'CNY', 'EUR']);
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'PAID', 'OVERDUE', 'WAITING_EXCHANGE', 'EXCHANGED']);
export const incotermEnum = pgEnum('incoterm', ['EXW', 'FOB', 'CIF', 'DDP']);

// ==========================================
// 2. AUTH & ORGANIZATION
// ==========================================

// Perfil do Usuário (Ligado ao Supabase Auth.users)
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // ID vindo do auth.users
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  phone: text('phone'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  tradeName: text('trade_name'),
  document: text('document').notNull().unique(), // CNPJ
  email: text('email'),
  phone: text('phone'),
  taxRegime: text('tax_regime'),
  stateRegistry: text('state_registry'),

  // Configs
  orderType: orderTypeEnum('order_type').default('ORDER').notNull(),
  minOrderValue: decimal('min_order_value', { precision: 10, scale: 2 }).default('0'),

  // Foreign Keys (Endereços)
  billingAddressId: uuid('billing_address_id'),
  deliveryAddressId: uuid('delivery_address_id'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const memberships = pgTable('memberships', {
  id: uuid('id').defaultRandom().primaryKey(),
  role: organizationRoleEnum('role').notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  primaryKey({ columns: [t.organizationId, t.profileId] }), // Um usuário só pode ter um cargo por empresa
]);

export const addresses = pgTable('addresses', {
  id: uuid('id').defaultRandom().primaryKey(),
  street: text('street').notNull(),
  number: text('number').notNull(),
  complement: text('complement'),
  neighborhood: text('neighborhood').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  postalCode: text('postal_code').notNull(),
  country: text('country').default('Brazil').notNull(),
});

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
});

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  sku: text('internal_code').notNull(),
  name: text('name').notNull(),
  nameEnglish: text('name_english').notNull(),
  description: text('description'),
  photos: text('photos').array(),

  // Dados Logísticos Base
  boxQuantity: integer('box_quantity').notNull(),
  boxWeight: decimal('box_weight', { precision: 10, scale: 3 }).notNull(),

  // Foreign Keys
  hsCodeId: uuid('hs_code_id').references(() => hsCodes.id),
  supplierId: uuid('supplier_id').references(() => suppliers.id),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const productVariants = pgTable('product_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(), // Ex: "Azul - G"
  priceUsd: decimal('price_usd', { precision: 10, scale: 2 }).notNull(),

  // Dimensões específicas
  height: decimal('height', { precision: 10, scale: 2 }),
  width: decimal('width', { precision: 10, scale: 2 }),
  length: decimal('length', { precision: 10, scale: 2 }),
  netWeight: decimal('net_weight', { precision: 10, scale: 3 }),
});

// ==========================================
// 4. COMMERCIAL (QUOTES & SHIPMENTS)
// ==========================================

export const quotes = pgTable('quotes', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  status: quoteStatusEnum('status').default('DRAFT').notNull(),
  name: text('name').notNull(),

  // Configs da Simulação
  targetDolar: decimal('target_dolar', { precision: 10, scale: 4 }).notNull(),
  incoterm: incotermEnum('incoterm').default('FOB').notNull(),
  portOriginId: uuid('port_origin_id'), // Relacionado futuramente
  portDestId: uuid('port_dest_id'),     // Relacionado futuramente

  generatedShipmentId: uuid('generated_shipment_id'), // Preenchido se virar shipment

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const quoteItems = pgTable('quote_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  quoteId: uuid('quote_id').references(() => quotes.id, { onDelete: 'cascade' }).notNull(),
  variantId: uuid('variant_id').references(() => productVariants.id).notNull(),
  quantity: integer('quantity').notNull(),
  priceUsd: decimal('price_usd', { precision: 10, scale: 2 }).notNull(), // Snapshot do preço
});

export const shipments = pgTable('shipments', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  code: integer('code').generatedAlwaysAsIdentity(), // ID legível sequencial (Postgres 10+)
  status: shipmentStatusEnum('status').default('PENDING').notNull(),

  // Logística
  bookingNumber: text('booking_number'),
  masterBl: text('master_bl'),
  carrierId: uuid('carrier_id'), // Relacionado abaixo

  // Financeiro Macro
  totalProductsUsd: decimal('total_products_usd', { precision: 12, scale: 2 }).default('0'),
  totalCostsBrl: decimal('total_costs_brl', { precision: 12, scale: 2 }).default('0'),

  etd: timestamp('etd'),
  eta: timestamp('eta'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const shipmentContainers = pgTable('shipment_containers', {
  id: uuid('id').defaultRandom().primaryKey(),
  shipmentId: uuid('shipment_id').references(() => shipments.id, { onDelete: 'cascade' }).notNull(),
  containerNumber: text('container_number'), // ABCD1234567
  type: containerTypeEnum('type').notNull(),
});

// ==========================================
// 5. LOGISTICS & COSTS ENGINE
// ==========================================

export const carriers = pgTable('carriers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  scacCode: text('scac_code').unique(),
});

export const ports = pgTable('ports', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  code: text('code').unique().notNull(), // UN/LOCODE
  country: text('country').notNull(),
});

export const terminals = pgTable('terminals', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  code: text('code'), // Código Siscomex
});

export const storageRules = pgTable('storage_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  terminalId: uuid('terminal_id').references(() => terminals.id, { onDelete: 'cascade' }).notNull(),
  type: containerTypeEnum('type').notNull(),
  currency: currencyEnum('currency').default('BRL').notNull(),

  minValue: decimal('min_value', { precision: 10, scale: 2 }).default('0'),
  freeDays: integer('free_days').default(0),
});

export const storagePeriods = pgTable('storage_periods', {
  id: uuid('id').defaultRandom().primaryKey(),
  ruleId: uuid('rule_id').references(() => storageRules.id, { onDelete: 'cascade' }).notNull(),
  daysFrom: integer('days_from').notNull(),
  daysTo: integer('days_to'), // Nullable para "até infinito"
  dailyRate: decimal('daily_rate', { precision: 10, scale: 2 }).notNull(),
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

// ==========================================
// 6. RELATIONS (Application Level)
// ==========================================

export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  members: many(memberships),
  products: many(products),
  shipments: many(shipments),
  billingAddress: one(addresses, { fields: [organizations.billingAddressId], references: [addresses.id] }),
  deliveryAddress: one(addresses, { fields: [organizations.deliveryAddressId], references: [addresses.id] }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  organization: one(organizations, { fields: [products.organizationId], references: [organizations.id] }),
  hsCode: one(hsCodes, { fields: [products.hsCodeId], references: [hsCodes.id] }),
  supplier: one(suppliers, { fields: [products.supplierId], references: [suppliers.id] }),
  variants: many(productVariants),
}));

export const shipmentsRelations = relations(shipments, ({ one, many }) => ({
  organization: one(organizations, { fields: [shipments.organizationId], references: [organizations.id] }),
  carrier: one(carriers, { fields: [shipments.carrierId], references: [carriers.id] }),
  containers: many(shipmentContainers),
  expenses: many(shipmentExpenses),
  quote: one(quotes, { fields: [shipments.id], references: [quotes.generatedShipmentId] }), // Relação 1:1 inversa
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  items: many(quoteItems),
  generatedShipment: one(shipments, { fields: [quotes.generatedShipmentId], references: [shipments.id] }),
}));