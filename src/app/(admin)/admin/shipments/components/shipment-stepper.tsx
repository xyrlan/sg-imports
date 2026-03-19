'use client';

import { useTranslations } from 'next-intl';
import { FileCheck, DollarSign, Ship, FileText, Shield, CheckCircle, Check } from 'lucide-react';
import { STEP_ORDER, type ShipmentStep } from '@/lib/shipment-constants';

// Re-export so existing consumers that import from this file continue to work
export { STEP_ORDER, type ShipmentStep };

const STEP_ICONS: Record<ShipmentStep, React.ReactNode> = {
  CONTRACT_CREATION: <FileCheck className="h-4 w-4" />,
  MERCHANDISE_PAYMENT: <DollarSign className="h-4 w-4" />,
  SHIPPING_PREPARATION: <Ship className="h-4 w-4" />,
  DOCUMENT_PREPARATION: <FileText className="h-4 w-4" />,
  CUSTOMS_CLEARANCE: <Shield className="h-4 w-4" />,
  COMPLETION: <CheckCircle className="h-4 w-4" />,
};

// ============================================
// Props
// ============================================

interface ShipmentStepperProps {
  currentStep: ShipmentStep;
  viewingStep: ShipmentStep;
  onStepClick: (step: ShipmentStep) => void;
  isCanceled?: boolean;
}

// ============================================
// Helpers
// ============================================

function getStepIndex(step: ShipmentStep): number {
  return STEP_ORDER.indexOf(step);
}

// ============================================
// Component
// ============================================

export function ShipmentStepper({
  currentStep,
  viewingStep,
  onStepClick,
  isCanceled = false,
}: ShipmentStepperProps) {
  const t = useTranslations('Admin.Shipments.Stepper');

  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="overflow-x-auto w-full">
      <div className="flex items-center min-w-max px-2 py-3">
        {STEP_ORDER.map((step, index) => {
          const stepIndex = index;
          const isCompleted = stepIndex < currentIndex && !isCanceled;
          const isCurrent = step === currentStep && !isCanceled;
          const isFuture = stepIndex > currentIndex && !isCanceled;
          const isViewing = step === viewingStep;
          const isClickable = (isCompleted || isCurrent) && !isCanceled;
          const isLastStep = index === STEP_ORDER.length - 1;

          // Connector line after each step except the last
          const connectorCompleted = stepIndex < currentIndex && !isCanceled;

          let buttonClasses =
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all focus:outline-none ';

          if (isCanceled) {
            buttonClasses += 'bg-danger/10 text-danger cursor-not-allowed';
          } else if (isCompleted) {
            buttonClasses += 'bg-success/10 text-success cursor-pointer hover:bg-success/20';
          } else if (isCurrent) {
            buttonClasses += 'bg-accent/10 text-accent cursor-pointer hover:bg-accent/20';
          } else {
            buttonClasses += 'bg-border text-muted cursor-not-allowed';
          }

          if (isViewing && !isCanceled) {
            buttonClasses += ' ring-2 ring-accent';
          }

          return (
            <div key={step} className="flex items-center">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(step)}
                className={buttonClasses}
                aria-current={isCurrent ? 'step' : undefined}
                aria-pressed={isViewing}
              >
                {/* Icon: completed shows Check, otherwise shows step icon */}
                <span className="shrink-0">
                  {isCompleted ? <Check className="h-4 w-4" /> : STEP_ICONS[step]}
                </span>

                {/* Label hidden on mobile */}
                <span className="hidden sm:inline whitespace-nowrap">{t(step)}</span>
              </button>

              {/* Connector line between steps */}
              {!isLastStep && (
                <div
                  className={`h-0.5 w-6 mx-1 shrink-0 transition-colors ${
                    connectorCompleted ? 'bg-success' : 'bg-surface'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
