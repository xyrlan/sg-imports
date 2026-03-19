import type { Sql } from '../connection';
import type { IdMap, PhaseResult } from '../id-map';

export async function runPhase03(legacy: Sql, target: Sql, idMap: IdMap): Promise<PhaseResult> {
  const result: PhaseResult = { phase: '03-products', tables: [] };

  // Resolve brTradingOrgId: from idMap (Phase 2) or fallback to pedro@dev.com's org
  let brTradingId = idMap.get('meta', 'brTradingOrgId');
  if (!brTradingId) {
    const [org] = await target`
      SELECT m.organization_id FROM memberships m
      JOIN profiles p ON p.id = m.profile_id
      WHERE p.email = 'pedro@dev.com' LIMIT 1`;
    if (org) {
      brTradingId = org.organization_id;
      idMap.set('meta', 'brTradingOrgId', brTradingId || "");
      console.log(`  [meta] brTradingOrgId resolved from pedro@dev.com's org: ${brTradingId}`);
    } else {
      throw new Error('Could not resolve brTradingOrgId: pedro@dev.com not found in target DB');
    }
  }

  // Also pre-load existing company mappings if Phase 2 was skipped
  if (!idMap.get('company', '_loaded')) {
    const orgs = await target`SELECT id, document FROM organizations WHERE document IS NOT NULL`;
    const legacyCompanies = await legacy`SELECT id, cnpj FROM "Company" WHERE cnpj IS NOT NULL`;
    for (const lc of legacyCompanies) {
      const match = orgs.find((o: any) => o.document === lc.cnpj);
      if (match) idMap.set('company', lc.id, match.id);
    }
    idMap.set('company', '_loaded', 'true');
    console.log(`  [meta] Pre-loaded ${legacyCompanies.length} company mappings from existing orgs`);
  }

  // Pre-load NCM mappings if Phase 1 ran separately
  if (!idMap.get('ncm', '_loaded')) {
    const hsCodes = await target`SELECT id, code FROM hs_codes`;
    const legacyNcms = await legacy`SELECT id, codigo FROM "Ncm"`;
    for (const ln of legacyNcms) {
      const match = hsCodes.find((h: any) => h.code === ln.codigo);
      if (match) idMap.set('ncm', ln.id, match.id);
    }
    idMap.set('ncm', '_loaded', 'true');
    console.log(`  [meta] Pre-loaded ${hsCodes.length} NCM mappings from existing hs_codes`);
  }

  // --- suppliers (from OperadorEstrangeiro) ---
  {
    const rows = await legacy`SELECT * FROM "operador_estrangeiro"`;
    let migrated = 0;
    const errors: string[] = [];
    for (const r of rows) {
      try {
        const [inserted] = await target`
          INSERT INTO suppliers (id, organization_id, name, tax_id, country_code, email, address, siscomex_id)
          VALUES (gen_random_uuid(), ${brTradingId}, ${r.nome}, ${r.tin}, ${r.codigoPais ?? 'CN'}, ${r.email}, ${r.endereco}, ${r.siscomexId})
          ON CONFLICT (siscomex_id) DO NOTHING
          RETURNING id`;
        if (inserted) { idMap.set('operadorEstrangeiro', r.id, inserted.id); migrated++; }
      } catch (e: any) { errors.push(`Supplier ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'suppliers', migrated, skipped: 0, errors });
    console.log(`  [suppliers] migrated: ${migrated}, errors: ${errors.length}`);
  }

  // --- subSuppliers (from SubOperadorEstrangeiro) ---
  {
    const rows = await legacy`SELECT * FROM "sub_operador_estrangeiro"`;
    let migrated = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const supplierId = idMap.get('operadorEstrangeiro', r.operadorEstrangeiroId);
      if (!supplierId) continue;
      try {
        const [inserted] = await target`
          INSERT INTO sub_suppliers (id, supplier_id, name, tax_id, country_code, email, address)
          VALUES (gen_random_uuid(), ${supplierId}, ${r.nome}, ${null}, ${null}, ${r.email}, ${r.endereco})
          RETURNING id`;
        idMap.set('subOperador', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`SubSupplier ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'subSuppliers', migrated, skipped: 0, errors });
    console.log(`  [subSuppliers] migrated: ${migrated}, errors: ${errors.length}`);
  }

  // --- suppliersWallets (from OperadorEstrangeiroWallet) ---
  {
    const rows = await legacy`SELECT * FROM "operador_estrangeiro_wallet"`;
    let migrated = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const supplierId = idMap.get('operadorEstrangeiro', r.operadorEstrangeiroId);
      if (!supplierId) continue;
      try {
        const [inserted] = await target`
          INSERT INTO suppliers_wallets (id, supplier_id, balance_usd)
          VALUES (gen_random_uuid(), ${supplierId}, ${Number(r.balanceUsd).toFixed(2)})
          RETURNING id`;
        idMap.set('wallet', r.id, inserted.id); migrated++;
      } catch (e: any) { errors.push(`Wallet ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'suppliersWallets', migrated, skipped: 0, errors });
    console.log(`  [suppliersWallets] migrated: ${migrated}, errors: ${errors.length}`);
  }

  // --- products + productVariants ---
  {
    const rows = await legacy`SELECT * FROM "Product"`;
    let migrated = 0, skipped = 0;
    const errors: string[] = [];
    for (const r of rows) {
      const orgId = idMap.get('company', r.companyId) ?? brTradingId;
      const hsCodeId = idMap.get('ncm', r.ncmId);
      const supplierId = idMap.get('operadorEstrangeiro', r.operadorEstrangeiroId);
      try {
        const [inserted] = await target`
          INSERT INTO products (id, organization_id, style_code, name, description, photos, hs_code_id, supplier_id, siscomex_id, created_at, updated_at)
          VALUES (gen_random_uuid(), ${orgId}, ${r.codigoInterno}, ${r.nome ?? r.nomeIngles}, ${r.descricao}, ${r.fotos ?? []}, ${hsCodeId}, ${supplierId}, ${r.siscomexCodigo}, ${r.createdAt}, ${r.createdAt})
          RETURNING id`;
        idMap.set('product', r.id, inserted.id);

        // Create default variant from product base data
        const tamanhoCaixa = await legacy`SELECT * FROM "TamanhoCaixa" WHERE "productId" = ${r.id} LIMIT 1`;
        const tc = tamanhoCaixa[0];
        const sku = r.codigoInterno || `LEGACY-${r.id.substring(4, 12)}`;

        const [variant] = await target`
          INSERT INTO product_variants (id, product_id, organization_id, sku, name, price_usd, units_per_carton, carton_height, carton_width, carton_length, carton_weight)
          VALUES (gen_random_uuid(), ${inserted.id}, ${orgId}, ${sku}, ${r.nomeIngles || 'Default'}, ${r.precoDolar}, ${r.quantidadePorCaixa ?? 1}, ${tc?.altura ?? 0}, ${tc?.largura ?? 0}, ${tc?.comprimento ?? 0}, ${r.pesoCaixa ?? 0})
          ON CONFLICT (organization_id, sku) DO NOTHING
          RETURNING id`;
        if (variant) idMap.set('defaultVariant', r.id, variant.id);

        // Create additional variants from Variacao/ElementoVariacao
        const variacoes = await legacy`SELECT * FROM "Variacao" WHERE "productId" = ${r.id}`;
        for (const v of variacoes) {
          const elementos = await legacy`SELECT * FROM "ElementoVariacao" WHERE "variacaoId" = ${v.id}`;
          for (const el of elementos) {
            const variantSku = `${sku}-${el.nome.replace(/\s+/g, '-').substring(0, 20)}`;
            const variantPrice = el.preco ? parseFloat(el.preco) : r.precoDolar;
            try {
              const [ev] = await target`
                INSERT INTO product_variants (id, product_id, organization_id, sku, name, price_usd, units_per_carton, carton_height, carton_width, carton_length, carton_weight, attributes)
                VALUES (gen_random_uuid(), ${inserted.id}, ${orgId}, ${variantSku}, ${el.nome}, ${variantPrice}, ${r.quantidadePorCaixa ?? 1}, ${tc?.altura ?? 0}, ${tc?.largura ?? 0}, ${tc?.comprimento ?? 0}, ${r.pesoCaixa ?? 0}, ${JSON.stringify({ [v.nomeVariacao]: el.nome })}::jsonb)
                ON CONFLICT (organization_id, sku) DO NOTHING
                RETURNING id`;
              if (ev) idMap.set('elementoVariacao', el.id, ev.id);
            } catch (e: any) { errors.push(`Variant ${el.id}: ${e.message}`); }
          }
        }
        migrated++;
      } catch (e: any) { errors.push(`Product ${r.id}: ${e.message}`); }
    }
    result.tables.push({ name: 'products+variants', migrated, skipped, errors });
    console.log(`  [products+variants] migrated: ${migrated}, skipped: ${skipped}, errors: ${errors.length}`);
  }

  return result;
}
