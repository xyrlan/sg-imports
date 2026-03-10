import { getTranslations } from 'next-intl/server';
import { Card } from '@heroui/react';
import { getModalityDisplayInfo } from '@/lib/simulation/freight-display';
import type { Simulation } from '@/services/simulation.service';

interface FreightStatusCardProps {
  simulation: Simulation;
}

export async function FreightStatusCard({ simulation }: FreightStatusCardProps) {
  const t = await getTranslations('Simulations.FreightStatusCard');
  const { modalityKey, modalityParams } = getModalityDisplayInfo(simulation);
  const modalityLabel = t(modalityKey, modalityParams as Record<string, string | number>);

  return (
    <Card className="p-6">
      <Card.Content className="space-y-4">
        <div>
          <h3 className="font-semibold text-sm text-muted-foreground">{t('modality')}</h3>
          <p className="font-medium">{modalityLabel}</p>
        </div>
      </Card.Content>
    </Card>
  );
}
