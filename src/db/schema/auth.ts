import {
  pgTable,
  uuid,
  text,
  decimal,
  timestamp,
  primaryKey,
} from 'drizzle-orm/pg-core';

import { systemRoleEnum, organizationRoleEnum, orderTypeEnum } from './enums';

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

  // Payment Gateway
  asaasCustomerId: text('asaas_customer_id'),

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
