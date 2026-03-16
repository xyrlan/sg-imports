'use client';

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DataTable } from '@/components/ui/data-table';
import { getSimulationItemColumns } from './simulation-item-columns';
import { EditItemModal } from './modals/edit-item-modal';
import { removeSimulationItemAction } from '../actions';
import type { HsCodeOption, SimulationItem } from '@/services/simulation.service';
import { Card, toast } from '@heroui/react';

interface SimulationItemsListProps {
  items: SimulationItem[];
  simulationId: string;
  organizationId: string;
  hsCodes: HsCodeOption[];
  onMutate?: () => void;
  canEdit?: boolean;
}

export function SimulationItemsList({
  items,
  simulationId,
  organizationId,
  hsCodes,
  onMutate,
  canEdit = true,
}: SimulationItemsListProps) {
  const [editingItem, setEditingItem] = useState<SimulationItem | null>(null);
  const t = useTranslations('Simulations.Detail');

  const handleRemove = useCallback(
    async (item: SimulationItem) => {
      const result = await removeSimulationItemAction(item.id, organizationId);
      if (result.success) {
        onMutate?.();
      } else if (result.error) {
        toast.danger(result.error);
      }
    },
    [organizationId, onMutate]
  );

  const handleEdit = useCallback((item: SimulationItem) => {
    setEditingItem(item);
  }, []);

  const columns = useMemo(
    () =>
      getSimulationItemColumns(t, {
        onRemove: canEdit ? handleRemove : undefined,
        onEdit: canEdit ? handleEdit : undefined,
      }),
    [t, handleRemove, handleEdit, canEdit]
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
      <EditItemModal
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
