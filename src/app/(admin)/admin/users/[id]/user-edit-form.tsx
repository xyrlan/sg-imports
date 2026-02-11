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
import { ArrowLeft, ExternalLink, FileText, Building2, Upload } from 'lucide-react';
import { FormError } from '@/components/ui/form-error';
import { FileUpload } from '@/components/ui/file-upload';
import { useTranslations } from 'next-intl';
import { formatDate, formatCNPJ } from '@/lib/utils';

import {
  updateProfileAdminAction,
  uploadProfileDocumentsAdminAction,
} from './actions';

export interface ProfileMembership {
  organizationId: string;
  organizationName: string;
  organizationDocument: string;
  role: string;
}

interface UserEditFormProps {
  profile: {
    id: string;
    email: string;
    fullName: string | null;
    phone: string | null;
    avatarUrl: string | null;
    documentPhotoUrl: string | null;
    addressProofUrl: string | null;
    systemRole: string;
    createdAt: Date;
  };
  memberships: ProfileMembership[];
}

export function UserEditForm({ profile, memberships }: UserEditFormProps) {
  const t = useTranslations('Admin.UserEdit');
  const router = useRouter();

  // Profile fields form
  const [state, formAction, isPending] = useActionState(
    updateProfileAdminAction.bind(null, profile.id),
    null,
  );

  // Document upload form
  const [uploadState, uploadFormAction, isUploading] = useActionState(
    uploadProfileDocumentsAdminAction.bind(null, profile.id),
    null,
  );

  // File state for controlled FileUpload
  const [documentPhoto, setDocumentPhoto] = useState<File | null>(null);
  const [addressProof, setAddressProof] = useState<File | null>(null);

  useEffect(() => {
    if (state?.success || uploadState?.success) {
      router.refresh();
    }
  }, [state?.success, uploadState?.success, router]);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <NextLink
        href={`/admin/users-organizations?selectedTab=users`}
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t('backToManagement')}
      </NextLink>

      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Success messages */}
      {state?.success && (
        <div className="p-3 border rounded-lg bg-success/10 border-success text-success-foreground">
          <p className="text-sm">{t('success')}</p>
        </div>
      )}
      {uploadState?.success && (
        <div className="p-3 border rounded-lg bg-success/10 border-success text-success-foreground">
          <p className="text-sm">{t('uploadSuccess')}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left column: Editable fields */}
        <Card variant="default">
          <Card.Header>
            <Card.Title>{t('personalData')}</Card.Title>
          </Card.Header>
          <Card.Content>
            <form action={formAction} className="space-y-4">
              <FormError message={state?.error} variant="danger" />

              {/* Read-only: Email */}
              <div className="space-y-1">
                <p className="text-sm text-muted">{t('email')}</p>
                <p className="font-medium font-mono text-sm">{profile.email}</p>
              </div>

              {/* Editable: Full Name */}
              <TextField
                variant="primary"
                isDisabled={isPending}
                defaultValue={profile.fullName ?? ''}
              >
                <Label>{t('fullName')}</Label>
                <Input name="fullName" placeholder={t('fullNamePlaceholder')} />
              </TextField>

              {/* Editable: Phone */}
              <TextField
                variant="primary"
                isDisabled={isPending}
                defaultValue={profile.phone ?? ''}
              >
                <Label>{t('phone')}</Label>
                <Input name="phone" placeholder={t('phonePlaceholder')} />
              </TextField>

              {/* Editable: System Role */}
              <Select
                name="systemRole"
                variant="primary"
                isDisabled={isPending}
                defaultValue={profile.systemRole}
              >
                <Label>{t('systemRole')}</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item key="USER" id="USER" textValue={t('roles.USER')}>
                      {t('roles.USER')}
                    </ListBox.Item>
                    <ListBox.Item key="SUPER_ADMIN" id="SUPER_ADMIN" textValue={t('roles.SUPER_ADMIN')}>
                      {t('roles.SUPER_ADMIN')}
                    </ListBox.Item>
                    <ListBox.Item key="SUPER_ADMIN_EMPLOYEE" id="SUPER_ADMIN_EMPLOYEE" textValue={t('roles.SUPER_ADMIN_EMPLOYEE')}>
                      {t('roles.SUPER_ADMIN_EMPLOYEE')}
                    </ListBox.Item>
                  </ListBox>
                </Select.Popover>
              </Select>

              {/* Created at (read-only) */}
              <div className="space-y-1">
                <p className="text-sm text-muted">{t('createdAt')}</p>
                <p className="text-sm">{formatDate(new Date(profile.createdAt))}</p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" variant="primary" isDisabled={isPending}>
                  {isPending ? t('saving') : t('save')}
                </Button>
              </div>
            </form>
          </Card.Content>
        </Card>

        {/* Right column: Documents + Organizations */}
        <div className="space-y-6">
          {/* Documents section with upload */}
          <Card variant="default">
            <Card.Header>
              <Card.Title>{t('documents')}</Card.Title>
            </Card.Header>
            <Card.Content>
              <form action={uploadFormAction} className="space-y-4">
                <FormError message={uploadState?.error} variant="danger" />

                {/* Document Photo */}
                {profile.documentPhotoUrl ? (
                  <DocumentLink
                    label={t('documentPhoto')}
                    url={profile.documentPhotoUrl}
                    viewLabel={t('viewDocument')}
                  />
                ) : null}
                <FileUpload
                  label={profile.documentPhotoUrl ? t('replaceDocument') : t('documentPhoto')}
                  name="documentPhoto"
                  helpText={t('documentPhotoHelp')}
                  onFileSelect={setDocumentPhoto}
                  disabled={isUploading}
                />

                {/* Address Proof */}
                {profile.addressProofUrl ? (
                  <DocumentLink
                    label={t('addressProof')}
                    url={profile.addressProofUrl}
                    viewLabel={t('viewDocument')}
                  />
                ) : null}
                <FileUpload
                  label={profile.addressProofUrl ? t('replaceDocument') : t('addressProof')}
                  name="addressProof"
                  helpText={t('addressProofHelp')}
                  onFileSelect={setAddressProof}
                  disabled={isUploading}
                />

                <div className="flex gap-3 pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    isDisabled={isUploading || (!documentPhoto && !addressProof)}
                  >
                    <Upload className="size-4" />
                    {isUploading ? t('uploading') : t('uploadDocument')}
                  </Button>
                </div>
              </form>
            </Card.Content>
          </Card>

          {/* Organizations section */}
          <Card variant="default">
            <Card.Header>
              <div className="flex items-center gap-2">
                <Building2 className="size-5" />
                <Card.Title>
                  {t('organizations')} ({t('organizationsCount', { count: memberships.length })})
                </Card.Title>
              </div>
            </Card.Header>
            <Card.Content>
              {memberships.length === 0 ? (
                <p className="text-sm text-muted">{t('noOrganizations')}</p>
              ) : (
                <div className="space-y-2">
                  {memberships.map((m) => (
                    <NextLink
                      key={m.organizationId}
                      href={`/admin/organizations/${m.organizationId}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-default-100 border hover:bg-default-200 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {m.organizationName}
                        </p>
                        <p className="text-xs text-muted font-mono truncate">
                          {formatCNPJ(m.organizationDocument)}
                        </p>
                      </div>
                      <Chip size="sm" className="ml-2 shrink-0">
                        {t(`orgRoles.${m.role}`)}
                      </Chip>
                    </NextLink>
                  ))}
                </div>
              )}
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DocumentLink({
  label,
  url,
  viewLabel,
}: {
  label: string;
  url: string;
  viewLabel: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-default-100 border">
      <div className="flex items-center gap-3">
        <FileText className="size-5 text-muted" />
        <div>
          <p className="text-sm font-medium">{label}</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {viewLabel}
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
      <Chip color="success" size="sm">
        OK
      </Chip>
    </div>
  );
}
