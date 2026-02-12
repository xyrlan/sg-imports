'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Chip } from '@heroui/react';
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
      case 'OPERATOR':
        return 'warning';
      case 'VIEWER':
        return 'default';
      default:
        return 'default';
    }
  };

  return (
    <div className="w-full max-w-6xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('select')}</h1>
        <p className="text-muted">
          {t('selectDescription')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            className={`text-left transition-all hover:scale-[1.02] cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isLoading ? 'pointer-events-none opacity-70' : ''
            }`}
          >
            <Card variant="default" className="h-full">
              <Card.Content>
                <div className="flex-col items-start">
                  <div className="flex justify-between w-full items-start mb-2">
                    <h3 className="text-lg font-semibold line-clamp-1">
                      {organization.name}
                    </h3>
                    <Chip
                      color={getRoleColor(role)}
                      size="sm"
                      variant="secondary"
                    >
                      {t(`role.${role}`)}
                    </Chip>
                  </div>
                  
                </div>
                
                <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted">CNPJ:</span>
                      <span className="ml-2 font-mono">{organization.document}</span>
                    </div>
                    
                    {organization.email && (
                      <div>
                        <span className="text-muted">Email:</span>
                        <span className="ml-2 font-mono">{organization.email}</span>
                      </div>
                    )}
                    
                    <div
                      className="mt-4 w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md bg-accent text-foreground"
                      aria-hidden
                    >
                      {isThisOrgLoading ? t('loading') : t('access')}
                    </div>
                </div>
              </Card.Content>
            </Card>
          </div>
          );
        })}
      </div>

      {organizations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted">
            {t('noOrganizations')}
          </p>
        </div>
      )}
    </div>
  );
}
