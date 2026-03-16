/**
 * Shared helpers for landed cost calculation.
 * Used by simulation-domain.service.ts orchestrators and calculateAndPersistLandedCost.
 */

import Decimal from 'decimal.js';
import { db, type DbTransaction } from '@/db';
import {
  quoteItems,
  hsCodes,
  organizations,
  stateIcmsRates,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { LandedCostEngineItemInput, LandedCostEngineContext } from '../engine/types';
import { getSiscomexFeeConfig, getGlobalPlatformRates } from '@/services/admin/config.service';
import { runLandedCostEngine } from '../engine/landed-cost-engine';
import { BRAZILIAN_STATES } from '@/lib/brazilian-states';

// ==========================================
// SISCOMEX FEE CALCULATION
// ==========================================

/**
 * Calcula o total da taxa Siscomex com base no número de NCMs únicos.
 * registrationValue + additions (1-10) + additions11To20 + additions21To50 + additions51AndAbove
 */
export function computeTotalSiscomexBrl(
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

// ==========================================
// ICMS RESOLUTION
// ==========================================

export async function resolveIcmsRate(
  organizationId: string,
  destinationState: string | undefined,
): Promise<number> {
  let stateForIcms = destinationState;
  if (!stateForIcms) {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
      with: { deliveryAddress: true },
    });
    stateForIcms = org?.deliveryAddress?.state ?? undefined;
  }
  if (!stateForIcms || !BRAZILIAN_STATES.includes(stateForIcms as (typeof BRAZILIAN_STATES)[number])) {
    return 0;
  }
  const [icmsRow] = await db
    .select()
    .from(stateIcmsRates)
    .where(and(eq(stateIcmsRates.state, stateForIcms), eq(stateIcmsRates.difal, 'INSIDE')));
  return icmsRow ? Number(icmsRow.icmsRate ?? 0) : 0;
}

// ==========================================
// ITEM LOADING
// ==========================================

export async function loadItemsForEngine(tx: DbTransaction, quoteId: string) {
  return tx.query.quoteItems.findMany({
    where: eq(quoteItems.quoteId, quoteId),
    with: { variant: { with: { product: { with: { hsCode: true } } } } },
  });
}

// ==========================================
// ENGINE INPUT BUILDING
// ==========================================

export interface BuildEngineInputsOptions {
  items: Awaited<ReturnType<typeof loadItemsForEngine>>;
  tx?: DbTransaction;
  collectErrors?: boolean;
}

export interface EngineInputsResult {
  engineInputs: LandedCostEngineItemInput[];
  uniqueNcms: Set<string>;
  errors: string[];
}

/**
 * Extracts NCM codes and tax rates from items, building engine inputs.
 * Shared by both runEngineAndPersist and calculateAndPersistLandedCost.
 */
export async function buildEngineInputs(
  opts: BuildEngineInputsOptions,
): Promise<EngineInputsResult> {
  const { items, tx, collectErrors = false } = opts;
  const client = tx ?? db;
  const uniqueNcms = new Set<string>();
  const engineInputs: LandedCostEngineItemInput[] = [];
  const errors: string[] = [];

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
      } else if (collectErrors) {
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
      } else if (ncmCode) {
        const [hc] = await client.select().from(hsCodes).where(eq(hsCodes.code, ncmCode));
        if (hc) {
          iiRate = String(hc.ii ?? 0);
          ipiRate = String(hc.ipi ?? 0);
          pisRate = String(hc.pis ?? 0);
          cofinsRate = String(hc.cofins ?? 0);
        }
      }
    }

    if (ncmCode) uniqueNcms.add(ncmCode);
    const priceUsd = item.priceUsd ?? '0';
    const quantity = item.quantity;
    engineInputs.push({
      id: item.id,
      priceUsd,
      quantity,
      weightSnapshot: item.weightSnapshot ?? '0',
      fobUsd: Number(priceUsd) * quantity,
      iiRate,
      ipiRate,
      pisRate,
      cofinsRate,
    });
  }

  return { engineInputs, uniqueNcms, errors };
}

// ==========================================
// ENGINE CONTEXT BUILDING
// ==========================================

export interface BuildEngineContextOptions {
  simulation: { targetDolar: string | null; exchangeRateIof: string | null; shippingModality: string | null; metadata: unknown };
  engineInputs: LandedCostEngineItemInput[];
  uniqueNcms: Set<string>;
  icmsRate: number;
  additionalFreightUsd?: number;
  commissionPercent?: number;
}

export async function buildEngineContext(
  opts: BuildEngineContextOptions,
): Promise<LandedCostEngineContext> {
  const { simulation, engineInputs, uniqueNcms, icmsRate, additionalFreightUsd, commissionPercent } = opts;
  const metadata = (simulation.metadata as { totalFreightUsd?: number; equipmentType?: string; equipmentQuantity?: number } | null) ?? {};
  const totalFreightUsd = metadata.totalFreightUsd ?? 0;

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
  const afrmmRate = afrmmRateRow?.unit === 'PERCENT' ? Number(afrmmRateRow.value ?? 0) : 0;
  const totalFobUsd = engineInputs.reduce((s, i) => s + Number(i.fobUsd ?? Number(i.priceUsd) * i.quantity), 0);
  const effectiveFreightUsd = totalFreightUsd + (additionalFreightUsd ?? 0);
  const insuranceRateRow = platformRates.find((r) => r.rateType === 'INTL_INSURANCE');
  const insuranceRatePct = insuranceRateRow?.unit === 'PERCENT' ? Number(insuranceRateRow.value ?? 0) / 100 : 0;
  const totalInsuranceUsd =
    insuranceRatePct > 0 && insuranceRatePct < 1
      ? ((totalFobUsd + effectiveFreightUsd) * insuranceRatePct) / (1 - insuranceRatePct)
      : 0;

  return {
    targetDolar: Number(simulation.targetDolar ?? 0),
    exchangeRateIof: simulation.exchangeRateIof ?? 0,
    shippingModality: simulation.shippingModality as LandedCostEngineContext['shippingModality'],
    totalFreightUsd,
    ...(additionalFreightUsd != null && additionalFreightUsd > 0 && { additionalFreightUsd }),
    ...(commissionPercent != null && commissionPercent > 0 && { commissionPercent }),
    totalInsuranceUsd,
    totalSiscomexBrl: totalSiscomexBrl.toNumber(),
    afrmmRate: afrmmRate > 0 ? afrmmRate : undefined,
    icmsRate: icmsRate > 0 ? icmsRate : undefined,
  };
}

// ==========================================
// ENGINE EXECUTION & PERSISTENCE
// ==========================================

export async function runAndPersistEngineResults(
  tx: DbTransaction,
  context: LandedCostEngineContext,
  engineInputs: LandedCostEngineItemInput[],
  icmsRate: number,
): Promise<void> {
  const results = runLandedCostEngine(context, engineInputs);
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
}
