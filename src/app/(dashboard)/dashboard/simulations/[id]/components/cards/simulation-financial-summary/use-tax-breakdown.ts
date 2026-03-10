'use client';

import { useMemo } from 'react';
import type { SimulationItem } from '@/services/simulation.service';

export interface TaxBreakdown {
  ii: number;
  ipi: number;
  pis: number;
  cofins: number;
  siscomex: number;
  afrmm: number;
  icms: number;
}

export function useTaxBreakdown(items: SimulationItem[]): {
  taxBreakdown: TaxBreakdown;
  hasTaxBreakdown: boolean;
} {
  const taxBreakdown = useMemo(() => {
    let ii = 0;
    let ipi = 0;
    let pis = 0;
    let cofins = 0;
    let siscomex = 0;
    let afrmm = 0;
    let icms = 0;
    for (const i of items) {
      ii += Number(i.iiValueSnapshot ?? 0);
      ipi += Number(i.ipiValueSnapshot ?? 0);
      pis += Number(i.pisValueSnapshot ?? 0);
      cofins += Number(i.cofinsValueSnapshot ?? 0);
      siscomex += Number(i.siscomexValueSnapshot ?? 0);
      afrmm += Number(i.afrmmValueSnapshot ?? 0);
      icms += Number(i.icmsValueSnapshot ?? 0);
    }
    return { ii, ipi, pis, cofins, siscomex, afrmm, icms };
  }, [items]);

  const hasTaxBreakdown = useMemo(
    () =>
      taxBreakdown.ii > 0 ||
      taxBreakdown.ipi > 0 ||
      taxBreakdown.pis > 0 ||
      taxBreakdown.cofins > 0 ||
      taxBreakdown.siscomex > 0 ||
      taxBreakdown.afrmm > 0 ||
      taxBreakdown.icms > 0,
    [taxBreakdown],
  );

  return { taxBreakdown, hasTaxBreakdown };
}
