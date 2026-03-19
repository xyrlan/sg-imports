'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Chip, TextField, Input, Label, Surface } from '@heroui/react';
import { Shield } from 'lucide-react';
import { formatBrl, type ShipmentDetail } from '../shipment-utils';
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
    <Surface variant="secondary" className="p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">{t('invoice90')}</p>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-xs text-muted">{t('totalCosts')}: </span>
          <span className="font-medium text-foreground">{formatBrl(shipment.totalCostsBrl)}</span>
        </div>
        <div>
          <span className="text-xs text-muted">{t('paidFobBrl')}: </span>
          <span className="font-medium text-foreground">{formatBrl(String(paidFobBrl))}</span>
        </div>
        <div>
          <span className="text-xs text-muted">{t('remaining')}: </span>
          <span className="font-medium text-foreground">{formatBrl(String(remaining))}</span>
        </div>
        <div>
          <span className="text-xs text-muted">{t('invoice90Value')}: </span>
          <span className="font-medium text-foreground">{formatBrl(String(invoice90Value))}</span>
        </div>
      </div>

      {balanceTxn && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{t('invoiceStatus')}: </span>
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
    </Surface>
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
    <Surface variant="secondary" className="p-4 space-y-4">
      <p className="text-sm font-semibold text-foreground">{t('duimp')}</p>

      {/* DUIMP number input */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <TextField variant="primary" isDisabled={readOnly || hasDuimp}>
            <Label>{t('duimpNumber')}</Label>
            <Input
              value={duimpNumber}
              onChange={(e) => setDuimpNumber(e.target.value)}
            />
          </TextField>
        </div>
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

      {/* Channel + Tax breakdown (shown when DUIMP + channel exist) */}
      {hasDuimp && hasChannel && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">{t('channel')}: </span>
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
              <p className="text-xs font-medium text-muted">{t('taxBreakdown')}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-1.5 px-2 text-left text-xs text-muted font-medium">
                        {t('taxCategory')}
                      </th>
                      <th className="py-1.5 px-2 text-left text-xs text-muted font-medium">
                        {t('taxValue')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxExpenses.map((exp) => (
                      <tr key={exp.id} className="border-b border-border last:border-0">
                        <td className="py-1.5 px-2 text-foreground">
                          {exp.category?.replace('TAX_', '') ?? exp.category}
                        </td>
                        <td className="py-1.5 px-2 text-foreground font-medium">
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
    </Surface>
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
        <Shield className="h-5 w-5 text-muted" />
        <h3 className="text-base font-semibold text-foreground">{t('title')}</h3>
      </div>

      <Invoice90Card shipment={shipment} readOnly={readOnly} />
      <DuimpCard shipment={shipment} readOnly={readOnly} />
    </div>
  );
}
