'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Checkbox, Label, Modal, TextArea, TextField, useOverlayState } from '@heroui/react';
import { X } from 'lucide-react';
import { cancelShipmentAction } from '../../[id]/actions';

interface CancelShipmentModalProps {
  shipmentId: string;
  trigger: React.ReactNode;
}

export function CancelShipmentModal({ shipmentId, trigger }: CancelShipmentModalProps) {
  const t = useTranslations('Admin.Shipments.Detail');
  const router = useRouter();

  const [cancelReason, setCancelReason] = useState('');
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelPending, startCancelTransition] = useTransition();

  const state = useOverlayState({
    onOpenChange: (isOpen) => {
      if (isOpen) {
        setCancelReason('');
        setCancelConfirmed(false);
        setCancelError(null);
      }
    },
  });

  function handleCancelSubmit() {
    const formData = new FormData();
    formData.set('shipmentId', shipmentId);
    formData.set('reason', cancelReason);

    startCancelTransition(async () => {
      const result = await cancelShipmentAction(formData);
      if (result.success) {
        state.close();
        router.refresh();
      } else {
        setCancelError(result.error ?? null);
      }
    });
  }

  return (
    <Modal state={state}>
      {trigger}
      <Modal.Backdrop isDismissable={!isCancelPending}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-danger/10 text-danger">
                <X className="h-5 w-5" />
              </Modal.Icon>
              <Modal.Heading>{t('cancel')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-4 p-4">
              <TextField variant="primary" isRequired>
                <Label>{t('cancelReason')}</Label>
                <TextArea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </TextField>
              <Checkbox
                isSelected={cancelConfirmed}
                onChange={setCancelConfirmed}
              >
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                <Checkbox.Content>
                  <Label>{t('cancelConfirmation')}</Label>
                </Checkbox.Content>
              </Checkbox>
              {cancelError && (
                <p className="text-sm text-danger">{cancelError}</p>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button
                type="button"
                variant="outline"
                slot="close"
                isDisabled={isCancelPending}
              >
                {t('back')}
              </Button>
              <Button
                variant="danger"
                onPress={handleCancelSubmit}
                isPending={isCancelPending}
                isDisabled={!cancelReason.trim() || !cancelConfirmed}
              >
                {t('cancel')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
