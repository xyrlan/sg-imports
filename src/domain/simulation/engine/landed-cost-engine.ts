/**
 * Landed Cost Engine — Motor principal (Pipeline)
 * Orquestra: rateio → CIF → cascata tributária (II, IPI, PIS/COFINS, Siscomex, AFRMM, ICMS) → landed cost
 */

import Decimal from 'decimal.js';
import { apportionByWeight, apportionByFob, apportionByFobUsd } from './apportionment';
import {
  computeIiIpiPisCofins,
  computeTaxesRts,
  computeIcmsPorDentro,
} from './tax-cascade';
import type {
  LandedCostEngineItemInput,
  LandedCostEngineContext,
  LandedCostEngineResult,
} from './types';

const DP_DISPLAY = 2;
const DP_INTERMEDIATE = 4;

function toD(v: number | string | Decimal): Decimal {
  return v instanceof Decimal ? v : new Decimal(v);
}

function round2(d: Decimal): Decimal {
  return d.toDecimalPlaces(DP_DISPLAY, Decimal.ROUND_HALF_UP);
}

/**
 * Taxa de câmbio efetiva: target_dolar * (1 + exchange_rate_iof/100)
 */
function computeEffectiveExchangeRate(
  targetDolar: number | string,
  exchangeRateIof: number | string,
): Decimal {
  const target = toD(targetDolar);
  const iof = toD(exchangeRateIof ?? 0);
  return target.times(iof.div(100).plus(1)).toDecimalPlaces(DP_INTERMEDIATE);
}

/**
 * FOB USD = priceUsd * quantity
 */
function computeFobUsd(
  priceUsd: number | string,
  quantity: number,
): Decimal {
  return toD(priceUsd).times(quantity).toDecimalPlaces(DP_INTERMEDIATE);
}

/**
 * CIF BRL = (FOB + Frete Rateado + Seguro Rateado + Comissão Rateada) * Dolar Efetivo
 */
function computeCifBrl(
  fobUsd: Decimal,
  freightShareUsd: Decimal,
  insuranceShareUsd: Decimal,
  commissionShareUsd: Decimal,
  effectiveDolar: Decimal,
): Decimal {
  const cifUsd = fobUsd
    .plus(freightShareUsd)
    .plus(insuranceShareUsd)
    .plus(commissionShareUsd);
  return cifUsd.times(effectiveDolar).toDecimalPlaces(DP_INTERMEDIATE);
}

const MARITIME_MODALITIES = ['SEA_FCL', 'SEA_FCL_PARTIAL', 'SEA_LCL'] as const;

function isMaritime(
  modality: LandedCostEngineContext['shippingModality'],
): boolean {
  return MARITIME_MODALITIES.includes(modality as (typeof MARITIME_MODALITIES)[number]);
}

/**
 * Executa o pipeline completo de Landed Cost.
 */
export function runLandedCostEngine(
  context: LandedCostEngineContext,
  items: LandedCostEngineItemInput[],
): LandedCostEngineResult[] {
  const effectiveDolar = computeEffectiveExchangeRate(
    context.targetDolar,
    context.exchangeRateIof ?? 0,
  );
  const isExpress = context.shippingModality === 'EXPRESS';
  const totalFreightUsd = Number(context.totalFreightUsd ?? 0);
  const additionalFreightUsd = Number(context.additionalFreightUsd ?? 0);
  const effectiveFreightUsd = totalFreightUsd + additionalFreightUsd;
  const totalInsuranceUsd = Number(context.totalInsuranceUsd ?? 0);
  const totalCapataziaUsd = Number(context.totalCapataziaUsd ?? 0);
  const totalSiscomexBrl = toD(context.totalSiscomexBrl ?? 0);
  const afrmmRate = toD(context.afrmmRate ?? 0).div(100);
  const icmsRate = context.icmsRate;
  const despesasBrl = toD(context.despesasBrl ?? 0);
  const commissionPercent = Number(context.commissionPercent ?? 0);

  const weightItems = items.map((i) => ({
    id: i.id,
    weight: Number(i.weightSnapshot) || 0,
  }));

  const fobItems = items.map((i) => ({
    id: i.id,
    fobUsd: i.fobUsd ?? Number(i.priceUsd) * i.quantity,
  }));
  const totalFobUsd = fobItems.reduce(
    (sum, i) => sum + Number(i.fobUsd),
    0,
  );
  const totalCommissionUsd =
    commissionPercent > 0
      ? toD(totalFobUsd).times(commissionPercent).div(100).toNumber()
      : 0;
  const commissionShares =
    totalCommissionUsd > 0
      ? apportionByFobUsd(totalCommissionUsd, fobItems)
      : new Map<string, Decimal>();

  const freightShares = apportionByWeight(effectiveFreightUsd, weightItems);
  const insuranceShares = apportionByWeight(totalInsuranceUsd, weightItems);
  const capataziaShares = totalCapataziaUsd > 0
    ? apportionByWeight(totalCapataziaUsd, weightItems)
    : new Map<string, Decimal>();

  const siscomexShares =
    totalSiscomexBrl.gt(0) && items.length > 0
      ? apportionByFob(totalSiscomexBrl.toNumber(), fobItems, effectiveDolar.toNumber())
      : new Map<string, Decimal>();

  const results: LandedCostEngineResult[] = [];

  for (const item of items) {
    const fobUsd = computeFobUsd(item.priceUsd, item.quantity);
    const freightShareUsd = freightShares.get(item.id) ?? new Decimal(0);
    const insuranceShareUsd = insuranceShares.get(item.id) ?? new Decimal(0);
    const commissionShareUsd = commissionShares.get(item.id) ?? new Decimal(0);
    const capataziaShareUsd = capataziaShares.get(item.id) ?? new Decimal(0);

    const cifBrl = computeCifBrl(
      fobUsd,
      freightShareUsd,
      insuranceShareUsd,
      commissionShareUsd,
      effectiveDolar,
    );

    const { ii, ipi, pis, cofins } = isExpress
      ? computeTaxesRts(cifBrl)
      : computeIiIpiPisCofins(cifBrl, {
          ii: item.iiRate,
          ipi: item.ipiRate,
          pis: item.pisRate,
          cofins: item.cofinsRate,
        });

    const siscomexValue = siscomexShares.get(item.id) ?? new Decimal(0);

    let afrmmValue = new Decimal(0);
    if (isMaritime(context.shippingModality) && afrmmRate.gt(0)) {
      const freightPlusCapataziaBrl = freightShareUsd
        .plus(capataziaShareUsd)
        .times(effectiveDolar);
      afrmmValue = freightPlusCapataziaBrl
        .times(afrmmRate)
        .toDecimalPlaces(DP_DISPLAY, Decimal.ROUND_HALF_UP);
    }

    const baseIcms = cifBrl
      .plus(ii)
      .plus(ipi)
      .plus(pis)
      .plus(cofins)
      .plus(siscomexValue)
      .plus(afrmmValue)
      .plus(despesasBrl);

    const icmsValue =
      icmsRate != null && Number(icmsRate) > 0
        ? computeIcmsPorDentro(baseIcms, icmsRate)
        : new Decimal(0);

    const totalTaxes = ii
      .plus(ipi)
      .plus(pis)
      .plus(cofins)
      .plus(siscomexValue)
      .plus(afrmmValue)
      .plus(icmsValue);

    const landedCostTotalBrl = round2(cifBrl.plus(totalTaxes));
    const landedCostUnitBrl = round2(
      landedCostTotalBrl.div(item.quantity),
    );

    results.push({
      id: item.id,
      fobUsd: fobUsd.toDecimalPlaces(DP_DISPLAY),
      freightShareUsd: freightShareUsd.toDecimalPlaces(DP_DISPLAY),
      insuranceShareUsd: insuranceShareUsd.toDecimalPlaces(DP_DISPLAY),
      cifBrl: cifBrl.toDecimalPlaces(DP_DISPLAY),
      iiValue: ii,
      ipiValue: ipi,
      pisValue: pis,
      cofinsValue: cofins,
      siscomexValue,
      afrmmValue,
      icmsValue,
      landedCostTotalBrl,
      landedCostUnitBrl,
    });
  }

  return results;
}
