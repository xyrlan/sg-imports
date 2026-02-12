'use client';

import { useActionState } from 'react';
import { TextField, Input, Label, Button, Card, NumberField } from '@heroui/react';
import { FormError } from '@/components/ui/form-error';
import { updateSiscomexFeeAction } from '../actions';
import type { SiscomexFeeConfig } from '@/services/admin';
import type { TranslateFn } from '../constants';

const CURRENCY_BRL = { currency: 'BRL', style: 'currency' as const };

function arrToStr(arr: string[] | null | undefined) {
  return arr && arr.length ? arr.join(', ') : '';
}

function parseDecimal(value: string | null | undefined): number {
  const n = parseFloat(value ?? '0');
  return Number.isNaN(n) ? 0 : n;
}

interface SiscomexFormProps {
  siscomexFee: SiscomexFeeConfig | null;
  t: TranslateFn;
}

export function SiscomexForm({ siscomexFee, t }: SiscomexFormProps) {
  const [state, formAction, isPending] = useActionState(updateSiscomexFeeAction, null);

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">{t('Taxes.siscomexFee')}</h3>
      <form action={formAction}>
        <div className="space-y-4 max-w-xl">
          <NumberField
            variant="primary"
            minValue={0}
            step={0.01}
            formatOptions={CURRENCY_BRL}
            name="registrationValue"
            defaultValue={parseDecimal(siscomexFee?.registrationValue)}
          >
            <Label>{t('Taxes.registrationValue')}</Label>
            <NumberField.Group>
              <NumberField.Input className="w-40" />
            </NumberField.Group>
          </NumberField>
          <TextField
            variant="primary"
            name="additions"
            defaultValue={arrToStr(siscomexFee?.additions ?? [])}
          >
            <Label>{t('Taxes.additions')} (separados por vírgula)</Label>
            <Input placeholder="valor1, valor2, ..." />
          </TextField>
          <NumberField
            variant="primary"
            minValue={0}
            step={0.01}
            formatOptions={CURRENCY_BRL}
            name="additions11To20"
            defaultValue={parseDecimal(siscomexFee?.additions11To20)}
          >
            <Label>{t('Taxes.additions11To20')}</Label>
            <NumberField.Group>
              <NumberField.Input className="w-40" />
            </NumberField.Group>
          </NumberField>
          <NumberField
            variant="primary"
            minValue={0}
            step={0.01}
            formatOptions={CURRENCY_BRL}
            name="additions21To50"
            defaultValue={parseDecimal(siscomexFee?.additions21To50)}
          >
            <Label>{t('Taxes.additions21To50')}</Label>
            <NumberField.Group>
              <NumberField.Input className="w-40" />
            </NumberField.Group>
          </NumberField>
          <NumberField
            variant="primary"
            minValue={0}
            step={0.01}
            formatOptions={CURRENCY_BRL}
            name="additions51AndAbove"
            defaultValue={parseDecimal(siscomexFee?.additions51AndAbove)}
          >
            <Label>{t('Taxes.additions51Plus')}</Label>
            <NumberField.Group>
              <NumberField.Input className="w-40" />
            </NumberField.Group>
          </NumberField>
          {state?.error && <FormError message={state.error} />}
          <Button type="submit" variant="primary" isPending={isPending}>
            {isPending ? t('Taxes.saving') : t('Taxes.saveSiscomex')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
