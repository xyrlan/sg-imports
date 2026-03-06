/**
 * One-off script to apply migration 0010_alibaba_variant_logistics.
 * Run when the full migrate fails due to older migrations being out of sync.
 *
 * Usage: npx tsx scripts/migrate-0010-alibaba.ts
 */
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DIRECT_URL || process.env.DATABASE_URL!, { max: 1 });

async function main() {
  console.log('⏳ Applying migration 0010_alibaba_variant_logistics...');

  try {
    // 1. Add columns to product_variants (idempotent: skip if already exist)
    await sql.unsafe(`
      ALTER TABLE "product_variants"
      ADD COLUMN IF NOT EXISTS "box_quantity" integer DEFAULT 1 NOT NULL
    `);
    await sql.unsafe(`
      ALTER TABLE "product_variants"
      ADD COLUMN IF NOT EXISTS "box_weight" numeric(10, 3) DEFAULT 0 NOT NULL
    `);

    // 2. Migrate data: copy product box values to existing variants (only if products still has columns)
    const hasProductsBoxCols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'products' AND column_name IN ('box_quantity', 'box_weight')
    `;
    if (hasProductsBoxCols.length === 2) {
      await sql.unsafe(`
        UPDATE "product_variants" pv
        SET "box_quantity" = p."box_quantity",
            "box_weight" = p."box_weight"
        FROM "products" p
        WHERE pv."product_id" = p."id"
      `);
      // 3. Create Default variant for products without any variant
      await sql.unsafe(`
        INSERT INTO "product_variants" ("product_id", "name", "price_usd", "box_quantity", "box_weight")
        SELECT p."id", 'Default', 0, p."box_quantity", p."box_weight"
        FROM "products" p
        WHERE NOT EXISTS (SELECT 1 FROM "product_variants" pv WHERE pv."product_id" = p."id")
      `);
      // 4. Drop columns from products
      await sql.unsafe(`ALTER TABLE "products" DROP COLUMN IF EXISTS "box_quantity"`);
      await sql.unsafe(`ALTER TABLE "products" DROP COLUMN IF EXISTS "box_weight"`);
    }

    // 5. Record migration in drizzle table (optional - table structure may vary)

    console.log('✅ Migration 0010 applied successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    await sql.end();
  }
}

main().catch(() => process.exit(1));
