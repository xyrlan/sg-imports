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
  hsCodes,
  productVariants,
} from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import type { ProductSnapshot, ShippingMetadata } from '@/db/types';
import { computeItemLogistics } from '@/lib/logistics';
import {
  recalculateQuoteTotals,
  zeroQuoteTotals,
  type AddSimulationItemInput,
  type UpdateSimulationItemInput,
} from '@/services/simulation.service';
import {
  resolveIcmsRate,
  loadItemsForEngine,
  buildEngineInputs,
  buildEngineContext,
  runAndPersistEngineResults,
} from './landed-cost-helpers';

export interface CalculateAndPersistResult {
  success: boolean;
  errors?: string[];
}

// ==========================================
// INTERNAL: Run engine in transaction context
// ==========================================

async function runEngineAndPersist(
  tx: DbTransaction,
  simulation: { targetDolar: string | null; exchangeRateIof: string | null; shippingModality: string | null; metadata: unknown },
  items: Awaited<ReturnType<typeof loadItemsForEngine>>,
  icmsRate: number,
): Promise<void> {
  const { engineInputs, uniqueNcms } = await buildEngineInputs({ items, tx });
  const context = await buildEngineContext({ simulation, engineInputs, uniqueNcms, icmsRate });
  await runAndPersistEngineResults(tx, context, engineInputs, icmsRate);
}

// ==========================================
// ORCHESTRATORS: Add / Update / Remove + Recalc
// ==========================================

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
    where: and(
      eq(quotes.id, simulationId),
      or(
        eq(quotes.sellerOrganizationId, organizationId),
        eq(quotes.clientOrganizationId, organizationId),
      ),
      eq(quotes.type, 'SIMULATION'),
    ),
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
  const hasAccess =
    item?.quote &&
    item.quote.type === 'SIMULATION' &&
    (item.quote.sellerOrganizationId === organizationId || item.quote.clientOrganizationId === organizationId);
  if (!hasAccess) {
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
  const hasAccess =
    item?.quote &&
    item.quote.type === 'SIMULATION' &&
    (item.quote.sellerOrganizationId === organizationId || item.quote.clientOrganizationId === organizationId);
  if (!hasAccess) {
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

// ==========================================
// FULL LANDED COST CALCULATION
// ==========================================

/**
 * Calcula e persiste os impostos (Landed Cost) na cotação.
 */
export async function calculateAndPersistLandedCost(
  quoteId: string,
  organizationId: string,
  userId: string,
): Promise<CalculateAndPersistResult> {
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
      or(
        eq(quotes.sellerOrganizationId, organizationId),
        eq(quotes.clientOrganizationId, organizationId),
      ),
      eq(quotes.type, 'SIMULATION'),
    ),
  });

  if (!simulation) {
    return { success: false, errors: ['Simulação não encontrada'] };
  }

  const rawItems = await db.query.quoteItems.findMany({
    where: eq(quoteItems.quoteId, quoteId),
    with: {
      variant: {
        with: { product: { with: { hsCode: true } } },
      },
    },
  });

  if (rawItems.length === 0) {
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
  const additionalFreightUsd = metadata.additionalFreightUsd ?? 0;
  const commissionPercent = metadata.commissionPercent ?? 0;
  const destinationState = metadata.destinationState;

  // Build engine inputs with error collection
  const { engineInputs, uniqueNcms, errors } = await buildEngineInputs({
    items: rawItems,
    collectErrors: true,
  });

  // Resolve ICMS rate
  const icmsRate = await resolveIcmsRate(organizationId, destinationState);

  // Check for missing ICMS config
  if (destinationState && icmsRate === 0) {
    const { BRAZILIAN_STATES } = await import('@/lib/brazilian-states');
    if (BRAZILIAN_STATES.includes(destinationState as (typeof BRAZILIAN_STATES)[number])) {
      const { stateIcmsRates } = await import('@/db/schema');
      const [icmsRow] = await db
        .select()
        .from(stateIcmsRates)
        .where(
          and(
            eq(stateIcmsRates.state, destinationState),
            eq(stateIcmsRates.difal, 'INSIDE'),
          ),
        );
      if (!icmsRow) {
        errors.push(`Alíquota de ICMS não configurada para ${destinationState}`);
      }
    }
  }

  // Build engine context with extras
  const context = await buildEngineContext({
    simulation,
    engineInputs,
    uniqueNcms,
    icmsRate,
    additionalFreightUsd: additionalFreightUsd > 0 ? additionalFreightUsd : undefined,
    commissionPercent: commissionPercent > 0 ? commissionPercent : undefined,
  });

  // Run engine and persist in transaction
  await db.transaction(async (tx) => {
    await runAndPersistEngineResults(tx, context, engineInputs, icmsRate);
    await tx.update(quotes).set({ isRecalculationNeeded: false }).where(eq(quotes.id, quoteId));
  });

  return {
    success: true,
    ...(errors.length > 0 && { errors }),
  };
}
