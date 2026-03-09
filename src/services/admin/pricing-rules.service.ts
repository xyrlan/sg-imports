/**
 * Admin Pricing Rules Service — CRUD for freight tariff rules (carrier/port/container scope)
 */

import { db } from '@/db';
import { pricingRules, pricingItems, carriers, ports } from '@/db/schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { eq, asc, and, or, lte, gte, isNull, inArray } from 'drizzle-orm';
import type { DbTransaction } from './audit.service';

type DbOrTx = typeof db | DbTransaction;

// ============================================
// Types
// ============================================

export type PricingRule = InferSelectModel<typeof pricingRules>;
export type PricingItem = InferSelectModel<typeof pricingItems>;

export type PortDirection = 'ORIGIN' | 'DESTINATION' | 'BOTH';
export type PricingScope = 'CARRIER' | 'PORT' | 'SPECIFIC';

export interface CarrierSummary {
  id: string;
  name: string;
  scacCode: string | null;
}

export interface PortSummary {
  id: string;
  name: string;
  code: string | null;
}

export interface PricingRuleWithRelations extends PricingRule {
  carrier: CarrierSummary | null;
  port: PortSummary | null;
  items: PricingItem[];
}

export interface CreatePricingRuleData {
  scope: PricingScope;
  carrierId: string;
  portId?: string | null;
  containerType?: 'GP_20' | 'GP_40' | 'HC_40' | 'RF_20' | 'RF_40' | null;
  portDirection?: PortDirection;
  validFrom: Date;
  validTo?: Date | null;
  items: Array<{
    name: string;
    amount: string | number;
    currency: 'BRL' | 'USD' | 'CNY';
    basis: 'PER_BL' | 'PER_CONTAINER';
  }>;
}

export interface UpdatePricingRuleData {
  portDirection?: PortDirection;
  validFrom?: Date;
  validTo?: Date | null;
  items?: Array<{
    name: string;
    amount: string | number;
    currency: 'BRL' | 'USD' | 'CNY';
    basis: 'PER_BL' | 'PER_CONTAINER';
  }>;
}

export interface ResolvedPricingItem {
  name: string;
  amount: number;
  currency: 'BRL' | 'USD' | 'CNY';
  basis: string;
  source: 'CARRIER' | 'PORT' | 'SPECIFIC';
  ruleId: string;
}

export interface ResolutionResult {
  effectiveFees: ResolvedPricingItem[];
  carrierRule: PricingRuleWithRelations | null;
  portRule: PricingRuleWithRelations | null;
  specificRule: PricingRuleWithRelations | null;
}

// ============================================
// Queries
// ============================================

export async function getAllPricingRules(): Promise<PricingRuleWithRelations[]> {
  const rules = await db
    .select()
    .from(pricingRules)
    .orderBy(asc(pricingRules.validFrom));

  const carrierRows = await db.select().from(carriers);
  const carrierMap = new Map(carrierRows.map((c) => [c.id, { id: c.id, name: c.name, scacCode: c.scacCode }]));

  const portIds = [...new Set(rules.map((r) => r.portId).filter(Boolean))] as string[];
  const allPorts = portIds.length > 0 ? await db.select().from(ports).where(inArray(ports.id, portIds)) : [];
  const portMap = new Map(allPorts.map((p) => [p.id, { id: p.id, name: p.name, code: p.code }]));

  const ruleIds = rules.map((r) => r.id);
  const itemsRows =
    ruleIds.length > 0
      ? await db.select().from(pricingItems).where(inArray(pricingItems.pricingRuleId, ruleIds))
      : [];

  const itemsByRule = new Map<string, PricingItem[]>();
  for (const item of itemsRows) {
    if (item.pricingRuleId) {
      const list = itemsByRule.get(item.pricingRuleId) ?? [];
      list.push(item);
      itemsByRule.set(item.pricingRuleId, list);
    }
  }

  return rules.map((rule) => ({
    ...rule,
    carrier: rule.carrierId ? carrierMap.get(rule.carrierId) ?? null : null,
    port: rule.portId ? portMap.get(rule.portId) ?? null : null,
    items: itemsByRule.get(rule.id) ?? [],
  }));
}

// ============================================
// Mutations
// ============================================

async function execCreatePricingRule(tx: DbOrTx, data: CreatePricingRuleData): Promise<PricingRule> {
  const [rule] = await tx
    .insert(pricingRules)
    .values({
      carrierId: data.carrierId,
      portId: data.scope === 'CARRIER' ? null : data.portId ?? null,
      containerType: data.scope === 'SPECIFIC' ? data.containerType ?? null : null,
      portDirection: data.portDirection ?? 'BOTH',
      scope: data.scope,
      validFrom: data.validFrom,
      validTo: data.validTo ?? null,
    } as InferInsertModel<typeof pricingRules>)
    .returning();

  if (!rule) throw new Error('Failed to create pricing rule');

  if (data.items.length > 0) {
    await tx.insert(pricingItems).values(
      data.items.map((item) => ({
        pricingRuleId: rule.id,
        name: item.name,
        amount: String(typeof item.amount === 'number' ? item.amount : parseFloat(item.amount)),
        currency: item.currency,
        basis: item.basis,
      })),
    );
  }

  return rule;
}

export async function createPricingRule(
  data: CreatePricingRuleData,
  client?: DbOrTx,
): Promise<PricingRule> {
  if (client) {
    return execCreatePricingRule(client, data);
  }
  return db.transaction((tx) => execCreatePricingRule(tx, data));
}

async function execUpdatePricingRule(
  tx: DbOrTx,
  id: string,
  data: UpdatePricingRuleData,
): Promise<PricingRule | null> {
  const updateData: Partial<InferInsertModel<typeof pricingRules>> = {};
  if (data.portDirection !== undefined) updateData.portDirection = data.portDirection;
  if (data.validFrom !== undefined) updateData.validFrom = data.validFrom;
  if (data.validTo !== undefined) updateData.validTo = data.validTo;

  const [updated] = await tx
    .update(pricingRules)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(pricingRules.id, id))
    .returning();

  if (!updated) return null;

  if (data.items !== undefined) {
    await tx.delete(pricingItems).where(eq(pricingItems.pricingRuleId, id));
    if (data.items.length > 0) {
      await tx.insert(pricingItems).values(
        data.items.map((item) => ({
          pricingRuleId: id,
          name: item.name,
          amount: String(typeof item.amount === 'number' ? item.amount : parseFloat(String(item.amount))),
          currency: item.currency,
          basis: item.basis,
        })),
      );
    }
  }

  return updated;
}

export async function updatePricingRule(
  id: string,
  data: UpdatePricingRuleData,
  client?: DbOrTx,
): Promise<PricingRule | null> {
  if (client) {
    return execUpdatePricingRule(client, id, data);
  }
  return db.transaction((tx) => execUpdatePricingRule(tx, id, data));
}

export async function deletePricingRule(id: string, client: DbOrTx = db): Promise<boolean> {
  const deleted = await client.delete(pricingRules).where(eq(pricingRules.id, id)).returning();
  return deleted.length > 0;
}

// ============================================
// Resolve Effective Pricing
// ============================================

/** Matches rule's portDirection to the requested direction (ORIGIN, DESTINATION, or BOTH applies to both) */
function directionMatches(ruleDirection: PortDirection, requestedDirection: PortDirection): boolean {
  if (ruleDirection === 'BOTH') return true;
  return ruleDirection === requestedDirection;
}

export async function resolveEffectivePricing(
  carrierId: string,
  portId: string,
  containerType: 'GP_20' | 'GP_40' | 'HC_40' | 'RF_20' | 'RF_40',
  direction: PortDirection
): Promise<ResolutionResult> {
  const now = new Date();
  const validDateCondition = or(isNull(pricingRules.validTo), gte(pricingRules.validTo, now));

  const [carrierRules, portRules, specificRules] = await Promise.all([
    db
      .select()
      .from(pricingRules)
      .where(
        and(
          eq(pricingRules.carrierId, carrierId),
          eq(pricingRules.scope, 'CARRIER'),
          lte(pricingRules.validFrom, now),
          validDateCondition
        )
      ),
    db
      .select()
      .from(pricingRules)
      .where(
        and(
          eq(pricingRules.carrierId, carrierId),
          eq(pricingRules.portId, portId),
          eq(pricingRules.scope, 'PORT'),
          lte(pricingRules.validFrom, now),
          validDateCondition
        )
      ),
    db
      .select()
      .from(pricingRules)
      .where(
        and(
          eq(pricingRules.carrierId, carrierId),
          eq(pricingRules.portId, portId),
          eq(pricingRules.containerType, containerType),
          eq(pricingRules.scope, 'SPECIFIC'),
          lte(pricingRules.validFrom, now),
          validDateCondition
        )
      ),
  ]);

  const carrierRule = carrierRules.find((r) => directionMatches(r.portDirection as PortDirection, direction)) ?? null;
  const portRule = portRules.find((r) => directionMatches(r.portDirection as PortDirection, direction)) ?? null;
  const specificRule = specificRules.find((r) => directionMatches(r.portDirection as PortDirection, direction)) ?? null;

  const ruleIds = [carrierRule?.id, portRule?.id, specificRule?.id].filter(Boolean) as string[];
  const itemsRows =
    ruleIds.length > 0
      ? await db.select().from(pricingItems).where(inArray(pricingItems.pricingRuleId, ruleIds))
      : [];

  const itemsByRule = new Map<string, PricingItem[]>();
  for (const item of itemsRows) {
    if (item.pricingRuleId) {
      const list = itemsByRule.get(item.pricingRuleId) ?? [];
      list.push(item);
      itemsByRule.set(item.pricingRuleId, list);
    }
  }

  const carrierMap = new Map<string, CarrierSummary>();
  const portMap = new Map<string, PortSummary>();
  if (carrierRule || portRule || specificRule) {
    const [c] = await db.select().from(carriers).where(eq(carriers.id, carrierId));
    if (c) carrierMap.set(c.id, { id: c.id, name: c.name, scacCode: c.scacCode });
    const [p] = await db.select().from(ports).where(eq(ports.id, portId));
    if (p) portMap.set(p.id, { id: p.id, name: p.name, code: p.code });
  }

  const toRuleWithRelations = (rule: PricingRule | null): PricingRuleWithRelations | null => {
    if (!rule) return null;
    return {
      ...rule,
      carrier: rule.carrierId ? carrierMap.get(rule.carrierId) ?? null : null,
      port: rule.portId ? portMap.get(rule.portId) ?? null : null,
      items: itemsByRule.get(rule.id) ?? [],
    };
  };

  const carrierRuleFull = toRuleWithRelations(carrierRule);
  const portRuleFull = toRuleWithRelations(portRule);
  const specificRuleFull = toRuleWithRelations(specificRule);

  const feeMap = new Map<string, ResolvedPricingItem>();

  if (carrierRuleFull?.items) {
    for (const item of carrierRuleFull.items) {
      feeMap.set(item.name, {
        name: item.name,
        amount: Number(item.amount),
        currency: item.currency as 'BRL' | 'USD' | 'CNY',
        basis: item.basis,
        source: 'CARRIER',
        ruleId: carrierRuleFull.id,
      });
    }
  }

  if (portRuleFull?.items) {
    for (const item of portRuleFull.items) {
      feeMap.set(item.name, {
        name: item.name,
        amount: Number(item.amount),
        currency: item.currency as 'BRL' | 'USD' | 'CNY',
        basis: item.basis,
        source: 'PORT',
        ruleId: portRuleFull.id,
      });
    }
  }

  if (specificRuleFull?.items) {
    for (const item of specificRuleFull.items) {
      feeMap.set(item.name, {
        name: item.name,
        amount: Number(item.amount),
        currency: item.currency as 'BRL' | 'USD' | 'CNY',
        basis: item.basis,
        source: 'SPECIFIC',
        ruleId: specificRuleFull.id,
      });
    }
  }

  const effectiveFees = Array.from(feeMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return {
    effectiveFees,
    carrierRule: carrierRuleFull,
    portRule: portRuleFull,
    specificRule: specificRuleFull,
  };
}
