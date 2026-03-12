'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';
import { startTransition } from 'react';
import { Button, Modal, Label, Select, ListBox } from '@heroui/react';
import { Settings } from 'lucide-react';
import { updateSimulationAction } from '../../../actions';
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

interface SettingsModalProps {
  simulation: Simulation;
  defaultDestinationState?: string | null;
  onMutate?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({
  simulation,
  defaultDestinationState,
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

  const [state, formAction, isPending] = useActionState(updateSimulationAction, null);

  useEffect(() => {
    if (open) {
      const meta = (simulation.metadata as ShippingMetadata | null) ?? {};
      queueMicrotask(() => {
        setDestinationState(meta.destinationState ?? defaultDestinationState ?? '');
        setShippingModality(modalityToUiValue(simulation.shippingModality));
      });
    }
  }, [open, simulation.metadata, simulation.shippingModality, defaultDestinationState]);

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
    const metadata: ShippingMetadata = {
      ...existingMetadata,
      destinationState,
    };
    const formData = new FormData();
    formData.set('simulationId', simulation.id);
    formData.set('organizationId', simulation.organizationId);
    formData.set('metadata', JSON.stringify(metadata));
    formData.set('shippingModality', shippingModality);
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <Modal>
      <Modal.Backdrop isOpen={open} onOpenChange={onOpenChange} isDismissable={!isPending}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header className="mb-6">
              <Modal.Icon className="bg-default text-foreground">
                <Settings size={22} />
              </Modal.Icon>
              <Modal.Heading>{t('heading')}</Modal.Heading>
            </Modal.Header>
            <form onSubmit={handleSubmit}>
              <Modal.Body className="p-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('modalityLabel')}</Label>
                    <Select
                      variant="primary"
                      placeholder={t('modalityPlaceholder')}
                      value={shippingModality}
                      onChange={(k) => setShippingModality((k as 'SEA_LCL' | 'AIR' | 'EXPRESS') ?? 'SEA_LCL')}
                      isDisabled={isPending}
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
                      isDisabled={isPending}
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
                  {state?.error && (
                    <p className="text-sm text-danger mt-2">{state.error}</p>
                  )}
                </div>
              </Modal.Body>
              <Modal.Footer>
                <Button
                  variant="tertiary"
                  onPress={() => onOpenChange(false)}
                  isDisabled={isPending}
                >
                  {t('cancel')}
                </Button>
                <Button
                  variant="primary"
                  type="submit"
                  isPending={isPending}
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
