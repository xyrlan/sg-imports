'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dropdown, Avatar, Label } from '@heroui/react';
import { User, Settings, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useOrganizationState } from '@/contexts/organization-context';
import { createClient } from '@/lib/supabase/client';

export function NavbarProfileDropdown() {
  const t = useTranslations('Navbar.Profile');
  const router = useRouter();
  const { membership, currentOrganization, profile } = useOrganizationState();
  const [isPending, startTransition] = useTransition();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      const supabase = createClient();
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Redirect to login page
      startTransition(() => {
        router.push('/login');
        router.refresh();
      });
    } catch (error) {
      console.error('Error signing out:', error);
      setIsLoggingOut(false);
    }
  };

  const userEmail = profile?.email || '';
  const userFullName = profile?.fullName || '';
  const organizationName = currentOrganization?.name || t('noOrganization');
  const userRole = membership?.role || 'VIEWER';
  const initials = organizationName.charAt(0).toUpperCase() + (organizationName.charAt(1) || '').toUpperCase();

  return (
    <Dropdown>
      <Dropdown.Trigger className="flex items-center gap-2 hover:opacity-80 transition-opacity outline-none">
        <Avatar color="accent" size="sm">
          <Avatar.Fallback>{initials}</Avatar.Fallback>
        </Avatar>
        <div className="hidden md:flex flex-col items-start">
          <span className="text-sm font-medium">{userFullName}</span>
          <span className="text-xs text-muted">
            {t(`role.${userRole}`)}
          </span>
        </div>
      </Dropdown.Trigger>

      <Dropdown.Popover placement="bottom start">
        <div className="px-3 pt-3 pb-1">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold">{userFullName}</p>
            <p className="text-xs text-muted">{userEmail}</p>
          </div>
        </div>

        <Dropdown.Menu onAction={(key) => {
          if (key === 'my-profile') {
            router.push('/dashboard/profile');
          } else if (key === 'settings') {
            router.push('/dashboard/settings');
          } else if (key === 'logout') {
            handleSignOut();
          }
        }}>
          <Dropdown.Item
            id="my-profile"
            isDisabled={isLoggingOut || isPending}
            textValue={t('myProfile')}
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <Label>{t('myProfile')}</Label>
            </div>
          </Dropdown.Item>

          <Dropdown.Item
            id="settings"
            isDisabled={isLoggingOut || isPending}
            textValue={t('settings')}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <Label>{t('settings')}</Label>
            </div>
          </Dropdown.Item>

          <Dropdown.Item
            id="logout"
            isDisabled={isLoggingOut || isPending}
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
