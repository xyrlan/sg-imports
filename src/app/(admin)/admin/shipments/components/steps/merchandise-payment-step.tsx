'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Chip } from '@heroui/react';
import { DollarSign, ExternalLink } from 'lucide-react';
import type { ShipmentDetail } from '../shipment-utils';
import { GenerateInvoiceModal } from '../modals/generate-invoice-modal';
import { RegisterPaymentModal } from '../modals/register-payment-modal';
import { CreateExchangeContractModal } from '../modals/create-exchange-contract-modal';
import { updateProductionReadyDateAction } from '../../[id]/actions';

// ============================================
// Props
// ============================================

interface MerchandisePaymentStepProps {
  shipment: ShipmentDetail;
  readOnly?: boolean;
}

// ============================================
// Helpers
// ============================================

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toInputDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

const STATUS_CHIP_COLOR: Record<string, 'default' | 'warning' | 'success' | 'danger'> = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  REFUNDED: 'default',
};

// ============================================
// Sub-components
// ============================================

interface ProductionCardProps {
  shipment: ShipmentDetail;
  readOnly: boolean;
}

function ProductionCard({ shipment, readOnly }: ProductionCardProps) {
  const t = useTranslations('Admin.Shipments.Steps.MerchandisePayment');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [productionDate, setProductionDate] = useState(toInputDate(shipment.productionReadyDate));

  const handleSave = () => {
    startTransition(async () => {
      await updateProductionReadyDateAction(shipment.id, productionDate);
      router.refresh();
    });
  };

  return (
    <div className="rounded-lg border border-default-200 bg-default-50 p-4 space-y-3">
      <p className="text-sm font-semibold text-default-700">{t('production')}</p>
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1">
          <label className="block text-xs text-default-500">{t('productionReadyDate')}</label>
          <input
            type="date"
            value={productionDate}
            onChange={(e) => setProductionDate(e.target.value)}
            disabled={readOnly}
            className="w-full rounded-md border border-default-300 px-3 py-1.5 text-sm disabled:opacity-50"
          />
        </div>
        {!readOnly && (
          <Button size="sm" variant="primary" onPress={handleSave} isPending={isPending}>
            {t('save')}
          </Button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-default-500">{t('fobAdvancePercentage')}:</span>
        <span className="text-sm font-medium text-default-700">
          {shipment.fobAdvancePercentage ?? '—'}%
        </span>
      </div>
    </div>
  );
}

interface FobPaymentsCardProps {
  shipment: ShipmentDetail;
  readOnly: boolean;
}

function FobPaymentsCard({ shipment, readOnly }: FobPaymentsCardProps) {
  const t = useTranslations('Admin.Shipments.Steps.MerchandisePayment');

  const merchandiseTxns = (shipment.transactions ?? []).filter((tx) => tx.type === 'MERCHANDISE');
  const paidTxns = merchandiseTxns.filter((tx) => tx.status === 'PAID');
  const paidAmount = paidTxns.reduce((sum, tx) => sum + parseFloat(tx.amountUsd ?? '0'), 0);
  const totalAmount = parseFloat(shipment.totalProductsUsd ?? '0');
  const progressPct = totalAmount > 0 ? Math.min((paidAmount / totalAmount) * 100, 100) : 0;

  const isDirectOrder = shipment.clientOrganization?.orderType === 'DIRECT_ORDER';

  return (
    <div className="rounded-lg border border-default-200 bg-default-50 p-4 space-y-4">
      <p className="text-sm font-semibold text-default-700">{t('payments')}</p>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-default-500">
          <span>
            {t('progress', {
              paid: `$${paidAmount.toFixed(2)}`,
              total: `$${totalAmount.toFixed(2)}`,
              percent: progressPct.toFixed(1),
            })}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-default-200">
          <div
            className="h-2 rounded-full bg-success transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Actions */}
      {!readOnly && (
        <div className="flex gap-2">
          <GenerateInvoiceModal
            shipmentId={shipment.id}
            type="MERCHANDISE"
            currency="USD"
            trigger={
              <Button size="sm" variant="outline">
                {t('generateInvoice')}
              </Button>
            }
          />
          {isDirectOrder && (
            <RegisterPaymentModal
              shipmentId={shipment.id}
              trigger={
                <Button size="sm" variant="outline">
                  {t('registerPayment')}
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* Transactions table */}
      {merchandiseTxns.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-default-200">
                <th className="py-2 px-2 text-left text-xs text-default-500 font-medium">
                  {t('transactionTable.number')}
                </th>
                <th className="py-2 px-2 text-left text-xs text-default-500 font-medium">
                  {t('transactionTable.amountUsd')}
                </th>
                <th className="py-2 px-2 text-left text-xs text-default-500 font-medium">
                  {t('transactionTable.status')}
                </th>
                <th className="py-2 px-2 text-left text-xs text-default-500 font-medium">
                  {t('transactionTable.date')}
                </th>
                <th className="py-2 px-2 text-left text-xs text-default-500 font-medium">
                  {t('transactionTable.proof')}
                </th>
              </tr>
            </thead>
            <tbody>
              {merchandiseTxns.map((tx, idx) => (
                <tr key={tx.id} className="border-b border-default-100 last:border-0">
                  <td className="py-2 px-2 text-default-600">{idx + 1}</td>
                  <td className="py-2 px-2 text-default-700 font-medium">
                    {tx.amountUsd ? `$${tx.amountUsd}` : '—'}
                  </td>
                  <td className="py-2 px-2">
                    <Chip
                      size="sm"
                      variant="soft"
                      color={STATUS_CHIP_COLOR[tx.status] ?? 'default'}
                    >
                      {tx.status}
                    </Chip>
                  </td>
                  <td className="py-2 px-2 text-default-600">{formatDate(tx.paidAt)}</td>
                  <td className="py-2 px-2">
                    {tx.proofUrl ? (
                      <a
                        href={tx.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:underline text-xs"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Ver
                      </a>
                    ) : (
                      <span className="text-default-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface ExchangeContractsCardProps {
  shipment: ShipmentDetail;
  readOnly: boolean;
}

function ExchangeContractsCard({ shipment, readOnly }: ExchangeContractsCardProps) {
  const t = useTranslations('Admin.Shipments.Steps.MerchandisePayment');

  const merchandiseTxns = (shipment.transactions ?? []).filter((tx) => tx.type === 'MERCHANDISE');

  const allContracts = merchandiseTxns.flatMap((tx) =>
    (tx.exchangeContracts ?? []).map((ec) => ({ ...ec, transaction: tx })),
  );

  const suppliers = (shipment.quote?.items ?? [])
    .map((item) => item.variant?.product?.supplier)
    .filter((s): s is NonNullable<typeof s> => !!s)
    .reduce<{ id: string; name: string }[]>((acc, s) => {
      if (!acc.find((x) => x.id === s.id)) acc.push({ id: s.id, name: s.name });
      return acc;
    }, []);

  return (
    <div className="rounded-lg border border-default-200 bg-default-50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-default-700">{t('exchangeContracts')}</p>
        {!readOnly && (
          <CreateExchangeContractModal
            shipmentId={shipment.id}
            transactions={merchandiseTxns.map((tx) => ({
              id: tx.id,
              amountUsd: tx.amountUsd,
              status: tx.status,
            }))}
            suppliers={suppliers}
            brokers={[]}
            trigger={
              <Button size="sm" variant="outline">
                {t('newExchangeContract')}
              </Button>
            }
          />
        )}
      </div>

      {allContracts.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-default-200">
                <th className="py-2 px-2 text-left text-xs text-default-500 font-medium">
                  {t('contractTable.supplier')}
                </th>
                <th className="py-2 px-2 text-left text-xs text-default-500 font-medium">
                  {t('contractTable.contractNumber')}
                </th>
                <th className="py-2 px-2 text-left text-xs text-default-500 font-medium">
                  {t('contractTable.broker')}
                </th>
                <th className="py-2 px-2 text-left text-xs text-default-500 font-medium">
                  {t('contractTable.amountUsd')}
                </th>
                <th className="py-2 px-2 text-left text-xs text-default-500 font-medium">
                  {t('contractTable.exchangeRate')}
                </th>
                <th className="py-2 px-2 text-left text-xs text-default-500 font-medium">
                  {t('contractTable.swift')}
                </th>
                <th className="py-2 px-2 text-left text-xs text-default-500 font-medium">
                  {t('contractTable.contract')}
                </th>
              </tr>
            </thead>
            <tbody>
              {allContracts.map((ec) => (
                <tr key={ec.id} className="border-b border-default-100 last:border-0">
                  <td className="py-2 px-2 text-default-600">{ec.supplier?.name ?? '—'}</td>
                  <td className="py-2 px-2 text-default-700 font-medium">{ec.contractNumber}</td>
                  <td className="py-2 px-2 text-default-600">
                    {ec.broker?.name ?? ec.brokerName ?? '—'}
                  </td>
                  <td className="py-2 px-2 text-default-700">${ec.amountUsd}</td>
                  <td className="py-2 px-2 text-default-600">{ec.exchangeRate}</td>
                  <td className="py-2 px-2">
                    {ec.swiftFileUrl ? (
                      <a
                        href={ec.swiftFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:underline text-xs"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Swift
                      </a>
                    ) : (
                      <span className="text-default-400">—</span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    {ec.contractFileUrl ? (
                      <a
                        href={ec.contractFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent hover:underline text-xs"
                      >
                        <ExternalLink className="h-3 w-3" />
                        PDF
                      </a>
                    ) : (
                      <span className="text-default-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================
// Component
// ============================================

export function MerchandisePaymentStep({ shipment, readOnly = false }: MerchandisePaymentStepProps) {
  const t = useTranslations('Admin.Shipments.Steps.MerchandisePayment');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-default-400" />
        <h3 className="text-base font-semibold text-default-700">{t('title')}</h3>
      </div>

      <ProductionCard shipment={shipment} readOnly={readOnly} />
      <FobPaymentsCard shipment={shipment} readOnly={readOnly} />
      <ExchangeContractsCard shipment={shipment} readOnly={readOnly} />
    </div>
  );
}
