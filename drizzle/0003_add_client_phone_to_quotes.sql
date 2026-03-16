-- Migration: Add client_phone to quotes
-- Stores client phone number for WhatsApp-based quote sending and auto-linking

ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "client_phone" text;
