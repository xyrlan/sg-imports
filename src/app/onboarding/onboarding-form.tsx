'use client';

import { useState, useActionState, useTransition, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@heroui/react';
import {
  updateOrganizationDetails,
  createAddressAction,
  uploadDocumentsAction,
  completeOnboarding,
} from './actions';
import type { ActionState } from './actions';
import { ProgressIndicator } from './components/progress-indicator';
import { Step1OrganizationDetails } from './components/step-1-organization-details';
import { Step2Address } from './components/step-2-address';
import { Step3Documents } from './components/step-3-documents';

interface OnboardingFormProps {
  organizationName: string;
  role: string;
  initialStep?: number;
  profileHasDocuments?: boolean;
}

export function OnboardingForm({
  organizationName,
  role,
  initialStep = 1,
  profileHasDocuments = false,
}: OnboardingFormProps) {
  const t = useTranslations('Onboarding');
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [isPending, startTransition] = useTransition();

  const totalSteps = 3; // Step 1: Org details, Step 2: Address, Step 3: Documents (service fee config moved to admin dashboard)

  // Track if we've processed success states to avoid duplicate processing
  const step1ProcessedRef = useRef(false);
  const step2ProcessedRef = useRef(false);
  const step4ProcessedRef = useRef(false);

  // Step 1: Organization Details
  const [step1State, step1Action, step1Pending] = useActionState<ActionState | null, FormData>(
    updateOrganizationDetails,
    null
  );

  // Step 2: Address
  const [step2State, step2Action, step2Pending] = useActionState<ActionState | null, FormData>(
    createAddressAction,
    null
  );

  // Step 3: Document Uploads
  const [step4State, step4Action, step4Pending] = useActionState<ActionState | null, FormData>(
    uploadDocumentsAction,
    null
  );

  // Monitor step 1 state changes and advance to step 2 on success
  useEffect(() => {
    if (step1State?.success && !step1ProcessedRef.current) {
      step1ProcessedRef.current = true;
      startTransition(() => {
        setCurrentStep(2);
      });
    }
  }, [step1State]);

  // Monitor step 2 state changes and advance to step 3 (documents)
  useEffect(() => {
    if (step2State?.success && !step2ProcessedRef.current) {
      step2ProcessedRef.current = true;
      startTransition(() => {
        setCurrentStep(3);
      });
    }
  }, [step2State]);

  // Monitor step 4 state changes and complete onboarding
  useEffect(() => {
    if (step4State?.success && !step4ProcessedRef.current) {
      step4ProcessedRef.current = true;
      startTransition(() => {
        completeOnboarding();
      });
    }
  }, [step4State]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('title')}</h1>
          <p className="text-sm text-muted mb-1">{t('subtitle')}</p>
          <p className="text-xs text-muted">{organizationName}</p>
        </div>

        <ProgressIndicator currentStep={currentStep} totalSteps={totalSteps} />

        <p className="text-center text-sm text-muted mb-6">
          {t('step', { current: currentStep, total: totalSteps })}
        </p>

        <Card variant="default">
          <Card.Content className="p-6">
            {currentStep === 1 && (
              <Step1OrganizationDetails
                onSubmit={step1Action}
                isPending={step1Pending}
                error={step1State?.error}
                translations={t}
              />
            )}

            {currentStep === 2 && (
              <Step2Address
                onSubmit={step2Action}
                isPending={step2Pending}
                error={step2State?.error}
                onBack={() => setCurrentStep(1)}
                isFinalStep={false}
                translations={t}
                isPendingTransition={isPending}
                role={role}
              />
            )}

            {currentStep === 3 && (
              <Step3Documents
                onSubmit={(formData) => startTransition(() => step4Action(formData))}
                isPending={step4Pending}
                error={step4State?.error}
                onBack={() => setCurrentStep(2)}
                translations={t}
                role={role}
                isPendingTransition={isPending}
                profileHasDocuments={profileHasDocuments}
              />
            )}
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
