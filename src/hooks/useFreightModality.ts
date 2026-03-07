'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ShippingMetadata } from '@/db/types';
import type { FreightProfile, EquipmentType } from '@/types/freight';
import {
  calculateOptimalFreightProfile,
  CONTAINER_CAPACITIES,
  LCL_VIABILITY_THRESHOLDS,
  getChargeableWeightByModality,
} from '@/lib/logistics';

export interface QuoteForFreight {
  totalCbm: string | number | null;
  totalWeight: string | number | null;
  totalChargeableWeight?: string | number | null;
  shippingModality?: string | null;
  metadata?: ShippingMetadata | Record<string, unknown> | null;
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

export interface UseFreightModalityResult {
  selectedModality: 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'EXPRESS';
  setSelectedModality: (m: 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'EXPRESS') => void;
  selectedEquipment: { type: EquipmentType; quantity: number } | null;
  setSelectedEquipment: (e: { type: EquipmentType; quantity: number } | null) => void;
  optimalProfile: FreightProfile;
  effectiveCapacity: { maxWeight: number; maxVolume: number } | null;
  totalCbm: number;
  totalWeight: number;
  totalChargeableWeight: number;
  isLCLDisabled: boolean;
  isOverride: boolean;
}

export function useFreightModality(quote: QuoteForFreight): UseFreightModalityResult {
  const totalCbm = toNum(quote.totalCbm);
  const totalWeight = toNum(quote.totalWeight);
  const savedModality = quote.shippingModality;
  const savedMeta = parseMetadata(quote.metadata);

  const optimalProfile = useMemo(
    () => calculateOptimalFreightProfile(totalCbm, totalWeight),
    [totalCbm, totalWeight],
  );

  const isLCLDisabled =
    totalWeight >= LCL_VIABILITY_THRESHOLDS.maxWeight ||
    totalCbm >= LCL_VIABILITY_THRESHOLDS.maxCbm;

  const hasPersistedModality =
    savedModality && ['AIR', 'SEA_LCL', 'SEA_FCL', 'EXPRESS'].includes(savedModality);

  const getInitialModality = (): 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'EXPRESS' => {
    if (hasPersistedModality) return savedModality as 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'EXPRESS';
    return optimalProfile.suggestedModality;
  };

  const getInitialEquipment = (): { type: EquipmentType; quantity: number } | null => {
    if (savedMeta?.equipmentType && savedMeta?.equipmentQuantity != null) {
      const t = savedMeta.equipmentType;
      if (['20GP', '40NOR', '40HC'].includes(t)) {
        return { type: t, quantity: savedMeta.equipmentQuantity };
      }
    }
    if (!hasPersistedModality && optimalProfile.equipment) {
      return optimalProfile.equipment;
    }
    return null;
  };

  const [selectedModality, setSelectedModality] = useState<'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'EXPRESS'>(
    getInitialModality,
  );
  const [selectedEquipment, setSelectedEquipment] = useState<{
    type: EquipmentType;
    quantity: number;
  } | null>(getInitialEquipment);

  useEffect(() => {
    if (hasPersistedModality) {
      setSelectedModality(savedModality as 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'EXPRESS');
      const eq = getInitialEquipment();
      setSelectedEquipment(eq);
    } else {
      setSelectedModality(optimalProfile.suggestedModality);
      setSelectedEquipment(optimalProfile.equipment ?? null);
    }
  }, [
    savedModality,
    savedMeta?.equipmentType,
    savedMeta?.equipmentQuantity,
    optimalProfile.suggestedModality,
    optimalProfile.equipment,
  ]);

  useEffect(() => {
    if (selectedModality === 'SEA_FCL' && !selectedEquipment && optimalProfile.equipment) {
      setSelectedEquipment(optimalProfile.equipment);
    }
    if (selectedModality !== 'SEA_FCL') {
      setSelectedEquipment(null);
    }
  }, [selectedModality]);

  const effectiveCapacity = useMemo((): { maxWeight: number; maxVolume: number } | null => {
    if (selectedModality !== 'SEA_FCL' || !selectedEquipment) return null;
    const cap = CONTAINER_CAPACITIES[selectedEquipment.type];
    return {
      maxWeight: cap.maxWeight * selectedEquipment.quantity,
      maxVolume: cap.maxCbm * selectedEquipment.quantity,
    };
  }, [selectedModality, selectedEquipment]);

  const totalChargeableWeight = useMemo(
    () =>
      getChargeableWeightByModality(totalCbm, totalWeight, selectedModality),
    [totalCbm, totalWeight, selectedModality],
  );

  const isOverride =
    savedMeta?.isOverride === true ||
    (optimalProfile.suggestedModality === 'SEA_LCL' && selectedModality === 'SEA_FCL');

  return {
    selectedModality,
    setSelectedModality,
    selectedEquipment,
    setSelectedEquipment,
    optimalProfile,
    effectiveCapacity,
    totalCbm,
    totalWeight,
    totalChargeableWeight,
    isLCLDisabled,
    isOverride,
  };
}
