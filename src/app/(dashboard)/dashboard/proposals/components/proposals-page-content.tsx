'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Inbox } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { getProposalColumns } from './proposal-columns';
import { PendingProposalCard } from './pending-proposal-card';
import type { ProposalWithSeller } from '@/services/simulation.service';

interface ProposalsPageContentProps {
  pending: ProposalWithSeller[];
  history: ProposalWithSeller[];
}

export function ProposalsPageContent({ pending, history }: ProposalsPageContentProps) {
  const tPending = useTranslations('Proposals.Pending');
  const tHistory = useTranslations('Proposals.History');
  const tCols = useTranslations('Proposals.Columns');
  const tStatus = useTranslations('Proposals.Status');

  const columns = useMemo(() => getProposalColumns(tCols, tStatus), [tCols, tStatus]);

  return (
    <div className="space-y-8">
      {/* Pending Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4">{tPending('title')}</h2>
        {pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted">
            <Inbox className="size-10 mb-2" />
            <p className="text-sm">{tPending('empty')}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {pending.map((proposal) => (
              <PendingProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </div>
        )}
      </section>

      {/* History Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4">{tHistory('title')}</h2>
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted">
            <Inbox className="size-10 mb-2" />
            <p className="text-sm">{tHistory('empty')}</p>
          </div>
        ) : (
          <DataTable<ProposalWithSeller>
            columns={columns}
            data={history}
            searchPlaceholder={tHistory('searchPlaceholder')}
          />
        )}
      </section>
    </div>
  );
}
