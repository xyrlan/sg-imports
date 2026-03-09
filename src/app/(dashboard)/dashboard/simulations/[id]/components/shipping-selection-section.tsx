'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Button, Card, Input, Label, TextField, Select, ListBox } from '@heroui/react';
import { toast } from '@heroui/react';
import { useActionState, useEffect, useRef, useState } from 'react';
import { startTransition } from 'react';
import { useFreightModality } from '@/hooks/useFreightModality';
import { FreightModalityCards } from './freight-modality-cards';
import { FreightCapacityProgress } from './freight-capacity-progress';
import { validateFreightCapacity, shouldBlockConfirm } from '@/lib/freight-validation';
import { updateSimulationAction } from '../../actions';
import type { Simulation } from '@/services/simulation.service';
import type { ShippingMetadata } from '@/db/types';

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
] as const;

interface ShippingSelectionSectionProps {
  simulation: Simulation;
  defaultDestinationState?: string | null;
  onMutate?: () => void;
}

export function ShippingSelectionSection({
  simulation,
  defaultDestinationState,
  onMutate,
}: ShippingSelectionSectionProps) {
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

  const [state, formAction, isPending] = useActionState(updateSimulationAction, null);
  const didRefreshRef = useRef(false);

  const existingMetadata = (simulation.metadata as ShippingMetadata | null) ?? {};
  const [totalFreightUsd, setTotalFreightUsd] = useState(
    () => existingMetadata.totalFreightUsd?.toString() ?? '',
  );
  const [totalInsuranceUsd, setTotalInsuranceUsd] = useState(
    () => existingMetadata.totalInsuranceUsd?.toString() ?? '',
  );
  const [capataziaUsd, setCapataziaUsd] = useState(
    () => existingMetadata.capataziaUsd?.toString() ?? '',
  );
  const [destinationState, setDestinationState] = useState(
    () => existingMetadata.destinationState ?? defaultDestinationState ?? '',
  );
  const [targetDolar, setTargetDolar] = useState(
    () => simulation.targetDolar?.toString() ?? '',
  );

  const isTargetDolarInvalid =
    !targetDolar.trim() || Number(targetDolar.replace(',', '.')) <= 0;
  const isBlocked =
    shouldBlockConfirm(validationResult) || isTargetDolarInvalid;

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
    if (isTargetDolarInvalid) {
      toast.danger(t('targetDolarRequired'));
      return;
    }
    if (shouldBlockConfirm(validationResult)) {
      toast.danger(t('hardBlockToast'));
      return;
    }

    const formData = new FormData();
    formData.set('simulationId', simulation.id);
    formData.set('organizationId', simulation.organizationId);
    formData.set('shippingModality', selectedModality);
    formData.set('targetDolar', targetDolar.trim() || '0');

    const metadata: ShippingMetadata = {
      totalChargeableWeight,
      isOverride: isOverride || undefined,
      totalFreightUsd: parseFloat(totalFreightUsd) || 0,
      totalInsuranceUsd: parseFloat(totalInsuranceUsd) || 0,
      capataziaUsd: parseFloat(capataziaUsd) || undefined,
      destinationState: destinationState || undefined,
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
    <Card className="p-6">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextField
            variant="primary"
            value={targetDolar}
            onChange={setTargetDolar}
            isDisabled={isPending}
          >
            <Label>{t('targetDolar')}</Label>
            <Input type="text" inputMode="decimal" placeholder={t('targetDolarPlaceholder')} />
          </TextField>
          <TextField
            variant="primary"
            value={totalFreightUsd}
            onChange={setTotalFreightUsd}
            isDisabled={isPending}
          >
            <Label>{t('totalFreightUsd')}</Label>
            <Input type="text" inputMode="decimal" placeholder="0.00" />
          </TextField>
          <TextField
            variant="primary"
            value={totalInsuranceUsd}
            onChange={setTotalInsuranceUsd}
            isDisabled={isPending}
          >
            <Label>{t('totalInsuranceUsd')}</Label>
            <Input type="text" inputMode="decimal" placeholder="0.00" />
          </TextField>
          <TextField
            variant="primary"
            value={capataziaUsd}
            onChange={setCapataziaUsd}
            isDisabled={isPending}
          >
            <Label>{t('capataziaUsd')}</Label>
            <Input type="text" inputMode="decimal" placeholder="0.00" />
          </TextField>
          <div className="space-y-2">
            <Label>{t('destinationState')}</Label>
            <Select
              variant="primary"
              placeholder={t('destinationStatePlaceholder')}
              value={destinationState || null}
              onChange={(k) => setDestinationState((k as string) ?? '')}
              isDisabled={isPending}
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item key="__none__" id="__none__" textValue={t('destinationStatePlaceholder')}>
                    {t('destinationStatePlaceholder')}
                  </ListBox.Item>
                  {BRAZILIAN_STATES.map((uf) => (
                    <ListBox.Item key={uf} id={uf} textValue={uf}>
                      {uf}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        </div>

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
