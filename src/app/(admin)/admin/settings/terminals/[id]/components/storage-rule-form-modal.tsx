'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Button,
  Input,
  Label,
  Modal,
  TextField,
  Select,
  ListBox,
  NumberField,
  RadioGroup,
  Radio,
  Surface,
} from '@heroui/react';
import { Plus, X } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { useActionState, startTransition, useRef } from 'react';
import {
  createStorageRuleAction,
  updateStorageRuleAction,
  type StorageRuleActionState,
} from '../actions';
import type { StorageRuleWithPeriods } from './storage-rule-card';
import type { StorageRuleAdditionalFee } from '@/db/schema';
import type { StoragePeriod } from '@/services/admin';
import {
  getContainerTypeLabel,
  getFeeBasisLabel,
} from '@/lib/storage-utils';

const CONTAINER_TYPES = ['GP_20', 'GP_40', 'HC_40', 'RF_20', 'RF_40'] as const;
const SHIPMENT_TYPES = ['FCL', 'LCL', 'FCL_PARTIAL'] as const;
const FEE_BASIS = ['PER_BOX', 'PER_BL', 'PER_WM', 'PER_CONTAINER'] as const;

interface PeriodRow {
  daysFrom: number;
  daysTo: number | null;
  chargeType: 'PERCENTAGE' | 'FIXED';
  rate: string;
  isDailyRate: boolean;
}

interface FeeRow {
  name: string;
  value: number;
  basis: StorageRuleAdditionalFee['basis'];
}

interface StorageRuleFormModalProps {
  isOpen: boolean;
  terminalId: string;
  editingRule?: StorageRuleWithPeriods | null;
  duplicatingFrom?: StorageRuleWithPeriods | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function StorageRuleFormModal({
  isOpen,
  terminalId,
  editingRule,
  duplicatingFrom,
  onClose,
  onSuccess,
}: StorageRuleFormModalProps) {
  const t = useTranslations('Admin.Settings.Terminals');
  const isEditing = !!editingRule;
  const isDuplicating = !!duplicatingFrom;
  const sourceRule = editingRule ?? duplicatingFrom;

  const [shipmentType, setShipmentType] = useState<'FCL' | 'FCL_PARTIAL' | 'LCL'>('FCL');
  const [containerType, setContainerType] = useState<string>('GP_20');
  const [minValue, setMinValue] = useState<number>(0);
  const [cifInsurance, setCifInsurance] = useState<number>(0);
  const [periods, setPeriods] = useState<PeriodRow[]>([
    { daysFrom: 1, daysTo: 10, chargeType: 'PERCENTAGE', rate: '0', isDailyRate: false },
  ]);
  const [additionalFees, setAdditionalFees] = useState<FeeRow[]>([]);

  const [createState, createAction, createPending] = useActionState<StorageRuleActionState, FormData>(
    createStorageRuleAction,
    null,
  );
  const [updateState, updateAction, updatePending] = useActionState<StorageRuleActionState, FormData>(
    updateStorageRuleAction.bind(null, terminalId),
    null,
  );

  const state = isEditing ? updateState : createState;
  const action = isEditing ? updateAction : createAction;
  const isPending = isEditing ? updatePending : createPending;
  const prevPendingRef = useRef(false);

  useEffect(() => {
    if (sourceRule && isOpen) {
      queueMicrotask(() => {
        setShipmentType((sourceRule.shipmentType as 'FCL' | 'FCL_PARTIAL' | 'LCL') ?? 'FCL');
        setContainerType(sourceRule.containerType ?? 'GP_20');
        setMinValue(Number(sourceRule.minValue ?? 0));
        setCifInsurance(Number(sourceRule.cifInsurance ?? 0));
        setAdditionalFees(
          ((sourceRule.additionalFees ?? []) as StorageRuleAdditionalFee[]).map((f) => ({
            name: f.name,
            value: Number(f.value),
            basis: f.basis,
          })),
        );
        setPeriods(
          (sourceRule.periods ?? []).map((p: StoragePeriod) => ({
            daysFrom: p.daysFrom,
            daysTo: p.daysTo,
            chargeType: (p.chargeType ?? 'PERCENTAGE') as 'PERCENTAGE' | 'FIXED',
            rate: p.rate ?? '0',
            isDailyRate: p.isDailyRate ?? true,
          })),
        );
      });
    } else if (isOpen && !sourceRule) {
      queueMicrotask(() => {
        setShipmentType('FCL');
        setContainerType('GP_20');
        setMinValue(0);
        setCifInsurance(0);
        setAdditionalFees([]);
        setPeriods([{ daysFrom: 1, daysTo: 10, chargeType: 'PERCENTAGE', rate: '0', isDailyRate: false }]);
      });
    }
  }, [sourceRule, isOpen]);

  useEffect(() => {
    const justCompleted = prevPendingRef.current && !isPending && state?.ok;
    prevPendingRef.current = isPending;
    if (justCompleted) {
      onSuccess();
      onClose();
    }
  }, [state?.ok, isPending, onSuccess, onClose]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set('terminalId', terminalId);
    formData.set('containerType', shipmentType === 'FCL' ? containerType : '');
    formData.set('shipmentType', shipmentType);
    formData.set('minValue', String(minValue));
    formData.set('cifInsurance', String(cifInsurance));
    formData.set('additionalFeesJson', JSON.stringify(additionalFees));
    formData.set('periodsJson', JSON.stringify(periods));
    if (isEditing && editingRule) {
      formData.set('ruleId', editingRule.id);
    }
    startTransition(() => {
      action(formData);
    });
  };

  const addPeriod = () => {
    const last = periods[periods.length - 1];
    const newDaysFrom = last ? (last.daysTo ?? last.daysFrom) + 1 : 1;
    setPeriods((prev) => [
      ...prev,
      { daysFrom: newDaysFrom, daysTo: newDaysFrom + 10, chargeType: 'PERCENTAGE', rate: '0', isDailyRate: false },
    ]);
  };

  const removePeriod = (idx: number) => {
    if (periods.length <= 1) return;
    setPeriods((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePeriod = (idx: number, field: keyof PeriodRow, value: PeriodRow[keyof PeriodRow]) => {
    setPeriods((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)),
    );
  };

  const addFee = () => {
    setAdditionalFees((prev) => [...prev, { name: '', value: 0, basis: 'PER_CONTAINER' }]);
  };

  const removeFee = (idx: number) => {
    setAdditionalFees((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateFee = (idx: number, field: keyof FeeRow, value: FeeRow[keyof FeeRow]) => {
    setAdditionalFees((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, [field]: value } : f)),
    );
  };

  const modalTitle = isEditing
    ? t('StorageRuleForm.edit')
    : isDuplicating
      ? t('StorageRuleForm.duplicate')
      : t('StorageRuleForm.create');

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={(open) => !open && onClose()} isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <Modal.CloseTrigger />
            <Modal.Header className="mb-6">
              <Modal.Heading>{modalTitle}</Modal.Heading>
            </Modal.Header>
            <form onSubmit={handleSubmit}>
              <Modal.Body className="p-2 space-y-6">
                <input type="hidden" name="terminalId" value={terminalId} />
                {isEditing && editingRule && (
                  <input type="hidden" name="ruleId" value={editingRule.id} />
                )}

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-default-700 border-b pb-2">
                    {t('StorageRuleForm.generalConfig')}
                  </h4>

                  <div className="flex flex-col gap-2">
                    <Label>{t('StorageRuleForm.shipmentType')}</Label>
                    <RadioGroup
                      orientation="horizontal"
                      value={shipmentType}
                      onChange={(v) => setShipmentType(v as 'FCL' | 'LCL' | 'FCL_PARTIAL')}
                    >
                      {SHIPMENT_TYPES.map((st) => (
                        <Radio key={st} value={st}>
                          <Radio.Control>
                            <Radio.Indicator />
                          </Radio.Control>
                          <Radio.Content>
                            <Label>
                              {st === 'FCL'
                                ? t('StorageRules.fcl')
                                : st === 'FCL_PARTIAL'
                                  ? t('StorageRules.fclPartial')
                                  : t('StorageRules.lcl')}
                            </Label>
                          </Radio.Content>
                        </Radio>
                      ))}
                    </RadioGroup>
                  </div>

                  {shipmentType === 'FCL' && (
                    <div className="flex flex-col gap-2">
                      <Label>{t('StorageRuleForm.containerType')}</Label>
                      <Select
                        variant="primary"
                        value={containerType}
                        onChange={(key) => key != null && setContainerType(key as string)}
                      >
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {CONTAINER_TYPES.map((ct) => (
                              <ListBox.Item key={ct} id={ct} textValue={getContainerTypeLabel(ct)}>
                                {getContainerTypeLabel(ct)}
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <NumberField
                      variant="primary"
                      minValue={0}
                      value={minValue}
                      onChange={(v) => setMinValue(v ?? 0)}
                      formatOptions={{
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }}
                    >
                      <Label>{t('StorageRuleForm.minValue')}</Label>
                      <NumberField.Group>
                        <NumberField.Input className="w-32" />
                      </NumberField.Group>
                    </NumberField>
                    {shipmentType === 'LCL' && (
                      <NumberField
                        variant="primary"
                        minValue={0}
                        value={cifInsurance}
                        onChange={(v) => setCifInsurance(v ?? 0)}
                        formatOptions={{
                          style: 'percent',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }}
                      >
                        <Label>{t('StorageRuleForm.cifInsurance')}</Label>
                        <NumberField.Group>
                          <NumberField.Input className="w-32" />
                        </NumberField.Group>
                      </NumberField>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-default-700">{t('StorageRuleForm.periods')}</h4>
                    </div>
                    <Button size="sm" variant="outline" onPress={addPeriod}>
                      <Plus size={14} />
                      {t('StorageRuleForm.addPeriod')}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {periods.map((p, idx) => (
                      <Surface key={idx} className="p-3 space-y-3" variant='secondary'>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-default-600">
                            {t('StorageRuleForm.periods')} #{idx + 1}
                          </span>
                          {periods.length > 1 && (
                            <Button
                              isIconOnly
                              size="sm"
                              variant="ghost"
                              onPress={() => removePeriod(idx)}
                            >
                              <X size={14} />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-2 flex flex-col gap-1">
                            <NumberField
                              variant="primary"
                              minValue={0}
                              value={p.daysFrom}
                              onChange={(v) => updatePeriod(idx, 'daysFrom', v ?? 0)}
                            >
                              <Label className="text-xs">{t('StorageRuleForm.daysFrom')}</Label>
                              <NumberField.Group>
                                <NumberField.DecrementButton />
                                <NumberField.Input className="w-full" />
                                <NumberField.IncrementButton />
                              </NumberField.Group>
                            </NumberField>
                          </div>
                          <div className="col-span-2 flex flex-col gap-1">
                            <NumberField
                              variant="primary"
                              minValue={0}
                              value={p.daysTo ?? undefined}
                              onChange={(v) => updatePeriod(idx, 'daysTo', v ?? null)}
                            >
                              <Label className="text-xs">{t('StorageRuleForm.daysTo')}</Label>
                              <NumberField.Group>
                                <NumberField.DecrementButton />
                                <NumberField.Input className="w-full" placeholder="∞" />
                                <NumberField.IncrementButton />
                              </NumberField.Group>
                            </NumberField>
                          </div>
                          <div className="col-span-3 flex flex-col gap-1">
                            <Label className="text-xs">{t('StorageRuleForm.chargeType')}</Label>
                            <Select
                              variant="primary"
                              value={p.chargeType}
                              onChange={(key) =>
                                key != null && updatePeriod(idx, 'chargeType', key as 'PERCENTAGE' | 'FIXED')
                              }
                            >
                              <Select.Trigger>
                                <Select.Value />
                                <Select.Indicator />
                              </Select.Trigger>
                              <Select.Popover>
                                <ListBox>
                                  <ListBox.Item key="PERCENTAGE" id="PERCENTAGE" textValue="%">
                                    {t('StorageRuleForm.percentage')}
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                  <ListBox.Item key="FIXED" id="FIXED" textValue="Fixo">
                                    {t('StorageRuleForm.fixed')}
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                </ListBox>
                              </Select.Popover>
                            </Select>
                          </div>
                          <div className="col-span-2 flex flex-col gap-1">
                            <NumberField
                              variant="primary"
                              minValue={0}
                              value={
                                p.chargeType === 'PERCENTAGE'
                                  ? parseFloat(p.rate) || 0
                                  : parseFloat(p.rate) || 0
                              }
                              onChange={(v) => updatePeriod(idx, 'rate', String(v ?? 0))}
                              formatOptions={
                                p.chargeType === 'PERCENTAGE'
                                  ? { style: 'percent', maximumFractionDigits: 2 }
                                  : {
                                      style: 'decimal',
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    }
                              }
                            >
                              <Label className="text-xs">{t('StorageRuleForm.rate')}</Label>
                              <NumberField.Group>
                                <NumberField.Input className="w-full" />
                              </NumberField.Group>
                            </NumberField>
                          </div>
                          <div className="col-span-3 flex items-center ml-4">
                            <RadioGroup
                              value={p.isDailyRate ? 'daily' : 'period'}
                              onChange={(v) => updatePeriod(idx, 'isDailyRate', v === 'daily')}
                              orientation="horizontal"
                            >
                              <Radio value="period">
                                <Radio.Control>
                                  <Radio.Indicator />
                                </Radio.Control>
                                <Radio.Content>
                                  <Label>{t('StorageRuleForm.perPeriod')}</Label>
                                </Radio.Content>
                              </Radio>
                              <Radio value="daily">
                                <Radio.Control>
                                  <Radio.Indicator />
                                </Radio.Control>
                                <Radio.Content>
                                  <Label>{t('StorageRuleForm.isDailyRate')}</Label>
                                </Radio.Content>
                              </Radio>
                            </RadioGroup>
                          </div>
                        </div>
                      </Surface>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="text-sm font-semibold text-default-700">{t('StorageRuleForm.additionalFees')}</h4>
                    <Button size="sm" variant="outline" onPress={addFee}>
                      <Plus size={14} />
                      {t('StorageRuleForm.addFee')}
                    </Button>
                  </div>
                  {additionalFees.length === 0 ? (
                    <p className="text-sm text-default-500 text-center py-4">
                      {t('StorageRules.noAdditionalFees')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {additionalFees.map((f, idx) => (
                        <Surface key={idx} className="grid grid-cols-12 gap-2 p-3" variant="secondary">
                          <div className="col-span-5 flex flex-col gap-1">
                            <TextField variant="primary">
                              <Label className="text-xs">{t('StorageRuleForm.feeName')}</Label>
                              <Input
                                value={f.name}
                                onChange={(e) => updateFee(idx, 'name', e.target.value)}
                                placeholder="Ex: Handling, ISPS"
                              />
                            </TextField>
                          </div>
                          <div className="col-span-3 flex flex-col gap-1">
                            <NumberField
                              variant="primary"
                              minValue={0}
                              value={f.value}
                              onChange={(v) => updateFee(idx, 'value', v ?? 0)}
                              formatOptions={{
                                style: 'currency',
                                currency: 'BRL',
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }}
                            >
                              <Label className="text-xs">{t('StorageRuleForm.rate')}</Label>
                              <NumberField.Group>
                                <NumberField.Input className="w-full" />
                              </NumberField.Group>
                            </NumberField>
                          </div>
                          <div className="col-span-3 flex flex-col gap-1">
                            <Label className="text-xs">{t('StorageRuleForm.feeBasis')}</Label>
                            <Select
                              variant="primary"
                              value={f.basis}
                              onChange={(key) =>
                                key != null && updateFee(idx, 'basis', key as StorageRuleAdditionalFee['basis'])
                              }
                            >
                              <Select.Trigger>
                                <Select.Value />
                                <Select.Indicator />
                              </Select.Trigger>
                              <Select.Popover>
                                <ListBox>
                                  {FEE_BASIS.map((b) => (
                                    <ListBox.Item key={b} id={b} textValue={getFeeBasisLabel(b)}>
                                      {getFeeBasisLabel(b)}
                                      <ListBox.ItemIndicator />
                                    </ListBox.Item>
                                  ))}
                                </ListBox>
                              </Select.Popover>
                            </Select>
                          </div>
                          <div className="col-span-1 flex items-end">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="ghost"
                              onPress={() => removeFee(idx)}
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        </Surface>
                      ))}
                    </div>
                  )}
                </div>

                {state?.error && <FormError message={state.error} />}
              </Modal.Body>
              <Modal.Footer>
                <Button type="button" variant="outline" onPress={onClose}>
                  {t('StorageRuleForm.cancel')}
                </Button>
                <Button type="submit" variant="primary" isPending={isPending}>
                  {t('StorageRuleForm.save')}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
