'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';
import { startTransition } from 'react';
import { Button, Input, Modal, Label, Select, ListBox, TextField, NumberField, Checkbox } from '@heroui/react';
import { Settings } from 'lucide-react';
import { updateSimulationAction, updateServiceFeeConfigAction } from '../../../actions';
import { BRAZILIAN_STATES } from '@/lib/brazilian-states';
import type { Simulation } from '@/services/simulation.service';
import type { ShippingMetadata } from '@/db/types';

/** Maps stored modality to UI category: Marítimo (SEA_LCL/SEA_FCL), AIR, EXPRESS */
function modalityToUiValue(modality: string | null): 'SEA_LCL' | 'AIR' | 'EXPRESS' {
  if (modality === 'SEA_LCL' || modality === 'SEA_FCL') return 'SEA_LCL';
  if (modality === 'AIR') return 'AIR';
  if (modality === 'EXPRESS') return 'EXPRESS';
  return 'SEA_LCL';
}

const MODALITY_OPTIONS = [
  { id: 'SEA_LCL' as const, labelKey: 'MARITIME' },
  { id: 'AIR' as const, labelKey: 'AIR' },
  { id: 'EXPRESS' as const, labelKey: 'EXPRESS' },
] as const;

const INCOTERM_OPTIONS = [
  { id: 'EXW' as const, labelKey: 'EXW' },
  { id: 'FOB' as const, labelKey: 'FOB' },
  { id: 'CIF' as const, labelKey: 'CIF' },
  { id: 'DDP' as const, labelKey: 'DDP' },
] as const;

type IncotermValue = 'EXW' | 'FOB' | 'CIF' | 'DDP';

interface FeeConfig {
  percentage: string | null;
  minimumValueMultiplier: number;
  applyToChinaProducts: boolean | null;
}

interface SettingsModalProps {
  simulation: Simulation;
  organizationId: string;
  defaultDestinationState?: string | null;
  feeConfig?: FeeConfig | null;
  onMutate?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({
  simulation,
  organizationId,
  defaultDestinationState,
  feeConfig,
  onMutate,
  open,
  onOpenChange,
}: SettingsModalProps) {
  const t = useTranslations('Simulations.SimulationSettings');
  const router = useRouter();
  const didRefreshRef = useRef(false);

  const existingMetadata = (simulation.metadata as ShippingMetadata | null) ?? {};
  const [destinationState, setDestinationState] = useState(
    () => existingMetadata.destinationState ?? defaultDestinationState ?? '',
  );
  const [destinationStateTouched, setDestinationStateTouched] = useState(false);
  const [shippingModality, setShippingModality] = useState<'SEA_LCL' | 'AIR' | 'EXPRESS'>(() =>
    modalityToUiValue(simulation.shippingModality),
  );
  const [incoterm, setIncoterm] = useState<IncotermValue>(
    () => (simulation.incoterm as IncotermValue) ?? 'FOB',
  );
  const [additionalFreightUsd, setAdditionalFreightUsd] = useState(
    () => String(existingMetadata.additionalFreightUsd ?? ''),
  );
  const [commissionPercent, setCommissionPercent] = useState(
    () => String(existingMetadata.commissionPercent ?? ''),
  );
  const [firstPaymentFobPercent, setFirstPaymentFobPercent] = useState(
    () => String(existingMetadata.firstPaymentFobPercent ?? ''),
  );

  // Fee config state
  const [applyToChina, setApplyToChina] = useState(feeConfig?.applyToChinaProducts ?? true);

  const [state, formAction, isPending] = useActionState(updateSimulationAction, null);
  const [feeState, feeFormAction, isFeePending] = useActionState(updateServiceFeeConfigAction, null);

  const isBusy = isPending || isFeePending;

  useEffect(() => {
    if (open) {
      const meta = (simulation.metadata as ShippingMetadata | null) ?? {};
      queueMicrotask(() => {
        setDestinationState(meta.destinationState ?? defaultDestinationState ?? '');
        setShippingModality(modalityToUiValue(simulation.shippingModality));
        setIncoterm((simulation.incoterm as IncotermValue) ?? 'FOB');
        setAdditionalFreightUsd(String(meta.additionalFreightUsd ?? ''));
        setCommissionPercent(String(meta.commissionPercent ?? ''));
        setFirstPaymentFobPercent(String(meta.firstPaymentFobPercent ?? ''));
        setApplyToChina(feeConfig?.applyToChinaProducts ?? true);
      });
    }
  }, [open, simulation.metadata, simulation.shippingModality, simulation.incoterm, defaultDestinationState, feeConfig]);

  useEffect(() => {
    if (
      !isPending &&
      state &&
      !state.error &&
      Object.keys(state.fieldErrors ?? {}).length === 0 &&
      !didRefreshRef.current
    ) {
      didRefreshRef.current = true;
      onOpenChange(false);
      router.refresh();
      onMutate?.();
    }
    if (isPending) didRefreshRef.current = false;
  }, [isPending, state, router, onMutate, onOpenChange]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!destinationState) {
      return;
    }
    const additionalFreightNum = additionalFreightUsd.trim()
      ? parseFloat(additionalFreightUsd.replace(',', '.'))
      : undefined;
    const commissionNum = commissionPercent.trim()
      ? parseFloat(commissionPercent.replace(',', '.'))
      : undefined;
    const firstPaymentFobNum = firstPaymentFobPercent.trim()
      ? parseFloat(firstPaymentFobPercent.replace(',', '.'))
      : undefined;
    const metadata: ShippingMetadata = {
      ...existingMetadata,
      destinationState,
      additionalFreightUsd:
        additionalFreightNum !== undefined &&
        !Number.isNaN(additionalFreightNum) &&
        additionalFreightNum >= 0
          ? additionalFreightNum
          : undefined,
      commissionPercent:
        commissionNum !== undefined &&
        !Number.isNaN(commissionNum) &&
        commissionNum >= 0 &&
        commissionNum <= 100
          ? commissionNum
          : undefined,
      firstPaymentFobPercent:
        firstPaymentFobNum !== undefined &&
        !Number.isNaN(firstPaymentFobNum) &&
        firstPaymentFobNum >= 0 &&
        firstPaymentFobNum <= 100
          ? firstPaymentFobNum
          : undefined,
    };

    // Submit simulation settings
    const formData = new FormData();
    formData.set('simulationId', simulation.id);
    formData.set('organizationId', organizationId);
    formData.set('metadata', JSON.stringify(metadata));
    formData.set('shippingModality', shippingModality);
    formData.set('incoterm', incoterm);
    startTransition(() => {
      formAction(formData);
    });

    // Submit fee config in parallel
    const feeFormData = new FormData();
    feeFormData.set('simulationId', simulation.id);
    feeFormData.set('organizationId', organizationId);
    const percentageInput = (e.currentTarget.querySelector('[name="feePercentage"]') as HTMLInputElement)?.value ?? '';
    const multiplierInput = (e.currentTarget.querySelector('[name="feeMultiplier"]') as HTMLSelectElement)?.dataset?.selectedKey
      ?? String(feeConfig?.minimumValueMultiplier ?? 2);
    feeFormData.set('percentage', percentageInput);
    feeFormData.set('minimumValueMultiplier', multiplierInput);
    feeFormData.set('applyToChinaProducts', applyToChina ? 'true' : 'false');
    startTransition(() => {
      feeFormAction(feeFormData);
    });
  }

  return (
    <Modal>
      <Modal.Backdrop isOpen={open} onOpenChange={onOpenChange} isDismissable={!isBusy}>
        <Modal.Container size='cover' className="max-w-6xl h-fit ">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header className="mb-6">
              <Modal.Icon className="bg-surface text-foreground">
                <Settings size={22} />
              </Modal.Icon>
              <Modal.Heading>{t('heading')}</Modal.Heading>
            </Modal.Header>
            <form onSubmit={handleSubmit}>
              <Modal.Body className="p-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('modalityLabel')}</Label>
                    <Select
                      variant="primary"
                      placeholder={t('modalityPlaceholder')}
                      value={shippingModality}
                      onChange={(k) => setShippingModality((k as 'SEA_LCL' | 'AIR' | 'EXPRESS') ?? 'SEA_LCL')}
                      isDisabled={isBusy}
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {MODALITY_OPTIONS.map(({ id, labelKey }) => (
                            <ListBox.Item key={id} id={id} textValue={t(labelKey)}>
                              {t(labelKey)}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('incotermLabel')}</Label>
                    <Select
                      variant="primary"
                      placeholder={t('incotermPlaceholder')}
                      value={incoterm}
                      onChange={(k) => setIncoterm((k as IncotermValue) ?? 'FOB')}
                      isDisabled={isBusy}
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {INCOTERM_OPTIONS.map(({ id, labelKey }) => (
                            <ListBox.Item key={id} id={id} textValue={t(labelKey)}>
                              {t(labelKey)}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('additionalFreightLabel')}</Label>
                    <TextField
                      variant="primary"
                      value={additionalFreightUsd}
                      onChange={(v) => setAdditionalFreightUsd(v)}
                      isDisabled={isBusy}
                    >
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder={t('additionalFreightPlaceholder')}
                      />
                    </TextField>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('commissionLabel')}</Label>
                    <TextField
                      variant="primary"
                      value={commissionPercent}
                      onChange={(v) => setCommissionPercent(v)}
                      isDisabled={isBusy}
                    >
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder={t('commissionPlaceholder')}
                      />
                    </TextField>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('firstPaymentFobPercentLabel')}</Label>
                    <TextField
                      variant="primary"
                      value={firstPaymentFobPercent}
                      onChange={(v) => setFirstPaymentFobPercent(v)}
                      isDisabled={isBusy}
                    >
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder={t('firstPaymentFobPercentPlaceholder')}
                      />
                    </TextField>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('destinationState')}</Label>
                    <Select
                      variant="primary"
                      placeholder={t('destinationStatePlaceholder')}
                      value={destinationState || ''}
                      onChange={(k) => {
                        setDestinationState((k as string) ?? '');
                        setDestinationStateTouched(true);
                      }}
                      onBlur={() => setDestinationStateTouched(true)}
                      isDisabled={isBusy}
                      isInvalid={
                        !!state?.fieldErrors?.destinationState ||
                        (destinationStateTouched && !destinationState)
                      }
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {BRAZILIAN_STATES.map((uf) => (
                            <ListBox.Item key={uf} id={uf} textValue={uf}>
                              {uf}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    {(state?.fieldErrors?.destinationState ||
                      (destinationStateTouched && !destinationState)) && (
                      <p className="text-sm text-danger">
                        {state?.fieldErrors?.destinationState ?? t('destinationStateRequired')}
                      </p>
                    )}
                  </div>

                  {/* Service Fee (Honorários) */}
                  <div className="border-t border-border pt-4 mt-4">
                    <p className="text-sm font-medium mb-3">{t('feeSection')}</p>
                    <div className="grid grid-cols-2 gap-4">
                      <NumberField
                        variant="primary"
                        isDisabled={isBusy}
                        name="feePercentage"
                        defaultValue={parseFloat(feeConfig?.percentage ?? '2.5') / 100}
                        minValue={0}
                        maxValue={1}
                        step={0.001}
                        formatOptions={{ style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 2 }}
                      >
                        <Label>{t('feePercentage')}</Label>
                        <NumberField.Group>
                          <NumberField.DecrementButton />
                          <NumberField.Input className="min-w-0 flex-1" />
                          <NumberField.IncrementButton />
                        </NumberField.Group>
                      </NumberField>

                      <Select
                        name="feeMultiplier"
                        variant="primary"
                        isDisabled={isBusy}
                        defaultSelectedKey={String(feeConfig?.minimumValueMultiplier ?? 2)}
                      >
                        <Label>{t('feeMultiplier')}</Label>
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            <ListBox.Item key="2" id="2" textValue={t('feeMultiplier2x')}>
                              {t('feeMultiplier2x')}
                            </ListBox.Item>
                            <ListBox.Item key="3" id="3" textValue={t('feeMultiplier3x')}>
                              {t('feeMultiplier3x')}
                            </ListBox.Item>
                            <ListBox.Item key="4" id="4" textValue={t('feeMultiplier4x')}>
                              {t('feeMultiplier4x')}
                            </ListBox.Item>
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>

                    <div className="mt-3">
                      <Checkbox
                        isSelected={applyToChina}
                        onChange={setApplyToChina}
                      >
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                        <Checkbox.Content>
                          <Label>{t('feeApplyToChina')}</Label>
                        </Checkbox.Content>
                      </Checkbox>
                    </div>
                  </div>

                  {state?.error && (
                    <p className="text-sm text-danger mt-2">{state.error}</p>
                  )}
                  {feeState?.error && (
                    <p className="text-sm text-danger mt-2">{feeState.error}</p>
                  )}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="tertiary"
                  onPress={() => onOpenChange(false)}
                  isDisabled={isBusy}
                >
                  {t('cancel')}
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isPending={isBusy}
                  isDisabled={!destinationState}
                >
                  {t('save')}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
