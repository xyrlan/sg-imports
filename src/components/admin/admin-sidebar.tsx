'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Users,
  LogOut,
  ShieldCheck,
  Settings,
} from 'lucide-react';

interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ReactNode;
}

export function AdminSidebar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('Admin.Sidebar');

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
      labelKey: 'settings',
      href: '/admin/settings',
      icon: <Settings className="size-5 shrink-0" />,
    },
  ];

  const navClassName = `fixed z-50 left-0 top-0 h-screen py-6 flex flex-col gap-6 bg-background shadow-lg transition-all duration-200 ease-in-out overflow-hidden text-nowrap ${
    isExpanded ? 'max-w-[288px] p-2' : 'max-w-[83px] p-2'
  }`;

  function isActive(href: string) {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  }

  return (
    <nav
      className={navClassName}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-3 px-5 pb-2">
        <ShieldCheck className="size-7 shrink-0 text-accent" />
        <span
          className={`font-bold text-lg transition-opacity duration-200 ${
            isExpanded ? 'opacity-100' : 'opacity-0'
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
              className={`flex items-center gap-3 px-6 py-3 rounded-lg transition-colors ${
                active
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-muted hover:bg-default-200 hover:text-foreground'
              }
              `}
            >
              {item.icon}
              <span
                className={`text-sm transition-opacity duration-200 ${
                  isExpanded ? 'opacity-100' : 'opacity-0'
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
        className="flex items-center gap-3 px-6 py-3 rounded-lg text-muted hover:text-foreground transition-colors"
      >
        <LogOut className="size-5 shrink-0" />
        <span
          className={`text-sm transition-opacity duration-200 ${
            isExpanded ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {t('backToDashboard')}
        </span>
      </Link>
    </nav>
  );
}
