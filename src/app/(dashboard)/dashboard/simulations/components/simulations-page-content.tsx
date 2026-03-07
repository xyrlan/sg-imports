'use client';

import { useRouter } from 'next/navigation';
import type { Simulation } from '@/services/simulation.service';
import { SimulationsTable } from './simulations-table';

interface SimulationsPageContentProps {
  initialSimulations: Simulation[];
  organizationId: string;
  initialPaging: { totalCount: number; page: number; pageSize: number };
}

export function SimulationsPageContent({
  initialSimulations,
  organizationId,
  initialPaging,
}: SimulationsPageContentProps) {
  const router = useRouter();

  const handleMutate = () => {
    router.refresh();
  };

  return (
    <SimulationsTable
      initialSimulations={initialSimulations}
      organizationId={organizationId}
      onMutate={handleMutate}
    />
  );
}
