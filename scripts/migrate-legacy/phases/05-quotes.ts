import type { Sql } from '../connection';
import type { IdMap, PhaseResult } from '../id-map';

const PROFORMA_STATUS_MAP: Record<string, string> = {
  UNUSED: 'DRAFT',
  ADDED_TO_CART: 'SENT',
  CONTRACT_SIGNING: 'PENDING_SIGNATURE',
  COMPLETED: 'CONVERTED',
};

const MODALITY_MAP: Record<string, string> = { MARITIMO: 'SEA_FCL', AEREO: 'AIR' };

export async function runPhase05(legacy: Sql, target: Sql, idMap: IdMap): Promise<PhaseResult> {
  const result: PhaseResult = { phase: '05-quotes', tables: [] };
  const brTradingId = idMap.getRequired('meta', 'brTradingOrgId');
  const fallbackCreatedById = idMap.get('meta', 'firstAdminProfileId') ?? brTradingId;

  // --- quotes (from Proforma + ProformaMetadata) ---
  {
    const rows = await legacy`
      SELECT p.*, pm.incoterm, pm."despesasUSD", pm."modalidadeFrete", pm."firstPaymentPercentage" as "metaFpp",
             pm.commission as "metaCommission", pm.icms as "metaIcms", pm."pedidoResumido"
      FROM "Proforma" p
      LEFT JOIN "ProformaMetadata" pm ON pm."proformaId" = p.id`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const clientOrgId = idMap.get('company', r.companyId);
      if (!clientOrgId) { skipped++; continue; }
      try {
        const metadata = JSON.stringify({
          commissionPercent: r.metaCommission ?? r.commission,
          firstPaymentFobPercent: r.metaFpp ?? r.firstPaymentPercentage,
        });
        const shippingModality = r.modalidadeFrete ? (MODALITY_MAP[r.modalidadeFrete] ?? null) : null;
        const VALID_INCOTERMS = new Set(['EXW', 'FOB', 'CIF', 'DDP']);
        const incoterm = VALID_INCOTERMS.has(r.incoterm) ? r.incoterm : 'FOB';

        const [inserted] = await target`
          INSERT INTO quotes (id, seller_organization_id, client_organization_id, created_by_id, public_token, type, status, name, target_dolar, incoterm, metadata, shipping_modality, created_at, updated_at)
          VALUES (gen_random_uuid(), ${brTradingId}, ${clientOrgId}, ${fallbackCreatedById}, ${r.shareLink}, 'PROFORMA', ${PROFORMA_STATUS_MAP[r.status] ?? 'DRAFT'}, ${r.name ?? 'Proforma legada'}, ${5.70}, ${incoterm}, ${metadata}, ${shippingModality}, ${r.createdAt}, ${r.updatedAt})
          RETURNING id`;
        idMap.set('proforma', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`Proforma ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'quotes(proforma)', migrated, skipped, errors });
    console.log(`  [quotes(proforma)] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- quotes (from Simulation) ---
  {
    const rows = await legacy`SELECT * FROM "Simulation"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const clientOrgId = idMap.get('company', r.companyId);
      if (!clientOrgId) { skipped++; continue; }
      try {
        const [inserted] = await target`
          INSERT INTO quotes (id, seller_organization_id, client_organization_id, created_by_id, type, status, name, target_dolar, created_at, updated_at)
          VALUES (gen_random_uuid(), ${brTradingId}, ${clientOrgId}, ${fallbackCreatedById}, 'SIMULATION', 'DRAFT', ${r.nome ?? 'Simulacao legada'}, ${5.70}, ${r.createdAt}, ${r.updatedAt})
          RETURNING id`;
        idMap.set('simulation', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`Simulation ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'quotes(simulation)', migrated, skipped, errors });
    console.log(`  [quotes(simulation)] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- quoteItems (from CartItem with proformaId or simulationId) ---
  {
    const rows = await legacy`SELECT * FROM "CartItem" WHERE "proformaId" IS NOT NULL OR "simulationId" IS NOT NULL`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const quoteId = r.proformaId
        ? idMap.get('proforma', r.proformaId)
        : idMap.get('simulation', r.simulationId);
      if (!quoteId) { skipped++; continue; }

      // Try to resolve variant: first elementoVariacao, then defaultVariant
      let variantId = idMap.get('elementoVariacao', r.sellerProductId)
        ?? idMap.get('defaultVariant', r.sellerProductId)
        ?? idMap.get('defaultVariant', r.product_id);

      // If no variant, use product JSON as snapshot. Check constraint requires one of them.
      let snapshot = !variantId && r.product ? r.product : null;
      if (!variantId && !snapshot) {
        // Create minimal snapshot to satisfy check constraint
        snapshot = { name: 'Produto legado', priceUsd: String(r.price ?? 0), hsCode: '0000.00.00', unitsPerCarton: 1 };
      }

      try {
        const [inserted] = await target`
          INSERT INTO quote_items (id, quote_id, variant_id, simulated_product_snapshot, quantity, price_usd)
          VALUES (gen_random_uuid(), ${quoteId}, ${variantId}, ${snapshot ? snapshot : null}, ${r.quantity}, ${r.price ?? 0})
          RETURNING id`;
        idMap.set('cartItem', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`CartItem ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'quoteItems', migrated, skipped, errors });
    console.log(`  [quoteItems] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- quoteObservations (from ProformaObservation) ---
  {
    const rows = await legacy`SELECT * FROM "ProformaObservation" WHERE "proformaId" IS NOT NULL`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const quoteId = idMap.get('proforma', r.proformaId);
      if (!quoteId) { skipped++; continue; }
      try {
        // Fetch attachments
        const attachments = await legacy`SELECT * FROM "ProformaAttachment" WHERE "observationId" = ${r.id}`;
        const docs = attachments.map((a: any) => ({ name: a.fileName, url: a.fileUrl }));

        await target`
          INSERT INTO quote_observations (id, quote_id, description, documents, created_at, updated_at)
          VALUES (gen_random_uuid(), ${quoteId}, ${r.content}, ${JSON.stringify(docs)}, ${r.createdAt}, ${r.updatedAt})`;
        migrated++;
      } catch (e: any) { errors.push(`Observation ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'quoteObservations', migrated, skipped, errors });
    console.log(`  [quoteObservations] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  return result;
}
