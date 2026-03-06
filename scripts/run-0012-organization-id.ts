/**
 * Run 0012 migration: Add organization_id to product_variants
 * Use when the column is missing: bun run scripts/run-0012-organization-id.ts
 */
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DIRECT_URL || process.env.DATABASE_URL!, { max: 1 });

async function main() {
  console.log('Adding organization_id to product_variants...');

  await sql.unsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'product_variants' AND column_name = 'organization_id'
      ) THEN
        ALTER TABLE "product_variants" ADD COLUMN "organization_id" uuid;
        UPDATE "product_variants" pv
        SET "organization_id" = p."organization_id"
        FROM "products" p
        WHERE pv."product_id" = p."id";
        ALTER TABLE "product_variants" ALTER COLUMN "organization_id" SET NOT NULL;
        ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_organization_id_organizations_id_fk"
          FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        RAISE NOTICE 'organization_id added successfully';
      ELSE
        RAISE NOTICE 'organization_id already exists, skipping';
      END IF;
    END $$;
  `);

  console.log('Done.');
  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
