'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { startTransition, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button, Input, Label, TextField, FieldError } from '@heroui/react';
import { ArrowLeft, PackageOpen } from 'lucide-react';
import { useActionState } from 'react';
import { SimulationItemsList } from './simulation-items-list';
import type { Simulation, SimulationItem } from '@/services/simulation.service';
import type { ProductWithVariants } from '@/services/product.service';
import { AddProductToSimulationModal } from './add-product-to-simulation-modal';
import { ShippingSelectionSection } from './shipping-selection-section';
import { updateSimulationAction } from '../../actions';

interface SimulationDetailContentProps {
  simulation: Simulation;
  items: SimulationItem[];
  organizationId: string;
  products: ProductWithVariants[];
}

export function SimulationDetailContent({
  simulation,
  items,
  organizationId,
  products,
}: SimulationDetailContentProps) {
  const t = useTranslations('Simulations.Detail');
  const tStatus = useTranslations('Simulations.Status');
  const router = useRouter();

  const [updateState, updateAction, isUpdatePending] = useActionState(updateSimulationAction, null);
  const [exchangeRateIof, setExchangeRateIof] = useState(simulation.exchangeRateIof ?? '');
  const didRefreshRef = useRef(false);

  const handleMutate = () => {
    router.refresh();
  };

  const handleSettingsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set('simulationId', simulation.id);
    formData.set('organizationId', organizationId);
    startTransition(() => {
      updateAction(formData);
    });
  };

  useEffect(() => {
    if (
      !isUpdatePending &&
      updateState &&
      !updateState.error &&
      Object.keys(updateState.fieldErrors ?? {}).length === 0 &&
      !didRefreshRef.current
    ) {
      didRefreshRef.current = true;
      router.refresh();
    }
    if (isUpdatePending) {
      didRefreshRef.current = false;
    }
  }, [isUpdatePending, updateState, router]);

  return (
    <div key={simulation.id} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/simulations">
            <Button variant="ghost" size="sm" className="inline-flex items-center gap-2">
              <ArrowLeft className="size-4" />
              {t('back')}
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{simulation.name}</h1>
            <p className="text-sm text-muted">
              {t('status')}: {simulation.status ? tStatus(simulation.status as 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CONVERTED') : '—'}
            </p>
          </div>
        </div>
        <AddProductToSimulationModal
          simulationId={simulation.id}
          organizationId={organizationId}
          products={products}
          onMutate={handleMutate}
        />
      </div>

      {items.length > 0 && (
          <ShippingSelectionSection
            simulation={simulation}
            onMutate={handleMutate}
          />
        )}

      <form onSubmit={handleSettingsSubmit} className="rounded-lg border p-4 space-y-4">
        <h3 className="text-sm font-semibold text-default-700">{t('settings')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <TextField
              variant="primary"
              name="exchangeRateIof"
              value={exchangeRateIof}
              onChange={setExchangeRateIof}
              isInvalid={!!updateState?.fieldErrors?.exchangeRateIof}
              isDisabled={isUpdatePending}
              validate={() => updateState?.fieldErrors?.exchangeRateIof ?? null}
            >
              <Label>{t('exchangeRateIof')}</Label>
              <Input
                name="exchangeRateIof"
                placeholder="e.g. 0.38"
                value={exchangeRateIof}
                type="text"
                inputMode="decimal"
              />
              <FieldError />
            </TextField>
          </div>
        </div>
        {updateState?.error && (
          <p className="text-sm text-danger">{updateState.error}</p>
        )}
        <Button type="submit" variant="primary" size="sm" isDisabled={isUpdatePending}>
          {t('saveSettings')}
        </Button>
      </form>

      {items.length > 0 ? (
        <SimulationItemsList
          items={items}
          simulationId={simulation.id}
          organizationId={organizationId}
          onMutate={handleMutate}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-lg">
          <PackageOpen className="size-12 text-muted mb-4" />
          <p className="text-muted text-center max-w-sm mb-4">
            {t('emptyMessage')}
          </p>
          <AddProductToSimulationModal
            simulationId={simulation.id}
            organizationId={organizationId}
            products={products}
            onMutate={handleMutate}
            triggerLabel={t('addFirstProduct')}
          />
        </div>
      )}
    </div>
  );
}
