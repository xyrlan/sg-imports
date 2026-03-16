'use client';

import { useRouter } from 'next/navigation';
import { Dropdown, Label, Separator } from '@heroui/react';
import { useTranslations } from 'next-intl';
import { Menu, Bell } from 'lucide-react';

import { useOrganizationState } from '@/contexts/organization-context';
import { useNotifications } from '@/hooks/use-notifications';
import type { NavbarLink } from './navbar';

interface NavbarMobileMenuProps {
  links: NavbarLink[];
}

export function NavbarMobileMenu({ links }: NavbarMobileMenuProps) {
  const t = useTranslations('Navbar');
  const router = useRouter();
  const { profile } = useOrganizationState();
  const { unreadCount } = useNotifications(profile?.id);

  return (
    <Dropdown>
      <Dropdown.Trigger
        className="relative flex items-center justify-center p-2 rounded-lg hover:bg-default-100 transition-colors outline-none"
        aria-label={unreadCount > 0 ? `${t('menu')} - ${unreadCount} ${t('notifications')}` : t('menu')}
      >
        <Menu className="w-5 h-5 text-foreground" aria-hidden />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex min-w-4 h-4 items-center justify-center rounded-full bg-danger text-[10px] font-medium text-danger-foreground px-1"
            aria-hidden
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Dropdown.Trigger>

      <Dropdown.Popover placement="bottom end" className="min-w-64">
        <Dropdown.Menu
          onAction={(key) => {
            const keyStr = key.toString();

            // Navigation links
            const matchedLink = links.find((l) => l.href === keyStr);
            if (matchedLink) {
              router.push(matchedLink.href);
              return;
            }

            // Notifications
            if (keyStr === 'notifications') {
              router.push('/dashboard/notifications');
              return;
            }
          }}
        >
          {/* Navigation Section */}
          <Dropdown.Section>
            {links.map((link) => (
              <Dropdown.Item key={link.href} id={link.href} textValue={link.label}>
                <div className="flex items-center gap-2">
                  {link.icon}
                  <Label>{link.label}</Label>
                </div>
              </Dropdown.Item>
            ))}
          </Dropdown.Section>

          {/* Notifications Section */}
          <Separator />
          <Dropdown.Section>
            <Dropdown.Item id="notifications" textValue={t('notifications')}>
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <Label>{t('notifications')}</Label>
                {unreadCount > 0 && (
                  <span className="ml-auto flex min-w-5 h-5 items-center justify-center rounded-full bg-danger text-[10px] font-medium text-danger-foreground px-1">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
            </Dropdown.Item>
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
