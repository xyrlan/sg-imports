/**
 * Simulation Domain Service — Integração Drizzle + LandedCostEngine
 * Busca dados, executa engine, persiste snapshots em transação.
 * Orquestrador atômico: add/update/remove + recalc em db.transaction.
 */

import Decimal from 'decimal.js';
import { db, type DbTransaction } from '@/db';
import {
  quotes,
  quoteItems,
  memberships,
  organizations,
  hsCodes,
  stateIcmsRates,
  productVariants,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { ProductSnapshot, ShippingMetadata } from '@/db/types';
import { getSiscomexFeeConfig, getGlobalPlatformRates } from '@/services/admin/config.service';
import { runLandedCostEngine } from '../engine/landed-cost-engine';
import type { LandedCostEngineItemInput, LandedCostEngineContext } from '../engine/types';
import { BRAZILIAN_STATES } from '@/lib/brazilian-states';
import { computeItemLogistics } from '@/lib/logistics';
import {
  recalculateQuoteTotals,
  zeroQuoteTotals,
  type AddSimulationItemInput,
  type UpdateSimulationItemInput,
} from '@/services/simulation.service';

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

async function runEngineAndPersist(
  tx: DbTransaction,
  simulation: { targetDolar: string | null; exchangeRateIof: string | null; shippingModality: string | null; metadata: unknown },
  items: Awaited<ReturnType<typeof loadItemsForEngine>>,
  icmsRate: number,
): Promise<void> {
  const metadata = (simulation.metadata as ShippingMetadata | null) ?? {};
  const totalFreightUsd = metadata.totalFreightUsd ?? 0;
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
        const [hc] = await tx.select().from(hsCodes).where(eq(hsCodes.code, ncmCode));
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
  const insuranceRateRow = platformRates.find((r) => r.rateType === 'INTL_INSURANCE');
  const insuranceRatePct = insuranceRateRow?.unit === 'PERCENT' ? Number(insuranceRateRow.value ?? 0) / 100 : 0;
  const totalInsuranceUsd =
    insuranceRatePct > 0 && insuranceRatePct < 1
      ? ((totalFobUsd + totalFreightUsd) * insuranceRatePct) / (1 - insuranceRatePct)
      : 0;

  const context: LandedCostEngineContext = {
    targetDolar: Number(simulation.targetDolar ?? 0),
    exchangeRateIof: simulation.exchangeRateIof ?? 0,
    shippingModality: simulation.shippingModality as LandedCostEngineContext['shippingModality'],
    totalFreightUsd,
    totalInsuranceUsd,
    totalSiscomexBrl: totalSiscomexBrl.toNumber(),
    afrmmRate: afrmmRate > 0 ? afrmmRate : undefined,
    icmsRate: icmsRate > 0 ? icmsRate : undefined,
  };

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

async function loadItemsForEngine(tx: DbTransaction, quoteId: string) {
  return tx.query.quoteItems.findMany({
    where: eq(quoteItems.quoteId, quoteId),
    with: { variant: { with: { product: { with: { hsCode: true } } } } },
  });
}

async function resolveIcmsRate(
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

export interface AddSimulationItemAndRecalculateResult {
  success: boolean;
  item?: { id: string };
  errors?: string[];
}

/**
 * Orquestrador: adiciona item e recalcula em transação única.
 * Pipeline em memória, único write — sem computeImportTaxes.
 */
export async function addSimulationItemAndRecalculate(
  simulationId: string,
  organizationId: string,
  userId: string,
  item: AddSimulationItemInput,
): Promise<AddSimulationItemAndRecalculateResult> {
  const hasVariant = !!item.variantId;
  const hasSimulated = !!item.simulatedProductSnapshot;
  if (!hasVariant && !hasSimulated) return { success: false, errors: ['Item inválido'] };
  if (hasVariant && hasSimulated) return { success: false, errors: ['Item inválido'] };

  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.organizationId, organizationId), eq(memberships.profileId, userId)),
  });
  if (!membership) return { success: false, errors: ['Acesso negado à organização'] };

  const simulation = await db.query.quotes.findFirst({
    where: and(eq(quotes.id, simulationId), eq(quotes.organizationId, organizationId), eq(quotes.type, 'SIMULATION')),
  });
  if (!simulation) return { success: false, errors: ['Simulação não encontrada'] };

  const targetDolar = Number(simulation.targetDolar ?? 0);
  if (targetDolar <= 0) return { success: false, errors: ['Taxa de câmbio obrigatória'] };
  if (!simulation.shippingModality) return { success: false, errors: ['Modalidade de frete obrigatória'] };

  let logistics: { cbmSnapshot: Decimal; weightSnapshot: Decimal };
  let taxRates: { ii: string; ipi: string; pis: string; cofins: string };

  if (hasVariant && item.variantId) {
    const variant = await db.query.productVariants.findFirst({
      where: eq(productVariants.id, item.variantId),
      with: { product: true },
    });
    if (!variant?.product) return { success: false, errors: ['Variante não encontrada'] };
    logistics = computeItemLogistics({
      quantity: item.quantity,
      cartonHeight: variant.cartonHeight,
      cartonWidth: variant.cartonWidth,
      cartonLength: variant.cartonLength,
      cartonWeight: variant.cartonWeight,
      unitsPerCarton: variant.unitsPerCarton,
      height: variant.height,
      width: variant.width,
      length: variant.length,
    });
    const hsCodeId = variant.product.hsCodeId;
    if (!hsCodeId) {
      taxRates = { ii: '0', ipi: '0', pis: '0', cofins: '0' };
    } else {
      const [hc] = await db.select().from(hsCodes).where(eq(hsCodes.id, hsCodeId));
      taxRates = hc
        ? { ii: String(hc.ii ?? 0), ipi: String(hc.ipi ?? 0), pis: String(hc.pis ?? 0), cofins: String(hc.cofins ?? 0) }
        : { ii: '0', ipi: '0', pis: '0', cofins: '0' };
    }
  } else if (hasSimulated && item.simulatedProductSnapshot) {
    const snap = item.simulatedProductSnapshot;
    logistics = computeItemLogistics({
      quantity: item.quantity,
      cartonHeight: snap.cartonHeight,
      cartonWidth: snap.cartonWidth,
      cartonLength: snap.cartonLength,
      cartonWeight: snap.cartonWeight,
      unitsPerCarton: snap.unitsPerCarton,
      height: snap.height,
      width: snap.width,
      length: snap.length,
      totalCbm: snap.totalCbm,
      totalWeight: snap.totalWeight,
    });
    if (snap.taxSnapshot) {
      taxRates = {
        ii: String(snap.taxSnapshot.ii ?? 0),
        ipi: String(snap.taxSnapshot.ipi ?? 0),
        pis: String(snap.taxSnapshot.pis ?? 0),
        cofins: String(snap.taxSnapshot.cofins ?? 0),
      };
    } else if (snap.hsCode) {
      const [hc] = await db.select().from(hsCodes).where(eq(hsCodes.code, snap.hsCode));
      taxRates = hc
        ? { ii: String(hc.ii ?? 0), ipi: String(hc.ipi ?? 0), pis: String(hc.pis ?? 0), cofins: String(hc.cofins ?? 0) }
        : { ii: '0', ipi: '0', pis: '0', cofins: '0' };
    } else {
      taxRates = { ii: '0', ipi: '0', pis: '0', cofins: '0' };
    }
  } else {
    return { success: false, errors: ['Item inválido'] };
  }

  const metadata = (simulation.metadata as ShippingMetadata | null) ?? {};
  const icmsRate = await resolveIcmsRate(organizationId, metadata.destinationState);

  const [created] = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(quoteItems)
      .values({
        quoteId: simulationId,
        variantId: item.variantId ?? null,
        simulatedProductSnapshot: (item.simulatedProductSnapshot as ProductSnapshot) ?? null,
        quantity: item.quantity,
        priceUsd: item.priceUsd,
        unitPriceUsdSnapshot: item.priceUsd,
        weightSnapshot: logistics.weightSnapshot.toFixed(3),
        cbmSnapshot: logistics.cbmSnapshot.toFixed(6),
        iiRateSnapshot: taxRates.ii,
        ipiRateSnapshot: taxRates.ipi,
        pisRateSnapshot: taxRates.pis,
        cofinsRateSnapshot: taxRates.cofins,
      })
      .returning();

    await recalculateQuoteTotals(simulationId, tx);
    await tx.update(quotes).set({ isRecalculationNeeded: false }).where(eq(quotes.id, simulationId));

    const items = await loadItemsForEngine(tx, simulationId);
    const updatedSimulation = await tx.query.quotes.findFirst({
      where: eq(quotes.id, simulationId),
    });
    if (!updatedSimulation || items.length === 0) return [inserted];

    await runEngineAndPersist(tx, updatedSimulation, items, icmsRate);
    return [inserted];
  });

  return { success: true, item: created ? { id: created.id } : undefined };
}

export interface UpdateSimulationItemAndRecalculateResult {
  success: boolean;
  item?: { id: string };
  errors?: string[];
}

/**
 * Orquestrador: atualiza item e recalcula em transação única.
 */
export async function updateSimulationItemAndRecalculate(
  itemId: string,
  organizationId: string,
  userId: string,
  updates: UpdateSimulationItemInput,
): Promise<UpdateSimulationItemAndRecalculateResult> {
  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.organizationId, organizationId), eq(memberships.profileId, userId)),
  });
  if (!membership) return { success: false, errors: ['Acesso negado'] };

  const item = await db.query.quoteItems.findFirst({
    where: eq(quoteItems.id, itemId),
    with: { quote: true },
  });
  if (!item || !item.quote || item.quote.type !== 'SIMULATION' || item.quote.organizationId !== organizationId) {
    return { success: false, errors: ['Item não encontrado'] };
  }

  const newQuantity = updates.quantity ?? item.quantity;
  const newPriceUsd = updates.priceUsd ?? item.priceUsd;
  const snap = (updates.simulatedProductSnapshot ?? item.simulatedProductSnapshot) as ProductSnapshot | null;

  const simulation = await db.query.quotes.findFirst({
    where: and(eq(quotes.id, item.quoteId), eq(quotes.type, 'SIMULATION')),
  });
  if (!simulation || !simulation.shippingModality) return { success: false, errors: ['Simulação inválida'] };

  const metadata = (simulation.metadata as ShippingMetadata | null) ?? {};
  const icmsRate = await resolveIcmsRate(organizationId, metadata.destinationState);

  const values: Record<string, unknown> = {};
  if (updates.quantity !== undefined) values.quantity = updates.quantity;
  if (updates.priceUsd !== undefined) values.priceUsd = updates.priceUsd;
  if (updates.simulatedProductSnapshot !== undefined) values.simulatedProductSnapshot = updates.simulatedProductSnapshot;

  const needsLogisticsRecalc = updates.quantity !== undefined || updates.simulatedProductSnapshot !== undefined;

  if (needsLogisticsRecalc && (item.variantId || snap)) {
    let logistics: { cbmSnapshot: Decimal; weightSnapshot: Decimal };
    if (item.variantId) {
      const variant = await db.query.productVariants.findFirst({
        where: eq(productVariants.id, item.variantId),
        with: { product: true },
      });
      if (!variant?.product) return { success: false, errors: ['Variante não encontrada'] };
      logistics = computeItemLogistics({
        quantity: newQuantity,
        cartonHeight: variant.cartonHeight,
        cartonWidth: variant.cartonWidth,
        cartonLength: variant.cartonLength,
        cartonWeight: variant.cartonWeight,
        unitsPerCarton: variant.unitsPerCarton,
        height: variant.height,
        width: variant.width,
        length: variant.length,
      });
    } else if (snap) {
      logistics = computeItemLogistics({
        quantity: newQuantity,
        cartonHeight: snap.cartonHeight,
        cartonWidth: snap.cartonWidth,
        cartonLength: snap.cartonLength,
        cartonWeight: snap.cartonWeight,
        unitsPerCarton: snap.unitsPerCarton,
        height: snap.height,
        width: snap.width,
        length: snap.length,
        totalCbm: snap.totalCbm,
        totalWeight: snap.totalWeight,
      });
    } else {
      return { success: false, errors: ['Item inválido'] };
    }
    values.weightSnapshot = logistics.weightSnapshot.toFixed(3);
    values.cbmSnapshot = logistics.cbmSnapshot.toFixed(6);
  }
  if (updates.priceUsd !== undefined) values.unitPriceUsdSnapshot = newPriceUsd;

  const needsTaxRatesRecalc = updates.simulatedProductSnapshot !== undefined;
  if (needsTaxRatesRecalc && snap) {
    let taxRates: { ii: string; ipi: string; pis: string; cofins: string };
    if (snap.taxSnapshot) {
      taxRates = {
        ii: String(snap.taxSnapshot.ii ?? 0),
        ipi: String(snap.taxSnapshot.ipi ?? 0),
        pis: String(snap.taxSnapshot.pis ?? 0),
        cofins: String(snap.taxSnapshot.cofins ?? 0),
      };
    } else if (snap.hsCode) {
      const [hc] = await db.select().from(hsCodes).where(eq(hsCodes.code, snap.hsCode));
      taxRates = hc
        ? { ii: String(hc.ii ?? 0), ipi: String(hc.ipi ?? 0), pis: String(hc.pis ?? 0), cofins: String(hc.cofins ?? 0) }
        : { ii: '0', ipi: '0', pis: '0', cofins: '0' };
    } else {
      taxRates = { ii: '0', ipi: '0', pis: '0', cofins: '0' };
    }
    values.iiRateSnapshot = taxRates.ii;
    values.ipiRateSnapshot = taxRates.ipi;
    values.pisRateSnapshot = taxRates.pis;
    values.cofinsRateSnapshot = taxRates.cofins;
  }

  const [updated] = await db.transaction(async (tx) => {
    if (Object.keys(values).length > 0) {
      await tx.update(quoteItems).set(values as Record<string, unknown>).where(eq(quoteItems.id, itemId));
    }
    await recalculateQuoteTotals(item.quoteId, tx);
    await tx.update(quotes).set({ isRecalculationNeeded: false }).where(eq(quotes.id, item.quoteId));
    const items = await loadItemsForEngine(tx, item.quoteId);
    const updatedSimulation = await tx.query.quotes.findFirst({ where: eq(quotes.id, item.quoteId) });
    if (!updatedSimulation || items.length === 0) return [item];
    await runEngineAndPersist(tx, updatedSimulation, items, icmsRate);
    const [u] = await tx.select().from(quoteItems).where(eq(quoteItems.id, itemId));
    return u ? [u] : [item];
  });

  return { success: true, item: updated ? { id: updated.id } : undefined };
}

export interface RemoveSimulationItemAndRecalculateResult {
  success: boolean;
  errors?: string[];
}

/**
 * Orquestrador: remove item e recalcula (ou zera quote se último item).
 */
export async function removeSimulationItemAndRecalculate(
  itemId: string,
  organizationId: string,
  userId: string,
): Promise<RemoveSimulationItemAndRecalculateResult> {
  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.organizationId, organizationId), eq(memberships.profileId, userId)),
  });
  if (!membership) return { success: false, errors: ['Acesso negado'] };

  const item = await db.query.quoteItems.findFirst({
    where: eq(quoteItems.id, itemId),
    with: { quote: true },
  });
  if (!item || !item.quote || item.quote.type !== 'SIMULATION' || item.quote.organizationId !== organizationId) {
    return { success: false, errors: ['Item não encontrado'] };
  }

  const quoteId = item.quoteId;

  await db.transaction(async (tx) => {
    await tx.delete(quoteItems).where(eq(quoteItems.id, itemId));
    const remaining = await tx.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
    if (remaining.length === 0) {
      await zeroQuoteTotals(quoteId, tx);
      await tx.update(quotes).set({ isRecalculationNeeded: false }).where(eq(quotes.id, quoteId));
    } else {
      await recalculateQuoteTotals(quoteId, tx);
      const items = await loadItemsForEngine(tx, quoteId);
      const simulation = await tx.query.quotes.findFirst({ where: eq(quotes.id, quoteId) });
      if (simulation && items.length > 0) {
        const metadata = (simulation.metadata as ShippingMetadata | null) ?? {};
        const icmsRate = await resolveIcmsRate(organizationId, metadata.destinationState);
        await runEngineAndPersist(tx, simulation, items, icmsRate);
      }
      await tx.update(quotes).set({ isRecalculationNeeded: false }).where(eq(quotes.id, quoteId));
    }
  });

  return { success: true };
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
      } else if (ncmCode) {
        const [hc] = await db.select().from(hsCodes).where(eq(hsCodes.code, ncmCode));
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
    await tx.update(quotes).set({ isRecalculationNeeded: false }).where(eq(quotes.id, quoteId));
  });

  return {
    success: true,
    ...(errors.length > 0 && { errors }),
  };
}
