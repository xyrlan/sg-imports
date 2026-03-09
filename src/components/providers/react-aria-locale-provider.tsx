'use client';

import { I18nProvider } from '@react-aria/i18n';

/** Maps next-intl locale codes to BCP 47 for React Aria (date/number formatting) */
const LOCALE_MAP: Record<string, string> = {
  pt: 'pt-BR', // Brasil: dd/mm/yyyy
  en: 'en-US', // US: mm/dd/yyyy
  zh: 'zh-CN', // China: yyyy/mm/dd
};

interface ReactAriaLocaleProviderProps {
  children: React.ReactNode;
  /** Locale from next-intl (e.g. 'pt', 'en', 'zh') */
  locale: string;
}

export function ReactAriaLocaleProvider({
  children,
  locale,
}: ReactAriaLocaleProviderProps) {
  const reactAriaLocale = LOCALE_MAP[locale] ?? locale;

  return (
    <I18nProvider locale={reactAriaLocale}>
      {children}
    </I18nProvider>
  );
}
