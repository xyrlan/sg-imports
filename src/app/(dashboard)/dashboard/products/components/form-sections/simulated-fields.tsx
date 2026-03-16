'use client';

import { Input, Label, TextField } from '@heroui/react';

interface SimulatedFieldsProps {
  isPending: boolean;
  simulatedHsCode: string;
  setSimulatedHsCode: (v: string) => void;
  simulatedSupplierName: string;
  setSimulatedSupplierName: (v: string) => void;
  simulatedQuantity: number;
  setSimulatedQuantity: (v: number) => void;
  t: (key: string) => string;
}

export function SimulatedFields({
  isPending,
  simulatedHsCode,
  setSimulatedHsCode,
  simulatedSupplierName,
  setSimulatedSupplierName,
  simulatedQuantity,
  setSimulatedQuantity,
  t,
}: SimulatedFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <TextField
        variant="primary"
        isDisabled={isPending}
        isRequired
        value={simulatedHsCode}
        onChange={(v) => setSimulatedHsCode(v)}
      >
        <Label>{t('hsCodeLabel')}</Label>
        <Input placeholder="8504.40.10" />
      </TextField>
      <TextField
        variant="primary"
        isDisabled={isPending}
        value={simulatedSupplierName}
        onChange={(v) => setSimulatedSupplierName(v)}
      >
        <Label>{t('supplierNameLabel')}</Label>
        <Input placeholder={t('supplierNamePlaceholder')} />
      </TextField>
      <TextField
        variant="primary"
        isDisabled={isPending}
        isRequired
        value={String(simulatedQuantity)}
        onChange={(v) => setSimulatedQuantity(Math.max(1, Number(v) || 1))}
      >
        <Label>{t('quantity')}</Label>
        <Input type="number" min={1} />
      </TextField>
    </div>
  );
}
