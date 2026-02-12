'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Label, NumberField, Button, Card, Switch } from '@heroui/react';
import { FormError } from '@/components/ui/form-error';
import { updateHonorariosAction } from '../actions';
import type { GlobalServiceFeeConfig } from '@/services/admin';

function parseDecimal(value: string | null | undefined): number {
  const n = parseFloat(value ?? '0');
  return Number.isNaN(n) ? 0 : n;
}

interface HonorariosSectionProps {
  honorarios: GlobalServiceFeeConfig | null;
}

export function HonorariosSection({ honorarios }: HonorariosSectionProps) {
  const t = useTranslations('Admin.Settings');
  const [state, formAction, isPending] = useActionState(updateHonorariosAction, null);

  const minWage = parseDecimal(honorarios?.minimumWageBrl ?? '1530');
  const defaultPct = parseDecimal(honorarios?.defaultPercentage ?? '2.5') / 100;
  const applyToChina = honorarios?.defaultApplyToChina !== false;

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold ">{t('Honorarios.title')}</h2>
      <p className="text-sm text-muted mb-4">{t('Honorarios.description')}</p>
      <form action={formAction} className='flex flex-col gap-4'>
          <NumberField
            variant="primary"
            isRequired
            minValue={0}
            step={0.01}
            formatOptions={{ style: 'currency', currency: 'BRL' }}
            name="minimumWageBrl"
            defaultValue={minWage}
          >
            <Label>{t('Honorarios.minimumWage')}</Label>
            <NumberField.Group>
              <NumberField.DecrementButton />
              <NumberField.Input className="w-40" />
              <NumberField.IncrementButton />
            </NumberField.Group>
          </NumberField>
          <NumberField
            variant="primary"
            isRequired
            minValue={1}
            maxValue={10}
            step={1}
            name="defaultMultiplier"
            defaultValue={honorarios?.defaultMultiplier ?? 2}
          >
            <Label>{t('Honorarios.defaultMultiplier')}</Label>
            <NumberField.Group>
              <NumberField.DecrementButton />
              <NumberField.Input className="w-24" />
              <NumberField.IncrementButton />
            </NumberField.Group>
          </NumberField>
          <NumberField
            variant="primary"
            isRequired
            minValue={0}
            maxValue={1}
            step={0.001}
            formatOptions={{ style: 'percent', maximumFractionDigits: 2, minimumFractionDigits: 0 }}
            name="defaultPercentage"
            defaultValue={defaultPct}
          >
            <Label>{t('Honorarios.defaultPercentage')}</Label>
            <NumberField.Group>
              <NumberField.DecrementButton />
              <NumberField.Input className="w-24" />
              <NumberField.IncrementButton />
            </NumberField.Group>
          </NumberField>
          <Switch
            name="defaultApplyToChina"
            value="true"
            defaultSelected={applyToChina}
            size='lg'
            className={'py-2'}
          >
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            <Label className="text-sm">{t('Honorarios.applyToChina')}</Label>
          </Switch>
          <input type="hidden" name="defaultApplyToChina" value="false" />
          {state?.error && <FormError message={state.error} />}
          <Button type="submit" variant="primary" isPending={isPending}>
            {isPending ? t('Honorarios.saving') : t('Honorarios.save')}
          </Button>
      </form>
    </Card>
  );
}
