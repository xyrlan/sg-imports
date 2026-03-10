'use client';

import { useTranslations } from 'next-intl';
import { Boxes, Weight, Info, CircleAlert, Plane, Ship, Box } from 'lucide-react';
import { LCL_VIABILITY_THRESHOLDS } from '@/lib/logistics';

type Modality = 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'EXPRESS';

interface FreightCapacityProgressProps {
  modality: Modality;
  totalCbm: number;
  totalWeight: number;
  totalChargeableWeight: number;
  effectiveCapacity: { maxWeight: number; maxVolume: number } | null;
  containerType?: string;
  containerQuantity?: number;
}

function formatWeight(kg: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'unit', unit: 'kilogram' }).format(kg);
}

function formatVolume(m3: number): string {
  return new Intl.NumberFormat('pt-BR').format(m3) + ' m³';
}

function ProgressBar({
  label,
  value,
  max,
  formatVal,
  icon: Icon,
  isOver,
  isSoftWarning,
}: {
  label: string;
  value: number;
  max: number;
  formatVal: (n: number) => string;
  icon: React.ElementType;
  isOver: boolean;
  isSoftWarning: boolean;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color = isOver ? (isSoftWarning ? 'bg-warning' : 'bg-danger') : 'bg-success';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-2">
          <Icon className="size-4" />
          {label}
        </span>
        <span className={isOver ? 'text-danger' : 'text-muted'}>
          {formatVal(value)} / {formatVal(max)}
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-accent-soft-hover overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-lg border border-default-200 p-3 flex items-center gap-3">
      <Icon className="size-5 text-default-500" />
      <div>
        <p className="text-xs text-default-500">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

export function FreightCapacityProgress({
  modality,
  totalCbm,
  totalWeight,
  totalChargeableWeight,
  effectiveCapacity,
  containerType,
  containerQuantity = 1,
}: FreightCapacityProgressProps) {
  const t = useTranslations('Simulations.FreightCapacityProgress');

  if (modality === 'SEA_FCL' && effectiveCapacity) {
    const volOver = totalCbm > effectiveCapacity.maxVolume;
    const weightOver = totalWeight > effectiveCapacity.maxWeight;
    const volExcessRatio = effectiveCapacity.maxVolume > 0 ? totalCbm / effectiveCapacity.maxVolume : 0;
    const weightExcessRatio =
      effectiveCapacity.maxWeight > 0 ? totalWeight / effectiveCapacity.maxWeight : 0;
    const volSoft = volExcessRatio > 1 && volExcessRatio <= 1.02;
    const weightSoft = weightExcessRatio > 1 && weightExcessRatio <= 1.02;

    return (
      <div className="space-y-6">
        <h3 className="font-semibold flex items-center gap-2">
          <Ship className="size-5" />
          {containerType && (
            <span className="text-sm font-semibold text-accent">
              {containerType} {containerQuantity > 1 && `× ${containerQuantity}`}
            </span>
          )}
        </h3>
        <div className="flex flex-col gap-4 max-w-lg">
          <ProgressBar
            label={t('weight')}
            value={totalWeight}
            max={effectiveCapacity.maxWeight}
            formatVal={formatWeight}
            icon={Weight}
            isOver={weightOver}
            isSoftWarning={weightSoft}
          />
          {(weightOver || weightSoft) && (
            <div
              className={`text-xs inline-flex gap-2 items-center ${
                weightSoft ? 'text-warning' : 'text-danger'
              }`}
            >
              <CircleAlert className="size-4" />
              {t('weightExceeded')}
            </div>
          )}
          <ProgressBar
            label={t('volume')}
            value={totalCbm}
            max={effectiveCapacity.maxVolume}
            formatVal={formatVolume}
            icon={Box}
            isOver={volOver}
            isSoftWarning={volSoft}
          />
          {(volOver || volSoft) && (
            <div
              className={`text-xs inline-flex gap-2 items-center ${
                volSoft ? 'text-warning' : 'text-danger'
              }`}
            >
              <CircleAlert className="size-4" />
              {volSoft ? t('softWarning') : t('volumeExceeded')}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (modality === 'SEA_LCL') {
    const nearLimit = totalCbm >= LCL_VIABILITY_THRESHOLDS.maxCbm * 0.9;

    return (
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Boxes className="size-5" />
          {t('lclTitle')}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label={t('totalCbm')} value={formatVolume(totalCbm)} icon={Box} />
          <MetricCard
            label={t('chargeableWeight')}
            value={formatWeight(totalChargeableWeight)}
            icon={Weight}
          />
        </div>
        {nearLimit && (
          <div className="text-xs text-warning inline-flex gap-2 items-center">
            <Info className="size-4" />
            {t('lclViabilityAlert')}
          </div>
        )}
      </div>
    );
  }

  if (modality === 'AIR' || modality === 'EXPRESS') {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Plane className="size-5" />
          {t(modality === 'AIR' ? 'airTitle' : 'expressTitle')}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label={t('totalCbm')} value={formatVolume(totalCbm)} icon={Box} />
          <MetricCard
            label={t('chargeableWeight')}
            value={formatWeight(totalChargeableWeight)}
            icon={Weight}
          />
        </div>
        <p className="text-xs flex items-center gap-2">
          <Info className="size-4 shrink-0" />
          {t('volumetricNote')}
        </p>
      </div>
    );
  }

  return null;
}
