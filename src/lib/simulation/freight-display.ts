/**
 * Pure functions for freight display logic.
 * Extracted from useFreightModality for Server Components and reuse.
 */

import type { ShippingMetadata } from '@/db/types';
import type { EquipmentType } from '@/types/freight';
import {
  calculateOptimalFreightProfile,
  CONTAINER_CAPACITIES,
  getChargeableWeightByModality,
} from '@/lib/logistics';
import { getContainerTypeLabel } from '@/lib/storage-utils';

export interface QuoteForFreight {
  totalCbm: string | number | null;
  totalWeight: string | number | null;
  totalChargeableWeight?: string | number | null;
  shippingModality?: string | null;
  metadata?: ShippingMetadata | Record<string, unknown> | null;
}

export type ModalityDisplayKey =
  | 'maritimeFclPlural'
  | 'maritimeFcl'
  | 'maritimeLcl'
  | 'air'
  | 'express'
  | 'none';

export interface ModalityDisplayInfo {
  modalityKey: ModalityDisplayKey;
  modalityParams?: { type?: string; count?: number };
}

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === 'string' ? parseFloat(v) || 0 : v;
}

function parseMetadata(m: unknown): ShippingMetadata | null {
  if (!m || typeof m !== 'object') return null;
  const o = m as Record<string, unknown>;
  const valid: EquipmentType[] = ['20GP', '40NOR', '40HC'];
  const eq = o.equipmentType as string | undefined;
  if (eq && !valid.includes(eq as EquipmentType)) return null;
  return {
    equipmentType: eq as EquipmentType | undefined,
    equipmentQuantity: typeof o.equipmentQuantity === 'number' ? o.equipmentQuantity : undefined,
    totalChargeableWeight: typeof o.totalChargeableWeight === 'number' ? o.totalChargeableWeight : undefined,
    isOverride: o.isOverride === true,
  };
}

/**
 * Returns translation key and params for modality display.
 * Use with getTranslations: t(info.modalityKey, info.modalityParams)
 */
export function getModalityDisplayInfo(simulation: {
  shippingModality?: string | null;
  metadata?: unknown;
}): ModalityDisplayInfo {
  const modality = simulation.shippingModality;
  const metadata = parseMetadata(simulation.metadata) ?? {};

  if (modality === 'SEA_FCL' && metadata.equipmentType && metadata.equipmentQuantity != null) {
    const qty = metadata.equipmentQuantity;
    const typeLabel = getContainerTypeLabel(metadata.equipmentType);
    return qty > 1
      ? { modalityKey: 'maritimeFclPlural', modalityParams: { type: typeLabel, count: qty } }
      : { modalityKey: 'maritimeFcl', modalityParams: { type: typeLabel } };
  }
  if (modality === 'SEA_LCL') return { modalityKey: 'maritimeLcl' };
  if (modality === 'AIR') return { modalityKey: 'air' };
  if (modality === 'EXPRESS') return { modalityKey: 'express' };
  return { modalityKey: 'none' };
}

export interface FreightDisplayResult {
  selectedModality: 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'EXPRESS';
  selectedEquipment: { type: EquipmentType; quantity: number } | null;
  effectiveCapacity: { maxWeight: number; maxVolume: number } | null;
  totalCbm: number;
  totalWeight: number;
  totalChargeableWeight: number;
}

/**
 * Pure computation of freight display values from quote/simulation.
 * Use for read-only display (e.g. SimulationFinancialSummary) instead of useFreightModality.
 */
export function computeFreightDisplayFromQuote(quote: QuoteForFreight): FreightDisplayResult {
  const totalCbm = toNum(quote.totalCbm);
  const totalWeight = toNum(quote.totalWeight);
  const savedModality = quote.shippingModality;
  const savedMeta = parseMetadata(quote.metadata);

  const optimalProfile = calculateOptimalFreightProfile(totalCbm, totalWeight);
  const hasPersistedModality =
    savedModality && ['AIR', 'SEA_LCL', 'SEA_FCL', 'EXPRESS'].includes(savedModality);

  const selectedModality: 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'EXPRESS' = hasPersistedModality
    ? (savedModality as 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'EXPRESS')
    : optimalProfile.suggestedModality;

  let selectedEquipment: { type: EquipmentType; quantity: number } | null = null;
  if (savedMeta?.equipmentType && savedMeta?.equipmentQuantity != null) {
    const t = savedMeta.equipmentType;
    if (['20GP', '40NOR', '40HC'].includes(t)) {
      selectedEquipment = { type: t, quantity: savedMeta.equipmentQuantity };
    }
  }
  if (!selectedEquipment && !hasPersistedModality && optimalProfile.equipment) {
    selectedEquipment = optimalProfile.equipment;
  }
  if (selectedModality === 'SEA_FCL' && !selectedEquipment && optimalProfile.equipment) {
    selectedEquipment = optimalProfile.equipment;
  }
  if (selectedModality !== 'SEA_FCL') {
    selectedEquipment = null;
  }

  const effectiveCapacity: { maxWeight: number; maxVolume: number } | null =
    selectedModality === 'SEA_FCL' && selectedEquipment
      ? {
          maxWeight: CONTAINER_CAPACITIES[selectedEquipment.type].maxWeight * selectedEquipment.quantity,
          maxVolume: CONTAINER_CAPACITIES[selectedEquipment.type].maxCbm * selectedEquipment.quantity,
        }
      : null;

  const totalChargeableWeight = getChargeableWeightByModality(
    totalCbm,
    totalWeight,
    selectedModality,
  );

  return {
    selectedModality,
    selectedEquipment,
    effectiveCapacity,
    totalCbm,
    totalWeight,
    totalChargeableWeight,
  };
}
