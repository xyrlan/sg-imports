'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle } from 'lucide-react';
import type { ShipmentDetail } from '../shipment-utils';

// ============================================
// Props
// ============================================

interface CompletionStepProps {
  shipment: ShipmentDetail;
  readOnly?: boolean;
}

// ============================================
// Component
// ============================================

export function CompletionStep({ shipment: _shipment }: CompletionStepProps) {
  const t = useTranslations('Admin.Shipments.Steps.Completion');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-default-400" />
        <h3 className="text-base font-semibold text-default-700">{t('title')}</h3>
      </div>

      <div className="rounded-lg border border-dashed border-default-300 p-6 text-center">
        <p className="text-sm text-default-400">{t('placeholder')}</p>
      </div>
    </div>
  );
}
