'use client';

import { useTranslations } from 'next-intl';
import { Card } from '@heroui/react';
import { FileText, ArrowRight } from 'lucide-react';
import NextLink from 'next/link';
import type { ProposalWithSeller } from '@/services/simulation.service';

interface PendingProposalCardProps {
  proposal: ProposalWithSeller;
}

export function PendingProposalCard({ proposal }: PendingProposalCardProps) {
  const t = useTranslations('Proposals.Pending');

  const receivedDate = new Date(proposal.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <Card className="p-4 border border-primary/20 bg-primary/5">
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
            <p className="text-xs text-muted mt-1">
              {t('receivedOn')} {receivedDate}
            </p>
          </div>
        </div>
        <NextLink
          href={`/dashboard/simulations/${proposal.id}`}
          className="shrink-0 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {t('viewDetails')}
          <ArrowRight className="size-4" />
        </NextLink>
      </div>
    </Card>
  );
}
