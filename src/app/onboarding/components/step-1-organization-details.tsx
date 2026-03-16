import { TextField, Input, Label, Select, ListBox, Button } from '@heroui/react';
import { FormError } from '@/components/ui/form-error';

interface Step1OrganizationDetailsProps {
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
  error?: string;
  translations: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  defaultValues?: Record<string, string>;
}

export function Step1OrganizationDetails({
  onSubmit,
  isPending,
  error,
  translations: t,
  defaultValues,
}: Step1OrganizationDetailsProps) {
  return (
    <form action={onSubmit}>
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-1">{t('Step1.title')}</h2>
        <p className="text-sm text-muted">{t('Step1.description')}</p>
      </div>

      <FormError message={error} variant="danger" />

      <div className="space-y-3">
        <TextField variant="primary" isDisabled={isPending} isRequired>
          <Label>{t('Step1.tradeName')}</Label>
          <Input name="tradeName" placeholder={t('Step1.tradeNamePlaceholder')} defaultValue={defaultValues?.tradeName} />
        </TextField>

        <TextField variant="primary" isDisabled={isPending} isRequired>
          <Label>{t('Step1.stateRegistry')}</Label>
          <Input name="stateRegistry" placeholder={t('Step1.stateRegistryPlaceholder')} defaultValue={defaultValues?.stateRegistry} />
        </TextField>

        <Select
          name="taxRegime"
          variant="primary"
          isDisabled={isPending}
          isRequired
          placeholder={t('Step1.taxRegimePlaceholder')}
          defaultSelectedKey={defaultValues?.taxRegime || undefined}
        >
          <Label>{t('Step1.taxRegime')}</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item
                key="SIMPLES_NACIONAL"
                id="SIMPLES_NACIONAL"
                textValue={t('Step1.taxRegimes.SIMPLES_NACIONAL')}
              >
                {t('Step1.taxRegimes.SIMPLES_NACIONAL')}
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item
                key="LUCRO_PRESUMIDO"
                id="LUCRO_PRESUMIDO"
                textValue={t('Step1.taxRegimes.LUCRO_PRESUMIDO')}
              >
                {t('Step1.taxRegimes.LUCRO_PRESUMIDO')}
                <ListBox.ItemIndicator />
              </ListBox.Item>
              <ListBox.Item
                key="LUCRO_REAL"
                id="LUCRO_REAL"
                textValue={t('Step1.taxRegimes.LUCRO_REAL')}
              >
                {t('Step1.taxRegimes.LUCRO_REAL')}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>

        <TextField variant="primary" isDisabled={isPending} isRequired>
          <Label>{t('Step1.email')}</Label>
          <Input name="email" type="email" placeholder={t('Step1.emailPlaceholder')} defaultValue={defaultValues?.email} />
        </TextField>

        <TextField variant="primary" isDisabled={isPending} isRequired>
          <Label>{t('Step1.phone')}</Label>
          <Input name="phone" placeholder={t('Step1.phonePlaceholder')} defaultValue={defaultValues?.phone} />
        </TextField>
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <Button type="submit" variant="primary" isDisabled={isPending} size="lg">
          {isPending ? t('loading') : t('next')}
        </Button>
      </div>
    </form>
  );
}
