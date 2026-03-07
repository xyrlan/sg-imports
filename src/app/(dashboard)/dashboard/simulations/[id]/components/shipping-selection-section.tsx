'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button, Card } from '@heroui/react';
import { toast } from '@heroui/react';
import { useActionState, useEffect, useRef } from 'react';
import { startTransition } from 'react';
import { useFreightModality } from '@/hooks/useFreightModality';
import { FreightModalityCards } from './freight-modality-cards';
import { FreightCapacityProgress } from './freight-capacity-progress';
import { validateFreightCapacity, shouldBlockConfirm } from '@/lib/freight-validation';
import { updateSimulationAction } from '../../actions';
import type { Simulation } from '@/services/simulation.service';
import type { ShippingMetadata } from '@/db/types';

interface ShippingSelectionSectionProps {
  simulation: Simulation;
  onMutate?: () => void;
}

export function ShippingSelectionSection({ simulation, onMutate }: ShippingSelectionSectionProps) {
  const t = useTranslations('Simulations.ShippingSelection');
  const router = useRouter();

  const quote = {
    totalCbm: simulation.totalCbm,
    totalWeight: simulation.totalWeight,
    totalChargeableWeight: simulation.totalChargeableWeight,
    shippingModality: simulation.shippingModality,
    metadata: simulation.metadata as ShippingMetadata | null,
  };

  const {
    selectedModality,
    setSelectedModality,
    selectedEquipment,
    setSelectedEquipment,
    optimalProfile,
    effectiveCapacity,
    totalCbm,
    totalWeight,
    totalChargeableWeight,
    isLCLDisabled,
    isOverride,
  } = useFreightModality(quote);

  const validationResult =
    selectedModality === 'SEA_FCL' && effectiveCapacity
      ? validateFreightCapacity(totalCbm, totalWeight, effectiveCapacity)
      : { ok: true as const };

  const isBlocked = shouldBlockConfirm(validationResult);

  const [state, formAction, isPending] = useActionState(updateSimulationAction, null);
  const didRefreshRef = useRef(false);

  useEffect(() => {
    if (
      !isPending &&
      state &&
      !state.error &&
      Object.keys(state.fieldErrors ?? {}).length === 0 &&
      !didRefreshRef.current
    ) {
      didRefreshRef.current = true;
      router.refresh();
      onMutate?.();
    }
    if (isPending) didRefreshRef.current = false;
  }, [isPending, state, router, onMutate]);

  function handleConfirm() {
    if (isBlocked) {
      toast.danger(t('hardBlockToast'));
      return;
    }

    const formData = new FormData();
    formData.set('simulationId', simulation.id);
    formData.set('organizationId', simulation.organizationId);
    formData.set('shippingModality', selectedModality);

    const metadata: ShippingMetadata = {
      totalChargeableWeight,
      isOverride: isOverride || undefined,
    };
    if (selectedModality === 'SEA_FCL' && selectedEquipment) {
      metadata.equipmentType = selectedEquipment.type;
      metadata.equipmentQuantity = selectedEquipment.quantity;
    }

    formData.set('metadata', JSON.stringify(metadata));

    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <Card variant="default" className="p-6">
      <Card.Content className="space-y-6">
        <FreightModalityCards
          selectedModality={selectedModality}
          onModalityChange={setSelectedModality}
          selectedEquipment={selectedEquipment}
          onEquipmentChange={setSelectedEquipment}
          optimalEquipment={optimalProfile.equipment ?? null}
          isLCLDisabled={isLCLDisabled}
        />

        <FreightCapacityProgress
          modality={selectedModality}
          totalCbm={totalCbm}
          totalWeight={totalWeight}
          totalChargeableWeight={totalChargeableWeight}
          effectiveCapacity={effectiveCapacity}
          containerType={selectedEquipment?.type}
          containerQuantity={selectedEquipment?.quantity}
        />

        {validationResult.ok === false && validationResult.kind === 'soft' && (
          <div className="text-warning text-sm flex items-center gap-2">
            {t('softWarning')}
          </div>
        )}

        <Button
          variant="primary"
          onPress={handleConfirm}
          isDisabled={isBlocked || isPending}
          isPending={isPending}
          className="w-full"
        >
          {t('confirmModality')}
        </Button>

        {state?.error && (
          <p className="text-sm text-danger">{state.error}</p>
        )}
      </Card.Content>
    </Card>
  );
}
