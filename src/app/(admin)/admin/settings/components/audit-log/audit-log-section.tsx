'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { parseAsString, useQueryState } from 'nuqs';
import { Card, Chip, Spinner } from '@heroui/react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { createColumnHelper } from '@tanstack/react-table';
import { SettingsSectionHeader } from '../_shared/settings-section-header';
import { getAuditLogsAction } from '../../actions';
import type { AuditLogEntry } from '@/services/admin';
import { AuditLogFilters } from './audit-log-filters';
import { AUDIT_TABLE_KEYS } from './audit-log-constants';

const AUDIT_TABLE_KEYS_SET = new Set<string>(AUDIT_TABLE_KEYS);

function getTableDisplayName(tableName: string | null, t: (key: string) => string): string {
  if (!tableName) return '—';
  return AUDIT_TABLE_KEYS_SET.has(tableName) ? t(`tables.${tableName}`) : tableName;
}

const auditColumnHelper = createColumnHelper<AuditLogEntry>();

function AuditDiffCell({
  changedKeys,
  oldValues,
  newValues,
  action,
}: {
  changedKeys: string[] | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
}) {
  const t = useTranslations('Admin.Settings.AuditLog');
  const [expanded, setExpanded] = useState(false);

  if (action === 'CREATE' && newValues) {
    const keys = Object.keys(newValues).filter((k) => k !== 'createdAt' && k !== 'updatedAt');
    if (keys.length === 0) return <span className="text-muted">—</span>;
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 text-sm text-accent hover:underline cursor-pointer"
        >
          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          {keys.length} {keys.length === 1 ? 'campo' : 'campos'}
        </button>
        {expanded && (
          <div className="mt-2 p-2 rounded-lg bg-default-100 text-xs font-mono space-y-1 max-h-40 overflow-y-auto">
            {keys.map((k) => (
              <div key={k}>
                <span className="text-success-foreground">{k}:</span>{' '}
                {JSON.stringify(newValues[k])}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (action === 'DELETE' && oldValues) {
    const keys = Object.keys(oldValues).filter((k) => k !== 'createdAt' && k !== 'updatedAt');
    if (keys.length === 0) return <span className="text-muted">—</span>;
    return (
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-1 text-sm text-accent hover:underline cursor-pointer"
        >
          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          {keys.length} {keys.length === 1 ? 'campo' : 'campos'}
        </button>
        {expanded && (
          <div className="mt-2 p-2 rounded-lg bg-default-100 text-xs font-mono space-y-1 max-h-40 overflow-y-auto">
            {keys.map((k) => (
              <div key={k}>
                <span className="text-danger">{k}:</span> {JSON.stringify(oldValues[k])}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const keys = changedKeys ?? [];
  if (keys.length === 0) return <span className="text-muted">—</span>;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-1 text-sm text-accent hover:underline cursor-pointer"
      >
        {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        {keys.length} {keys.length === 1 ? 'alteração' : 'alterações'}
      </button>
      {expanded && (
        <div className="mt-2 p-2 rounded-lg bg-default-100 text-xs font-mono space-y-2 max-h-48 overflow-y-auto">
          {keys.map((k) => (
            <div key={k} className="border-b border-default-200 pb-1 last:border-0">
              <span className="font-semibold">{k}</span>
              <div className="mt-0.5">
                <span className="text-danger">{t('diffOld')}:</span>{' '}
                {JSON.stringify(oldValues?.[k] ?? '—')}
              </div>
              <div>
                <span className="text-success-foreground">{t('diffNew')}:</span>{' '}
                {JSON.stringify(newValues?.[k] ?? '—')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AuditLogSection() {
  const tAudit = useTranslations('Admin.Settings.AuditLog');
  const [tableFilter, setTableFilter] = useQueryState('table', parseAsString.withDefault(''));
  const [tableName, setTableName] = useState(tableFilter);
  const [actionFilter, setActionFilter] = useState<'CREATE' | 'UPDATE' | 'DELETE' | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });
  const { pageIndex, pageSize } = pagination;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getAuditLogsAction({
      limit: pageSize,
      offset: pageIndex * pageSize,
      tableName: tableName || undefined,
      action: actionFilter || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
    });
    setLoading(false);
    if (result.ok && 'items' in result) {
      setItems(result.items);
      setTotal(result.total);
    } else if (!result.ok && 'error' in result) {
      setError(result.error ?? 'Erro desconhecido');
      setItems([]);
      setTotal(0);
    }
  }, [pageIndex, pageSize, tableName, actionFilter, fromDate, toDate]);

  useEffect(() => {
    setTableName(tableFilter);
  }, [tableFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns = useMemo(
    () => [
      auditColumnHelper.accessor('createdAt', {
        header: tAudit('columns.createdAt'),
        cell: (info) => {
          const val = info.getValue();
          return (
            <span className="text-sm text-muted">
              {val ? new Date(val).toLocaleString() : '—'}
            </span>
          );
        },
        size: 160,
      }),
      auditColumnHelper.accessor('action', {
        header: tAudit('columns.action'),
        cell: (info) => {
          const action = info.getValue();
          const label =
            action === 'CREATE'
              ? tAudit('actionCreate')
              : action === 'UPDATE'
                ? tAudit('actionUpdate')
                : tAudit('actionDelete');
          const color = action === 'CREATE' ? 'success' : action === 'UPDATE' ? 'warning' : 'danger';
          return (
            <Chip size="sm" color={color} variant="soft">
              {label}
            </Chip>
          );
        },
        size: 100,
      }),
      auditColumnHelper.accessor('tableName', {
        header: tAudit('columns.tableName'),
        cell: (info) => (
          <span className="text-sm font-medium">
            {getTableDisplayName(info.getValue(), tAudit)}
          </span>
        ),
        size: 180,
      }),
      auditColumnHelper.accessor('entityId', {
        header: tAudit('columns.entityId'),
        cell: (info) => (
          <span className="text-xs font-mono text-muted truncate max-w-[120px] block">
            {info.getValue() ?? '—'}
          </span>
        ),
        size: 140,
      }),
      auditColumnHelper.accessor('actorEmail', {
        header: tAudit('columns.actorEmail'),
        cell: (info) => (
          <span className="text-sm">{info.getValue() ?? '—'}</span>
        ),
        size: 180,
      }),
      auditColumnHelper.display({
        id: 'changes',
        header: tAudit('columns.changes'),
        cell: (info) => {
          const row = info.row.original;
          return (
            <AuditDiffCell
              changedKeys={row.changedKeys}
              oldValues={row.oldValues as Record<string, unknown> | null}
              newValues={row.newValues as Record<string, unknown> | null}
              action={row.action}
            />
          );
        },
        size: 200,
      }),
    ],
    [tAudit]
  );

  const handleApplyFilters = () => {
    if (tableName) setTableFilter(tableName);
    else setTableFilter('');
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  const handleClearFilters = () => {
    setTableName('');
    setTableFilter('');
    setActionFilter('');
    setFromDate('');
    setToDate('');
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  const pageCount = Math.ceil(total / pageSize) || 1;
  const onPaginationChange = (
    updaterOrValue:
      | { pageIndex: number; pageSize: number }
      | ((prev: { pageIndex: number; pageSize: number }) => { pageIndex: number; pageSize: number }),
  ) => {
    setPagination((prev) =>
      typeof updaterOrValue === 'function' ? updaterOrValue(prev) : updaterOrValue,
    );
  };

  return (
    <Card className="space-y-6">
      <SettingsSectionHeader
        title={tAudit('title')}
        description={tAudit('description')}
        className="mb-4"
      />
      <AuditLogFilters
        tableName={tableName}
        onTableNameChange={setTableName}
        actionFilter={actionFilter}
        onActionFilterChange={setActionFilter}
        fromDate={fromDate}
        onFromDateChange={setFromDate}
        toDate={toDate}
        onToDateChange={setToDate}
        onApply={handleApplyFilters}
        onClear={handleClearFilters}
      />

      {error && (
        <div className="p-3 rounded-lg bg-danger/10 text-danger text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted py-8">{tAudit('noLogs')}</p>
      ) : (
        <DataTable<AuditLogEntry>
          columns={columns}
          data={items}
          isLoading={false}
          manualPagination
          pageCount={pageCount}
          pagination={pagination}
          onPaginationChange={onPaginationChange}
        />
      )}
    </Card>
  );
}
