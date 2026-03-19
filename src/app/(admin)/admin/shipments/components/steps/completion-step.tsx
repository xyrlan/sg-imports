'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Chip, TextField, Input, Label, Surface } from '@heroui/react';
import { CheckCircle } from 'lucide-react';
import { formatBrl, type ShipmentDetail } from '../shipment-utils';
import { ShipmentDocumentField } from '../shipment-document-field';
import {
  saveCompletionCostsAction,
  generateBalanceInvoiceAction,
  generateServiceFeeInvoiceAction,
  getServiceFeePreviewAction,
} from '../../[id]/actions';

// ============================================
// Props
// ============================================

interface CompletionStepProps {
  shipment: ShipmentDetail;
  readOnly?: boolean;
}

// ============================================
// Sub-components
// ============================================

interface FiscalDocumentsCardProps {
  shipment: ShipmentDetail;
  readOnly: boolean;
}

type FiscalDocType = {
  type: string;
  labelKey: 'storageInvoice' | 'salesInvoicePdf' | 'salesInvoiceXml';
  accept: string;
};

const FISCAL_DOC_TYPES: FiscalDocType[] = [
  { type: 'STORAGE_INVOICE', labelKey: 'storageInvoice', accept: 'PDF (máx. 10MB)' },
  { type: 'SALES_INVOICE_PDF', labelKey: 'salesInvoicePdf', accept: 'PDF (máx. 10MB)' },
  { type: 'SALES_INVOICE_XML', labelKey: 'salesInvoiceXml', accept: 'XML (máx. 10MB)' },
];

function FiscalDocumentsCard({ shipment, readOnly }: FiscalDocumentsCardProps) {
  const t = useTranslations('Admin.Shipments.Steps.Completion');

  const getDocument = (type: string) =>
    (shipment.documents ?? []).find((d) => d.type === type);

  return (
    <Surface variant="secondary" className="p-4 space-y-4">
      <p className="text-sm font-semibold text-foreground">{t('fiscalDocuments')}</p>

      {FISCAL_DOC_TYPES.map(({ type, labelKey, accept }) => {
        const existing = getDocument(type);
        return (
          <div key={type} className="space-y-1">
            <p className="text-xs text-muted">{t(labelKey)}</p>
            <ShipmentDocumentField
              shipmentId={shipment.id}
              documentType={type}
              label={t(labelKey)}
              existingDocument={existing ? { url: existing.url, name: existing.name } : null}
              readOnly={readOnly}
              acceptedFormats={accept}
            />
          </div>
        );
      })}
    </Surface>
  );
}

interface FinalCostsCardProps {
  shipment: ShipmentDetail;
  readOnly: boolean;
}

function FinalCostsCard({ shipment, readOnly }: FinalCostsCardProps) {
  const t = useTranslations('Admin.Shipments.Steps.Completion');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [icmsExitTaxes, setIcmsExitTaxes] = useState(shipment.icmsExitTaxes ?? '');
  const [storageCost, setStorageCost] = useState(shipment.storageCost ?? '');
  const [discounts, setDiscounts] = useState(shipment.discounts ?? '');

  const handleSave = () => {
    startTransition(async () => {
      await saveCompletionCostsAction(shipment.id, { icmsExitTaxes, storageCost, discounts });
      router.refresh();
    });
  };

  return (
    <Surface variant="secondary" className="p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">{t('finalCosts')}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TextField variant="primary" isDisabled={readOnly}>
          <Label>{t('icmsExitTaxes')}</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={icmsExitTaxes}
            onChange={(e) => setIcmsExitTaxes(e.target.value)}
          />
        </TextField>
        <TextField variant="primary" isDisabled={readOnly}>
          <Label>{t('storageCost')}</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={storageCost}
            onChange={(e) => setStorageCost(e.target.value)}
          />
        </TextField>
        <TextField variant="primary" isDisabled={readOnly}>
          <Label>{t('discounts')}</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={discounts}
            onChange={(e) => setDiscounts(e.target.value)}
          />
        </TextField>
      </div>

      {!readOnly && (
        <Button size="sm" variant="primary" onPress={handleSave} isPending={isPending}>
          {t('saveCosts')}
        </Button>
      )}
    </Surface>
  );
}

interface PLCardProps {
  shipment: ShipmentDetail;
  readOnly: boolean;
}

function PLCard({ shipment, readOnly }: PLCardProps) {
  const t = useTranslations('Admin.Shipments.Steps.Completion');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const costsAreSaved =
    shipment.icmsExitTaxes !== null ||
    shipment.storageCost !== null ||
    shipment.discounts !== null;

  if (!costsAreSaved) return null;

  const paidTransactions = (shipment.transactions ?? []).filter((tx) => tx.status === 'PAID');
  const totalPaidBrl = paidTransactions.reduce(
    (sum, tx) => sum + parseFloat(tx.amountBrl ?? '0'),
    0,
  );

  const icms = parseFloat(shipment.icmsExitTaxes ?? '0');
  const storage = parseFloat(shipment.storageCost ?? '0');
  const disc = parseFloat(shipment.discounts ?? '0');

  const totalRealized = totalPaidBrl + icms + storage - disc;
  const totalCostsBrl = parseFloat(shipment.totalCostsBrl ?? '0');
  const finalBalance = totalCostsBrl - totalRealized;

  const existingBalanceTxn = (shipment.transactions ?? []).find((tx) => tx.type === 'BALANCE');

  const handleGenerateBalanceInvoice = () => {
    startTransition(async () => {
      await generateBalanceInvoiceAction(shipment.id, String(Math.abs(finalBalance)));
      router.refresh();
    });
  };

  return (
    <Surface variant="secondary" className="p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">{t('pl')}</p>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-xs text-muted">{t('estimatedCost')}: </span>
          <span className="font-medium text-foreground">{formatBrl(shipment.totalCostsBrl)}</span>
        </div>
        <div>
          <span className="text-xs text-muted">{t('totalRealized')}: </span>
          <span className="font-medium text-foreground">{formatBrl(String(totalRealized))}</span>
        </div>
        <div>
          <span className="text-xs text-muted">{t('finalBalance')}: </span>
          <span className={`font-medium ${finalBalance > 0 ? 'text-danger' : finalBalance < 0 ? 'text-warning' : 'text-success'}`}>
            {formatBrl(String(Math.abs(finalBalance)))}
          </span>
        </div>
      </div>

      {finalBalance > 0 && !existingBalanceTxn && (
        <div className="flex items-center gap-3">
          <Chip size="sm" variant="soft" color="danger">
            {t('clientOwes')} {formatBrl(String(finalBalance))}
          </Chip>
          {!readOnly && (
            <Button
              size="sm"
              variant="outline"
              onPress={handleGenerateBalanceInvoice}
              isPending={isPending}
            >
              {t('generateBalanceInvoice')}
            </Button>
          )}
        </div>
      )}

      {finalBalance < 0 && (
        <Chip size="sm" variant="soft" color="warning">
          {t('refundPending')}: {formatBrl(String(Math.abs(finalBalance)))}
        </Chip>
      )}

      {finalBalance === 0 && (
        <Chip size="sm" variant="soft" color="success">
          {t('balanced')}
        </Chip>
      )}

      {existingBalanceTxn && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Status: </span>
          <Chip
            size="sm"
            variant="soft"
            color={existingBalanceTxn.status === 'PAID' ? 'success' : existingBalanceTxn.status === 'OVERDUE' ? 'danger' : 'warning'}
          >
            {existingBalanceTxn.status}
          </Chip>
        </div>
      )}
    </Surface>
  );
}

type ServiceFeePreview = {
  serviceFee: number;
  calculationBase: 'FOB' | 'INVOICE';
  baseValue: number;
  percentage: number;
  percentageValue: number;
  minimumValue: number;
  usedMinimum: boolean;
};

interface ServiceFeeCardProps {
  shipment: ShipmentDetail;
  readOnly: boolean;
}

function ServiceFeeCard({ shipment, readOnly }: ServiceFeeCardProps) {
  const t = useTranslations('Admin.Shipments.Steps.Completion');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feePreview, setFeePreview] = useState<ServiceFeePreview | null>(null);
  const [isLoadingFee, setIsLoadingFee] = useState(true);

  const existingServiceFeeTxn = (shipment.transactions ?? []).find(
    (tx) => tx.type === 'SERVICE_FEE',
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoadingFee(true);
    getServiceFeePreviewAction(shipment.id).then((result) => {
      if (!cancelled && result.success && result.data) {
        setFeePreview(result.data);
      }
      if (!cancelled) setIsLoadingFee(false);
    });
    return () => {
      cancelled = true;
    };
  }, [shipment.id]);

  const handleGenerateServiceFeeInvoice = () => {
    startTransition(async () => {
      await generateServiceFeeInvoiceAction(shipment.id);
      router.refresh();
    });
  };

  return (
    <Surface variant="secondary" className="p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">{t('serviceFee')}</p>

      {isLoadingFee ? (
        <p className="text-xs text-muted">{t('loadingFee')}</p>
      ) : feePreview ? (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-xs text-muted">{t('base')}: </span>
            <span className="text-foreground">{feePreview.calculationBase}</span>
          </div>
          <div>
            <span className="text-xs text-muted">{t('percentage')}: </span>
            <span className="text-foreground">{feePreview.percentage}%</span>
          </div>
          <div>
            <span className="text-xs text-muted">{t('calculatedValue')}: </span>
            <span className="font-medium text-foreground">{formatBrl(String(feePreview.percentageValue))}</span>
          </div>
          <div>
            <span className="text-xs text-muted">{t('minimumFloor')}: </span>
            <span className="text-foreground">{formatBrl(String(feePreview.minimumValue))}</span>
          </div>
          <div className="col-span-2">
            <span className="text-xs text-muted">{t('finalFee')}: </span>
            <span className="font-semibold text-foreground">
              {formatBrl(String(feePreview.serviceFee))}
              {feePreview.usedMinimum && (
                <span className="ml-1 text-xs text-warning font-normal">{t('usedMinimum')}</span>
              )}
            </span>
          </div>
        </div>
      ) : null}

      {existingServiceFeeTxn ? (
        <Chip size="sm" variant="soft" color="success">
          {t('serviceFeeAlreadyGenerated')}
        </Chip>
      ) : (
        !readOnly && (
          <Button
            size="sm"
            variant="outline"
            onPress={handleGenerateServiceFeeInvoice}
            isPending={isPending}
            isDisabled={isLoadingFee}
          >
            {t('generateServiceFeeInvoice')}
          </Button>
        )
      )}
    </Surface>
  );
}

// ============================================
// Component
// ============================================

export function CompletionStep({ shipment, readOnly = false }: CompletionStepProps) {
  const t = useTranslations('Admin.Shipments.Steps.Completion');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CheckCircle className="h-5 w-5 text-muted" />
        <h3 className="text-base font-semibold text-foreground">{t('title')}</h3>
      </div>

      <FiscalDocumentsCard shipment={shipment} readOnly={readOnly} />
      <FinalCostsCard shipment={shipment} readOnly={readOnly} />
      <PLCard shipment={shipment} readOnly={readOnly} />
      <ServiceFeeCard shipment={shipment} readOnly={readOnly} />
    </div>
  );
}
