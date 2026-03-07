'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/data-table';
import { getSimulationColumns } from './simulation-columns';
import { CreateSimulationModal } from './create-simulation-modal';
import { DeleteSimulationDialog } from './delete-simulation-dialog';
import type { Simulation } from '@/services/simulation.service';

interface SimulationsTableProps {
  initialSimulations: Simulation[];
  organizationId: string;
  onMutate?: () => void;
}

export function SimulationsTable({
  initialSimulations,
  organizationId,
  onMutate,
}: SimulationsTableProps) {
  const t = useTranslations('Simulations.Table');
  const tCols = useTranslations('Simulations.Columns');
  const tStatus = useTranslations('Simulations.Status');
  const router = useRouter();
  const [simulationToDelete, setSimulationToDelete] = useState<Simulation | null>(null);

  const handleMutate = () => {
    onMutate?.();
    router.refresh();
  };

  const columns = useMemo(
    () =>
      getSimulationColumns(tCols, tStatus, {
        onDelete: (simulation) => setSimulationToDelete(simulation),
      }),
    [tCols, tStatus]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <CreateSimulationModal organizationId={organizationId} onMutate={handleMutate} />
      </div>

      <DataTable<Simulation>
        columns={columns}
        data={initialSimulations}
        searchPlaceholder={t('searchPlaceholder')}
      />

      <DeleteSimulationDialog
        simulation={simulationToDelete}
        open={!!simulationToDelete}
        onOpenChange={(open) => !open && setSimulationToDelete(null)}
        organizationId={organizationId}
        onSuccess={handleMutate}
      />
    </div>
  );
}
