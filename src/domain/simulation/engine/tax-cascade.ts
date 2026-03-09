/**
 * Landed Cost Engine — Cascata Tributária
 * Ordem legal: II → IPI → PIS/COFINS (base CIF, sem ICMS) → Siscomex → AFRMM → ICMS "por dentro"
 * Arredondamento: .toDecimalPlaces(2, ROUND_HALF_UP) a cada etapa (evita síndrome do 1 centavo).
 */

import Decimal from 'decimal.js';

const DP = 2;

function toD(v: number | string | Decimal): Decimal {
  return v instanceof Decimal ? v : new Decimal(v);
}

function round2(d: Decimal): Decimal {
  return d.toDecimalPlaces(DP, Decimal.ROUND_HALF_UP);
}

export interface TaxRatesInput {
  ii: number | string;
  ipi: number | string;
  pis: number | string;
  cofins: number | string;
}

export interface TaxCascadeResult {
  ii: Decimal;
  ipi: Decimal;
  pis: Decimal;
  cofins: Decimal;
  siscomex: Decimal;
  afrmm: Decimal;
  icms: Decimal;
}

/**
 * Cascata tributária padrão (não EXPRESS):
 * - II = Base (CIF) × iiRate
 * - IPI = (Base + II) × ipiRate
 * - PIS = Base × pisRate (sem ICMS na base, conforme STF)
 * - COFINS = Base × cofinsRate
 */
export function computeIiIpiPisCofins(
  cifBrl: Decimal | number | string,
  rates: TaxRatesInput,
): { ii: Decimal; ipi: Decimal; pis: Decimal; cofins: Decimal } {
  const base = toD(cifBrl);
  const iiRate = toD(rates.ii ?? 0).div(100);
  const ipiRate = toD(rates.ipi ?? 0).div(100);
  const pisRate = toD(rates.pis ?? 0).div(100);
  const cofinsRate = toD(rates.cofins ?? 0).div(100);

  const ii = round2(base.times(iiRate));
  const baseIpi = base.plus(ii);
  const ipi = round2(baseIpi.times(ipiRate));
  const pis = round2(base.times(pisRate));
  const cofins = round2(base.times(cofinsRate));

  return { ii, ipi, pis, cofins };
}

/**
 * Regime de Tributação Simplificada (RTS) para EXPRESS:
 * II = CIF × 60%, IPI = PIS = COFINS = 0
 */
export function computeTaxesRts(
  cifBrl: Decimal | number | string,
): { ii: Decimal; ipi: Decimal; pis: Decimal; cofins: Decimal } {
  const base = toD(cifBrl);
  const ii = round2(base.times(0.6));
  const zero = new Decimal(0);
  return { ii, ipi: zero, pis: zero, cofins: zero };
}

/**
 * ICMS "por dentro":
 * baseIcms = Base + II + IPI + PIS + COFINS + Siscomex + AFRMM + Despesas
 * icmsValue = baseIcms / (1 - icmsRate) - baseIcms
 */
export function computeIcmsPorDentro(
  baseIcms: Decimal | number | string,
  icmsRate: number | string,
): Decimal {
  const base = toD(baseIcms);
  const rate = toD(icmsRate).div(100);
  if (rate.gte(1)) return new Decimal(0);
  const totalComIcms = base.div(new Decimal(1).minus(rate));
  return round2(totalComIcms.minus(base));
}
