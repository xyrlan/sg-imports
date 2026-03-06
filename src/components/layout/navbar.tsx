'use client';

import NextLink from 'next/link';
import { 
  PackageOpen, 
  ClipboardList, 
  ShipIcon, 
  FileText 
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Separator, Link } from '@heroui/react';

import { useOrganizationState } from '@/contexts/organization-context';

import { NavbarProfileDropdown } from './navbar-profile-dropdown';
import { NavbarOrganizationSelect } from './navbar-organization-select';
import { NavbarProformaQuoteSelect } from './navbar-proforma-quote-select';

interface NavbarLink {
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

  // Proforma select: only SELLER (org role) or SUPER_ADMIN (system role bypass)
  const canSelectProforma = userRole === 'SELLER' || isSuperAdmin;

  const canSelectOrganization = userRole !== 'SELLER' || isSuperAdmin ;

  // Define navigation links based on user role
  const navLinks: NavbarLink[] = [
    {
      href: '/dashboard/quotes',
      label: t('quotes'),
      icon: <FileText className="w-5 h-5" />,
      roles: ['OWNER', 'ADMIN', 'ADMIN_EMPLOYEE', 'VIEWER'],
    },
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
      roles: ['OWNER', 'ADMIN', 'ADMIN_EMPLOYEE', 'CUSTOMS_BROKER', 'VIEWER'],
    },
    {
      href: '/dashboard/products',
      label: t('products'),
      icon: <PackageOpen className="w-5 h-5" />,
      roles: ['ADMIN', 'ADMIN_EMPLOYEE', 'SELLER'],
    },
  ];

  // Filter links based on user role
  const filteredLinks = navLinks.filter(
    (link) => !link.roles || link.roles.includes(userRole)
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-default-300 bg-content2">
      <nav className="mx-auto flex h-16 max-w-full items-center justify-between px-4">
        {/* Left Content */}
        <div className="flex items-center gap-4">
          <NextLink
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            href="/dashboard"
          >
            <h1 className="font-bold text-lg max-md:hidden">
              SG Imports
            </h1>
          </NextLink>

          <Separator
            className="h-8 hidden md:block"
            orientation="vertical"
          />

          <NavbarProfileDropdown />


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

<Separator
            className="h-8 hidden md:block"
            orientation="vertical"
          />

          {canSelectProforma && (
            <div className="hidden sm:flex">
              <NavbarProformaQuoteSelect />
            </div>
          )}
        </div>

        {/* Right Content - Navigation Links */}
        <div className="hidden lg:flex items-center gap-2">
          {filteredLinks.map((link) => (
            <Link
              key={link.href}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-default-100 transition-colors text-foreground no-underline"
              href={link.href}
            >
              {link.icon}
              <span className="hidden xl:inline text-sm">{link.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
