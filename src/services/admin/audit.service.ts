/**
 * Admin Audit Service — records CREATE/UPDATE/DELETE on admin-managed tables
 */

import { headers } from 'next/headers';
import { db } from '@/db';
import { auditLogs } from '@/db/schema';
import { getSuperAdminUser } from '@/services/auth.service';
import type { User } from '@supabase/supabase-js';
import type { InferSelectModel } from 'drizzle-orm';
import { profiles } from '@/db/schema';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';

type Profile = InferSelectModel<typeof profiles>;

export type AuditLogEntry = InferSelectModel<typeof auditLogs>;

// Tipo exportado para uso em services e actions
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Serializa valor para comparação estável. Date do DB vs string do form devem dar igual. */
function serializeForCompare(val: unknown): string {
  if (val instanceof Date) return val.toISOString();
  if (val === null || val === undefined) return '';
  return JSON.stringify(val);
}

function computeChangedKeys(
  oldVal: Record<string, unknown> | null,
  newVal: Record<string, unknown> | null,
): string[] {
  const old = oldVal ?? {};
  const newV = newVal ?? {};
  const keys = new Set([...Object.keys(old), ...Object.keys(newV)]);
  return Array.from(keys).filter(
    (k) => serializeForCompare(old[k]) !== serializeForCompare(newV[k]),
  );
}

export async function recordAuditInternal(
  tx: DbTransaction,
  data: {
    tableName: string;
    entityId: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    actorId: string;
    actorEmail: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
  },
) {
  const headerList = await headers();
  const ip = headerList.get('x-forwarded-for') ?? 'unknown';
  const userAgent = headerList.get('user-agent') ?? 'unknown';
  const changedKeys = computeChangedKeys(
    data.oldValues ?? null,
    data.newValues ?? null,
  );

  await tx.insert(auditLogs).values({
    ...data,
    changedKeys: changedKeys.length > 0 ? changedKeys : null,
    ip,
    userAgent,
  });
}

export type RecordAuditData = {
  tableName: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
};

export async function withAuditTransaction<T>(
  fn: (ctx: {
    tx: DbTransaction;
    user: User;
    profile: Profile;
    recordAudit: (data: RecordAuditData) => Promise<void>;
  }) => Promise<T>,
): Promise<T> {
  const { user, profile } = await getSuperAdminUser();

  return db.transaction(async (tx) => {
    const recordAudit = async (data: RecordAuditData) => {
      await recordAuditInternal(tx, {
        ...data,
        actorId: user.id,
        actorEmail: profile.email ?? '',
      });
    };
    return fn({ tx, user, profile, recordAudit });
  });
}

export interface GetAuditLogsParams {
  limit?: number;
  offset?: number;
  tableName?: string;
  actorId?: string;
  action?: 'CREATE' | 'UPDATE' | 'DELETE';
  from?: Date;
  to?: Date;
}

export interface AuditLogsResult {
  items: AuditLogEntry[];
  total: number;
}

export async function getAuditLogsPaginated(
  params: GetAuditLogsParams = {},
): Promise<AuditLogsResult> {
  await getSuperAdminUser();

  const { limit = 20, offset = 0, tableName, actorId, action, from, to } = params;

  const conditions = [];
  if (tableName) conditions.push(eq(auditLogs.tableName, tableName));
  if (actorId) conditions.push(eq(auditLogs.actorId, actorId));
  if (action) conditions.push(eq(auditLogs.action, action));
  if (from) conditions.push(gte(auditLogs.createdAt, from));
  if (to) conditions.push(lte(auditLogs.createdAt, to));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(whereClause)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;
  return { items, total };
}
