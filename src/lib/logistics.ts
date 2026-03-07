/**
 * Logistics utilities for Landed Cost — CBM, weight, chargeable weight
 * Uses Decimal for precision (avoids JS float rounding errors)
 */

import Decimal from 'decimal.js';
import type { FreightProfile } from '@/types/freight';

/** Capacidades reais de mercado (m³, kg) — Single Source of Truth */
export const CONTAINER_CAPACITIES = {
  '20GP': { maxCbm: 33, maxWeight: 28_000 },
  '40NOR': { maxCbm: 67, maxWeight: 28_000 },
  '40HC': { maxCbm: 76, maxWeight: 28_000 },
} as const;

export const LCL_VIABILITY_THRESHOLDS = { maxCbm: 15, maxWeight: 10_000 };

/** AIR: fator de estiva 1:6 (volume_cm³ / 6000 = peso vol. kg) */
export const AIR_VOLUMETRIC_DIVISOR = 6000;

/**
 * Calcula o perfil ótimo de frete com base em CBM e peso.
 * LCL: < 15 CBM e < 10.000 kg. Caso contrário: SEA_FCL com containers otimizados.
 */
export function calculateOptimalFreightProfile(
  totalCbm: number,
  totalWeight: number,
): FreightProfile {
  const { maxCbm: lclCbm, maxWeight: lclWeight } = LCL_VIABILITY_THRESHOLDS;

  if (totalWeight < lclWeight && totalCbm < lclCbm) {
    return {
      suggestedModality: 'SEA_LCL',
      isContainerized: false,
      capacity: { maxWeight: null, maxVolume: null },
    };
  }

  const cap20 = CONTAINER_CAPACITIES['20GP'];
  const cap40NOR = CONTAINER_CAPACITIES['40NOR'];
  const cap40HC = CONTAINER_CAPACITIES['40HC'];

  const needByWeight = (maxW: number) => Math.ceil(totalWeight / maxW);
  const needByVolume = (maxV: number) => Math.ceil(totalCbm / maxV);
  const needFor = (maxW: number, maxV: number) =>
    Math.max(needByWeight(maxW), needByVolume(maxV));

  if (totalWeight <= cap20.maxWeight && totalCbm <= cap20.maxCbm) {
    return {
      suggestedModality: 'SEA_FCL',
      isContainerized: true,
      equipment: { type: '20GP', quantity: 1 },
      capacity: { maxWeight: cap20.maxWeight, maxVolume: cap20.maxCbm },
    };
  }

  if (totalWeight <= cap40NOR.maxWeight && totalCbm <= cap40NOR.maxCbm) {
    return {
      suggestedModality: 'SEA_FCL',
      isContainerized: true,
      equipment: { type: '40NOR', quantity: 1 },
      capacity: { maxWeight: cap40NOR.maxWeight, maxVolume: cap40NOR.maxCbm },
    };
  }

  if (totalWeight <= cap40HC.maxWeight && totalCbm <= cap40HC.maxCbm) {
    return {
      suggestedModality: 'SEA_FCL',
      isContainerized: true,
      equipment: { type: '40HC', quantity: 1 },
      capacity: { maxWeight: cap40HC.maxWeight, maxVolume: cap40HC.maxCbm },
    };
  }

  const norNeed = needFor(cap40NOR.maxWeight, cap40NOR.maxCbm);
  const hqNeed = needFor(cap40HC.maxWeight, cap40HC.maxCbm);

  if (norNeed <= 2) {
    return {
      suggestedModality: 'SEA_FCL',
      isContainerized: true,
      equipment: { type: '40NOR', quantity: norNeed },
      capacity: {
        maxWeight: cap40NOR.maxWeight * norNeed,
        maxVolume: cap40NOR.maxCbm * norNeed,
      },
    };
  }

  if (hqNeed <= 2) {
    return {
      suggestedModality: 'SEA_FCL',
      isContainerized: true,
      equipment: { type: '40HC', quantity: 2 },
      capacity: {
        maxWeight: cap40HC.maxWeight * 2,
        maxVolume: cap40HC.maxCbm * 2,
      },
    };
  }

  if (norNeed <= 3) {
    return {
      suggestedModality: 'SEA_FCL',
      isContainerized: true,
      equipment: { type: '40NOR', quantity: 3 },
      capacity: {
        maxWeight: cap40NOR.maxWeight * 3,
        maxVolume: cap40NOR.maxCbm * 3,
      },
    };
  }

  if (hqNeed <= 3) {
    return {
      suggestedModality: 'SEA_FCL',
      isContainerized: true,
      equipment: { type: '40HC', quantity: 3 },
      capacity: {
        maxWeight: cap40HC.maxWeight * 3,
        maxVolume: cap40HC.maxCbm * 3,
      },
    };
  }

  return {
    suggestedModality: 'SEA_FCL',
    isContainerized: true,
    equipment: { type: '40HC', quantity: hqNeed },
    capacity: {
      maxWeight: cap40HC.maxWeight * hqNeed,
      maxVolume: cap40HC.maxCbm * hqNeed,
    },
  };
}

export interface CartonDimensions {
  heightCm: number | string;
  widthCm: number | string;
  lengthCm: number | string;
  weightKg: number | string;
  unitsPerCarton: number;
}

export interface UnitDimensions {
  heightCm?: number | string;
  widthCm?: number | string;
  lengthCm?: number | string;
  weightKg?: number | string;
  unitsPerCarton?: number;
}

/**
 * CBM (m³) = (height_cm * width_cm * length_cm) / 1_000_000
 */
export function computeCbm(dimensions: CartonDimensions | UnitDimensions): Decimal {
  const h = new Decimal(dimensions.heightCm ?? 0);
  const w = new Decimal(dimensions.widthCm ?? 0);
  const l = new Decimal(dimensions.lengthCm ?? 0);
  return h.times(w).times(l).div(1_000_000);
}

/**
 * Weight (kg) = num_cartons * carton_weight_kg
 * num_cartons = ceil(quantity / units_per_carton)
 */
export function computeWeight(
  quantity: number,
  dimensions: CartonDimensions | UnitDimensions,
): Decimal {
  const unitsPerCarton = ('unitsPerCarton' in dimensions ? dimensions.unitsPerCarton : 1) ?? 1;
  const numCartons = Math.ceil(quantity / unitsPerCarton);
  const weightKg = new Decimal(
    'weightKg' in dimensions && dimensions.weightKg != null ? dimensions.weightKg : 0,
  );
  return weightKg.times(numCartons);
}

/**
 * Total CBM for a line item = cbm_per_carton * num_cartons
 */
export function computeTotalCbm(
  quantity: number,
  dimensions: CartonDimensions | UnitDimensions,
): Decimal {
  const unitsPerCarton = ('unitsPerCarton' in dimensions ? dimensions.unitsPerCarton : 1) ?? 1;
  const numCartons = Math.ceil(quantity / unitsPerCarton);
  const cbmPerCarton = computeCbm(dimensions);
  return cbmPerCarton.times(numCartons);
}

/**
 * Volumetric weight (kg) — Air: volume_cm3 / 6000 (or 5000, carrier-dependent)
 */
export function getVolumetricWeightAir(cbmM3: Decimal | number, divisor = 6000): Decimal {
  const cbm = typeof cbmM3 === 'number' ? new Decimal(cbmM3) : cbmM3;
  const volumeCm3 = cbm.times(1_000_000);
  return volumeCm3.div(divisor);
}

/**
 * Volumetric weight (kg) — Sea LCL: 1 ton = 1 m³ → volumetric_weight_kg = cbm_m3 * 1000
 */
export function getVolumetricWeightSeaLCL(cbmM3: Decimal | number): Decimal {
  const cbm = typeof cbmM3 === 'number' ? new Decimal(cbmM3) : cbmM3;
  return cbm.times(1000);
}

/**
 * Chargeable weight por modalidade (para exibição dinâmica na UI).
 * AIR/EXPRESS: max(gross, vol/6000); SEA_LCL: max(gross, CBM×1000); SEA_FCL: peso bruto.
 */
export function getChargeableWeightByModality(
  totalCbm: number,
  totalWeightKg: number,
  modality: 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'EXPRESS',
): number {
  const gross = new Decimal(totalWeightKg);
  if (modality === 'SEA_FCL') return gross.toNumber();
  const vol =
    modality === 'AIR' || modality === 'EXPRESS'
      ? getVolumetricWeightAir(totalCbm)
      : getVolumetricWeightSeaLCL(totalCbm);
  return getChargeableWeight(gross, vol).toNumber();
}

/**
 * Chargeable weight = max(gross_weight, volumetric_weight)
 */
export function getChargeableWeight(
  grossKg: Decimal | number,
  volumetricKg: Decimal | number,
): Decimal {
  const gross = typeof grossKg === 'number' ? new Decimal(grossKg) : grossKg;
  const vol = typeof volumetricKg === 'number' ? new Decimal(volumetricKg) : volumetricKg;
  return Decimal.max(gross, vol);
}

/**
 * Fallback order: 1) Carton dimensions, 2) Unit dimensions, 3) Default 0
 */
export function getDimensionsForCbm(
  carton: CartonDimensions | null,
  unit: UnitDimensions | null,
): CartonDimensions {
  if (carton && (carton.heightCm || carton.widthCm || carton.lengthCm)) {
    return {
      heightCm: carton.heightCm ?? 0,
      widthCm: carton.widthCm ?? 0,
      lengthCm: carton.lengthCm ?? 0,
      weightKg: carton.weightKg ?? 0,
      unitsPerCarton: carton.unitsPerCarton ?? 1,
    };
  }
  if (unit && (unit.heightCm || unit.widthCm || unit.lengthCm)) {
    return {
      heightCm: unit.heightCm ?? 0,
      widthCm: unit.widthCm ?? 0,
      lengthCm: unit.lengthCm ?? 0,
      weightKg: unit.weightKg ?? 0,
      unitsPerCarton: unit.unitsPerCarton ?? 1,
    };
  }
  return {
    heightCm: 0,
    widthCm: 0,
    lengthCm: 0,
    weightKg: 0,
    unitsPerCarton: 1,
  };
}
