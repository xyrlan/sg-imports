import {
  pgTable,
  uuid,
  text,
  integer,
  decimal,
  timestamp,
  primaryKey,
  jsonb,
  boolean,
} from 'drizzle-orm/pg-core';

import {
  portTypeEnum,
  shippingModalityEnum,
  containerTypeEnum,
  currencyEnum,
  chargeTypeEnum,
  difalEnum,
  rateTypeEnum,
  rateUnitEnum,
} from './enums';
import { quotes } from './quotes';
import { StorageRuleAdditionalFee } from '../types';

// ==========================================
// 5. LOGISTICS & COSTS ENGINE
// ==========================================

export const carriers = pgTable('carriers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  scacCode: text('scac_code').unique(),
  status: text('status').$type<'ACTIVE' | 'PASSIVE'>(),
});

/** Corretoras de câmbio (ex: Abrão, Travelex). Relacionado a exchange_contracts. */
export const currencyExchangeBrokers = pgTable('currency_exchange_brokers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
});

export const ports = pgTable('ports', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  code: text('code').unique().notNull(), // UN/LOCODE
  country: text('country').notNull(),
  type: portTypeEnum('type').default('PORT').notNull(),
});

export const terminals = pgTable('terminals', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  code: text('code'), // Código Siscomex
});


export const storageRules = pgTable('storage_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  terminalId: uuid('terminal_id').references(() => terminals.id, { onDelete: 'cascade' }).notNull(),
  shipmentType: shippingModalityEnum('shipment_type').default('SEA_FCL').notNull(),
  containerType: containerTypeEnum('container_type'),
  currency: currencyEnum('currency').default('BRL').notNull(),
  minValue: decimal('min_value', { precision: 10, scale: 2 }).default('0'),
  freeDays: integer('free_days').default(0),
  cifInsurance: decimal('cif_insurance', { precision: 10, scale: 6 }).default('0'),
  /** Array of additional fees (name, value, basis) for manual entry */
  additionalFees: jsonb('additional_fees').$type<StorageRuleAdditionalFee[]>().default([]),
});

export const storagePeriods = pgTable('storage_periods', {
  id: uuid('id').defaultRandom().primaryKey(),
  ruleId: uuid('rule_id').references(() => storageRules.id, { onDelete: 'cascade' }).notNull(),
  daysFrom: integer('days_from').notNull(),
  daysTo: integer('days_to'), // Nullable para "até infinito"
  chargeType: chargeTypeEnum('charge_type').default('PERCENTAGE').notNull(),
  rate: decimal('rate', { precision: 12, scale: 6 }).notNull(),
  isDailyRate: boolean('is_daily_rate').default(true),
});

// ==========================================
// 5b. PLATFORM CONFIG (Admin-managed global tables)
// ==========================================

/** ICMS rates per state + DIFAL (INSIDE = internal, OUTSIDE = interstate) */
export const stateIcmsRates = pgTable(
  'state_icms_rates',
  {
    state: text('state').notNull(),
    difal: difalEnum('difal').notNull(),
    icmsRate: decimal('icms_rate', { precision: 5, scale: 2 }).notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.state, t.difal] })],
);

/** Siscomex fee config — Valor de Registro + additions by range */
export const siscomexFeeConfig = pgTable('siscomex_fee_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  registrationValue: decimal('registration_value', { precision: 12, scale: 2 }).notNull().default('0'),
  additions: jsonb('additions').$type<string[]>().default([]),
  additions11To20: decimal('additions_11_to_20', { precision: 12, scale: 2 }).notNull().default('0'),
  additions21To50: decimal('additions_21_to_50', { precision: 12, scale: 2 }).notNull().default('0'),
  additions51AndAbove: decimal('additions_51_and_above', { precision: 12, scale: 2 }).notNull().default('0'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/** Global platform rates: AFRMM, insurance, customs broker, etc. */
export const globalPlatformRates = pgTable('global_platform_rates', {
  id: uuid('id').defaultRandom().primaryKey(),
  rateType: rateTypeEnum('rate_type').notNull().unique(),
  value: decimal('value', { precision: 12, scale: 4 }).notNull().default('0'),
  unit: rateUnitEnum('unit').notNull().default('PERCENT'),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==========================================
// 9. SERVICE FEES & CONFIG (Substitui HonorarioConfig)
// ==========================================

/** Global config (singleton). Admin sets default for all organizations. */
export const globalServiceFeeConfig = pgTable('global_service_fee_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  /** Brazilian minimum wage (BRL) - updated annually by Admin */
  minimumWageBrl: decimal('minimum_wage_brl', { precision: 10, scale: 2 }).notNull().default('1530.00'),
  /** Default multiplier: 2x, 3x, 4x salary */
  defaultMultiplier: integer('default_multiplier').notNull().default(2),
  /** Default percentage (e.g. 2.5) */
  defaultPercentage: decimal('default_percentage', { precision: 5, scale: 2 }).default('2.5'),
  /** Default: apply fee to China products */
  defaultApplyToChina: boolean('default_apply_to_china').default(true),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/** Quote-specific service fee config. Created with global defaults when quote is created. */
export const serviceFeeConfigs = pgTable('service_fee_configs', {
  id: uuid('id').defaultRandom().primaryKey(),
  quoteId: uuid('quote_id').references(() => quotes.id, { onDelete: 'cascade' }).unique().notNull(),

  /** Multiplier: 2x, 3x or 4x of minimum wage. Minimum value = global.minimumWageBrl × multiplier */
  minimumValueMultiplier: integer('minimum_value_multiplier').notNull().default(2),

  /** Fee percentage (e.g. 2.5%) */
  percentage: decimal('percentage', { precision: 5, scale: 2 }).default('2.5'),

  /** Apply fee to China-origin products */
  applyToChinaProducts: boolean('apply_to_china').default(true),

  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
