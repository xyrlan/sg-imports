/**
 * Simulation Domain Service — Integração Drizzle + LandedCostEngine
 * Busca dados, executa engine, persiste snapshots em transação.
 */

import Decimal from 'decimal.js';
import { db } from '@/db';
import {
  quotes,
  quoteItems,
  memberships,
  organizations,
  hsCodes,
  stateIcmsRates,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { ShippingMetadata } from '@/db/types';
import { getSiscomexFeeConfig, getGlobalPlatformRates } from '@/services/admin/config.service';
import { runLandedCostEngine } from '../engine/landed-cost-engine';
import type { LandedCostEngineItemInput, LandedCostEngineContext } from '../engine/types';

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
] as const;

export interface CalculateAndPersistResult {
  success: boolean;
  errors?: string[];
}

/**
 * Calcula o total da taxa Siscomex com base no número de NCMs únicos.
 * registrationValue + additions (1-10) + additions11To20 + additions21To50 + additions51AndAbove
 */
function computeTotalSiscomexBrl(
  uniqueNcmCount: number,
  config: {
    registrationValue: string;
    additions: string[] | null;
    additions11To20: string;
    additions21To50: string;
    additions51AndAbove: string;
  },
): Decimal {
  const reg = new Decimal(config.registrationValue ?? 0);
  const additions = config.additions ?? [];
  const add11 = new Decimal(config.additions11To20 ?? 0);
  const add21 = new Decimal(config.additions21To50 ?? 0);
  const add51 = new Decimal(config.additions51AndAbove ?? 0);

  let total = reg;

  for (let i = 0; i < Math.min(uniqueNcmCount, 10); i++) {
    total = total.plus(new Decimal(additions[i] ?? 0));
  }
  if (uniqueNcmCount > 10) {
    const n11to20 = Math.min(uniqueNcmCount, 20) - 10;
    total = total.plus(add11.times(n11to20));
  }
  if (uniqueNcmCount > 20) {
    const n21to50 = Math.min(uniqueNcmCount, 50) - 20;
    total = total.plus(add21.times(n21to50));
  }
  if (uniqueNcmCount > 50) {
    total = total.plus(add51.times(uniqueNcmCount - 50));
  }

  return total;
}

/**
 * Calcula e persiste os impostos (Landed Cost) na cotação.
 */
export async function calculateAndPersistLandedCost(
  quoteId: string,
  organizationId: string,
  userId: string,
): Promise<CalculateAndPersistResult> {
  const errors: string[] = [];

  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.organizationId, organizationId),
      eq(memberships.profileId, userId),
    ),
  });

  if (!membership) {
    return { success: false, errors: ['Acesso negado à organização'] };
  }

  const simulation = await db.query.quotes.findFirst({
    where: and(
      eq(quotes.id, quoteId),
      eq(quotes.organizationId, organizationId),
      eq(quotes.type, 'SIMULATION'),
    ),
  });

  if (!simulation) {
    return { success: false, errors: ['Simulação não encontrada'] };
  }

  const items = await db.query.quoteItems.findMany({
    where: eq(quoteItems.quoteId, quoteId),
    with: {
      variant: {
        with: { product: { with: { hsCode: true } } },
      },
    },
  });

  if (items.length === 0) {
    return { success: false, errors: ['Nenhum item na simulação'] };
  }

  const targetDolar = Number(simulation.targetDolar ?? 0);
  if (targetDolar <= 0) {
    return { success: false, errors: ['Taxa de câmbio (dólar alvo) é obrigatória'] };
  }

  const shippingModality = simulation.shippingModality;
  if (!shippingModality) {
    return { success: false, errors: ['Modalidade de frete é obrigatória'] };
  }

  const metadata = (simulation.metadata as ShippingMetadata | null) ?? {};
  const totalFreightUsd = metadata.totalFreightUsd ?? 0;
  const destinationState = metadata.destinationState;

  const uniqueNcms = new Set<string>();
  const engineInputs: LandedCostEngineItemInput[] = [];

  for (const item of items) {
    let ncmCode = '';
    let iiRate = '0';
    let ipiRate = '0';
    let pisRate = '0';
    let cofinsRate = '0';

    if (item.variantId && item.variant?.product) {
      const product = item.variant.product;
      const hsCode = product.hsCode;
      if (hsCode) {
        ncmCode = hsCode.code;
        iiRate = String(hsCode.ii ?? 0);
        ipiRate = String(hsCode.ipi ?? 0);
        pisRate = String(hsCode.pis ?? 0);
        cofinsRate = String(hsCode.cofins ?? 0);
      } else {
        errors.push(`Produto "${product.name}" sem NCM cadastrado`);
      }
    } else if (item.simulatedProductSnapshot) {
      const snap = item.simulatedProductSnapshot;
      ncmCode = snap.hsCode ?? '';
      const tax = snap.taxSnapshot;
      if (tax) {
        iiRate = String(tax.ii ?? 0);
        ipiRate = String(tax.ipi ?? 0);
        pisRate = String(tax.pis ?? 0);
        cofinsRate = String(tax.cofins ?? 0);
      }
    }

    if (ncmCode) uniqueNcms.add(ncmCode);

    const priceUsd = item.priceUsd ?? '0';
    const quantity = item.quantity;
    const fobUsd = Number(priceUsd) * quantity;

    engineInputs.push({
      id: item.id,
      priceUsd,
      quantity,
      weightSnapshot: item.weightSnapshot ?? '0',
      fobUsd,
      iiRate,
      ipiRate,
      pisRate,
      cofinsRate,
    });
  }

  const siscomexConfig = await getSiscomexFeeConfig();
  const totalSiscomexBrl = siscomexConfig
    ? computeTotalSiscomexBrl(uniqueNcms.size, {
        registrationValue: siscomexConfig.registrationValue ?? '0',
        additions: siscomexConfig.additions,
        additions11To20: siscomexConfig.additions11To20 ?? '0',
        additions21To50: siscomexConfig.additions21To50 ?? '0',
        additions51AndAbove: siscomexConfig.additions51AndAbove ?? '0',
      })
    : new Decimal(0);

  const platformRates = await getGlobalPlatformRates();
  const afrmmRateRow = platformRates.find((r) => r.rateType === 'AFRMM');
  const afrmmRate = afrmmRateRow?.unit === 'PERCENT'
    ? Number(afrmmRateRow.value ?? 0)
    : 0;

  const totalFobUsd = engineInputs.reduce(
    (sum, i) => sum + Number(i.fobUsd ?? Number(i.priceUsd) * i.quantity),
    0,
  );
  const insuranceRateRow = platformRates.find((r) => r.rateType === 'INTL_INSURANCE');
  const insuranceRatePct = insuranceRateRow?.unit === 'PERCENT'
    ? Number(insuranceRateRow.value ?? 0) / 100
    : 0;
  const totalInsuranceUsd =
    insuranceRatePct > 0 && insuranceRatePct < 1
      ? ((totalFobUsd + totalFreightUsd) * insuranceRatePct) / (1 - insuranceRatePct)
      : 0;

  let icmsRate = 0;
  let stateForIcms = destinationState;

  if (!stateForIcms) {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
      with: { deliveryAddress: true },
    });
    stateForIcms = org?.deliveryAddress?.state ?? undefined;
  }

  if (stateForIcms && BRAZILIAN_STATES.includes(stateForIcms as (typeof BRAZILIAN_STATES)[number])) {
    const [icmsRow] = await db
      .select()
      .from(stateIcmsRates)
      .where(
        and(
          eq(stateIcmsRates.state, stateForIcms),
          eq(stateIcmsRates.difal, 'INSIDE'),
        ),
      );
    icmsRate = icmsRow ? Number(icmsRow.icmsRate ?? 0) : 0;
    if (!icmsRow) {
      errors.push(`Alíquota de ICMS não configurada para ${stateForIcms}`);
    }
  }

  const context: LandedCostEngineContext = {
    targetDolar,
    exchangeRateIof: simulation.exchangeRateIof ?? 0,
    shippingModality,
    totalFreightUsd,
    totalInsuranceUsd,
    totalSiscomexBrl: totalSiscomexBrl.toNumber(),
    afrmmRate: afrmmRate > 0 ? afrmmRate : undefined,
    icmsRate: icmsRate > 0 ? icmsRate : undefined,
  };

  const results = runLandedCostEngine(context, engineInputs);

  await db.transaction(async (tx) => {
    for (const r of results) {
      await tx
        .update(quoteItems)
        .set({
          iiValueSnapshot: r.iiValue.toFixed(4),
          ipiValueSnapshot: r.ipiValue.toFixed(4),
          pisValueSnapshot: r.pisValue.toFixed(4),
          cofinsValueSnapshot: r.cofinsValue.toFixed(4),
          siscomexValueSnapshot: r.siscomexValue.toFixed(4),
          afrmmValueSnapshot: r.afrmmValue.toFixed(4),
          icmsRateSnapshot: icmsRate.toFixed(2),
          icmsValueSnapshot: r.icmsValue.toFixed(4),
          landedCostTotalSnapshot: r.landedCostTotalBrl.toFixed(4),
          landedCostUnitSnapshot: r.landedCostUnitBrl.toFixed(4),
        })
        .where(eq(quoteItems.id, r.id));
    }
  });

  return {
    success: true,
    ...(errors.length > 0 && { errors }),
  };
}
