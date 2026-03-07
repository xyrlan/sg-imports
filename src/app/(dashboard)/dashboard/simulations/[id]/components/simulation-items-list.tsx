'use client';

import { useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/ui/data-table';
import { getSimulationItemColumns } from './simulation-item-columns';
import { removeSimulationItemAction } from '../../actions';
import type { SimulationItem } from '@/services/simulation.service';

interface SimulationItemsListProps {
  items: SimulationItem[];
  organizationId: string;
  onMutate?: () => void;
}

export function SimulationItemsList({
  items,
  organizationId,
  onMutate,
}: SimulationItemsListProps) {
  const t = useTranslations('Simulations.Detail');

  const handleRemove = useCallback(
    async (item: SimulationItem) => {
      const result = await removeSimulationItemAction(item.id, organizationId);
      if (result.success) {
        onMutate?.();
      } else if (result.error) {
        alert(result.error);
      }
    },
    [organizationId, onMutate]
  );

  const columns = useMemo(
    () => getSimulationItemColumns(t, { onRemove: handleRemove }),
    [t, handleRemove]
  );

  return (
    <DataTable<SimulationItem>
      columns={columns}
      data={items}
      searchPlaceholder={t('searchItems')}
    />
  );
}
