/**
 * Logistics utilities for Landed Cost — CBM, weight, chargeable weight
 * Uses Decimal for precision (avoids JS float rounding errors)
 */

import Decimal from 'decimal.js';

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
