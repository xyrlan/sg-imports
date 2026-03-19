'use client';

import { useState, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import type { SectionKey } from '../../constants';

export interface SettingsSection {
  key: SectionKey;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface SettingsSidebarProps {
  sections: SettingsSection[];
  activeSection: SectionKey;
  onSectionChange: (key: SectionKey) => void;
}

export function SettingsSidebar({
  sections,
  activeSection,
  onSectionChange,
}: SettingsSidebarProps) {
  const t = useTranslations('Admin.Settings');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  useEffect(() => {
    if (!isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, closeMobile]);

  const activeItem = sections.find((s) => s.key === activeSection);

  const header = (
    <div>
      <h1 className="text-xl font-bold">{t('title')}</h1>
      <p className="text-muted text-sm mt-1">{t('subtitle')}</p>
    </div>
  );

  return (
    <>
      {/* Mobile: collapsible section selector */}
      <div className="lg:hidden space-y-3">
        {header}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMobileOpen((prev) => !prev)}
            aria-expanded={isMobileOpen}
            aria-controls="settings-mobile-menu"
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-surface transition-colors"
          >
            {activeItem && (
              <span className="text-accent shrink-0">{activeItem.icon}</span>
            )}
            <span className="text-sm font-medium flex-1 text-left">
              {activeItem?.label}
            </span>
            <ChevronDown
              size={16}
              className={`text-muted transition-transform duration-200 ${
                isMobileOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {isMobileOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={closeMobile}
                aria-hidden="true"
              />
              <div
                id="settings-mobile-menu"
                role="listbox"
                className="absolute left-0 right-0 top-full mt-1 z-20 bg-background border border-border rounded-lg shadow-lg max-h-80 overflow-y-auto space-y-1 p-2"
              >
                {sections.map((section) => (
                  <SectionButton
                    key={section.key}
                    section={section}
                    isActive={activeSection === section.key}
                    role="option"
                    aria-selected={activeSection === section.key}
                    onClick={() => {
                      onSectionChange(section.key);
                      closeMobile();
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Desktop: sticky sidebar */}
      <div className="hidden lg:block max-w-80 shrink-0 rounded-lg space-y-6 sticky top-6 self-start">
        {header}
        <div className="space-y-1">
          {sections.map((section) => (
            <SectionButton
              key={section.key}
              section={section}
              isActive={activeSection === section.key}
              onClick={() => onSectionChange(section.key)}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function SectionButton({
  section,
  isActive,
  onClick,
  ...ariaProps
}: {
  section: SettingsSection;
  isActive: boolean;
  onClick: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`
        w-full text-left p-3 rounded-lg transition-colors duration-200 cursor-pointer
        flex items-start gap-3 group
        ${
          isActive
            ? 'bg-accent/10 border border-accent-soft-hover text-accent shadow-sm'
            : 'text-muted hover:bg-accent/10 hover:text-foreground'
        }
      `}
      onClick={onClick}
      {...ariaProps}
    >
      <div
        className={`shrink-0 mt-0.5 ${
          isActive ? 'text-accent' : 'text-muted group-hover:text-foreground'
        }`}
      >
        {section.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{section.label}</div>
        <div
          className={`text-xs mt-1 leading-relaxed ${
            isActive ? 'text-accent' : 'text-muted'
          }`}
        >
          {section.description}
        </div>
      </div>
    </button>
  );
}
