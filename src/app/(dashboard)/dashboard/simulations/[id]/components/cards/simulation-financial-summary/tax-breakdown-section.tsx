'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@heroui/react';
import { ChevronDown, ChevronUp, Receipt } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { TaxBreakdown } from './use-tax-breakdown';

interface TaxBreakdownSectionProps {
  totalTaxesBrl: number;
  taxBreakdown: TaxBreakdown;
  hasTaxBreakdown: boolean;
}

export function TaxBreakdownSection({
  totalTaxesBrl,
  taxBreakdown,
  hasTaxBreakdown,
}: TaxBreakdownSectionProps) {
  const t = useTranslations('Simulations.FinancialSummary');
  const [expanded, setExpanded] = useState(false);

  const formatBrl = (value: number) => formatCurrency(value, 'pt-BR', 'BRL');

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center gap-3">
        <Receipt className="size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-xs">{t('totalTaxesBrl')}</p>
          <p className="font-medium">{formatBrl(totalTaxesBrl)}</p>
        </div>
        {hasTaxBreakdown && (
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setExpanded((v) => !v)}
            className="shrink-0 text-xs inline-flex items-center gap-1"
          >
            {expanded ? t('taxDetailsLess') : t('taxDetails')}
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </Button>
        )}
      </div>
      {hasTaxBreakdown && (
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-out"
          style={{ gridTemplateRows: expanded ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className="pt-2 space-y-1 border-t border-default-200">
              {taxBreakdown.ii > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{t('taxII')}</span>
                  <span className="font-mono">{formatBrl(taxBreakdown.ii)}</span>
                </div>
              )}
              {taxBreakdown.ipi > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{t('taxIPI')}</span>
                  <span className="font-mono">{formatBrl(taxBreakdown.ipi)}</span>
                </div>
              )}
              {taxBreakdown.pis > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{t('taxPIS')}</span>
                  <span className="font-mono">{formatBrl(taxBreakdown.pis)}</span>
                </div>
              )}
              {taxBreakdown.cofins > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{t('taxCOFINS')}</span>
                  <span className="font-mono">{formatBrl(taxBreakdown.cofins)}</span>
                </div>
              )}
              {taxBreakdown.siscomex > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{t('taxSiscomex')}</span>
                  <span className="font-mono">{formatBrl(taxBreakdown.siscomex)}</span>
                </div>
              )}
              {taxBreakdown.afrmm > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{t('taxAFRMM')}</span>
                  <span className="font-mono">{formatBrl(taxBreakdown.afrmm)}</span>
                </div>
              )}
              {taxBreakdown.icms > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{t('taxICMS')}</span>
                  <span className="font-mono">{formatBrl(taxBreakdown.icms)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
