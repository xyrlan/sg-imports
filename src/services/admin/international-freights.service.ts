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
import { eq, asc } from 'drizzle-orm';

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

export interface CreateInternationalFreightData {
  carrierId: string;
  containerType: InternationalFreight['containerType'];
  value: string;
  currency?: 'BRL' | 'USD' | 'CNY' | 'EUR';
  freeTimeDays?: number;
  expectedProfit?: string | null;
  validTo?: Date | null;
  portOfLoadingIds: string[];
  portOfDischargeIds: string[];
}

export interface UpdateInternationalFreightData {
  carrierId?: string;
  containerType?: InternationalFreight['containerType'];
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
  data: CreateInternationalFreightData
): Promise<InternationalFreight> {
  // #region agent log
  fetch('http://127.0.0.1:7457/ingest/47f0091e-c99b-4ec5-874b-1c09193f712c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b6cb52'},body:JSON.stringify({sessionId:'b6cb52',location:'international-freights.service.ts:createInternationalFreight',message:'Before main insert',data:{carrierId:data.carrierId,portOfLoadingIds:data.portOfLoadingIds,portOfDischargeIds:data.portOfDischargeIds},hypothesisId:'H5',timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  let inserted: InternationalFreight;
  try {
    const [row] = await db
      .insert(internationalFreights)
      .values({
        carrierId: data.carrierId,
        containerType: data.containerType,
        value: data.value,
        currency: data.currency ?? 'USD',
        freeTimeDays: data.freeTimeDays ?? 0,
        expectedProfit: data.expectedProfit ?? null,
        validTo: data.validTo ?? null,
      } as InferInsertModel<typeof internationalFreights>)
      .returning();

    if (!row) throw new Error('Failed to create international freight');
    inserted = row;
  } catch (err) {
    // #region agent log
    const e = err as { code?: string; message?: string; detail?: string; cause?: unknown };
    const cause = e.cause as { code?: string; message?: string; detail?: string } | undefined;
    fetch('http://127.0.0.1:7457/ingest/47f0091e-c99b-4ec5-874b-1c09193f712c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b6cb52'},body:JSON.stringify({sessionId:'b6cb52',location:'international-freights.service.ts:mainInsert',message:'Main insert failed',data:{code:e.code,causeCode:cause?.code,message:e.message,causeMessage:cause?.message,detail:e.detail,causeDetail:cause?.detail},hypothesisId:'H3',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw err;
  }

  // #region agent log
  fetch('http://127.0.0.1:7457/ingest/47f0091e-c99b-4ec5-874b-1c09193f712c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b6cb52'},body:JSON.stringify({sessionId:'b6cb52',location:'international-freights.service.ts:createInternationalFreight',message:'Main insert succeeded, before junction',data:{insertedId:inserted.id},hypothesisId:'H2',timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  try {
    if (data.portOfLoadingIds.length > 0) {
      await db.insert(internationalFreightPortsOfLoading).values(
        data.portOfLoadingIds.map((portId) => ({
          internationalFreightId: inserted.id,
          portId,
        }))
      );
    }

    if (data.portOfDischargeIds.length > 0) {
      await db.insert(internationalFreightPortsOfDischarge).values(
        data.portOfDischargeIds.map((portId) => ({
          internationalFreightId: inserted.id,
          portId,
        }))
      );
    }
  } catch (err) {
    // #region agent log
    const e = err as { code?: string; message?: string; detail?: string; cause?: unknown };
    const cause = e.cause as { code?: string; message?: string; detail?: string } | undefined;
    fetch('http://127.0.0.1:7457/ingest/47f0091e-c99b-4ec5-874b-1c09193f712c',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b6cb52'},body:JSON.stringify({sessionId:'b6cb52',location:'international-freights.service.ts:junctionInsert',message:'Junction insert failed',data:{code:e.code,causeCode:cause?.code,message:e.message,causeMessage:cause?.message,detail:e.detail,causeDetail:cause?.detail},hypothesisId:'H2',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    throw err;
  }

  return inserted;
}

export async function updateInternationalFreight(
  id: string,
  data: UpdateInternationalFreightData
): Promise<InternationalFreight | null> {
  const baseData: Partial<InferInsertModel<typeof internationalFreights>> = {};
  if (data.carrierId !== undefined) baseData.carrierId = data.carrierId;
  if (data.containerType !== undefined) baseData.containerType = data.containerType;
  if (data.value !== undefined) baseData.value = data.value;
  if (data.currency !== undefined) baseData.currency = data.currency;
  if (data.freeTimeDays !== undefined) baseData.freeTimeDays = data.freeTimeDays;
  if (data.expectedProfit !== undefined) baseData.expectedProfit = data.expectedProfit;
  if (data.validTo !== undefined) baseData.validTo = data.validTo;

  if (Object.keys(baseData).length > 0) {
    await db
      .update(internationalFreights)
      .set(baseData)
      .where(eq(internationalFreights.id, id));
  }

  if (data.portOfLoadingIds !== undefined) {
    await db
      .delete(internationalFreightPortsOfLoading)
      .where(eq(internationalFreightPortsOfLoading.internationalFreightId, id));

    if (data.portOfLoadingIds.length > 0) {
      await db.insert(internationalFreightPortsOfLoading).values(
        data.portOfLoadingIds.map((portId) => ({
          internationalFreightId: id,
          portId,
        }))
      );
    }
  }

  if (data.portOfDischargeIds !== undefined) {
    await db
      .delete(internationalFreightPortsOfDischarge)
      .where(eq(internationalFreightPortsOfDischarge.internationalFreightId, id));

    if (data.portOfDischargeIds.length > 0) {
      await db.insert(internationalFreightPortsOfDischarge).values(
        data.portOfDischargeIds.map((portId) => ({
          internationalFreightId: id,
          portId,
        }))
      );
    }
  }

  const [updated] = await db
    .select()
    .from(internationalFreights)
    .where(eq(internationalFreights.id, id));
  return updated ?? null;
}

export async function deleteInternationalFreight(id: string): Promise<boolean> {
  const deleted = await db
    .delete(internationalFreights)
    .where(eq(internationalFreights.id, id))
    .returning();
  return deleted.length > 0;
}
