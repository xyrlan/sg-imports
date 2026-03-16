-- Migration: ZapSign contract signing flow
-- Adds PENDING_SIGNATURE status, ZapSign fields, and rejection reason to quotes

-- 1. Add PENDING_SIGNATURE to quote_status enum
ALTER TYPE "quote_status" ADD VALUE IF NOT EXISTS 'PENDING_SIGNATURE' AFTER 'REJECTED';

-- 2. Add ZapSign columns to quotes
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "zap_sign_doc_token" text;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "zap_sign_signer_token" text;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "rejection_reason" text;
