import Decimal from 'decimal.js';
import { db, type DbTransaction } from '@/db';
import { quotes, quoteItems, productVariants, products, hsCodes } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import type { ProductSnapshot, ShippingMetadata } from '@/db/types';
import { getOrganizationById } from '@/services/organization.service';
import {
  computeItemLogistics,
  getChargeableWeight,
  getVolumetricWeightAir,
  getVolumetricWeightSeaLCL,
  calculateOptimalFreightProfile,
} from '@/lib/logistics';
import { getSimulationById } from '@/services/simulation.service';

type QuoteItem = InferSelectModel<typeof quoteItems>;

export interface AddSimulationItemInput {
  variantId?: string;
  simulatedProductSnapshot?: ProductSnapshot;
  quantity: number;
  priceUsd: string;
}

function equipmentEqual(
  a: { type: string; quantity: number } | null,
  b: { type: string; quantity: number } | null,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.type === b.type && a.quantity === b.quantity;
}

/** Recalculates quote totals (CBM, weight, freight, modality). Accepts optional tx for atomic operations. */
export async function recalculateQuoteTotals(quoteId: string, tx?: DbTransaction): Promise<void> {
  const client = tx ?? db;
  const items = await client.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
  const quote = await client.query.quotes.findFirst({ where: eq(quotes.id, quoteId) });
  if (!quote) return;

  const totalCbm = items.reduce(
    (sum, i) => sum.plus(i.cbmSnapshot ?? '0'),
    new Decimal(0),
  );
  const totalWeight = items.reduce(
    (sum, i) => sum.plus(i.weightSnapshot ?? '0'),
    new Decimal(0),
  );

  let modality = quote.shippingModality;
  let metadata: ShippingMetadata = (quote.metadata as ShippingMetadata | null) ?? {};
  let maritimeChanged = false;

  // Maritime watch: auto-derive LCL vs FCL and equipment from CBM/weight
  if (modality === 'SEA_LCL' || modality === 'SEA_FCL') {
    const profile = calculateOptimalFreightProfile(
      totalCbm.toNumber(),
      totalWeight.toNumber(),
    );
    const newModality = profile.suggestedModality;
    const newEquipment = profile.equipment ?? null;
    const currentEq =
      metadata.equipmentType && metadata.equipmentQuantity != null
        ? { type: metadata.equipmentType, quantity: metadata.equipmentQuantity }
        : null;

    const modalityChanged = newModality !== modality;
    const equipmentChanged = !equipmentEqual(newEquipment, currentEq);

    if (modalityChanged || equipmentChanged) {
      maritimeChanged = true;
      modality = newModality;
      metadata = { ...metadata };
      if (newModality === 'SEA_FCL' && newEquipment) {
        metadata.equipmentType = newEquipment.type;
        metadata.equipmentQuantity = newEquipment.quantity;
      } else {
        delete metadata.equipmentType;
        delete metadata.equipmentQuantity;
      }
    }
  }

  const useVolumetric =
    modality === 'AIR' || modality === 'SEA_LCL' || modality === 'EXPRESS';
  const volumetricWeight = useVolumetric
    ? modality === 'AIR'
      ? getVolumetricWeightAir(totalCbm)
      : getVolumetricWeightSeaLCL(totalCbm)
    : new Decimal(0);
  const totalChargeableWeight = useVolumetric
    ? getChargeableWeight(totalWeight, volumetricWeight)
    : totalWeight;

  // Recalculate freight when modality is set and user has not overridden
  let metadataUpdated = maritimeChanged;
  if (
    !metadata.isOverride &&
    modality &&
    ['AIR', 'SEA_LCL', 'SEA_FCL', 'EXPRESS'].includes(modality)
  ) {
    const { getFreightValueForSimulation } = await import(
      '@/services/admin/international-freights.service'
    );
    const freightResult = await getFreightValueForSimulation({
      shippingModality: modality as 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'EXPRESS',
      containerType: metadata.equipmentType,
      containerQuantity: metadata.equipmentQuantity,
      totalCbm: totalCbm.toNumber(),
      totalWeightKg: totalWeight.toNumber(),
    });
    metadata = {
      ...metadata,
      totalFreightUsd: Math.round(freightResult.value * 100) / 100,
    };
    metadataUpdated = true;
  }

  await client
    .update(quotes)
    .set({
      totalCbm: totalCbm.toFixed(6),
      totalWeight: totalWeight.toFixed(3),
      totalChargeableWeight: totalChargeableWeight.toFixed(3),
      ...(modality !== quote.shippingModality && { shippingModality: modality }),
      ...(metadataUpdated && { metadata }),
    })
    .where(eq(quotes.id, quoteId));
}

/** Zeros quote totals when no items remain. Accepts optional tx for atomic operations. */
export async function zeroQuoteTotals(quoteId: string, tx?: DbTransaction): Promise<void> {
  const client = tx ?? db;
  const metadata: ShippingMetadata = { totalFreightUsd: 0 };
  await client
    .update(quotes)
    .set({
      totalCbm: '0',
      totalWeight: '0',
      totalChargeableWeight: '0',
      metadata,
    })
    .where(eq(quotes.id, quoteId));
}

/**
 * Add an item to a simulation.
 * Either variantId (catalog product) or simulatedProductSnapshot (non-catalog) must be provided.
 * Computes weight_snapshot, cbm_snapshot, tax snapshots, and updates quote totals.
 *
 * @param simulationId - Quote UUID
 * @param organizationId - Organization UUID
 * @param userId - Profile ID from Supabase Auth
 * @param item - Item with variantId OR simulatedProductSnapshot + quantity + priceUsd
 * @returns Created item or null
 */
export async function addSimulationItem(
  simulationId: string,
  organizationId: string,
  userId: string,
  item: AddSimulationItemInput
): Promise<QuoteItem | null> {
  const data = await getSimulationById(simulationId, organizationId, userId);
  if (!data) {
    return null;
  }

  const hasVariant = !!item.variantId;
  const hasSimulated = !!item.simulatedProductSnapshot;
  if (!hasVariant && !hasSimulated) {
    return null;
  }
  if (hasVariant && hasSimulated) {
    return null;
  }

  const quantity = item.quantity;

  let cbmSnapshot: Decimal;
  let weightSnapshot: Decimal;
  let taxRates: { ii: string; ipi: string; pis: string; cofins: string };

  if (hasVariant && item.variantId) {
    const variant = await db.query.productVariants.findFirst({
      where: eq(productVariants.id, item.variantId),
      with: { product: true },
    });
    if (!variant?.product) return null;

    const logistics = computeItemLogistics({
      quantity,
      cartonHeight: variant.cartonHeight,
      cartonWidth: variant.cartonWidth,
      cartonLength: variant.cartonLength,
      cartonWeight: variant.cartonWeight,
      unitsPerCarton: variant.unitsPerCarton,
      height: variant.height,
      width: variant.width,
      length: variant.length,
    });
    cbmSnapshot = logistics.cbmSnapshot;
    weightSnapshot = logistics.weightSnapshot;

    const hsCodeId = variant.product.hsCodeId;
    if (!hsCodeId) {
      taxRates = { ii: '0', ipi: '0', pis: '0', cofins: '0' };
    } else {
      const [hc] = await db.select().from(hsCodes).where(eq(hsCodes.id, hsCodeId));
      taxRates = hc
        ? {
            ii: String(hc.ii ?? 0),
            ipi: String(hc.ipi ?? 0),
            pis: String(hc.pis ?? 0),
            cofins: String(hc.cofins ?? 0),
          }
        : { ii: '0', ipi: '0', pis: '0', cofins: '0' };
    }
  } else if (hasSimulated && item.simulatedProductSnapshot) {
    const snap = item.simulatedProductSnapshot;
    const logistics = computeItemLogistics({
      quantity,
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
    cbmSnapshot = logistics.cbmSnapshot;
    weightSnapshot = logistics.weightSnapshot;

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
        ? {
            ii: String(hc.ii ?? 0),
            ipi: String(hc.ipi ?? 0),
            pis: String(hc.pis ?? 0),
            cofins: String(hc.cofins ?? 0),
          }
        : { ii: '0', ipi: '0', pis: '0', cofins: '0' };
    } else {
      taxRates = { ii: '0', ipi: '0', pis: '0', cofins: '0' };
    }
  } else {
    return null;
  }

  const [created] = await db
    .insert(quoteItems)
    .values({
      quoteId: simulationId,
      variantId: item.variantId ?? null,
      simulatedProductSnapshot: item.simulatedProductSnapshot ?? null,
      quantity,
      priceUsd: item.priceUsd,
      unitPriceUsdSnapshot: item.priceUsd,
      weightSnapshot: weightSnapshot.toFixed(3),
      cbmSnapshot: cbmSnapshot.toFixed(6),
      iiRateSnapshot: taxRates.ii,
      ipiRateSnapshot: taxRates.ipi,
      pisRateSnapshot: taxRates.pis,
      cofinsRateSnapshot: taxRates.cofins,
    })
    .returning();

  await recalculateQuoteTotals(simulationId);
  return created ?? null;
}

/**
 * Remove an item from a simulation.
 *
 * @param itemId - Quote item UUID
 * @param organizationId - Organization UUID
 * @param userId - Profile ID from Supabase Auth
 * @returns true if removed, false if no permission or not found
 */
export async function removeSimulationItem(
  itemId: string,
  organizationId: string,
  userId: string
): Promise<boolean> {
  const item = await db.query.quoteItems.findFirst({
    where: eq(quoteItems.id, itemId),
    with: { quote: true },
  });

  const hasAccess =
    item?.quote &&
    item.quote.type === 'SIMULATION' &&
    (item.quote.sellerOrganizationId === organizationId || item.quote.clientOrganizationId === organizationId);
  if (!hasAccess) {
    return false;
  }

  const orgData = await getOrganizationById(organizationId, userId);
  if (!orgData) {
    return false;
  }

  const quoteId = item.quote.id;
  const deleted = await db
    .delete(quoteItems)
    .where(eq(quoteItems.id, itemId))
    .returning();

  if (deleted.length > 0) {
    await recalculateQuoteTotals(quoteId);
  }
  return deleted.length > 0;
}

export interface UpdateSimulationItemInput {
  quantity?: number;
  priceUsd?: string;
  simulatedProductSnapshot?: ProductSnapshot;
}

/**
 * Update quantity or price of a simulation item.
 *
 * @param itemId - Quote item UUID
 * @param organizationId - Organization UUID
 * @param userId - Profile ID from Supabase Auth
 * @param updates - quantity and/or priceUsd
 * @returns Updated item or null
 */
export async function updateSimulationItem(
  itemId: string,
  organizationId: string,
  userId: string,
  updates: UpdateSimulationItemInput
): Promise<QuoteItem | null> {
  const item = await db.query.quoteItems.findFirst({
    where: eq(quoteItems.id, itemId),
    with: { quote: true },
  });

  const hasAccess =
    item?.quote &&
    item.quote.type === 'SIMULATION' &&
    (item.quote.sellerOrganizationId === organizationId || item.quote.clientOrganizationId === organizationId);
  if (!hasAccess) {
    return null;
  }

  const orgData = await getOrganizationById(organizationId, userId);
  if (!orgData) {
    return null;
  }

  const values: Partial<Record<string, unknown>> = {};
  if (updates.quantity !== undefined) values.quantity = updates.quantity;
  if (updates.priceUsd !== undefined) values.priceUsd = updates.priceUsd;
  if (updates.simulatedProductSnapshot !== undefined) {
    values.simulatedProductSnapshot = updates.simulatedProductSnapshot;
  }

  if (Object.keys(values).length === 0) {
    return item;
  }

  const newQuantity = updates.quantity ?? item.quantity;
  const newPriceUsd = updates.priceUsd ?? item.priceUsd;
  const snap = (updates.simulatedProductSnapshot ?? item.simulatedProductSnapshot) as ProductSnapshot | null;

  const needsLogisticsRecalc =
    updates.quantity !== undefined ||
    updates.simulatedProductSnapshot !== undefined;
  const needsTaxRecalc =
    updates.quantity !== undefined ||
    updates.priceUsd !== undefined ||
    updates.simulatedProductSnapshot !== undefined;

  if (needsLogisticsRecalc && (item.variantId || snap)) {
    const quantity = newQuantity;

    if (item.variantId) {
      const variant = await db.query.productVariants.findFirst({
        where: eq(productVariants.id, item.variantId),
        with: { product: true },
      });
      if (variant?.product) {
        const logistics = computeItemLogistics({
          quantity,
          cartonHeight: variant.cartonHeight,
          cartonWidth: variant.cartonWidth,
          cartonLength: variant.cartonLength,
          cartonWeight: variant.cartonWeight,
          unitsPerCarton: variant.unitsPerCarton,
          height: variant.height,
          width: variant.width,
          length: variant.length,
        });
        values.weightSnapshot = logistics.weightSnapshot.toFixed(3);
        values.cbmSnapshot = logistics.cbmSnapshot.toFixed(6);
      }
    } else if (snap) {
      const logistics = computeItemLogistics({
        quantity,
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
      values.weightSnapshot = logistics.weightSnapshot.toFixed(3);
      values.cbmSnapshot = logistics.cbmSnapshot.toFixed(6);
    }
  }

  if (updates.priceUsd !== undefined) {
    values.unitPriceUsdSnapshot = newPriceUsd;
  }

  if (needsTaxRecalc) {
    let rates: { ii: string; ipi: string; pis: string; cofins: string };

    if (snap?.taxSnapshot) {
      rates = {
        ii: String(snap.taxSnapshot.ii ?? 0),
        ipi: String(snap.taxSnapshot.ipi ?? 0),
        pis: String(snap.taxSnapshot.pis ?? 0),
        cofins: String(snap.taxSnapshot.cofins ?? 0),
      };
    } else if (snap?.hsCode) {
      const [hc] = await db.select().from(hsCodes).where(eq(hsCodes.code, snap.hsCode));
      rates = hc
        ? {
            ii: String(hc.ii ?? 0),
            ipi: String(hc.ipi ?? 0),
            pis: String(hc.pis ?? 0),
            cofins: String(hc.cofins ?? 0),
          }
        : { ii: '0', ipi: '0', pis: '0', cofins: '0' };
    } else {
      rates = {
        ii: String(item.iiRateSnapshot ?? 0),
        ipi: String(item.ipiRateSnapshot ?? 0),
        pis: String(item.pisRateSnapshot ?? 0),
        cofins: String(item.cofinsRateSnapshot ?? 0),
      };
    }
    values.iiRateSnapshot = rates.ii;
    values.ipiRateSnapshot = rates.ipi;
    values.pisRateSnapshot = rates.pis;
    values.cofinsRateSnapshot = rates.cofins;
  }

  const [updated] = await db
    .update(quoteItems)
    .set(values as Record<string, unknown>)
    .where(eq(quoteItems.id, itemId))
    .returning();

  if (updated) {
    await recalculateQuoteTotals(item.quote.id);
  }
  return updated ?? null;
}

export interface QuoteFinancialSummary {
  totalFobUsd: number;
  totalFreightUsd: number;
  totalInsuranceUsd: number;
  totalTaxesBrl: number;
  totalLandedCostBrl: number;
  effectiveDolar: number;
}

/**
 * Agrega os valores dos itens calculados e retorna o breakdown financeiro.
 * totalFreightUsd vem do metadata; se ausente, calcula sob demanda (sem persistir).
 * totalInsuranceUsd é calculado via INTL_INSURANCE.
 */
export async function getQuoteFinancialSummary(
  quoteId: string,
  organizationId: string,
  userId: string,
): Promise<QuoteFinancialSummary | null> {
  const data = await getSimulationById(quoteId, organizationId, userId);
  if (!data) return null;

  const { simulation, items } = data;
  const metadata = (simulation.metadata as ShippingMetadata | null) ?? {};
  let totalFreightUsd = metadata.totalFreightUsd ?? 0;

  // Compute freight on demand when missing (do not overwrite user override)
  if (
    !metadata.isOverride &&
    totalFreightUsd === 0 &&
    simulation.shippingModality &&
    ['AIR', 'SEA_LCL', 'SEA_FCL', 'EXPRESS'].includes(simulation.shippingModality)
  ) {
    const totalCbm =
      items.length > 0
        ? items.reduce((s, i) => s + Number(i.cbmSnapshot ?? 0), 0)
        : Number(simulation.totalCbm ?? 0);
    const totalWeightKg =
      items.length > 0
        ? items.reduce((s, i) => s + Number(i.weightSnapshot ?? 0), 0)
        : Number(simulation.totalWeight ?? 0);
    const { getFreightValueForSimulation } = await import(
      '@/services/admin/international-freights.service'
    );
    const freightResult = await getFreightValueForSimulation({
      shippingModality: simulation.shippingModality as
        | 'AIR'
        | 'SEA_LCL'
        | 'SEA_FCL'
        | 'EXPRESS',
      containerType: metadata.equipmentType,
      containerQuantity: metadata.equipmentQuantity,
      totalCbm,
      totalWeightKg,
    });
    totalFreightUsd = freightResult.value;
  }

  const targetDolar = Number(simulation.targetDolar ?? 0);
  const exchangeRateIof = Number(simulation.exchangeRateIof ?? 0);
  const effectiveDolar =
    targetDolar > 0 ? targetDolar * (1 + exchangeRateIof / 100) : 0;

  let totalFobUsd = 0;
  let totalTaxesBrl = 0;

  for (const i of items) {
    const fob = Number(i.priceUsd ?? 0) * i.quantity;
    totalFobUsd += fob;
    totalTaxesBrl +=
      Number(i.iiValueSnapshot ?? 0) +
      Number(i.ipiValueSnapshot ?? 0) +
      Number(i.pisValueSnapshot ?? 0) +
      Number(i.cofinsValueSnapshot ?? 0) +
      Number(i.siscomexValueSnapshot ?? 0) +
      Number(i.afrmmValueSnapshot ?? 0) +
      Number(i.icmsValueSnapshot ?? 0);
  }

  const { getGlobalPlatformRates } = await import('@/services/admin/config.service');
  const platformRates = await getGlobalPlatformRates();
  const insuranceRateRow = platformRates.find((r) => r.rateType === 'INTL_INSURANCE');
  const insuranceRatePct = insuranceRateRow?.unit === 'PERCENT'
    ? Number(insuranceRateRow.value ?? 0) / 100
    : 0;
  const totalInsuranceUsd =
    insuranceRatePct > 0 && insuranceRatePct < 1
      ? ((totalFobUsd + totalFreightUsd) * insuranceRatePct) / (1 - insuranceRatePct)
      : 0;

  const totalCifBrl =
    (totalFobUsd + totalFreightUsd + totalInsuranceUsd) * effectiveDolar;
  const totalLandedCostBrl = totalCifBrl + totalTaxesBrl;

  return {
    totalFobUsd,
    totalFreightUsd,
    totalInsuranceUsd,
    totalTaxesBrl,
    totalLandedCostBrl,
    effectiveDolar,
  };
}
