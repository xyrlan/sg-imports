'use client';

import { memo, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, Chip } from '@heroui/react';
import { Calendar, Copy, DollarSign, Edit, Trash2 } from 'lucide-react';
import { getValidityStatus } from './constants';
import { resolveEffectivePricingAction } from './actions';
import type { PricingRuleWithRelations } from './types';

const CURRENCY_SYMBOLS: Record<string, string> = {
  BRL: 'R$',
  USD: '$',
  CNY: '¥',
};

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('pt-BR');
}

interface PricingRuleCardProps {
  rule: PricingRuleWithRelations;
  onEdit: (rule: PricingRuleWithRelations) => void;
  onDelete: (rule: PricingRuleWithRelations) => void;
  onDuplicate: (rule: PricingRuleWithRelations) => void;
  showDuplicate?: boolean;
}

export const PricingRuleCard = memo(function PricingRuleCard({
  rule,
  onEdit,
  onDelete,
  onDuplicate,
  showDuplicate = true,
}: PricingRuleCardProps) {
  const t = useTranslations('Admin.Settings.FreightTaxas');
  const [effectiveFees, setEffectiveFees] = useState<Array<{ name: string; amount: number; currency: string; source: string }> | null>(null);
  const [isPending, startTransition] = useTransition();

  const validityStatus = getValidityStatus(rule.validTo);
  const scopeColors = {
    CARRIER: { border: 'border-success-200', bg: 'bg-success-50/30', text: 'text-success-700' },
    PORT: { border: 'border-primary-200', bg: 'bg-primary-50/30', text: 'text-primary-700' },
    SPECIFIC: { border: 'border-default-300', bg: '', text: 'text-default-800' },
  };
  const colors = scopeColors[rule.scope] ?? scopeColors.SPECIFIC;

  const loadEffectiveFees = () => {
    if (!rule.portId || !rule.containerType || rule.scope !== 'SPECIFIC') return;
    startTransition(async () => {
      const result = await resolveEffectivePricingAction(
        rule.carrierId,
        rule.portId!,
        rule.containerType as 'GP_20' | 'GP_40' | 'HC_40' | 'RF_20' | 'RF_40',
        (rule.portDirection as 'ORIGIN' | 'DESTINATION' | 'BOTH') ?? 'BOTH'
      );
      if (result.ok && result.effectiveFees) {
        setEffectiveFees(result.effectiveFees);
      }
    });
  };

  const directionColor = {
    ORIGIN: 'accent',
    DESTINATION: 'success',
    BOTH: 'default',
  } as const;

  return (
    <Card className={`border ${colors.border} ${colors.bg}`}>
      <div className="p-3 space-y-4">
        {(rule.port || rule.containerType) && (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold text-default-800">{rule.port?.name ?? '-'}</p>
            <div className="flex items-center gap-2">
              {rule.containerType && (
                <Chip size="sm" variant="soft">
                  {t(`containerTypes.${rule.containerType}`)}
                </Chip>
              )}
              {(rule.scope === 'PORT' || rule.scope === 'SPECIFIC') && (
                <Chip
                  size="sm"
                  variant="soft"
                  color={directionColor[rule.portDirection as keyof typeof directionColor] ?? 'default'}
                >
                  {rule.portDirection === 'ORIGIN'
                    ? t('portDirectionOrigin')
                    : rule.portDirection === 'DESTINATION'
                      ? t('portDirectionDestination')
                      : t('portDirectionBoth')}
                </Chip>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-default-600">
          <Calendar size={10} />
          <span>
            {formatDate(rule.validFrom)}
            {rule.validTo && ` ${t('until')} ${formatDate(rule.validTo)}`}
          </span>
          <Chip
            size="sm"
            variant="soft"
            color={validityStatus === 'valid' ? 'success' : validityStatus === 'expired' ? 'danger' : 'warning'}
          >
            {validityStatus === 'valid' ? t('validity.valid') : validityStatus === 'expired' ? t('validity.expired') : t('validity.expiring')}
          </Chip>
        </div>

        <div className="space-y-1">
          {rule.items.map((item) => (
            <div key={item.id} className="flex justify-between text-xs">
              <span className="text-default-700">
                {item.name} {item.basis === 'PER_BL' ? `(${t('perBl')})` : `(${t('perContainer')})`}
              </span>
              <span className={`font-semibold ${colors.text}`}>
                {CURRENCY_SYMBOLS[item.currency] ?? item.currency}{' '}
                {Number(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>

        {rule.scope === 'SPECIFIC' && rule.portId && rule.containerType && (
          <>
            {!effectiveFees && !isPending && (
              <Button size="sm" variant="secondary" fullWidth onPress={loadEffectiveFees}>
                <DollarSign size={14} className="mr-1" />
                {t('viewEffectiveFees')}
              </Button>
            )}
            {isPending && (
              <div className="rounded-lg border border-default-200 bg-default-50 p-2">
                <p className="text-xs text-default-500 text-center">{t('loadingEffectiveFees')}</p>
              </div>
            )}
            {effectiveFees && effectiveFees.length > 0 && (
              <div className="rounded-lg border border-primary-200 bg-primary-50 p-2">
                <p className="text-xs font-semibold text-primary-800 mb-2">{t('effectiveFeesTitle')}</p>
                <div className="space-y-1">
                  {effectiveFees.map((fee, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1">
                        <span className="text-default-700">{fee.name}</span>
                        <Chip
                          size="sm"
                          color={
                            fee.source === 'CARRIER' ? 'success' : fee.source === 'PORT' ? 'accent' : 'default'
                          }
                          variant="soft"
                          className="h-4"
                        >
                          {fee.source === 'CARRIER' ? t('sourceCarrier') : fee.source === 'PORT' ? t('sourcePort') : t('sourceSpecific')}
                        </Chip>
                      </div>
                      <span className="font-bold text-primary-700">
                        {CURRENCY_SYMBOLS[fee.currency] ?? fee.currency}{' '}
                        {Number(fee.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className={`flex gap-1 justify-end pt-2 border-t ${colors.border}`}>
          <Button isIconOnly size="sm" variant="ghost" onPress={() => onEdit(rule)} aria-label={t('ariaEdit')}>
            <Edit size={14} />
          </Button>
          {showDuplicate && (
            <Button isIconOnly size="sm" variant="ghost" onPress={() => onDuplicate(rule)} aria-label={t('ariaDuplicate')}>
              <Copy size={14} />
            </Button>
          )}
          {rule.scope === 'SPECIFIC' && rule.portId && rule.containerType && (
            <Button isIconOnly size="sm" variant="ghost" onPress={loadEffectiveFees} aria-label={t('ariaViewEffectiveFees')}>
              <DollarSign size={14} />
            </Button>
          )}
          <Button isIconOnly size="sm" variant="danger-soft" onPress={() => onDelete(rule)} aria-label={t('ariaDelete')}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    </Card>
  );
});
