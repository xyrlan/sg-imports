'use client';

import { useRouter } from 'next/navigation';
import { Card, Chip, Avatar, Button } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { Pencil, CheckCircle } from 'lucide-react';

import type { UserOrganization } from '@/services/organization.service';
import type { profiles } from '@/db/schema';
import type { InferSelectModel } from 'drizzle-orm';

import { completeOrganizationRegistration } from '@/app/(dashboard)/actions';
import { ProfileForm } from './profile-form';

type Profile = InferSelectModel<typeof profiles>;

interface ProfilePageContentProps {
  profile: Profile;
  userOrganizations: UserOrganization[];
}

function getInitials(profile: Profile): string {
  if (profile.fullName) {
    const parts = profile.fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return profile.fullName.slice(0, 2).toUpperCase();
  }
  if (profile.email) {
    return profile.email.slice(0, 2).toUpperCase();
  }
  return '?';
}

export function ProfilePageContent({
  profile,
  userOrganizations,
}: ProfilePageContentProps) {
  const t = useTranslations('ProfilePage');
  const router = useRouter();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{t('title')}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Data Card */}
        <Card variant="default">
          <Card.Header>
            <Card.Title>{t('personalData')}</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="flex items-start gap-4 mb-6">
              <Avatar color="accent" size="lg">
                {profile.avatarUrl ? (
                  <Avatar.Image src={profile.avatarUrl} alt="" />
                ) : null}
                <Avatar.Fallback>{getInitials(profile)}</Avatar.Fallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <p className="text-sm text-muted">{t('email')}</p>
                <p className="font-medium">{profile.email}</p>
              </div>
            </div>
            <ProfileForm fullName={profile.fullName} phone={profile.phone} />
          </Card.Content>
        </Card>

        {/* Documents Card */}
        <Card variant="default">
          <Card.Header>
            <Card.Title>{t('documents')}</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">{t('documentPhoto')}</span>
                <Chip
                  variant={profile.documentPhotoUrl ? 'primary' : 'secondary'}
                  size="sm"
                >
                  {profile.documentPhotoUrl ? t('uploaded') : t('pending')}
                </Chip>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">{t('addressProof')}</span>
                <Chip
                  variant={profile.addressProofUrl ? 'primary' : 'secondary'}
                  size="sm"
                >
                  {profile.addressProofUrl ? t('uploaded') : t('pending')}
                </Chip>
              </div>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Organizations Card */}
      <Card variant="default" className="mt-6">
        <Card.Header>
          <Card.Title>{t('organizations')}</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="space-y-3">
            <p className="text-sm text-muted mb-4">
              {t('organizationsCount', {
                count: userOrganizations.length,
              })}
            </p>
            {userOrganizations.map(({ organization, role }) => {
              const hasAddresses =
                organization.billingAddressId && organization.deliveryAddressId;
              const hasSocialContract =
                role === 'SELLER' || !!organization.socialContractUrl;
              const isRegistrationComplete = hasAddresses && hasSocialContract;

              const canEdit = role === 'OWNER' || role === 'ADMIN';

              return (
                <div
                  key={organization.id}
                  className="p-3 rounded-lg border border-default-200"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{organization.name}</p>
                      {organization.tradeName && (
                        <p className="text-sm text-muted">
                          {organization.tradeName}
                        </p>
                      )}
                      <p className="text-sm text-muted font-mono">
                        {organization.document}
                      </p>
                      {organization.email && (
                        <p className="text-xs text-muted mt-1">
                          {organization.email}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Chip size="sm" variant="secondary">
                        {t(`role.${role}`)}
                      </Chip>
                      <Chip
                        size="sm"
                        color={isRegistrationComplete ? 'success' : 'warning'}
                        variant="soft"
                      >
                        {isRegistrationComplete
                          ? t('registrationComplete')
                          : t('registrationPending')}
                      </Chip>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-default-200">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onPress={() =>
                          router.push(
                            `/dashboard/organizations/${organization.id}/edit`
                          )
                        }
                      >
                        <Pencil className="w-3 h-3" />
                        {t('edit')}
                      </Button>
                    )}
                    {!isRegistrationComplete && (
                      <form action={completeOrganizationRegistration}>
                        <input
                          type="hidden"
                          name="organizationId"
                          value={organization.id}
                        />
                        <Button size="sm" variant="primary" type="submit">
                          <CheckCircle className="w-3 h-3" />
                          {t('completeRegistration')}
                        </Button>
                      </form>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card.Content>
      </Card>
    </div>
  );
}
