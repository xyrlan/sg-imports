import type { Sql } from '../connection';
import type { IdMap, PhaseResult } from '../id-map';

export async function runPhase01(legacy: Sql, target: Sql, idMap: IdMap): Promise<PhaseResult> {
  const result: PhaseResult = { phase: '01-foundation', tables: [] };

  // --- hsCodes (from Ncm) ---
  {
    const rows = await legacy`SELECT * FROM "Ncm"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      try {
        const [inserted] = await target`
          INSERT INTO hs_codes (id, code, description, ii, ipi, pis, cofins, antidumping_tax, updated_at)
          VALUES (gen_random_uuid(), ${r.codigo}, ${null}, ${r.ii ?? 0}, ${r.ipi ?? 0}, ${r.pis ?? 0}, ${r.cofins ?? 0}, ${r.antidumping ?? 0}, ${r.updatedAt ?? new Date()})
          ON CONFLICT (code) DO NOTHING
          RETURNING id`;
        if (inserted) { idMap.set('ncm', r.id, inserted.id); migrated++; }
        else skipped++;
      } catch (e: any) { errors.push(`Ncm ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'hsCodes', migrated, skipped, errors });
    console.log(`  [hsCodes] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- carriers ---
  {
    const rows = await legacy`SELECT * FROM "Carrier"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      try {
        const [inserted] = await target`
          INSERT INTO carriers (id, name, scac_code)
          VALUES (gen_random_uuid(), ${r.name}, ${r.apiCode})
          ON CONFLICT (scac_code) DO NOTHING
          RETURNING id`;
        if (inserted) { idMap.set('carrier', r.id, inserted.id); migrated++; }
        else skipped++;
      } catch (e: any) { errors.push(`Carrier ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'carriers', migrated, skipped, errors });
    console.log(`  [carriers] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- ports ---
  {
    const rows = await legacy`SELECT * FROM "Port"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      try {
        const [inserted] = await target`
          INSERT INTO ports (id, name, code, country)
          VALUES (gen_random_uuid(), ${r.name}, ${r.code ?? r.id}, ${r.country ?? 'Brazil'})
          ON CONFLICT (code) DO NOTHING
          RETURNING id`;
        if (inserted) { idMap.set('port', r.id, inserted.id); migrated++; }
        else skipped++;
      } catch (e: any) { errors.push(`Port ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'ports', migrated, skipped, errors });
    console.log(`  [ports] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- terminals ---
  {
    const rows = await legacy`SELECT * FROM "Terminal"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      try {
        const [inserted] = await target`
          INSERT INTO terminals (id, name, code)
          VALUES (gen_random_uuid(), ${r.tradeName}, ${r.code})
          RETURNING id`;
        idMap.set('terminal', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`Terminal ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'terminals', migrated, skipped, errors });
    console.log(`  [terminals] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- containers (build lookup map only, no target table) ---
  {
    const rows = await legacy`SELECT * FROM "Container"`;
    for (const r of rows) {
      idMap.set('container', r.id, JSON.stringify({ size: r.size, cargoType: r.cargoType }));
    }
    console.log(`  [containers] mapped: ${rows.length} (lookup only, no target table)`);
  }

  // --- stateIcmsRates (from AliquotaEstado) ---
  {
    const rows = await legacy`SELECT * FROM "aliquota_estados"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    const difalMap: Record<string, string> = { POR_DENTRO: 'INSIDE', POR_FORA: 'OUTSIDE' };
    for (const r of rows) {
      try {
        await target`
          INSERT INTO state_icms_rates (state, difal, icms_rate, updated_at)
          VALUES (${r.estado}, ${difalMap[r.difal] ?? 'INSIDE'}, ${r.aliquota}, NOW())
          ON CONFLICT (state, difal) DO NOTHING`;
        idMap.set('aliquotaEstado', r.id, `${r.estado}_${r.difal}`);
        migrated++;
      } catch (e: any) { errors.push(`AliquotaEstado ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'stateIcmsRates', migrated, skipped, errors });
    console.log(`  [stateIcmsRates] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  // --- siscomexFeeConfig (from TaxaSiscomex) ---
  {
    const rows = await legacy`SELECT * FROM "taxa_siscomex" WHERE "isActive" = true LIMIT 1`;
    if (rows.length > 0) {
      const r = rows[0];
      await target`
        INSERT INTO siscomex_fee_config (id, registration_value, additions, additions_11_to_20, additions_21_to_50, additions_51_and_above, updated_at)
        VALUES (gen_random_uuid(), ${r.valorRegistro}, ${r.adicoes ?? []}, ${r.valorFixoAdicao11a20}, ${r.valorFixoAdicao21Plus}, ${r.valorFixoAdicao51Plus}, NOW())`;
      console.log(`  [siscomexFeeConfig] migrated: 1`);
    }
  }

  // --- globalPlatformRates ---
  {
    let migrated = 0;
    const errors: string[] = [];

    const afrmm = await legacy`SELECT * FROM "imposto_afrmm" WHERE "isActive" = true LIMIT 1`;
    if (afrmm.length > 0) {
      await target`
        INSERT INTO global_platform_rates (id, rate_type, value, unit, description, updated_at)
        VALUES (gen_random_uuid(), 'AFRMM', ${afrmm[0].percentual}, 'PERCENT', 'AFRMM - Adicional ao Frete para Renovacao da Marinha Mercante', NOW())
        ON CONFLICT (rate_type) DO NOTHING`;
      migrated++;
    }

    const seguro = await legacy`SELECT * FROM "seguro_internacional" WHERE "isActive" = true LIMIT 1`;
    if (seguro.length > 0) {
      await target`
        INSERT INTO global_platform_rates (id, rate_type, value, unit, description, updated_at)
        VALUES (gen_random_uuid(), 'INTL_INSURANCE', ${seguro[0].percentualSeguro}, 'PERCENT', 'Seguro Internacional', NOW())
        ON CONFLICT (rate_type) DO NOTHING`;
      migrated++;
    }

    const sda = await legacy`SELECT * FROM "despacho_aduaneiro_sda" WHERE "isActive" = true LIMIT 1`;
    if (sda.length > 0) {
      await target`
        INSERT INTO global_platform_rates (id, rate_type, value, unit, description, updated_at)
        VALUES (gen_random_uuid(), 'CUSTOMS_BROKER_SDA', ${sda[0].valor}, 'FIXED_BRL', 'Servico de Despacho Aduaneiro', NOW())
        ON CONFLICT (rate_type) DO NOTHING`;
      migrated++;
      if (Number(sda[0].desovaContainer) > 0) {
        await target`
          INSERT INTO global_platform_rates (id, rate_type, value, unit, description, updated_at)
          VALUES (gen_random_uuid(), 'CONTAINER_UNSTUFFING', ${sda[0].desovaContainer}, 'PER_CONTAINER_BRL', 'Desova de Container', NOW())
          ON CONFLICT (rate_type) DO NOTHING`;
        migrated++;
      }
      if (Number(sda[0].lavagemContainer) > 0) {
        await target`
          INSERT INTO global_platform_rates (id, rate_type, value, unit, description, updated_at)
          VALUES (gen_random_uuid(), 'CONTAINER_WASHING', ${sda[0].lavagemContainer}, 'PER_CONTAINER_BRL', 'Lavagem de Container', NOW())
          ON CONFLICT (rate_type) DO NOTHING`;
        migrated++;
      }
    }

    const rev = await legacy`SELECT * FROM "revenue_taxes" LIMIT 1`;
    if (rev.length > 0) {
      await target`
        INSERT INTO global_platform_rates (id, rate_type, value, unit, description, updated_at)
        VALUES (gen_random_uuid(), 'PIS_DEFAULT', ${rev[0].pisPercent}, 'PERCENT', 'PIS padrao sobre receita', NOW())
        ON CONFLICT (rate_type) DO NOTHING`;
      await target`
        INSERT INTO global_platform_rates (id, rate_type, value, unit, description, updated_at)
        VALUES (gen_random_uuid(), 'COFINS_DEFAULT', ${rev[0].cofinsPercent}, 'PERCENT', 'COFINS padrao sobre receita', NOW())
        ON CONFLICT (rate_type) DO NOTHING`;
      migrated += 2;
    }
    result.tables.push({ name: 'globalPlatformRates', migrated, skipped: 0, errors });
    console.log(`  [globalPlatformRates] migrated: ${migrated}`);
  }

  // --- currencyExchangeBrokers (from CorretorasCambio) ---
  {
    const rows = await legacy`SELECT * FROM "corretoras_cambio"`;
    let migrated = 0;
    const errors: string[] = [];
    for (const r of rows) {
      try {
        const [inserted] = await target`
          INSERT INTO currency_exchange_brokers (id, name)
          VALUES (gen_random_uuid(), ${r.nome})
          RETURNING id`;
        idMap.set('corretora', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`Corretora ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'currencyExchangeBrokers', migrated, skipped: 0, errors });
    console.log(`  [currencyExchangeBrokers] migrated: ${migrated}`);
  }

  return result;
}
