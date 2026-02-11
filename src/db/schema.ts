import { relations } from 'drizzle-orm';
import {
  pgTable,
  uuid,
  text,
  integer,
  decimal,
  timestamp,
  pgEnum,
  primaryKey,
  jsonb,
  boolean
} from 'drizzle-orm/pg-core';

export type ProductSnapshot = {
  // Identificação
  sku?: string;          // Opcional na simulação
  name: string;
  nameEnglish?: string;  // Importante para Siscomex
  description?: string;
  photos?: string[];

  // Logística (Crucial para cálculo de frete)
  boxQuantity: number;   // Qtd por caixa master
  boxWeight: number;     // Peso da caixa master (kg)
  netWeight?: number;    // Peso líquido unitário
  
  // Dimensões (Opcional, mas bom ter)
  height?: number;
  width?: number;
  length?: number;

  // Fiscal & Origem (A GRANDE DIFERENÇA)
  // No banco real é 'hsCodeId' (UUID). Aqui guardamos o CÓDIGO e os IMPOSTOS do momento.
  hsCode: string;        // Ex: "8504.40.10"
  taxSnapshot?: {        // Opcional: Congelar os impostos usados na simulação
    ii: number;
    ipi: number;
    pis: number;
    cofins: number;
  };

  supplierName?: string; // Em vez de supplierId
};

// ==========================================
// 1. ENUMS (Postgres Types)
// ==========================================
export const systemRoleEnum = pgEnum('system_role', ['USER', 'SUPER_ADMIN', 'SUPER_ADMIN_EMPLOYEE']);
export const organizationRoleEnum = pgEnum('organization_role', [
  'OWNER',           // O dono da conta/empresa (Cliente principal)
  'ADMIN',           // Administrador da empresa (Gerente, Supervisor, etc.)
  'EMPLOYEE',  // Funcionário que trabalha para o Administrador
  'SELLER',          // Vendedor/Fornecedor (Possui o "Marketplace")
  'CUSTOMS_BROKER',  // Despachante Aduaneiro (Acesso logístico/fiscal)
  'VIEWER'           // Acesso apenas leitura
]);
export const orderTypeEnum = pgEnum('order_type', ['ORDER', 'DIRECT_ORDER']);
export const quoteTypeEnum = pgEnum('quote_type', [
  'STANDARD',   // O antigo "Carrinho" que vira Pedido
  'PROFORMA',   // Criado pelo Admin como modelo/sugestão
  'SIMULATION'  // Rascunho mão-livre (itens não cadastrados)
]);
export const quoteStatusEnum = pgEnum('quote_status', ['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'CONVERTED']);
export const shipmentStatusEnum = pgEnum('shipment_status', ['PENDING', 'PRODUCTION', 'BOOKED', 'IN_TRANSIT', 'CUSTOMS_CLEARANCE', 'RELEASED', 'DELIVERED', 'CANCELED']);
export const containerTypeEnum = pgEnum('container_type', ['GP_20', 'GP_40', 'HC_40', 'RF_20', 'RF_40']);
export const shipmentStepEnum = pgEnum('shipment_step', [
  'CONTRACT_CREATION',
  'MERCHANDISE_PAYMENT',
  'DOCUMENT_PREPARATION',
  'SHIPPING',
  'DELIVERY',
  'COMPLETION'
]);
export const shipmentTypeEnum = pgEnum('shipment_type', ['FCL', 'FCL_PARTIAL', 'LCL']);
export const expenseTypeEnum = pgEnum('expense_type', ['TAX_II', 'TAX_IPI', 'TAX_PIS', 'TAX_COFINS', 'TAX_ICMS', 'FREIGHT_INTL', 'FREIGHT_LOCAL', 'STORAGE', 'HANDLING', 'CUSTOMS_BROKER', 'OTHER']);
export const currencyEnum = pgEnum('currency', ['BRL', 'USD', 'CNY', 'EUR']);
export const paymentStatusEnum = pgEnum('payment_status', ['PENDING', 'PAID', 'OVERDUE', 'WAITING_EXCHANGE', 'EXCHANGED']);
export const incotermEnum = pgEnum('incoterm', ['EXW', 'FOB', 'CIF', 'DDP']);
export const transactionTypeEnum = pgEnum('transaction_type', [
  'MERCHANDISE', // Pagamento de mercadoria
  'BALANCE',      // Pagamento de saldo
  'FREIGHT',      // Pagamento de frete
  'TAXES',        // Pagamento de impostos
  'SERVICE_FEE'   // Honorários do sistema
]);
export const documentTypeEnum = pgEnum('document_type', [
  'COMMERCIAL_INVOICE',
  'PACKING_LIST',
  'BILL_OF_LADING', // MBL/HBL
  'IMPORT_DECLARATION', // DI/DUIMP
  'ORIGIN_CERTIFICATE',
  'SISCOMEX_RECEIPT',
  'ICMS_PROOF',
  'OTHER'
]);

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
  documentPhotoUrl: text('document_photo_url'),
  addressProofUrl: text('address_proof_url'),
  systemRole: systemRoleEnum('system_role').notNull().default('USER'),
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

  // Onboarding Documents
  socialContractUrl: text('social_contract_url'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const memberships = pgTable('memberships', {
  id: uuid('id').defaultRandom(),
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

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).notNull(),
  sku: text('internal_code').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  photos: text('photos').array(),

  // Dados Logísticos Base
  boxQuantity: integer('box_quantity').notNull(),
  boxWeight: decimal('box_weight', { precision: 10, scale: 3 }).notNull(),

  // Foreign Keys
  hsCodeId: uuid('hs_code_id').references(() => hsCodes.id),
  supplierId: uuid('supplier_id').references(() => suppliers.id),

  siscomexId: text('siscomex_id').unique(),

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
  shipmentType: shipmentTypeEnum('shipment_type').default('FCL').notNull(),

  // Financeiro Macro
  totalProductsUsd: decimal('total_products_usd', { precision: 12, scale: 2 }).default('0'),
  totalCostsBrl: decimal('total_costs_brl', { precision: 12, scale: 2 }).default('0'),

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

// ==========================================
// 7. FINANCIAL & EXCHANGE (O "Gap" do Legado Payment/ExchangeContract)
// ==========================================

// Tabela unificada de Transações (Substitui 'Payment')
export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id).notNull(),
  shipmentId: uuid('shipment_id').references(() => shipments.id, { onDelete: 'cascade' }),
  
  type: transactionTypeEnum('type').notNull(),
  status: paymentStatusEnum('status').default('PENDING').notNull(),
  
  // Valores
  amountBrl: decimal('amount_brl', { precision: 12, scale: 2 }), // Quanto saiu da conta em Reais
  amountUsd: decimal('amount_usd', { precision: 12, scale: 2 }), // Quanto chegou lá fora (se aplicável)
  exchangeRate: decimal('exchange_rate', { precision: 10, scale: 4 }), // Taxa usada
  
  // Integração Bancária (Asaas / Ebanx)
  gatewayId: text('gateway_id'), // asaasPaymentId do legado
  gatewayUrl: text('gateway_url'), // Link do boleto/pix
  
  proofUrl: text('proof_url'), // Comprovante de transferência (Upload)
  
  paidAt: timestamp('paid_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tabela de Contratos de Câmbio (Crucial para Siscomex)
export const exchangeContracts = pgTable('exchange_contracts', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionId: uuid('transaction_id').references(() => transactions.id, { onDelete: 'cascade' }).notNull(),
  
  contractNumber: text('contract_number').notNull(), // Número oficial do Banco Central
  brokerName: text('broker_name'), // Corretora (ex: Abrão, Travelex)
  
  closedAt: timestamp('closed_at').notNull(), // Data do fechamento
  vetDate: timestamp('vet_date'), // Valor Efetivo Total data
  
  amountUsd: decimal('amount_usd', { precision: 12, scale: 2 }).notNull(), // Quanto fechou neste contrato específico
  exchangeRate: decimal('exchange_rate', { precision: 10, scale: 4 }).notNull(),
  effectiveRate: decimal('effective_rate', { precision: 10, scale: 4 }), // VET
  
  swiftFileUrl: text('swift_file_url'), // Comprovante SWIFT (Obrigatório para o fornecedor China)
  contractFileUrl: text('contract_file_url'), // Comprovante do contrato

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
// 8. DOCUMENT MANAGEMENT (GED)
// ==========================================

export const shipmentDocuments = pgTable('shipment_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  shipmentId: uuid('shipment_id').references(() => shipments.id, { onDelete: 'cascade' }).notNull(),
  
  type: documentTypeEnum('type').notNull(),
  name: text('name').notNull(), // Nome amigável
  url: text('url').notNull(), // Supabase Storage URL
  
  status: text('status').$type<'PENDING' | 'APPROVED' | 'REJECTED'>().default('PENDING'),
  rejectionReason: text('rejection_reason'),
  
  uploadedById: uuid('uploaded_by_id').references(() => profiles.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// 9. SERVICE FEES & CONFIG (Substitui HonorarioConfig)
// ==========================================

export const serviceFeeConfigs = pgTable('service_fee_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }).unique().notNull(),
  
  // Regras de Cobrança
  percentage: decimal('percentage', { precision: 5, scale: 2 }).default('2.5'), // 2.5% padrão
  minimumValue: decimal('minimum_value', { precision: 10, scale: 2 }).default('3060.00'), // R$ 3060 padrão
  
  currency: currencyEnum('currency').default('BRL'),
  
  // Flags de lógica
  applyToChinaProducts: boolean('apply_to_china').default(true),
  
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==========================================
// 10. GOVERNANCE & LOGS (Substitui OrderChangeRequest)
// ==========================================

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

// Notificações In-App (Sino no topo)
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id),
  
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').$type<'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'>().default('INFO'),
  
  read: boolean('read').default(false),
  actionUrl: text('action_url'), // Link para clicar (ex: /shipments/123)
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// 11. SYSTEM LOGS & WEBHOOKS
// ==========================================

export const integrationLogs = pgTable('integration_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  shipmentId: uuid('shipment_id').references(() => shipments.id, { onDelete: 'cascade' }),
  
  provider: text('provider').$type<'ZAPSIGN' | 'SHIPSGO' | 'ASAAS' | 'SISCOMEX'>().notNull(),
  endpoint: text('endpoint').notNull(), // Qual rota foi chamada
  method: text('method').notNull(), // POST, GET, WEBHOOK
  
  requestPayload: jsonb('request_payload'),
  responsePayload: jsonb('response_payload'),
  statusCode: integer('status_code'),
  
  isError: boolean('is_error').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==========================================
// 12. RELATIONS (Application Level) - COMPLETO
// ==========================================

export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  members: many(memberships),
  products: many(products),
  shipments: many(shipments),
  quotes: many(quotes),
  suppliers: many(suppliers),
  feeConfig: one(serviceFeeConfigs, {
    fields: [organizations.id],
    references: [serviceFeeConfigs.organizationId]
  }),
  billingAddress: one(addresses, { fields: [organizations.billingAddressId], references: [addresses.id] }),
  deliveryAddress: one(addresses, { fields: [organizations.deliveryAddressId], references: [addresses.id] }),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  organization: one(organizations, { fields: [memberships.organizationId], references: [organizations.id] }),
  profile: one(profiles, { fields: [memberships.profileId], references: [profiles.id] }),
}));

export const profilesRelations = relations(profiles, ({ many }) => ({
  memberships: many(memberships),
  uploadedDocuments: many(shipmentDocuments),
  changeRequests: many(shipmentChangeRequests),
  notifications: many(notifications),
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
  
  // Logística e Financeiro
  containers: many(shipmentContainers),
  expenses: many(shipmentExpenses),
  transactions: many(transactions),
  documents: many(shipmentDocuments),
  
  // Auditoria e Histórico
  stepHistory: many(shipmentStepHistory),
  changeRequests: many(shipmentChangeRequests),
  
  // Relação 1:1 inversa com Quote
  quote: one(quotes, { fields: [shipments.id], references: [quotes.generatedShipmentId] }), 

  // Integrações Externas
  integrationLogs: many(integrationLogs),
}));

export const integrationLogsRelations = relations(integrationLogs, ({ one }) => ({
  shipment: one(shipments, { fields: [integrationLogs.shipmentId], references: [shipments.id] }),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  organization: one(organizations, { fields: [quotes.organizationId], references: [organizations.id] }),
  items: many(quoteItems),
  generatedShipment: one(shipments, { fields: [quotes.generatedShipmentId], references: [shipments.id] }),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  shipment: one(shipments, { fields: [transactions.shipmentId], references: [shipments.id] }),  
  exchangeContracts: many(exchangeContracts), 
}));

export const exchangeContractsRelations = relations(exchangeContracts, ({ one }) => ({
  transaction: one(transactions, { 
    fields: [exchangeContracts.transactionId], 
    references: [transactions.id] 
  }),
}));

export const shipmentDocumentsRelations = relations(shipmentDocuments, ({ one }) => ({
  shipment: one(shipments, { fields: [shipmentDocuments.shipmentId], references: [shipments.id] }),
  uploadedBy: one(profiles, { fields: [shipmentDocuments.uploadedById], references: [profiles.id] }),
}));

export const shipmentChangeRequestsRelations = relations(shipmentChangeRequests, ({ one }) => ({
  shipment: one(shipments, { fields: [shipmentChangeRequests.shipmentId], references: [shipments.id] }),
  requestedBy: one(profiles, { fields: [shipmentChangeRequests.requestedById], references: [profiles.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  profile: one(profiles, { fields: [notifications.profileId], references: [profiles.id] }),
}));


