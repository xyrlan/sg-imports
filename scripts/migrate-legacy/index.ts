import 'dotenv/config';
import { createLegacyClient, createTargetClient } from './connection';
import { IdMap, type PhaseResult } from './id-map';
import { createSupabaseAdmin } from './supabase-admin';
import { runPhase01 } from './phases/01-foundation';
import { runPhase02 } from './phases/02-auth-orgs';
import { runPhase03 } from './phases/03-products';
import { runPhase04 } from './phases/04-logistics';
import { runPhase05 } from './phases/05-quotes';
import { runPhase06 } from './phases/06-shipments';
import { runPhase07 } from './phases/07-financial';
import { runPhase08 } from './phases/08-system';

const PHASE_TABLES: Record<number, string[]> = {
  1: ['currency_exchange_brokers', 'global_platform_rates', 'siscomex_fee_config', 'state_icms_rates', 'terminals', 'ports', 'carriers', 'hs_codes'],
  2: ['memberships', 'organizations', 'profiles', 'addresses'],
  3: ['product_variants', 'products', 'suppliers_wallets', 'sub_suppliers', 'suppliers'],
  4: ['freight_proposals', 'service_fee_configs', 'global_service_fee_config', 'pricing_items', 'pricing_rules', 'int_freight_ports_discharge', 'int_freight_ports_loading', 'international_freights', 'storage_periods', 'storage_rules'],
  5: ['quote_observations', 'quote_items', 'quotes'],
  6: ['shipment_freight_receipts', 'shipment_change_requests', 'shipment_expenses', 'shipment_documents', 'shipment_step_history', 'shipment_containers', 'shipments'],
  7: ['suppliers_wallet_transactions', 'exchange_contracts', 'transactions'],
  8: ['webhook_events', 'notifications'],
};

async function cleanTargetDatabase(target: ReturnType<typeof createTargetClient>, phaseNums?: number[] | null) {
  const phasesToClean = phaseNums ?? [8, 7, 6, 5, 4, 3, 2, 1];
  const label = phaseNums ? `phases ${phasesToClean.join(', ')}` : 'all phases';
  console.log(`[CLEAN] Wiping ${label} from target database...\n`);

  // Clean in reverse order (highest phase first = children first)
  const sorted = [...phasesToClean].sort((a, b) => b - a);
  for (const num of sorted) {
    const tables = PHASE_TABLES[num];
    if (!tables) continue;
    for (const table of tables) {
      try {
        const result = await target`DELETE FROM ${target(table)}`;
        if (result.count > 0) console.log(`  [CLEAN] ${table}: ${result.count} rows deleted`);
      } catch (e: any) {
        console.log(`  [CLEAN] ${table}: ${e.message}`);
      }
    }
  }

  console.log('\n[CLEAN] Done.\n');
}

async function main() {
  console.log('=== Legacy Data Migration: euimportador → sg-imports ===\n');

  const legacy = createLegacyClient();
  const target = createTargetClient();
  const supabase = createSupabaseAdmin();
  const idMap = new IdMap();
  const results: PhaseResult[] = [];

  // Handle --phases flag: e.g. --phases 1,3,4
  const phasesIdx = process.argv.indexOf('--phases');
  const selectedNums = phasesIdx >= 0 && process.argv[phasesIdx + 1]
    ? process.argv[phasesIdx + 1].split(',').map(Number)
    : null;

  // Handle --clean flag (respects --phases if provided)
  if (process.argv.includes('--clean')) {
    await cleanTargetDatabase(target, selectedNums);
  }

  const allPhases = [
    { num: 1, name: 'Phase 1: Foundation', fn: () => runPhase01(legacy, target, idMap) },
    { num: 2, name: 'Phase 2: Auth & Organizations', fn: () => runPhase02(legacy, target, idMap, supabase) },
    { num: 3, name: 'Phase 3: Products', fn: () => runPhase03(legacy, target, idMap) },
    { num: 4, name: 'Phase 4: Logistics Config', fn: () => runPhase04(legacy, target, idMap) },
    { num: 5, name: 'Phase 5: Quotes', fn: () => runPhase05(legacy, target, idMap) },
    { num: 6, name: 'Phase 6: Shipments', fn: () => runPhase06(legacy, target, idMap) },
    { num: 7, name: 'Phase 7: Financial', fn: () => runPhase07(legacy, target, idMap) },
    { num: 8, name: 'Phase 8: System', fn: () => runPhase08(legacy, target, idMap) },
  ];

  const phases = selectedNums
    ? allPhases.filter(p => selectedNums.includes(p.num))
    : allPhases;

  if (selectedNums) {
    console.log(`Running phases: ${selectedNums.join(', ')} only\n`);
  }

  for (const phase of phases) {
    console.log(`\n--- ${phase.name} ---`);
    try {
      const phaseResult = await phase.fn();
      results.push(phaseResult);
    } catch (err: any) {
      console.error(`\n[FATAL] ${phase.name} failed: ${err.message}`);
      console.error(err.stack);
      results.push({ phase: phase.name, tables: [{ name: 'FATAL', migrated: 0, skipped: 0, errors: [err.message] }] });
    }
  }

  // Print summary
  console.log('\n\n========== MIGRATION SUMMARY ==========\n');
  let totalMigrated = 0, totalSkipped = 0, totalErrors = 0;
  for (const r of results) {
    console.log(`[${r.phase}]`);
    for (const t of r.tables) {
      console.log(`  ${t.name}: ${t.migrated} migrated, ${t.skipped} skipped, ${t.errors.length} errors`);
      if (t.errors.length > 0) {
        for (const e of t.errors.slice(0, 5)) console.log(`    ERROR: ${e}`);
        if (t.errors.length > 5) console.log(`    ... and ${t.errors.length - 5} more errors`);
      }
      totalMigrated += t.migrated;
      totalSkipped += t.skipped;
      totalErrors += t.errors.length;
    }
  }
  console.log(`\nTOTAL: ${totalMigrated} migrated, ${totalSkipped} skipped, ${totalErrors} errors`);

  await legacy.end();
  await target.end();
  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
