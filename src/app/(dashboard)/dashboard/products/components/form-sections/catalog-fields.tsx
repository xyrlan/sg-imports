'use client';

import { FieldError, Input, Label, ListBox, Select, TextField } from '@heroui/react';
import { HsCodeAutocomplete } from '@/components/ui/hs-code-autocomplete';

interface CatalogFieldsProps {
  formData: { hsCodeId: string; supplierId: string };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isPending: boolean;
  options: { hsCodes: { id: string; code: string }[]; suppliers: { id: string; name: string }[] } | null;
  getError: (path: string) => string | undefined;
  t: (key: string) => string;
}

export function CatalogFields({ formData, setFormData, isPending, options, getError, t }: CatalogFieldsProps) {
  if (!options) return null;
  return (
    <div className="grid grid-cols-2 gap-4">
      <HsCodeAutocomplete
        hsCodes={options.hsCodes}
        value={formData.hsCodeId || null}
        onChange={(id) => setFormData((prev: any) => ({ ...prev, hsCodeId: id ?? '' }))}
        name="hsCodeId"
        label={t('hsCodeLabel')}
        placeholder={t('hsCodePlaceholder')}
        isRequired
        isDisabled={isPending}
        isInvalid={!!getError('hsCodeId')}
        errorMessage={getError('hsCodeId')}
        fullWidth
      />
      <TextField variant="primary" isRequired isInvalid={!!getError('supplierId')}>
        <Label>{t('supplierPlaceholder')}</Label>
        <Select
          name="supplierId"
          variant="primary"
          isDisabled={isPending}
          isInvalid={!!getError('supplierId')}
          placeholder={t('supplierPlaceholder')}
          className="w-full"
          value={formData.supplierId || null}
          onChange={(key) => setFormData((prev: any) => ({ ...prev, supplierId: (key as string) ?? '' }))}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item key="__none__" id="__none__" textValue={t('none')}>{t('none')}</ListBox.Item>
              {options.suppliers.map((s) => (
                <ListBox.Item key={s.id} id={s.id} textValue={s.name}>{s.name}</ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
          <FieldError>{getError('supplierId')}</FieldError>
        </Select>
      </TextField>
    </div>
  );
}
