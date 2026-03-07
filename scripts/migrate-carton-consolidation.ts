/**
 * Migration: Consolidate product_variants to carton nomenclature.
 * Removes box_quantity and box_weight; migrates data to units_per_carton and carton_*.
 * Run before deploying new code: npx tsx scripts/migrate-carton-consolidation.ts
 */
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DIRECT_URL || process.env.DATABASE_URL!, { max: 1 });

async function main() {
  console.log('⏳ Applying carton consolidation migration...');

  try {
    // 1. Migrate box_quantity -> units_per_carton
    await sql.unsafe(`
      UPDATE product_variants
      SET units_per_carton = COALESCE(box_quantity, units_per_carton, 1)
      WHERE box_quantity IS NOT NULL
    `);

    // 2. Migrate box_weight -> carton_weight (when carton_weight is null or zero)
    await sql.unsafe(`
      UPDATE product_variants
      SET carton_weight = COALESCE(NULLIF(carton_weight, 0), box_weight)
      WHERE box_weight IS NOT NULL
    `);

    // 3. Fill NULLs with defaults
    await sql.unsafe(`UPDATE product_variants SET carton_height = 0 WHERE carton_height IS NULL`);
    await sql.unsafe(`UPDATE product_variants SET carton_width = 0 WHERE carton_width IS NULL`);
    await sql.unsafe(`UPDATE product_variants SET carton_length = 0 WHERE carton_length IS NULL`);
    await sql.unsafe(`UPDATE product_variants SET carton_weight = 0 WHERE carton_weight IS NULL`);
    await sql.unsafe(`UPDATE product_variants SET units_per_carton = 1 WHERE units_per_carton IS NULL`);

    // 4. Alter carton columns to NOT NULL with defaults
    await sql.unsafe(`
      ALTER TABLE product_variants
        ALTER COLUMN carton_height SET DEFAULT 0,
        ALTER COLUMN carton_height SET NOT NULL
    `);
    await sql.unsafe(`
      ALTER TABLE product_variants
        ALTER COLUMN carton_width SET DEFAULT 0,
        ALTER COLUMN carton_width SET NOT NULL
    `);
    await sql.unsafe(`
      ALTER TABLE product_variants
        ALTER COLUMN carton_length SET DEFAULT 0,
        ALTER COLUMN carton_length SET NOT NULL
    `);
    await sql.unsafe(`
      ALTER TABLE product_variants
        ALTER COLUMN carton_weight SET DEFAULT 0,
        ALTER COLUMN carton_weight SET NOT NULL
    `);

    // 5. Drop obsolete columns
    await sql.unsafe(`ALTER TABLE product_variants DROP COLUMN IF EXISTS box_quantity`);
    await sql.unsafe(`ALTER TABLE product_variants DROP COLUMN IF EXISTS box_weight`);

    console.log('✅ Carton consolidation migration applied successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    await sql.end();
  }
}

main().catch(() => process.exit(1));
