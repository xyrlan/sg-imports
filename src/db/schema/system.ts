import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  boolean,
  unique,
  index,
} from 'drizzle-orm/pg-core';

import { shipments } from './shipments';
import { profiles } from './auth';
import { webhookStatusEnum, auditActionEnum } from './enums';

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

/** Webhook events queue — inbound events from Asaas, ZapSign, ShipsGo with retry support */
export const webhookEvents = pgTable(
  'webhook_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    provider: text('provider').$type<'ZAPSIGN' | 'SHIPSGO' | 'ASAAS' | 'SISCOMEX'>().notNull(),
    eventType: text('event_type').notNull(),
    externalId: text('external_id').notNull(),
    payload: jsonb('payload').notNull(),
    status: webhookStatusEnum('status').default('PENDING').notNull(),
    attempts: integer('attempts').default(0).notNull(),
    lastError: text('last_error'),
    processedAt: timestamp('processed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    unique('webhook_events_provider_external_id_event_type_key').on(t.provider, t.externalId, t.eventType),
    index('webhook_events_status_created_at_idx').on(t.status, t.createdAt),
  ]
);

/** Admin audit log — tracks CREATE/UPDATE/DELETE on admin-managed tables */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tableName: text('table_name').notNull(),
    entityId: text('entity_id').notNull(),
    action: auditActionEnum('action').notNull(),
    actorId: uuid('actor_id').references(() => profiles.id),
    actorEmail: text('actor_email'),
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),
    changedKeys: text('changed_keys').array(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
  },
  (t) => [
    index('audit_logs_table_created_idx').on(t.tableName, t.createdAt),
    index('audit_logs_actor_created_idx').on(t.actorId, t.createdAt),
    index('audit_logs_entity_table_idx').on(t.entityId, t.tableName),
  ]
);
