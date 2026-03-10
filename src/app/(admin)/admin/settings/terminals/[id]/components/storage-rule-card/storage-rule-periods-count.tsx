'use client';

import { useTranslations } from 'next-intl';
import { Calendar } from 'lucide-react';
import type { StorageRuleWithPeriods } from './types';

interface StorageRulePeriodsCountProps {
  rule: StorageRuleWithPeriods;
}

export function StorageRulePeriodsCount({ rule }: StorageRulePeriodsCountProps) {
  const t = useTranslations('Admin.Settings.Terminals');
  const periods = rule.periods ?? [];
  const formatRate = (rate: string) => {
    return (parseFloat(String(rate).replace(',', '.')) * 100).toFixed(2);
  };

  return (
    <div className="pt-2 border-t space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium">
          {periods.length} {t('StorageRules.periodsCount')}
        </span>
      </div>
      {periods.length > 0 && (
        <div className="space-y-1.5">
          {periods.map((period) => (
            <div
              key={period.id}
              className="flex items-center justify-between gap-2 flex-wrap rounded-lg px-2.5 py-1.5 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Calendar size={12} className="shrink-0" />
                <span className="font-medium">
                  {period.daysFrom}
                  {period.daysTo != null ? `\u2013${period.daysTo}` : '+'}{' '}
                  <span className="font-normal">{t('StorageRuleForm.days')}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-semibold">
                  {formatRate(String(period.rate))}
                </span>
                <span className="text-[10px]">
                  {period.chargeType === 'PERCENTAGE'
                    ? t('StorageRuleForm.percentage')
                    : t('StorageRuleForm.fixed')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
