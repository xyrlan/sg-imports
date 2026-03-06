/**
 * One-off script to add missing product_variants columns.
 * Run with: bun run scripts/add-product-variant-columns.ts
 */
import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DIRECT_URL || process.env.DATABASE_URL!, { max: 1 });

async function main() {
  console.log('Adding missing columns to product_variants...');

  await sql.unsafe(`
    ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "attributes" jsonb;
  `);
  console.log('  ✓ attributes');

  await sql.unsafe(`
    ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "tiered_price_info" jsonb;
  `);
  console.log('  ✓ tiered_price_info');

  await sql.unsafe(`
    ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "unit_weight" numeric(10, 3);
  `);
  console.log('  ✓ unit_weight');

  console.log('Done.');
  await sql.end();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('Error:', err);
  await sql.end();
  process.exit(1);
});
