'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, Chip } from '@heroui/react';
import { RefreshCw } from 'lucide-react';
import { DataTable, facetedFilterFn, type FacetedFilterDef } from '@/components/ui/data-table';
import { createColumnHelper } from '@tanstack/react-table';
import { syncCarriersFromShipsGoAction } from '../actions';
import type { Carrier } from '@/services/admin';

const carrierColumnHelper = createColumnHelper<Carrier>();

function useCarrierColumns() {
  const t = useTranslations('Admin.Settings');

  return useMemo(
    () => [
      carrierColumnHelper.accessor('name', {
        header: t('Carriers.columns.name'),
        cell: (info) => (
          <span className="font-medium">{info.getValue()}</span>
        ),
      }),
      carrierColumnHelper.accessor('scacCode', {
        header: t('Carriers.columns.scacCode'),
        cell: (info) => (
          <span className="text-sm text-muted">
            {info.getValue() ?? '—'}
          </span>
        ),
      }),
      carrierColumnHelper.accessor('status', {
        header: t('Carriers.columns.status'),
        filterFn: facetedFilterFn,
        cell: (info) => {
          const status = info.getValue();
          if (!status) return <span className="text-muted">—</span>;
          return (
            <Chip
              size="sm"
              color={status === 'ACTIVE' ? 'success' : 'default'}
              variant={status === 'ACTIVE' ? 'soft' : 'secondary'}
            >
              {status === 'ACTIVE'
                ? t('Carriers.columns.statusActive')
                : t('Carriers.columns.statusPassive')}
            </Chip>
          );
        },
      }),
    ],
    [t]
  );
}

function useCarrierFilters(): FacetedFilterDef[] {
  const t = useTranslations('Admin.Settings');

  return useMemo(
    () => [
      {
        columnId: 'status',
        title: t('Carriers.columns.status'),
        options: [
          { label: t('Carriers.columns.statusActive'), value: 'ACTIVE' },
          { label: t('Carriers.columns.statusPassive'), value: 'PASSIVE' },
        ],
      },
    ],
    [t]
  );
}

interface CarriersSectionProps {
  carriers: Carrier[];
}

export function CarriersSection({ carriers }: CarriersSectionProps) {
  const t = useTranslations('Admin.Settings');
  const router = useRouter();
  const columns = useCarrierColumns();
  const facetedFilters = useCarrierFilters();
  const [syncResult, setSyncResult] = useState<{
    inserted: number;
    updated: number;
    errors: string[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSync = () => {
    setSyncResult(null);
    startTransition(async () => {
      const result = await syncCarriersFromShipsGoAction();
      router.refresh();
      if (result.ok && 'inserted' in result) {
        setSyncResult({
          inserted: result.inserted ?? 0,
          updated: result.updated ?? 0,
          errors: result.errors ?? [],
        });
      } else if (!result.ok && 'error' in result) {
        setSyncResult({
          inserted: 0,
          updated: 0,
          errors: [result.error ?? 'Erro desconhecido'],
        });
      }
    });
  };

  return (
    <Card className="p-6">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t('Carriers.title')}</h2>
          <p className="text-sm text-muted">{t('Carriers.description')}</p>
        </div>
        <Button
          variant="primary"
          onPress={handleSync}
          isPending={isPending}
        >
          <RefreshCw className="size-4" />
          {t('Carriers.syncWithShipsGo')}
        </Button>
      </div>
      {syncResult && (
        <div className="mb-4 p-3 rounded-lg bg-default-100 text-sm">
          {syncResult.errors.length > 0 ? (
            <p className="text-danger">
              {t('Carriers.syncError')}: {syncResult.errors.slice(0, 3).join(', ')}
              {syncResult.errors.length > 3 &&
                ` (+${syncResult.errors.length - 3})`}
            </p>
          ) : (
            <p className="text-success-foreground">
              {t('Carriers.syncSuccess', {
                inserted: syncResult.inserted,
                updated: syncResult.updated,
              })}
            </p>
          )}
        </div>
      )}
      {carriers.length === 0 ? (
        <p className="text-muted">{t('Carriers.noCarriers')}</p>
      ) : (
        <DataTable<Carrier>
          columns={columns}
          data={carriers}
          searchPlaceholder={t('Carriers.searchPlaceholder')}
          facetedFilters={facetedFilters}
        />
      )}
    </Card>
  );
}
