'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Chip, Button, Spinner } from '@heroui/react';
import { Building2, ArrowRight } from 'lucide-react';
import { setOrganizationCookie } from '@/app/(dashboard)/actions';
import { useTranslations } from 'next-intl';
import type { UserOrganization } from '@/services/organization.service';

interface OrganizationSelectorProps {
  organizations: UserOrganization[];
}

/**
 * Client Component for Organization Selection
 * Displays organization cards with role badges
 */
export function OrganizationSelector({ organizations }: OrganizationSelectorProps) {
  const router = useRouter();
  const t = useTranslations('Organization');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const handleSelectOrganization = async (orgId: string) => {
    setIsLoading(true);
    setSelectedOrgId(orgId);

    try {
      await setOrganizationCookie(orgId);
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error('Failed to set organization:', error);
      setIsLoading(false);
      setSelectedOrgId(null);
    }
  };

  useEffect(() => {
    if (organizations.length !== 1) return;
    const orgId = organizations[0].organization.id;
    void setOrganizationCookie(orgId).then(() => {
      router.push('/dashboard');
      router.refresh();
    });
  }, [organizations, router]);

  const getRoleColor = (role: string): 'default' | 'success' | 'warning' | 'danger' | 'accent' => {
    switch (role) {
      case 'OWNER':
        return 'accent';
      case 'ADMIN':
        return 'success';
      case 'EMPLOYEE':
        return 'warning';
      case 'SELLER':
        return 'default';
      case 'CUSTOMS_BROKER':
        return 'default';
      case 'VIEWER':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <Card variant="default" className="w-full shadow-lg border border-default-200/50 overflow-hidden">
      <Card.Content className="p-6 md:p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {t('select')}
          </h1>
          <p className="text-sm text-muted">
            {t('selectDescription')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {organizations.map(({ organization, role }) => {
            const isThisOrgLoading = isLoading && selectedOrgId === organization.id;
            const handleClick = () => handleSelectOrganization(organization.id);
            return (
              <div
                key={organization.id}
                role="button"
                tabIndex={0}
                onClick={handleClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleClick();
                  }
                }}
                aria-disabled={isLoading}
                className={`group text-left transition-all duration-200 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ${
                  isLoading ? 'pointer-events-none opacity-70' : 'cursor-pointer hover:-translate-y-0.5'
                }`}
              >
                <Card
                  variant="default"
                  className={`h-full border border-default-200/50 transition-all duration-200 ${
                    !isLoading && 'hover:shadow-md hover:border-accent/30'
                  }`}
                >
                  <Card.Content className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="shrink-0 rounded-xl bg-accent/10 p-3">
                        <Building2 className="w-6 h-6 text-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-foreground line-clamp-1">
                          {organization.name}
                        </h3>
                        <Chip
                          color={getRoleColor(role)}
                          size="sm"
                          variant="secondary"
                          className="mt-2"
                        >
                          {t(`role.${role}`)}
                        </Chip>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-muted mb-4">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0">CNPJ:</span>
                        <span className="font-mono text-foreground truncate">
                          {organization.document}
                        </span>
                      </div>
                      {organization.email && (
                        <div className="flex items-center gap-2">
                          <span className="shrink-0">Email:</span>
                          <span className="font-mono text-foreground truncate">
                            {organization.email}
                          </span>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="primary"
                      className="w-full"
                      isDisabled={isLoading}
                      startContent={
                        isThisOrgLoading ? (
                          <Spinner size="sm" color="current" />
                        ) : (
                          <ArrowRight className="w-4 h-4" />
                        )
                      }
                      aria-hidden
                    >
                      {isThisOrgLoading ? t('loading') : t('access')}
                    </Button>
                  </Card.Content>
                </Card>
              </div>
            );
          })}
        </div>

        {organizations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted">{t('noOrganizations')}</p>
          </div>
        )}
      </Card.Content>
    </Card>
  );
}
