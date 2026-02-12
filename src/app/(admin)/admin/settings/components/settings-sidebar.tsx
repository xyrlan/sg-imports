'use client';

import { useTranslations } from 'next-intl';
import type { SectionKey } from '../constants';

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
  return (
    <div className="max-w-80 shrink-0 rounded-lg space-y-6 sticky top-6 self-start">
       <div>
        <h1 className="text-xl font-bold">{t('title')}</h1>
        <p className="text-muted text-sm mt-1">{t('subtitle')}</p>
      </div>
      <div className="space-y-1">
        {sections.map((section) => (
          <button
            key={section.key}
            type="button"
            className={`
              w-full text-left p-3 rounded-lg transition-colors duration-200 cursor-pointer
              flex items-start gap-3 group
              ${
                activeSection === section.key
                  ? 'bg-accent/10 border border-accent-soft-hover text-accent shadow-sm'
                  : 'text-muted hover:bg-accent/10 hover:text-foreground'
              }
            `}
            onClick={() => onSectionChange(section.key)}
          >
            <div
              className={`
                shrink-0 mt-0.5
                ${
                  activeSection === section.key
                    ? 'text-accent'
                    : 'text-muted group-hover:text-foreground'
                }
              `}
            >
              {section.icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{section.label}</div>
              <div
                className={`
                  text-xs mt-1 leading-relaxed
                  ${
                    activeSection === section.key
                      ? 'text-accent'
                      : 'text-muted'
                  }
                `}
              >
                {section.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
