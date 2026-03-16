'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dropdown, Avatar, Header, Label, Separator } from '@heroui/react';
import { User, Settings, LogOut, Shield, Building2, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useOrganization, useOrganizationState } from '@/contexts/organization-context';
import { signOutAction } from '@/app/actions/auth';

export function NavbarProfileDropdown() {
  const t = useTranslations('Navbar.Profile');
  const tOrg = useTranslations('Organization');
  const router = useRouter();
  const { membership, currentOrganization, profile } = useOrganizationState();
  const { availableOrganizations, switchOrganization } = useOrganization();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      await signOutAction();
    } catch (error) {
      console.error('Error signing out:', error);
      setIsLoggingOut(false);
    }
  };

  const userEmail = profile?.email || '';
  const userFullName = profile?.fullName || '';
  const organizationName = currentOrganization?.name || t('noOrganization');
  const userRole = membership?.role || 'VIEWER';
  const isSuperAdmin = profile?.systemRole === 'SUPER_ADMIN';
  const initials = organizationName.charAt(0).toUpperCase() + (organizationName.charAt(1) || '').toUpperCase();

  const canSelectOrganization = userRole !== 'SELLER' || isSuperAdmin;
  const showOrgSection = isMobile && canSelectOrganization;
  const showOrgList = showOrgSection && availableOrganizations.length > 1;

  const handleOrganizationSwitch = async (orgId: string) => {
    if (orgId === currentOrganization?.id) return;
    try {
      await switchOrganization(orgId);
      router.refresh();
    } catch (error) {
      console.error('Failed to switch organization:', error);
    }
  };

  return (
    <Dropdown>
      <Dropdown.Trigger className="flex items-center gap-2 hover:opacity-80 transition-opacity outline-none">
        <Avatar color="danger" size="sm">
          <Avatar.Fallback>{initials}</Avatar.Fallback>
        </Avatar>
        <div className="hidden md:flex flex-col items-start">
          <span className="text-sm font-medium">{userFullName}</span>
          <span className="text-xs text-muted">
            {t(`role.${userRole}`)}
          </span>
        </div>
      </Dropdown.Trigger>

      <Dropdown.Popover placement="bottom start" className="min-w-64">
        <div className="px-3 pt-3 pb-1">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold">{userFullName}</p>
            <p className="text-xs text-muted">{userEmail}</p>
          </div>
        </div>

        <Dropdown.Menu onAction={(key) => {
          const keyStr = key.toString();
          if (keyStr === 'my-profile') {
            router.push('/dashboard/profile');
          } else if (keyStr === 'settings') {
            router.push('/dashboard/settings');
          } else if (keyStr === 'admin-dashboard') {
            router.push('/admin');
          } else if (keyStr === 'org-create-new') {
            router.push('/dashboard/organizations/new');
          } else if (keyStr.startsWith('org-')) {
            handleOrganizationSwitch(keyStr.replace('org-', ''));
          } else if (keyStr === 'logout') {
            handleSignOut();
          }
        }}>
          {isSuperAdmin && (
            <Dropdown.Item
              id="admin-dashboard"
              isDisabled={isLoggingOut}
              textValue={t('adminDashboard')}
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <Label>{t('adminDashboard')}</Label>
              </div>
            </Dropdown.Item>
          )}
          <Dropdown.Item
            id="my-profile"
            isDisabled={isLoggingOut}
            textValue={t('myProfile')}
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <Label>{t('myProfile')}</Label>
            </div>
          </Dropdown.Item>

          <Dropdown.Item
            id="settings"
            isDisabled={isLoggingOut}
            textValue={t('settings')}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <Label>{t('settings')}</Label>
            </div>
          </Dropdown.Item>

          {showOrgSection && (
            <>
              <Separator />
              <Dropdown.Section>
                {showOrgList && (
                  <>
                    <Header>{tOrg('myOrganizations')}</Header>
                    {availableOrganizations
                      .filter((org) => org.organization.id !== currentOrganization?.id)
                      .map((org) => (
                        <Dropdown.Item
                          key={`org-${org.organization.id}`}
                          id={`org-${org.organization.id}`}
                          textValue={org.organization.name}
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted" />
                            <Label>{org.organization.name}</Label>
                          </div>
                        </Dropdown.Item>
                      ))}
                  </>
                )}
                <Dropdown.Item id="org-create-new" textValue={tOrg('createNew')}>
                  <div className="flex items-center gap-2 text-field-foreground">
                    <Plus className="w-4 h-4" />
                    <Label>{tOrg('createNew')}</Label>
                  </div>
                </Dropdown.Item>
              </Dropdown.Section>
            </>
          )}

          <Dropdown.Item
            id="logout"
            isDisabled={isLoggingOut}
            textValue={t('logout')}
            variant="danger"
          >
            <div className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              <Label>{isLoggingOut ? t('loggingOut') : t('logout')}</Label>
            </div>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
