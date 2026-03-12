-- Migration: Quote Flow Schema (Seller/Client)
-- Adds sellerOrganizationId, clientOrganizationId, createdById to quotes
-- Adds quoteId, sellerOrganizationId, clientOrganizationId to shipments

-- ==========================================
-- 1. QUOTES: Add new columns
-- ==========================================
ALTER TABLE "quotes" ADD COLUMN "seller_organization_id" uuid;
ALTER TABLE "quotes" ADD COLUMN "client_organization_id" uuid;
ALTER TABLE "quotes" ADD COLUMN "created_by_id" uuid;
ALTER TABLE "quotes" ADD COLUMN "public_token" text;
ALTER TABLE "quotes" ADD COLUMN "client_email" text;

-- Populate seller_organization_id from organization_id
UPDATE "quotes" SET "seller_organization_id" = "organization_id";

-- Populate created_by_id: first OWNER/ADMIN of the org
UPDATE "quotes" q
SET "created_by_id" = (
  SELECT m.profile_id
  FROM memberships m
  WHERE m.organization_id = q.organization_id
    AND m.role IN ('OWNER', 'ADMIN')
  ORDER BY CASE m.role WHEN 'OWNER' THEN 0 ELSE 1 END
  LIMIT 1
);

-- Fallback: use first profile in system if org has no OWNER/ADMIN
UPDATE "quotes"
SET "created_by_id" = (SELECT id FROM profiles LIMIT 1)
WHERE "created_by_id" IS NULL;

-- Add FKs and constraints
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_seller_organization_id_organizations_id_fk" FOREIGN KEY ("seller_organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE;
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_client_organization_id_organizations_id_fk" FOREIGN KEY ("client_organization_id") REFERENCES "organizations"("id");
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_id_profiles_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "profiles"("id");
CREATE UNIQUE INDEX IF NOT EXISTS "quotes_public_token_unique" ON "quotes" ("public_token");

ALTER TABLE "quotes" ALTER COLUMN "seller_organization_id" SET NOT NULL;
ALTER TABLE "quotes" ALTER COLUMN "created_by_id" SET NOT NULL;

-- Drop old column
ALTER TABLE "quotes" DROP COLUMN "organization_id";

--> statement-breakpoint
-- ==========================================
-- 2. SHIPMENTS: Add new columns
-- ==========================================
ALTER TABLE "shipments" ADD COLUMN "quote_id" uuid;
ALTER TABLE "shipments" ADD COLUMN "seller_organization_id" uuid;
ALTER TABLE "shipments" ADD COLUMN "client_organization_id" uuid;

-- Populate from organization_id (existing shipments = direct orders, same org for both)
UPDATE "shipments" SET "seller_organization_id" = "organization_id", "client_organization_id" = "organization_id";

-- Add FKs
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id");
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_seller_organization_id_organizations_id_fk" FOREIGN KEY ("seller_organization_id") REFERENCES "organizations"("id");
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_client_organization_id_organizations_id_fk" FOREIGN KEY ("client_organization_id") REFERENCES "organizations"("id");

ALTER TABLE "shipments" ALTER COLUMN "seller_organization_id" SET NOT NULL;
ALTER TABLE "shipments" ALTER COLUMN "client_organization_id" SET NOT NULL;

-- Drop old column
ALTER TABLE "shipments" DROP COLUMN "organization_id";
