'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button, Chip } from '@heroui/react';
import { ArrowLeft, PackageOpen, Settings, RefreshCw } from 'lucide-react';
import { calculateSimulationAction } from '@/domain/simulation/actions/calculate-simulation.action';
import { SimulationItemsList } from './simulation-items-list';
import type {
  Simulation,
  SimulationItem,
  QuoteFinancialSummary,
  HsCodeOption,
} from '@/services/simulation.service';
import type { ProductWithVariants } from '@/services/product.service';
import { AddProductModal } from './modals/add-product-modal';
import { SettingsModal } from './modals/settings-modal';
import { SimulationFinancialSummary } from './cards/simulation-financial-summary';
import { QuoteWorkflowButtons } from './quote-workflow-buttons';

interface SimulationDetailContentProps {
  simulation: Simulation;
  items: SimulationItem[];
  organizationId: string;
  products: ProductWithVariants[];
  hsCodes: HsCodeOption[];
  financialSummary?: QuoteFinancialSummary | null;
  defaultDestinationState?: string | null;
  backHref?: string;
}

export function SimulationDetailContent({
  simulation,
  items,
  organizationId,
  products,
  hsCodes,
  financialSummary = null,
  defaultDestinationState = null,
  backHref = '/dashboard/simulations',
}: SimulationDetailContentProps) {
  const t = useTranslations('Simulations.Detail');
  const tStatus = useTranslations('Simulations.Status');
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isRecalculating, startTransition] = useTransition();

  const handleMutate = () => {
    router.refresh();
  };

  const handleRecalculate = () => {
    startTransition(async () => {
      const result = await calculateSimulationAction(simulation.id, organizationId);
      if (result.success) {
        router.refresh();
      }
    });
  };

  const isStale = Boolean(simulation.isRecalculationNeeded);
  const isDraft = simulation.status === 'DRAFT';
  const canEdit = isDraft;

  return (
    <div key={simulation.id} className="space-y-6">
      {isStale && items.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-warning bg-warning/10 px-4 py-3">
          <p className="text-sm font-medium text-warning-foreground">
            {t('staleBannerMessage')}
          </p>
          <Button
            variant="outline"
            size="sm"
            isDisabled={isRecalculating}
            isPending={isRecalculating}
            onPress={handleRecalculate}
            className="inline-flex items-center gap-2"
          >
            <RefreshCw className="size-4" />
            {t('staleBannerRecalculate')}
          </Button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={backHref}>
            <Button variant="ghost" size="sm" className="inline-flex items-center gap-2">
              <ArrowLeft className="size-4" />
              {t('back')}
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{simulation.name}</h1>
            <Chip size="sm" color="default" variant="soft">
              {simulation.status ? tStatus(simulation.status as 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'PENDING_SIGNATURE' | 'CONVERTED') : '—'}
            </Chip>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <QuoteWorkflowButtons
            simulation={simulation}
            organizationId={organizationId}
            onMutate={handleMutate}
          />
          {canEdit && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setSettingsOpen(true)}
                className="inline-flex items-center gap-2"
              >
                <Settings className="size-4" />
                {t('settingsButton')}
              </Button>
              <SettingsModal
                simulation={simulation}
                organizationId={organizationId}
                defaultDestinationState={defaultDestinationState}
                onMutate={handleMutate}
                open={settingsOpen}
                onOpenChange={setSettingsOpen}
              />
              <AddProductModal
                simulationId={simulation.id}
                organizationId={organizationId}
                products={products}
                hsCodes={hsCodes}
                onMutate={handleMutate}
              />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_550px] gap-6 lg:gap-8">
        <div className="space-y-6 min-w-0">
          {items.length > 0 ? (
            <SimulationItemsList
              items={items}
              simulationId={simulation.id}
              organizationId={organizationId}
              hsCodes={hsCodes}
              onMutate={handleMutate}
              canEdit={canEdit}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-lg">
              <PackageOpen className="size-12 text-muted mb-4" />
              <p className="text-muted text-center max-w-sm mb-4">
                {t('emptyMessage')}
              </p>
              {canEdit && (
                <AddProductModal
                  simulationId={simulation.id}
                  organizationId={organizationId}
                  products={products}
                  hsCodes={hsCodes}
                  onMutate={handleMutate}
                  triggerLabel={t('addFirstProduct')}
                />
              )}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="lg:sticky lg:top-4 lg:self-start">
            <SimulationFinancialSummary
              summary={financialSummary ?? null}
              items={items}
              simulation={simulation}
            />
          </div>
        )}
      </div>
    </div>
  );
}
