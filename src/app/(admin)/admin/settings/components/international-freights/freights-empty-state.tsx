'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@heroui/react';
import { Ship } from 'lucide-react';

export function FreightsEmptyState() {
  const t = useTranslations('Admin.Settings.InternationalFreights');

  return (
    <Card className="p-12">
      <div className="text-center">
        <Ship className="mx-auto mb-4 size-12 text-muted" />
        <p className="text-muted">{t('noFreights')}</p>
        <p className="text-sm text-muted mt-1">{t('noFreightsHint')}</p>
      </div>
    </Card>
  );
}
