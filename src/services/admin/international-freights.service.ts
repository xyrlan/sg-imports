/**
 * Admin International Freights Service — CRUD for international freight rates
 */

import { db } from '@/db';
import {
  internationalFreights,
  internationalFreightPortsOfLoading,
  internationalFreightPortsOfDischarge,
  carriers,
  ports,
} from '@/db/schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import { and, asc, eq, ne, or, isNull, gte } from 'drizzle-orm';
import type { DbTransaction } from './audit.service';

type DbOrTx = typeof db | DbTransaction;

// ============================================
// Types
// ============================================

export type InternationalFreight = InferSelectModel<typeof internationalFreights>;

export interface PortSummary {
  id: string;
  name: string;
  code: string | null;
}

export interface InternationalFreightWithPorts extends InternationalFreight {
  carrier: { id: string; name: string } | null;
  portsOfLoading: PortSummary[];
  portsOfDischarge: PortSummary[];
}

export type ShippingModalityForFreight = 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'EXPRESS';

export interface CreateInternationalFreightData {
  shippingModality: ShippingModalityForFreight;
  carrierId: string | null;
  containerType: InternationalFreight['containerType'] | null;
  value: string;
  currency?: 'BRL' | 'USD' | 'CNY' | 'EUR';
  freeTimeDays?: number;
  expectedProfit?: string | null;
  validTo?: Date | null;
  portOfLoadingIds: string[];
  portOfDischargeIds: string[];
}

export interface UpdateInternationalFreightData {
  shippingModality?: ShippingModalityForFreight;
  carrierId?: string | null;
  containerType?: InternationalFreight['containerType'] | null;
  value?: string;
  currency?: 'BRL' | 'USD' | 'CNY' | 'EUR';
  freeTimeDays?: number;
  expectedProfit?: string | null;
  validTo?: Date | null;
  portOfLoadingIds?: string[];
  portOfDischargeIds?: string[];
}

// ============================================
// International Freights
// ============================================

export async function getAllInternationalFreights(): Promise<
  InternationalFreightWithPorts[]
> {
  const freights = await db
    .select()
    .from(internationalFreights)
    .orderBy(asc(internationalFreights.createdAt));

  const loadingRows = await db
    .select({
      internationalFreightId: internationalFreightPortsOfLoading.internationalFreightId,
      portId: internationalFreightPortsOfLoading.portId,
      portName: ports.name,
      portCode: ports.code,
    })
    .from(internationalFreightPortsOfLoading)
    .innerJoin(ports, eq(internationalFreightPortsOfLoading.portId, ports.id));

  const dischargeRows = await db
    .select({
      internationalFreightId: internationalFreightPortsOfDischarge.internationalFreightId,
      portId: internationalFreightPortsOfDischarge.portId,
      portName: ports.name,
      portCode: ports.code,
    })
    .from(internationalFreightPortsOfDischarge)
    .innerJoin(ports, eq(internationalFreightPortsOfDischarge.portId, ports.id));

  const carrierRows = await db
    .select({
      id: carriers.id,
      name: carriers.name,
    })
    .from(carriers);

  const carrierMap = new Map(carrierRows.map((c) => [c.id, c]));
  const loadingByFreight = new Map<string, PortSummary[]>();
  const dischargeByFreight = new Map<string, PortSummary[]>();

  for (const row of loadingRows) {
    const list = loadingByFreight.get(row.internationalFreightId) ?? [];
    list.push({
      id: row.portId,
      name: row.portName,
      code: row.portCode,
    });
    loadingByFreight.set(row.internationalFreightId, list);
  }

  for (const row of dischargeRows) {
    const list = dischargeByFreight.get(row.internationalFreightId) ?? [];
    list.push({
      id: row.portId,
      name: row.portName,
      code: row.portCode,
    });
    dischargeByFreight.set(row.internationalFreightId, list);
  }

  return freights.map((f) => ({
    ...f,
    carrier: f.carrierId ? carrierMap.get(f.carrierId) ?? null : null,
    portsOfLoading: loadingByFreight.get(f.id) ?? [],
    portsOfDischarge: dischargeByFreight.get(f.id) ?? [],
  }));
}

export async function getInternationalFreightByCarrierAndContainer(
  carrierId: string,
  containerType: NonNullable<InternationalFreight['containerType']>,
  excludeId?: string,
  client: DbOrTx = db,
): Promise<InternationalFreight | null> {
  const conditions = [
    eq(internationalFreights.carrierId, carrierId),
    eq(internationalFreights.containerType, containerType),
    eq(internationalFreights.shippingModality, 'SEA_FCL'),
  ];
  if (excludeId) {
    conditions.push(ne(internationalFreights.id, excludeId));
  }
  const [row] = await client
    .select()
    .from(internationalFreights)
    .where(and(...conditions))
    .limit(1);
  return row ?? null;
}

export async function getInternationalFreightByCarrier(
  carrierId: string,
  excludeId?: string,
  client: DbOrTx = db,
): Promise<InternationalFreight | null> {
  const conditions = [
    eq(internationalFreights.carrierId, carrierId),
    eq(internationalFreights.shippingModality, 'AIR'),
  ];
  if (excludeId) {
    conditions.push(ne(internationalFreights.id, excludeId));
  }
  const [row] = await client
    .select()
    .from(internationalFreights)
    .where(and(...conditions))
    .limit(1);
  return row ?? null;
}

export async function getInternationalFreightById(
  id: string
): Promise<InternationalFreightWithPorts | null> {
  const [freight] = await db
    .select()
    .from(internationalFreights)
    .where(eq(internationalFreights.id, id));

  if (!freight) return null;

  const loadingRows = await db
    .select({
      portId: ports.id,
      portName: ports.name,
      portCode: ports.code,
    })
    .from(internationalFreightPortsOfLoading)
    .innerJoin(ports, eq(internationalFreightPortsOfLoading.portId, ports.id))
    .where(eq(internationalFreightPortsOfLoading.internationalFreightId, id));

  const dischargeRows = await db
    .select({
      portId: ports.id,
      portName: ports.name,
      portCode: ports.code,
    })
    .from(internationalFreightPortsOfDischarge)
    .innerJoin(ports, eq(internationalFreightPortsOfDischarge.portId, ports.id))
    .where(eq(internationalFreightPortsOfDischarge.internationalFreightId, id));

  let carrier: { id: string; name: string } | null = null;
  if (freight.carrierId) {
    const [c] = await db
      .select({ id: carriers.id, name: carriers.name })
      .from(carriers)
      .where(eq(carriers.id, freight.carrierId));
    carrier = c ?? null;
  }

  return {
    ...freight,
    carrier,
    portsOfLoading: loadingRows.map((r) => ({
      id: r.portId,
      name: r.portName,
      code: r.portCode,
    })),
    portsOfDischarge: dischargeRows.map((r) => ({
      id: r.portId,
      name: r.portName,
      code: r.portCode,
    })),
  };
}

export async function createInternationalFreight(
  data: CreateInternationalFreightData,
  client: DbOrTx = db,
): Promise<InternationalFreight> {
  const [row] = await client
    .insert(internationalFreights)
    .values({
      shippingModality: data.shippingModality,
      carrierId: data.carrierId ?? null,
      containerType: data.containerType ?? null,
      value: data.value,
      currency: data.currency ?? 'USD',
      freeTimeDays: data.freeTimeDays ?? 0,
      expectedProfit: data.expectedProfit ?? null,
      validTo: data.validTo ?? null,
    } as InferInsertModel<typeof internationalFreights>)
    .returning();

  if (!row) throw new Error('Failed to create international freight');

  if (data.portOfLoadingIds.length > 0) {
    await client.insert(internationalFreightPortsOfLoading).values(
      data.portOfLoadingIds.map((portId) => ({
        internationalFreightId: row.id,
        portId,
      })),
    );
  }

  if (data.portOfDischargeIds.length > 0) {
    await client.insert(internationalFreightPortsOfDischarge).values(
      data.portOfDischargeIds.map((portId) => ({
        internationalFreightId: row.id,
        portId,
      })),
    );
  }

  return row;
}

export async function updateInternationalFreight(
  id: string,
  data: UpdateInternationalFreightData,
  client: DbOrTx = db,
): Promise<InternationalFreight | null> {
  const baseData: Partial<InferInsertModel<typeof internationalFreights>> = {};
  if (data.shippingModality !== undefined) baseData.shippingModality = data.shippingModality;
  if (data.carrierId !== undefined) baseData.carrierId = data.carrierId ?? null;
  if (data.containerType !== undefined) baseData.containerType = data.containerType ?? null;
  if (data.value !== undefined) baseData.value = data.value;
  if (data.currency !== undefined) baseData.currency = data.currency;
  if (data.freeTimeDays !== undefined) baseData.freeTimeDays = data.freeTimeDays;
  if (data.expectedProfit !== undefined) baseData.expectedProfit = data.expectedProfit;
  if (data.validTo !== undefined) baseData.validTo = data.validTo;

  if (Object.keys(baseData).length > 0) {
    await client
      .update(internationalFreights)
      .set(baseData)
      .where(eq(internationalFreights.id, id));
  }

  if (data.portOfLoadingIds !== undefined) {
    await client
      .delete(internationalFreightPortsOfLoading)
      .where(eq(internationalFreightPortsOfLoading.internationalFreightId, id));

    if (data.portOfLoadingIds.length > 0) {
      await client.insert(internationalFreightPortsOfLoading).values(
        data.portOfLoadingIds.map((portId) => ({
          internationalFreightId: id,
          portId,
        })),
      );
    }
  }

  if (data.portOfDischargeIds !== undefined) {
    await client
      .delete(internationalFreightPortsOfDischarge)
      .where(eq(internationalFreightPortsOfDischarge.internationalFreightId, id));

    if (data.portOfDischargeIds.length > 0) {
      await client.insert(internationalFreightPortsOfDischarge).values(
        data.portOfDischargeIds.map((portId) => ({
          internationalFreightId: id,
          portId,
        })),
      );
    }
  }

  const [updated] = await client
    .select()
    .from(internationalFreights)
    .where(eq(internationalFreights.id, id));
  return updated ?? null;
}

export async function deleteInternationalFreight(id: string, client: DbOrTx = db): Promise<boolean> {
  const deleted = await client
    .delete(internationalFreights)
    .where(eq(internationalFreights.id, id))
    .returning();
  return deleted.length > 0;
}

// ============================================
// Simulation Freight Calculation (W/M rules)
// ============================================

const EQUIPMENT_TO_CONTAINER: Record<string, 'GP_20' | 'GP_40' | 'HC_40'> = {
  '20GP': 'GP_20',
  '40NOR': 'GP_40',
  '40HC': 'HC_40',
};

const FALLBACK_USD_PER_CBM = 50;

export interface GetFreightValueForSimulationParams {
  shippingModality: 'AIR' | 'SEA_LCL' | 'SEA_FCL' | 'EXPRESS';
  containerType?: '20GP' | '40NOR' | '40HC';
  containerQuantity?: number;
  totalCbm: number;
  totalWeightKg: number;
}

export interface GetFreightValueForSimulationResult {
  value: number;
  usedFallback?: boolean;
  error?: string;
}

export async function getFreightValueForSimulation(
  params: GetFreightValueForSimulationParams,
  client: DbOrTx = db,
): Promise<GetFreightValueForSimulationResult> {
  const now = new Date();
  const validCondition = or(
    isNull(internationalFreights.validTo),
    gte(internationalFreights.validTo, now),
  );

  if (params.shippingModality === 'SEA_FCL') {
    const containerType = params.containerType
      ? EQUIPMENT_TO_CONTAINER[params.containerType]
      : null;
    const qty = params.containerQuantity ?? 1;

    if (!containerType) {
      return {
        value: 0,
        usedFallback: true,
        error: 'Nenhum frete padrão encontrado para esta modalidade. Simulação pode estar imprecisa.',
      };
    }

    const [freight] = await client
      .select()
      .from(internationalFreights)
      .where(
        and(
          eq(internationalFreights.shippingModality, 'SEA_FCL'),
          eq(internationalFreights.containerType, containerType),
          validCondition,
        ),
      )
      .limit(1);

    if (!freight) {
      return {
        value: 0,
        usedFallback: true,
        error: 'Nenhum frete padrão encontrado para esta modalidade. Simulação pode estar imprecisa.',
      };
    }

    const baseValue = Number(freight.value ?? 0) + Number(freight.expectedProfit ?? 0);
    return { value: baseValue * qty };
  }

  if (params.shippingModality === 'SEA_LCL') {
    const [freight] = await client
      .select()
      .from(internationalFreights)
      .where(
        and(
          eq(internationalFreights.shippingModality, 'SEA_LCL'),
          validCondition,
        ),
      )
      .limit(1);

    const fatorLcl = Math.max(params.totalWeightKg / 1000, params.totalCbm);
    const fator = Math.max(1, fatorLcl);

    if (!freight) {
      return {
        value: FALLBACK_USD_PER_CBM * fator,
        usedFallback: true,
        error: 'Nenhum frete padrão encontrado para esta modalidade. Simulação pode estar imprecisa.',
      };
    }

    const baseValue = Number(freight.value ?? 0) + Number(freight.expectedProfit ?? 0);
    return { value: baseValue * fator };
  }

  if (params.shippingModality === 'AIR' || params.shippingModality === 'EXPRESS') {
    const [freight] = await client
      .select()
      .from(internationalFreights)
      .where(
        and(
          eq(internationalFreights.shippingModality, params.shippingModality),
          validCondition,
        ),
      )
      .limit(1);

    const fatorAereo = Math.max(params.totalWeightKg, params.totalCbm * 167);

    if (!freight) {
      return {
        value: 0,
        usedFallback: true,
        error: 'Nenhum frete padrão encontrado para esta modalidade. Simulação pode estar imprecisa.',
      };
    }

    const baseValue = Number(freight.value ?? 0) + Number(freight.expectedProfit ?? 0);
    return { value: baseValue * fatorAereo };
  }

  return { value: 0 };
}
