'use client';

import { FieldError, Input, Label, ListBox, Select, TextField } from '@heroui/react';

export interface LogisticsVariantData {
  height: string;
  width: string;
  length: string;
  netWeight: string;
  unitWeight: string;
  cartonHeight: string;
  cartonWidth: string;
  cartonLength: string;
  cartonWeight: string;
  unitsPerCarton: string;
  packagingType: string;
}

interface LogisticsFieldsProps {
  variantData: LogisticsVariantData;
  onChange: (updates: Partial<LogisticsVariantData>) => void;
  isPending: boolean;
  t: (key: string) => string;
  variantIndex: number;
  getError?: (path: string) => string | undefined;
}

export function LogisticsFields({
  variantData,
  onChange,
  isPending,
  t,
  variantIndex,
  getError,
}: LogisticsFieldsProps) {
  const err = (field: string) => getError?.(`variants.${variantIndex}.${field}`);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <p className="col-span-full text-sm font-medium text-muted">{t('unitSpecs')}</p>
        <TextField
          variant="primary"
          isDisabled={isPending}
          isInvalid={!!err('height')}
          value={variantData.height ?? ''}
          onChange={(v) => onChange({ height: v })}
        >
          <Label>{t('height')}</Label>
          <Input name="variantHeight" placeholder={t('heightPlaceholder')} />
          {getError && <FieldError>{err('height')}</FieldError>}
        </TextField>
        <TextField
          variant="primary"
          isDisabled={isPending}
          isInvalid={!!err('width')}
          value={variantData.width ?? ''}
          onChange={(v) => onChange({ width: v })}
        >
          <Label>{t('width')}</Label>
          <Input name="variantWidth" placeholder={t('widthPlaceholder')} />
          {getError && <FieldError>{err('width')}</FieldError>}
        </TextField>
        <TextField
          variant="primary"
          isDisabled={isPending}
          isInvalid={!!err('length')}
          value={variantData.length ?? ''}
          onChange={(v) => onChange({ length: v })}
        >
          <Label>{t('length')}</Label>
          <Input name="variantLength" placeholder={t('lengthPlaceholder')} />
          {getError && <FieldError>{err('length')}</FieldError>}
        </TextField>
        <TextField
          variant="primary"
          isDisabled={isPending}
          isInvalid={!!err('netWeight')}
          value={variantData.netWeight ?? ''}
          onChange={(v) => onChange({ netWeight: v })}
        >
          <Label>{t('netWeight')}</Label>
          <Input name="variantNetWeight" placeholder={t('netWeightPlaceholder')} />
          {getError && <FieldError>{err('netWeight')}</FieldError>}
        </TextField>
        <TextField
          variant="primary"
          isDisabled={isPending}
          isInvalid={!!err('unitWeight')}
          value={variantData.unitWeight ?? ''}
          onChange={(v) => onChange({ unitWeight: v })}
        >
          <Label>{t('unitWeight')}</Label>
          <Input name="variantUnitWeight" placeholder={t('unitWeightPlaceholder')} />
          {getError && <FieldError>{err('unitWeight')}</FieldError>}
        </TextField>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <p className="col-span-full text-sm font-medium text-muted">{t('cartonDimensions')}</p>
        <TextField
          variant="primary"
          isDisabled={isPending}
          value={variantData.cartonHeight ?? ''}
          onChange={(v) => onChange({ cartonHeight: v })}
        >
          <Label>{t('cartonHeight')}</Label>
          <Input name="variantCartonHeight" placeholder={t('cartonHeightPlaceholder')} />
        </TextField>
        <TextField
          variant="primary"
          isDisabled={isPending}
          value={variantData.cartonWidth ?? ''}
          onChange={(v) => onChange({ cartonWidth: v })}
        >
          <Label>{t('cartonWidth')}</Label>
          <Input name="variantCartonWidth" placeholder={t('cartonWidthPlaceholder')} />
        </TextField>
        <TextField
          variant="primary"
          isDisabled={isPending}
          value={variantData.cartonLength ?? ''}
          onChange={(v) => onChange({ cartonLength: v })}
        >
          <Label>{t('cartonLength')}</Label>
          <Input name="variantCartonLength" placeholder={t('cartonLengthPlaceholder')} />
        </TextField>
        <TextField
          variant="primary"
          isDisabled={isPending}
          value={variantData.cartonWeight ?? ''}
          onChange={(v) => onChange({ cartonWeight: v })}
        >
          <Label>{t('cartonWeight')}</Label>
          <Input name="variantCartonWeight" placeholder={t('cartonWeightPlaceholder')} />
        </TextField>
        <TextField
          variant="primary"
          isDisabled={isPending}
          value={variantData.unitsPerCarton ?? '1'}
          onChange={(v) => onChange({ unitsPerCarton: v })}
        >
          <Label>{t('unitsPerCarton')}</Label>
          <Input name="variantUnitsPerCarton" type="number" min={1} placeholder="1" />
        </TextField>
        <Select
          key={`packaging-${variantIndex}-${variantData.packagingType ?? 'empty'}`}
          variant="primary"
          isDisabled={isPending}
          placeholder={t('packagingTypePlaceholder')}
          value={variantData.packagingType || null}
          onChange={(k) =>
            onChange({
              packagingType: k === '__none__' || !k ? '' : (k as string),
            })
          }
        >
          <Label>{t('packagingType')}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item key="__none__" id="__none__" textValue={t('none')}>
                {t('none')}
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item key="BOX" id="BOX" textValue={t('packagingBox')}>
                {t('packagingBox')}
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item key="PALLET" id="PALLET" textValue={t('packagingPallet')}>
                {t('packagingPallet')}
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item key="BAG" id="BAG" textValue={t('packagingBag')}>
                {t('packagingBag')}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>
      </div>
    </>
  );
}
