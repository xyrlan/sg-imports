'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Modal, TextArea, TextField, Checkbox, Label } from '@heroui/react';
import { ArrowLeft, X } from 'lucide-react';

import { ShipmentStepper, STEP_ORDER, type ShipmentStep } from './shipment-stepper';
import { ShipmentSummaryCard } from './shipment-summary-card';
import { ContractCreationStep } from './steps/contract-creation-step';
import { MerchandisePaymentStep } from './steps/merchandise-payment-step';
import { ShippingPreparationStep } from './steps/shipping-preparation-step';
import { DocumentPreparationStep } from './steps/document-preparation-step';
import { CustomsClearanceStep } from './steps/customs-clearance-step';
import { CompletionStep } from './steps/completion-step';
import type { ShipmentDetail } from './shipment-utils';
import {
  advanceShipmentStepAction,
  cancelShipmentAction,
  finalizeShipmentAction,
} from '../[id]/actions';

// ============================================
// Types
// ============================================

interface ShipmentDetailContentProps {
  shipment: ShipmentDetail;
  totalPaidUsd: number;
}

// ============================================
// Constants
// ============================================

const MANUAL_ADVANCE_STEPS: ShipmentStep[] = [
  'SHIPPING_PREPARATION',
  'DOCUMENT_PREPARATION',
];

// ============================================
// Step Components Map
// ============================================

type StepComponent = React.ComponentType<{
  shipment: ShipmentDetail;
  readOnly?: boolean;
}>;

const STEP_COMPONENTS: Record<ShipmentStep, StepComponent> = {
  CONTRACT_CREATION: ContractCreationStep,
  MERCHANDISE_PAYMENT: MerchandisePaymentStep,
  SHIPPING_PREPARATION: ShippingPreparationStep,
  DOCUMENT_PREPARATION: DocumentPreparationStep,
  CUSTOMS_CLEARANCE: CustomsClearanceStep,
  COMPLETION: CompletionStep,
};

// ============================================
// Component
// ============================================

export function ShipmentDetailContent({
  shipment,
  totalPaidUsd,
}: ShipmentDetailContentProps) {
  const t = useTranslations('Admin.Shipments.Detail');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const currentStep = shipment.currentStep as ShipmentStep;
  const [viewingStep, setViewingStep] = useState<ShipmentStep>(currentStep);

  const isCanceled = shipment.status === 'CANCELED';
  const isFinished = shipment.status === 'FINISHED';

  // Cancel modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelConfirmed, setCancelConfirmed] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isCancelPending, startCancelTransition] = useTransition();

  const isCurrentStep = viewingStep === currentStep;
  const isReadOnly = !isCurrentStep || isCanceled || isFinished;

  const ActiveStep = STEP_COMPONENTS[viewingStep];

  const showAdvanceButton =
    !isCanceled &&
    !isFinished &&
    isCurrentStep &&
    MANUAL_ADVANCE_STEPS.includes(currentStep);

  const showFinalizeButton =
    !isCanceled &&
    !isFinished &&
    isCurrentStep &&
    currentStep === 'COMPLETION';

  // ============================================
  // Handlers
  // ============================================

  function handleAdvanceStep() {
    const confirmed = window.confirm(t('confirmAdvance'));
    if (!confirmed) return;

    startTransition(async () => {
      await advanceShipmentStepAction(shipment.id, currentStep);
      router.refresh();
    });
  }

  function handleFinalizeShipment() {
    const confirmed = window.confirm(t('confirmFinalize'));
    if (!confirmed) return;

    startTransition(async () => {
      await finalizeShipmentAction(shipment.id);
      router.refresh();
    });
  }

  function handleOpenCancelModal() {
    setCancelReason('');
    setCancelConfirmed(false);
    setCancelError(null);
    setIsCancelModalOpen(true);
  }

  function handleCloseCancelModal() {
    setIsCancelModalOpen(false);
  }

  function handleCancelSubmit() {
    const formData = new FormData();
    formData.set('shipmentId', shipment.id);
    formData.set('reason', cancelReason);

    startCancelTransition(async () => {
      const result = await cancelShipmentAction(formData);
      if (result.success) {
        setIsCancelModalOpen(false);
        router.refresh();
      } else {
        setCancelError(result.error ?? null);
      }
    });
  }

  const clientName = shipment.clientOrganization?.name ?? '—';
  const shipmentCode = shipment.code ?? shipment.id.slice(0, 8).toUpperCase();

  const totalProductsUsd = shipment.quote?.items?.reduce((acc, item) => {
    const itemTotal = parseFloat(item.priceUsd ?? '0') * (item.quantity ?? 0);
    return acc + itemTotal;
  }, 0);

  return (
    <div className="space-y-6 p-6">
      {/* ====== Header ====== */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/shipments"
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </Link>
          <span className="text-muted">/</span>
          <h1 className="text-lg font-semibold text-foreground">
            {t('title', { code: shipmentCode })} — {clientName}
          </h1>
        </div>

        {!isCanceled && !isFinished && (
          <Button
            size="sm"
            variant="danger-soft"
            onPress={handleOpenCancelModal}
          >
            <X className="h-4 w-4" />
            {t('cancel')}
          </Button>
        )}
      </div>

      {/* ====== Summary Card ====== */}
      <ShipmentSummaryCard
        totalProductsUsd={
          totalProductsUsd !== undefined ? String(totalProductsUsd) : null
        }
        totalPaidUsd={String(totalPaidUsd)}
        eta={shipment.eta}
        shipmentType={shipment.shipmentType}
        status={shipment.status}
        orderType={shipment.clientOrganization?.orderType ?? 'ORDER'}
      />

      {/* ====== Stepper ====== */}
      <ShipmentStepper
        currentStep={currentStep}
        viewingStep={viewingStep}
        onStepClick={setViewingStep}
        isCanceled={isCanceled}
      />

      {/* ====== Step Content ====== */}
      <div className="rounded-lg border border-default-200 bg-default-50 p-6">
        {ActiveStep && (
          <ActiveStep shipment={shipment} readOnly={isReadOnly} />
        )}
      </div>

      {/* ====== Action Buttons ====== */}
      {(showAdvanceButton || showFinalizeButton) && (
        <div className="flex justify-end">
          {showAdvanceButton && (
            <Button
              variant="primary"
              onPress={handleAdvanceStep}
              isPending={isPending}
            >
              {t('advanceStep')}
            </Button>
          )}
          {showFinalizeButton && (
            <Button
              variant="primary"
              onPress={handleFinalizeShipment}
              isPending={isPending}
            >
              {t('finalize')}
            </Button>
          )}
        </div>
      )}

      {/* ====== Cancel Modal ====== */}
      <Modal>
        <Modal.Backdrop
          isOpen={isCancelModalOpen}
          onOpenChange={(open) => !open && handleCloseCancelModal()}
          isDismissable={!isCancelPending}
        >
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
                  variant="outline"
                  onPress={handleCloseCancelModal}
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
    </div>
  );
}
