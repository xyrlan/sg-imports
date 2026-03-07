/**
 * Brazilian import tax calculation — cascata (tax on tax)
 * Uses Decimal for precision
 */

import Decimal from 'decimal.js';

export interface TaxRates {
  ii: number | string;
  ipi: number | string;
  pis: number | string;
  cofins: number | string;
}

export interface TaxValues {
  ii: Decimal;
  ipi: Decimal;
  pis: Decimal;
  cofins: Decimal;
}

/**
 * Compute import taxes in cascade:
 * - II: on CIF (Valor Aduaneiro)
 * - IPI: on (CIF + II)
 * - PIS/COFINS: on CIF (simplified; full formula can be more complex)
 *
 * @param cifValueUsd - CIF value in USD (Cost + Insurance + Freight) for the line
 * @param quantity - Item quantity
 * @param unitPriceUsd - Unit price in USD (for reference; CIF may include freight share)
 * @param rates - Tax rates from hs_codes (as decimals, e.g. 0.15 for 15%)
 */
export function computeImportTaxes(
  cifValueUsd: Decimal | number | string,
  quantity: number,
  unitPriceUsd: Decimal | number | string,
  rates: TaxRates,
): TaxValues {
  const cif = typeof cifValueUsd === 'number' || typeof cifValueUsd === 'string'
    ? new Decimal(cifValueUsd)
    : cifValueUsd;

  const iiRate = new Decimal(rates.ii ?? 0);
  const ipiRate = new Decimal(rates.ipi ?? 0);
  const pisRate = new Decimal(rates.pis ?? 0);
  const cofinsRate = new Decimal(rates.cofins ?? 0);

  // II on CIF
  const ii = cif.times(iiRate);

  // IPI on (CIF + II)
  const ipi = cif.plus(ii).times(ipiRate);

  // PIS/COFINS on CIF (simplified)
  const pis = cif.times(pisRate);
  const cofins = cif.times(cofinsRate);

  return { ii, ipi, pis, cofins };
}
