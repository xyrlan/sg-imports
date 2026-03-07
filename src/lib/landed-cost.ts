/**
 * Landed Cost (Custo Posto) — Motor de cálculo puro e isolado
 * Framework-agnostic, usa decimal.js para precisão financeira.
 * Regras de negócio: Brasil (II, IPI, PIS, COFINS em cascata; RTS para EXPRESS).
 */

import Decimal from 'decimal.js';

// =============================================================================
// TIPOS
// =============================================================================

export interface LandedCostItemInput {
  id: string;
  priceUsd: string | number;
  quantity: number;
  weightSnapshot: number | string;
  iiRate: number | string;
  ipiRate: number | string;
  pisRate: number | string;
  cofinsRate: number | string;
}

export interface LandedCostQuoteContext {
  targetDolar: number | string;
  exchangeRateIof: number | string;
  shippingModality: 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'SEA_FCL_PARTIAL' | 'EXPRESS';
}

export interface LandedCostItemResult {
  id: string;
  fobUsd: Decimal;
  freightShareUsd: Decimal;
  insuranceShareUsd: Decimal;
  cifBrl: Decimal;
  iiValue: Decimal;
  ipiValue: Decimal;
  pisValue: Decimal;
  cofinsValue: Decimal;
  landedCostTotalBrl: Decimal;
  landedCostUnitBrl: Decimal;
}

export interface TaxRatesInput {
  ii: number | string;
  ipi: number | string;
  pis: number | string;
  cofins: number | string;
}

export interface TaxValuesResult {
  ii: Decimal;
  ipi: Decimal;
  pis: Decimal;
  cofins: Decimal;
}

// =============================================================================
// FUNÇÕES PURAS
// =============================================================================

const DP_INTERMEDIATE = 4;
const DP_DISPLAY = 2;

function toD(v: number | string | Decimal): Decimal {
  return v instanceof Decimal ? v : new Decimal(v);
}

/**
 * Taxa de câmbio efetiva: Dolar Efetivo = target_dolar * (1 + exchange_rate_iof/100)
 * Taxas vêm do banco como percentuais (ex: 0.38).
 */
export function computeEffectiveExchangeRate(
  targetDolar: number | string,
  exchangeRateIof: number | string,
): Decimal {
  const target = toD(targetDolar);
  const iof = toD(exchangeRateIof);
  return target.times(iof.div(100).plus(1)).toDecimalPlaces(DP_INTERMEDIATE);
}

/**
 * FOB = priceUsd * quantity
 */
export function computeFobUsd(priceUsd: number | string, quantity: number): Decimal {
  return toD(priceUsd).times(quantity).toDecimalPlaces(DP_INTERMEDIATE);
}

/**
 * Rateio proporcional ao peso (weight_snapshot).
 * Regra Enterprise: centavos, floor nos N-1 primeiros, último recebe o resto.
 */
export function apportionByWeight(
  totalAmountUsd: number | string,
  items: Array<{ id: string; weight: number | string }>,
): Map<string, Decimal> {
  const total = toD(totalAmountUsd);
  const totalCents = total.times(100).floor();
  const totalWeight = items.reduce((sum, i) => sum.plus(toD(i.weight)), new Decimal(0));

  if (totalWeight.isZero() || items.length === 0) {
    return new Map(items.map((i) => [i.id, new Decimal(0)]));
  }

  const result = new Map<string, Decimal>();
  let allocatedCents = new Decimal(0);

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const weight = toD(item.weight);
    const proportion = weight.div(totalWeight);

    let itemCents: Decimal;
    if (idx < items.length - 1) {
      itemCents = proportion.times(totalCents).floor();
    } else {
      itemCents = totalCents.minus(allocatedCents);
    }

    allocatedCents = allocatedCents.plus(itemCents);
    result.set(item.id, itemCents.div(100).toDecimalPlaces(DP_INTERMEDIATE));
  }

  return result;
}

/**
 * CIF em BRL = (FOB + Frete Rateado + Seguro Rateado) * Dolar Efetivo
 */
export function computeCifBrl(
  fobUsd: Decimal | number | string,
  freightShareUsd: Decimal | number | string,
  insuranceShareUsd: Decimal | number | string,
  effectiveDolar: Decimal | number | string,
): Decimal {
  const cifUsd = toD(fobUsd).plus(toD(freightShareUsd)).plus(toD(insuranceShareUsd));
  return cifUsd.times(toD(effectiveDolar)).toDecimalPlaces(DP_INTERMEDIATE);
}

/**
 * Cascata tributária padrão:
 * II = CIF * (ii/100)
 * Base IPI = CIF + II
 * IPI = Base IPI * (ipi/100)
 * PIS = CIF * (pis/100)
 * COFINS = CIF * (cofins/100)
 * Taxas vêm como percentuais (ex: 11.20).
 */
export function computeTaxesCascade(cifBrl: Decimal | number | string, rates: TaxRatesInput): TaxValuesResult {
  const cif = toD(cifBrl);
  const iiRate = toD(rates.ii ?? 0).div(100);
  const ipiRate = toD(rates.ipi ?? 0).div(100);
  const pisRate = toD(rates.pis ?? 0).div(100);
  const cofinsRate = toD(rates.cofins ?? 0).div(100);

  const ii = cif.times(iiRate).toDecimalPlaces(DP_INTERMEDIATE);
  const baseIpi = cif.plus(ii);
  const ipi = baseIpi.times(ipiRate).toDecimalPlaces(DP_INTERMEDIATE);
  const pis = cif.times(pisRate).toDecimalPlaces(DP_INTERMEDIATE);
  const cofins = cif.times(cofinsRate).toDecimalPlaces(DP_INTERMEDIATE);

  return { ii, ipi, pis, cofins };
}

/**
 * Regime de Tributação Simplificada (RTS) para EXPRESS:
 * II = CIF * 0.60 (60%)
 * IPI = PIS = COFINS = 0
 */
export function computeTaxesRts(cifBrl: Decimal | number | string): TaxValuesResult {
  const cif = toD(cifBrl);
  const ii = cif.times(0.6).toDecimalPlaces(DP_INTERMEDIATE);
  const zero = new Decimal(0);
  return { ii, ipi: zero, pis: zero, cofins: zero };
}

/**
 * Orquestrador principal: rateio -> CIF -> impostos (cascata ou RTS) -> landed cost por item
 */
export function calculateLandedCost(
  context: LandedCostQuoteContext,
  items: LandedCostItemInput[],
  totalFreightUsd: number,
  totalInsuranceUsd: number,
): LandedCostItemResult[] {
  const effectiveDolar = computeEffectiveExchangeRate(context.targetDolar, context.exchangeRateIof ?? 0);
  const isExpress = context.shippingModality === 'EXPRESS';

  const weightItems = items.map((i) => ({
    id: i.id,
    weight: Number(i.weightSnapshot) || 0,
  }));

  const freightShares = apportionByWeight(totalFreightUsd, weightItems);
  const insuranceShares = apportionByWeight(totalInsuranceUsd, weightItems);

  const results: LandedCostItemResult[] = [];

  for (const item of items) {
    const fobUsd = computeFobUsd(item.priceUsd, item.quantity);
    const freightShareUsd = freightShares.get(item.id) ?? new Decimal(0);
    const insuranceShareUsd = insuranceShares.get(item.id) ?? new Decimal(0);

    const cifBrl = computeCifBrl(fobUsd, freightShareUsd, insuranceShareUsd, effectiveDolar);

    const taxes = isExpress
      ? computeTaxesRts(cifBrl)
      : computeTaxesCascade(cifBrl, {
          ii: item.iiRate,
          ipi: item.ipiRate,
          pis: item.pisRate,
          cofins: item.cofinsRate,
        });

    const cifBrlDisplay = cifBrl.toDecimalPlaces(DP_DISPLAY);
    const totalTaxes = taxes.ii.plus(taxes.ipi).plus(taxes.pis).plus(taxes.cofins);
    const landedCostTotalBrl = cifBrlDisplay.plus(totalTaxes).toDecimalPlaces(DP_DISPLAY);
    const landedCostUnitBrl = landedCostTotalBrl.div(item.quantity).toDecimalPlaces(DP_DISPLAY);

    results.push({
      id: item.id,
      fobUsd: fobUsd.toDecimalPlaces(DP_DISPLAY),
      freightShareUsd: freightShareUsd.toDecimalPlaces(DP_DISPLAY),
      insuranceShareUsd: insuranceShareUsd.toDecimalPlaces(DP_DISPLAY),
      cifBrl: cifBrlDisplay,
      iiValue: taxes.ii.toDecimalPlaces(DP_DISPLAY),
      ipiValue: taxes.ipi.toDecimalPlaces(DP_DISPLAY),
      pisValue: taxes.pis.toDecimalPlaces(DP_DISPLAY),
      cofinsValue: taxes.cofins.toDecimalPlaces(DP_DISPLAY),
      landedCostTotalBrl,
      landedCostUnitBrl,
    });
  }

  return results;
}
