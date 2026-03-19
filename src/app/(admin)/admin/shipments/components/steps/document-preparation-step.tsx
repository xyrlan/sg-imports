'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Chip, Surface } from '@heroui/react';
import { FileText, ExternalLink } from 'lucide-react';
import { FileUpload } from '@/components/ui/file-upload';
import type { ShipmentDetail } from '../shipment-utils';
import { ShipmentDocumentField } from '../shipment-document-field';
import { uploadShipmentDocumentAction } from '../../[id]/actions';

// ============================================
// Props
// ============================================

interface DocumentPreparationStepProps {
  shipment: ShipmentDetail;
  readOnly?: boolean;
}

// ============================================
// Helpers
// ============================================

interface SupplierInfo {
  id: string;
  name: string;
}

function deriveUniqueSuppliers(shipment: ShipmentDetail): SupplierInfo[] {
  const items = shipment.quote?.items ?? [];
  const seen = new Set<string>();
  const suppliers: SupplierInfo[] = [];

  for (const item of items) {
    const supplier = item.variant?.product?.supplier;
    if (supplier && !seen.has(supplier.id)) {
      seen.add(supplier.id);
      suppliers.push({ id: supplier.id, name: supplier.name });
    }
  }

  return suppliers;
}

// ============================================
// Sub-components
// ============================================

interface ExchangeSummaryCardProps {
  shipment: ShipmentDetail;
}

function ExchangeSummaryCard({ shipment }: ExchangeSummaryCardProps) {
  const t = useTranslations('Admin.Shipments.Steps.DocumentPreparation');

  const paidMerchandiseTxns = (shipment.transactions ?? []).filter(
    (tx) => tx.type === 'MERCHANDISE' && tx.status === 'PAID',
  );

  // Group by supplierId from exchange contracts
  const supplierMap = new Map<string, { name: string; totalUsd: number; rateSum: number; rateCount: number }>();

  // Build a supplier name lookup from quote items
  const supplierNames = new Map<string, string>();
  for (const item of shipment.quote?.items ?? []) {
    const supplier = item.variant?.product?.supplier;
    if (supplier) supplierNames.set(supplier.id, supplier.name);
  }

  let totalContracts = 0;

  for (const tx of paidMerchandiseTxns) {
    for (const ec of tx.exchangeContracts ?? []) {
      totalContracts++;
      const supplierId = ec.supplierId ?? 'unknown';
      const supplierName =
        ec.supplier?.name ?? supplierNames.get(supplierId) ?? supplierId;

      const usd = parseFloat(ec.amountUsd ?? '0');
      const rate = parseFloat(ec.exchangeRate ?? '0');

      const existing = supplierMap.get(supplierId);
      if (existing) {
        existing.totalUsd += usd;
        if (rate > 0) {
          existing.rateSum += rate;
          existing.rateCount += 1;
        }
      } else {
        supplierMap.set(supplierId, {
          name: supplierName,
          totalUsd: usd,
          rateSum: rate > 0 ? rate : 0,
          rateCount: rate > 0 ? 1 : 0,
        });
      }
    }
  }

  const supplierRows = Array.from(supplierMap.entries());

  return (
    <Surface variant="secondary" className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{t('exchangeSummary')}</p>
        <span className="text-xs text-muted">
          {t('numContracts')}: {totalContracts}
        </span>
      </div>

      {supplierRows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 px-2 text-left text-xs text-muted font-medium">
                  Fornecedor
                </th>
                <th className="py-2 px-2 text-left text-xs text-muted font-medium">
                  {t('totalPaid')} (USD)
                </th>
                <th className="py-2 px-2 text-left text-xs text-muted font-medium">
                  {t('avgRate')}
                </th>
              </tr>
            </thead>
            <tbody>
              {supplierRows.map(([id, data]) => (
                <tr key={id} className="border-b border-border last:border-0">
                  <td className="py-2 px-2 text-foreground">{data.name}</td>
                  <td className="py-2 px-2 text-foreground font-medium">
                    ${data.totalUsd.toFixed(2)}
                  </td>
                  <td className="py-2 px-2 text-foreground/90">
                    {data.rateCount > 0
                      ? (data.rateSum / data.rateCount).toFixed(4)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-muted">—</p>
      )}
    </Surface>
  );
}

interface SupplierDocumentsCardProps {
  shipment: ShipmentDetail;
  supplier: SupplierInfo;
  readOnly: boolean;
}

function SupplierDocumentsCard({ shipment, supplier, readOnly }: SupplierDocumentsCardProps) {
  const t = useTranslations('Admin.Shipments.Steps.DocumentPreparation');

  const existingInvoice = (shipment.documents ?? []).find(
    (d) =>
      d.type === 'COMMERCIAL_INVOICE' &&
      (d.metadata as Record<string, unknown> | null)?.supplierId === supplier.id,
  );

  const existingPackingList = (shipment.documents ?? []).find(
    (d) =>
      d.type === 'PACKING_LIST' &&
      (d.metadata as Record<string, unknown> | null)?.supplierId === supplier.id,
  );

  return (
    <Surface variant="secondary" className="p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">{supplier.name}</p>

      {/* Commercial Invoice */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted">{t('invoice')}</p>
          {existingInvoice && (
            <Chip size="sm" variant="soft" color="success">
              {t('uploaded')}
            </Chip>
          )}
        </div>
        <ShipmentDocumentField
          shipmentId={shipment.id}
          documentType="COMMERCIAL_INVOICE"
          label={t('invoice')}
          existingDocument={
            existingInvoice ? { url: existingInvoice.url, name: existingInvoice.name } : null
          }
          readOnly={readOnly}
          acceptedFormats="PDF (máx. 10MB)"
          extraFormData={{ supplierId: supplier.id }}
        />
      </div>

      {/* Packing List */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted">{t('packingList')}</p>
          {existingPackingList && (
            <Chip size="sm" variant="soft" color="success">
              {t('uploaded')}
            </Chip>
          )}
        </div>
        <ShipmentDocumentField
          shipmentId={shipment.id}
          documentType="PACKING_LIST"
          label={t('packingList')}
          existingDocument={
            existingPackingList
              ? { url: existingPackingList.url, name: existingPackingList.name }
              : null
          }
          readOnly={readOnly}
          acceptedFormats="PDF (máx. 10MB)"
          extraFormData={{ supplierId: supplier.id }}
        />
      </div>
    </Surface>
  );
}

interface OtherDocumentsCardProps {
  shipment: ShipmentDetail;
  readOnly: boolean;
}

function OtherDocumentsCard({ shipment, readOnly }: OtherDocumentsCardProps) {
  const t = useTranslations('Admin.Shipments.Steps.DocumentPreparation');
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);
  const [docName, setDocName] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  const otherDocuments = (shipment.documents ?? []).filter((d) => d.type === 'OTHER');

  const handleSave = () => {
    if (!docFile || !docName.trim()) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set('shipmentId', shipment.id);
      formData.set('type', 'OTHER');
      formData.set('name', docName.trim());
      formData.set('file', docFile);
      await uploadShipmentDocumentAction(formData);
      setDocName('');
      setDocFile(null);
      setIsAdding(false);
      router.refresh();
    });
  };

  return (
    <Surface variant="secondary" className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{t('otherDocuments')}</p>
        {!readOnly && !isAdding && (
          <Button size="sm" variant="outline" onPress={() => setIsAdding(true)}>
            {t('addDocument')}
          </Button>
        )}
      </div>

      {otherDocuments.length > 0 && (
        <ul className="space-y-1">
          {otherDocuments.map((doc) => (
            <li key={doc.id}>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:underline text-sm"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {doc.name}
              </a>
            </li>
          ))}
        </ul>
      )}

      {isAdding && (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="space-y-1">
            <label className="block text-xs text-muted">{t('documentName')}</label>
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-1.5 text-sm"
              placeholder={t('documentName')}
            />
          </div>
          <FileUpload
            label=""
            name="otherDocFile"
            onFileSelect={setDocFile}
            acceptedFormats="PDF, JPG, PNG (máx. 10MB)"
          />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onPress={() => {
                setIsAdding(false);
                setDocName('');
                setDocFile(null);
              }}
            >
              {t('cancel')}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onPress={handleSave}
              isPending={isPending}
              isDisabled={!docFile || !docName.trim()}
            >
              {t('save')}
            </Button>
          </div>
        </div>
      )}
    </Surface>
  );
}

interface ChecklistCardProps {
  shipment: ShipmentDetail;
  suppliers: SupplierInfo[];
}

function ChecklistCard({ shipment, suppliers }: ChecklistCardProps) {
  const t = useTranslations('Admin.Shipments.Steps.DocumentPreparation');

  let pendingCount = 0;

  for (const supplier of suppliers) {
    const hasInvoice = (shipment.documents ?? []).some(
      (d) =>
        d.type === 'COMMERCIAL_INVOICE' &&
        (d.metadata as Record<string, unknown> | null)?.supplierId === supplier.id,
    );
    const hasPackingList = (shipment.documents ?? []).some(
      (d) =>
        d.type === 'PACKING_LIST' &&
        (d.metadata as Record<string, unknown> | null)?.supplierId === supplier.id,
    );
    if (!hasInvoice) pendingCount++;
    if (!hasPackingList) pendingCount++;
  }

  return (
    <Surface variant="secondary" className="p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">{t('checklist')}</p>
      {pendingCount > 0 ? (
        <Chip size="sm" variant="soft" color="warning">
          {t('pendingDocs', { count: pendingCount })}
        </Chip>
      ) : (
        <Chip size="sm" variant="soft" color="success">
          {t('allDocumentsOk')}
        </Chip>
      )}
    </Surface>
  );
}

// ============================================
// Component
// ============================================

export function DocumentPreparationStep({
  shipment,
  readOnly = false,
}: DocumentPreparationStepProps) {
  const t = useTranslations('Admin.Shipments.Steps.DocumentPreparation');
  const suppliers = deriveUniqueSuppliers(shipment);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-muted" />
        <h3 className="text-base font-semibold text-foreground">{t('title')}</h3>
      </div>

      <ExchangeSummaryCard shipment={shipment} />

      {suppliers.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">{t('documentsPerSupplier')}</p>
          {suppliers.map((supplier) => (
            <SupplierDocumentsCard
              key={supplier.id}
              shipment={shipment}
              supplier={supplier}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      <OtherDocumentsCard shipment={shipment} readOnly={readOnly} />
      <ChecklistCard shipment={shipment} suppliers={suppliers} />
    </div>
  );
}
