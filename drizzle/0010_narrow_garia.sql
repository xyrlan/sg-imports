CREATE TYPE "public"."port_type" AS ENUM('PORT', 'AIRPORT');--> statement-breakpoint
ALTER TABLE "ports" ADD COLUMN "type" "port_type" DEFAULT 'PORT' NOT NULL;