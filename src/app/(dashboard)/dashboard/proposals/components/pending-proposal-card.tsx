'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, Chip } from '@heroui/react';
import { FileText, ArrowRight } from 'lucide-react';
import NextLink from 'next/link';
import type { ProposalWithSeller } from '@/services/simulation.service';
import Link from 'next/link';

interface PendingProposalCardProps {
  proposal: ProposalWithSeller;
}

export function PendingProposalCard({ proposal }: PendingProposalCardProps) {
  const t = useTranslations('Proposals.Pending');
  const tStatus = useTranslations('Proposals.Status');

  const receivedDate = new Date(proposal.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const statusColorMap: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
    APPROVED: 'success',
    REJECTED: 'danger',
    SENT: 'warning',
    PENDING_SIGNATURE: 'warning',
    CONVERTED: 'default',
  };

  const status = proposal.status
  const color = statusColorMap[status] ?? 'default';

  return (
    <Link href={`/dashboard/proposals/${proposal.id}`} >
    <Card className="p-4 border border-primary/20 bg-primary/5 duration-200 hover:bg-surface-hover">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <FileText className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">{proposal.name}</p>
            <p className="text-sm text-muted">
              {t('from')}: {proposal.sellerOrganization?.name ?? '—'}
            </p>
            
          </div>
        </div>
        
<div className='flex flex-col items-end gap-2'>
<Chip size="sm" color={color as 'success' | 'danger' | 'warning' | 'default'} variant="soft">
            {tStatus(status as 'APPROVED' | 'REJECTED' | 'PENDING_SIGNATURE' | 'CONVERTED')}
          </Chip>
          <p className="text-xs text-muted mt-1">
              {t('receivedOn')} {receivedDate}
            </p>
</div>
      </div>
    </Card>
    </Link>

  );
}
