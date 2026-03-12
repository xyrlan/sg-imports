/**
 * Landed Cost Engine — Rateio (Apportionment)
 * Proporcional ao peso (chargeable weight) ou ao valor FOB.
 * Usa decimal.js e ROUND_HALF_UP para evitar síndrome do 1 centavo.
 */

import Decimal from 'decimal.js';

const DP = 4;

function toD(v: number | string | Decimal): Decimal {
  return v instanceof Decimal ? v : new Decimal(v);
}

/**
 * Rateio proporcional ao peso (chargeable weight).
 * Regra: floor nos N-1 primeiros, último recebe o resto (evita centavos perdidos).
 */
export function apportionByWeight(
  totalAmountUsd: number | string,
  items: Array<{ id: string; weight: number | string }>,
): Map<string, Decimal> {
  const total = toD(totalAmountUsd);
  const totalCents = total.times(100).floor();
  const totalWeight = items.reduce(
    (sum, i) => sum.plus(toD(i.weight)),
    new Decimal(0),
  );

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
    result.set(
      item.id,
      itemCents.div(100).toDecimalPlaces(DP, Decimal.ROUND_HALF_UP),
    );
  }

  return result;
}

/**
 * Rateio proporcional ao valor FOB de cada item.
 * Usado para Siscomex.
 */
export function apportionByFob(
  totalAmountBrl: number | string,
  items: Array<{ id: string; fobUsd: number | string }>,
  effectiveDolar: number | string,
): Map<string, Decimal> {
  const total = toD(totalAmountBrl);
  const effDolar = toD(effectiveDolar);
  const totalFobBrl = items.reduce(
    (sum, i) => sum.plus(toD(i.fobUsd).times(effDolar)),
    new Decimal(0),
  );

  if (totalFobBrl.isZero() || items.length === 0) {
    return new Map(items.map((i) => [i.id, new Decimal(0)]));
  }

  const result = new Map<string, Decimal>();
  let allocatedCents = new Decimal(0);
  const totalCents = total.times(100).floor();

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const fobBrl = toD(item.fobUsd).times(effDolar);
    const proportion = fobBrl.div(totalFobBrl);

    let itemCents: Decimal;
    if (idx < items.length - 1) {
      itemCents = proportion.times(totalCents).floor();
    } else {
      itemCents = totalCents.minus(allocatedCents);
    }

    allocatedCents = allocatedCents.plus(itemCents);
    result.set(
      item.id,
      itemCents.div(100).toDecimalPlaces(DP, Decimal.ROUND_HALF_UP),
    );
  }

  return result;
}

/**
 * Rateio proporcional ao valor FOB em USD.
 * Usado para comissão (% sobre FOB).
 */
export function apportionByFobUsd(
  totalAmountUsd: number | string,
  items: Array<{ id: string; fobUsd: number | string }>,
): Map<string, Decimal> {
  const total = toD(totalAmountUsd);
  const totalFobUsd = items.reduce(
    (sum, i) => sum.plus(toD(i.fobUsd)),
    new Decimal(0),
  );

  if (totalFobUsd.isZero() || items.length === 0) {
    return new Map(items.map((i) => [i.id, new Decimal(0)]));
  }

  const result = new Map<string, Decimal>();
  let allocatedCents = new Decimal(0);
  const totalCents = total.times(100).floor();

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const fobUsd = toD(item.fobUsd);
    const proportion = fobUsd.div(totalFobUsd);

    let itemCents: Decimal;
    if (idx < items.length - 1) {
      itemCents = proportion.times(totalCents).floor();
    } else {
      itemCents = totalCents.minus(allocatedCents);
    }

    allocatedCents = allocatedCents.plus(itemCents);
    result.set(
      item.id,
      itemCents.div(100).toDecimalPlaces(DP, Decimal.ROUND_HALF_UP),
    );
  }

  return result;
}
