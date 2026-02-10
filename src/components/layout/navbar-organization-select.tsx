'use client';

import { useState } from 'react';
import { Select, ListBox, Label } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { Building2 } from 'lucide-react';

import { useOrganization } from '@/contexts/organization-context';

export function NavbarOrganizationSelect() {
  const t = useTranslations('Organization');
  const {
    currentOrganization,
    availableOrganizations,
    switchOrganization,
    isLoading,
  } = useOrganization();

  const [isSwitching, setIsSwitching] = useState(false);

  const handleOrganizationChange = async (key: string | number | null) => {
    if (!key) return;
    
    const selectedOrgId = key.toString();

    if (selectedOrgId && selectedOrgId !== currentOrganization?.id) {
      try {
        setIsSwitching(true);
        await switchOrganization(selectedOrgId);
      } catch (error) {
        console.error('Failed to switch organization:', error);
        setIsSwitching(false);
      }
    }
  };

  return (
    <Select
      aria-label={t('select')}
      className="w-48"
      defaultValue={currentOrganization?.id}
      isDisabled={isLoading || isSwitching}
      placeholder={t('select')}
      onChange={handleOrganizationChange}
    >
      <Label className="sr-only">{t('select')}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {availableOrganizations.map((org) => (
            <ListBox.Item 
              key={org.organization.id} 
              id={org.organization.id} 
              textValue={org.organization.name}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{org.organization.name}</span>
                  <span className="text-xs text-muted">
                    {t(`role.${org.role}`)}
                  </span>
                </div>
              </div>
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
