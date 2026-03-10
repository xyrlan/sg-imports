'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@heroui/react';
import { ArrowLeft, PackageOpen, Settings } from 'lucide-react';
import { SimulationItemsList } from './simulation-items-list';
import type {
  Simulation,
  SimulationItem,
  QuoteFinancialSummary,
  HsCodeOption,
} from '@/services/simulation.service';
import type { ProductWithVariants } from '@/services/product.service';
import { AddProductToSimulationModal } from './add-product-to-simulation-modal';
import { SimulationSettingsModal } from './simulation-settings-modal';
import { ShippingSelectionSection } from './shipping-selection-section';
import { SimulationFinancialSummary } from './simulation-financial-summary';

interface SimulationDetailContentProps {
  simulation: Simulation;
  items: SimulationItem[];
  organizationId: string;
  products: ProductWithVariants[];
  hsCodes: HsCodeOption[];
  financialSummary?: QuoteFinancialSummary | null;
  defaultDestinationState?: string | null;
}

export function SimulationDetailContent({
  simulation,
  items,
  organizationId,
  products,
  hsCodes,
  financialSummary = null,
  defaultDestinationState = null,
}: SimulationDetailContentProps) {
  const t = useTranslations('Simulations.Detail');
  const tStatus = useTranslations('Simulations.Status');
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleMutate = () => {
    router.refresh();
  };

  return (
    <div key={simulation.id} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/simulations">
            <Button variant="ghost" size="sm" className="inline-flex items-center gap-2">
              <ArrowLeft className="size-4" />
              {t('back')}
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{simulation.name}</h1>
            <p className="text-sm text-muted">
              {t('status')}: {simulation.status ? tStatus(simulation.status as 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED' | 'CONVERTED') : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-2"
          >
            <Settings className="size-4" />
            {t('settingsButton')}
          </Button>
          <SimulationSettingsModal
            simulation={simulation}
            defaultDestinationState={defaultDestinationState}
            onMutate={handleMutate}
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
          />
          <AddProductToSimulationModal
            simulationId={simulation.id}
            organizationId={organizationId}
            products={products}
            hsCodes={hsCodes}
            onMutate={handleMutate}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8">
        <div className="space-y-6 min-w-0">
          {items.length > 0 && (
            <ShippingSelectionSection
              simulation={simulation}
              defaultDestinationState={defaultDestinationState}
              onMutate={handleMutate}
            />
          )}

          {items.length > 0 ? (
            <SimulationItemsList
              items={items}
              simulationId={simulation.id}
              organizationId={organizationId}
              hsCodes={hsCodes}
              onMutate={handleMutate}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-lg">
              <PackageOpen className="size-12 text-muted mb-4" />
              <p className="text-muted text-center max-w-sm mb-4">
                {t('emptyMessage')}
              </p>
              <AddProductToSimulationModal
                simulationId={simulation.id}
                organizationId={organizationId}
                products={products}
                hsCodes={hsCodes}
                onMutate={handleMutate}
                triggerLabel={t('addFirstProduct')}
              />
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
