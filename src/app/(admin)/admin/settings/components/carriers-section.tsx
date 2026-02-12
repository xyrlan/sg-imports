'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@heroui/react';
import { Ship, RefreshCw } from 'lucide-react';
import { syncCarriersFromShipsGoAction } from '../actions';
import type { Carrier } from '@/services/admin';

interface CarriersSectionProps {
  carriers: Carrier[];
}

export function CarriersSection({ carriers }: CarriersSectionProps) {
  const t = useTranslations('Admin.Settings');
  const router = useRouter();
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
        <ul className="space-y-2">
          {carriers.map((carrier) => (
            <li
              key={carrier.id}
              className="flex items-center justify-between p-3 rounded-lg bg-default-100 hover:bg-accent-soft-hover duration-200"
            >
              <div className="flex items-center gap-2">
                <Ship className="size-4" />
                <span className="font-medium">{carrier.name}</span>
                {carrier.scacCode && (
                  <span className="text-sm text-muted">
                    ({carrier.scacCode})
                  </span>
                )}
                {carrier.status && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      carrier.status === 'ACTIVE'
                        ? 'bg-success/20 text-success'
                        : 'bg-default-200 text-default-600'
                    }`}
                  >
                    {carrier.status}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
