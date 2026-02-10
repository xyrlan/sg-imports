'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Chip } from '@heroui/react';
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
    <div className="w-full max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('select')}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Escolha a organização que deseja acessar
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {organizations.map(({ organization, role }) => (
          <button
            key={organization.id}
            onClick={() => handleSelectOrganization(organization.id)}
            disabled={isLoading}
            className={`text-left transition-all hover:scale-[1.02]`}
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
                  {organization.tradeName && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                      {organization.tradeName}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">CNPJ:</span>
                      <span className="ml-2 font-mono">{organization.document}</span>
                    </div>
                    
                    {organization.email && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Email:</span>
                        <span className="ml-2 line-clamp-1">{organization.email}</span>
                      </div>
                    )}
                    
                    <Button
                      fullWidth
                      variant="primary"
                      size="sm"
                      isDisabled={isLoading && selectedOrgId === organization.id}
                      className="mt-4"
                      onPress={() => handleSelectOrganization(organization.id)}
                    >
                      {isLoading && selectedOrgId === organization.id ? 'Carregando...' : 'Acessar'}
                    </Button>
                </div>
              </Card.Content>
            </Card>
          </button>
        ))}
      </div>

      {organizations.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            {t('noOrganizations')}
          </p>
        </div>
      )}
    </div>
  );
}
