'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Button,
  Checkbox,
  CheckboxGroup,
  DateField,
  Description,
  Input,
  Label,
  ListBox,
  Modal,
  NumberField,
  Select,
  TextField,
} from '@heroui/react';
import { getLocalTimeZone, parseDate, today } from '@internationalized/date';
import { Ship } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { CarrierAutocomplete } from './carrier-autocomplete';
import { CONTAINER_TYPE_LABELS, SHIPPING_MODALITY_LABELS } from './constants';
import type { InternationalFreightWithPorts } from '@/services/admin';
import type { ShippingModalityForFreight } from '@/services/admin';
import type { Port } from '@/services/admin';

interface FreightFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingFreight: InternationalFreightWithPorts | null;
  ports: Port[];
  onSubmit: (data: {
    shippingModality: ShippingModalityForFreight;
    carrierId: string | null;
    containerType: string | null;
    value: string;
    currency: string;
    freeTimeDays: number;
    expectedProfit: string | null;
    validTo: string | null;
    portOfLoadingIds: string[];
    portOfDischargeIds: string[];
  }) => Promise<{ ok: boolean; error?: string }>;
  onSuccess: () => void;
}

export function FreightFormModal({
  isOpen,
  onOpenChange,
  editingFreight,
  ports,
  onSubmit,
  onSuccess,
}: FreightFormModalProps) {
  const t = useTranslations('Admin.Settings.InternationalFreights');
  const SHIPPING_MODALITIES: ShippingModalityForFreight[] = ['AIR', 'SEA_LCL', 'SEA_FCL', 'EXPRESS'];
  const [shippingModality, setShippingModality] = useState<ShippingModalityForFreight>('SEA_FCL');
  const [carrierId, setCarrierId] = useState('');
  const [containerType, setContainerType] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [freeTimeDays, setFreeTimeDays] = useState(0);
  const [expectedProfit, setExpectedProfit] = useState<string | null>(null);
  const [validToStr, setValidToStr] = useState<string>('');
  const [portOfLoadingIds, setPortOfLoadingIds] = useState<Set<string>>(new Set());
  const [portOfDischargeIds, setPortOfDischargeIds] = useState<Set<string>>(new Set());
  const [portOfLoadingSearch, setPortOfLoadingSearch] = useState('');
  const [portOfDischargeSearch, setPortOfDischargeSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const portsByModality = useMemo(() => {
    const targetType = shippingModality === 'AIR' ? 'AIRPORT' : 'PORT';
    return ports.filter((p) => (p.type ?? 'PORT') === targetType);
  }, [ports, shippingModality]);

  const filterPorts = (portsList: Port[], query: string) => {
    if (!query.trim()) return portsList;
    const q = query.toLowerCase().trim();
    return portsList.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code?.toLowerCase().includes(q) ?? false)
    );
  };

  const filteredPortsOfLoading = filterPorts(portsByModality, portOfLoadingSearch);
  const filteredPortsOfDischarge = filterPorts(portsByModality, portOfDischargeSearch);
  const [isPending, setIsPending] = useState(false);

  const showCarrier = shippingModality === 'SEA_FCL' || shippingModality === 'AIR';
  const showContainerType = shippingModality === 'SEA_FCL';

  useEffect(() => {
    if (isOpen) {
      if (editingFreight) {
        const modality = (editingFreight.shippingModality ?? 'SEA_FCL') as ShippingModalityForFreight;
        setShippingModality(SHIPPING_MODALITIES.includes(modality) ? modality : 'SEA_FCL');
        setCarrierId(editingFreight.carrierId ?? '');
        setContainerType(editingFreight.containerType ?? '');
        setValue(String(editingFreight.value ?? ''));
        setCurrency(editingFreight.currency ?? 'USD');
        setFreeTimeDays(editingFreight.freeTimeDays ?? 0);
        setExpectedProfit(editingFreight.expectedProfit ? String(editingFreight.expectedProfit) : null);
        setValidToStr(
          editingFreight.validTo
            ? new Date(editingFreight.validTo).toISOString().split('T')[0]
            : ''
        );
        setPortOfLoadingIds(new Set(editingFreight.portsOfLoading.map((p) => p.id)));
        setPortOfDischargeIds(new Set(editingFreight.portsOfDischarge.map((p) => p.id)));
      } else {
        setShippingModality('SEA_FCL');
        setCarrierId('');
        setContainerType('');
        setValue('');
        setCurrency('USD');
        setFreeTimeDays(0);
        setExpectedProfit(null);
        setValidToStr('');
        setPortOfLoadingIds(new Set());
        setPortOfDischargeIds(new Set());
      }
      setPortOfLoadingSearch('');
      setPortOfDischargeSearch('');
      setError(null);
    }
  }, [isOpen, editingFreight]);

  const handleModalityChange = (modality: ShippingModalityForFreight) => {
    setShippingModality(modality);
    setPortOfLoadingIds(new Set());
    setPortOfDischargeIds(new Set());
    if (modality === 'SEA_LCL' || modality === 'EXPRESS') {
      setCarrierId('');
      setContainerType('');
    } else if (modality === 'AIR') {
      setContainerType('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!value || portOfLoadingIds.size === 0 || portOfDischargeIds.size === 0) {
      setError(t('validationRequired'));
      return;
    }
    if (showCarrier && !carrierId) {
      setError(t('validationCarrierRequired'));
      return;
    }
    if (showContainerType && !containerType) {
      setError(t('validationContainerRequired'));
      return;
    }
    const numValue = parseFloat(value);
    if (Number.isNaN(numValue) || numValue <= 0) {
      setError(t('validationValue'));
      return;
    }
    const finalCarrierId = showCarrier ? carrierId : null;
    const finalContainerType = showContainerType ? containerType : null;
    setIsPending(true);
    try {
      const result = await onSubmit({
        shippingModality,
        carrierId: finalCarrierId || null,
        containerType: finalContainerType || null,
        value,
        currency,
        freeTimeDays,
        expectedProfit: expectedProfit && expectedProfit.trim() !== '' ? expectedProfit : null,
        validTo: validToStr && validToStr.trim() !== '' ? validToStr : null,
        portOfLoadingIds: Array.from(portOfLoadingIds),
        portOfDischargeIds: Array.from(portOfDischargeIds),
      });
      if (result.ok) {
        onSuccess();
        onOpenChange(false);
      } else {
        setError(
          result.error === 'validationDuplicateCarrierContainer'
            ? t('validationDuplicateCarrierContainer')
            : (result.error ?? t('errorSave'))
        );
      }
    } finally {
      setIsPending(false);
    }
  };

  const containerTypes = ['GP_20', 'GP_40', 'HC_40', 'RF_20', 'RF_40'];

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange} isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="max-w-xl overflow-y-auto">
            <Modal.CloseTrigger />
            <Modal.Header className="mb-6">
              <Modal.Icon className="bg-surface text-foreground">
                <Ship className="size-5" />
              </Modal.Icon>
              <Modal.Heading>
                {editingFreight ? t('editFreight') : t('addFreight')}
              </Modal.Heading>
            </Modal.Header>
            <form onSubmit={handleSubmit}>
              <Modal.Body className="space-y-4 p-2">
                <div className="flex flex-col gap-2">
                  <Label>{t('shippingModality')}</Label>
                  <Select
                    placeholder={t('shippingModalityPlaceholder')}
                    value={shippingModality}
                    onChange={(k) => handleModalityChange((k as ShippingModalityForFreight) ?? 'SEA_FCL')}
                    variant="primary"
                    isRequired
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {SHIPPING_MODALITIES.map((mod) => (
                          <ListBox.Item key={mod} id={mod} textValue={SHIPPING_MODALITY_LABELS[mod] ?? mod}>
                            {SHIPPING_MODALITY_LABELS[mod] ?? mod}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>

                {showCarrier && (
                  <TextField variant="primary" isRequired>
                    <Label>{t('carrier')}</Label>
                    <CarrierAutocomplete
                      placeholder={t('carrierPlaceholder')}
                      value={carrierId || null}
                      onChange={(k) => setCarrierId(k ?? '')}
                      fullWidth
                      variant="primary"
                      selectedCarrierId={carrierId || null}
                    />
                  </TextField>
                )}

                {showContainerType && (
                  <div className="flex flex-col gap-2">
                    <Label>{t('containerType')}</Label>
                    <Select
                      placeholder={t('containerTypePlaceholder')}
                      value={containerType || null}
                      onChange={(k) => setContainerType(k ? String(k) : '')}
                      variant="primary"
                      isRequired
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {containerTypes.map((ct) => (
                            <ListBox.Item key={ct} id={ct} textValue={CONTAINER_TYPE_LABELS[ct] ?? ct}>
                              {CONTAINER_TYPE_LABELS[ct] ?? ct}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <TextField variant="primary" isRequired>
                    <Label>{t('value')}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder="0.00"
                    />
                  </TextField>
                  <div className="flex flex-col gap-2">
                    <Label>{t('currency')}</Label>
                  <Select
                    value={currency}
                    onChange={(k) => setCurrency(k ? String(k) : 'USD')}
                    variant="primary"
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        <ListBox.Item key="USD" id="USD" textValue="USD">
                          USD
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                        <ListBox.Item key="BRL" id="BRL" textValue="BRL">
                          BRL
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      </ListBox>
                    </Select.Popover>
                  </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                <TextField variant="primary">
                    <Label>{t('expectedProfit')}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={expectedProfit ?? ''}
                      onChange={(e) =>
                        setExpectedProfit(e.target.value.trim() === '' ? null : e.target.value)
                      }
                      placeholder={t('expectedProfitPlaceholder')}
                    />
                  </TextField>
                  <NumberField
                    variant="primary"
                    value={freeTimeDays}
                    onChange={(v) => setFreeTimeDays(v ?? 0)}
                    minValue={0}
                  >
                    <Label>{t('freeTimeDays')}</Label>
                    <NumberField.Group>
                      <NumberField.Input />
                    </NumberField.Group>
                  </NumberField>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>{shippingModality === 'AIR' ? t('airportsOfLoading') : t('portsOfLoading')}</Label>
                  <p className="text-xs text-muted">{t('portsSearchHint')}</p>
                  <Input
                    placeholder={t('portsSearchPlaceholder')}
                    value={portOfLoadingSearch}
                    onChange={(e) => setPortOfLoadingSearch(e.target.value)}
                    variant="primary"
                    className="mb-1"
                  />
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                    <CheckboxGroup
                      name="portOfLoading"
                      value={Array.from(portOfLoadingIds)}
                      onChange={(vals) => setPortOfLoadingIds(new Set(vals))}
                      className="flex flex-col gap-2"
                      isRequired
                    >
                      {filteredPortsOfLoading.map((p) => (
                        <Checkbox key={p.id} value={p.id}>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <Checkbox.Content>
                            <Label>
                              {p.name} {p.code && `(${p.code})`}
                            </Label>
                          </Checkbox.Content>
                        </Checkbox>
                      ))}
                    </CheckboxGroup>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>{shippingModality === 'AIR' ? t('airportsOfDischarge') : t('portsOfDischarge')}</Label>
                  <p className="text-xs text-muted">{t('portsSearchHint')}</p>
                  <Input
                    placeholder={t('portsSearchPlaceholder')}
                    value={portOfDischargeSearch}
                    onChange={(e) => setPortOfDischargeSearch(e.target.value)}
                    variant="primary"
                    className="mb-1"
                  />
                  <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                    <CheckboxGroup
                      name="portOfDischarge"
                      value={Array.from(portOfDischargeIds)}
                      onChange={(vals) => setPortOfDischargeIds(new Set(vals))}
                      className="flex flex-col gap-2"
                      isRequired
                    >
                      {filteredPortsOfDischarge.map((p) => (
                        <Checkbox key={p.id} value={p.id}>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <Checkbox.Content>
                            <Label>
                              {p.name} {p.code && `(${p.code})`}
                            </Label>
                          </Checkbox.Content>
                        </Checkbox>
                      ))}
                    </CheckboxGroup>
                  </div>
                </div>

                <DateField
                  value={validToStr ? parseDate(validToStr) : null}
                  onChange={(v) => setValidToStr(v?.toString() ?? '')}
                  minValue={today(getLocalTimeZone())}
                >
                  <Label>{t('validTo')}</Label>
                  <DateField.Group variant="primary">
                    <DateField.Input>
                      {(segment) => (
                        <DateField.Segment segment={segment} />
                      )}
                    </DateField.Input>
                  </DateField.Group>
                  <Description>{t('validToDescription')}</Description>
                </DateField>

                {error && <FormError message={error} />}
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="outline" slot="close" onPress={() => onOpenChange(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit" variant="primary" isPending={isPending}>
                  {editingFreight ? t('update') : t('create')}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
