'use client';

import { useTranslations } from 'next-intl';
import { formatStorageFee, getFeeBasisLabel } from '@/lib/storage-utils';
import type { StorageRuleAdditionalFee } from '@/db/types';

interface StorageRuleAdditionalFeesProps {
  fees: StorageRuleAdditionalFee[];
}

export function StorageRuleAdditionalFees({ fees }: StorageRuleAdditionalFeesProps) {
  const t = useTranslations('Admin.Settings.Terminals');

  if (fees.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium mb-1">{t('StorageRuleForm.additionalFees')}:</p>
      {fees.slice(0, 3).map((fee, idx) => (
        <div key={idx} className="flex items-center justify-between text-xs">
          <span className="truncate">{fee.name}:</span>
          <span className="font-medium">
            {formatStorageFee(Number(fee.value))} ({getFeeBasisLabel(fee.basis)})
          </span>
        </div>
      ))}
      {fees.length > 3 && (
        <p className="text-xs italic">
          +{fees.length - 3} {t('StorageRules.moreFees')}
        </p>
      )}
    </div>
  );
}
