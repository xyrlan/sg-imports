import type { Sql } from '../connection';
import type { IdMap, PhaseResult } from '../id-map';

const CONTAINER_SIZE_MAP: Record<string, string | null> = { STD_20: 'GP_20', STD_40: 'GP_40', HC_40: 'HC_40', HQ_40: 'HC_40', LCL_WM: null };

const STEP_SEQUENCE_TO_ENUM: Record<number, string> = {
  1: 'CONTRACT_CREATION',
  2: 'MERCHANDISE_PAYMENT',
  3: 'MERCHANDISE_PAYMENT',
  4: 'SHIPPING_PREPARATION',
  5: 'DOCUMENT_PREPARATION',
  6: 'CUSTOMS_CLEARANCE',
  7: 'COMPLETION',
};

const STEP_SEQUENCE_TO_STATUS: Record<number, string> = {
  1: 'PRODUCTION',
  2: 'PRODUCTION',
  3: 'BOOKED',
  4: 'IN_TRANSIT',
  5: 'CUSTOMS_CLEARANCE',
  6: 'RELEASED',
  7: 'RELEASED',
};

function resolveContainerType(containerId: string | null, idMap: IdMap): string | null {
  if (!containerId) return null;
  const meta = idMap.get('container', containerId);
  if (!meta) return null;
  try { return ({ STD_20: 'GP_20', STD_40: 'GP_40', HC_40: 'HC_40', HQ_40: 'HC_40' } as any)[JSON.parse(meta).size] ?? null; } catch { return null; }
}

export async function runPhase06(legacy: Sql, target: Sql, idMap: IdMap): Promise<PhaseResult> {
  const result: PhaseResult = { phase: '06-shipments', tables: [] };
  const brTradingId = idMap.getRequired('meta', 'brTradingOrgId');

  // Pre-load StepTemplates for mapping
  const stepTemplates = await legacy`SELECT * FROM "StepTemplate" ORDER BY sequence ASC`;
  const stepTemplateMap = new Map<number, any>();
  for (const st of stepTemplates) stepTemplateMap.set(st.id, st);

  // --- shipments (from Order + legacy Shipment + Contract) ---
  {
    const rows = await legacy`
      SELECT o.*, s."bookingNumber", s."shipsgoShipmentId", s."shipsgoStatus", s."shipsgoLastUpdate",
             s."containerSizes", s."carrierScac", s."containerQuantity",
             c."zapSignId", c."zapSignDocument", c.status as "contractStatus"
      FROM "Order" o
      LEFT JOIN "Shipment" s ON o."shipmentId" = s.id
      LEFT JOIN "Contract" c ON o."contractId" = c.id
      ORDER BY o."createdAt" ASC`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];

    for (const r of rows) {
      const clientOrgId = idMap.get('company', r.companyId);
      if (!clientOrgId) { skipped++; continue; }

      // Resolve carrier from SCAC code
      let carrierId = null;
      if (r.carrierScac) {
        const [carrier] = await target`SELECT id FROM carriers WHERE scac_code = ${r.carrierScac} LIMIT 1`;
        if (carrier) carrierId = carrier.id;
      }

      // Determine status
      let status = 'PENDING';
      if (r.status === 'COMPLETED') status = 'FINISHED';
      else if (r.status === 'CANCELLED') status = 'CANCELED';
      else if (r.status === 'IN_PROGRESS' && r.currentStepId) {
        const step = await legacy`SELECT "stepTemplateId" FROM "OrderStep" WHERE id = ${r.currentStepId}`;
        if (step.length > 0) {
          const template = stepTemplateMap.get(step[0].stepTemplateId);
          status = template ? (STEP_SEQUENCE_TO_STATUS[template.sequence] ?? 'PRODUCTION') : 'PRODUCTION';
        }
      }

      // Determine currentStep enum
      let currentStep = 'CONTRACT_CREATION';
      if (r.currentStepId) {
        const step = await legacy`SELECT "stepTemplateId" FROM "OrderStep" WHERE id = ${r.currentStepId}`;
        if (step.length > 0) {
          const template = stepTemplateMap.get(step[0].stepTemplateId);
          currentStep = template ? (STEP_SEQUENCE_TO_ENUM[template.sequence] ?? 'CONTRACT_CREATION') : 'CONTRACT_CREATION';
        }
      }

      // ZapSign
      const zapSignStatus = r.contractStatus === 'SIGNED' ? 'signed' : r.contractStatus === 'PENDING' ? 'pending' : 'created';

      // Deduplicate shipsGoId — if already used, set to null
      let shipsGoId = r.shipsgoShipmentId;
      if (shipsGoId) {
        const [existing] = await target`SELECT id FROM shipments WHERE ships_go_id = ${shipsGoId} LIMIT 1`;
        if (existing) shipsGoId = null;
      }

      try {
        const [inserted] = await target`
          INSERT INTO shipments (id, seller_organization_id, client_organization_id, status, booking_number, carrier_id,
            fob_advance_percentage, current_step, zap_sign_id, zap_sign_status,
            ships_go_id, ships_go_last_update,
            created_at, updated_at)
          VALUES (gen_random_uuid(), ${brTradingId}, ${clientOrgId}, ${status}, ${r.bookingNumber},
            ${carrierId}, ${r.firstPaymentPercentage ?? 0.3},
            ${currentStep}, ${r.zapSignId}, ${zapSignStatus},
            ${shipsGoId}, ${r.shipsgoLastUpdate},
            ${r.createdAt}, ${r.updatedAt})
          RETURNING id`;
        idMap.set('order', r.id, inserted.id);

        // Migrate container rows from legacy Shipment.containerSizes array
        if (r.containerSizes && Array.isArray(r.containerSizes)) {
          for (const size of r.containerSizes) {
            const ct = CONTAINER_SIZE_MAP[size];
            if (ct) {
              await target`
                INSERT INTO shipment_containers (id, shipment_id, type)
                VALUES (gen_random_uuid(), ${inserted.id}, ${ct})`;
            }
          }
        }
        migrated++;
      } catch (e: any) { errors.push(`Order ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'shipments', migrated, skipped, errors });
    console.log(`  [shipments] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- shipmentStepHistory (from OrderStep) ---
  {
    const rows = await legacy`SELECT * FROM "OrderStep"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const shipmentId = idMap.get('order', r.orderId);
      if (!shipmentId) { skipped++; continue; }
      const template = stepTemplateMap.get(r.stepTemplateId);
      const stepEnum = template ? (STEP_SEQUENCE_TO_ENUM[template.sequence] ?? 'CONTRACT_CREATION') : 'CONTRACT_CREATION';
      const completedById = idMap.get('user', r.completedById);
      try {
        await target`
          INSERT INTO shipment_step_history (id, shipment_id, step, status, started_at, completed_at, completed_by_id)
          VALUES (gen_random_uuid(), ${shipmentId}, ${stepEnum}, ${r.status === 'IN_PROGRESS' ? 'COMPLETED' : r.status}, NOW(), ${r.completedAt}, ${completedById})`;
        migrated++;
      } catch (e: any) { errors.push(`OrderStep ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'shipmentStepHistory', migrated, skipped, errors });
    console.log(`  [shipmentStepHistory] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- shipmentDocuments (from Document) ---
  {
    const VALID_DOC_TYPES = new Set(['COMMERCIAL_INVOICE','PACKING_LIST','BILL_OF_LADING','IMPORT_DECLARATION','ORIGIN_CERTIFICATE','SISCOMEX_RECEIPT','ICMS_PROOF','MBL_DOCUMENT','HBL_DOCUMENT','STORAGE_INVOICE','SALES_INVOICE_PDF','SALES_INVOICE_XML','OTHER']);
    const rows = await legacy`SELECT * FROM "Document"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const shipmentId = idMap.get('order', r.orderId);
      if (!shipmentId) { skipped++; continue; }
      if (!r.file) { skipped++; continue; } // url is NOT NULL
      const docType = VALID_DOC_TYPES.has(r.type) ? r.type : 'OTHER';
      try {
        const [inserted] = await target`
          INSERT INTO shipment_documents (id, shipment_id, type, name, url, created_at)
          VALUES (gen_random_uuid(), ${shipmentId}, ${docType}, ${r.name ?? 'Documento'}, ${r.file}, ${r.createdAt})
          RETURNING id`;
        idMap.set('document', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`Document ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'shipmentDocuments', migrated, skipped, errors });
    console.log(`  [shipmentDocuments] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- shipmentExpenses (from OrderExpense, denormalized) ---
  {
    const rows = await legacy`SELECT * FROM "OrderExpense"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    const expenseFields: [string, string][] = [
      ['ii', 'TAX_II'], ['ipi', 'TAX_IPI'], ['pis', 'TAX_PIS'], ['cofins', 'TAX_COFINS'],
      ['taxaSiscomex', 'TAX_SISCOMEX'], ['freteInternacional', 'FREIGHT_INTL'],
      ['armazenagem', 'STORAGE'], ['servicoDesembaraco', 'CUSTOMS_BROKER'],
      ['desovaContainer', 'HANDLING'], ['lavagemContainer', 'HANDLING'],
      ['discount', 'DISCOUNT'], ['multas', 'OTHER'], ['afrmm', 'OTHER'],
      ['seguroInternacional', 'OTHER'], ['dtcDta', 'OTHER'],
      ['difal', 'TAX_ICMS'], ['icmsTributosSaida', 'TAX_ICMS'], ['juros', 'OTHER'],
    ];
    for (const r of rows) {
      const shipmentId = idMap.get('order', r.orderId);
      if (!shipmentId) { skipped++; continue; }
      try {
        for (const [field, category] of expenseFields) {
          const val = Number(r[field]);
          if (val && val !== 0) {
            await target`
              INSERT INTO shipment_expenses (id, shipment_id, category, description, value, currency)
              VALUES (gen_random_uuid(), ${shipmentId}, ${category}, ${field}, ${Math.abs(val)}, 'BRL')`;
            migrated++;
          }
        }
      } catch (e: any) { errors.push(`OrderExpense ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'shipmentExpenses', migrated, skipped, errors });
    console.log(`  [shipmentExpenses] migrated: ${migrated} rows, skipped: ${skipped}`);
  }

  // --- shipmentChangeRequests (from OrderChangeRequest) ---
  {
    const rows = await legacy`SELECT * FROM "OrderChangeRequest"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    const statusMap: Record<string, string> = { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED', CANCELLED: 'REJECTED', FAILED: 'REJECTED' };
    for (const r of rows) {
      const shipmentId = idMap.get('order', r.orderId);
      const requestedById = idMap.get('user', r.requestedById);
      if (!shipmentId || !requestedById) { skipped++; continue; }
      try {
        await target`
          INSERT INTO shipment_change_requests (id, shipment_id, requested_by_id, status, description, changes_json, admin_response, processed_at, created_at)
          VALUES (gen_random_uuid(), ${shipmentId}, ${requestedById}, ${statusMap[r.status] ?? 'PENDING'}, ${r.requestType ?? 'Change request'}, ${JSON.stringify({ currentItems: r.currentItems, proposedItems: r.proposedItems })}, ${r.adminNotes}, ${r.processedAt}, ${r.createdAt})`;
        migrated++;
      } catch (e: any) { errors.push(`ChangeRequest ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'shipmentChangeRequests', migrated, skipped, errors });
    console.log(`  [shipmentChangeRequests] migrated: ${migrated}, skipped: ${skipped}`);
  }

  // --- shipmentFreightReceipts (from InternationalFreightReceipt) ---
  {
    const rows = await legacy`SELECT * FROM "InternationalFreightReceipt"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const shipmentId = idMap.get('order', r.orderId);
      if (!shipmentId) { skipped++; continue; }
      const carrierId = idMap.get('carrier', r.carrierId);
      const containerType = resolveContainerType(r.containerId, idMap);
      const portLoadingId = idMap.get('port', r.portOfLoadingId);
      const portDischargeId = idMap.get('port', r.portOfDischargeId);
      const documentId = idMap.get('document', r.documentId);
      if (!carrierId || !containerType || !portLoadingId || !portDischargeId) { skipped++; continue; }
      try {
        await target`
          INSERT INTO shipment_freight_receipts (id, shipment_id, carrier_id, container_type, container_quantity, port_of_loading_id, port_of_discharge_id, freight_value, dolar_quotation, document_id, freight_expenses, pricing_items, created_at, updated_at)
          VALUES (gen_random_uuid(), ${shipmentId}, ${carrierId}, ${containerType}, ${r.containerQuantity ?? 1}, ${portLoadingId}, ${portDischargeId}, ${Number(r.freightValue)}, ${Number(r.dolarQuotation)}, ${documentId}, ${JSON.stringify(r.freightExpenses ?? [])}, ${JSON.stringify(r.pricingItems ?? [])}, ${r.createdAt}, NOW())`;
        migrated++;
      } catch (e: any) { errors.push(`FreightReceipt ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'shipmentFreightReceipts', migrated, skipped, errors });
    console.log(`  [shipmentFreightReceipts] migrated: ${migrated}, skipped: ${skipped}`);
  }

  return result;
}
