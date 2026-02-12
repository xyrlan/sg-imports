'use client';

import NextLink from 'next/link';
import { Link } from '@heroui/react';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { StorageRulesSection } from './components';
import type { TerminalWithRules } from '@/services/admin';

interface TerminalEditFormProps {
  terminal: TerminalWithRules;
  onBack?: () => void;
  onRefresh?: () => void;
}

export function TerminalEditForm({ terminal, onBack, onRefresh }: TerminalEditFormProps) {
  const t = useTranslations('Admin.Settings.Terminals');
  const backLink = onBack ? (
    <Link 
      onClick={onBack}
      className="inline-flex items-center gap-1 mb-4"
    >
      <ArrowLeft className="size-4" />
      {t('back')}
    </Link>
  ) : (
    <NextLink
      href="/admin/settings?activeSection=terminals"
      className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-4"
    >
      <ArrowLeft className="size-4" />
      {t('back')}
    </NextLink>
  );
  return (    
    <>
          {backLink}
          <StorageRulesSection terminal={terminal} onRefresh={onRefresh} />
    </>
  );
}
