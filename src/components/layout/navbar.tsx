'use client';

import NextLink from 'next/link';
import { 
  PackageOpen, 
  ClipboardList, 
  ShipIcon, 
  FileText, 
  ClipboardPen
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Separator, Link } from '@heroui/react';

import { useOrganizationState } from '@/contexts/organization-context';

import { NavbarProfileDropdown } from './navbar-profile-dropdown';
import { NavbarOrganizationSelect } from './navbar-organization-select';
import { NavbarProformaQuoteSelect } from './navbar-proforma-quote-select';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { Logo } from '../logo';
import { NavbarMobileMenu } from './navbar-mobile-menu';
import { useEffect, useMemo, useState } from 'react';

export interface NavbarLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

export function Navbar() {
  const t = useTranslations('Navbar');
  const { membership, profile } = useOrganizationState();

  const userRole = membership?.role || 'VIEWER';
  const isSuperAdmin = profile?.systemRole === 'SUPER_ADMIN';

  const canSelectOrganization = userRole !== 'SELLER' || isSuperAdmin ;

  // Define navigation links based on user role
  const navLinks: NavbarLink[] = [
    {
      href: '/dashboard/orders',
      label: t('orders'),
      icon: <ClipboardList className="w-5 h-5" />,
      roles: ['OWNER', 'ADMIN', 'ADMIN_EMPLOYEE', 'SELLER', 'VIEWER'],
    },
    {
      href: '/dashboard/shipments',
      label: t('shipments'),
      icon: <ShipIcon className="w-5 h-5" />,
      roles: ['CUSTOMS_BROKER'],
    },
    {
      href: '/dashboard/simulations',
      label: t('simulations'),
      icon: <ClipboardPen className="w-5 h-5" />,
      roles: [ 'SELLER'],
    },
    {
      href: '/dashboard/proposals',
      label: t('proposals'),
      icon: <FileText className="w-5 h-5" />,
      roles: ['OWNER', 'ADMIN', 'ADMIN_EMPLOYEE', 'VIEWER'],
    },
    {
      href: '/dashboard/products',
      label: t('products'),
      icon: <PackageOpen className="w-5 h-5" />,
      roles: ['SELLER'],
    },
  ];

  // Filter links based on user role
  const filteredLinks = navLinks.filter(
    (link) => !link.roles || link.roles.includes(userRole) || isSuperAdmin
  );

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    queueMicrotask(() => {
      setIsMobile(mq.matches);
    });
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <nav className="mx-auto flex h-16 max-w-full items-center justify-between px-4">
        {/* Left Content */}
        <div className="flex items-center gap-4">
       {/* <NextLink
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            href="/dashboard"
            hidden={isMobile}
          >
            <Logo />
          </NextLink>

          <Separator
            className="h-8 hidden md:block"
            orientation="vertical"
          /> */}

          <NavbarProfileDropdown isMobile={isMobile} />

          {canSelectOrganization && (
            <>
          <Separator
            className="h-8 hidden md:block"
            orientation="vertical"
          />
            <div className="hidden sm:flex">
              <NavbarOrganizationSelect />
            </div>
            </>

          )}


        </div>

        {/* Right Content - Navigation Links */}
        <div className="hidden lg:flex items-center gap-2">
          {filteredLinks.map((link) => (
            <Link
              key={link.href}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-border transition-colors text-foreground no-underline"
              href={link.href}
            >
              {link.icon}
              <span className="hidden xl:inline text-sm">{link.label}</span>
            </Link>
          ))}
                    <Separator
            className="h-8 hidden md:block"
            orientation="vertical"
          />

          <NotificationBell />
        </div>

        {/* Mobile Menu */}
        <div className="flex lg:hidden">
          <NavbarMobileMenu links={filteredLinks} />
        </div>

      </nav>
    </header>
  );
}
