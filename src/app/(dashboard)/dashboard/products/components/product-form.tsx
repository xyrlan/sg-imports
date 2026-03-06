'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button, Input, Label, Select, ListBox, TextField, TextArea } from '@heroui/react';
import { PlusIcon, Trash2Icon } from 'lucide-react';

import { ProductPhotosUpload } from '@/components/ui/product-photos-upload';
import { createProductAction, getProductFormOptions } from '../actions';

type TieredPriceRow = { beginAmount: number; price: string };
type AttributePair = { key: string; value: string };

interface ProductFormProps {
  organizationId: string;
  onMutate?: () => void;
  onClose?: () => void;
}

export function ProductForm({ organizationId, onMutate, onClose }: ProductFormProps) {
  const [state, formAction, isPending] = useActionState(createProductAction, null);
  const [variantKeys, setVariantKeys] = useState<number[]>([1]);
  const [tieredPriceRows, setTieredPriceRows] = useState<Record<number, TieredPriceRow[]>>({
    1: [{ beginAmount: 1, price: '' }],
  });
  const [attributePairs, setAttributePairs] = useState<Record<number, AttributePair[]>>({});
  const [options, setOptions] = useState<{
    hsCodes: { id: string; code: string }[];
    suppliers: { id: string; name: string }[];
  } | null>(null);

  useEffect(() => {
    if (state?.success) {
      onMutate?.();
      onClose?.();
    }
  }, [state?.success, onMutate, onClose]);

  useEffect(() => {
    getProductFormOptions(organizationId).then(setOptions);
  }, [organizationId]);

  return (
    <form action={formAction} className="space-y-4 p-4">
      <input type="hidden" name="organizationId" value={organizationId} />

      {state?.error && (
        <div className="p-3 bg-danger/10 border border-danger rounded-lg">
          <p className="text-sm text-danger">{state.error}</p>
        </div>
      )}

      <TextField variant="primary" isDisabled={isPending} isRequired>
        <Label>Product Name</Label>
        <Input name="name" placeholder="Product name" />
      </TextField>

      <TextField variant="primary" isDisabled={isPending}>
        <Label>Description</Label>
        <TextArea name="description" placeholder="Product description (optional)" />
      </TextField>

      <ProductPhotosUpload
        name="photos"
        label="Product photos"
        helpText="JPG, PNG, WebP, GIF (máx. 5MB cada)"
        disabled={isPending}
      />

      <div className="grid grid-cols-2 gap-4">
        {options && (
          <>
            <Select
              name="hsCodeId"
              variant="primary"
              isDisabled={isPending}
              placeholder="HS Code / NCM (optional)"
              className="w-full"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item key="__none__" id="__none__" textValue="None" />
                  {options.hsCodes.map((hc) => (
                    <ListBox.Item
                      key={hc.id}
                      id={hc.id}
                      textValue={hc.code}
                    />
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Select
              name="supplierId"
              variant="primary"
              isDisabled={isPending}
              placeholder="Supplier (optional)"
              className="w-full"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item key="__none__" id="__none__" textValue="None" />
                  {options.suppliers.map((s) => (
                    <ListBox.Item
                      key={s.id}
                      id={s.id}
                      textValue={s.name}
                    />
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </>
        )}
      </div>

      <div className="border-t border-divider pt-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted">Variants (at least one)</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onPress={() => {
              const newKey = Math.max(0, ...variantKeys) + 1;
              setVariantKeys((k) => [...k, newKey]);
              setTieredPriceRows((prev) => ({ ...prev, [newKey]: [{ beginAmount: 1, price: '' }] }));
              setAttributePairs((prev) => ({ ...prev, [newKey]: [] }));
            }}
            isDisabled={isPending}
            className="inline-flex items-center gap-2"
          >
            <PlusIcon size={16} />
            Add variant
          </Button>
        </div>
        <div className="space-y-4">
          {variantKeys.map((key, i) => (
            <div key={key} className="rounded-lg border border-divider p-3 space-y-3">
              <div className="flex items-end gap-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
                  <TextField variant="primary" isDisabled={isPending} isRequired>
                    <Label>SKU</Label>
                    <Input name="variantSku" placeholder="e.g. PRD-001-A" />
                  </TextField>
                  <TextField variant="primary" isDisabled={isPending}>
                    <Label>Variant Name</Label>
                    <Input name="variantName" placeholder="e.g. Default, Blue - M" />
                  </TextField>
                  <TextField variant="primary" isDisabled={isPending}>
                    <Label>Price (USD)</Label>
                    <Input name="priceUsd" placeholder="e.g. 10.00" />
                  </TextField>
                </div>
                {variantKeys.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onPress={() => setVariantKeys((k) => k.filter((_, idx) => idx !== i))}
                    isDisabled={isPending}
                  >
                    <Trash2Icon size={18} />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <TextField variant="primary" isDisabled={isPending} isRequired>
                  <Label>Quantity per Box</Label>
                  <Input name="variantBoxQuantity" type="number" min={1} placeholder="1" />
                </TextField>
                <TextField variant="primary" isDisabled={isPending} isRequired>
                  <Label>Box Weight (kg)</Label>
                  <Input name="variantBoxWeight" placeholder="e.g. 5.5" />
                </TextField>
                <TextField variant="primary" isDisabled={isPending}>
                  <Label>Height (cm)</Label>
                  <Input name="variantHeight" placeholder="e.g. 10" />
                </TextField>
                <TextField variant="primary" isDisabled={isPending}>
                  <Label>Width (cm)</Label>
                  <Input name="variantWidth" placeholder="e.g. 20" />
                </TextField>
                <TextField variant="primary" isDisabled={isPending}>
                  <Label>Length (cm)</Label>
                  <Input name="variantLength" placeholder="e.g. 30" />
                </TextField>
                <TextField variant="primary" isDisabled={isPending}>
                  <Label>Net Weight (kg)</Label>
                  <Input name="variantNetWeight" placeholder="e.g. 0.5" />
                </TextField>
                <TextField variant="primary" isDisabled={isPending}>
                  <Label>Unit Weight (kg)</Label>
                  <Input name="variantUnitWeight" placeholder="e.g. 0.6" />
                </TextField>
              </div>
              {(() => {
                const tpRows = tieredPriceRows[key] ?? [{ beginAmount: 1, price: '' }];
                const attrRows = attributePairs[key] ?? [];
                const buildTieredPrice = () => {
                  const valid = tpRows
                    .filter((r) => r.price.trim() !== '')
                    .map((r) => ({ beginAmount: Math.max(1, r.beginAmount), price: r.price.trim() }))
                    .sort((a, b) => a.beginAmount - b.beginAmount);
                  return valid.length > 0 ? valid : undefined;
                };
                const buildAttributes = () => {
                  const obj: Record<string, string> = {};
                  attrRows.forEach(({ key: k, value: v }) => {
                    const norm = k.trim().toLowerCase().replace(/\s+/g, '_');
                    if (norm && v.trim()) obj[norm] = v.trim();
                  });
                  return Object.keys(obj).length > 0 ? obj : undefined;
                };
                return (
                  <>
                    <input
                      type="hidden"
                      name="variantTieredPriceInfo"
                      value={JSON.stringify(buildTieredPrice() ?? [])}
                    />
                    <input
                      type="hidden"
                      name="variantAttributes"
                      value={JSON.stringify(buildAttributes() ?? {})}
                    />
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium text-muted mb-2">Tiered pricing</p>
                        <div className="space-y-2">
                          {tpRows.map((row, rowIdx) => (
                            <div key={rowIdx} className="flex gap-2 items-center">
                              <TextField variant="primary" isDisabled={isPending} className="flex-1">
                                <Label className="sr-only">Qtd mín.</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  placeholder="Qtd mín."
                                  value={String(row.beginAmount)}
                                  onChange={(e) =>
                                    setTieredPriceRows((prev) => ({
                                      ...prev,
                                      [key]: (prev[key] ?? [{ beginAmount: 1, price: '' }]).map((r, idx) =>
                                        idx === rowIdx
                                          ? { ...r, beginAmount: Math.max(1, Number(e.target.value) || 1) }
                                          : r
                                      ),
                                    }))
                                  }
                                />
                              </TextField>
                              <TextField variant="primary" isDisabled={isPending} className="flex-1">
                                <Label className="sr-only">Preço USD</Label>
                                <Input
                                  placeholder="Preço USD"
                                  value={row.price}
                                  onChange={(e) =>
                                    setTieredPriceRows((prev) => ({
                                      ...prev,
                                      [key]: (prev[key] ?? [{ beginAmount: 1, price: '' }]).map((r, idx) =>
                                        idx === rowIdx ? { ...r, price: e.target.value } : r
                                      ),
                                    }))
                                  }
                                />
                              </TextField>
                              {tpRows.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onPress={() =>
                                    setTieredPriceRows((prev) => ({
                                      ...prev,
                                      [key]: (prev[key] ?? [{ beginAmount: 1, price: '' }]).filter(
                                        (_, idx) => idx !== rowIdx
                                      ),
                                    }))
                                  }
                                  isDisabled={isPending}
                                >
                                  <Trash2Icon size={16} />
                                </Button>
                              )}
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onPress={() =>
                              setTieredPriceRows((prev) => ({
                                ...prev,
                                [key]: [...(prev[key] ?? [{ beginAmount: 1, price: '' }]), { beginAmount: 1, price: '' }],
                              }))
                            }
                            isDisabled={isPending}
                            className="inline-flex items-center gap-2"
                          >
                            <PlusIcon size={14} />
                            Adicionar faixa
                          </Button>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted mb-2">Attributes</p>
                        <div className="space-y-2">
                          {attrRows.map((pair, pairIdx) => (
                            <div key={pairIdx} className="flex gap-2 items-center">
                              <TextField variant="primary" isDisabled={isPending} className="flex-1">
                                <Label className="sr-only">Chave</Label>
                                <Input
                                  placeholder="Chave (ex: Cor)"
                                  value={pair.key}
                                  onChange={(e) =>
                                    setAttributePairs((prev) => ({
                                      ...prev,
                                      [key]: (prev[key] ?? []).map((p, idx) =>
                                        idx === pairIdx ? { ...p, key: e.target.value } : p
                                      ),
                                    }))
                                  }
                                />
                              </TextField>
                              <TextField variant="primary" isDisabled={isPending} className="flex-1">
                                <Label className="sr-only">Valor</Label>
                                <Input
                                  placeholder="Valor (ex: Azul)"
                                  value={pair.value}
                                  onChange={(e) =>
                                    setAttributePairs((prev) => ({
                                      ...prev,
                                      [key]: (prev[key] ?? []).map((p, idx) =>
                                        idx === pairIdx ? { ...p, value: e.target.value } : p
                                      ),
                                    }))
                                  }
                                />
                              </TextField>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onPress={() =>
                                  setAttributePairs((prev) => ({
                                    ...prev,
                                    [key]: (prev[key] ?? []).filter((_, idx) => idx !== pairIdx),
                                  }))
                                }
                                isDisabled={isPending}
                              >
                                <Trash2Icon size={16} />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onPress={() =>
                              setAttributePairs((prev) => ({
                                ...prev,
                                [key]: [...(prev[key] ?? []), { key: '', value: '' }],
                              }))
                            }
                            isDisabled={isPending}
                            className="inline-flex items-center gap-2"
                          >
                            <PlusIcon size={14} />
                            Adicionar atributo
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onClose && (
          <Button type="button" variant="ghost" onPress={onClose}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" isPending={isPending}>
          Create Product
        </Button>
      </div>
    </form>
  );
}
