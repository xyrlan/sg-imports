CREATE TYPE "public"."system_role" AS ENUM('USER', 'SUPER_ADMIN', 'SUPER_ADMIN_EMPLOYEE');--> statement-breakpoint
CREATE TABLE "global_service_fee_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"minimum_wage_brl" numeric(10, 2) DEFAULT '1530.00' NOT NULL,
	"default_multiplier" integer DEFAULT 2 NOT NULL,
	"default_percentage" numeric(5, 2) DEFAULT '2.5',
	"default_apply_to_china" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memberships" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."organization_role";--> statement-breakpoint
CREATE TYPE "public"."organization_role" AS ENUM('OWNER', 'ADMIN', 'EMPLOYEE', 'SELLER', 'CUSTOMS_BROKER', 'VIEWER');--> statement-breakpoint
ALTER TABLE "memberships" ALTER COLUMN "role" SET DATA TYPE "public"."organization_role" USING "role"::"public"."organization_role";--> statement-breakpoint
ALTER TABLE "hs_codes" ADD COLUMN "antidumping_tax" numeric(5, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "system_role" "system_role" DEFAULT 'USER' NOT NULL;--> statement-breakpoint
ALTER TABLE "service_fee_configs" ADD COLUMN "minimum_value_multiplier" integer DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "service_fee_configs" DROP COLUMN "minimum_value";--> statement-breakpoint
ALTER TABLE "service_fee_configs" DROP COLUMN "currency";