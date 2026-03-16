'use server';

import { getAuditLogsPaginated } from '@/services/admin';

export interface GetAuditLogsActionParams {
  limit?: number;
  offset?: number;
  tableName?: string;
  actorId?: string;
  action?: 'CREATE' | 'UPDATE' | 'DELETE';
  from?: string;
  to?: string;
}

export async function getAuditLogsAction(params: GetAuditLogsActionParams = {}) {
  try {
    const { from, to, ...rest } = params;
    const result = await getAuditLogsPaginated({
      ...rest,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
    return { ok: true, ...result };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Erro ao carregar histórico',
      items: [],
      total: 0,
    };
  }
}
