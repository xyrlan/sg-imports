'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';
import { startTransition } from 'react';
import { Button, Modal, Label, Select, ListBox } from '@heroui/react';
import { Settings } from 'lucide-react';
import { updateSimulationAction } from '../../actions';
import { BRAZILIAN_STATES } from '@/lib/brazilian-states';
import type { Simulation } from '@/services/simulation.service';
import type { ShippingMetadata } from '@/db/types';

interface SimulationSettingsModalProps {
  simulation: Simulation;
  defaultDestinationState?: string | null;
  onMutate?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SimulationSettingsModal({
  simulation,
  defaultDestinationState,
  onMutate,
  open,
  onOpenChange,
}: SimulationSettingsModalProps) {
  const t = useTranslations('Simulations.SimulationSettings');
  const router = useRouter();
  const didRefreshRef = useRef(false);

  const existingMetadata = (simulation.metadata as ShippingMetadata | null) ?? {};
  const [destinationState, setDestinationState] = useState(
    () => existingMetadata.destinationState ?? defaultDestinationState ?? '',
  );

  const [state, formAction, isPending] = useActionState(updateSimulationAction, null);

  useEffect(() => {
    if (open) {
      const meta = (simulation.metadata as ShippingMetadata | null) ?? {};
      setDestinationState(meta.destinationState ?? defaultDestinationState ?? '');
    }
  }, [open, simulation.metadata, defaultDestinationState]);

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
    const metadata: ShippingMetadata = {
      ...existingMetadata,
      destinationState: destinationState || undefined,
    };
    const formData = new FormData();
    formData.set('simulationId', simulation.id);
    formData.set('organizationId', simulation.organizationId);
    formData.set('metadata', JSON.stringify(metadata));
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
                <Button variant="primary" type="submit" isPending={isPending}>
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
