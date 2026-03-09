'use client';

import { useEffect, useState, useTransition } from 'react';
import {
  Button,
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
import { DollarSign, Plus, X } from 'lucide-react';
import { CarrierAutocomplete } from '../international-freights/carrier-autocomplete';
import { CONTAINER_TYPE_LABELS, PORT_DIRECTION_LABELS } from './constants';
import {
  createPricingRuleAction,
  updatePricingRuleAction,
} from '../../actions';
import type { PricingRuleWithRelations, Port } from './types';

const CONTAINER_TYPES = ['GP_20', 'GP_40', 'HC_40', 'RF_20', 'RF_40'] as const;
const CURRENCIES = ['BRL', 'USD', 'CNY'] as const;
const BASIS_OPTIONS = ['PER_BL', 'PER_CONTAINER'] as const;

interface PricingItemRow {
  id: string;
  name: string;
  amount: string;
  currency: (typeof CURRENCIES)[number];
  basis: (typeof BASIS_OPTIONS)[number];
}

interface PricingRuleFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  editingRule: PricingRuleWithRelations | null;
  duplicatingFrom: PricingRuleWithRelations | null;
  ports: Port[];
}

export function PricingRuleFormModal({
  isOpen,
  onOpenChange,
  onSave,
  editingRule,
  duplicatingFrom,
  ports,
}: PricingRuleFormModalProps) {
  const [isPending, startTransition] = useTransition();
  const [scope, setScope] = useState<'CARRIER' | 'PORT' | 'SPECIFIC'>('SPECIFIC');
  const [carrierId, setCarrierId] = useState('');
  const [portId, setPortId] = useState('');
  const [containerType, setContainerType] = useState('');
  const [portDirection, setPortDirection] = useState<'ORIGIN' | 'DESTINATION' | 'BOTH'>('BOTH');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [items, setItems] = useState<PricingItemRow[]>([
    { id: crypto.randomUUID(), name: '', amount: '', currency: 'BRL', basis: 'PER_CONTAINER' },
  ]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const source = editingRule ?? duplicatingFrom;
      if (source) {
        setScope(source.scope as 'CARRIER' | 'PORT' | 'SPECIFIC');
        setCarrierId(source.carrierId);
        setPortId(source.portId ?? '');
        setContainerType(source.containerType ?? '');
        setPortDirection((source.portDirection as 'ORIGIN' | 'DESTINATION' | 'BOTH') ?? 'BOTH');
        setValidFrom(
          source.validFrom
            ? new Date(source.validFrom).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
        );
        setValidTo(
          source.validTo ? new Date(source.validTo).toISOString().split('T')[0] : ''
        );
        setItems(
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
            : [{ id: crypto.randomUUID(), name: '', amount: '', currency: 'BRL', basis: 'PER_CONTAINER' }]
        );
      } else {
        setScope('SPECIFIC');
        setCarrierId('');
        setPortId('');
        setContainerType('');
        setPortDirection('BOTH');
        setValidFrom(new Date().toISOString().split('T')[0]);
        setValidTo('');
        setItems([{ id: crypto.randomUUID(), name: '', amount: '', currency: 'BRL', basis: 'PER_CONTAINER' }]);
      }
      setError(null);
    }
  }, [isOpen, editingRule, duplicatingFrom]);

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
      setError('Transportadora é obrigatória');
      return;
    }
    if ((scope === 'PORT' || scope === 'SPECIFIC') && !portId) {
      setError('Porto é obrigatório para este nível');
      return;
    }
    if (scope === 'SPECIFIC' && !containerType) {
      setError('Container é obrigatório para nível específico');
      return;
    }
    if (!validFrom) {
      setError('Data inicial é obrigatória');
      return;
    }

    const validItems = items.filter((i) => i.name.trim() && i.amount && parseFloat(i.amount) > 0);
    if (validItems.length === 0) {
      setError('Pelo menos um item de preço é obrigatório');
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
          toast.success('Regra atualizada com sucesso!');
          onSave();
          onOpenChange(false);
        } else {
          setError(result.error ?? 'Erro ao atualizar');
        }
      } else {
        const result = await createPricingRuleAction(payload);
        if (result.ok) {
          toast.success('Regra criada com sucesso!');
          onSave();
          onOpenChange(false);
        } else {
          setError(result.error ?? 'Erro ao criar');
        }
      }
    });
  };

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={onOpenChange} isDismissable={false}>
        <Modal.Container>
          <Modal.Dialog className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <Modal.CloseTrigger />
            <Modal.Header className="mb-6">
              <Modal.Icon className="bg-default text-foreground">
                <DollarSign className="size-5" />
              </Modal.Icon>
              <Modal.Heading>
                {editingRule
                  ? 'Editar Regra de Preço'
                  : duplicatingFrom
                    ? 'Criar Regra a Partir de Existente'
                    : 'Nova Regra de Preço'}
              </Modal.Heading>
            </Modal.Header>
            <form onSubmit={handleSubmit}>
              <Modal.Body className="space-y-4 p-2">
                {duplicatingFrom && (
                  <div className="rounded-lg border border-primary-200 bg-primary-50 p-2 text-primary-800 text-xs">
                    Criando nova regra baseada em regra existente.
                  </div>
                )}

                <div>
                  <Label className="mb-2 block text-sm font-medium">Nível da Regra</Label>
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
                        <Label>Nível Transportadora</Label>
                        <span className="text-xs text-muted">Taxas aplicadas a todos os portos e containers desta transportadora</span>
                      </Radio.Content>
                    </Radio>
                    <Radio value="PORT">
                      <Radio.Control>
                        <Radio.Indicator />
                      </Radio.Control>
                      <Radio.Content>
                        <Label>Nível Porto</Label>
                        <span className="text-xs text-muted">Taxas aplicadas a este porto para todos os containers</span>
                      </Radio.Content>
                    </Radio>
                    <Radio value="SPECIFIC">
                      <Radio.Control>
                        <Radio.Indicator />
                      </Radio.Control>
                      <Radio.Content>
                        <Label>Específico (Porto + Container)</Label>
                        <span className="text-xs text-muted">Taxas aplicadas a esta combinação específica</span>
                      </Radio.Content>
                    </Radio>
                  </RadioGroup>
                </div>

                <TextField variant="primary" isRequired>
                  <Label>Transportadora</Label>
                  <CarrierAutocomplete
                    placeholder="Selecione a transportadora"
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
                      <Label>Porto</Label>
                      <Select
                        placeholder="Selecione o porto"
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
                            {ports.map((p) => (
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
                      <Label className="mb-2 block text-sm font-medium">Direção do Porto</Label>
                      <RadioGroup
                        value={portDirection}
                        onChange={(v) => setPortDirection(v as 'ORIGIN' | 'DESTINATION' | 'BOTH')}
                      >
                        <Radio value="ORIGIN">
                          <Radio.Control>
                            <Radio.Indicator />
                          </Radio.Control>
                          <Radio.Content>
                            <Label>{PORT_DIRECTION_LABELS.ORIGIN}</Label>
                          </Radio.Content>
                        </Radio>
                        <Radio value="DESTINATION">
                          <Radio.Control>
                            <Radio.Indicator />
                          </Radio.Control>
                          <Radio.Content>
                            <Label>{PORT_DIRECTION_LABELS.DESTINATION}</Label>
                          </Radio.Content>
                        </Radio>
                        <Radio value="BOTH">
                          <Radio.Control>
                            <Radio.Indicator />
                          </Radio.Control>
                          <Radio.Content>
                            <Label>{PORT_DIRECTION_LABELS.BOTH}</Label>
                          </Radio.Content>
                        </Radio>
                      </RadioGroup>
                    </div>
                  </>
                )}

                {scope === 'SPECIFIC' && (
                  <div className="flex flex-col gap-2">
                    <Label>Container</Label>
                    <Select
                      placeholder="Selecione o tipo"
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
                          {CONTAINER_TYPES.map((ct) => (
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
                    <Label>Válido de</Label>
                    <Input
                      type="date"
                      value={validFrom}
                      onChange={(e) => setValidFrom(e.target.value)}
                    />
                  </TextField>
                  <TextField variant="primary">
                    <Label>Válido até</Label>
                    <Input
                      type="date"
                      value={validTo}
                      onChange={(e) => setValidTo(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-muted">Deixe em branco para sem data limite</p>
                  </TextField>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Itens de Preço</Label>
                    <Button type="button" variant="secondary"  onPress={addItem}>
                      <Plus size={14} className="mr-1" />
                      Adicionar Item
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-2 items-start">
                        <div className="flex-1 grid gap-2 grid-cols-12">
                          <div className="col-span-4">
                            <Input
                              placeholder="Ex: Frete Básico"
                              value={item.name}
                              onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                            />
                          </div>
                          <div className="col-span-3">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={item.amount}
                              onChange={(e) => updateItem(item.id, 'amount', e.target.value)}
                            />
                          </div>
                          <div className="col-span-2">
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
                                  <ListBox.Item key="PER_CONTAINER" id="PER_CONTAINER" textValue="Por Container">
                                    Por Container
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                  <ListBox.Item key="PER_BL" id="PER_BL" textValue="Por BL">
                                    Por BL
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
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" isPending={isPending}>
                  {editingRule ? 'Atualizar' : 'Criar'}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
