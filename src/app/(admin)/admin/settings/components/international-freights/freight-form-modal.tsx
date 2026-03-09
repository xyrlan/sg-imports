'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Button,
  Checkbox,
  CheckboxGroup,
  Input,
  Label,
  ListBox,
  Modal,
  NumberField,
  Select,
  TextField,
} from '@heroui/react';
import { Ship } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { CarrierAutocomplete } from './carrier-autocomplete';
import { CONTAINER_TYPE_LABELS } from './constants';
import type { InternationalFreightWithPorts } from '@/services/admin';
import type { Port } from '@/services/admin';

interface FreightFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingFreight: InternationalFreightWithPorts | null;
  ports: Port[];
  onSubmit: (data: {
    carrierId: string;
    containerType: string;
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

  const filterPorts = (portsList: Port[], query: string) => {
    if (!query.trim()) return portsList;
    const q = query.toLowerCase().trim();
    return portsList.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.code?.toLowerCase().includes(q) ?? false)
    );
  };

  const filteredPortsOfLoading = filterPorts(ports, portOfLoadingSearch);
  const filteredPortsOfDischarge = filterPorts(ports, portOfDischargeSearch);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingFreight) {
        setCarrierId(editingFreight.carrierId ?? '');
        setContainerType(editingFreight.containerType);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!carrierId || !containerType || !value || portOfLoadingIds.size === 0 || portOfDischargeIds.size === 0) {
      setError(t('validationRequired'));
      return;
    }
    const numValue = parseFloat(value);
    if (Number.isNaN(numValue) || numValue <= 0) {
      setError(t('validationValue'));
      return;
    }
    setIsPending(true);
    try {
      const result = await onSubmit({
        carrierId,
        containerType,
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
        setError(result.error ?? t('errorSave'));
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
              <Modal.Icon className="bg-default text-foreground">
                <Ship className="size-5" />
              </Modal.Icon>
              <Modal.Heading>
                {editingFreight ? t('editFreight') : t('addFreight')}
              </Modal.Heading>
            </Modal.Header>
            <form onSubmit={handleSubmit}>
              <Modal.Body className="space-y-4 p-2">
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
                </div>

                <div className="flex flex-col gap-2">
                  <Label>{t('portsOfLoading')}</Label>
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
                  <Label>{t('portsOfDischarge')}</Label>
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

                <TextField variant="primary">
                  <Label>{t('validTo')}</Label>
                  <Input
                    type="date"
                    value={validToStr}
                    onChange={(e) => setValidToStr(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-muted mt-1">{t('validToDescription')}</p>
                </TextField>

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
