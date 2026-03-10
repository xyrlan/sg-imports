'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/ui/data-table';
import { getSimulationItemColumns } from './simulation-item-columns';
import { EditSimulationItemModal } from './edit-simulation-item-modal';
import { removeSimulationItemAction } from '../../actions';
import type { HsCodeOption, SimulationItem } from '@/services/simulation.service';
import { Card } from '@heroui/react';

interface SimulationItemsListProps {
  items: SimulationItem[];
  simulationId: string;
  organizationId: string;
  hsCodes: HsCodeOption[];
  onMutate?: () => void;
}

export function SimulationItemsList({
  items,
  simulationId,
  organizationId,
  hsCodes,
  onMutate,
}: SimulationItemsListProps) {
  const [editingItem, setEditingItem] = useState<SimulationItem | null>(null);
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

  const handleEdit = useCallback((item: SimulationItem) => {
    setEditingItem(item);
  }, []);

  const columns = useMemo(
    () => getSimulationItemColumns(t, { onRemove: handleRemove, onEdit: handleEdit }),
    [t, handleRemove, handleEdit]
  );

  return (
    <Card>
      <Card.Header>
        <Card.Title>
          {t('itemName')}
        </Card.Title>
      </Card.Header>
      <DataTable<SimulationItem>
        columns={columns}
        data={items}
        searchPlaceholder={t('searchItems')}
      />
      <EditSimulationItemModal
        item={editingItem}
        organizationId={organizationId}
        hsCodes={hsCodes}
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        onMutate={onMutate}
      />
    </Card>
  );
}
