'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Users,
  LogOut,
  ShieldCheck,
  Settings,
  Package,
  Menu,
  X,
} from 'lucide-react';

interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ReactNode;
}

export function AdminSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('Admin.Sidebar');

  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, closeMobile]);

  const navItems: NavItem[] = [
    {
      labelKey: 'dashboard',
      href: '/admin',
      icon: <LayoutDashboard className="size-5 shrink-0" />,
    },
    {
      labelKey: 'management',
      href: '/admin/users-organizations',
      icon: <Users className="size-5 shrink-0" />,
    },
    {
      labelKey: 'products',
      href: '/admin/products',
      icon: <Package className="size-5 shrink-0" />,
    },
    {
      labelKey: 'settings',
      href: '/admin/settings',
      icon: <Settings className="size-5 shrink-0" />,
    },
  ];

  function isActive(href: string) {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  }

  const sidebarContent = (expanded: boolean, onLinkClick?: () => void) => (
    <>
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-5 pb-2">
        <ShieldCheck className="size-7 shrink-0 text-accent" />
        <span
          className={`font-bold text-lg transition-opacity duration-200 ${
            expanded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {t('brand')}
        </span>
      </div>

      {/* Separator */}
      <div className="mx-3 border-t border-default-200" />

      {/* Navigation Items */}
      <div className="flex flex-col gap-1 flex-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={`flex items-center gap-3 px-6 py-3 rounded-lg transition-colors ${
                active
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-muted hover:bg-default-200 hover:text-foreground'
              }`}
            >
              {item.icon}
              <span
                className={`text-sm transition-opacity duration-200 ${
                  expanded ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Footer: Back to dashboard */}
      <div className="mx-3 border-t border-default-200" />
      <Link
        href="/dashboard"
        onClick={onLinkClick}
        className="flex items-center gap-3 px-6 py-3 rounded-lg text-muted hover:text-foreground transition-colors"
      >
        <LogOut className="size-5 shrink-0" />
        <span
          className={`text-sm transition-opacity duration-200 ${
            expanded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {t('backToDashboard')}
        </span>
      </Link>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 bg-background shadow-sm px-4 py-3 lg:hidden">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-1.5 rounded-lg hover:bg-default-200 transition-colors"
          aria-label={t('openMenu')}
        >
          <Menu className="size-5" />
        </button>
        <ShieldCheck className="size-5 text-accent" />
        <span className="font-bold text-sm">{t('brand')}</span>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={closeMobile}
          aria-hidden
        />
      )}

      {/* Mobile slide-out sidebar */}
      <nav
        className={`fixed z-50 left-0 top-0 h-screen w-[288px] px-2 py-6 flex flex-col gap-6 bg-background shadow-lg transition-transform duration-200 ease-in-out lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button */}
        <div className="flex justify-end px-3">
          <button
            onClick={closeMobile}
            className="p-1.5 rounded-lg hover:bg-default-200 transition-colors"
            aria-label={t('closeMenu')}
          >
            <X className="size-5" />
          </button>
        </div>
        {sidebarContent(true, closeMobile)}
      </nav>

      {/* Desktop sidebar (hover expand) */}
      <nav
        className={`hidden lg:flex fixed z-50 left-0 top-0 h-screen py-6 flex-col gap-6 bg-background shadow-lg transition-all duration-200 ease-in-out overflow-hidden text-nowrap ${
          isExpanded ? 'max-w-[288px] px-2' : 'max-w-[83px] px-2'
        }`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {sidebarContent(isExpanded)}
      </nav>
    </>
  );
}
