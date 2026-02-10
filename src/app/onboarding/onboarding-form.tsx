'use client';

import { useState, useActionState, useTransition, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Card, TextField, Input, Label, Select, ListBox, Button, Checkbox, Switch } from '@heroui/react';
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

  // Controlled state for address inputs
  const [postalCode, setPostalCode] = useState('');
  const [street, setStreet] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

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

      // Update state with fetched address data
      setStreet(data.logradouro || '');
      setNeighborhood(data.bairro || '');
      setCity(data.localidade || '');
      setState(data.uf || '');
      
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
              ? 'bg-accent'
              : index + 1 < currentStep
              ? 'bg-accent-soft'
              : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {t('title')}
          </h1>
          <p className="text-sm text-muted mb-1">
            {t('subtitle')}
          </p>
          <p className="text-xs text-muted">
            {organizationName}
          </p>
        </div>

        {renderProgressIndicator()}

        <p className="text-center text-sm text-muted mb-6">
          {t('step', { current: currentStep, total: totalSteps })}
        </p>

        <Card variant="default">
          <Card.Content className="p-6">
            {/* Step 1: Organization Details */}
            {currentStep === 1 && (
            <form action={step1Action}>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">{t('Step1.title')}</h2>
                <p className="text-sm text-muted">
                  {t('Step1.description')}
                </p>
              </div>

              {step1State?.error && (
                <div className="mb-4 p-3 bg-danger/10 border border-danger rounded-lg">
                  <p className="text-sm text-danger-foreground">{step1State.error}</p>
                </div>
              )}

              <div className="space-y-4">
                <TextField variant="primary" isDisabled={step1Pending} isRequired>
                  <Label>{t('Step1.tradeName')}</Label>
                  <Input name="tradeName" placeholder={t('Step1.tradeNamePlaceholder')} />
                </TextField>

                <TextField variant="primary" isDisabled={step1Pending}>
                  <Label>{t('Step1.stateRegistry')}</Label>
                  <Input name="stateRegistry" placeholder={t('Step1.stateRegistryPlaceholder')} />
                </TextField>

                <Select name="taxRegime" variant="primary" isDisabled={step1Pending}>
                  <Label>{t('Step1.taxRegime')}</Label>
                  <Select.Trigger>
                    <Select.Value placeholder={t('Step1.taxRegimePlaceholder')} />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item key="SIMPLES_NACIONAL" id="SIMPLES_NACIONAL" textValue={t('Step1.taxRegimes.SIMPLES_NACIONAL')}>
                        {t('Step1.taxRegimes.SIMPLES_NACIONAL')}
                      </ListBox.Item>
                      <ListBox.Item key="LUCRO_PRESUMIDO" id="LUCRO_PRESUMIDO" textValue={t('Step1.taxRegimes.LUCRO_PRESUMIDO')}>
                        {t('Step1.taxRegimes.LUCRO_PRESUMIDO')}
                      </ListBox.Item>
                      <ListBox.Item key="LUCRO_REAL" id="LUCRO_REAL" textValue={t('Step1.taxRegimes.LUCRO_REAL')}>
                        {t('Step1.taxRegimes.LUCRO_REAL')}
                      </ListBox.Item>
                    </ListBox>
                  </Select.Popover>
                </Select>

                <TextField variant="primary" isDisabled={step1Pending}>
                  <Label>{t('Step1.email')}</Label>
                  <Input name="email" type="email" placeholder={t('Step1.emailPlaceholder')} />
                </TextField>

                <TextField variant="primary" isDisabled={step1Pending}>
                  <Label>{t('Step1.phone')}</Label>
                  <Input name="phone" placeholder={t('Step1.phonePlaceholder')} />
                </TextField>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={step1Pending}
                  size="lg"
                >
                  {step1Pending ? t('loading') : t('next')}
                </Button>
              </div>
            </form>
          )}

          {/* Step 2: Address */}
          {currentStep === 2 && (
            <form action={step2Action}>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">{t('Step2.title')}</h2>
                <p className="text-sm text-muted">
                  {t('Step2.description')}
                </p>
              </div>

              {step2State?.error && (
                <div className="mb-4 p-3 bg-danger/10 border border-danger rounded-lg">
                  <p className="text-sm text-danger-foreground">{step2State.error}</p>
                </div>
              )}

              {cepError && (
                <div className="mb-4 p-3 bg-warning/10 border border-warning rounded-lg">
                  <p className="text-sm text-warning-foreground">{cepError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <TextField variant="primary" isDisabled={step2Pending} isRequired>
                      <Label>{t('Step2.postalCode')}</Label>
                      <Input
                        name="postalCode"
                        placeholder={t('Step2.postalCodePlaceholder')}
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                      />
                    </TextField>
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="secondary"
                      isDisabled={fetchingCEP}
                      onClick={() => {
                        if (postalCode) {
                          handleFetchCEP(postalCode);
                        }
                      }}
                      size="lg"
                    >
                      {fetchingCEP ? t('Step2.fetchingCEP') : t('Step2.fetchCEP')}
                    </Button>
                  </div>
                </div>

                <TextField variant="primary" isDisabled={step2Pending} isRequired>
                  <Label>{t('Step2.street')}</Label>
                  <Input
                    name="street"
                    placeholder={t('Step2.streetPlaceholder')}
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                  />
                </TextField>

                <div className="grid grid-cols-2 gap-4">
                  <TextField variant="primary" isDisabled={step2Pending} isRequired>
                    <Label>{t('Step2.number')}</Label>
                    <Input name="number" placeholder={t('Step2.numberPlaceholder')} />
                  </TextField>

                  <TextField variant="primary" isDisabled={step2Pending}>
                    <Label>{t('Step2.complement')}</Label>
                    <Input name="complement" placeholder={t('Step2.complementPlaceholder')} />
                  </TextField>
                </div>

                <TextField variant="primary" isDisabled={step2Pending} isRequired>
                  <Label>{t('Step2.neighborhood')}</Label>
                  <Input
                    name="neighborhood"
                    placeholder={t('Step2.neighborhoodPlaceholder')}
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                  />
                </TextField>

                <div className="grid grid-cols-2 gap-4">
                  <TextField variant="primary" isDisabled={step2Pending} isRequired>
                    <Label>{t('Step2.city')}</Label>
                    <Input
                      name="city"
                      placeholder={t('Step2.cityPlaceholder')}
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </TextField>

                  <TextField variant="primary" isDisabled={step2Pending} isRequired>
                    <Label>{t('Step2.state')}</Label>
                    <Input
                      name="state"
                      placeholder={t('Step2.statePlaceholder')}
                      maxLength={2}
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  </TextField>
                </div>

                <input type="hidden" name="country" value="Brazil" />

                <Checkbox name="sameAsDelivery" defaultSelected variant="primary">
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Content>
                    <Label>{t('Step2.sameAsDelivery')}</Label>
                  </Checkbox.Content>
                </Checkbox>
              </div>

              <div className="flex justify-between gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  isDisabled={step2Pending}
                  size="lg"
                >
                  {t('back')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={step2Pending || isPending}
                  size="lg"
                >
                  {(step2Pending || isPending) ? t('loading') : (isSeller ? t('finish') : t('next'))}
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Service Fee Config (OWNER only) */}
          {currentStep === 3 && !isSeller && (
            <form action={step3Action}>
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-2">{t('Step3.title')}</h2>
                <p className="text-sm text-muted">
                  {t('Step3.description')}
                </p>
              </div>

              {step3State?.error && (
                <div className="mb-4 p-3 bg-danger/10 border border-danger rounded-lg">
                  <p className="text-sm text-danger-foreground">{step3State.error}</p>
                </div>
              )}

              <div className="space-y-4">
                <div className="p-4 bg-accent/10 rounded-lg">
                  <p className="text-sm text-accent-foreground">
                    {t('Step3.defaultsInfo')}
                  </p>
                </div>

                <TextField variant="primary" isDisabled={step3Pending}>
                  <Label>{t('Step3.percentage')}</Label>
                  <Input
                    name="percentage"
                    type="number"
                    placeholder={t('Step3.percentagePlaceholder')}
                    defaultValue="2.5"
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </TextField>
                <p className="text-xs text-muted -mt-2">
                  {t('Step3.percentageHelp')}
                </p>

                <TextField variant="primary" isDisabled={step3Pending}>
                  <Label>{t('Step3.minimumValue')}</Label>
                  <Input
                    name="minimumValue"
                    type="number"
                    placeholder={t('Step3.minimumValuePlaceholder')}
                    defaultValue="3060.00"
                    step="0.01"
                    min="0"
                  />
                </TextField>
                <p className="text-xs text-muted -mt-2">
                  {t('Step3.minimumValueHelp')}
                </p>

                <input type="hidden" name="currency" value="BRL" />

                <div className="flex items-center justify-between p-4 bg-surface rounded-lg">
                  <div>
                    <p className="font-medium">{t('Step3.applyToChinaProducts')}</p>
                    <p className="text-xs text-muted">
                      {t('Step3.applyToChinaProductsHelp')}
                    </p>
                  </div>
                  <Switch name="applyToChinaProducts" defaultSelected />
                </div>
              </div>

              <div className="flex justify-between gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  isDisabled={step3Pending || isPending}
                  size="lg"
                >
                  {t('back')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isDisabled={step3Pending || isPending}
                  size="lg"
                >
                  {(step3Pending || isPending) ? t('loading') : t('finish')}
                </Button>
              </div>
            </form>
          )}
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
