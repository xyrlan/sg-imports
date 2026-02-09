'use client';

import { useState, useActionState, useTransition, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Checkbox, Switch } from '@heroui/react';
import { AppCard } from '@/components/ui/card';
import { AppInput } from '@/components/ui/input';
import { AppSelect } from '@/components/ui/select';
import { AppButton } from '@/components/ui/button';
import {
  updateOrganizationDetails,
  createAddressAction,
  saveServiceFeeConfig,
  completeOnboarding,
  fetchCEPData,
} from './actions';
import type { ActionState } from './actions';

interface OnboardingFormProps {
  organizationName: string;
  role: string;
}

export function OnboardingForm({ organizationName, role }: OnboardingFormProps) {
  const t = useTranslations('Onboarding');
  const [currentStep, setCurrentStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  
  // Determine if user is a seller and total steps
  const isSeller = role === 'SELLER';
  const totalSteps = isSeller ? 2 : 3;

  // Track if we've processed success states to avoid duplicate processing
  const step1ProcessedRef = useRef(false);
  const step2ProcessedRef = useRef(false);
  const step3ProcessedRef = useRef(false);

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
  const [fetchingCEP, setFetchingCEP] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  // Step 3: Service Fee Config (OWNER only)
  const [step3State, step3Action, step3Pending] = useActionState<ActionState | null, FormData>(
    saveServiceFeeConfig,
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

  // Monitor step 2 state changes and advance to step 3 or complete
  useEffect(() => {
    if (step2State?.success && !step2ProcessedRef.current) {
      step2ProcessedRef.current = true;
      if (isSeller) {
        startTransition(() => {
          completeOnboarding();
        });
      } else {
        startTransition(() => {
          setCurrentStep(3);
        });
      }
    }
  }, [step2State, isSeller]);

  // Monitor step 3 state changes and complete onboarding
  useEffect(() => {
    if (step3State?.success && !step3ProcessedRef.current) {
      step3ProcessedRef.current = true;
      startTransition(() => {
        completeOnboarding();
      });
    }
  }, [step3State]);

  // Handle CEP fetch
  const handleFetchCEP = async (cep: string) => {
    setCepError(null);
    setFetchingCEP(true);
    
    try {
      const data = await fetchCEPData(cep);
      
      if (!data) {
        setCepError(t('Step2.cepNotFound'));
        setFetchingCEP(false);
        return;
      }

      // Fill address fields
      const streetInput = document.querySelector<HTMLInputElement>('input[name="street"]');
      const neighborhoodInput = document.querySelector<HTMLInputElement>('input[name="neighborhood"]');
      const cityInput = document.querySelector<HTMLInputElement>('input[name="city"]');
      const stateInput = document.querySelector<HTMLInputElement>('input[name="state"]');

      if (streetInput) streetInput.value = data.logradouro;
      if (neighborhoodInput) neighborhoodInput.value = data.bairro;
      if (cityInput) cityInput.value = data.localidade;
      if (stateInput) stateInput.value = data.uf;
      
      setFetchingCEP(false);
    } catch {
      setCepError(t('Step2.cepFetchError'));
      setFetchingCEP(false);
    }
  };

  const renderProgressIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={`h-2 w-12 rounded-full transition-colors ${
            index + 1 === currentStep
              ? 'bg-blue-600'
              : index + 1 < currentStep
              ? 'bg-blue-400'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {t('title')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {t('subtitle')}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {organizationName}
          </p>
        </div>

        {renderProgressIndicator()}

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('step', { current: currentStep, total: totalSteps })}
        </p>

        <AppCard className="p-6">
          {/* Step 1: Organization Details */}
          {currentStep === 1 && (
            <form action={step1Action}>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">{t('Step1.title')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('Step1.description')}
                </p>
              </div>

              {step1State?.error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{step1State.error}</p>
                </div>
              )}

              <div className="space-y-4">
                <AppInput
                  name="tradeName"
                  label={t('Step1.tradeName')}
                  placeholder={t('Step1.tradeNamePlaceholder')}
                  required
                  isDisabled={step1Pending}
                />

                <AppInput
                  name="stateRegistry"
                  label={t('Step1.stateRegistry')}
                  placeholder={t('Step1.stateRegistryPlaceholder')}
                  isDisabled={step1Pending}
                />

                <AppSelect
                  name="taxRegime"
                  label={t('Step1.taxRegime')}
                  placeholder={t('Step1.taxRegimePlaceholder')}
                  items={[
                    { id: 'SIMPLES_NACIONAL', label: t('Step1.taxRegimes.SIMPLES_NACIONAL') },
                    { id: 'LUCRO_PRESUMIDO', label: t('Step1.taxRegimes.LUCRO_PRESUMIDO') },
                    { id: 'LUCRO_REAL', label: t('Step1.taxRegimes.LUCRO_REAL') },
                  ]}
                  isDisabled={step1Pending}
                />

                <AppInput
                  name="email"
                  type="email"
                  label={t('Step1.email')}
                  placeholder={t('Step1.emailPlaceholder')}
                  isDisabled={step1Pending}
                />

                <AppInput
                  name="phone"
                  label={t('Step1.phone')}
                  placeholder={t('Step1.phonePlaceholder')}
                  isDisabled={step1Pending}
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <AppButton
                  type="submit"
                  variant="primary"
                  isLoading={step1Pending}
                  size="lg"
                >
                  {t('next')}
                </AppButton>
              </div>
            </form>
          )}

          {/* Step 2: Address */}
          {currentStep === 2 && (
            <form action={step2Action}>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">{t('Step2.title')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('Step2.description')}
                </p>
              </div>

              {step2State?.error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{step2State.error}</p>
                </div>
              )}

              {cepError && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">{cepError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <AppInput
                      name="postalCode"
                      label={t('Step2.postalCode')}
                      placeholder={t('Step2.postalCodePlaceholder')}
                      required
                      isDisabled={step2Pending}
                      id="cep-input"
                    />
                  </div>
                  <div className="flex items-end">
                    <AppButton
                      type="button"
                      variant="secondary"
                      isLoading={fetchingCEP}
                      onClick={() => {
                        const cepInput = document.querySelector<HTMLInputElement>('#cep-input');
                        if (cepInput?.value) {
                          handleFetchCEP(cepInput.value);
                        }
                      }}
                      size="lg"
                    >
                      {fetchingCEP ? t('Step2.fetchingCEP') : t('Step2.fetchCEP')}
                    </AppButton>
                  </div>
                </div>

                <AppInput
                  name="street"
                  label={t('Step2.street')}
                  placeholder={t('Step2.streetPlaceholder')}
                  required
                  isDisabled={step2Pending}
                />

                <div className="grid grid-cols-2 gap-4">
                  <AppInput
                    name="number"
                    label={t('Step2.number')}
                    placeholder={t('Step2.numberPlaceholder')}
                    required
                    isDisabled={step2Pending}
                  />

                  <AppInput
                    name="complement"
                    label={t('Step2.complement')}
                    placeholder={t('Step2.complementPlaceholder')}
                    isDisabled={step2Pending}
                  />
                </div>

                <AppInput
                  name="neighborhood"
                  label={t('Step2.neighborhood')}
                  placeholder={t('Step2.neighborhoodPlaceholder')}
                  required
                  isDisabled={step2Pending}
                />

                <div className="grid grid-cols-2 gap-4">
                  <AppInput
                    name="city"
                    label={t('Step2.city')}
                    placeholder={t('Step2.cityPlaceholder')}
                    required
                    isDisabled={step2Pending}
                  />

                  <AppInput
                    name="state"
                    label={t('Step2.state')}
                    placeholder={t('Step2.statePlaceholder')}
                    required
                    maxLength={2}
                    isDisabled={step2Pending}
                  />
                </div>

                <input type="hidden" name="country" value="Brazil" />

                <Checkbox name="sameAsDelivery" defaultSelected>
                  {t('Step2.sameAsDelivery')}
                </Checkbox>
              </div>

              <div className="flex justify-between gap-3 mt-6">
                <AppButton
                  type="button"
                  variant="ghost"
                  onClick={() => setCurrentStep(1)}
                  isDisabled={step2Pending}
                  size="lg"
                >
                  {t('back')}
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  isLoading={step2Pending || isPending}
                  size="lg"
                >
                  {isSeller ? t('finish') : t('next')}
                </AppButton>
              </div>
            </form>
          )}

          {/* Step 3: Service Fee Config (OWNER only) */}
          {currentStep === 3 && !isSeller && (
            <form action={step3Action}>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">{t('Step3.title')}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('Step3.description')}
                </p>
              </div>

              {step3State?.error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{step3State.error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {t('Step3.defaultsInfo')}
                  </p>
                </div>

                <AppInput
                  name="percentage"
                  type="number"
                  label={t('Step3.percentage')}
                  placeholder={t('Step3.percentagePlaceholder')}
                  defaultValue="2.5"
                  step="0.1"
                  min="0"
                  max="100"
                  isDisabled={step3Pending}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                  {t('Step3.percentageHelp')}
                </p>

                <AppInput
                  name="minimumValue"
                  type="number"
                  label={t('Step3.minimumValue')}
                  placeholder={t('Step3.minimumValuePlaceholder')}
                  defaultValue="3060.00"
                  step="0.01"
                  min="0"
                  isDisabled={step3Pending}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                  {t('Step3.minimumValueHelp')}
                </p>

                <input type="hidden" name="currency" value="BRL" />

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium">{t('Step3.applyToChinaProducts')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {t('Step3.applyToChinaProductsHelp')}
                    </p>
                  </div>
                  <Switch name="applyToChinaProducts" defaultSelected />
                </div>
              </div>

              <div className="flex justify-between gap-3 mt-6">
                <AppButton
                  type="button"
                  variant="ghost"
                  onClick={() => setCurrentStep(2)}
                  isDisabled={step3Pending || isPending}
                  size="lg"
                >
                  {t('back')}
                </AppButton>
                <AppButton
                  type="submit"
                  variant="primary"
                  isLoading={step3Pending || isPending}
                  size="lg"
                >
                  {t('finish')}
                </AppButton>
              </div>
            </form>
          )}
        </AppCard>
      </div>
    </div>
  );
}
