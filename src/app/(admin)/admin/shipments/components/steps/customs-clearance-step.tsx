'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Chip } from '@heroui/react';
import { Shield } from 'lucide-react';
import type { ShipmentDetail } from '../shipment-utils';
import { generate90InvoiceAction, registerDuimpAction } from '../../[id]/actions';

// ============================================
// Props
// ============================================

interface CustomsClearanceStepProps {
  shipment: ShipmentDetail;
  readOnly?: boolean;
}

// ============================================
// Helpers
// ============================================

const CHANNEL_COLORS: Record<string, 'default' | 'warning' | 'success' | 'danger'> = {
  GREEN: 'success',
  YELLOW: 'warning',
  RED: 'danger',
  GREY: 'default',
};

function formatBrl(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';
  return `R$ ${num.toFixed(2)}`;
}

// ============================================
// Sub-components
// ============================================

interface Invoice90CardProps {
  shipment: ShipmentDetail;
  readOnly: boolean;
}

function Invoice90Card({ shipment, readOnly }: Invoice90CardProps) {
  const t = useTranslations('Admin.Shipments.Steps.CustomsClearance');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const totalCostsBrl = parseFloat(shipment.totalCostsBrl ?? '0');

  const paidMerchandiseTxns = (shipment.transactions ?? []).filter(
    (tx) => tx.type === 'MERCHANDISE' && tx.status === 'PAID',
  );
  const paidFobBrl = paidMerchandiseTxns.reduce(
    (sum, tx) => sum + parseFloat(tx.amountBrl ?? '0'),
    0,
  );

  const remaining = totalCostsBrl - paidFobBrl;
  const invoice90Value = remaining * 0.9;

  const balanceTxn = (shipment.transactions ?? []).find((tx) => tx.type === 'BALANCE');

  const handleGenerate90 = () => {
    startTransition(async () => {
      await generate90InvoiceAction(shipment.id);
      router.refresh();
    });
  };

  return (
    <div className="rounded-lg border border-default-200 bg-default-50 p-4 space-y-3">
      <p className="text-sm font-semibold text-default-700">{t('invoice90')}</p>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-xs text-default-500">{t('totalCosts')}: </span>
          <span className="font-medium text-default-700">{formatBrl(shipment.totalCostsBrl)}</span>
        </div>
        <div>
          <span className="text-xs text-default-500">{t('paidFobBrl')}: </span>
          <span className="font-medium text-default-700">{formatBrl(String(paidFobBrl))}</span>
        </div>
        <div>
          <span className="text-xs text-default-500">{t('remaining')}: </span>
          <span className="font-medium text-default-700">{formatBrl(String(remaining))}</span>
        </div>
        <div>
          <span className="text-xs text-default-500">{t('invoice90Value')}: </span>
          <span className="font-medium text-default-700">{formatBrl(String(invoice90Value))}</span>
        </div>
      </div>

      {balanceTxn && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-default-500">{t('invoiceStatus')}: </span>
          <Chip
            size="sm"
            variant="soft"
            color={balanceTxn.status === 'PAID' ? 'success' : balanceTxn.status === 'OVERDUE' ? 'danger' : 'warning'}
          >
            {balanceTxn.status}
          </Chip>
        </div>
      )}

      {!readOnly && !balanceTxn && (
        <Button size="sm" variant="outline" onPress={handleGenerate90} isPending={isPending}>
          {t('generate90Invoice')}
        </Button>
      )}
    </div>
  );
}

interface DuimpCardProps {
  shipment: ShipmentDetail;
  readOnly: boolean;
}

function DuimpCard({ shipment, readOnly }: DuimpCardProps) {
  const t = useTranslations('Admin.Shipments.Steps.CustomsClearance');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [duimpNumber, setDuimpNumber] = useState(shipment.duimpNumber ?? '');

  const handleRegister = () => {
    if (!duimpNumber.trim()) return;
    startTransition(async () => {
      await registerDuimpAction(shipment.id, duimpNumber.trim());
      router.refresh();
    });
  };

  const hasDuimp = !!shipment.duimpNumber;
  const hasChannel = !!shipment.duimpChannel;

  const taxExpenses = (shipment.expenses ?? []).filter((exp) =>
    (exp.category ?? '').startsWith('TAX_'),
  );

  return (
    <div className="rounded-lg border border-default-200 bg-default-50 p-4 space-y-4">
      <p className="text-sm font-semibold text-default-700">{t('duimp')}</p>

      {/* DUIMP number input */}
      <div className="space-y-1">
        <label className="block text-xs text-default-500">{t('duimpNumber')}</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={duimpNumber}
            onChange={(e) => setDuimpNumber(e.target.value)}
            disabled={readOnly || hasDuimp}
            className="flex-1 rounded-md border border-default-300 px-3 py-1.5 text-sm disabled:opacity-50"
          />
          {!readOnly && !hasDuimp && (
            <Button
              size="sm"
              variant="primary"
              onPress={handleRegister}
              isPending={isPending}
              isDisabled={!duimpNumber.trim()}
            >
              {t('register')}
            </Button>
          )}
        </div>
      </div>

      {/* Channel + Tax breakdown (shown when DUIMP + channel exist) */}
      {hasDuimp && hasChannel && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-default-500">{t('channel')}: </span>
            <Chip
              size="sm"
              variant="soft"
              color={CHANNEL_COLORS[shipment.duimpChannel ?? ''] ?? 'default'}
            >
              {shipment.duimpChannel}
            </Chip>
          </div>

          {taxExpenses.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-default-600">{t('taxBreakdown')}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-default-200">
                      <th className="py-1.5 px-2 text-left text-xs text-default-500 font-medium">
                        {t('taxCategory')}
                      </th>
                      <th className="py-1.5 px-2 text-left text-xs text-default-500 font-medium">
                        {t('taxValue')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxExpenses.map((exp) => (
                      <tr key={exp.id} className="border-b border-default-100 last:border-0">
                        <td className="py-1.5 px-2 text-default-700">
                          {exp.category?.replace('TAX_', '') ?? exp.category}
                        </td>
                        <td className="py-1.5 px-2 text-default-700 font-medium">
                          {formatBrl(exp.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Component
// ============================================

export function CustomsClearanceStep({
  shipment,
  readOnly = false,
}: CustomsClearanceStepProps) {
  const t = useTranslations('Admin.Shipments.Steps.CustomsClearance');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shield className="h-5 w-5 text-default-400" />
        <h3 className="text-base font-semibold text-default-700">{t('title')}</h3>
      </div>

      <Invoice90Card shipment={shipment} readOnly={readOnly} />
      <DuimpCard shipment={shipment} readOnly={readOnly} />
    </div>
  );
}
