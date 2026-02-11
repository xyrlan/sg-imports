'use client';

import { useState } from 'react';
import { TextField, Input, Label, Button, Checkbox } from '@heroui/react';
import { FormError } from '@/components/ui/form-error';
import { useCepFetch } from '../hooks/use-cep-fetch';

interface Step2AddressProps {
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  error?: string;
  onBack: () => void;
  isFinalStep: boolean;
  translations: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  isPendingTransition?: boolean;
  role: string;
}

export function Step2Address({
  onSubmit,
  isPending,
  error,
  onBack,
  isFinalStep,
  translations: t,
  isPendingTransition = false,
  role,
}: Step2AddressProps) {
  const isSeller = role === 'SELLER';

  // Billing address state
  const [postalCode, setPostalCode] = useState('');
  const [street, setStreet] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Delivery address state (OWNER only, when different from billing)
  const [sameAsDelivery, setSameAsDelivery] = useState(true);
  const [deliveryPostalCode, setDeliveryPostalCode] = useState('');
  const [deliveryStreet, setDeliveryStreet] = useState('');
  const [deliveryNeighborhood, setDeliveryNeighborhood] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryState, setDeliveryState] = useState('');

  const { fetchCEP, isLoading: fetchingCEP, error: cepError } = useCepFetch({
    onSuccess: (data) => {
      setStreet(data.logradouro || '');
      setNeighborhood(data.bairro || '');
      setCity(data.localidade || '');
      setState(data.uf || '');
    },
  });

  const {
    fetchCEP: fetchDeliveryCEP,
    isLoading: fetchingDeliveryCEP,
    error: deliveryCepError,
  } = useCepFetch({
    onSuccess: (data) => {
      setDeliveryStreet(data.logradouro || '');
      setDeliveryNeighborhood(data.bairro || '');
      setDeliveryCity(data.localidade || '');
      setDeliveryState(data.uf || '');
    },
  });

  const handleFetchCEP = () => {
    if (postalCode) {
      fetchCEP(postalCode, {
        notFound: t('Step2.cepNotFound'),
        fetchError: t('Step2.cepFetchError'),
      });
    }
  };

  const handleFetchDeliveryCEP = () => {
    if (deliveryPostalCode) {
      fetchDeliveryCEP(deliveryPostalCode, {
        notFound: t('Step2.cepNotFound'),
        fetchError: t('Step2.cepFetchError'),
      });
    }
  };

  return (
    <form action={onSubmit}>
      <input type="hidden" name="role" value={role} />
      {!isSeller && (
        <input type="hidden" name="sameAsDelivery" value={sameAsDelivery ? 'true' : 'false'} />
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">{t('Step2.title')}</h2>
        <p className="text-sm text-muted">
          {isSeller ? t('Step2.descriptionSeller') : t('Step2.description')}
        </p>
      </div>

      <FormError message={error} variant="danger" />
      <FormError message={cepError || undefined} variant="warning" />
      <FormError message={deliveryCepError || undefined} variant="warning" />

      <div className="space-y-4">
        {/* Billing / Single Address block */}
        <div className="space-y-4">
          {!isSeller && (
            <p className="text-sm font-medium text-foreground">
              {t('Step2.billingTitle')}
            </p>
          )}
          <div className="flex gap-2">
            <div className="flex-1">
              <TextField variant="primary" isDisabled={isPending} isRequired>
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
                onClick={handleFetchCEP}
                size="lg"
              >
                {fetchingCEP ? t('Step2.fetchingCEP') : t('Step2.fetchCEP')}
              </Button>
            </div>
          </div>

          <TextField variant="primary" isDisabled={isPending} isRequired>
            <Label>{t('Step2.street')}</Label>
            <Input
              name="street"
              placeholder={t('Step2.streetPlaceholder')}
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </TextField>

          <div className="grid grid-cols-2 gap-4">
            <TextField variant="primary" isDisabled={isPending} isRequired>
              <Label>{t('Step2.number')}</Label>
              <Input name="number" placeholder={t('Step2.numberPlaceholder')} />
            </TextField>

            <TextField variant="primary" isDisabled={isPending}>
              <Label>{t('Step2.complement')}</Label>
              <Input name="complement" placeholder={t('Step2.complementPlaceholder')} />
            </TextField>
          </div>

          <TextField variant="primary" isDisabled={isPending} isRequired>
            <Label>{t('Step2.neighborhood')}</Label>
            <Input
              name="neighborhood"
              placeholder={t('Step2.neighborhoodPlaceholder')}
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
            />
          </TextField>

          <div className="grid grid-cols-2 gap-4">
            <TextField variant="primary" isDisabled={isPending} isRequired>
              <Label>{t('Step2.city')}</Label>
              <Input
                name="city"
                placeholder={t('Step2.cityPlaceholder')}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </TextField>

            <TextField variant="primary" isDisabled={isPending} isRequired>
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
        </div>

        <input type="hidden" name="country" value="Brazil" />

        {/* Same as delivery checkbox - OWNER only */}
        {!isSeller && (
          <Checkbox
            isSelected={sameAsDelivery}
            onChange={setSameAsDelivery}
            variant="primary"
          >
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <Checkbox.Content>
              <Label>{t('Step2.sameAsDelivery')}</Label>
            </Checkbox.Content>
          </Checkbox>
        )}

        {/* Delivery address block - OWNER only, when different */}
        {!isSeller && !sameAsDelivery && (
          <div className="space-y-4 pt-4 border-t border-border">
            <p className="text-sm font-medium text-foreground">
              {t('Step2.deliveryTitle')}
            </p>
            <div className="flex gap-2">
              <div className="flex-1">
                <TextField variant="primary" isDisabled={isPending} isRequired>
                  <Label>{t('Step2.postalCode')}</Label>
                  <Input
                    name="deliveryPostalCode"
                    placeholder={t('Step2.postalCodePlaceholder')}
                    value={deliveryPostalCode}
                    onChange={(e) => setDeliveryPostalCode(e.target.value)}
                  />
                </TextField>
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  isDisabled={fetchingDeliveryCEP}
                  onClick={handleFetchDeliveryCEP}
                  size="lg"
                >
                  {fetchingDeliveryCEP ? t('Step2.fetchingCEP') : t('Step2.fetchCEP')}
                </Button>
              </div>
            </div>

            <TextField variant="primary" isDisabled={isPending} isRequired>
              <Label>{t('Step2.street')}</Label>
              <Input
                name="deliveryStreet"
                placeholder={t('Step2.streetPlaceholder')}
                value={deliveryStreet}
                onChange={(e) => setDeliveryStreet(e.target.value)}
              />
            </TextField>

            <div className="grid grid-cols-2 gap-4">
              <TextField variant="primary" isDisabled={isPending} isRequired>
                <Label>{t('Step2.number')}</Label>
                <Input name="deliveryNumber" placeholder={t('Step2.numberPlaceholder')} />
              </TextField>

              <TextField variant="primary" isDisabled={isPending}>
                <Label>{t('Step2.complement')}</Label>
                <Input name="deliveryComplement" placeholder={t('Step2.complementPlaceholder')} />
              </TextField>
            </div>

            <TextField variant="primary" isDisabled={isPending} isRequired>
              <Label>{t('Step2.neighborhood')}</Label>
              <Input
                name="deliveryNeighborhood"
                placeholder={t('Step2.neighborhoodPlaceholder')}
                value={deliveryNeighborhood}
                onChange={(e) => setDeliveryNeighborhood(e.target.value)}
              />
            </TextField>

            <div className="grid grid-cols-2 gap-4">
              <TextField variant="primary" isDisabled={isPending} isRequired>
                <Label>{t('Step2.city')}</Label>
                <Input
                  name="deliveryCity"
                  placeholder={t('Step2.cityPlaceholder')}
                  value={deliveryCity}
                  onChange={(e) => setDeliveryCity(e.target.value)}
                />
              </TextField>

              <TextField variant="primary" isDisabled={isPending} isRequired>
                <Label>{t('Step2.state')}</Label>
                <Input
                  name="deliveryState"
                  placeholder={t('Step2.statePlaceholder')}
                  maxLength={2}
                  value={deliveryState}
                  onChange={(e) => setDeliveryState(e.target.value)}
                />
              </TextField>
            </div>

            <input type="hidden" name="deliveryCountry" value="Brazil" />
          </div>
        )}
      </div>

      <div className="flex justify-between gap-3 mt-6">
        <Button type="button" variant="outline" onClick={onBack} isDisabled={isPending} size="lg">
          {t('back')}
        </Button>
        <Button type="submit" variant="primary" isDisabled={isPending || isPendingTransition} size="lg">
          {isPending || isPendingTransition ? t('loading') : isFinalStep ? t('finish') : t('next')}
        </Button>
      </div>
    </form>
  );
}
