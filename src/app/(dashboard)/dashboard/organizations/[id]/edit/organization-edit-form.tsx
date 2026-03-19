'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NextLink from 'next/link';
import {
  TextField,
  Input,
  Label,
  Select,
  ListBox,
  Button,
  Card,
  Chip,
} from '@heroui/react';
import { ArrowLeft, ExternalLink, FileText, Upload } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { FileUpload } from '@/components/ui/file-upload';
import { useTranslations } from 'next-intl';

import { updateOrganizationAction, uploadSocialContractAction } from './actions';

interface OrganizationEditFormProps {
  organizationId: string;
  organization: {
    name: string;
    document: string;
    tradeName: string | null;
    stateRegistry: string | null;
    taxRegime: string | null;
    email: string | null;
    phone: string | null;
    socialContractUrl: string | null;
  };
}

export function OrganizationEditForm({
  organizationId,
  organization,
}: OrganizationEditFormProps) {
  const t = useTranslations('OrganizationEdit');
  const tOnboarding = useTranslations('Onboarding');
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateOrganizationAction.bind(null, organizationId),
    null
  );
  const [uploadState, uploadFormAction, isUploading] = useActionState(
    uploadSocialContractAction.bind(null, organizationId),
    null
  );
  const [socialContractFile, setSocialContractFile] = useState<File | null>(null);

  useEffect(() => {
    if (state?.success || uploadState?.success) {
      router.refresh();
    }
  }, [state?.success, uploadState?.success, router]);

  return (
    <Card variant="secondary">
      <Card.Header>
        <Card.Title>{t('title')}</Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="">
          <NextLink
            href="/dashboard/profile"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToProfile')}
          </NextLink>
        </div>

        <form action={formAction} className="space-y-4">
          <FormError message={state?.error} variant="danger" />

          <div className="space-y-2 p-3 rounded-lg bg-border border flex ">
            <div className='flex-1'>
            <p className="text-sm text-muted">{t('name')}</p>
            <p className="font-medium">{organization.name}</p>
            </div>
            <div className='flex-1'>
            <p className="text-sm text-muted">{t('document')}</p>
            <p className="font-mono text-sm">{organization.document}</p>
            </div>
          </div>

          <TextField
            variant="primary"
            isDisabled={isPending}
            defaultValue={organization.tradeName ?? ''}
          >
            <Label>{t('tradeName')}</Label>
            <Input name="tradeName" placeholder={t('tradeNamePlaceholder')} />
          </TextField>

          <TextField
            variant="primary"
            isDisabled={isPending}
            defaultValue={organization.stateRegistry ?? ''}
          >
            <Label>{t('stateRegistry')}</Label>
            <Input
              name="stateRegistry"
              placeholder={t('stateRegistryPlaceholder')}
            />
          </TextField>

          <Select
            name="taxRegime"
            variant="primary"
            isDisabled={isPending}
            defaultValue={organization.taxRegime ?? undefined}
          >
            <Label>{t('taxRegime')}</Label>
            <Select.Trigger>
              <Select.Value>{t('taxRegimePlaceholder')}</Select.Value>
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item
                  key="SIMPLES_NACIONAL"
                  id="SIMPLES_NACIONAL"
                  textValue={tOnboarding('Step1.taxRegimes.SIMPLES_NACIONAL')}
                >
                  {tOnboarding('Step1.taxRegimes.SIMPLES_NACIONAL')}
                </ListBox.Item>
                <ListBox.Item
                  key="LUCRO_PRESUMIDO"
                  id="LUCRO_PRESUMIDO"
                  textValue={tOnboarding('Step1.taxRegimes.LUCRO_PRESUMIDO')}
                >
                  {tOnboarding('Step1.taxRegimes.LUCRO_PRESUMIDO')}
                </ListBox.Item>
                <ListBox.Item
                  key="LUCRO_REAL"
                  id="LUCRO_REAL"
                  textValue={tOnboarding('Step1.taxRegimes.LUCRO_REAL')}
                >
                  {tOnboarding('Step1.taxRegimes.LUCRO_REAL')}
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>

          <TextField
            variant="primary"
            isDisabled={isPending}
            defaultValue={organization.email ?? ''}
          >
            <Label>{t('email')}</Label>
            <Input name="email" type="email" placeholder={t('emailPlaceholder')} />
          </TextField>

          <TextField
            variant="primary"
            isDisabled={isPending}
            defaultValue={organization.phone ?? ''}
          >
            <Label>{t('phone')}</Label>
            <Input name="phone" placeholder={t('phonePlaceholder')} />
          </TextField>

          {/* Social Contract */}
          <Card variant="secondary">
            <Card.Header>
              <Card.Title>{t('socialContract')}</Card.Title>
            </Card.Header>
            <Card.Content>
              {organization.socialContractUrl ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-border border mb-4">
                <div className="flex items-center gap-3">
                  <FileText className="size-5 text-muted" />
                  <div>
                    <p className="text-sm font-medium">{t('socialContract')}</p>
                    <a
                      href={organization.socialContractUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {t('viewDocument')}
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
                <Chip color="success" size="sm">
                  {t('uploaded')}
                </Chip>
              </div>
              ) : null}
              <form action={uploadFormAction} className="space-y-4">
                <FormError message={uploadState?.error} variant="danger" />
                <FileUpload
                label={
                  organization.socialContractUrl
                    ? t('replaceDocument')
                    : t('uploadSocialContract')
                }
                name="socialContract"
                onFileSelect={setSocialContractFile}
                  disabled={isUploading}
                />
                <Button
                type="submit"
                variant="primary"
                isDisabled={isUploading || !socialContractFile}
              >
                <Upload className="size-4" />
                  {isUploading ? t('uploading') : t('uploadDocument')}
                </Button>
              </form>
            </Card.Content>
          </Card>

          <div className="flex gap-3 pt-4">
            <Button type="submit" variant="primary" isDisabled={isPending}>
              {isPending ? t('saving') : t('save')}
            </Button>
            <Button variant="outline" onPress={() => router.push('/dashboard/profile')}>
              {t('cancel')}
            </Button>
          </div>
        </form>
      </Card.Content>
    </Card>
  );
}
