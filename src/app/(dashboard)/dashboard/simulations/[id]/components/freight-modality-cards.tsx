'use client';

import { useTranslations } from 'next-intl';
import { Card, RadioGroup, Radio, Label } from '@heroui/react';
import { Boxes, Ship, Plane, Zap } from 'lucide-react';
import type { EquipmentType } from '@/types/freight';
import { getContainerTypeLabel } from '@/lib/storage-utils';

const MODALITIES = [
  { id: 'SEA_LCL' as const, icon: Boxes },
  { id: 'SEA_FCL' as const, icon: Ship },
  { id: 'AIR' as const, icon: Plane },
  { id: 'EXPRESS' as const, icon: Zap },
] as const;

const FCL_OPTIONS: EquipmentType[] = ['20GP', '40NOR', '40HC'];

interface FreightModalityCardsProps {
  selectedModality: 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'EXPRESS';
  onModalityChange: (m: 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'EXPRESS') => void;
  selectedEquipment: { type: EquipmentType; quantity: number } | null;
  onEquipmentChange: (e: { type: EquipmentType; quantity: number } | null) => void;
  optimalEquipment?: { type: EquipmentType; quantity: number } | null;
  isLCLDisabled: boolean;
}

export function FreightModalityCards({
  selectedModality,
  onModalityChange,
  selectedEquipment,
  onEquipmentChange,
  optimalEquipment,
  isLCLDisabled,
}: FreightModalityCardsProps) {
  const t = useTranslations('Simulations.FreightModalityCards');

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">{t('title')}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {MODALITIES.map(({ id, icon: Icon }) => {
          const disabled = id === 'SEA_LCL' && isLCLDisabled;
          const isSelected = selectedModality === id;
          const suggested = id === 'SEA_LCL' && !isLCLDisabled;

          return (
            <Card
              key={id}
              variant="default"
              className={`cursor-pointer transition-all border-2 ${
                isSelected ? 'border-accent' : 'border-transparent'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-muted'}`}
              role="button"
              tabIndex={disabled ? -1 : 0}
              onClick={() => !disabled && onModalityChange(id)}
              onKeyDown={(e) =>
                !disabled && (e.key === 'Enter' || e.key === ' ') && onModalityChange(id)
              }
            >
              <Card.Content className="p-4 flex flex-col items-center gap-2">
                <Icon className="size-8" />
                <span className="text-sm font-medium text-center">{t(id)}</span>
                {suggested && (
                  <span className="text-xs text-success">{t('suggested')}</span>
                )}
              </Card.Content>
            </Card>
          );
        })}
      </div>

      {selectedModality === 'SEA_FCL' && (
        <div className="mt-4 space-y-2">
          <label className="text-sm font-medium">{t('containerSize')}</label>
          <RadioGroup
            value={selectedEquipment?.type ?? optimalEquipment?.type ?? ''}
            onChange={(v) => {
              const type = v as EquipmentType;
              if (FCL_OPTIONS.includes(type)) {
                const qty =
                  optimalEquipment?.type === type
                    ? optimalEquipment.quantity
                    : selectedEquipment?.type === type
                      ? selectedEquipment.quantity
                      : 1;
                onEquipmentChange({ type, quantity: qty });
              }
            }}
            orientation="horizontal"
            className="gap-4"
          >
            {FCL_OPTIONS.map((type) => (
              <Radio key={type} value={type}>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                <Radio.Content>
                  <Label>
                    {getContainerTypeLabel(type)}
                    {optimalEquipment?.type === type && optimalEquipment.quantity > 1 && (
                      <span className="ml-1 text-xs">
                        ({optimalEquipment.quantity}x)
                      </span>
                    )}
                  </Label>
                </Radio.Content>
              </Radio>
            ))}
          </RadioGroup>
        </div>
      )}
    </div>
  );
}
