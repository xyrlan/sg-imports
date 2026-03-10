import Decimal from 'decimal.js';
import { db } from '@/db';
import { quotes, quoteItems, memberships, productVariants, products, hsCodes } from '@/db/schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import type { ProductSnapshot, ShippingMetadata } from '@/db/types';
import { getOrganizationById } from '@/services/organization.service';
import {
  computeTotalCbm,
  computeWeight,
  getDimensionsForCbm,
  getChargeableWeight,
  getVolumetricWeightAir,
  getVolumetricWeightSeaLCL,
  calculateOptimalFreightProfile,
} from '@/lib/logistics';
import { computeImportTaxes } from '@/lib/import-taxes';

type Quote = InferSelectModel<typeof quotes>;
type QuoteItem = InferSelectModel<typeof quoteItems>;

export type Simulation = Quote;
export type SimulationItem = QuoteItem & {
  variant?: InferSelectModel<typeof productVariants> & { product?: InferSelectModel<typeof products> };
  simulatedProductSnapshot?: ProductSnapshot | null;
};

export interface HsCodeOption {
  id: string;
  code: string;
}

export async function getHsCodesForSimulation(): Promise<HsCodeOption[]> {
  const rows = await db
    .select({ id: hsCodes.id, code: hsCodes.code })
    .from(hsCodes)
    .orderBy(hsCodes.code);
  return rows;
}

export interface GetSimulationsOptions {
  page?: number;
  pageSize?: number;
  orderBy?: 'name' | 'updatedAt' | 'createdAt';
  orderDirection?: 'asc' | 'desc';
}

export interface GetSimulationsResult {
  data: Simulation[];
  paging: {
    totalCount: number;
    page: number;
    pageSize: number;
  };
}

/**
 * Fetch SIMULATION quotes for an organization.
 * Validates that the user has access to the organization (membership check).
 *
 * @param organizationId - Organization UUID
 * @param userId - Profile ID from Supabase Auth
 * @returns Array of SIMULATION quotes or empty array if no access
 */
export async function getSimulationsByOrganization(
  organizationId: string,
  userId: string,
  options: GetSimulationsOptions = {}
): Promise<GetSimulationsResult> {
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.organizationId, organizationId),
      eq(memberships.profileId, userId)
    ),
  });

  if (!membership) {
    return { data: [], paging: { totalCount: 0, page: 1, pageSize: 50 } };
  }

  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 50;
  const orderBy = options.orderBy ?? 'updatedAt';
  const orderDirection = options.orderDirection ?? 'desc';
  const orderFn = orderDirection === 'desc' ? desc : asc;

  const [data, countResult] = await Promise.all([
    db.query.quotes.findMany({
      where: and(
        eq(quotes.organizationId, organizationId),
        eq(quotes.type, 'SIMULATION')
      ),
      orderBy:
        orderBy === 'name'
          ? orderFn(quotes.name)
          : orderBy === 'createdAt'
            ? orderFn(quotes.createdAt)
            : orderFn(quotes.updatedAt),
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(quotes)
      .where(and(eq(quotes.organizationId, organizationId), eq(quotes.type, 'SIMULATION'))),
  ]);

  const totalCount = countResult[0]?.count ?? 0;

  return {
    data,
    paging: { totalCount, page, pageSize },
  };
}

/**
 * Get a single simulation by ID (quote with type SIMULATION).
 * Validates that it belongs to the organization and user has access.
 *
 * @param simulationId - Quote UUID
 * @param organizationId - Organization UUID
 * @param userId - Profile ID from Supabase Auth
 * @returns Simulation with items or null if not found / no access
 */
export async function getSimulationById(
  simulationId: string,
  organizationId: string,
  userId: string
): Promise<{ simulation: Simulation; items: SimulationItem[] } | null> {
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.organizationId, organizationId),
      eq(memberships.profileId, userId)
    ),
  });

  if (!membership) {
    return null;
  }

  const simulation = await db.query.quotes.findFirst({
    where: and(
      eq(quotes.id, simulationId),
      eq(quotes.organizationId, organizationId),
      eq(quotes.type, 'SIMULATION')
    ),
  });

  if (!simulation) {
    return null;
  }

  const items = await db.query.quoteItems.findMany({
    where: eq(quoteItems.quoteId, simulationId),
    with: {
      variant: {
        with: { product: true },
      },
    },
  });

  return {
    simulation,
    items: items as SimulationItem[],
  };
}

export interface CreateSimulationInput {
  organizationId: string;
  userId: string;
  name: string;
  targetDolar?: string | null;
  shippingModality?: 'SEA_LCL' | 'AIR' | 'EXPRESS';
  metadata?: ShippingMetadata | null;
}

export interface UpdateSimulationInput {
  name?: string;
  targetDolar?: string | null;
  shippingModality?: 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'SEA_FCL_PARTIAL' | 'EXPRESS' | null;
  metadata?: ShippingMetadata | null;
}

/**
 * Create a SIMULATION quote for an organization.
 * Any user with org access can create.
 *
 * @param input - organizationId, userId, name
 * @returns Created simulation or null if no permission
 */
export async function createSimulation(
  input: CreateSimulationInput
): Promise<Simulation | null> {
  const orgData = await getOrganizationById(input.organizationId, input.userId);
  if (!orgData) {
    return null;
  }

  const [created] = await db
    .insert(quotes)
    .values({
      organizationId: input.organizationId,
      type: 'SIMULATION',
      status: 'DRAFT',
      name: input.name.trim(),
      targetDolar: (input.targetDolar?.trim() || '0').replace(',', '.'),
      incoterm: 'FOB',
      shippingModality: input.shippingModality ?? 'SEA_LCL',
      metadata: input.metadata ?? null,
    })
    .returning();

  return created ?? null;
}

/**
 * Update simulation (quote) settings.
 */
export async function updateSimulation(
  simulationId: string,
  organizationId: string,
  userId: string,
  input: UpdateSimulationInput
): Promise<Simulation | null> {
  const data = await getSimulationById(simulationId, organizationId, userId);
  if (!data) return null;

  const [updated] = await db
    .update(quotes)
    .set({
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.targetDolar !== undefined && {
        targetDolar: (input.targetDolar?.trim() || '0').replace(',', '.'),
      }),
      ...(input.shippingModality !== undefined && { shippingModality: input.shippingModality }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
      updatedAt: new Date(),
    })
    .where(eq(quotes.id, simulationId))
    .returning();

  return updated ?? null;
}

/**
 * Delete a SIMULATION quote and its items (cascade).
 *
 * @param simulationId - Quote UUID
 * @param organizationId - Organization UUID
 * @param userId - Profile ID from Supabase Auth
 * @returns true if deleted, false if no permission or not found
 */
export async function deleteSimulation(
  simulationId: string,
  organizationId: string,
  userId: string
): Promise<boolean> {
  const data = await getSimulationById(simulationId, organizationId, userId);
  if (!data) {
    return false;
  }

  const deleted = await db
    .delete(quotes)
    .where(eq(quotes.id, simulationId))
    .returning();

  return deleted.length > 0;
}

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

async function recalculateQuoteTotals(quoteId: string): Promise<void> {
  const items = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
  const quote = await db.query.quotes.findFirst({ where: eq(quotes.id, quoteId) });
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

  await db
    .update(quotes)
    .set({
      totalCbm: totalCbm.toFixed(6),
      totalWeight: totalWeight.toFixed(3),
      totalChargeableWeight: totalChargeableWeight.toFixed(3),
      ...(modality !== quote.shippingModality && { shippingModality: modality }),
      ...(maritimeChanged && { metadata }),
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
  const unitPriceUsd = item.priceUsd;
  const lineTotalUsd = new Decimal(unitPriceUsd).times(quantity);

  let cbmSnapshot: Decimal;
  let weightSnapshot: Decimal;
  let taxRates: { ii: string; ipi: string; pis: string; cofins: string };

  if (hasVariant && item.variantId) {
    const variant = await db.query.productVariants.findFirst({
      where: eq(productVariants.id, item.variantId),
      with: { product: true },
    });
    if (!variant?.product) return null;

    const carton = variant.cartonHeight || variant.cartonWidth || variant.cartonLength
      ? {
          heightCm: variant.cartonHeight ?? variant.height ?? 0,
          widthCm: variant.cartonWidth ?? variant.width ?? 0,
          lengthCm: variant.cartonLength ?? variant.length ?? 0,
          weightKg: variant.cartonWeight ?? 0,
          unitsPerCarton: variant.unitsPerCarton ?? 1,
        }
      : null;
    const unit = {
      heightCm: variant.height ?? undefined,
      widthCm: variant.width ?? undefined,
      lengthCm: variant.length ?? undefined,
    };
    const dims = getDimensionsForCbm(carton, unit);
    cbmSnapshot = computeTotalCbm(quantity, dims);
    weightSnapshot = computeWeight(quantity, dims);

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
    const hasDirectCbmWeight =
      (snap.totalCbm != null && snap.totalCbm > 0) ||
      (snap.totalWeight != null && snap.totalWeight > 0);

    if (hasDirectCbmWeight) {
      // totalCbm/totalWeight no snapshot são por unidade; multiplicar por quantity para total da linha
      const perUnitCbm = new Decimal(snap.totalCbm ?? 0);
      const perUnitWeight = new Decimal(snap.totalWeight ?? 0);
      if (perUnitCbm.isZero() && perUnitWeight.gt(0)) {
        cbmSnapshot = perUnitWeight.div(200).times(quantity);
        weightSnapshot = perUnitWeight.times(quantity);
      } else if (perUnitWeight.isZero() && perUnitCbm.gt(0)) {
        cbmSnapshot = perUnitCbm.times(quantity);
        weightSnapshot = perUnitCbm.times(200).times(quantity);
      } else {
        cbmSnapshot = perUnitCbm.times(quantity);
        weightSnapshot = perUnitWeight.times(quantity);
      }
    } else {
      const carton =
        snap.cartonHeight ?? snap.cartonWidth ?? snap.cartonLength
          ? {
              heightCm: snap.cartonHeight ?? snap.height ?? 0,
              widthCm: snap.cartonWidth ?? snap.width ?? 0,
              lengthCm: snap.cartonLength ?? snap.length ?? 0,
              weightKg: snap.cartonWeight ?? 0,
              unitsPerCarton: snap.unitsPerCarton ?? 1,
            }
          : null;
      const unit = {
        heightCm: snap.height ?? undefined,
        widthCm: snap.width ?? undefined,
        lengthCm: snap.length ?? undefined,
      };
      const dims = getDimensionsForCbm(carton, unit);
      cbmSnapshot = computeTotalCbm(quantity, dims);
      weightSnapshot = computeWeight(quantity, dims);
    }

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

  const taxValues = computeImportTaxes(
    lineTotalUsd,
    quantity,
    unitPriceUsd,
    taxRates,
  );

  const [created] = await db
    .insert(quoteItems)
    .values({
      quoteId: simulationId,
      variantId: item.variantId ?? null,
      simulatedProductSnapshot: item.simulatedProductSnapshot ?? null,
      quantity,
      priceUsd: item.priceUsd,
      unitPriceUsdSnapshot: unitPriceUsd,
      weightSnapshot: weightSnapshot.toFixed(3),
      cbmSnapshot: cbmSnapshot.toFixed(6),
      iiRateSnapshot: taxRates.ii,
      ipiRateSnapshot: taxRates.ipi,
      pisRateSnapshot: taxRates.pis,
      cofinsRateSnapshot: taxRates.cofins,
      iiValueSnapshot: taxValues.ii.toFixed(4),
      ipiValueSnapshot: taxValues.ipi.toFixed(4),
      pisValueSnapshot: taxValues.pis.toFixed(4),
      cofinsValueSnapshot: taxValues.cofins.toFixed(4),
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

  if (!item || !item.quote || item.quote.type !== 'SIMULATION' || item.quote.organizationId !== organizationId) {
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

  if (!item || !item.quote || item.quote.type !== 'SIMULATION' || item.quote.organizationId !== organizationId) {
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
    let cbmSnapshot: Decimal;
    let weightSnapshot: Decimal;

    if (item.variantId) {
      const variant = await db.query.productVariants.findFirst({
        where: eq(productVariants.id, item.variantId),
        with: { product: true },
      });
      if (variant?.product) {
        const carton =
          variant.cartonHeight || variant.cartonWidth || variant.cartonLength
            ? {
                heightCm: variant.cartonHeight ?? variant.height ?? 0,
                widthCm: variant.cartonWidth ?? variant.width ?? 0,
                lengthCm: variant.cartonLength ?? variant.length ?? 0,
                weightKg: variant.cartonWeight ?? 0,
                unitsPerCarton: variant.unitsPerCarton ?? 1,
              }
            : null;
        const unit = {
          heightCm: variant.height ?? undefined,
          widthCm: variant.width ?? undefined,
          lengthCm: variant.length ?? undefined,
        };
        const dims = getDimensionsForCbm(carton, unit);
        cbmSnapshot = computeTotalCbm(quantity, dims);
        weightSnapshot = computeWeight(quantity, dims);
        values.weightSnapshot = weightSnapshot.toFixed(3);
        values.cbmSnapshot = cbmSnapshot.toFixed(6);
      }
    } else if (snap) {
      const hasDirectCbmWeight =
        (snap.totalCbm != null && snap.totalCbm > 0) ||
        (snap.totalWeight != null && snap.totalWeight > 0);

      if (hasDirectCbmWeight) {
        // totalCbm/totalWeight no snapshot são por unidade; multiplicar por quantity para total da linha
        const perUnitCbm = new Decimal(snap.totalCbm ?? 0);
        const perUnitWeight = new Decimal(snap.totalWeight ?? 0);
        if (perUnitCbm.isZero() && perUnitWeight.gt(0)) {
          cbmSnapshot = perUnitWeight.div(200).times(quantity);
          weightSnapshot = perUnitWeight.times(quantity);
        } else if (perUnitWeight.isZero() && perUnitCbm.gt(0)) {
          cbmSnapshot = perUnitCbm.times(quantity);
          weightSnapshot = perUnitCbm.times(200).times(quantity);
        } else {
          cbmSnapshot = perUnitCbm.times(quantity);
          weightSnapshot = perUnitWeight.times(quantity);
        }
      } else {
        const carton =
          snap.cartonHeight ?? snap.cartonWidth ?? snap.cartonLength
            ? {
                heightCm: snap.cartonHeight ?? snap.height ?? 0,
                widthCm: snap.cartonWidth ?? snap.width ?? 0,
                lengthCm: snap.cartonLength ?? snap.length ?? 0,
                weightKg: snap.cartonWeight ?? 0,
                unitsPerCarton: snap.unitsPerCarton ?? 1,
              }
            : null;
        const unit = {
          heightCm: snap.height ?? undefined,
          widthCm: snap.width ?? undefined,
          lengthCm: snap.length ?? undefined,
        };
        const dims = getDimensionsForCbm(carton, unit);
        cbmSnapshot = computeTotalCbm(quantity, dims);
        weightSnapshot = computeWeight(quantity, dims);
      }
      values.weightSnapshot = weightSnapshot.toFixed(3);
      values.cbmSnapshot = cbmSnapshot.toFixed(6);
    }
  }

  if (updates.priceUsd !== undefined) {
    values.unitPriceUsdSnapshot = newPriceUsd;
  }

  if (needsTaxRecalc) {
    const quantity = newQuantity;
    const unitPriceUsd = newPriceUsd;
    const lineTotal = new Decimal(unitPriceUsd).times(quantity);
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
    const taxValues = computeImportTaxes(lineTotal, quantity, unitPriceUsd, rates);
    values.iiValueSnapshot = taxValues.ii.toFixed(4);
    values.ipiValueSnapshot = taxValues.ipi.toFixed(4);
    values.pisValueSnapshot = taxValues.pis.toFixed(4);
    values.cofinsValueSnapshot = taxValues.cofins.toFixed(4);
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
 * totalFreightUsd vem do metadata; totalInsuranceUsd é calculado via INTL_INSURANCE.
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
  const totalFreightUsd = metadata.totalFreightUsd ?? 0;

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
