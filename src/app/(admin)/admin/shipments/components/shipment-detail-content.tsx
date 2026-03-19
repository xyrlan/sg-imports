'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Surface } from '@heroui/react';
import { ArrowLeft, X } from 'lucide-react';

import { ShipmentStepper, STEP_ORDER, type ShipmentStep } from './shipment-stepper';
import { ShipmentSummaryCard } from './shipment-summary-card';
import { CancelShipmentModal } from './modals/cancel-shipment-modal';
import { ContractCreationStep } from './steps/contract-creation-step';
import { MerchandisePaymentStep } from './steps/merchandise-payment-step';
import { ShippingPreparationStep } from './steps/shipping-preparation-step';
import { DocumentPreparationStep } from './steps/document-preparation-step';
import { CustomsClearanceStep } from './steps/customs-clearance-step';
import { CompletionStep } from './steps/completion-step';
import type { ShipmentDetail } from './shipment-utils';
import {
  advanceShipmentStepAction,
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

  const clientName = shipment.clientOrganization?.name ?? '—';
  const shipmentCode = shipment.code ?? shipment.id.slice(0, 8).toUpperCase();

  const totalProductsUsd = useMemo(
    () =>
      shipment.quote?.items?.reduce((acc, item) => {
        const itemTotal = parseFloat(item.priceUsd ?? '0') * (item.quantity ?? 0);
        return acc + itemTotal;
      }, 0),
    [shipment.quote?.items],
  );

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
          <CancelShipmentModal
            shipmentId={shipment.id}
            trigger={
              <Button size="sm" variant="danger-soft">
                <X className="h-4 w-4" />
                {t('cancel')}
              </Button>
            }
          />
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
      <Surface variant="default" className="p-6">
        {ActiveStep && (
          <ActiveStep shipment={shipment} readOnly={isReadOnly} />
        )}
      </Surface>

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

    </div>
  );
}
