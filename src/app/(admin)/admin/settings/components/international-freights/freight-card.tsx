'use client';

import { useTranslations } from 'next-intl';
import { Button, Card, Chip } from '@heroui/react';
import { Trash2, ArrowRight, Container, Edit } from 'lucide-react';
import { ValidityChip } from './validity-chip';
import type { InternationalFreightWithPorts } from '@/services/admin';
import { CONTAINER_TYPE_LABELS } from '@/lib/storage-utils';

interface FreightCardProps {
  freight: InternationalFreightWithPorts;
  onEdit: () => void;
  onDelete: () => void;
}

export function FreightCard({ freight, onEdit, onDelete }: FreightCardProps) {
  const t = useTranslations('Admin.Settings.InternationalFreights');
  const totalValue = Number(freight.value) + (Number(freight.expectedProfit ?? 0) ?? 0);
  return (
    <Card key={freight.id} className="p-4">
      <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
      <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Container className="size-4" />
                  {CONTAINER_TYPE_LABELS[freight.containerType] ?? freight.containerType}
                </h4>
          <ValidityChip freight={freight} />

      </div>
          <div>
          <span className="font-bold text-accent">
            {Number(totalValue).toLocaleString('pt-BR', {
              style: 'currency',
              currency: freight.currency ?? 'USD',
            })}
          </span>
          </div>
        <div className="flex flex-wrap items-center gap-1 text-sm text-muted">
          {freight.portsOfLoading.length <= 2
            ? freight.portsOfLoading.map((p) => (
                <Chip key={p.id} size="sm" variant="soft">
                  {p.name}
                </Chip>
              ))
            : (
                <Chip size="sm" variant="soft">
                  {freight.portsOfLoading.length} {t('ports')}
                </Chip>
              )}
          <ArrowRight className="size-4 shrink-0" />
          {freight.portsOfDischarge.length <= 2
            ? freight.portsOfDischarge.map((p) => (
                <Chip key={p.id} size="sm" variant="soft">
                  {p.name}
                </Chip>
              ))
            : (
                <Chip size="sm" variant="soft">
                  {freight.portsOfDischarge.length} {t('ports')}
                </Chip>
              )}
        </div>
        <p className='text-xs text-muted'>
        {Number(freight.value).toLocaleString('pt-BR', {
              style: 'currency',
              currency: freight.currency ?? 'USD',
            })} {t('value')}
        </p> 
        {freight.expectedProfit && (
          <p className="text-xs text-muted">
            {Number(freight.expectedProfit).toLocaleString('pt-BR', {
              style: 'currency',
              currency: freight.currency ?? 'USD',
            })} {t('expectedProfit')}
          </p>
        )}
        {(freight.freeTimeDays ?? 0) > 0 && (
          <p className="text-xs text-muted">
            {t('freeTimeDaysCount', { count: freight.freeTimeDays ?? 0 })}
          </p>
        )}

        <div className="flex justify-end gap-1 pt-2">
          <Button isIconOnly size="sm" variant="tertiary" onPress={onEdit}>
            <Edit className="size-4" />
          </Button>
          <Button isIconOnly size="sm" variant="danger-soft" onPress={onDelete}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
