import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';

import { profiles, organizations } from './auth';

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
