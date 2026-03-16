'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import {
  Button,
  DateField,
  DateInputGroup,
  Description,
  Input,
  Label,
  ListBox,
  Modal,
  Radio,
  RadioGroup,
  Select,
  TextField,
  toast,
} from '@heroui/react';
import { parseDate } from '@internationalized/date';
import { DollarSign, Plus, X } from 'lucide-react';
import { CarrierAutocomplete } from '../international-freights/carrier-autocomplete';
import {
  createPricingRuleAction,
  updatePricingRuleAction,
} from './actions';
import type { PricingRuleWithRelations, Port } from './types';

const CURRENCIES = ['BRL', 'USD', 'CNY'] as const;
const BASIS_OPTIONS = ['PER_BL', 'PER_CONTAINER'] as const;

interface PricingItemRow {
  id: string;
  name: string;
  amount: string;
  currency: (typeof CURRENCIES)[number];
  basis: (typeof BASIS_OPTIONS)[number];
}

function getInitialFormState(source: PricingRuleWithRelations | null) {
  if (!source) {
    return {
      scope: 'SPECIFIC' as const,
      carrierId: '',
      portId: '',
      containerType: '',
      portDirection: 'BOTH' as const,
      validFrom: new Date().toISOString().split('T')[0],
      validTo: '',
      items: [{ id: crypto.randomUUID(), name: '', amount: '', currency: 'BRL' as const, basis: 'PER_CONTAINER' as const }],
    };
  }
  return {
    scope: source.scope as 'CARRIER' | 'PORT' | 'SPECIFIC',
    carrierId: source.carrierId,
    portId: source.portId ?? '',
    containerType: source.containerType ?? '',
    portDirection: (source.portDirection as 'ORIGIN' | 'DESTINATION' | 'BOTH') ?? 'BOTH',
    validFrom: source.validFrom
      ? new Date(source.validFrom).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    validTo: source.validTo ? new Date(source.validTo).toISOString().split('T')[0] : '',
    items:
      source.items.length > 0
        ? source.items.map((item) => ({
            id: crypto.randomUUID(),
            name: item.name,
            amount: String(Number(item.amount)),
            currency: (item.currency as (typeof CURRENCIES)[number]) ?? 'BRL',
            basis: (item.basis === 'PER_BL' || item.basis === 'PER_CONTAINER'
              ? item.basis
              : 'PER_CONTAINER') as (typeof BASIS_OPTIONS)[number],
          }))
        : [{ id: crypto.randomUUID(), name: '', amount: '', currency: 'BRL' as const, basis: 'PER_CONTAINER' as const }],
  };
}

interface PricingRuleFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  editingRule: PricingRuleWithRelations | null;
  duplicatingFrom: PricingRuleWithRelations | null;
  ports: Port[];
}

const CONTAINER_TYPES_KEYS = ['GP_20', 'GP_40', 'HC_40', 'RF_20', 'RF_40'] as const;

function PricingRuleFormContent({
  initialSource,
  editingRule,
  duplicatingFrom,
  ports,
  onSave,
  onOpenChange,
}: {
  initialSource: PricingRuleWithRelations | null;
  editingRule: PricingRuleWithRelations | null;
  duplicatingFrom: PricingRuleWithRelations | null;
  ports: Port[];
  onSave: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations('Admin.Settings.FreightTaxas');
  const [isPending, startTransition] = useTransition();
  const initialState = getInitialFormState(initialSource);
  const [scope, setScope] = useState<'CARRIER' | 'PORT' | 'SPECIFIC'>(initialState.scope);
  const [carrierId, setCarrierId] = useState(initialState.carrierId);
  const [portId, setPortId] = useState(initialState.portId);
  const [containerType, setContainerType] = useState(initialState.containerType);
  const [portDirection, setPortDirection] = useState<'ORIGIN' | 'DESTINATION' | 'BOTH'>(initialState.portDirection);
  const [validFrom, setValidFrom] = useState(initialState.validFrom);
  const [validTo, setValidTo] = useState(initialState.validTo);
  const [items, setItems] = useState<PricingItemRow[]>(initialState.items);
  const [error, setError] = useState<string | null>(null);

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: '', amount: '', currency: 'BRL', basis: 'PER_CONTAINER' },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof PricingItemRow, value: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!carrierId) {
      setError(t('validation.carrierRequired'));
      return;
    }
    if ((scope === 'PORT' || scope === 'SPECIFIC') && !portId) {
      setError(t('validation.portRequired'));
      return;
    }
    if (scope === 'SPECIFIC' && !containerType) {
      setError(t('validation.containerRequired'));
      return;
    }
    if (!validFrom) {
      setError(t('validation.validFromRequired'));
      return;
    }

    const validItems = items.filter((i) => i.name.trim() && i.amount && parseFloat(i.amount) > 0);
    if (validItems.length === 0) {
      setError(t('validation.itemsRequired'));
      return;
    }

    const payload = {
      scope,
      carrierId,
      portId: scope === 'CARRIER' ? undefined : portId || undefined,
      containerType: scope === 'SPECIFIC' ? containerType || undefined : undefined,
      portDirection: scope === 'PORT' || scope === 'SPECIFIC' ? portDirection : 'BOTH',
      validFrom,
      validTo: validTo.trim() || null,
      items: validItems.map((i) => ({
        name: i.name.trim(),
        amount: parseFloat(i.amount),
        currency: i.currency,
        basis: i.basis,
      })),
    };

    startTransition(async () => {
      if (editingRule) {
        const result = await updatePricingRuleAction(editingRule.id, {
          portDirection: payload.portDirection,
          validFrom: payload.validFrom,
          validTo: payload.validTo,
          items: payload.items,
        });
        if (result.ok) {
          toast.success(t('toast.updateSuccess'));
          onSave();
          onOpenChange(false);
        } else {
          setError(result.error ?? t('validation.errorUpdate'));
        }
      } else {
        const result = await createPricingRuleAction(payload);
        if (result.ok) {
          toast.success(t('toast.createSuccess'));
          onSave();
          onOpenChange(false);
        } else {
          setError(result.error ?? t('validation.errorCreate'));
        }
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
              <Modal.Body className="space-y-4 p-2">
                {duplicatingFrom && (
                  <div className="rounded-lg border border-primary-200 bg-primary-50 p-2 text-primary-800 text-xs">
                    {t('duplicatingHint')}
                  </div>
                )}

                <div>
                  <Label className="mb-2 block text-sm font-medium">{t('ruleLevel')}</Label>
                  <RadioGroup
                    isDisabled={!!editingRule}
                    value={scope}
                    onChange={(v) => {
                      setScope(v as 'CARRIER' | 'PORT' | 'SPECIFIC');
                      if (v === 'CARRIER') {
                        setPortId('');
                        setContainerType('');
                      } else if (v === 'PORT') {
                        setContainerType('');
                      }
                    }}
                  >
                    <Radio value="CARRIER">
                      <Radio.Control>
                        <Radio.Indicator />
                      </Radio.Control>
                      <Radio.Content>
                        <Label>{t('levelCarrier')}</Label>
                        <span className="text-xs text-muted">{t('levelCarrierHint')}</span>
                      </Radio.Content>
                    </Radio>
                    <Radio value="PORT">
                      <Radio.Control>
                        <Radio.Indicator />
                      </Radio.Control>
                      <Radio.Content>
                        <Label>{t('levelPort')}</Label>
                        <span className="text-xs text-muted">{t('levelPortHint')}</span>
                      </Radio.Content>
                    </Radio>
                    <Radio value="SPECIFIC">
                      <Radio.Control>
                        <Radio.Indicator />
                      </Radio.Control>
                      <Radio.Content>
                        <Label>{t('levelSpecific')}</Label>
                        <span className="text-xs text-muted">{t('levelSpecificHint')}</span>
                      </Radio.Content>
                    </Radio>
                  </RadioGroup>
                </div>

                <TextField variant="primary" isRequired>
                  <Label>{t('carrier')}</Label>
                  <CarrierAutocomplete
                    placeholder={t('carrierPlaceholder')}
                    value={carrierId || null}
                    onChange={(k) => setCarrierId(k ?? '')}
                    fullWidth
                    variant="primary"
                    selectedCarrierId={editingRule || duplicatingFrom ? carrierId || null : null}
                  />
                </TextField>

                {(scope === 'PORT' || scope === 'SPECIFIC') && (
                  <>
                    <div className="flex flex-col gap-2">
                      <Label>{t('port')}</Label>
                      <Select
                        placeholder={t('portPlaceholder')}
                        value={portId || null}
                        onChange={(k) => setPortId(k ? String(k) : '')}
                        variant="primary"
                        isRequired
                      >
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {ports.filter((p) => (p.type ?? 'PORT') === 'PORT').map((p) => (
                              <ListBox.Item key={p.id} id={p.id} textValue={p.code ? `${p.name} (${p.code})` : p.name}>
                                {p.code ? `${p.name} (${p.code})` : p.name}
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>

                    <div>
                      <Label className="mb-2 block text-sm font-medium">{t('portDirection')}</Label>
                      <RadioGroup
                        value={portDirection}
                        onChange={(v) => setPortDirection(v as 'ORIGIN' | 'DESTINATION' | 'BOTH')}
                      >
                        <Radio value="ORIGIN">
                          <Radio.Control>
                            <Radio.Indicator />
                          </Radio.Control>
                          <Radio.Content>
                            <Label>{t('portDirectionOrigin')}</Label>
                          </Radio.Content>
                        </Radio>
                        <Radio value="DESTINATION">
                          <Radio.Control>
                            <Radio.Indicator />
                          </Radio.Control>
                          <Radio.Content>
                            <Label>{t('portDirectionDestination')}</Label>
                          </Radio.Content>
                        </Radio>
                        <Radio value="BOTH">
                          <Radio.Control>
                            <Radio.Indicator />
                          </Radio.Control>
                          <Radio.Content>
                            <Label>{t('portDirectionBoth')}</Label>
                          </Radio.Content>
                        </Radio>
                      </RadioGroup>
                    </div>
                  </>
                )}

                {scope === 'SPECIFIC' && (
                  <div className="flex flex-col gap-2">
                    <Label>{t('container')}</Label>
                    <Select
                      placeholder={t('containerPlaceholder')}
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
                          {CONTAINER_TYPES_KEYS.map((ct) => (
                            <ListBox.Item key={ct} id={ct} textValue={t(`containerTypes.${ct}`)}>
                              {t(`containerTypes.${ct}`)}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <DateField
                    isRequired
                    value={validFrom ? parseDate(validFrom) : null}
                    onChange={(v) => setValidFrom(v?.toString() ?? '')}
                  >
                    <Label>{t('validFrom')}</Label>
                    <DateInputGroup variant="primary">
                      <DateInputGroup.Input>
                        {(segment) => (
                          <DateInputGroup.Segment segment={segment} />
                        )}
                      </DateInputGroup.Input>
                    </DateInputGroup>
                  </DateField>
                  <DateField
                    value={validTo ? parseDate(validTo) : null}
                    onChange={(v) => setValidTo(v?.toString() ?? '')}
                  >
                    <Label>{t('validTo')}</Label>
                    <DateInputGroup variant="primary">
                      <DateInputGroup.Input>
                        {(segment) => (
                          <DateInputGroup.Segment segment={segment} />
                        )}
                      </DateInputGroup.Input>
                    </DateInputGroup>
                    <Description>{t('validToHint')}</Description>
                  </DateField>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{t('priceItems')}</Label>
                    <Button type="button" variant="secondary"  onPress={addItem}>
                      <Plus size={14} className="mr-1" />
                      {t('addItem')}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-2 items-start">
                        <div className="flex-1 grid gap-1 grid-cols-12">
                          <div className="col-span-4">
                            <Input
                              placeholder={t('itemNamePlaceholder')}
                              value={item.name}
                              onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                              className="max-w-full"
                            />
                          </div>
                          <div className="col-span-3">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder={t('amountPlaceholder')}
                              value={item.amount}
                              onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                              className="max-w-full"
                            />
                          </div>
                          <div className="col-span-2 ">
                            <Select
                              value={item.currency}
                              onChange={(k) => updateItem(item.id, 'currency', k ? String(k) : 'BRL')}
                            >
                              <Select.Trigger>
                                <Select.Value />
                                <Select.Indicator />
                              </Select.Trigger>
                              <Select.Popover>
                                <ListBox>
                                  {CURRENCIES.map((c) => (
                                    <ListBox.Item key={c} id={c} textValue={c}>
                                      {c}
                                      <ListBox.ItemIndicator />
                                    </ListBox.Item>
                                  ))}
                                </ListBox>
                              </Select.Popover>
                            </Select>
                          </div>
                          <div className="col-span-3">
                            <Select
                              value={item.basis}
                              onChange={(k) =>
                                updateItem(item.id, 'basis', k ? String(k) : 'PER_CONTAINER')
                              }
                            >
                              <Select.Trigger>
                                <Select.Value />
                                <Select.Indicator />
                              </Select.Trigger>
                              <Select.Popover>
                                <ListBox>
                                  <ListBox.Item key="PER_CONTAINER" id="PER_CONTAINER" textValue={t('perContainer')}>
                                    {t('perContainer')}
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                  <ListBox.Item key="PER_BL" id="PER_BL" textValue={t('perBl')}>
                                    {t('perBl')}
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                </ListBox>
                              </Select.Popover>
                            </Select>
                          </div>
                        </div>
                        {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          isIconOnly
                          onPress={() => removeItem(item.id)}
                        >
                            <X size={16} />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-danger-200 bg-danger-50 p-2 text-danger-700 text-sm">
                    {error}
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="outline" slot="close" onPress={() => onOpenChange(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit" variant="primary" isPending={isPending}>
                  {editingRule ? t('update') : t('create')}
                </Button>
              </Modal.Footer>
            </form>
  );
}

export function PricingRuleFormModal({
  isOpen,
  onOpenChange,
  onSave,
  editingRule,
  duplicatingFrom,
  ports,
}: PricingRuleFormModalProps) {
  const t = useTranslations('Admin.Settings.FreightTaxas');
  const source = editingRule ?? duplicatingFrom;
  const formKey = isOpen ? `${source?.id ?? 'new'}` : 'closed';

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange} isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="max-w-3xl overflow-y-auto">
            <Modal.CloseTrigger />
            <Modal.Header className="mb-6">
              <Modal.Icon className="bg-default text-foreground">
                <DollarSign className="size-5" />
              </Modal.Icon>
              <Modal.Heading>
                {editingRule
                  ? t('editRule')
                  : duplicatingFrom
                    ? t('duplicateRule')
                    : t('newRule')}
              </Modal.Heading>
            </Modal.Header>
            {isOpen && (
              <PricingRuleFormContent
                key={formKey}
                initialSource={source}
                editingRule={editingRule}
                duplicatingFrom={duplicatingFrom}
                ports={ports}
                onSave={onSave}
                onOpenChange={onOpenChange}
              />
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
