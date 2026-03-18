import {
  pgTable,
  uuid,
  text,
  decimal,
  timestamp,
} from 'drizzle-orm/pg-core';

import { transactionTypeEnum, paymentStatusEnum } from './enums';
import { organizations } from './auth';
import { shipments } from './shipments';
import { currencyExchangeBrokers } from './admin-config';
import { suppliers } from './products';

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
  /** Taxa usada — OBRIGATÓRIO preencher no momento do pagamento (dólar travado para fins fiscais) */
  exchangeRate: decimal('exchange_rate', { precision: 10, scale: 4 }),

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
  brokerId: uuid('broker_id').references(() => currencyExchangeBrokers.id),
  supplierId: uuid('supplier_id').references(() => suppliers.id),
  contractNumber: text('contract_number').notNull(), // Número oficial do Banco Central
  brokerName: text('broker_name'), // Legado: Corretora (ex: Abrão, Travelex)

  closedAt: timestamp('closed_at').notNull(), // Data do fechamento
  vetDate: timestamp('vet_date'), // Valor Efetivo Total data

  amountUsd: decimal('amount_usd', { precision: 12, scale: 2 }).notNull(), // Quanto fechou neste contrato específico
  exchangeRate: decimal('exchange_rate', { precision: 10, scale: 4 }).notNull(),
  effectiveRate: decimal('effective_rate', { precision: 10, scale: 4 }), // VET

  swiftFileUrl: text('swift_file_url'), // Comprovante SWIFT (Obrigatório para o fornecedor China)
  contractFileUrl: text('contract_file_url'), // Comprovante do contrato

});
