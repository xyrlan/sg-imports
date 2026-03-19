import type { Sql } from '../connection';
import type { IdMap, PhaseResult } from '../id-map';

const CARGO_TO_MODALITY: Record<string, string> = { FCL: 'SEA_FCL', LCL: 'SEA_LCL', PARTLOT: 'SEA_FCL_PARTIAL' };
const CONTAINER_SIZE_MAP: Record<string, string | null> = { STD_20: 'GP_20', STD_40: 'GP_40', HC_40: 'HC_40', HQ_40: 'HC_40', LCL_WM: null };
const FEE_BASIS_MAP: Record<string, string> = { PER_BL: 'PER_BL', PER_CONTAINER: 'PER_CONTAINER', PER_WM: 'PER_WM', PER_BOX: 'PER_BOX', FIXED_TOTAL: 'PER_BL' };

function resolveContainerType(containerId: string | null, idMap: IdMap): string | null {
  if (!containerId) return null;
  const meta = idMap.get('container', containerId);
  if (!meta) return null;
  try {
    const { size } = JSON.parse(meta);
    return CONTAINER_SIZE_MAP[size] ?? null;
  } catch { return null; }
}

export async function runPhase04(legacy: Sql, target: Sql, idMap: IdMap): Promise<PhaseResult> {
  const result: PhaseResult = { phase: '04-logistics', tables: [] };

  // --- storageRules + storagePeriods + additionalFees ---
  {
    const rules = await legacy`SELECT * FROM "StorageRule"`;
    let migrated = 0;
    const errors: string[] = [];
    for (const r of rules) {
      const terminalId = idMap.get('terminal', r.terminalId);
      if (!terminalId) continue;
      try {
        // Fetch additional fees for this rule
        const fees = await legacy`SELECT * FROM "AdditionalFee" WHERE "storageRuleId" = ${r.id}`;
        const additionalFeesJson = fees.map((f: any) => ({
          name: f.name,
          value: Number(f.value),
          basis: FEE_BASIS_MAP[f.basis] ?? 'PER_BL',
        }));

        const [inserted] = await target`
          INSERT INTO storage_rules (id, terminal_id, shipment_type, currency, min_value, free_days, cif_insurance, additional_fees)
          VALUES (gen_random_uuid(), ${terminalId}, ${CARGO_TO_MODALITY[r.cargoType] ?? 'SEA_FCL'}, ${r.currency ?? 'BRL'}, ${Number(r.minimumValue)}, ${0}, ${Number(r.generalMinCIF)}, ${JSON.stringify(additionalFeesJson)})
          RETURNING id`;
        idMap.set('storageRule', r.id, inserted.id);

        // Migrate periods
        const periods = await legacy`SELECT * FROM "StoragePeriod" WHERE "storageRuleId" = ${r.id} ORDER BY "periodNumber" ASC`;
        for (const p of periods) {
          const chargeType = Number(p.cifPercent) > 0 ? 'PERCENTAGE' : 'FIXED';
          const rate = Number(p.cifPercent) > 0 ? Number(p.cifPercent) : Number(p.fixedPrice);
          await target`
            INSERT INTO storage_periods (id, rule_id, days_from, days_to, charge_type, rate, is_daily_rate)
            VALUES (gen_random_uuid(), ${inserted.id}, ${p.daysFrom}, ${p.daysTo}, ${chargeType}, ${rate}, ${p.isDailyRate ?? false})`;
        }
        migrated++;
      } catch (e: any) { errors.push(`StorageRule ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'storageRules+periods', migrated, skipped: 0, errors });
    console.log(`  [storageRules+periods] migrated: ${migrated}, errors: ${errors.length}`);
  }

  // --- internationalFreights + M2M port tables ---
  {
    const rows = await legacy`SELECT * FROM "InternacionalFreight"`;
    let migrated = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const carrierId = idMap.get('carrier', r.carrierId);
      const containerType = resolveContainerType(r.containerId, idMap);
      try {
        const [inserted] = await target`
          INSERT INTO international_freights (id, shipping_modality, carrier_id, container_type, value, currency, free_time_days, expected_profit, valid_from, valid_to, created_at, updated_at)
          VALUES (gen_random_uuid(), ${containerType ? 'SEA_FCL' : 'SEA_LCL'}, ${carrierId}, ${containerType}, ${Number(r.value)}, ${r.currency ?? 'USD'}, ${r.freeTime ?? 0}, ${r.expectedProfit ? Number(r.expectedProfit) : null}, ${r.createdAt}, ${r.validTo}, ${r.createdAt}, ${r.updatedAt})
          RETURNING id`;
        idMap.set('internacionalFreight', r.id, inserted.id);

        // M2M ports of loading
        const loadingPorts = await legacy`
          SELECT "B" as port_id FROM "_PortOfLoadingInternacionalFreights" WHERE "A" = ${r.id}`;
        for (const lp of loadingPorts) {
          const portId = idMap.get('port', lp.port_id);
          if (portId) {
            await target`
              INSERT INTO int_freight_ports_loading (international_freight_id, port_id)
              VALUES (${inserted.id}, ${portId})
              ON CONFLICT DO NOTHING`;
          }
        }

        // M2M ports of discharge
        const dischargePorts = await legacy`
          SELECT "B" as port_id FROM "_PortOfDischargeInternacionalFreights" WHERE "A" = ${r.id}`;
        for (const dp of dischargePorts) {
          const portId = idMap.get('port', dp.port_id);
          if (portId) {
            await target`
              INSERT INTO int_freight_ports_discharge (international_freight_id, port_id)
              VALUES (${inserted.id}, ${portId})
              ON CONFLICT DO NOTHING`;
          }
        }
        migrated++;
      } catch (e: any) { errors.push(`IntlFreight ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'internationalFreights', migrated, skipped: 0, errors });
    console.log(`  [internationalFreights] migrated: ${migrated}, errors: ${errors.length}`);
  }

  // --- pricingRules + pricingItems ---
  {
    const rules = await legacy`SELECT * FROM "PricingRule"`;
    let migrated = 0;
    const errors: string[] = [];
    for (const r of rules) {
      const carrierId = idMap.get('carrier', r.carrierId);
      if (!carrierId) continue;
      const portId = idMap.get('port', r.portId);
      const containerType = resolveContainerType(r.containerId, idMap);
      try {
        const [inserted] = await target`
          INSERT INTO pricing_rules (id, carrier_id, port_id, container_type, scope, valid_from, valid_to, created_at, updated_at)
          VALUES (gen_random_uuid(), ${carrierId}, ${portId}, ${containerType}, ${r.scope ?? 'SPECIFIC'}, ${r.validFrom}, ${r.validTo}, NOW(), NOW())
          RETURNING id`;
        idMap.set('pricingRule', r.id, inserted.id);

        // Items (only those with pricingRuleId, skip orderId-linked ones)
        const items = await legacy`SELECT * FROM "PricingItem" WHERE "pricingRuleId" = ${r.id}`;
        for (const item of items) {
          await target`
            INSERT INTO pricing_items (id, pricing_rule_id, name, amount, currency, basis, created_at, updated_at)
            VALUES (gen_random_uuid(), ${inserted.id}, ${item.name}, ${Number(item.amount)}, ${item.currency ?? 'BRL'}, ${FEE_BASIS_MAP[item.basis] ?? 'PER_CONTAINER'}, NOW(), NOW())`;
        }
        migrated++;
      } catch (e: any) { errors.push(`PricingRule ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'pricingRules+items', migrated, skipped: 0, errors });
    console.log(`  [pricingRules+items] migrated: ${migrated}, errors: ${errors.length}`);
  }

  // --- globalServiceFeeConfig (from HonorarioConfig isGlobal=true) ---
  {
    const rows = await legacy`
      SELECT hc.*, mw.value as "mwValue"
      FROM "HonorarioConfig" hc
      LEFT JOIN "MinimumWage" mw ON hc."minimumWageId" = mw.id
      WHERE hc."isGlobal" = true AND hc."isActive" = true
      LIMIT 1`;
    if (rows.length > 0) {
      const r = rows[0];
      await target`
        INSERT INTO global_service_fee_config (id, minimum_wage_brl, default_multiplier, default_percentage, default_apply_to_china, updated_at)
        VALUES (gen_random_uuid(), ${r.mwValue ?? 1530}, ${r.minimumWageMultiplier ?? 2}, ${r.percentualHonorarios ?? 2.5}, ${r.aplicarSobreMercadoriaChina ?? true}, NOW())`;
      console.log(`  [globalServiceFeeConfig] migrated: 1`);
    }
  }

  // --- serviceFeeConfigs (from HonorarioConfig per company) ---
  {
    const rows = await legacy`SELECT * FROM "HonorarioConfig" WHERE "isGlobal" = false AND "companyId" IS NOT NULL`;
    let migrated = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const orgId = idMap.get('company', r.companyId);
      if (!orgId) continue;
      try {
        await target`
          INSERT INTO service_fee_configs (id, organization_id, minimum_value_multiplier, percentage, apply_to_china, updated_at)
          VALUES (gen_random_uuid(), ${orgId}, ${r.minimumWageMultiplier ?? 2}, ${r.percentualHonorarios ?? 2.5}, ${r.aplicarSobreMercadoriaChina ?? true}, NOW())
          ON CONFLICT (organization_id) DO NOTHING`;
        migrated++;
      } catch (e: any) { errors.push(`ServiceFee ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'serviceFeeConfigs', migrated, skipped: 0, errors });
    console.log(`  [serviceFeeConfigs] migrated: ${migrated}, errors: ${errors.length}`);
  }

  // --- freightProposals ---
  {
    const rows = await legacy`SELECT * FROM "FreightProposal"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    const statusMap: Record<string, string> = { SENT: 'SENT', NOT_SENT: 'DRAFT' };
    for (const r of rows) {
      const intlFreightId = idMap.get('internacionalFreight', r.internacionalFreightId);
      const createdById = idMap.get('user', r.createdById);
      if (!intlFreightId || !createdById) { skipped++; continue; }
      const orgId = idMap.get('company', r.companyId);
      try {
        const [inserted] = await target`
          INSERT INTO freight_proposals (id, organization_id, international_freight_id, status, freight_value, total_value, custom_taxes, transit_time_days, valid_until, pdf_url, cnpj, email, reference, incoterm, created_by_id, created_at, updated_at)
          VALUES (gen_random_uuid(), ${orgId}, ${intlFreightId}, ${statusMap[r.status] ?? 'DRAFT'}, ${Number(r.freightValue)}, ${Number(r.totalValue)}, ${r.customTaxes ? JSON.stringify(r.customTaxes) : null}, ${r.transitTime}, ${r.validUntil}, ${r.pdfUrl}, ${r.cnpj}, ${r.email}, ${r.reference}, ${r.incoterm ?? 'FOB'}, ${createdById}, ${r.createdAt}, ${r.updatedAt})
          RETURNING id`;
        idMap.set('freightProposal', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`FreightProposal ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'freightProposals', migrated, skipped, errors });
    console.log(`  [freightProposals] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  return result;
}
