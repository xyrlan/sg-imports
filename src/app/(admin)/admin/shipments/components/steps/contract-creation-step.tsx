'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Chip } from '@heroui/react';
import { FileCheck, ExternalLink } from 'lucide-react';
import type { ShipmentDetail } from '../shipment-utils';

// ============================================
// Props
// ============================================

interface ContractCreationStepProps {
  shipment: ShipmentDetail;
  readOnly?: boolean;
}

// ============================================
// Helpers
// ============================================

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ============================================
// Component
// ============================================

export function ContractCreationStep({ shipment }: ContractCreationStepProps) {
  const t = useTranslations('Admin.Shipments.Steps.ContractCreation');

  const isContractSigned = shipment.zapSignStatus === 'signed';

  // Find the step history entry for CONTRACT_CREATION that is COMPLETED
  const completedEntry = shipment.stepHistory?.find(
    (h) => h.step === 'CONTRACT_CREATION' && h.status === 'COMPLETED',
  );

  const signatureDate = completedEntry?.completedAt ?? null;

  return (
    <div className="space-y-4">
      {/* Contract signed status */}
      <div className="flex items-center gap-3">
        <FileCheck className="h-5 w-5 text-default-400 shrink-0" />
        <span className="text-sm text-default-600">{t('contractSigned')}</span>
        <Chip
          color={isContractSigned ? 'success' : 'warning'}
          variant="soft"
          size="sm"
        >
          {isContractSigned ? t('contractSigned') : shipment.zapSignStatus ?? '—'}
        </Chip>
      </div>

      {/* Signature date (only when signed) */}
      {isContractSigned && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-default-400">{t('signatureDate')}:</span>
          <span className="text-sm font-medium text-default-700">{formatDate(signatureDate)}</span>
        </div>
      )}

      {/* Link to quote */}
      {shipment.quoteId && (
        <div className="pt-1">
          <Link
            href={`/admin/simulations/${shipment.quoteId}`}
            className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {t('viewQuote')}
          </Link>
        </div>
      )}
    </div>
  );
}
