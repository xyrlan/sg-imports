'use client';

import { useTranslations } from 'next-intl';
import { formatStorageFee, formatStoragePercent } from '@/lib/storage-utils';
import type { StorageRuleWithPeriods } from './types';

interface StorageRuleMinValueSectionProps {
  rule: StorageRuleWithPeriods;
}

export function StorageRuleMinValueSection({ rule }: StorageRuleMinValueSectionProps) {
  const t = useTranslations('Admin.Settings.Terminals');
  const isLCL = rule.shipmentType === 'SEA_LCL';
  const currency = rule.currency ?? 'BRL';

  return (
    <div className="pt-2 border-t border-default-200 space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span>{t('StorageRuleForm.minValue')}:</span>
        <span className="font-medium">
          {formatStorageFee(Number(rule.minValue ?? 0), currency)}
        </span>
      </div>
      {isLCL && Number(rule.cifInsurance ?? 0) > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span>{t('StorageRuleForm.cifInsurance')}:</span>
          <span className="font-medium">
            {formatStoragePercent(Number(String(rule.cifInsurance ?? 0).replace(',', '.')))}
          </span>
        </div>
      )}
    </div>
  );
}
