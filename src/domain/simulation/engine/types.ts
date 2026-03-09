/**
 * Landed Cost Engine — Tipos
 * Framework-agnostic, usa decimal.js para precisão financeira.
 */

import type Decimal from 'decimal.js';

export type ShippingModality =
  | 'AIR'
  | 'SEA_LCL'
  | 'SEA_FCL'
  | 'SEA_FCL_PARTIAL'
  | 'EXPRESS';

export interface LandedCostEngineItemInput {
  id: string;
  priceUsd: string | number;
  quantity: number;
  /** Chargeable weight (peso cubado) para rateio de frete/seguro */
  weightSnapshot: number | string;
  /** Valor FOB em USD (priceUsd * quantity) — para rateio Siscomex */
  fobUsd?: number | string;
  iiRate: number | string;
  ipiRate: number | string;
  pisRate: number | string;
  cofinsRate: number | string;
}

export interface LandedCostEngineContext {
  targetDolar: number | string;
  exchangeRateIof: number | string;
  shippingModality: ShippingModality;
  /** Total frete internacional USD */
  totalFreightUsd: number | string;
  /** Total seguro USD */
  totalInsuranceUsd: number | string;
  /** Capatazia USD (para AFRMM, modalidade marítima) */
  totalCapataziaUsd?: number | string;
  /** Taxa Siscomex total BRL (já calculada pela cotação) */
  totalSiscomexBrl?: number | string;
  /** Alíquota AFRMM (0-1, ex: 0.25 = 25%) — apenas marítimo */
  afrmmRate?: number | string;
  /** Alíquota ICMS (0-1, ex: 0.18 = 18%) — estado destino */
  icmsRate?: number | string;
  /** Despesas adicionais BRL por item (opcional) */
  despesasBrl?: number | string;
}

export interface LandedCostEngineResult {
  id: string;
  fobUsd: Decimal;
  freightShareUsd: Decimal;
  insuranceShareUsd: Decimal;
  cifBrl: Decimal;
  iiValue: Decimal;
  ipiValue: Decimal;
  pisValue: Decimal;
  cofinsValue: Decimal;
  siscomexValue: Decimal;
  afrmmValue: Decimal;
  icmsValue: Decimal;
  landedCostTotalBrl: Decimal;
  landedCostUnitBrl: Decimal;
}

export interface TaxRatesInput {
  ii: number | string;
  ipi: number | string;
  pis: number | string;
  cofins: number | string;
}
